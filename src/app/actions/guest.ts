'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import {
  openSessionSchema,
  placeOrderInputSchema,
  OpenSessionInput,
  PlaceOrderInput,
} from '@/lib/validations/guest'
import { BillingMode, OrderStatus } from '@/types/database.types'

export interface MenuItemModifierOption {
  id: string
  name: string
  nameUr: string | null
  priceDeltaPaisa: number
  isDefault: boolean
  isAvailable: boolean
  displayOrder: number
}

export interface MenuItemModifierGroup {
  id: string
  name: string
  nameUr: string | null
  minSelections: number
  maxSelections: number
  isRequired: boolean
  options: MenuItemModifierOption[]
}

export interface GuestMenuItem {
  id: string
  categoryId: string
  name: string
  nameUr: string | null
  description: string | null
  descriptionUr: string | null
  basePricePaisa: number
  imageUrl: string | null
  dietaryTags: string[]
  allergens: string[]
  isAvailable: boolean
  isSoldOut: boolean
  displayOrder: number
  modifierGroups: MenuItemModifierGroup[]
}

export interface GuestCategory {
  id: string
  name: string
  nameUr: string | null
  displayOrder: number
}

export interface GuestRestaurantContext {
  restaurant: {
    id: string
    name: string
    nameUr: string | null
    slug: string
    timezone: string
    currency: string
    billingMode: BillingMode
    taxBps: number
    serviceChargeBps: number
    brandColor: string | null
    logoUrl: string | null
    showHalalTag: boolean
    isSuspended: boolean
  }
  branch: {
    id: string
    name: string
    nameUr: string | null
    billingMode: BillingMode
  }
  table: {
    id: string
    tableNumber: string
    kind: string
    capacity: number
    qrToken: string
  }
  categories: GuestCategory[]
  items: GuestMenuItem[]
}

/**
 * Fetch guest menu and restaurant context by slug and table QR token
 */
