-- pgTAP Tests: supabase/tests/database/rls.test.sql
-- Covers: Cross-tenant isolation, branch scoping, role limits, anon denied, super-admin bypass, and money column update protection.

BEGIN;
SELECT plan(7);

-- Setup Test IDs
\set r1 '11111111-1111-1111-1111-111111111111'
\set r2 '22222222-2222-2222-2222-222222222222'
\set auth_admin 'aaaaaaaa-0000-0000-0000-000000000001'
\set auth_owner_r1 '11111111-0000-0000-0000-000000000010'
\set auth_manager_r1 '11111111-0000-0000-0000-000000000020'
\set auth_waiter_r1 '11111111-0000-0000-0000-000000000040'
\set auth_kitchen_r1 '11111111-0000-0000-0000-000000000050'

-- ============================================================================
-- TEST 1: Anon role is denied direct SELECT on orders
-- ============================================================================
SET LOCAL ROLE anon;
SELECT throws_ok(
    'SELECT count(*) FROM orders',
    '42501', -- permission_denied error code
    NULL,
    'Test 1: Anon role is denied direct SELECT on orders'
);

-- ============================================================================
-- TEST 2: Cross-Tenant Isolation
-- Authenticated staff of Restaurant 1 cannot see Restaurant 2 records
-- ============================================================================
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub": "11111111-0000-0000-0000-000000000010", "role": "authenticated"}', true);

SELECT is(
    (SELECT count(*)::integer FROM restaurants WHERE id = '22222222-2222-2222-2222-222222222222'),
    0,
    'Test 2: Restaurant 1 owner cannot see Restaurant 2'
);

-- ============================================================================
-- TEST 3: Branch Scoping
-- Staff assigned to Clifton branch cannot view orders of another branch
-- ============================================================================
SELECT set_config('request.jwt.claims', '{"sub": "11111111-0000-0000-0000-000000000040", "role": "authenticated"}', true);

SELECT is(
    (SELECT count(*)::integer FROM orders WHERE branch_id = '11111111-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
    0,
    'Test 3: Clifton waiter cannot see orders from DHA branch'
);

-- ============================================================================
-- TEST 4: Role Restriction - Kitchen cannot see payments
-- ============================================================================
SELECT set_config('request.jwt.claims', '{"sub": "11111111-0000-0000-0000-000000000050", "role": "authenticated"}', true);

SELECT is(
    (SELECT count(*)::integer FROM payments WHERE restaurant_id = '11111111-1111-1111-1111-111111111111'),
    0,
    'Test 4: Kitchen staff sees 0 payment records via RLS policy'
);

-- ============================================================================
-- TEST 5: Role Restriction - Waiter cannot reject an order
-- ============================================================================
SELECT set_config('request.jwt.claims', '{"sub": "11111111-0000-0000-0000-000000000040", "role": "authenticated"}', true);

SELECT throws_ok(
    $$UPDATE orders SET status = 'rejected', rejection_reason = 'Waiter attempted reject' WHERE id = '11111111-ord1-0000-0000-000000000001'$$,
    '42501', -- RLS WITH CHECK violation / permission denied
    NULL,
    'Test 5: Waiter is denied updating an order status to rejected'
);

-- ============================================================================
-- TEST 6: Financial Protection - Authenticated staff cannot update total_paisa
-- (Proving column-level grant enforcement)
-- ============================================================================
SELECT set_config('request.jwt.claims', '{"sub": "11111111-0000-0000-0000-000000000020", "role": "authenticated"}', true);

SELECT throws_ok(
    $$UPDATE orders SET total_paisa = 100 WHERE id = '11111111-ord1-0000-0000-000000000001'$$,
    '42501', -- permission_denied on column total_paisa
    NULL,
    'Test 6: Authenticated staff cannot update total_paisa (column-level grant denied)'
);

-- ============================================================================
-- TEST 7: Super-Admin Access across Tenants
-- ============================================================================
SELECT set_config('request.jwt.claims', '{"sub": "aaaaaaaa-0000-0000-0000-000000000001", "role": "authenticated"}', true);

SELECT cmp_ok(
    (SELECT count(*)::integer FROM restaurants),
    '>=',
    2,
    'Test 7: Super-admin sees all restaurants across tenants'
);

SELECT * FROM finish();
ROLLBACK;
