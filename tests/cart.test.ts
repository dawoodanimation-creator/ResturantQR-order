import test, { describe, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { generateLineId, useCartStore } from '../src/lib/store/useCartStore.ts'

describe('Cart Store & Financial Math', () => {
  beforeEach(() => {
    useCartStore.getState().clearCart()
    useCartStore.getState().initRestaurant('rest_kbc', 'branch_clifton', 1600, 500)
  })

  describe('generateLineId', () => {
    test('produces identical line ID regardless of modifier selection order', () => {
      const modA = { groupId: 'g1', groupName: 'Portion', optionId: 'opt_large', optionName: 'Large', priceDeltaPaisa: 20000 }
      const modB = { groupId: 'g2', groupName: 'Spice', optionId: 'opt_spicy', optionName: 'Spicy', priceDeltaPaisa: 0 }

      const id1 = generateLineId('item_biryani', [modA, modB], 'extra raita')
      const id2 = generateLineId('item_biryani', [modB, modA], 'extra raita')

      assert.equal(id1, id2)
    })

    test('produces different line IDs for different modifiers or notes', () => {
      const modA = { groupId: 'g1', groupName: 'Portion', optionId: 'opt_large', optionName: 'Large', priceDeltaPaisa: 20000 }
      const modB = { groupId: 'g1', groupName: 'Portion', optionId: 'opt_regular', optionName: 'Regular', priceDeltaPaisa: 0 }

      const id1 = generateLineId('item_biryani', [modA], null)
      const id2 = generateLineId('item_biryani', [modB], null)
      const id3 = generateLineId('item_biryani', [modA], 'no onions')

      assert.notEqual(id1, id2)
      assert.notEqual(id1, id3)
    })

    test('normalizes notes with whitespace trimming and case insensitivity', () => {
      const id1 = generateLineId('item_karahi', [], ' Less Oil ')
      const id2 = generateLineId('item_karahi', [], 'less oil')

      assert.equal(id1, id2)
    })
  })

  describe('Cart Item Operations', () => {
    test('adds new item and calculates line total correctly', () => {
      const store = useCartStore.getState()
      store.addItem({
        menuItemId: 'item_biryani',
        name: 'Special Chicken Biryani',
        basePricePaisa: 65000, // Rs. 650
        quantity: 2,
        modifiers: [
          { groupId: 'g1', groupName: 'Extra', optionId: 'opt_egg', optionName: 'Boiled Egg', priceDeltaPaisa: 5000 }, // Rs. 50
        ],
      })

      const state = useCartStore.getState()
      assert.equal(state.items.length, 1)
      assert.equal(state.items[0].unitPricePaisa, 70000) // Rs. 700
      assert.equal(state.items[0].lineTotalPaisa, 140000) // Rs. 1400
      assert.equal(state.getItemCount(), 2)
      assert.equal(state.getSubtotalPaisa(), 140000)
    })

    test('increments quantity when identical item with same modifiers is added', () => {
      const store = useCartStore.getState()
      const itemData = {
        menuItemId: 'item_naan',
        name: 'Garlic Naan',
        basePricePaisa: 12000,
        quantity: 1,
        modifiers: [],
      }

      store.addItem(itemData)
      store.addItem({ ...itemData, quantity: 2 })

      const state = useCartStore.getState()
      assert.equal(state.items.length, 1)
      assert.equal(state.items[0].quantity, 3)
      assert.equal(state.items[0].lineTotalPaisa, 36000)
    })

    test('updates quantity and automatically removes item when quantity reaches zero', () => {
      const store = useCartStore.getState()
      store.addItem({
        menuItemId: 'item_chai',
        name: 'Doodh Patti',
        basePricePaisa: 15000,
        quantity: 2,
        modifiers: [],
      })

      const lineId = useCartStore.getState().items[0].lineId

      // Decrement by 1
      store.updateQuantity(lineId, -1)
      assert.equal(useCartStore.getState().items[0].quantity, 1)

      // Decrement by 1 (reaches 0 -> removed)
      store.updateQuantity(lineId, -1)
      assert.equal(useCartStore.getState().items.length, 0)
    })

    test('removes item directly via removeItem', () => {
      const store = useCartStore.getState()
      store.addItem({
        menuItemId: 'item_lassi',
        name: 'Sweet Lassi',
        basePricePaisa: 25000,
        quantity: 1,
        modifiers: [],
      })

      const lineId = useCartStore.getState().items[0].lineId
      store.removeItem(lineId)
      assert.equal(useCartStore.getState().items.length, 0)
    })
  })

  describe('Tax & Service Charge Calculation (Basis Points)', () => {
    test('computes integer tax and service charge with basis points precision', () => {
      const store = useCartStore.getState()
      // Setup: 16% Tax (1600 bps), 5% Service Charge (500 bps)
      store.initRestaurant('rest_kbc', 'branch_clifton', 1600, 500)

      // Add item: Rs. 1000 = 100,000 paisa
      store.addItem({
        menuItemId: 'item_handi',
        name: 'Chicken Handi',
        basePricePaisa: 100000,
        quantity: 1,
        modifiers: [],
      })

      const state = useCartStore.getState()
      assert.equal(state.getSubtotalPaisa(), 100000) // Rs. 1,000
      assert.equal(state.getTaxPaisa(), 16000) // Rs. 160 (16%)
      assert.equal(state.getServiceChargePaisa(), 5000) // Rs. 50 (5%)
      assert.equal(state.getTotalPaisa(), 121000) // Rs. 1,210
    })

    test('rounds fractional paisa accurately without floating point drift', () => {
      const store = useCartStore.getState()
      // Setup: 13% Tax (1300 bps), 3.5% Service Charge (350 bps)
      store.initRestaurant('rest_kbc', 'branch_clifton', 1300, 350)

      // Add item: Rs. 333.33 = 33333 paisa
      store.addItem({
        menuItemId: 'item_special',
        name: 'Chef Special',
        basePricePaisa: 33333,
        quantity: 1,
        modifiers: [],
      })

      const state = useCartStore.getState()
      // 33333 * 1300 / 10000 = 4333.29 -> Math.round -> 4333 paisa
      assert.equal(state.getTaxPaisa(), 4333)
      // 33333 * 350 / 10000 = 1166.655 -> Math.round -> 1167 paisa
      assert.equal(state.getServiceChargePaisa(), 1167)
      // Total: 33333 + 4333 + 1167 = 38833 paisa
      assert.equal(state.getTotalPaisa(), 38833)
    })

    test('resets items when switching to a different restaurant', () => {
      const store = useCartStore.getState()
      store.addItem({
        menuItemId: 'item_1',
        name: 'Biryani',
        basePricePaisa: 50000,
        quantity: 1,
        modifiers: [],
      })
      assert.equal(useCartStore.getState().items.length, 1)

      // Switch to another restaurant
      store.initRestaurant('different_restaurant', 'different_branch', 1600, 0)
      assert.equal(useCartStore.getState().items.length, 0)
    })
  })
})
