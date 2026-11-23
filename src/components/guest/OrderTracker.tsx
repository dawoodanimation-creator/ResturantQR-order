'use client'

import React, { useEffect, useState, useCallback } from 'react'
import {
  Clock,
  CheckCircle2,
  ChefHat,
  BellRing,
  UtensilsCrossed,
  XCircle,
  RefreshCw,
  AlertCircle,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getOrderTrackerAction } from '@/app/actions/guest'
import { OrderStatus, BillingMode } from '@/types/database.types'
import { formatPaisaToPKR } from '@/lib/utils'

interface OrderTrackerProps {
  orderId: string
  onBackToMenu: () => void
}

interface OrderData {
  id: string
  daily_order_number: number
  status: OrderStatus
  billing_mode: BillingMode
  total_paisa: number
  rejection_reason: string | null
  cancellation_reason: string | null
  estimated_prep_minutes: number | null
  placed_at: string
  accepted_at: string | null
  preparing_at: string | null
  ready_at: string | null
  served_at: string | null
  table: { table_number: string } | null
  restaurant: { name: string; name_ur: string | null; currency: string } | null
}

interface OrderItemData {
  id: string
  name_snapshot: string
  quantity: number
  unit_price_paisa: number
  total_paisa: number
  modifiers_snapshot: Array<{ name: string; priceDeltaPaisa?: number }>
  notes: string | null
}

