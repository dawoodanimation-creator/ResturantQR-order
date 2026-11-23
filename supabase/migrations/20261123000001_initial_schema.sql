-- Migration: 20261123000001_initial_schema.sql
-- Description: Core Schema, Enums, Composite Constraints, Indexes, and Updated_at Triggers

-- 1. Required Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Custom Enumerations
DO $$ BEGIN
    CREATE TYPE billing_mode AS ENUM ('PRE_PAY', 'POST_PAY');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE table_kind AS ENUM ('dine_in', 'counter');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE order_status AS ENUM (
        'awaiting_payment',
        'pending_approval',
        'accepted',
        'preparing',
        'ready',
        'served',
        'rejected',
        'cancelled'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'failed', 'refunded');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE payment_method AS ENUM ('cash', 'card', 'jazzcash', 'easypaisa', 'raast', 'bank_transfer');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE bell_type AS ENUM ('call_waiter', 'need_water', 'clean_table', 'get_cutlery');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE staff_role AS ENUM ('super_admin', 'owner', 'manager', 'captain', 'waiter', 'kitchen');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. Utility Trigger Function: updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = clock_timestamp();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Tables

-- 1. restaurants
CREATE TABLE IF NOT EXISTS restaurants (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    name_ur text,
    slug text UNIQUE NOT NULL,
    timezone text NOT NULL DEFAULT 'Asia/Karachi',
    currency text NOT NULL DEFAULT 'PKR',
    billing_mode billing_mode NOT NULL DEFAULT 'POST_PAY',
    tax_bps integer NOT NULL DEFAULT 0 CHECK (tax_bps >= 0),
    service_charge_bps integer NOT NULL DEFAULT 0 CHECK (service_charge_bps >= 0),
    kds_amber_minutes integer NOT NULL DEFAULT 10 CHECK (kds_amber_minutes > 0),
    kds_late_minutes integer NOT NULL DEFAULT 15 CHECK (kds_late_minutes >= kds_amber_minutes),
    unpaid_alert_minutes integer NOT NULL DEFAULT 30 CHECK (unpaid_alert_minutes > 0),
    show_halal_tag boolean NOT NULL DEFAULT false,
    brand_color text CHECK (brand_color IS NULL OR brand_color ~* '^#[0-9a-f]{6}$'),
    logo_url text,
    suspended_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT uq_restaurants_composite UNIQUE (id)
);

CREATE TRIGGER trg_restaurants_updated_at
BEFORE UPDATE ON restaurants
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 2. branches
CREATE TABLE IF NOT EXISTS branches (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE RESTRICT,
    name text NOT NULL,
    name_ur text,
    address text,
    phone text,
    billing_mode_override billing_mode,
    is_active boolean NOT NULL DEFAULT true,
    is_archived boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT uq_branches_composite UNIQUE (id, restaurant_id)
);

CREATE TRIGGER trg_branches_updated_at
BEFORE UPDATE ON branches
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 3. tables
CREATE TABLE IF NOT EXISTS tables (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id uuid NOT NULL,
    branch_id uuid NOT NULL,
    table_number text NOT NULL,
    kind table_kind NOT NULL DEFAULT 'dine_in',
    capacity integer NOT NULL DEFAULT 4 CHECK (capacity > 0),
    qr_token text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
    is_active boolean NOT NULL DEFAULT true,
    is_archived boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT fk_tables_branch FOREIGN KEY (branch_id, restaurant_id) REFERENCES branches(id, restaurant_id) ON DELETE RESTRICT,
    CONSTRAINT uq_tables_composite UNIQUE (id, restaurant_id),
    CONSTRAINT uq_tables_branch_number UNIQUE (branch_id, table_number)
);

CREATE TRIGGER trg_tables_updated_at
BEFORE UPDATE ON tables
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 4. table_sessions
CREATE TABLE IF NOT EXISTS table_sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id uuid NOT NULL,
    branch_id uuid NOT NULL,
    table_id uuid NOT NULL,
    session_token text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(24), 'hex'),
    status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed')),
    opened_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    closed_at timestamptz,
    CONSTRAINT fk_sessions_branch FOREIGN KEY (branch_id, restaurant_id) REFERENCES branches(id, restaurant_id) ON DELETE RESTRICT,
    CONSTRAINT fk_sessions_table FOREIGN KEY (table_id, restaurant_id) REFERENCES tables(id, restaurant_id) ON DELETE RESTRICT,
    CONSTRAINT uq_table_sessions_composite UNIQUE (id, restaurant_id)
);