export async function getGuestMenuAction(slug: string, qrToken: string): Promise<GuestRestaurantContext | null> {
  const supabase = createAdminClient()

  // 1. Fetch restaurant
  const { data: restaurant, error: restErr } = await supabase
    .from('restaurants')
    .select('*')
    .eq('slug', slug)
    .single()

  if (restErr || !restaurant) {
    return null
  }

  // 2. Fetch table by QR token
  const { data: table, error: tableErr } = await supabase
    .from('tables')
    .select('*')
    .eq('restaurant_id', restaurant.id)
    .eq('qr_token', qrToken)
    .eq('is_active', true)
    .single()

  if (tableErr || !table) {
    return null
  }

  // 3. Fetch branch
  const { data: branch, error: branchErr } = await supabase
    .from('branches')
    .select('*')
    .eq('id', table.branch_id)
    .eq('restaurant_id', restaurant.id)
    .eq('is_active', true)
    .single()

  if (branchErr || !branch) {
    return null
  }

  // Effective billing mode (branch override takes priority)
  const effectiveBillingMode: BillingMode = branch.billing_mode_override || restaurant.billing_mode

  // 4. Fetch active categories
  const { data: rawCategories } = await supabase
    .from('categories')
    .select('id, name, name_ur, display_order')
    .eq('restaurant_id', restaurant.id)
    .eq('is_hidden', false)
    .eq('is_archived', false)
    .order('display_order', { ascending: true })

  const categories: GuestCategory[] = (rawCategories || []).map(c => ({
    id: c.id,
    name: c.name,
    nameUr: c.name_ur,
    displayOrder: c.display_order,
  }))

  // 5. Fetch menu items
  const { data: rawItems } = await supabase
    .from('menu_items')
    .select('*')
    .eq('restaurant_id', restaurant.id)
    .eq('is_archived', false)
    .order('display_order', { ascending: true })

  // 6. Fetch branch overrides for this branch
  const { data: rawOverrides } = await supabase
    .from('branch_menu_item_overrides')
    .select('*')
    .eq('restaurant_id', restaurant.id)
    .eq('branch_id', branch.id)

  const overridesMap = new Map((rawOverrides || []).map(o => [o.menu_item_id, o]))

  // 7. Fetch modifier links
  const { data: rawMimg } = await supabase
    .from('menu_item_modifier_groups')
    .select('*')
    .eq('restaurant_id', restaurant.id)
    .order('display_order', { ascending: true })

  // 8. Fetch modifier groups and options
  const { data: rawGroups } = await supabase
    .from('modifier_groups')
    .select('*')
    .eq('restaurant_id', restaurant.id)
    .eq('is_archived', false)

  const { data: rawOptions } = await supabase
    .from('modifier_options')
    .select('*')
    .eq('restaurant_id', restaurant.id)
    .eq('is_available', true)
    .order('display_order', { ascending: true })

  const optionsByGroup = new Map<string, MenuItemModifierOption[]>()
  for (const opt of rawOptions || []) {
    const list = optionsByGroup.get(opt.modifier_group_id) || []
    list.push({
      id: opt.id,
      name: opt.name,
      nameUr: opt.name_ur,
      priceDeltaPaisa: opt.price_delta_paisa,
      isDefault: opt.is_default,
      isAvailable: opt.is_available,
      displayOrder: opt.display_order,
    })
    optionsByGroup.set(opt.modifier_group_id, list)
  }

  const groupsMap = new Map<string, MenuItemModifierGroup>()
  for (const grp of rawGroups || []) {
    groupsMap.set(grp.id, {
      id: grp.id,
      name: grp.name,
      nameUr: grp.name_ur,
      minSelections: grp.min_selections,
      maxSelections: grp.max_selections,
      isRequired: grp.is_required,
      options: optionsByGroup.get(grp.id) || [],
    })
  }

  // Assemble full items
  const items: GuestMenuItem[] = (rawItems || []).map(item => {
    const override = overridesMap.get(item.id)
    const itemGroups: MenuItemModifierGroup[] = []

    const links = (rawMimg || []).filter(link => link.menu_item_id === item.id)
    for (const link of links) {
      const g = groupsMap.get(link.modifier_group_id)
      if (g) {
        itemGroups.push(g)
      }
    }

    const basePrice = override?.price_override_paisa !== null && override?.price_override_paisa !== undefined
      ? override.price_override_paisa
      : item.base_price_paisa

    return {
      id: item.id,
      categoryId: item.category_id,
      name: item.name,
      nameUr: item.name_ur,
      description: item.description,
      descriptionUr: item.description_ur,
      basePricePaisa: basePrice,
      imageUrl: item.image_url,
      dietaryTags: item.dietary_tags,
      allergens: item.allergens,
      isAvailable: item.is_available && (!override || !override.is_sold_out),
      isSoldOut: override?.is_sold_out ?? false,
      displayOrder: item.display_order,
      modifierGroups: itemGroups,
    }
  })

  return {
    restaurant: {
      id: restaurant.id,
      name: restaurant.name,
      nameUr: restaurant.name_ur,
      slug: restaurant.slug,
      timezone: restaurant.timezone,
      currency: restaurant.currency,
      billingMode: restaurant.billing_mode,
      taxBps: restaurant.tax_bps,
      serviceChargeBps: restaurant.service_charge_bps,
      brandColor: restaurant.brand_color,
      logoUrl: restaurant.logo_url,
      showHalalTag: restaurant.show_halal_tag,
      isSuspended: Boolean(restaurant.suspended_at),
    },
    branch: {
      id: branch.id,
      name: branch.name,
      nameUr: branch.name_ur,
      billingMode: effectiveBillingMode,
    },
    table: {
      id: table.id,
      tableNumber: table.table_number,
      kind: table.kind,
      capacity: table.capacity,
      qrToken: table.qr_token,
    },
    categories,
    items,
  }
}

/**
 * Open or join a table session (Executed after mount on client)
 */
