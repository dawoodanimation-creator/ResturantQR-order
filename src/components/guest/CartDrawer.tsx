'use client'

import React, { useState } from 'react'
import { X, Trash2, Plus, Minus, ArrowRight, AlertTriangle, Loader2 } from 'lucide-react'
import { useCartStore } from '@/lib/store/useCartStore'
import { placeOrderAction } from '@/app/actions/guest'
import { formatPaisaToPKR } from '@/lib/utils'

interface CartDrawerProps {
  qrToken: string
  sessionId: string
  deviceFingerprint: string
  billingMode: 'PRE_PAY' | 'POST_PAY'
  onOrderSuccess: (orderId: string) => void
}

export function CartDrawer({
  qrToken,
  sessionId,
  deviceFingerprint,
  billingMode,
  onOrderSuccess,
}: CartDrawerProps) {
  const isOpen = useCartStore((state) => state.isOpen)
  const closeCart = useCartStore((state) => state.closeCart)
  const items = useCartStore((state) => state.items)
  const updateQuantity = useCartStore((state) => state.updateQuantity)
  const clearCart = useCartStore((state) => state.clearCart)

  const subtotalPaisa = useCartStore((state) => state.getSubtotalPaisa())
  const taxPaisa = useCartStore((state) => state.getTaxPaisa())
  const serviceChargePaisa = useCartStore((state) => state.getServiceChargePaisa())
  const totalPaisa = useCartStore((state) => state.getTotalPaisa())

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  
  // Price change modal state
  const [priceChangedData, setPriceChangedData] = useState<{
    oldTotalPaisa: number
    newTotalPaisa: number
    message: string
  } | null>(null)

  if (!isOpen) return null

  const handlePlaceOrder = async (confirmedPriceOverride?: number) => {
    if (items.length === 0) return

    setIsSubmitting(true)
    setErrorMessage(null)

    const expectedTotal = confirmedPriceOverride ?? totalPaisa
    const idempotencyKey = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : 'ord_' + Math.random().toString(36).substring(2, 12) + Date.now().toString(36)

    try {
      const res = await placeOrderAction({
        qrToken,
        sessionId,
        deviceFingerprint,
        idempotencyKey,
        items: items.map((i) => ({
          menuItemId: i.menuItemId,
          quantity: i.quantity,
          selectedModifierOptionIds: i.modifiers.map(m => m.optionId),
          notes: i.notes || null,
          expectedUnitPricePaisa: i.unitPricePaisa,
          expectedLineTotalPaisa: i.lineTotalPaisa,
        })),
        expectedSubtotalPaisa: subtotalPaisa,
        expectedTaxPaisa: taxPaisa,
        expectedServiceChargePaisa: serviceChargePaisa,
        expectedTotalPaisa: expectedTotal,
      })

      if (!res.success) {
        if (res.priceChanged && res.oldTotalPaisa && res.newTotalPaisa) {
          // Hard-won Rule: Price changed since adding to cart -> show "was X, now Y"
          setPriceChangedData({
            oldTotalPaisa: res.oldTotalPaisa,
            newTotalPaisa: res.newTotalPaisa,
            message: res.message || 'Menu prices have been updated.',
          })
        } else {
          setErrorMessage(res.error || 'Failed to place order.')
        }
        setIsSubmitting(false)
        return
      }

      // Order successfully recorded
      if (res.orderId) {
        clearCart()
        onOrderSuccess(res.orderId)
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Network error placing order'
      setErrorMessage(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleConfirmNewPrice = () => {
    if (!priceChangedData) return
    const newPrice = priceChangedData.newTotalPaisa
    setPriceChangedData(null)
    handlePlaceOrder(newPrice)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs transition-opacity"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cart-drawer-title"
    >
      <div className="relative w-full max-w-md bg-white dark:bg-zinc-900 h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
          <div>
            <h2 id="cart-drawer-title" className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              Your Order
            </h2>
            <p className="text-xs text-zinc-500">
              {billingMode === 'PRE_PAY' ? 'Pre-Pay Counter Order' : 'Post-Pay Dine-In Order'}
            </p>
          </div>
          <button
            type="button"
            onClick={closeCart}
            className="w-10 h-10 rounded-full flex items-center justify-center text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors focus:outline-none"
            aria-label="Close cart"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Notification */}
        {errorMessage && (
          <div className="mx-4 mt-3 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <p className="text-xs text-rose-800 dark:text-rose-300 font-medium leading-relaxed">
              {errorMessage}
            </p>
          </div>
        )}

        {/* Cart Line Items */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {items.length === 0 ? (
            <div className="text-center py-20 text-zinc-400">
              <p className="text-3xl mb-2">🛒</p>
              <p className="text-sm font-semibold text-zinc-600 dark:text-zinc-300">Your cart is empty</p>
              <p className="text-xs text-zinc-400 mt-1">Tap + on any dish to add it to your order</p>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.lineId}
                className="p-3 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-xs text-zinc-900 dark:text-zinc-100">
                      {item.name}
                    </h3>
                    {item.nameUr && (
                      <span className="text-[11px] text-zinc-400 font-normal" dir="rtl">
                        {item.nameUr}
                      </span>
                    )}

                    {/* Modifiers List */}
                    {item.modifiers.length > 0 && (
                      <p className="text-[11px] text-zinc-500 mt-0.5 leading-tight">
                        {item.modifiers.map(m => m.optionName).join(', ')}
                      </p>
                    )}

                    {/* Line Notes */}
                    {item.notes && (
                      <p className="text-[11px] text-emerald-600 dark:text-emerald-400 italic mt-0.5">
                        &ldquo;{item.notes}&rdquo;
                      </p>
                    )}
                  </div>

                  <span className="font-bold text-xs text-zinc-900 dark:text-zinc-100 shrink-0">
                    {formatPaisaToPKR(item.lineTotalPaisa)}
                  </span>
                </div>

                {/* Quantity Controls (At quantity 1, minus becomes trash icon) */}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-zinc-400 font-medium">
                    {formatPaisaToPKR(item.unitPricePaisa)} each
                  </span>

                  <div className="flex items-center border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden bg-zinc-50 dark:bg-zinc-800">
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.lineId, -1)}
                      className="w-8 h-8 flex items-center justify-center text-zinc-700 dark:text-zinc-300 hover:text-rose-600 focus:outline-none transition-colors"
                      aria-label={item.quantity === 1 ? `Remove ${item.name}` : `Decrease ${item.name} quantity`}
                    >
                      {item.quantity === 1 ? (
                        <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                      ) : (
                        <Minus className="w-3 h-3" />
                      )}
                    </button>
                    <span className="w-6 text-center font-bold text-xs text-zinc-900 dark:text-zinc-100">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.lineId, 1)}
                      className="w-8 h-8 flex items-center justify-center text-zinc-700 dark:text-zinc-300 hover:text-emerald-600 focus:outline-none transition-colors"
                      aria-label={`Increase ${item.name} quantity`}
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Bill Summary Breakdown */}
        {items.length > 0 && (
          <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 shrink-0 space-y-2">
            <div className="flex justify-between text-xs text-zinc-600 dark:text-zinc-400">
              <span>Subtotal</span>
              <span>{formatPaisaToPKR(subtotalPaisa)}</span>
            </div>
            {taxPaisa > 0 && (
              <div className="flex justify-between text-xs text-zinc-600 dark:text-zinc-400">
                <span>Tax / Sales Tax</span>
                <span>{formatPaisaToPKR(taxPaisa)}</span>
              </div>
            )}
            {serviceChargePaisa > 0 && (
              <div className="flex justify-between text-xs text-zinc-600 dark:text-zinc-400">
                <span>Service Charge</span>
                <span>{formatPaisaToPKR(serviceChargePaisa)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-extrabold text-zinc-900 dark:text-zinc-100 pt-1.5 border-t border-zinc-200 dark:border-zinc-800">
              <span>Total Amount</span>
              <span className="text-emerald-600 dark:text-emerald-400">
                {formatPaisaToPKR(totalPaisa)}
              </span>
            </div>

            {/* Place Order CTA */}
            <button
              type="button"
              onClick={() => handlePlaceOrder()}
              disabled={isSubmitting || items.length === 0}
              className="w-full mt-3 h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg active:scale-[0.99] transition-all focus:outline-none focus:ring-4 focus:ring-emerald-300"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Submitting Order...</span>
                </>
              ) : (
                <>
                  <span>
                    {billingMode === 'PRE_PAY' ? 'Place & Pay at Counter' : 'Send to Kitchen'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Price Changed Modal Dialog (Hard-Won Rule #3) */}
      {priceChangedData && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 p-4"
          role="alertdialog"
          aria-labelledby="price-changed-title"
          aria-describedby="price-changed-desc"
        >
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-zinc-900 p-5 shadow-2xl space-y-4 border border-zinc-200 dark:border-zinc-800">
            <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-5 h-5" />
            </div>

            <div className="text-center space-y-1">
              <h3 id="price-changed-title" className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                Price Updated
              </h3>
              <p id="price-changed-desc" className="text-xs text-zinc-500 leading-relaxed">
                {priceChangedData.message}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 space-y-1 text-center">
              <div className="text-xs text-zinc-400 line-through">
                Was {formatPaisaToPKR(priceChangedData.oldTotalPaisa)}
              </div>
              <div className="text-base font-extrabold text-emerald-600 dark:text-emerald-400">
                Now {formatPaisaToPKR(priceChangedData.newTotalPaisa)}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPriceChangedData(null)}
                className="flex-1 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 focus:outline-none"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmNewPrice}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white shadow-md focus:outline-none"
              >
                Confirm New Total
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