-- 5. categories
CREATE TABLE IF NOT EXISTS categories (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE RESTRICT,
    name text NOT NULL,
    name_ur text,
    display_order integer NOT NULL DEFAULT 0,
    is_hidden boolean NOT NULL DEFAULT false,
    is_archived boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT uq_categories_composite UNIQUE (id, restaurant_id)
);

CREATE TRIGGER trg_categories_updated_at
BEFORE UPDATE ON categories
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 6. menu_items
CREATE TABLE IF NOT EXISTS menu_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id uuid NOT NULL,
    category_id uuid NOT NULL,
    name text NOT NULL,
    name_ur text,
    description text,
    description_ur text,
    base_price_paisa bigint NOT NULL CHECK (base_price_paisa >= 0),
    image_url text,
    dietary_tags text[] NOT NULL DEFAULT '{}',
    allergens text[] NOT NULL DEFAULT '{}',
    is_available boolean NOT NULL DEFAULT true,
    is_archived boolean NOT NULL DEFAULT false,
    display_order integer NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT fk_menu_items_category FOREIGN KEY (category_id, restaurant_id) REFERENCES categories(id, restaurant_id) ON DELETE RESTRICT,
    CONSTRAINT uq_menu_items_composite UNIQUE (id, restaurant_id)
);

CREATE TRIGGER trg_menu_items_updated_at
BEFORE UPDATE ON menu_items
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 7. modifier_groups
CREATE TABLE IF NOT EXISTS modifier_groups (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE RESTRICT,
    name text NOT NULL,
    name_ur text,
    min_selections integer NOT NULL DEFAULT 0 CHECK (min_selections >= 0),
    max_selections integer NOT NULL DEFAULT 1 CHECK (max_selections >= min_selections),
    is_required boolean NOT NULL DEFAULT false,
    is_archived boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT uq_modifier_groups_composite UNIQUE (id, restaurant_id)
);

CREATE TRIGGER trg_modifier_groups_updated_at
BEFORE UPDATE ON modifier_groups
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 8. modifier_options
CREATE TABLE IF NOT EXISTS modifier_options (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id uuid NOT NULL,
    modifier_group_id uuid NOT NULL,
    name text NOT NULL,
    name_ur text,
    price_delta_paisa bigint NOT NULL DEFAULT 0 CHECK (price_delta_paisa >= 0),
    is_default boolean NOT NULL DEFAULT false,
    is_available boolean NOT NULL DEFAULT true,
    display_order integer NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT fk_modifier_options_group FOREIGN KEY (modifier_group_id, restaurant_id) REFERENCES modifier_groups(id, restaurant_id) ON DELETE RESTRICT,
    CONSTRAINT uq_modifier_options_composite UNIQUE (id, restaurant_id),
    CONSTRAINT chk_default_zero_price CHECK (NOT is_default OR price_delta_paisa = 0)
);

CREATE TRIGGER trg_modifier_options_updated_at
BEFORE UPDATE ON modifier_options
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 9. menu_item_modifier_groups
CREATE TABLE IF NOT EXISTS menu_item_modifier_groups (
    restaurant_id uuid NOT NULL,
    menu_item_id uuid NOT NULL,
    modifier_group_id uuid NOT NULL,
    display_order integer NOT NULL DEFAULT 0,
    PRIMARY KEY (menu_item_id, modifier_group_id),
    CONSTRAINT fk_mimg_item FOREIGN KEY (menu_item_id, restaurant_id) REFERENCES menu_items(id, restaurant_id) ON DELETE CASCADE,
    CONSTRAINT fk_mimg_group FOREIGN KEY (modifier_group_id, restaurant_id) REFERENCES modifier_groups(id, restaurant_id) ON DELETE CASCADE
);

-- 10. branch_menu_item_overrides
CREATE TABLE IF NOT EXISTS branch_menu_item_overrides (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id uuid NOT NULL,
    branch_id uuid NOT NULL,
    menu_item_id uuid NOT NULL,
    is_sold_out boolean NOT NULL DEFAULT false,
    price_override_paisa bigint CHECK (price_override_paisa IS NULL OR price_override_paisa >= 0),
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT fk_bmio_branch FOREIGN KEY (branch_id, restaurant_id) REFERENCES branches(id, restaurant_id) ON DELETE RESTRICT,
    CONSTRAINT fk_bmio_item FOREIGN KEY (menu_item_id, restaurant_id) REFERENCES menu_items(id, restaurant_id) ON DELETE RESTRICT,
    CONSTRAINT uq_bmio_composite UNIQUE (id, restaurant_id),
    CONSTRAINT uq_bmio_branch_item UNIQUE (branch_id, menu_item_id)
);

