import test, { describe } from 'node:test'
import assert from 'node:assert/strict'
import {
  openSessionSchema,
  orderItemInputSchema,
  placeOrderInputSchema,
} from '../src/lib/validations/guest.ts'

describe('Guest Input Validations (Zod Strict)', () => {
  describe('openSessionSchema', () => {
    test('accepts valid session opening payload', () => {
      const valid = {
        qrToken: 'tok_kbc_t01',
        deviceFingerprint: 'dev_fp_1234567890abcdef',
      }
      const result = openSessionSchema.safeParse(valid)
      assert.equal(result.success, true)
    })

    test('rejects empty qrToken', () => {
      const invalid = {
        qrToken: '',
        deviceFingerprint: 'dev_fp_1234567890abcdef',
      }
      const result = openSessionSchema.safeParse(invalid)
      assert.equal(result.success, false)
    })

    test('rejects short device fingerprint (< 8 chars)', () => {
      const invalid = {
        qrToken: 'tok_kbc_t01',
        deviceFingerprint: 'short',
      }
      const result = openSessionSchema.safeParse(invalid)
      assert.equal(result.success, false)
    })

    test('rejects unexpected properties due to .strict()', () => {
      const invalid = {
        qrToken: 'tok_kbc_t01',
        deviceFingerprint: 'dev_fp_1234567890abcdef',
        maliciousField: 'exploit',
      }
      const result = openSessionSchema.safeParse(invalid)
      assert.equal(result.success, false)
    })
  })

  describe('orderItemInputSchema', () => {
    const validItem = {
      menuItemId: '550e8400-e29b-41d4-a716-446655440000',
      quantity: 2,
      selectedModifierOptionIds: [
        '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
      ],
      notes: 'No spicy please',
      expectedUnitPricePaisa: 65000,
      expectedLineTotalPaisa: 130000,
    }

    test('accepts valid order line item', () => {
      const result = orderItemInputSchema.safeParse(validItem)
      assert.equal(result.success, true)
    })

    test('rejects non-UUID menuItemId', () => {
      const invalid = { ...validItem, menuItemId: 'not-a-uuid' }
      const result = orderItemInputSchema.safeParse(invalid)
      assert.equal(result.success, false)
    })

    test('rejects non-integer or zero quantity', () => {
      const zeroQty = { ...validItem, quantity: 0 }
      const floatQty = { ...validItem, quantity: 1.5 }

      assert.equal(orderItemInputSchema.safeParse(zeroQty).success, false)
      assert.equal(orderItemInputSchema.safeParse(floatQty).success, false)
    })

    test('rejects quantity exceeding maximum bound (50 per line)', () => {
      const excessiveQty = { ...validItem, quantity: 51 }
      const result = orderItemInputSchema.safeParse(excessiveQty)
      assert.equal(result.success, false)
    })

    test('rejects negative paisa prices', () => {
      const negativePrice = { ...validItem, expectedUnitPricePaisa: -100 }
      const result = orderItemInputSchema.safeParse(negativePrice)
      assert.equal(result.success, false)
    })

    test('rejects notes exceeding 250 characters', () => {
      const longNotes = { ...validItem, notes: 'a'.repeat(251) }
      const result = orderItemInputSchema.safeParse(longNotes)
      assert.equal(result.success, false)
    })

    test('allows null or omitted notes', () => {
      const nullNotes = { ...validItem, notes: null }
      const omittedNotes = { ...validItem }
      delete (omittedNotes as Record<string, unknown>).notes

      assert.equal(orderItemInputSchema.safeParse(nullNotes).success, true)
      assert.equal(orderItemInputSchema.safeParse(omittedNotes).success, true)
    })

    test('rejects unexpected fields due to .strict()', () => {
      const poisoned = { ...validItem, discountBps: 10000 }
      assert.equal(orderItemInputSchema.safeParse(poisoned).success, false)
    })
  })

  describe('placeOrderInputSchema', () => {
    const validItem = {
      menuItemId: '550e8400-e29b-41d4-a716-446655440000',
      quantity: 1,
      selectedModifierOptionIds: [],
      notes: null,
      expectedUnitPricePaisa: 50000,
      expectedLineTotalPaisa: 50000,
    }

    const validPayload = {
      qrToken: 'tok_kbc_t01',
      sessionId: '7a24449c-f9e5-4299-8d19-45e032b35a64',
      deviceFingerprint: 'dev_fp_abcdef1234567890',
      idempotencyKey: '8e1c6b12-d95b-4131-bfe5-3b95a89e93bc',
      items: [validItem],
      expectedSubtotalPaisa: 50000,
      expectedTaxPaisa: 8000,
      expectedServiceChargePaisa: 2500,
      expectedTotalPaisa: 60500,
    }

    test('accepts valid complete place order payload', () => {
      const result = placeOrderInputSchema.safeParse(validPayload)
      assert.equal(result.success, true)
    })

    test('rejects empty items array', () => {
      const emptyItems = { ...validPayload, items: [] }
      const result = placeOrderInputSchema.safeParse(emptyItems)
      assert.equal(result.success, false)
    })

    test('rejects invalid UUID for sessionId or idempotencyKey', () => {
      const invalidSession = { ...validPayload, sessionId: 'session-123' }
      const invalidIdemp = { ...validPayload, idempotencyKey: 'idemp-123' }

      assert.equal(placeOrderInputSchema.safeParse(invalidSession).success, false)
      assert.equal(placeOrderInputSchema.safeParse(invalidIdemp).success, false)
    })

    test('rejects negative subtotal or total sums', () => {
      const negativeTotal = { ...validPayload, expectedTotalPaisa: -1 }
      assert.equal(placeOrderInputSchema.safeParse(negativeTotal).success, false)
    })

    test('rejects tampered payloads with unauthorized extra properties', () => {
      const tampered = { ...validPayload, bypassPayment: true }
      assert.equal(placeOrderInputSchema.safeParse(tampered).success, false)
    })
  })
})
