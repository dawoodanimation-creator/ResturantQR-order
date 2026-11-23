'use client'

import React from 'react'
import { Plus } from 'lucide-react'
import { GuestMenuItem } from '@/app/actions/guest'
import { formatPaisaToPKR } from '@/lib/utils'

interface MenuItemCardProps {
  item: GuestMenuItem
  inCartQuantity: number
  onQuickAdd: (item: GuestMenuItem) => void
  onOpenSheet: (item: GuestMenuItem) => void
}

export function MenuItemCard({
  item,
  inCartQuantity,
  onQuickAdd,
  onOpenSheet,
}: MenuItemCardProps) {
  const hasModifiers = item.modifierGroups && item.modifierGroups.length > 0
  const hasRequiredModifiers = item.modifierGroups?.some(g => g.isRequired)
  const isSoldOut = item.isSoldOut || !item.isAvailable

  const handleCardClick = () => {
    if (isSoldOut) return
    onOpenSheet(item)
  }

  const handlePlusClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isSoldOut) return

    if (hasRequiredModifiers) {
      // Must open sheet to select required modifiers
      onOpenSheet(item)
    } else {
      // Simple item or optional-only modifiers: quick add
      onQuickAdd(item)
    }
  }

  return (
    <article
      onClick={handleCardClick}
      className={`relative flex items-center justify-between p-2.5 rounded-xl border transition-colors ${
        isSoldOut
          ? 'bg-zinc-50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 opacity-60 cursor-not-allowed'
          : 'bg-white dark:bg-zinc-900 border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 cursor-pointer shadow-xs active:scale-[0.99]'
      }`}
      role="button"
      tabIndex={isSoldOut ? -1 : 0}
      onKeyDown={(e) => {
        if (!isSoldOut && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault()
          handleCardClick()
        }
      }}
      aria-disabled={isSoldOut}
      aria-label={`${item.name}, ${formatPaisaToPKR(item.basePricePaisa)}${isSoldOut ? ', sold out' : ''}`}
    >
      {/* Left Details */}
      <div className="flex-1 pr-3 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <h3 className="font-semibold text-sm leading-tight text-zinc-900 dark:text-zinc-100 truncate">
            {item.name}
          </h3>
          {item.nameUr && (
            <span className="text-xs text-zinc-500 dark:text-zinc-400 font-normal truncate" dir="rtl">
              {item.nameUr}
            </span>
          )}
        </div>

        {/* Dietary Badges */}
        <div className="flex items-center gap-1 mt-1 flex-wrap">
          {item.dietaryTags.map((tag) => (
            <span
              key={tag}
              className={`text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-sm ${
                tag.toLowerCase() === 'halal'
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                  : tag.toLowerCase() === 'vegetarian'
                  ? 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300'
                  : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
              }`}
            >
              {tag}
            </span>
          ))}
          {isSoldOut && (
            <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-sm bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
              Sold Out
            </span>
          )}
        </div>

        {/* Price (Rule: no strikethrough price when sold out, as that reads as a discount) */}
        <div className="mt-1 flex items-baseline gap-1.5">
          <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
            {formatPaisaToPKR(item.basePricePaisa)}
          </span>
          {hasModifiers && (
            <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium">
              Customizable
            </span>
          )}
        </div>
      </div>

      {/* Right Photo & Quick-Add Button */}
      <div className="relative shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center border border-zinc-200/50 dark:border-zinc-700/50">
        {item.imageUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={item.imageUrl}
            alt={item.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-zinc-400 text-lg font-bold">
            🍽️
          </div>
        )}

        {/* 44px touch target '+' button */}
        {!isSoldOut && (
          <button
            type="button"
            onClick={handlePlusClick}
            className="absolute inset-0 m-auto w-11 h-11 flex items-center justify-center rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-md active:scale-90 transition-all focus:outline-none focus:ring-2 focus:ring-emerald-400"
            aria-label={`Add ${item.name} to order`}
          >
            {inCartQuantity > 0 ? (
              <span className="font-bold text-xs flex items-center justify-center w-6 h-6 rounded-full bg-white text-emerald-800">
                {inCartQuantity}
              </span>
            ) : (
              <Plus className="w-5 h-5 stroke-[2.5]" />
            )}
          </button>
        )}
      </div>
    </article>
  )
}