CREATE TRIGGER trg_branch_menu_item_overrides_updated_at
BEFORE UPDATE ON branch_menu_item_overrides
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 11. branch_order_counters
CREATE TABLE IF NOT EXISTS branch_order_counters (
    restaurant_id uuid NOT NULL,
    branch_id uuid NOT NULL,
    counter_date date NOT NULL,
    last_order_number integer NOT NULL DEFAULT 0 CHECK (last_order_number >= 0),
    PRIMARY KEY (branch_id, counter_date),
    CONSTRAINT fk_boc_branch FOREIGN KEY (branch_id, restaurant_id) REFERENCES branches(id, restaurant_id) ON DELETE RESTRICT
);

-- 12. orders
CREATE TABLE IF NOT EXISTS orders (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id uuid NOT NULL,
    branch_id uuid NOT NULL,
    table_id uuid NOT NULL,
    table_session_id uuid NOT NULL,
    daily_order_number integer NOT NULL CHECK (daily_order_number > 0),
    idempotency_key text,
    device_fingerprint text,
    status order_status NOT NULL,
    billing_mode billing_mode NOT NULL,
    subtotal_paisa bigint NOT NULL DEFAULT 0 CHECK (subtotal_paisa >= 0),
    tax_paisa bigint NOT NULL DEFAULT 0 CHECK (tax_paisa >= 0),
    service_charge_paisa bigint NOT NULL DEFAULT 0 CHECK (service_charge_paisa >= 0),
    discount_paisa bigint NOT NULL DEFAULT 0 CHECK (discount_paisa >= 0),
    total_paisa bigint NOT NULL DEFAULT 0 CHECK (total_paisa >= 0),
    rejection_reason text,
    cancellation_reason text,
    estimated_prep_minutes integer CHECK (estimated_prep_minutes IS NULL OR estimated_prep_minutes > 0),
    locked_by_staff_id uuid,
    placed_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    accepted_at timestamptz,
    preparing_at timestamptz,
    ready_at timestamptz,
    served_at timestamptz,
    completed_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT fk_orders_branch FOREIGN KEY (branch_id, restaurant_id) REFERENCES branches(id, restaurant_id) ON DELETE RESTRICT,
    CONSTRAINT fk_orders_table FOREIGN KEY (table_id, restaurant_id) REFERENCES tables(id, restaurant_id) ON DELETE RESTRICT,
    CONSTRAINT fk_orders_session FOREIGN KEY (table_session_id, restaurant_id) REFERENCES table_sessions(id, restaurant_id) ON DELETE RESTRICT,
    CONSTRAINT uq_orders_composite UNIQUE (id, restaurant_id),
    CONSTRAINT uq_orders_idempotency UNIQUE (restaurant_id, idempotency_key)
);

CREATE TRIGGER trg_orders_updated_at
BEFORE UPDATE ON orders
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 13. order_items
CREATE TABLE IF NOT EXISTS order_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id uuid NOT NULL,
    order_id uuid NOT NULL,
    menu_item_id uuid NOT NULL,
    name_snapshot text NOT NULL,
    unit_price_paisa bigint NOT NULL CHECK (unit_price_paisa >= 0),
    quantity integer NOT NULL CHECK (quantity > 0),
    modifiers_snapshot jsonb NOT NULL DEFAULT '[]',
    notes text,
    total_paisa bigint NOT NULL CHECK (total_paisa >= 0),
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT fk_order_items_order FOREIGN KEY (order_id, restaurant_id) REFERENCES orders(id, restaurant_id) ON DELETE RESTRICT,
    CONSTRAINT fk_order_items_item FOREIGN KEY (menu_item_id, restaurant_id) REFERENCES menu_items(id, restaurant_id) ON DELETE RESTRICT,
    CONSTRAINT uq_order_items_composite UNIQUE (id, restaurant_id)
);

-- 14. order_status_events
CREATE TABLE IF NOT EXISTS order_status_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id uuid NOT NULL,
    order_id uuid NOT NULL,
    from_status order_status,
    to_status order_status NOT NULL,
    actor_type text NOT NULL CHECK (actor_type IN ('guest', 'staff', 'system')),
    actor_id text,
    actor_name text,
    reason text,
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT fk_status_events_order FOREIGN KEY (order_id, restaurant_id) REFERENCES orders(id, restaurant_id) ON DELETE RESTRICT,
    CONSTRAINT uq_order_status_events_composite UNIQUE (id, restaurant_id)
);

