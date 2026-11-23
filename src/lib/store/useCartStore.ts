import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export interface SelectedModifier {
  groupId: string
  groupName: string
  optionId: string
  optionName: string
  priceDeltaPaisa: number
}

export interface CartLineItem {
  lineId: string
  menuItemId: string
  name: string
  nameUr?: string | null
  basePricePaisa: number
  unitPricePaisa: number
  quantity: number
  modifiers: SelectedModifier[]
  notes?: string | null
  lineTotalPaisa: number
}

interface CartStore {
  restaurantId: string | null
  branchId: string | null
  taxBps: number
  serviceChargeBps: number
  items: CartLineItem[]
  isOpen: boolean
  
  // Actions
  initRestaurant: (restaurantId: string, branchId: string, taxBps: number, serviceChargeBps: number) => void
  openCart: () => void
  closeCart: () => void
  addItem: (item: Omit<CartLineItem, 'lineId' | 'lineTotalPaisa' | 'unitPricePaisa'>) => void
  updateQuantity: (lineId: string, delta: number) => void
  removeItem: (lineId: string) => void
  clearCart: () => void
  
  // Computed values
  getItemCount: () => number
  getSubtotalPaisa: () => number
  getTaxPaisa: () => number
  getServiceChargePaisa: () => number
  getTotalPaisa: () => number
}

export function generateLineId(menuItemId: string, modifiers: SelectedModifier[], notes?: string | null): string {
  const sortedOptionIds = [...modifiers].map(m => m.optionId).sort().join('|')
  const cleanNotes = (notes || '').trim().toLowerCase()
  return `${menuItemId}_${sortedOptionIds}_${cleanNotes}`
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      restaurantId: null,
      branchId: null,
      taxBps: 0,
      serviceChargeBps: 0,
      items: [],
      isOpen: false,

      initRestaurant: (restaurantId, branchId, taxBps, serviceChargeBps) => {
        const current = get()
        if (current.restaurantId !== restaurantId || current.branchId !== branchId) {
          // Clear cart if switched to a different restaurant or branch
          set({
            restaurantId,
            branchId,
            taxBps,
            serviceChargeBps,
            items: current.restaurantId === restaurantId ? current.items : [],
          })
        } else {
          set({ taxBps, serviceChargeBps })
        }
      },

      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),

      addItem: (newItem) => {
        const modifiersDelta = newItem.modifiers.reduce((sum, m) => sum + m.priceDeltaPaisa, 0)
        const unitPricePaisa = newItem.basePricePaisa + modifiersDelta
        const lineId = generateLineId(newItem.menuItemId, newItem.modifiers, newItem.notes)

        set((state) => {
          const existingIndex = state.items.findIndex(i => i.lineId === lineId)
          if (existingIndex > -1) {
            const updated = [...state.items]
            const existing = updated[existingIndex]
            const newQty = existing.quantity + newItem.quantity
            updated[existingIndex] = {
              ...existing,
              quantity: newQty,
              unitPricePaisa,
              lineTotalPaisa: unitPricePaisa * newQty,
            }
            return { items: updated }
          }

          const lineItem: CartLineItem = {
            ...newItem,
            lineId,
            unitPricePaisa,
            lineTotalPaisa: unitPricePaisa * newItem.quantity,
          }
          return { items: [...state.items, lineItem] }
        })
      },

      updateQuantity: (lineId, delta) => {
        set((state) => {
          const existing = state.items.find(i => i.lineId === lineId)
          if (!existing) return state

          const newQty = existing.quantity + delta
          if (newQty <= 0) {
            return { items: state.items.filter(i => i.lineId !== lineId) }
          }

          const items = state.items.map(item => {
            if (item.lineId === lineId) {
              return {
                ...item,
                quantity: newQty,
                lineTotalPaisa: item.unitPricePaisa * newQty,
              }
            }
            return item
          })
          return { items }
        })
      },

      removeItem: (lineId) => {
        set((state) => ({
          items: state.items.filter(i => i.lineId !== lineId),
        }))
      },

      clearCart: () => set({ items: [], isOpen: false }),

      getItemCount: () => {
        return get().items.reduce((sum, item) => sum + item.quantity, 0)
      },

      getSubtotalPaisa: () => {
        return get().items.reduce((sum, item) => sum + item.lineTotalPaisa, 0)
      },

      getTaxPaisa: () => {
        const subtotal = get().getSubtotalPaisa()
        const taxBps = get().taxBps
        // rate in basis points (e.g. 1600 bps = 16%)
        return Math.round((subtotal * taxBps) / 10000)
      },

      getServiceChargePaisa: () => {
        const subtotal = get().getSubtotalPaisa()
        const serviceChargeBps = get().serviceChargeBps
        return Math.round((subtotal * serviceChargeBps) / 10000)
      },

      getTotalPaisa: () => {
        const subtotal = get().getSubtotalPaisa()
        const tax = get().getTaxPaisa()
        const serviceCharge = get().getServiceChargePaisa()
        return subtotal + tax + serviceCharge
      },
    }),
    {
      name: 'restaurant_qr_guest_cart',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        restaurantId: state.restaurantId,
        branchId: state.branchId,
        items: state.items,
        taxBps: state.taxBps,
        serviceChargeBps: state.serviceChargeBps,
      }),
    }
  )
)
