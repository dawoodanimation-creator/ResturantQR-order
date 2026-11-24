import test, { describe } from 'node:test'
import assert from 'node:assert/strict'
import { evaluateOrderRateLimits } from '../src/lib/rate-limit.ts'

describe('Order Rate Limiting (SPEC §3, Hard-won Rule #6)', () => {
  test('allows order when all boundaries are within limits', () => {
    const decision = evaluateOrderRateLimits({
      hasOrderInLast15Seconds: false,
      deviceOrderCountLast10Minutes: 0,
      sessionOrderCountLast10Minutes: 0,
    })
    assert.equal(decision.allowed, true)
    assert.equal(decision.error, undefined)
  })

  test('blocks order if placed within 15 seconds of previous order from same device', () => {
    const decision = evaluateOrderRateLimits({
      hasOrderInLast15Seconds: true,
      deviceOrderCountLast10Minutes: 1,
      sessionOrderCountLast10Minutes: 1,
    })
    assert.equal(decision.allowed, false)
    assert.match(decision.error || '', /15 seconds/)
  })

  test('allows up to 4 orders and exactly 5th order per 10 minutes per device', () => {
    // 4th order within 10 min (count = 4)
    const fourthOrder = evaluateOrderRateLimits({
      hasOrderInLast15Seconds: false,
      deviceOrderCountLast10Minutes: 4,
      sessionOrderCountLast10Minutes: 4,
    })
    assert.equal(fourthOrder.allowed, true)
  })

  test('blocks 6th order when device reaches limit of 5 orders per 10 minutes', () => {
    // 5 orders already placed in last 10 minutes
    const sixthOrder = evaluateOrderRateLimits({
      hasOrderInLast15Seconds: false,
      deviceOrderCountLast10Minutes: 5,
      sessionOrderCountLast10Minutes: 5,
    })
    assert.equal(sixthOrder.allowed, false)
    assert.match(decisionMessage(sixthOrder), /5 orders per 10 minutes/)
  })

  test('allows up to 19 orders within table session across multiple guests', () => {
    // Shared table session with 19 orders placed across multiple devices
    const nineteenth = evaluateOrderRateLimits({
      hasOrderInLast15Seconds: false,
      deviceOrderCountLast10Minutes: 1,
      sessionOrderCountLast10Minutes: 19,
    })
    assert.equal(nineteenth.allowed, true)
  })

  test('blocks order when session reaches limit of 20 orders per 10 minutes', () => {
    // Session reached 20 orders within 10 minutes
    const twentyFirst = evaluateOrderRateLimits({
      hasOrderInLast15Seconds: false,
      deviceOrderCountLast10Minutes: 1,
      sessionOrderCountLast10Minutes: 20,
    })
    assert.equal(twentyFirst.allowed, false)
    assert.match(decisionMessage(twentyFirst), /20 orders per 10 minutes/)
  })

  test('prioritizes 15s cooldown check before evaluating aggregate frequency limits', () => {
    const rapidFire = evaluateOrderRateLimits({
      hasOrderInLast15Seconds: true,
      deviceOrderCountLast10Minutes: 10,
      sessionOrderCountLast10Minutes: 30,
    })
    assert.equal(rapidFire.allowed, false)
    assert.match(rapidFire.error || '', /15 seconds/)
  })
})

function decisionMessage(d: { error?: string }): string {
  return d.error || ''
}