-- 15. payments
CREATE TABLE IF NOT EXISTS payments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id uuid NOT NULL,
    branch_id uuid NOT NULL,
    order_id uuid,
    table_session_id uuid,
    amount_paisa bigint NOT NULL CHECK (amount_paisa >= 0),
    tip_paisa bigint NOT NULL DEFAULT 0 CHECK (tip_paisa >= 0),
    payment_method payment_method NOT NULL,
    status payment_status NOT NULL DEFAULT 'pending',
    reference_number text,
    notes text,
    collected_by_staff_id uuid,
    paid_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT fk_payments_branch FOREIGN KEY (branch_id, restaurant_id) REFERENCES branches(id, restaurant_id) ON DELETE RESTRICT,
    CONSTRAINT uq_payments_composite UNIQUE (id, restaurant_id)
);

CREATE TRIGGER trg_payments_updated_at
BEFORE UPDATE ON payments
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 16. call_bells
CREATE TABLE IF NOT EXISTS call_bells (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id uuid NOT NULL,
    branch_id uuid NOT NULL,
    table_id uuid NOT NULL,
    table_session_id uuid NOT NULL,
    bell_type bell_type NOT NULL,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'acknowledged', 'resolved')),
    handled_by_staff_id uuid,
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    resolved_at timestamptz,
    CONSTRAINT fk_call_bells_branch FOREIGN KEY (branch_id, restaurant_id) REFERENCES branches(id, restaurant_id) ON DELETE RESTRICT,
    CONSTRAINT fk_call_bells_table FOREIGN KEY (table_id, restaurant_id) REFERENCES tables(id, restaurant_id) ON DELETE RESTRICT,
    CONSTRAINT fk_call_bells_session FOREIGN KEY (table_session_id, restaurant_id) REFERENCES table_sessions(id, restaurant_id) ON DELETE RESTRICT,
    CONSTRAINT uq_call_bells_composite UNIQUE (id, restaurant_id)
);

-- 17. feedback
CREATE TABLE IF NOT EXISTS feedback (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id uuid NOT NULL,
    branch_id uuid NOT NULL,
    table_session_id uuid NOT NULL,
    order_id uuid,
    rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comments text,
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT fk_feedback_branch FOREIGN KEY (branch_id, restaurant_id) REFERENCES branches(id, restaurant_id) ON DELETE RESTRICT,
    CONSTRAINT uq_feedback_composite UNIQUE (id, restaurant_id)
);

-- 18. staff
CREATE TABLE IF NOT EXISTS staff (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE RESTRICT,
    branch_id uuid,
    auth_user_id uuid,
    username text,
    email text,
    full_name text NOT NULL,
    role staff_role NOT NULL,
    must_change_password boolean NOT NULL DEFAULT true,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT fk_staff_branch FOREIGN KEY (branch_id, restaurant_id) REFERENCES branches(id, restaurant_id) ON DELETE RESTRICT,
    CONSTRAINT uq_staff_composite UNIQUE (id, restaurant_id),
    CONSTRAINT uq_staff_restaurant_username UNIQUE (restaurant_id, username)
);

CREATE TRIGGER trg_staff_updated_at
BEFORE UPDATE ON staff
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 19. print_agents
CREATE TABLE IF NOT EXISTS print_agents (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id uuid NOT NULL,
    branch_id uuid NOT NULL,
    device_name text NOT NULL,
    token_hash text NOT NULL,
    is_active boolean NOT NULL DEFAULT true,
    last_seen_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT fk_print_agents_branch FOREIGN KEY (branch_id, restaurant_id) REFERENCES branches(id, restaurant_id) ON DELETE RESTRICT,
    CONSTRAINT uq_print_agents_composite UNIQUE (id, restaurant_id)
);

CREATE TRIGGER trg_print_agents_updated_at
BEFORE UPDATE ON print_agents
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 20. print_jobs
CREATE TABLE IF NOT EXISTS print_jobs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id uuid NOT NULL,
    branch_id uuid NOT NULL,
    print_agent_id uuid,
    job_type text NOT NULL CHECK (job_type IN ('kitchen_ticket', 'customer_receipt', 'bill')),
    payload jsonb NOT NULL,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'printed', 'failed')),
    retry_count integer NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    printed_at timestamptz,
    CONSTRAINT fk_print_jobs_branch FOREIGN KEY (branch_id, restaurant_id) REFERENCES branches(id, restaurant_id) ON DELETE RESTRICT,
    CONSTRAINT uq_print_jobs_composite UNIQUE (id, restaurant_id)
);

