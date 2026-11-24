-- pgTAP Hosted-Runnable Tests: supabase/tests/database/rls.test.hosted.sql
-- Run directly in the Supabase Dashboard -> SQL Editor
-- Features:
-- 1. Enables pgtap extension in extensions schema (Supabase standard)
-- 2. Aggregates all test assertions into a single result table (so SQL Editor displays every test line)
-- 3. Grants temp table permissions and resets role after each test to prevent permission denied on _test_output
-- 4. Rollback safe: leaves zero test data in the database

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET search_path = public, extensions;

BEGIN;

-- Temporary table to collect all TAP outputs for unified display in Supabase SQL Editor
CREATE TEMP TABLE IF NOT EXISTS _test_output (
    id serial PRIMARY KEY,
    tap_output text
);

-- Grant write access on temp table to all roles so role-switching tests can write results
GRANT ALL ON TABLE _test_output TO anon, authenticated, public;
GRANT ALL ON ALL SEQUENCES IN SCHEMA pg_temp TO anon, authenticated, public;

-- Initialize Plan (7 Test Suites)
INSERT INTO _test_output (tap_output) SELECT plan(7);

-- ============================================================================
-- TEST 1: Anon role is denied direct SELECT on orders (Hard-won Rule #2)
-- ============================================================================
SET LOCAL ROLE anon;
INSERT INTO _test_output (tap_output) SELECT throws_ok(
    'SELECT count(*) FROM orders',
    '42501', -- permission_denied
    NULL,
    'Test 1: Anon role is denied direct SELECT on orders'
);
RESET ROLE;

-- ============================================================================
-- TEST 2: Cross-Tenant Isolation
-- Authenticated staff of Restaurant 1 cannot see Restaurant 2 records
-- ============================================================================
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub": "11111111-0000-0000-0000-000000000010", "role": "authenticated"}', true);

INSERT INTO _test_output (tap_output) SELECT is(
    (SELECT count(*)::integer FROM restaurants WHERE id = '22222222-2222-2222-2222-222222222222'),
    0,
    'Test 2: Restaurant 1 owner cannot see Restaurant 2'
);
RESET ROLE;

-- ============================================================================
-- TEST 3: Branch Scoping
-- Staff assigned to Clifton branch cannot view orders of another branch
-- ============================================================================
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub": "11111111-0000-0000-0000-000000000040", "role": "authenticated"}', true);

INSERT INTO _test_output (tap_output) SELECT is(
    (SELECT count(*)::integer FROM orders WHERE branch_id = '11111111-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
    0,
    'Test 3: Clifton waiter cannot see orders from DHA branch'
);
RESET ROLE;

-- ============================================================================
-- TEST 4: Role Restriction - Kitchen cannot see payments
-- ============================================================================
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub": "11111111-0000-0000-0000-000000000050", "role": "authenticated"}', true);

INSERT INTO _test_output (tap_output) SELECT is(
    (SELECT count(*)::integer FROM payments WHERE restaurant_id = '11111111-1111-1111-1111-111111111111'),
    0,
    'Test 4: Kitchen staff sees 0 payment records via RLS policy'
);
RESET ROLE;

-- ============================================================================
-- TEST 5: Role Restriction - Waiter cannot reject an order
-- ============================================================================
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub": "11111111-0000-0000-0000-000000000040", "role": "authenticated"}', true);

INSERT INTO _test_output (tap_output) SELECT throws_ok(
    $$UPDATE orders SET status = 'rejected', rejection_reason = 'Waiter attempted reject' WHERE id = '11111111-ord1-0000-0000-000000000001'$$,
    '42501', -- permission_denied
    NULL,
    'Test 5: Waiter is denied updating an order status to rejected'
);
RESET ROLE;

-- ============================================================================
-- TEST 6: Financial Protection - Authenticated staff cannot update total_paisa
-- (Proving column-level grant enforcement)
-- ============================================================================
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub": "11111111-0000-0000-0000-000000000020", "role": "authenticated"}', true);

INSERT INTO _test_output (tap_output) SELECT throws_ok(
    $$UPDATE orders SET total_paisa = 100 WHERE id = '11111111-ord1-0000-0000-000000000001'$$,
    '42501', -- permission_denied on column total_paisa
    NULL,
    'Test 6: Authenticated staff cannot update total_paisa (column-level grant denied)'
);
RESET ROLE;

-- ============================================================================
-- TEST 7: Super-Admin Access across Tenants
-- ============================================================================
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub": "aaaaaaaa-0000-0000-0000-000000000001", "role": "authenticated"}', true);

INSERT INTO _test_output (tap_output) SELECT cmp_ok(
    (SELECT count(*)::integer FROM restaurants),
    '>=',
    2,
    'Test 7: Super-admin sees all restaurants across tenants'
);
RESET ROLE;

-- Finish TAP
INSERT INTO _test_output (tap_output) SELECT * FROM finish();

-- Unified result set: Returns all TAP lines in a single table output in Supabase SQL Editor
SELECT tap_output AS "pgTAP Test Results" FROM _test_output ORDER BY id;

ROLLBACK;
