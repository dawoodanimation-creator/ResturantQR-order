'use client'

import React, { useState, useRef, useMemo } from 'react'
import { X, Plus, Minus, AlertCircle } from 'lucide-react'
import { GuestMenuItem } from '@/app/actions/guest'
import { useCartStore, SelectedModifier } from '@/lib/store/useCartStore'
import { formatPaisaToPKR } from '@/lib/utils'

interface ItemSheetProps {
  item: GuestMenuItem | null
  isOpen: boolean
  onClose: () => void
}

function ItemSheetContent({
  item,
  onClose,
}: {
  item: GuestMenuItem
  onClose: () => void
}) {
  const addItem = useCartStore((state) => state.addItem)

  const [quantity, setQuantity] = useState<number>(1)
  const [notes, setNotes] = useState<string>('')
  const [invalidGroupId, setInvalidGroupId] = useState<string | null>(null)

  // Hard-won Rule #5: Never preselect an option that costs money.
  // Required groups: nothing preselected.
  // Optional groups: preselect defaults only when price delta is zero.
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string[]>>(() => {
    const initial: Record<string, string[]> = {}
    for (const group of item.modifierGroups || []) {
      if (!group.isRequired) {
        const defaults = group.options
          .filter((opt) => opt.isDefault && opt.priceDeltaPaisa === 0)
          .map((opt) => opt.id)
        initial[group.id] = defaults.slice(0, group.maxSelections)
      } else {
        initial[group.id] = []
      }
    }
    return initial
  })

  const groupRefs = useRef<Record<string, HTMLFieldSetElement | null>>({})

  // Calculate live total price
  const { totalPricePaisa, selectedModifiersList } = useMemo(() => {
    let delta = 0
    const list: SelectedModifier[] = []

    for (const group of item.modifierGroups || []) {
      const optionIds = selectedOptions[group.id] || []
      for (const optId of optionIds) {
        const opt = group.options.find((o) => o.id === optId)
        if (opt) {
          delta += opt.priceDeltaPaisa
          list.push({
            groupId: group.id,
            groupName: group.name,
            optionId: opt.id,
            optionName: opt.name,
            priceDeltaPaisa: opt.priceDeltaPaisa,
          })
        }
      }
    }

    const unit = item.basePricePaisa + delta
    return {
      totalPricePaisa: unit * quantity,
      selectedModifiersList: list,
    }
  }, [item, selectedOptions, quantity])

  const handleOptionToggle = (
    groupId: string,
    optionId: string,
    maxSelections: number
  ) => {
    setInvalidGroupId(null)
    setSelectedOptions((prev) => {
      const current = prev[groupId] || []

      // Single selection group (radio behavior)
      if (maxSelections === 1) {
        return { ...prev, [groupId]: [optionId] }
      }

      // Multi-selection (checkbox behavior)
      if (current.includes(optionId)) {
        return { ...prev, [groupId]: current.filter((id) => id !== optionId) }
      }

      if (current.length >= maxSelections) {
        return prev // Exceeds max selections
      }

      return { ...prev, [groupId]: [...current, optionId] }
    })
  }

  const handleAddToCart = () => {
    // Validate required modifier groups
    for (const group of item.modifierGroups || []) {
      const selected = selectedOptions[group.id] || []
      const minRequired = group.isRequired ? Math.max(1, group.minSelections) : group.minSelections

      if (selected.length < minRequired) {
        setInvalidGroupId(group.id)
        // Hard-won Rule: No summary error banner: on submit, scroll to and focus the first invalid group
        const targetRef = groupRefs.current[group.id]
        if (targetRef) {
          targetRef.scrollIntoView({ behavior: 'smooth', block: 'center' })
          targetRef.focus()
        }
        return
      }
    }

    addItem({
      menuItemId: item.id,
      name: item.name,
      nameUr: item.nameUr,
      basePricePaisa: item.basePricePaisa,
      quantity,
      modifiers: selectedModifiersList,
      notes: notes.trim() || null,
    })

    onClose()
  }

  return (
    <div className="relative w-full max-w-md bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-200">
      {/* Sticky Close Button */}
      <button
        type="button"
        onClick={onClose}
        className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-white"
        aria-label="Close item sheet"
      >
        <X className="w-5 h-5" />
      </button>

      {/* Scrollable Content Container */}
      <div className="overflow-y-auto flex-1 pb-6 scrollbar-thin">
        {/* Photo: Height <= 200px so first required choice is visible without scrolling */}
        <div className="w-full h-44 sm:h-48 bg-zinc-100 dark:bg-zinc-800 relative shrink-0">
          {item.imageUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={item.imageUrl}
              alt={item.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-4xl text-zinc-300">
              🍲
            </div>
          )}
        </div>

        <div className="px-5 pt-3.5 space-y-4">
          {/* Header & Description */}
          <div>
            <div className="flex items-baseline justify-between gap-2">
              <h2
                id="item-sheet-title"
                className="text-base font-bold text-zinc-900 dark:text-zinc-100"
              >
                {item.name}
              </h2>
              <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 shrink-0">
                {formatPaisaToPKR(item.basePricePaisa)}
              </span>
            </div>
            {item.nameUr && (
              <p className="text-xs text-zinc-500 font-medium" dir="rtl">
                {item.nameUr}
              </p>
            )}
            {item.description && (
              <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 leading-relaxed">
                {item.description}
              </p>
            )}
          </div>

          {/* Allergens (Displayed in item sheet, not on card) */}
          {item.allergens && item.allergens.length > 0 && (
            <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <p className="text-[11px] text-amber-800 dark:text-amber-300">
                <span className="font-semibold">Contains allergens: </span>
                {item.allergens.join(', ')}
              </p>
            </div>
          )}

          {/* Modifier Groups as Data */}
          <div className="space-y-4 pt-1">
            {item.modifierGroups?.map((group) => {
              const isInvalid = invalidGroupId === group.id
              const currentSelections = selectedOptions[group.id] || []

              return (
                <fieldset
                  key={group.id}
                  ref={(el) => { groupRefs.current[group.id] = el }}
                  tabIndex={-1}
                  className={`p-3 rounded-xl border transition-all ${
                    isInvalid
                      ? 'border-rose-500 bg-rose-50/40 dark:bg-rose-950/20 ring-1 ring-rose-500'
                      : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-800/40'
                  }`}
                >
                  <legend className="flex items-baseline justify-between w-full px-1 mb-2">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-xs text-zinc-900 dark:text-zinc-100">
                        {group.name}
                      </span>
                      {group.nameUr && (
                        <span className="text-[11px] text-zinc-400" dir="rtl">
                          ({group.nameUr})
                        </span>
                      )}
                    </div>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-sm ${
                        group.isRequired
                          ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                          : 'bg-zinc-200 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300'
                      }`}
                    >
                      {group.isRequired ? 'Required' : 'Optional'}
                    </span>
                  </legend>

                  {/* Options List */}
                  <div className="space-y-1.5">
                    {group.options.map((option) => {
                      const isSelected = currentSelections.includes(option.id)
                      const isSingle = group.maxSelections === 1

                      return (
                        <label
                          key={option.id}
                          className={`flex items-center justify-between p-2.5 rounded-lg border transition-colors cursor-pointer min-h-[44px] ${
                            isSelected
                              ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 dark:border-emerald-500'
                              : 'border-zinc-200/80 dark:border-zinc-700/60 bg-white dark:bg-zinc-900 hover:border-zinc-300'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <input
                              type={isSingle ? 'radio' : 'checkbox'}
                              name={group.id}
                              checked={isSelected}
                              onChange={() => handleOptionToggle(group.id, option.id, group.maxSelections)}
                              className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 rounded-sm"
                            />
                            <span className="text-xs font-medium text-zinc-900 dark:text-zinc-100">
                              {option.name}
                            </span>
                            {option.nameUr && (
                              <span className="text-xs text-zinc-400" dir="rtl">
                                {option.nameUr}
                              </span>
                            )}
                          </div>
                          <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                            {option.priceDeltaPaisa > 0 ? `+${formatPaisaToPKR(option.priceDeltaPaisa)}` : 'Free'}
                          </span>
                        </label>
                      )
                    })}
                  </div>
                </fieldset>
              )
            })}
          </div>

          {/* Special Instructions Note */}
          <div>
            <label
              htmlFor="item-notes"
              className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1"
            >
              Special Instructions (Optional)
            </label>
            <input
              id="item-notes"
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={250}
              placeholder="e.g. Less spicy, dressing on side"
              className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>
      </div>

      {/* Footer with Quantity Controls and Add Button */}
      <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center gap-3 shrink-0">
        {/* Quantity Selector */}
        <div className="flex items-center border border-zinc-300 dark:border-zinc-700 rounded-xl overflow-hidden shrink-0">
          <button
            type="button"
            onClick={() => setQuantity(Math.max(1, quantity - 1))}
            disabled={quantity <= 1}
            className="w-11 h-11 flex items-center justify-center text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-40 transition-colors focus:outline-none"
            aria-label="Decrease quantity"
          >
            <Minus className="w-4 h-4" />
          </button>
          <span className="w-8 text-center font-bold text-xs text-zinc-900 dark:text-zinc-100">
            {quantity}
          </span>
          <button
            type="button"
            onClick={() => setQuantity(quantity + 1)}
            className="w-11 h-11 flex items-center justify-center text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors focus:outline-none"
            aria-label="Increase quantity"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Add to Order Button */}
        <button
          type="button"
          onClick={handleAddToCart}
          className="flex-1 h-11 flex items-center justify-between px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md active:scale-[0.99] transition-all focus:outline-none focus:ring-2 focus:ring-emerald-400"
        >
          <span>Add to Order</span>
          <span>{formatPaisaToPKR(totalPricePaisa)}</span>
        </button>
      </div>
    </div>
  )
}

export function ItemSheet({ item, isOpen, onClose }: ItemSheetProps) {
  if (!isOpen || !item) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 transition-opacity"
      role="dialog"
      aria-modal="true"
      aria-labelledby="item-sheet-title"
    >
      <ItemSheetContent key={item.id} item={item} onClose={onClose} />
    </div>
  )
}
