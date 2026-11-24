-- Seed File: supabase/staging-seed.sql
-- Staging Data: Restaurants, Branches, Tables, Menu, Modifiers ONLY.
-- (Staff accounts are strictly excluded; they will be seeded in Phase 3).

-- ============================================================================
-- 1. Subscription Plans
-- ============================================================================
INSERT INTO subscription_plans (id, name, price_paisa, features) VALUES
('starter', 'Starter Tier', 500000, '{"kds": true, "max_branches": 1, "analytics": false}'::jsonb),
('pro', 'Pro Tier', 1500000, '{"kds": true, "max_branches": 5, "analytics": true, "print_agent": true}'::jsonb),
('enterprise', 'Enterprise Tier', 3500000, '{"kds": true, "max_branches": 50, "analytics": true, "print_agent": true, "custom_domain": true}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 2. Demo Restaurants
-- ============================================================================
-- Restaurant 1: Post-Pay Dine-In (Karachi Biryani & Grill)
-- Restaurant 2: Pre-Pay Counter (Chai & Paratha QSR)
-- Restaurant 3: Suspended (The Suspended Café)
INSERT INTO restaurants (
    id, name, name_ur, slug, timezone, currency, billing_mode,
    tax_bps, service_charge_bps, kds_amber_minutes, kds_late_minutes,
    unpaid_alert_minutes, show_halal_tag, brand_color, suspended_at
) VALUES
(
    '11111111-1111-1111-1111-111111111111',
    'Karachi Biryani & Grill',
    'کراچی بریانی اینڈ گرل',
    'karachi-biryani',
    'Asia/Karachi',
    'PKR',
    'POST_PAY',
    1600, -- 16% SST
    500,  -- 5% Service Charge
    10,
    15,
    30,
    true,
    '#0f766e',
    NULL
),
(
    '22222222-2222-2222-2222-222222222222',
    'Chai & Paratha QSR',
    'چائے اور پراٹھا',
    'chai-paratha',
    'Asia/Karachi',
    'PKR',
    'PRE_PAY',
    0,    -- 0% Tax
    0,
    8,
    12,
    20,
    true,
    '#b45309',
    NULL
),
(
    '33333333-3333-3333-3333-333333333333',
    'The Suspended Café',
    'معطل کیفے',
    'suspended-cafe',
    'Asia/Karachi',
    'PKR',
    'POST_PAY',
    1600,
    0,
    10,
    15,
    30,
    false,
    '#64748b',
    '2026-11-01T00:00:00+05:00' -- Suspended
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    billing_mode = EXCLUDED.billing_mode,
    tax_bps = EXCLUDED.tax_bps,
    suspended_at = EXCLUDED.suspended_at;

-- Subscriptions for Demo Restaurants
INSERT INTO restaurant_subscriptions (id, restaurant_id, plan_id, status, current_period_start, current_period_end) VALUES
('11111111-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'pro', 'active', now(), now() + interval '30 days'),
('22222222-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'starter', 'active', now(), now() + interval '30 days'),
('33333333-0000-0000-0000-000000000001', '33333333-3333-3333-3333-333333333333', 'starter', 'past_due', now() - interval '60 days', now() - interval '30 days')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 3. Branches
-- ============================================================================
INSERT INTO branches (id, restaurant_id, name, name_ur, address, phone, is_active) VALUES
-- Restaurant 1 Branches
('11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'Clifton Branch', 'کلفٹن برانچ', 'Block 4, Clifton, Karachi', '+923001234567', true),
('11111111-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', 'DHA Phase 6', 'ڈی ایچ اے فیز 6', 'Shahbaz Commercial, DHA, Karachi', '+923007654321', true),
-- Restaurant 2 Branches
('22222222-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 'Gulshan Express', 'گلشن ایکسپریس', 'Block 13-C, Gulshan-e-Iqbal, Karachi', '+923121112233', true),
-- Restaurant 3 Branches
('33333333-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333', 'Main Branch', 'مین برانچ', 'F-7 Markaz, Islamabad', '+923334445566', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 4. Tables with Un-guessable Hex QR Tokens
-- ============================================================================
INSERT INTO tables (id, restaurant_id, branch_id, table_number, kind, capacity, qr_token, is_active) VALUES
-- Karachi Biryani - Clifton Tables
('11111111-t001-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'T-01', 'dine_in', 4, 'qr_kb_clifton_t01_8f9a2b1c4d', true),
('11111111-t002-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'T-02', 'dine_in', 6, 'qr_kb_clifton_t02_e3b1c7f920', true),
('11111111-t003-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'T-03', 'dine_in', 2, 'qr_kb_clifton_t03_12a7d8c4e5', true),
-- Chai & Paratha - Gulshan Counter Order Point
('22222222-t001-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', '22222222-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Counter-1', 'counter', 1, 'qr_cp_gulshan_c01_99a8b7c6d5', true),
('22222222-t002-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', '22222222-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Table-01', 'dine_in', 4, 'qr_cp_gulshan_t01_33f2e1d0c9', true),
-- The Suspended Café - Main Branch (Suspension Gate Test Table)
('33333333-t001-0000-0000-000000000001', '33333333-3333-3333-3333-333333333333', '33333333-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'T-01', 'dine_in', 4, 'qr_sc_main_t01_a1b2c3d4e5', true)
ON CONFLICT (id) DO NOTHING;

-- Active Table Session for testing
INSERT INTO table_sessions (id, restaurant_id, branch_id, table_id, session_token, status) VALUES
('11111111-s001-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-t001-0000-0000-000000000001', 'sess_kb_clifton_t01_act123456789abcdef', 'active')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 5. Categories
-- ============================================================================
INSERT INTO categories (id, restaurant_id, name, name_ur, display_order) VALUES
-- Karachi Biryani Categories
('11111111-c001-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Special Biryani', 'خاص بریانی', 1),
('11111111-c002-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'BBQ & Grills', 'بار بی کیو اور گرل', 2),
('11111111-c003-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'Cold Drinks & Raita', 'کولڈ ڈرنکس اور رائتہ', 3),
-- Chai & Paratha Categories
('22222222-c001-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'Special Chai', 'خاص چائے', 1),
('22222222-c002-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'Crispy Parathas', 'کرسپی پراٹھے', 2)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 6. Menu Items (Integer Paisa: 85000 paisa = 850 PKR)
-- ============================================================================
INSERT INTO menu_items (
    id, restaurant_id, category_id, name, name_ur, description, description_ur,
    base_price_paisa, dietary_tags, allergens, is_available, display_order
) VALUES
-- Karachi Biryani Items
(
    '11111111-m001-0000-0000-000000000001',
    '11111111-1111-1111-1111-111111111111',
    '11111111-c001-0000-0000-000000000001',
    'Chicken Dum Biryani (Single)',
    'چکن دم بریانی (سنگل)',
    'Traditional fragrant basmati rice cooked with spiced chicken and tender potato.',
    'روایتی خوشبودار باسمتی چاول، مصالحہ دار چکن اور آلو کے ساتھ۔',
    55000, -- 550 PKR
    ARRAY['halal', 'poultry'],
    ARRAY['dairy'],
    true,
    1
),
(
    '11111111-m002-0000-0000-000000000002',
    '11111111-1111-1111-1111-111111111111',
    '11111111-c001-0000-0000-000000000001',
    'Special Beef Biryani (Double)',
    'اسپیشل بیف بریانی (ڈبل)',
    'Double portion aromatic beef biryani with succulent meat pieces.',
    'ڈبل پورشن خوشبودار بیف بریانی، لذیذ اور نرم گوشت کی بوٹیوں کے ساتھ۔',
    95000, -- 950 PKR
    ARRAY['halal', 'beef'],
    ARRAY['dairy'],
    true,
    2
),
(
    '11111111-m003-0000-0000-000000000003',
    '11111111-1111-1111-1111-111111111111',
    '11111111-c002-0000-0000-000000000002',
    'Chicken Malai Boti (8 pcs)',
    'چکن ملائی بوٹی (8 پیس)',
    'Melt-in-mouth chicken cubes marinated in rich fresh cream and mild spices.',
    'تازہ ملائی اور ہلکے مصالحوں میں تیار شدہ انتہائی نرم چکن بوٹی۔',
    85000, -- 850 PKR
    ARRAY['halal', 'poultry'],
    ARRAY['dairy'],
    true,
    3
),
(
    '11111111-m004-0000-0000-000000000004',
    '11111111-1111-1111-1111-111111111111',
    '11111111-c003-0000-0000-000000000003',
    'Fresh Mint Zeera Raita',
    'پودینہ اور زیرہ رائتہ',
    'Chilled whipped yogurt with roasted cumin and fresh garden mint.',
    'بھنا ہوا زیرہ اور تازہ پودینے والا ٹھنڈا رائتہ۔',
    10000, -- 100 PKR
    ARRAY['vegetarian'],
    ARRAY['dairy'],
    true,
    4
),
-- Chai & Paratha Items
(
    '22222222-m001-0000-0000-000000000001',
    '22222222-2222-2222-2222-222222222222',
    '22222222-c001-0000-0000-000000000001',
    'Karak Doodh Patti Chai',
    'کڑک دودھ پتی چائے',
    'Slow-brewed rich Pakistani tea with full cream milk and green cardamom.',
    'سبز الائچی اور خالص دودھ سے تیار کردہ روایتی کڑک چائے۔',
    15000, -- 150 PKR
    ARRAY['vegetarian'],
    ARRAY['dairy'],
    true,
    1
),
(
    '22222222-m002-0000-0000-000000000002',
    '22222222-2222-2222-2222-222222222222',
    '22222222-c002-0000-0000-000000000002',
    'Chicken Cheese Paratha',
    'چکن چیز پراٹھا',
    'Crispy golden flaky paratha stuffed with spiced shredded chicken and melted mozzarella.',
    'کرسپی سنہری لچھے دار پراٹھا، مصالحہ دار چکن اور پگھلی ہوئی پنیر کے ساتھ۔',
    42000, -- 420 PKR
    ARRAY['halal', 'poultry'],
    ARRAY['dairy', 'gluten'],
    true,
    2
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 7. Modifier Groups & Options
-- Hard-won rule #5: Never preselect an option that costs money.
-- ============================================================================
-- Biryani Spice Level (Required, Single Selection, Default is Normal which has 0 delta)
INSERT INTO modifier_groups (id, restaurant_id, name, name_ur, min_selections, max_selections, is_required) VALUES
('11111111-g001-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Spice Level', 'مرچوں کی مقدار', 1, 1, true),
('11111111-g002-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'Add-ons', 'اضافی اشیاء', 0, 3, false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO modifier_options (id, restaurant_id, modifier_group_id, name, name_ur, price_delta_paisa, is_default, display_order) VALUES
-- Spice options (Default is 0 price delta)
('11111111-o001-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', '11111111-g001-0000-0000-000000000001', 'Regular Spicy', 'درمیانہ', 0, true, 1),
('11111111-o002-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', '11111111-g001-0000-0000-000000000001', 'Extra Spicy', 'تیز مرچ', 0, false, 2),
-- Add-ons (Non-zero price delta CANNOT be default)
('11111111-o003-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', '11111111-g002-0000-0000-000000000002', 'Extra Aloo (Potato)', 'اضافی آلو', 5000, false, 1),
('11111111-o004-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', '11111111-g002-0000-0000-000000000002', 'Extra Chicken Piece', 'اضافی چکن پیس', 20000, false, 2)
ON CONFLICT (id) DO NOTHING;

-- Link Modifier Groups to Menu Items
INSERT INTO menu_item_modifier_groups (restaurant_id, menu_item_id, modifier_group_id, display_order) VALUES
('11111111-1111-1111-1111-111111111111', '11111111-m001-0000-0000-000000000001', '11111111-g001-0000-0000-000000000001', 1),
('11111111-1111-1111-1111-111111111111', '11111111-m001-0000-0000-000000000001', '11111111-g002-0000-0000-000000000002', 2)
ON CONFLICT (menu_item_id, modifier_group_id) DO NOTHING;
