'use client'

import React, { useState, useMemo, useRef } from 'react'
import { Search, ShoppingBag, X } from 'lucide-react'
import { GuestRestaurantContext, GuestMenuItem } from '@/app/actions/guest'
import { MenuItemCard } from './MenuItemCard'
import { useCartStore } from '@/lib/store/useCartStore'
import { formatPaisaToPKR } from '@/lib/utils'

interface GuestMenuProps {
  context: GuestRestaurantContext
  onOpenItemSheet: (item: GuestMenuItem) => void
}

export function GuestMenu({ context, onOpenItemSheet }: GuestMenuProps) {
  const { categories, items, restaurant, branch, table } = context
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(categories[0]?.id || '')
  const [searchQuery, setSearchQuery] = useState<string>('')
  
  const cartItems = useCartStore((state) => state.items)
  const openCart = useCartStore((state) => state.openCart)
  const addItem = useCartStore((state) => state.addItem)
  const cartItemCount = useCartStore((state) => state.getItemCount())
  const cartTotalPaisa = useCartStore((state) => state.getTotalPaisa())

  const categoryRefs = useRef<Record<string, HTMLElement | null>>({})

  // Map of menu item id to total quantity in cart
  const cartQuantities = useMemo(() => {
    const map = new Map<string, number>()
    for (const item of cartItems) {
      map.set(item.menuItemId, (map.get(item.menuItemId) || 0) + item.quantity)
    }
    return map
  }, [cartItems])

  // Filter items by category & search
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch = searchQuery === '' || 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.nameUr && item.nameUr.includes(searchQuery)) ||
        (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()))
      return matchesSearch
    })
  }, [items, searchQuery])

  // Group items by category
  const itemsByCategory = useMemo(() => {
    const map = new Map<string, GuestMenuItem[]>()
    for (const cat of categories) {
      map.set(cat.id, [])
    }
    for (const item of filteredItems) {
      const list = map.get(item.categoryId) || []
      list.push(item)
      map.set(item.categoryId, list)
    }
    return map
  }, [categories, filteredItems])

  const handleQuickAdd = (item: GuestMenuItem) => {
    // For simple items with no required modifiers:
    // Gather default options that have 0 price delta (Hard-won rule #5)
    const defaultModifiers = (item.modifierGroups || []).flatMap(group => 
      group.options
        .filter(opt => opt.isDefault && opt.priceDeltaPaisa === 0)
        .map(opt => ({
          groupId: group.id,
          groupName: group.name,
          optionId: opt.id,
          optionName: opt.name,
          priceDeltaPaisa: 0,
        }))
    )

    addItem({
      menuItemId: item.id,
      name: item.name,
      nameUr: item.nameUr,
      basePricePaisa: item.basePricePaisa,
      quantity: 1,
      modifiers: defaultModifiers,
      notes: null,
    })
  }

  const handleCategoryClick = (catId: string) => {
    setSelectedCategoryId(catId)
    const el = categoryRefs.current[catId]
    if (el) {
      const offsetTop = el.getBoundingClientRect().top + window.scrollY - 120
      window.scrollTo({ top: offsetTop, behavior: 'smooth' })
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 pb-28">
      {/* Restaurant Header */}
      <header className="sticky top-0 z-20 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800 shadow-2xs">
        <div className="max-w-md mx-auto px-4 py-2.5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              {restaurant.logoUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={restaurant.logoUrl}
                  alt={restaurant.name}
                  className="w-9 h-9 rounded-full object-cover border border-zinc-200"
                />
              ) : (
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-white text-sm shrink-0"
                  style={{ backgroundColor: restaurant.brandColor || '#0f766e' }}
                >
                  {restaurant.name.charAt(0)}
                </div>
              )}
              <div className="min-w-0">
                <h1 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 truncate">
                  {restaurant.name}
                </h1>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                  {branch.name} • Table {table.tableNumber}
                </p>
              </div>
            </div>

            {/* Billing Mode Badge */}
            <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-300/50">
              {branch.billingMode === 'PRE_PAY' ? 'Counter Pay' : 'Dine-In'}
            </span>
          </div>

          {/* Search Input */}
          <div className="relative mt-2">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search dishes, drinks..."
              className="w-full pl-9 pr-8 py-1.5 text-xs rounded-lg bg-zinc-100 dark:bg-zinc-800 border-none focus:outline-none focus:ring-2 focus:ring-emerald-500 text-zinc-900 dark:text-zinc-100"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2 text-zinc-400 hover:text-zinc-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Category Horizontal Tab Bar */}
        <nav
          className="flex items-center gap-1.5 overflow-x-auto px-4 py-2 scrollbar-none no-scrollbar max-w-md mx-auto"
          aria-label="Menu categories"
        >
          {categories.map((cat) => {
            const isSelected = selectedCategoryId === cat.id
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleCategoryClick(cat.id)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                  isSelected
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200'
                }`}
              >
                {cat.name}
              </button>
            )
          })}
        </nav>
      </header>

      {/* Menu Categories and Items Container */}
      <main className="max-w-md mx-auto px-3.5 pt-3 space-y-5">
        {categories.map((cat) => {
          const categoryItems = itemsByCategory.get(cat.id) || []
          if (categoryItems.length === 0 && searchQuery !== '') return null

          return (
            <section
              key={cat.id}
              ref={(el) => { categoryRefs.current[cat.id] = el }}
              className="space-y-2 scroll-mt-28"
            >
              <div className="flex items-baseline justify-between pt-1">
                <h2 className="text-sm font-bold tracking-tight text-zinc-900 dark:text-zinc-100 uppercase">
                  {cat.name}
                </h2>
                {cat.nameUr && (
                  <span className="text-xs text-zinc-500 dark:text-zinc-400" dir="rtl">
                    {cat.nameUr}
                  </span>
                )}
              </div>

              {categoryItems.length === 0 ? (
                <p className="text-xs text-zinc-400 py-2">No items in this category.</p>
              ) : (
                <div className="space-y-2">
                  {categoryItems.map((item) => (
                    <MenuItemCard
                      key={item.id}
                      item={item}
                      inCartQuantity={cartQuantities.get(item.id) || 0}
                      onQuickAdd={handleQuickAdd}
                      onOpenSheet={onOpenItemSheet}
                    />
                  ))}
                </div>
              )}
            </section>
          )
        })}

        {filteredItems.length === 0 && searchQuery !== '' && (
          <div className="text-center py-12 text-zinc-500">
            <p className="text-sm font-medium">No menu items match &quot;{searchQuery}&quot;</p>
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="mt-2 text-xs text-emerald-600 font-semibold underline"
            >
              Clear search
            </button>
          </div>
        )}
      </main>

      {/* Floating View Cart Bar */}
      {cartItemCount > 0 && (
        <div className="fixed bottom-4 inset-x-0 z-30 px-4 max-w-md mx-auto">
          <button
            type="button"
            onClick={openCart}
            className="w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-xl active:scale-[0.98] transition-all focus:outline-none focus:ring-4 focus:ring-emerald-300"
            aria-label={`View cart, ${cartItemCount} items, total ${formatPaisaToPKR(cartTotalPaisa)}`}
          >
            <div className="flex items-center gap-2.5">
              <span className="w-6 h-6 rounded-full bg-white text-emerald-800 text-xs flex items-center justify-center font-extrabold">
                {cartItemCount}
              </span>
              <span>View Order</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span>{formatPaisaToPKR(cartTotalPaisa)}</span>
              <ShoppingBag className="w-4 h-4 ml-1" />
            </div>
          </button>
        </div>
      )}
    </div>
  )
}
