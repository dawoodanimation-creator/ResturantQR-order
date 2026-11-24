/**
 * Pure Rate Limit Evaluation (SPEC §3, Hard-won Rule #6):
 * - Per DEVICE: ≥15 seconds between orders
 * - Per DEVICE: ≤5 orders per 10 minutes
 * - Per SESSION: ≤20 orders per 10 minutes
 */

export interface OrderRateLimitEvaluationInput {
  hasOrderInLast15Seconds: boolean
  deviceOrderCountLast10Minutes: number
  sessionOrderCountLast10Minutes: number
}

export interface RateLimitDecision {
  allowed: boolean
  error?: string
}

export function evaluateOrderRateLimits(input: OrderRateLimitEvaluationInput): RateLimitDecision {
  if (input.hasOrderInLast15Seconds) {
    return {
      allowed: false,
      error: 'Please wait at least 15 seconds between placing orders.',
    }
  }

  if (input.deviceOrderCountLast10Minutes >= 5) {
    return {
      allowed: false,
      error: 'Order limit reached (maximum 5 orders per 10 minutes per device).',
    }
  }

  if (input.sessionOrderCountLast10Minutes >= 20) {
    return {
      allowed: false,
      error: 'Table session order limit reached (maximum 20 orders per 10 minutes per table). Please ask staff for assistance.',
    }
  }

  return { allowed: true }
}
