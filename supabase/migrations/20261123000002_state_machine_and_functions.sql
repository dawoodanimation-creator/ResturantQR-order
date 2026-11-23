-- Migration: 20261123000002_state_machine_and_functions.sql
-- Description: Daily Order Counter (Timezone-Aware), State Machine Validation, Status Audit Event Trigger, and Concurrency Locking

-- 1. Function: Generate Next Daily Order Number
-- Hard-won rule #7: Daily order numbers reset at restaurant's local midnight, never UTC.
CREATE OR REPLACE FUNCTION generate_daily_order_number(
    p_branch_id uuid,
    p_restaurant_id uuid
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_tz text;
    v_local_date date;
    v_order_number integer;
BEGIN
    -- Fetch restaurant timezone (fallback to Asia/Karachi)
    SELECT COALESCE(timezone, 'Asia/Karachi') INTO v_tz
    FROM restaurants
    WHERE id = p_restaurant_id;

    IF v_tz IS NULL THEN
        v_tz := 'Asia/Karachi';
    END IF;

    -- Compute local date in that timezone
    v_local_date := (timezone(v_tz, clock_timestamp()))::date;

    -- Upsert atomic counter for this branch and local date
    INSERT INTO branch_order_counters (restaurant_id, branch_id, counter_date, last_order_number)
    VALUES (p_restaurant_id, p_branch_id, v_local_date, 1)
    ON CONFLICT (branch_id, counter_date)
    DO UPDATE SET last_order_number = branch_order_counters.last_order_number + 1
    RETURNING last_order_number INTO v_order_number;

    RETURN v_order_number;
END;
$$;

-- 2. Function: Validate Order Status Transitions (State Machine)
CREATE OR REPLACE FUNCTION validate_order_status_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_from order_status;
    v_to order_status;
    v_valid boolean := false;
BEGIN
    v_from := OLD.status;
    v_to := NEW.status;

    -- If status did not change, allow
    IF v_from = v_to THEN
        RETURN NEW;
    END IF;

    -- Check valid forward & undo transitions
    -- Allowed transitions:
    -- awaiting_payment -> accepted, cancelled
    -- pending_approval -> accepted, rejected
    -- accepted -> preparing, cancelled
    -- preparing -> ready, accepted (undo)
    -- ready -> served, preparing (undo)
    -- served -> ready (undo)
    -- rejected -> (terminal)
    -- cancelled -> (terminal)
    IF v_from = 'awaiting_payment' AND v_to IN ('accepted', 'cancelled') THEN
        v_valid := true;
    ELSIF v_from = 'pending_approval' AND v_to IN ('accepted', 'rejected') THEN
        v_valid := true;
    ELSIF v_from = 'accepted' AND v_to IN ('preparing', 'cancelled') THEN
        v_valid := true;
    ELSIF v_from = 'preparing' AND v_to IN ('ready', 'accepted') THEN
        v_valid := true;
    ELSIF v_from = 'ready' AND v_to IN ('served', 'preparing') THEN
        v_valid := true;
    ELSIF v_from = 'served' AND v_to = 'ready' THEN
        v_valid := true;
    END IF;

    IF NOT v_valid THEN
        RAISE EXCEPTION 'Illegal order status transition from % to % for order %', v_from, v_to, NEW.id
            USING ERRCODE = 'check_violation';
    END IF;

    -- Automatically set lifecycle timestamps
    IF v_to = 'accepted' AND OLD.accepted_at IS NULL THEN
        NEW.accepted_at := clock_timestamp();
    ELSIF v_to = 'preparing' AND OLD.preparing_at IS NULL THEN
        NEW.preparing_at := clock_timestamp();
    ELSIF v_to = 'ready' AND OLD.ready_at IS NULL THEN
        NEW.ready_at := clock_timestamp();
    ELSIF v_to = 'served' AND OLD.served_at IS NULL THEN
        NEW.served_at := clock_timestamp();
        NEW.completed_at := clock_timestamp();
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_order_status
BEFORE UPDATE OF status ON orders
FOR EACH ROW EXECUTE FUNCTION validate_order_status_transition();

-- 3. Trigger Function: Log Every Status Change (Hard-won rule #8)
CREATE OR REPLACE FUNCTION trg_log_order_status_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_actor_type text := 'system';
    v_actor_id text := NULL;
    v_actor_name text := 'System';
    v_current_auth uuid;
    v_staff_record record;
BEGIN
    v_current_auth := auth.uid();

    IF v_current_auth IS NOT NULL THEN
        SELECT id, full_name, role::text INTO v_staff_record
        FROM staff
        WHERE auth_user_id = v_current_auth;

        IF FOUND THEN
            v_actor_type := 'staff';
            v_actor_id := v_staff_record.id::text;
            v_actor_name := v_staff_record.full_name || ' (' || v_staff_record.role || ')';
        ELSE
            v_actor_type := 'staff';
            v_actor_id := v_current_auth::text;
            v_actor_name := 'Authenticated User';
        END IF;
    ELSIF TG_OP = 'INSERT' THEN
        v_actor_type := 'guest';
        v_actor_id := NEW.device_fingerprint;
        v_actor_name := 'Guest';
    END IF;

    INSERT INTO order_status_events (
        restaurant_id,
        order_id,
        from_status,
        to_status,
        actor_type,
        actor_id,
        actor_name,
        reason,
        created_at
    ) VALUES (
        NEW.restaurant_id,
        NEW.id,
        CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE OLD.status END,
        NEW.status,
        v_actor_type,
        v_actor_id,
        v_actor_name,
        COALESCE(NEW.rejection_reason, NEW.cancellation_reason),
        clock_timestamp()
    );

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_orders_status_audit
AFTER INSERT OR UPDATE OF status ON orders
FOR EACH ROW EXECUTE FUNCTION trg_log_order_status_event();

-- 4. Concurrency Locking Function: transition_order_status
-- Hard-won rule #11: Two staff, one order. Row lock + re-check status.
CREATE OR REPLACE FUNCTION transition_order_status(
    p_order_id uuid,
    p_expected_current_status order_status,
    p_new_status order_status,
    p_reason text DEFAULT NULL,
    p_prep_minutes integer DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_order record;
    v_staff_name text := 'Staff';
    v_current_auth uuid := auth.uid();
BEGIN
    -- Select with row lock (FOR UPDATE)
    SELECT * INTO v_order
    FROM orders
    WHERE id = p_order_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Order not found');
    END IF;

    IF v_order.status != p_expected_current_status THEN
        -- Get the name of who handled it if locked
        IF v_order.locked_by_staff_id IS NOT NULL THEN
            SELECT full_name INTO v_staff_name
            FROM staff
            WHERE id = v_order.locked_by_staff_id;
        END IF;
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Already handled by ' || COALESCE(v_staff_name, 'another staff member'),
            'current_status', v_order.status
        );
    END IF;

    -- Update order with new status
    UPDATE orders
    SET status = p_new_status,
        rejection_reason = CASE WHEN p_new_status = 'rejected' THEN p_reason ELSE rejection_reason END,
        cancellation_reason = CASE WHEN p_new_status = 'cancelled' THEN p_reason ELSE cancellation_reason END,
        estimated_prep_minutes = COALESCE(p_prep_minutes, estimated_prep_minutes),
        locked_by_staff_id = (SELECT id FROM staff WHERE auth_user_id = v_current_auth LIMIT 1),
        updated_at = clock_timestamp()
    WHERE id = p_order_id;

    RETURN jsonb_build_object('success', true, 'new_status', p_new_status);
END;
$$;