export async function openOrJoinSessionAction(rawInput: OpenSessionInput) {
  const parsed = openSessionSchema.safeParse(rawInput)
  if (!parsed.success) {
    return { success: false, error: 'Invalid input parameters' }
  }

  const { qrToken } = parsed.data
  const supabase = createAdminClient()

  // Find table and verify restaurant
  const { data: table, error: tableErr } = await supabase
    .from('tables')
    .select('id, restaurant_id, branch_id, table_number, is_active')
    .eq('qr_token', qrToken)
    .single()

  if (tableErr || !table || !table.is_active) {
    return { success: false, error: 'Table not found or inactive' }
  }

  // Look for existing active session
  const { data: existingSession } = await supabase
    .from('table_sessions')
    .select('id, session_token, status')
    .eq('table_id', table.id)
    .eq('status', 'active')
    .order('opened_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existingSession) {
    return {
      success: true,
      sessionId: existingSession.id,
      sessionToken: existingSession.session_token,
      tableNumber: table.table_number,
    }
  }

  // Create new active session
  const { data: newSession, error: createErr } = await supabase
    .from('table_sessions')
    .insert({
      restaurant_id: table.restaurant_id,
      branch_id: table.branch_id,
      table_id: table.id,
      status: 'active',
    })
    .select('id, session_token')
    .single()

  if (createErr || !newSession) {
    return { success: false, error: 'Failed to initialize table session' }
  }

  return {
    success: true,
    sessionId: newSession.id,
    sessionToken: newSession.session_token,
    tableNumber: table.table_number,
  }
}

/**
 * Place an Order with Server Re-Pricing and Device Rate-Limiting
 */
