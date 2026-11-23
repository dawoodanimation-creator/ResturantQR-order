'use client'

import React, { useState, useEffect } from 'react'
import { GuestRestaurantContext, GuestMenuItem } from '@/app/actions/guest'
import { useTableSession } from '@/hooks/useTableSession'
import { useDeviceFingerprint } from '@/hooks/useDeviceFingerprint'
import { useCartStore } from '@/lib/store/useCartStore'
import { GuestMenu } from './GuestMenu'
import { ItemSheet } from './ItemSheet'
import { CartDrawer } from './CartDrawer'
import { OrderTracker } from './OrderTracker'

interface GuestViewProps {
  context: GuestRestaurantContext
}

export function GuestView({ context }: GuestViewProps) {
  const { restaurant, branch, table } = context

  // 1. Post-mount Session Lifecycle (Hard-Won Rule)
  const session = useTableSession(table.qrToken)
  const deviceFingerprint = useDeviceFingerprint()

  // 2. Initialize Cart Store with restaurant rates
  const initRestaurant = useCartStore((state) => state.initRestaurant)
  useEffect(() => {
    initRestaurant(
      restaurant.id,
      branch.id,
      restaurant.taxBps,
      restaurant.serviceChargeBps
    )
  }, [restaurant.id, branch.id, restaurant.taxBps, restaurant.serviceChargeBps, initRestaurant])

  // UI state
  const [activeItemForSheet, setActiveItemForSheet] = useState<GuestMenuItem | null>(null)
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null)

  // If currently tracking an order
  if (activeOrderId) {
    return (
      <OrderTracker
        orderId={activeOrderId}
        onBackToMenu={() => setActiveOrderId(null)}
      />
    )
  }

  return (
    <>
      {/* Main Menu View */}
      <GuestMenu
        context={context}
        onOpenItemSheet={(item) => setActiveItemForSheet(item)}
      />

      {/* Item Customization Sheet (Modifiers) */}
      <ItemSheet
        item={activeItemForSheet}
        isOpen={Boolean(activeItemForSheet)}
        onClose={() => setActiveItemForSheet(null)}
      />

      {/* Slide-out Cart Drawer */}
      <CartDrawer
        qrToken={table.qrToken}
        sessionId={session.sessionId || ''}
        deviceFingerprint={deviceFingerprint}
        billingMode={branch.billingMode}
        onOrderSuccess={(orderId) => {
          setActiveOrderId(orderId)
        }}
      />
    </>
  )
}
