import { z } from 'zod'

/**
 * Zod validation schemas for Guest PWA actions.
 * Rule: Zod on every input, .strict()
 */

export const openSessionSchema = z.object({
  qrToken: z.string().min(1, 'QR token is required').max(128),
  deviceFingerprint: z.string().min(8).max(64),
}).strict()

export const orderItemInputSchema = z.object({
  menuItemId: z.string().uuid('Invalid menu item ID'),
  quantity: z.number().int().min(1, 'Quantity must be at least 1').max(50, 'Max quantity 50 per line'),
  selectedModifierOptionIds: z.array(z.string().uuid('Invalid modifier option ID')),
  notes: z.string().max(250, 'Notes must be under 250 characters').nullable().optional(),
  expectedUnitPricePaisa: z.number().int().min(0),
  expectedLineTotalPaisa: z.number().int().min(0),
}).strict()

export const placeOrderInputSchema = z.object({
  qrToken: z.string().min(1, 'QR token is required').max(128),
  sessionId: z.string().uuid('Invalid session ID'),
  deviceFingerprint: z.string().min(8, 'Invalid device fingerprint').max(64),
  idempotencyKey: z.string().uuid('Invalid idempotency key'),
  items: z.array(orderItemInputSchema).min(1, 'At least one item is required').max(100),
  expectedSubtotalPaisa: z.number().int().min(0),
  expectedTaxPaisa: z.number().int().min(0),
  expectedServiceChargePaisa: z.number().int().min(0),
  expectedTotalPaisa: z.number().int().min(0),
}).strict()

export type OpenSessionInput = z.infer<typeof openSessionSchema>
export type OrderItemInput = z.infer<typeof orderItemInputSchema>
export type PlaceOrderInput = z.infer<typeof placeOrderInputSchema>