export function OrderTracker({ orderId, onBackToMenu }: OrderTrackerProps) {
  const [order, setOrder] = useState<OrderData | null>(null)
  const [items, setItems] = useState<OrderItemData[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false)
  const [ariaAnnouncement, setAriaAnnouncement] = useState<string>('')

  // Load order data
  const loadTrackerData = useCallback(async () => {
    try {
      const data = await getOrderTrackerAction(orderId)
      if (data && data.order) {
        setOrder(data.order as unknown as OrderData)
        setItems(data.items as unknown as OrderItemData[])
        setAriaAnnouncement(
          `Order status is ${getStatusLabel(
            data.order.status as OrderStatus,
            data.order.billing_mode as BillingMode
          )}`
        )
      }
    } catch (err) {
      console.error('Error fetching tracker data:', err)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [orderId])

  useEffect(() => {
    let isMounted = true

    const runFetch = async () => {
      try {
        const data = await getOrderTrackerAction(orderId)
        if (!isMounted) return
        if (data && data.order) {
          setOrder(data.order as unknown as OrderData)
          setItems(data.items as unknown as OrderItemData[])
          setAriaAnnouncement(
            `Order status is ${getStatusLabel(
              data.order.status as OrderStatus,
              data.order.billing_mode as BillingMode
            )}`
          )
        }
      } catch (err) {
        console.error('Error in tracker load:', err)
      } finally {
        if (isMounted) {
          setIsLoading(false)
          setIsRefreshing(false)
        }
      }
    }

    void runFetch()

    // Safety polling fallback every 10 seconds (Hard-won Rule #13)
    const interval = setInterval(() => {
      void runFetch()
    }, 10000)

    // Supabase Realtime channel subscription
    const supabase = createClient()
    const channel = supabase
      .channel(`guest_order_${orderId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${orderId}`,
        },
        () => {
          void runFetch()
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'order_status_events',
          filter: `order_id=eq.${orderId}`,
        },
        () => {
          void runFetch()
        }
      )
      .subscribe()

    return () => {
      isMounted = false
      clearInterval(interval)
      supabase.removeChannel(channel)
    }
  }, [orderId])

  const handleManualRefresh = () => {
    setIsRefreshing(true)
    void loadTrackerData()
  }

  if (isLoading && !order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-4">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-zinc-500 font-medium">Connecting to order tracker...</p>
        </div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-4">
        <div className="text-center space-y-3 max-w-sm">
          <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
          <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Order not found</h2>
          <p className="text-xs text-zinc-500">Could not retrieve information for this order.</p>
          <button
            type="button"
            onClick={onBackToMenu}
            className="px-4 py-2 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-semibold"
          >
            Back to Menu
          </button>
        </div>
      </div>
    )
  }

  const isTerminal = order.status === 'rejected' || order.status === 'cancelled'
  const isPrePayAwaiting = order.status === 'awaiting_payment'

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 pb-20">
      {/* Screen Reader ARIA Live Region */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {ariaAnnouncement}
      </div>

      {/* Header */}
      <header className="sticky top-0 z-20 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800 px-4 py-3">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
              Order #{order.daily_order_number}
            </h1>
            <p className="text-[11px] text-zinc-500">
              Table {order.table?.table_number || 'N/A'} • {order.restaurant?.name}
            </p>
          </div>

          <button
            type="button"
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 focus:outline-none"
            aria-label="Refresh order status"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="text-[11px] font-medium">Refresh</span>
          </button>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 pt-4 space-y-4">
        {/* PRE_PAY Highlight Card: Show large "Pay at counter" token (SPEC §4.A) */}
        {isPrePayAwaiting && (
          <div className="p-5 rounded-2xl bg-amber-500 text-white shadow-lg text-center space-y-2 animate-in fade-in">
            <span className="text-[11px] uppercase font-bold tracking-widest bg-amber-600/70 px-2 py-0.5 rounded-full inline-block">
              Pay at Counter
            </span>
            <div className="text-4xl font-extrabold tracking-tight">
              #{order.daily_order_number}
            </div>
            <p className="text-xs text-amber-100 max-w-xs mx-auto leading-relaxed">
              Please proceed to the counter with your order number to make payment of{' '}
              <span className="font-bold text-white underline">
                {formatPaisaToPKR(order.total_paisa)}
              </span>
              . Once confirmed, your food will go straight to the kitchen.
            </p>
          </div>
        )}

        {/* Primary Status Card */}
        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs text-center space-y-3">
          <div className="flex justify-center">
            {getStatusIcon(order.status)}
          </div>

          <div>
            <h2 className="text-base font-extrabold text-zinc-900 dark:text-zinc-100">
              {getStatusLabel(order.status, order.billing_mode)}
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              {getStatusDescription(order.status, order.billing_mode)}
            </p>
          </div>

          {/* ETA Display (Hard-won Rule #9) */}
          {order.status === 'accepted' || order.status === 'preparing' ? (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 text-xs font-semibold">
              <Clock className="w-3.5 h-3.5" />
              <span>
                Estimated prep time: ~{order.estimated_prep_minutes || 15} minutes
              </span>
            </div>
          ) : order.status === 'pending_approval' ? (
            <div className="text-[11px] text-zinc-400 italic">
              Estimated preparation time will be shown once staff confirms your order.
            </div>
          ) : null}

          {/* Rejection / Cancellation Reason (Hard-Won: Plain text only) */}
          {(order.rejection_reason || order.cancellation_reason) && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 text-left">
              <p className="text-xs text-rose-800 dark:text-rose-300 font-semibold">Reason:</p>
              <p className="text-xs text-rose-700 dark:text-rose-200 mt-0.5">
                {order.rejection_reason || order.cancellation_reason}
              </p>
            </div>
          )}
        </div>

        {/* Status Stepper Timeline (Colour is never the only signal - Rule #17) */}
        {!isTerminal && (
          <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              Live Progress
            </h3>

            <div className="space-y-4">
              {getStepsForOrder(order.billing_mode).map((step, idx) => {
                const stepState = getStepState(step.key, order.status, order.billing_mode)
                return (
                  <div key={step.key} className="flex items-start gap-3">
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                          stepState === 'completed'
                            ? 'bg-emerald-600 text-white'
                            : stepState === 'current'
                            ? 'bg-emerald-100 text-emerald-800 border-2 border-emerald-600 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-zinc-100 text-zinc-400 dark:bg-zinc-800'
                        }`}
                      >
                        {stepState === 'completed' ? (
                          <CheckCircle2 className="w-4 h-4" />
                        ) : (
                          idx + 1
                        )}
                      </div>
                      {idx < getStepsForOrder(order.billing_mode).length - 1 && (
                        <div
                          className={`w-0.5 h-6 my-1 ${
                            stepState === 'completed' ? 'bg-emerald-600' : 'bg-zinc-200 dark:bg-zinc-800'
                          }`}
                        />
                      )}
                    </div>

                    <div className="pt-0.5">
                      <p
                        className={`text-xs font-semibold ${
                          stepState === 'current'
                            ? 'text-emerald-700 dark:text-emerald-400 font-bold'
                            : stepState === 'completed'
                            ? 'text-zinc-900 dark:text-zinc-100'
                            : 'text-zinc-400'
                        }`}
                      >
                        {step.label}
                      </p>
                      <p className="text-[11px] text-zinc-500">{step.hint}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Order Items Summary */}
        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
            Items Ordered
          </h3>
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {items.map((item) => (
              <div key={item.id} className="py-2 flex justify-between items-baseline text-xs">
                <div>
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                    {item.quantity}x {item.name_snapshot}
                  </span>
                  {Array.isArray(item.modifiers_snapshot) && item.modifiers_snapshot.length > 0 && (
                    <p className="text-[11px] text-zinc-500">
                      {item.modifiers_snapshot.map((m) => m.name).join(', ')}
                    </p>
                  )}
                </div>
                <span className="font-bold text-zinc-900 dark:text-zinc-100 shrink-0">
                  {formatPaisaToPKR(item.total_paisa)}
                </span>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 flex justify-between text-xs font-bold text-zinc-900 dark:text-zinc-100">
            <span>Total</span>
            <span className="text-emerald-600">{formatPaisaToPKR(order.total_paisa)}</span>
          </div>
        </div>

        {/* Navigation Button */}
        <button
          type="button"
          onClick={onBackToMenu}
          className="w-full py-3 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 shadow-xs focus:outline-none"
        >
          Order More Items
        </button>
      </main>
    </div>
  )
}

function getStatusLabel(status: OrderStatus, mode: BillingMode): string {
  switch (status) {
    case 'awaiting_payment':
      return 'Waiting for Payment'
    case 'pending_approval':
      return 'Needs Approval'
    case 'accepted':
      return 'Order Confirmed'
    case 'preparing':
      return 'Cooking in Kitchen'
    case 'ready':
      return 'Ready for Serving'
    case 'served':
      return mode === 'PRE_PAY' ? 'Order Collected' : 'Order Served'
    case 'rejected':
      return 'Order Rejected'
    case 'cancelled':
      return 'Order Cancelled'
    default:
      return status
  }
}

function getStatusDescription(status: OrderStatus, mode: BillingMode): string {
  switch (status) {
    case 'awaiting_payment':
      return 'Please pay at the counter to start your order'
    case 'pending_approval':
      return 'Your order has reached the restaurant staff for review'
    case 'accepted':
      return 'The kitchen has accepted your ticket'
    case 'preparing':
      return 'Our chefs are currently preparing your fresh meal'
    case 'ready':
      return mode === 'PRE_PAY'
        ? 'Your food is packed and ready for pickup at the counter'
        : 'Your food is ready and being brought to your table'
    case 'served':
      return 'Enjoy your meal! Thank you for dining with us.'
    case 'rejected':
      return 'Unfortunately, the restaurant could not accept this order'
    case 'cancelled':
      return 'This order was cancelled'
    default:
      return ''
  }
}

function getStatusIcon(status: OrderStatus) {
  switch (status) {
    case 'awaiting_payment':
      return (
        <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center">
          <Clock className="w-6 h-6" />
        </div>
      )
    case 'pending_approval':
      return (
        <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center">
          <BellRing className="w-6 h-6" />
        </div>
      )
    case 'accepted':
      return (
        <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
          <CheckCircle2 className="w-6 h-6" />
        </div>
      )
    case 'preparing':
      return (
        <div className="w-12 h-12 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center">
          <ChefHat className="w-6 h-6" />
        </div>
      )
    case 'ready':
      return (
        <div className="w-12 h-12 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center">
          <UtensilsCrossed className="w-6 h-6" />
        </div>
      )
    case 'served':
      return (
        <div className="w-12 h-12 rounded-full bg-green-100 text-green-700 flex items-center justify-center">
          <CheckCircle2 className="w-6 h-6" />
        </div>
      )
    case 'rejected':
    case 'cancelled':
      return (
        <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center">
          <XCircle className="w-6 h-6" />
        </div>
      )
  }
}

function getStepsForOrder(mode: BillingMode) {
  if (mode === 'PRE_PAY') {
    return [
      { key: 'awaiting_payment', label: 'Payment', hint: 'Pay at counter' },
      { key: 'accepted', label: 'Accepted', hint: 'Order confirmed' },
      { key: 'preparing', label: 'Cooking', hint: 'In the kitchen' },
      { key: 'ready', label: 'Ready', hint: 'Ready at counter' },
      { key: 'served', label: 'Collected', hint: 'Order complete' },
    ]
  }

  return [
    { key: 'pending_approval', label: 'Approval', hint: 'Floor review' },
    { key: 'accepted', label: 'Accepted', hint: 'Order confirmed' },
    { key: 'preparing', label: 'Cooking', hint: 'In the kitchen' },
    { key: 'ready', label: 'Ready', hint: 'Brought to table' },
    { key: 'served', label: 'Served', hint: 'Order complete' },
  ]
}

function getStepState(
  stepKey: string,
  currentStatus: OrderStatus,
  mode: BillingMode
): 'completed' | 'current' | 'upcoming' {
  const orderRank: Record<string, number> = mode === 'PRE_PAY'
    ? { awaiting_payment: 1, accepted: 2, preparing: 3, ready: 4, served: 5 }
    : { pending_approval: 1, accepted: 2, preparing: 3, ready: 4, served: 5 }

  const currentRank = orderRank[currentStatus] || 0
  const stepRank = orderRank[stepKey] || 0

  if (currentRank > stepRank) return 'completed'
  if (currentRank === stepRank) return 'current'
  return 'upcoming'
}
