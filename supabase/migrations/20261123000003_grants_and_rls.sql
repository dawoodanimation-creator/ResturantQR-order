-- Migration: 20261123000003_grants_and_rls.sql
-- Description: Minimal Grants (Hard-Won Rules #1 & #2), Security Definer Helpers, and Row Level Security on Every Table

-- ============================================================================
-- 1. Explicit Privilege Revocation & Grant Strategy
-- ============================================================================

-- Strip all default public permissions across tables, functions, sequences
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM PUBLIC, anon, authenticated;

-- Service Role (trusted server actions and background jobs) gets full access
GRANT USAGE ON SCHEMA public TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- Anon Role: Hard-won Rule #2: ZERO grants on tables/views/functions.
-- Anon can connect to schema only, but cannot read or write any table directly.
GRANT USAGE ON SCHEMA public TO anon;

-- ============================================================================
-- 2. Staff Authentication Context Helpers (Security Definer)
-- ============================================================================

CREATE OR REPLACE FUNCTION current_staff_restaurant_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT restaurant_id
    FROM staff
    WHERE auth_user_id = auth.uid() AND is_active = true
    LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION current_staff_branch_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT branch_id
    FROM staff
    WHERE auth_user_id = auth.uid() AND is_active = true
    LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION current_staff_role()
RETURNS staff_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT role
    FROM staff
    WHERE auth_user_id = auth.uid() AND is_active = true
    LIMIT 1;
$$;

-- Grant EXECUTE on helpers to authenticated
GRANT EXECUTE ON FUNCTION current_staff_restaurant_id() TO authenticated;
GRANT EXECUTE ON FUNCTION current_staff_branch_id() TO authenticated;
GRANT EXECUTE ON FUNCTION current_staff_role() TO authenticated;
GRANT EXECUTE ON FUNCTION transition_order_status(uuid, order_status, order_status, text, integer) TO authenticated;

-- ============================================================================
-- 3. Minimal Grants to `authenticated` (No blanket grants)
-- ============================================================================
GRANT USAGE ON SCHEMA public TO authenticated;

-- Read Grants: Staff can view catalog, orders, and branch operations
GRANT SELECT ON restaurants TO authenticated;
GRANT SELECT ON branches TO authenticated;
GRANT SELECT ON tables TO authenticated;
GRANT SELECT ON table_sessions TO authenticated;
GRANT SELECT ON categories TO authenticated;
GRANT SELECT ON menu_items TO authenticated;
GRANT SELECT ON modifier_groups TO authenticated;
GRANT SELECT ON modifier_options TO authenticated;
GRANT SELECT ON menu_item_modifier_groups TO authenticated;
GRANT SELECT ON branch_menu_item_overrides TO authenticated;
GRANT SELECT ON orders TO authenticated;
GRANT SELECT ON order_items TO authenticated;
GRANT SELECT ON order_status_events TO authenticated;
GRANT SELECT ON payments TO authenticated;
GRANT SELECT ON call_bells TO authenticated;
GRANT SELECT ON feedback TO authenticated;
GRANT SELECT ON staff TO authenticated;
GRANT SELECT ON print_agents TO authenticated;
GRANT SELECT ON print_jobs TO authenticated;
GRANT SELECT ON feature_flags TO authenticated;
GRANT SELECT ON vouchers TO authenticated;

-- Column-level UPDATE Grants on orders:
-- Staff may change order status, reason, estimated_prep_minutes, locked_by_staff_id, updated_at.
-- MONEY COLUMNS (subtotal_paisa, tax_paisa, service_charge_paisa, discount_paisa, total_paisa)
-- are EXPLICITLY NOT GRANTED.
GRANT UPDATE (
    status,
    rejection_reason,
    cancellation_reason,
    estimated_prep_minutes,
    locked_by_staff_id,
    updated_at
) ON orders TO authenticated;

-- Call bells: Staff can acknowledge or resolve
GRANT UPDATE (status, handled_by_staff_id, resolved_at) ON call_bells TO authenticated;

-- Branch menu overrides: Kitchen/Managers can mark items sold out
GRANT INSERT, UPDATE (is_sold_out, price_override_paisa, updated_at) ON branch_menu_item_overrides TO authenticated;

-- Tables: Staff can update active state
GRANT UPDATE (is_active, updated_at) ON tables TO authenticated;

-- ============================================================================
-- 4. Enable RLS on Every Table
-- ============================================================================
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE table_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE modifier_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE modifier_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_item_modifier_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE branch_menu_item_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE branch_order_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_status_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_bells ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE print_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE print_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE vouchers ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 5. RLS Policies (Cross-Tenant Isolation, Branch Scoping, Role Restrictions)
-- ============================================================================

-- restaurants
CREATE POLICY rls_restaurants_select ON restaurants FOR SELECT TO authenticated
USING (id = current_staff_restaurant_id() OR current_staff_role() = 'super_admin');

-- branches
CREATE POLICY rls_branches_select ON branches FOR SELECT TO authenticated
USING (restaurant_id = current_staff_restaurant_id() OR current_staff_role() = 'super_admin');

-- tables (scoped by restaurant and optional branch)
CREATE POLICY rls_tables_select ON tables FOR SELECT TO authenticated
USING (
    (restaurant_id = current_staff_restaurant_id() OR current_staff_role() = 'super_admin')
    AND (current_staff_branch_id() IS NULL OR branch_id = current_staff_branch_id() OR current_staff_role() IN ('owner', 'super_admin'))
);

CREATE POLICY rls_tables_update ON tables FOR UPDATE TO authenticated
USING (
    (restaurant_id = current_staff_restaurant_id() OR current_staff_role() = 'super_admin')
    AND (current_staff_branch_id() IS NULL OR branch_id = current_staff_branch_id() OR current_staff_role() IN ('owner', 'super_admin'))
);

-- table_sessions
CREATE POLICY rls_table_sessions_select ON table_sessions FOR SELECT TO authenticated
USING (
    (restaurant_id = current_staff_restaurant_id() OR current_staff_role() = 'super_admin')
    AND (current_staff_branch_id() IS NULL OR branch_id = current_staff_branch_id() OR current_staff_role() IN ('owner', 'super_admin'))
);

-- menu entities (categories, items, modifier groups, options)
CREATE POLICY rls_categories_select ON categories FOR SELECT TO authenticated
USING (restaurant_id = current_staff_restaurant_id() OR current_staff_role() = 'super_admin');

CREATE POLICY rls_menu_items_select ON menu_items FOR SELECT TO authenticated
USING (restaurant_id = current_staff_restaurant_id() OR current_staff_role() = 'super_admin');

CREATE POLICY rls_modifier_groups_select ON modifier_groups FOR SELECT TO authenticated
USING (restaurant_id = current_staff_restaurant_id() OR current_staff_role() = 'super_admin');

CREATE POLICY rls_modifier_options_select ON modifier_options FOR SELECT TO authenticated
USING (restaurant_id = current_staff_restaurant_id() OR current_staff_role() = 'super_admin');

CREATE POLICY rls_mimg_select ON menu_item_modifier_groups FOR SELECT TO authenticated
USING (restaurant_id = current_staff_restaurant_id() OR current_staff_role() = 'super_admin');

CREATE POLICY rls_bmio_select ON branch_menu_item_overrides FOR SELECT TO authenticated
USING (restaurant_id = current_staff_restaurant_id() OR current_staff_role() = 'super_admin');

CREATE POLICY rls_bmio_write ON branch_menu_item_overrides FOR ALL TO authenticated
USING (
    (restaurant_id = current_staff_restaurant_id() OR current_staff_role() = 'super_admin')
    AND (current_staff_branch_id() IS NULL OR branch_id = current_staff_branch_id() OR current_staff_role() IN ('owner', 'super_admin'))
);

-- orders
-- SELECT: Isolated by tenant and scoped by branch for branch staff
CREATE POLICY rls_orders_select ON orders FOR SELECT TO authenticated
USING (
    (restaurant_id = current_staff_restaurant_id() OR current_staff_role() = 'super_admin')
    AND (current_staff_branch_id() IS NULL OR branch_id = current_staff_branch_id() OR current_staff_role() IN ('owner', 'super_admin'))
);

-- UPDATE: Waiters cannot reject orders (only manager, owner, super_admin)
CREATE POLICY rls_orders_update ON orders FOR UPDATE TO authenticated
USING (
    (restaurant_id = current_staff_restaurant_id() OR current_staff_role() = 'super_admin')
    AND (current_staff_branch_id() IS NULL OR branch_id = current_staff_branch_id() OR current_staff_role() IN ('owner', 'super_admin'))
)
WITH CHECK (
    (restaurant_id = current_staff_restaurant_id() OR current_staff_role() = 'super_admin')
    AND (
        NEW.status != 'rejected'
        OR current_staff_role() IN ('manager', 'owner', 'super_admin')
    )
);

-- order_items
CREATE POLICY rls_order_items_select ON order_items FOR SELECT TO authenticated
USING (restaurant_id = current_staff_restaurant_id() OR current_staff_role() = 'super_admin');

-- order_status_events
CREATE POLICY rls_order_status_events_select ON order_status_events FOR SELECT TO authenticated
USING (restaurant_id = current_staff_restaurant_id() OR current_staff_role() = 'super_admin');

-- payments: Kitchen staff cannot see payments
CREATE POLICY rls_payments_select ON payments FOR SELECT TO authenticated
USING (
    (restaurant_id = current_staff_restaurant_id() OR current_staff_role() = 'super_admin')
    AND current_staff_role() != 'kitchen'
    AND (current_staff_branch_id() IS NULL OR branch_id = current_staff_branch_id() OR current_staff_role() IN ('owner', 'super_admin'))
);

-- call_bells
CREATE POLICY rls_call_bells_select ON call_bells FOR SELECT TO authenticated
USING (
    (restaurant_id = current_staff_restaurant_id() OR current_staff_role() = 'super_admin')
    AND (current_staff_branch_id() IS NULL OR branch_id = current_staff_branch_id() OR current_staff_role() IN ('owner', 'super_admin'))
);

CREATE POLICY rls_call_bells_update ON call_bells FOR UPDATE TO authenticated
USING (
    (restaurant_id = current_staff_restaurant_id() OR current_staff_role() = 'super_admin')
    AND (current_staff_branch_id() IS NULL OR branch_id = current_staff_branch_id() OR current_staff_role() IN ('owner', 'super_admin'))
);

-- feedback
CREATE POLICY rls_feedback_select ON feedback FOR SELECT TO authenticated
USING (restaurant_id = current_staff_restaurant_id() OR current_staff_role() = 'super_admin');

-- staff
CREATE POLICY rls_staff_select ON staff FOR SELECT TO authenticated
USING (restaurant_id = current_staff_restaurant_id() OR current_staff_role() = 'super_admin');

-- print_agents & print_jobs
CREATE POLICY rls_print_agents_select ON print_agents FOR SELECT TO authenticated
USING (restaurant_id = current_staff_restaurant_id() OR current_staff_role() = 'super_admin');

CREATE POLICY rls_print_jobs_select ON print_jobs FOR SELECT TO authenticated
USING (restaurant_id = current_staff_restaurant_id() OR current_staff_role() = 'super_admin');

-- subscription & platform
CREATE POLICY rls_subscription_plans_select ON subscription_plans FOR SELECT TO authenticated
USING (true);

CREATE POLICY rls_restaurant_subscriptions_select ON restaurant_subscriptions FOR SELECT TO authenticated
USING (restaurant_id = current_staff_restaurant_id() OR current_staff_role() = 'super_admin');

CREATE POLICY rls_feature_flags_select ON feature_flags FOR SELECT TO authenticated
USING (restaurant_id IS NULL OR restaurant_id = current_staff_restaurant_id() OR current_staff_role() = 'super_admin');

CREATE POLICY rls_vouchers_select ON vouchers FOR SELECT TO authenticated
USING (restaurant_id = current_staff_restaurant_id() OR current_staff_role() = 'super_admin');
