import test, { describe } from 'node:test'
import assert from 'node:assert/strict'
import type { GuestMenuResult } from '../src/app/actions/guest.ts'

describe('Guest Menu Result Discrimination (DEC-021)', () => {
  test('handles success status with complete restaurant and table context', () => {
    const res: GuestMenuResult = {
      status: 'success',
      data: {
        restaurant: {
          id: '11111111-1111-1111-1111-111111111111',
          name: 'Karachi Biryani & Grill',
          nameUr: 'کراچی بریانی',
          slug: 'karachi-biryani',
          timezone: 'Asia/Karachi',
          currency: 'PKR',
          billingMode: 'POST_PAY',
          taxBps: 1600,
          serviceChargeBps: 500,
          brandColor: '#0f766e',
          logoUrl: null,
          showHalalTag: true,
          isSuspended: false,
        },
        branch: {
          id: 'branch-1',
          name: 'Clifton Branch',
          nameUr: null,
          billingMode: 'POST_PAY',
        },
        table: {
          id: 'table-1',
          tableNumber: 'T-01',
          kind: 'dine_in',
          capacity: 4,
          qrToken: 'qr_kb_clifton_t01_8f9a2b1c4d',
        },
        categories: [],
        items: [],
      },
    }

    assert.equal(res.status, 'success')
    if (res.status === 'success') {
      assert.equal(res.data.restaurant.slug, 'karachi-biryani')
      assert.equal(res.data.restaurant.isSuspended, false)
      assert.equal(res.data.table.tableNumber, 'T-01')
    }
  })

  test('differentiates not_found from db_error', () => {
    const notFoundRes: GuestMenuResult = {
      status: 'not_found',
      message: 'Table QR code "invalid_token" not found or inactive',
    }
    const dbErrorRes: GuestMenuResult = {
      status: 'db_error',
      error: 'fetch failed: connect ECONNREFUSED 127.0.0.1:54321',
    }

    assert.equal(notFoundRes.status, 'not_found')
    assert.equal(dbErrorRes.status, 'db_error')
    assert.match(dbErrorRes.error, /ECONNREFUSED/)
    assert.match(notFoundRes.message, /not found/)
  })

  test('guarantees exhaustive discrimination at compile time', () => {
    function processResult(res: GuestMenuResult): string {
      switch (res.status) {
        case 'success':
          return `Loaded: ${res.data.restaurant.name}`
        case 'not_found':
          return `Not found: ${res.message}`
        case 'db_error':
          return `DB error: ${res.error}`
        default: {
          const _exhaustive: never = res
          return _exhaustive
        }
      }
    }

    assert.equal(
      processResult({ status: 'not_found', message: 'Token expired' }),
      'Not found: Token expired'
    )
    assert.equal(
      processResult({ status: 'db_error', error: 'Database connection timeout' }),
      'DB error: Database connection timeout'
    )
  })
})