export async function placeOrderAction(rawInput: PlaceOrderInput) {
  const parsed = placeOrderInputSchema.safeParse(rawInput)
  if (!parsed.success) {
    return { success: false, error: 'Validation failed', issues: parsed.error.issues }
  }

  const input = parsed.data
  const supabase = createAdminClient()

  // 1. Fetch table, branch, and restaurant
  const { data: table, error: tableErr } = await supabase
    .from('tables')
    .select('id, restaurant_id, branch_id, table_number, is_active')
    .eq('qr_token', input.qrToken)
    .single()

  if (tableErr || !table || !table.is_active) {
    return { success: false, error: 'Invalid or inactive table' }
  }

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('id, billing_mode, tax_bps, service_charge_bps, timezone, suspended_at')
    .eq('id', table.restaurant_id)
    .single()

  if (!restaurant || restaurant.suspended_at) {
    return { success: false, error: 'This restaurant is currently not accepting orders' }
  }

  const { data: branch } = await supabase
    .from('branches')
    .select('id, billing_mode_override')
    .eq('id', table.branch_id)
    .single()

  const effectiveBillingMode: BillingMode = branch?.billing_mode_override || restaurant.billing_mode

  // 2. Check Idempotency Key (Survive double taps)
  const { data: existingOrder } = await supabase
    .from('orders')
    .select('id, daily_order_number, status, total_paisa, billing_mode')
    .eq('restaurant_id', table.restaurant_id)
    .eq('idempotency_key', input.idempotencyKey)
    .maybeSingle()

  if (existingOrder) {
    return {
      success: true,
      orderId: existingOrder.id,
      dailyOrderNumber: existingOrder.daily_order_number,
      status: existingOrder.status,
      totalPaisa: existingOrder.total_paisa,
      billingMode: existingOrder.billing_mode,
      isDuplicate: true,
    }
  }

  // 3. Enforce Device & Session Rate Limits (Hard-won Rule #6)
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString()
  const fifteenSecondsAgo = new Date(Date.now() - 15 * 1000).toISOString()

  // Rate limit 1: Check >= 15 seconds since last order from device
  const { data: lastOrderDevice } = await supabase
    .from('orders')
    .select('created_at')
    .eq('restaurant_id', table.restaurant_id)
    .eq('device_fingerprint', input.deviceFingerprint)
    .gte('created_at', fifteenSecondsAgo)
    .limit(1)

  if (lastOrderDevice && lastOrderDevice.length > 0) {
    return { success: false, error: 'Please wait at least 15 seconds between placing orders.' }
  }

  // Rate limit 2: Check <= 5 orders per 10 min per device
  const { count: deviceOrderCount } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .eq('restaurant_id', table.restaurant_id)
    .eq('device_fingerprint', input.deviceFingerprint)
    .gte('created_at', tenMinutesAgo)

  if (deviceOrderCount !== null && deviceOrderCount >= 5) {
    return { success: false, error: 'Order limit reached (maximum 5 orders per 10 minutes per device).' }
  }

  // Rate limit 3: Check <= 20 orders per 10 min per session
  const { count: sessionOrderCount } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .eq('restaurant_id', table.restaurant_id)
    .eq('table_session_id', input.sessionId)
    .gte('created_at', tenMinutesAgo)

  if (sessionOrderCount !== null && sessionOrderCount >= 20) {
    return { success: false, error: 'Table session order limit reached. Please call a waiter for assistance.' }
  }

  // 4. Server-Side Re-Pricing from DB (Hard-won Rule #3 & #4)
  const itemIds = Array.from(new Set(input.items.map(i => i.menuItemId)))
  const { data: dbItems } = await supabase
    .from('menu_items')
    .select('id, name, base_price_paisa, is_available')
    .eq('restaurant_id', table.restaurant_id)
    .in('id', itemIds)

  const { data: dbOverrides } = await supabase
    .from('branch_menu_item_overrides')
    .select('menu_item_id, is_sold_out, price_override_paisa')
    .eq('restaurant_id', table.restaurant_id)
    .eq('branch_id', table.branch_id)
    .in('menu_item_id', itemIds)

  const overridesMap = new Map((dbOverrides || []).map(o => [o.menu_item_id, o]))
  const itemsMap = new Map((dbItems || []).map(i => [i.id, i]))

  // Collect all modifier option IDs
  const allOptionIds = Array.from(new Set(input.items.flatMap(i => i.selectedModifierOptionIds)))
  const { data: dbOptions } = allOptionIds.length > 0
    ? await supabase
        .from('modifier_options')
        .select('id, name, price_delta_paisa, is_available, modifier_group_id')
        .eq('restaurant_id', table.restaurant_id)
        .in('id', allOptionIds)
    : { data: [] }

  const optionsMap = new Map((dbOptions || []).map(o => [o.id, o]))

  // Re-price each line item
  let calculatedSubtotalPaisa = 0
  const processedItems: Array<{
    menuItemId: string
    nameSnapshot: string
    unitPricePaisa: number
    quantity: number
    modifiersSnapshot: Array<{ optionId: string; name: string; priceDeltaPaisa: number }>
    notes: string | null
    totalPaisa: number
  }> = []

  for (const clientItem of input.items) {
    const dbItem = itemsMap.get(clientItem.menuItemId)
    if (!dbItem || !dbItem.is_available) {
      return { success: false, error: `Item "${dbItem?.name || 'Selected item'}" is currently unavailable.` }
    }

    const override = overridesMap.get(clientItem.menuItemId)
    if (override && override.is_sold_out) {
      return { success: false, error: `Item "${dbItem.name}" is sold out at this branch.` }
    }

    const basePrice = override?.price_override_paisa !== null && override?.price_override_paisa !== undefined
      ? override.price_override_paisa
      : dbItem.base_price_paisa

    let modifiersDelta = 0
    const modifiersSnapshot: Array<{ optionId: string; name: string; priceDeltaPaisa: number }> = []

    for (const optId of clientItem.selectedModifierOptionIds) {
      const dbOpt = optionsMap.get(optId)
      if (!dbOpt || !dbOpt.is_available) {
        return { success: false, error: `Selected option is unavailable for item "${dbItem.name}".` }
      }
      modifiersDelta += dbOpt.price_delta_paisa
      modifiersSnapshot.push({
        optionId: dbOpt.id,
        name: dbOpt.name,
        priceDeltaPaisa: dbOpt.price_delta_paisa,
      })
    }

    const unitPricePaisa = basePrice + modifiersDelta
    const lineTotalPaisa = unitPricePaisa * clientItem.quantity
    calculatedSubtotalPaisa += lineTotalPaisa

    processedItems.push({
      menuItemId: dbItem.id,
      nameSnapshot: dbItem.name,
      unitPricePaisa,
      quantity: clientItem.quantity,
      modifiersSnapshot,
      notes: clientItem.notes || null,
      totalPaisa: lineTotalPaisa,
    })
  }

  const calculatedTaxPaisa = Math.round((calculatedSubtotalPaisa * restaurant.tax_bps) / 10000)
  const calculatedServiceChargePaisa = Math.round((calculatedSubtotalPaisa * restaurant.service_charge_bps) / 10000)
  const calculatedTotalPaisa = calculatedSubtotalPaisa + calculatedTaxPaisa + calculatedServiceChargePaisa

  // 5. Price change detection ("was X, now Y")
  if (calculatedTotalPaisa !== input.expectedTotalPaisa) {
    return {
      success: false,
      priceChanged: true,
      error: 'PRICE_CHANGED',
      message: 'Prices have been updated since you viewed the menu. Please confirm the new total.',
      oldTotalPaisa: input.expectedTotalPaisa,
      newTotalPaisa: calculatedTotalPaisa,
      newSubtotalPaisa: calculatedSubtotalPaisa,
      newTaxPaisa: calculatedTaxPaisa,
      newServiceChargePaisa: calculatedServiceChargePaisa,
    }
  }

  // 6. Generate next daily order number (Timezone-Aware)
  const { data: orderNumber, error: counterErr } = await supabase.rpc('generate_daily_order_number', {
    p_branch_id: table.branch_id,
    p_restaurant_id: table.restaurant_id,
  })

  if (counterErr || !orderNumber) {
    return { success: false, error: 'Failed to generate daily order number' }
  }

  // 7. Initial status determination
  const initialStatus: OrderStatus = effectiveBillingMode === 'PRE_PAY'
    ? 'awaiting_payment'
    : 'pending_approval'

  // 8. Insert into orders table
  const { data: order, error: orderErr } = await supabase
    .from('orders')
    .insert({
      restaurant_id: table.restaurant_id,
      branch_id: table.branch_id,
      table_id: table.id,
      table_session_id: input.sessionId,
      daily_order_number: orderNumber,
      idempotency_key: input.idempotencyKey,
      device_fingerprint: input.deviceFingerprint,
      status: initialStatus,
      billing_mode: effectiveBillingMode,
      subtotal_paisa: calculatedSubtotalPaisa,
      tax_paisa: calculatedTaxPaisa,
      service_charge_paisa: calculatedServiceChargePaisa,
      discount_paisa: 0,
      total_paisa: calculatedTotalPaisa,
    })
    .select('id, daily_order_number, status, total_paisa, billing_mode')
    .single()

  if (orderErr || !order) {
    return { success: false, error: 'Failed to record order' }
  }

  // 9. Insert order items snapshot (Hard-won Rule #4)
  const orderItemsPayload = processedItems.map(p => ({
    restaurant_id: table.restaurant_id,
    order_id: order.id,
    menu_item_id: p.menuItemId,
    name_snapshot: p.nameSnapshot,
    unit_price_paisa: p.unitPricePaisa,
    quantity: p.quantity,
    modifiers_snapshot: p.modifiersSnapshot,
    notes: p.notes,
    total_paisa: p.totalPaisa,
  }))

  const { error: itemsErr } = await supabase
    .from('order_items')
    .insert(orderItemsPayload)

  if (itemsErr) {
    console.error('Error inserting order items snapshot:', itemsErr)
  }

  return {
    success: true,
    orderId: order.id,
    dailyOrderNumber: order.daily_order_number,
    status: order.status,
    totalPaisa: order.total_paisa,
    billingMode: order.billing_mode,
  }
}

/**
 * Fetch Order details and realtime status events for the tracker
 */
export async function getOrderTrackerAction(orderId: string) {
  const supabase = createAdminClient()

  const { data: order, error: orderErr } = await supabase
    .from('orders')
    .select(`
      id,
      daily_order_number,
      status,
      billing_mode,
      total_paisa,
      rejection_reason,
      cancellation_reason,
      estimated_prep_minutes,
      placed_at,
      accepted_at,
      preparing_at,
      ready_at,
      served_at,
      table:tables (table_number),
      restaurant:restaurants (name, name_ur, currency)
    `)
    .eq('id', orderId)
    .single()

  if (orderErr || !order) {
    return null
  }

  const { data: items } = await supabase
    .from('order_items')
    .select('id, name_snapshot, quantity, unit_price_paisa, total_paisa, modifiers_snapshot, notes')
    .eq('order_id', orderId)

  const { data: events } = await supabase
    .from('order_status_events')
    .select('id, from_status, to_status, actor_type, actor_name, reason, created_at')
    .eq('order_id', orderId)
    .order('created_at', { ascending: true })

  return {
    order,
    items: items || [],
    events: events || [],
  }
}