-- 21. subscription_plans
CREATE TABLE IF NOT EXISTS subscription_plans (
    id text PRIMARY KEY,
    name text NOT NULL,
    price_paisa bigint NOT NULL CHECK (price_paisa >= 0),
    features jsonb NOT NULL DEFAULT '{}',
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

-- 22. restaurant_subscriptions
CREATE TABLE IF NOT EXISTS restaurant_subscriptions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE RESTRICT,
    plan_id text NOT NULL REFERENCES subscription_plans(id) ON DELETE RESTRICT,
    status text NOT NULL DEFAULT 'active' CHECK (status IN ('trialing', 'active', 'past_due', 'canceled')),
    current_period_start timestamptz NOT NULL,
    current_period_end timestamptz NOT NULL,
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT uq_restaurant_subscriptions_composite UNIQUE (id, restaurant_id)
);

CREATE TRIGGER trg_restaurant_subscriptions_updated_at
BEFORE UPDATE ON restaurant_subscriptions
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 23. feature_flags
CREATE TABLE IF NOT EXISTS feature_flags (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id uuid REFERENCES restaurants(id) ON DELETE CASCADE,
    key text NOT NULL,
    is_enabled boolean NOT NULL DEFAULT false,
    description text,
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT uq_feature_flags_key_tenant UNIQUE (restaurant_id, key)
);

-- 24. vouchers
CREATE TABLE IF NOT EXISTS vouchers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE RESTRICT,
    code text NOT NULL,
    discount_type text NOT NULL CHECK (discount_type IN ('fixed_paisa', 'percentage_bps')),
    discount_value bigint NOT NULL CHECK (discount_value > 0),
    min_order_paisa bigint NOT NULL DEFAULT 0 CHECK (min_order_paisa >= 0),
    max_discount_paisa bigint CHECK (max_discount_paisa IS NULL OR max_discount_paisa > 0),
    valid_from timestamptz NOT NULL,
    valid_until timestamptz NOT NULL CHECK (valid_until > valid_from),
    usage_limit integer CHECK (usage_limit IS NULL OR usage_limit > 0),
    times_used integer NOT NULL DEFAULT 0 CHECK (times_used >= 0),
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT uq_vouchers_composite UNIQUE (id, restaurant_id),
    CONSTRAINT uq_vouchers_restaurant_code UNIQUE (restaurant_id, code)
);

CREATE TRIGGER trg_vouchers_updated_at
BEFORE UPDATE ON vouchers
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 5. Foreign Key and Operational Indexes
CREATE INDEX IF NOT EXISTS idx_branches_restaurant ON branches(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_tables_branch ON tables(branch_id, restaurant_id);
CREATE INDEX IF NOT EXISTS idx_tables_qr_token ON tables(qr_token);
CREATE INDEX IF NOT EXISTS idx_table_sessions_table ON table_sessions(table_id, restaurant_id);
CREATE INDEX IF NOT EXISTS idx_table_sessions_token ON table_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_categories_restaurant ON categories(restaurant_id, display_order);
CREATE INDEX IF NOT EXISTS idx_menu_items_category ON menu_items(category_id, restaurant_id);
CREATE INDEX IF NOT EXISTS idx_modifier_groups_restaurant ON modifier_groups(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_modifier_options_group ON modifier_options(modifier_group_id, restaurant_id);
CREATE INDEX IF NOT EXISTS idx_branch_menu_item_overrides_branch ON branch_menu_item_overrides(branch_id, restaurant_id);

-- Operational indexes for live screens (SPEC.md §5: (restaurant_id, status, created_at))
CREATE INDEX IF NOT EXISTS idx_orders_live ON orders(restaurant_id, status, created_at);
CREATE INDEX IF NOT EXISTS idx_orders_branch_live ON orders(branch_id, status, created_at);
CREATE INDEX IF NOT EXISTS idx_orders_session ON orders(table_session_id, restaurant_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id, restaurant_id);
CREATE INDEX IF NOT EXISTS idx_order_status_events_order ON order_status_events(order_id, created_at);
CREATE INDEX IF NOT EXISTS idx_payments_order ON payments(order_id, restaurant_id);
CREATE INDEX IF NOT EXISTS idx_call_bells_live ON call_bells(branch_id, status, created_at);
CREATE INDEX IF NOT EXISTS idx_staff_auth_user ON staff(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_staff_restaurant_role ON staff(restaurant_id, role);
CREATE INDEX IF NOT EXISTS idx_print_jobs_pending ON print_jobs(branch_id, status, created_at);
