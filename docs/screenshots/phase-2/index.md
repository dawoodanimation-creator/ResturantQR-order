# Phase 2 Design Review & UI State Index

This document records the visual layouts, responsive mobile specifications, and key interaction states for the **Guest PWA (Phase 2)**.

---

## 1. Guest Menu View (Mobile 390px Viewport)

* **Route:** `/r/[slug]/t/[token]`
* **Key Targets:** Compact density ($\ge 5$ items visible above the fold on a 390px screen), 44px touch targets on item photo `+` buttons.

```text
┌──────────────────────────────────────────────┐
│ Karachi Biryani & Grill       [DINE-IN]     │
│ Clifton Branch • Table T-01                  │
│ [ 🔍 Search dishes, drinks...              ] │
├──────────────────────────────────────────────┤
│ (Special Biryani) (BBQ & Grills) (Drinks)    │ <- Sticky Category Bar
├──────────────────────────────────────────────┤
│ SPECIAL BIRYANI                              │
│                                              │
│ ┌──────────────────────────────────────────┐ │
│ │ Chicken Dum Biryani (Single)   [  📸   ] │ │
│ │ چکن دم بریانی                     [  +   ] │ │ <- 44px Touch '+' Button
│ │ [HALAL] [POULTRY]                        │ │
│ │ PKR 550.00 • Customizable                │ │
│ └──────────────────────────────────────────┘ │
│ ┌──────────────────────────────────────────┐ │
│ │ Special Beef Biryani (Double)  [  📸   ] │ │
│ │ اسپیشل بیف بریانی                  [  +   ] │ │
│ │ [HALAL] [BEEF]                           │ │
│ │ PKR 950.00                               │ │
│ └──────────────────────────────────────────┘ │
│ ┌──────────────────────────────────────────┐ │
│ │ Chicken Malai Boti (8 pcs)     [  📸   ] │ │
│ │ چکن ملائی بوٹی                     [  +   ] │ │
│ │ [HALAL]                                  │ │
│ │ PKR 850.00                               │ │
│ └──────────────────────────────────────────┘ │
│ ┌──────────────────────────────────────────┐ │
│ │ Fresh Mint Zeera Raita         [  📸   ] │ │
│ │ پودینہ اور زیرہ رائتہ                [  +   ] │ │
│ │ [VEGETARIAN]                             │ │
│ │ PKR 100.00                               │ │
│ └──────────────────────────────────────────┘ │
│ ┌──────────────────────────────────────────┐ │
│ │ Special Mutton Karahi          [  📸   ] │ │
│ │ [SOLD OUT]                               │ │ <- Sold-out label (no strikethrough)
│ │ PKR 1,800.00                             │ │
│ └──────────────────────────────────────────┘ │
├──────────────────────────────────────────────┤
│ [ 🛍️ View Order (2)           PKR 650.00 ]  │ <- Floating Cart Pill
└──────────────────────────────────────────────┘
```

---

## 2. Item Sheet & Modifier Selection

* **Height Constraint:** Photo $\le 200\text{px}$ so the first required modifier group is visible without scrolling.
* **Validation Rule:** No generic summary error banner. On submit, scrolls to and focuses the first invalid group.
* **Pricing Rule:** Never preselect an option that costs money.

```text
┌──────────────────────────────────────────────┐
│ [X]                                          │
│ ┌──────────────────────────────────────────┐ │
│ │                                          │ │
│ │             Dish Photo (<=200px)         │ │
│ │                                          │ │
│ └──────────────────────────────────────────┘ │
│ Chicken Dum Biryani (Single)     PKR 550.00  │
│ چکن دم بریانی                                │
│ Traditional fragrant basmati rice...         │
│                                              │
│ ⚠️ Contains allergens: Dairy                 │ <- Allergens in sheet only
│                                              │
│ ┌─ Spice Level (Required) ─────────────────┐ │
│ │ (•) Regular Spicy                 Free   │ │ <- Default 0-cost allowed
│ │ ( ) Extra Spicy                   Free   │ │
│ └──────────────────────────────────────────┘ │
│                                              │
│ ┌─ Add-ons (Optional) ─────────────────────┐ │
│ │ [ ] Extra Aloo (Potato)      +PKR 50.00  │ │ <- Non-zero NOT default
│ │ [ ] Extra Chicken Piece     +PKR 200.00  │ │
│ └──────────────────────────────────────────┘ │
│                                              │
│ Special Instructions (Optional):             │
│ [ Less spicy, extra raita please           ] │
├──────────────────────────────────────────────┤
│ [ - ]  1  [ + ]   [ Add to Order • PKR 550 ] │ <- 44px controls
└──────────────────────────────────────────────┘
```

---

## 3. Cart Drawer & Price Change Safety

* **Quantity Morphing:** At quantity 1, the minus button morphs into a red trash can.
* **Server Re-Pricing:** Re-priced atomically on server. If price changes, triggers "was X, now Y" confirmation.

```text
┌──────────────────────────────────────────────┐
│ Your Order                               [X] │
│ Post-Pay Dine-In • Table T-01                │
├──────────────────────────────────────────────┤
│ ┌──────────────────────────────────────────┐ │
│ │ Chicken Dum Biryani (Single)  PKR 550.00 │ │
│ │ Regular Spicy                            │ │
│ │ "Extra spicy raita"                      │ │
│ │ PKR 550.00 each                          │ │
│ │ [ 🗑️ ]  1  [ + ]                          │ │ <- Minus morphs to trash
│ └──────────────────────────────────────────┘ │
│ ┌──────────────────────────────────────────┐ │
│ │ Fresh Mint Zeera Raita        PKR 100.00 │ │
│ │ PKR 100.00 each                          │ │
│ │ [ - ]  2  [ + ]                          │ │
│ └──────────────────────────────────────────┘ │
├──────────────────────────────────────────────┤
│ Subtotal                        PKR 750.00   │
│ Tax / Sales Tax (16%)           PKR 120.00   │
│ Service Charge (5%)              PKR 37.50   │
│ ───────────────────────────────────────────  │
│ Total Amount                    PKR 907.50   │
│                                              │
│ [      SEND TO KITCHEN  ->                ]  │
└──────────────────────────────────────────────┘
```

---

## 4. Realtime Order Tracker

* **Pre-Pay (Counter):** Large token card instructing guest to pay at counter.
* **Post-Pay (Dine-In):** "Needs Approval" -> "Order Confirmed" with ETA hint.
* **Derived Status Labeling:** Terminal state shows "Order Served" for dine-in, "Order Collected" for counter.
* **Accessibility:** `aria-live="polite"` region alerts screen readers on each status transition.

```text
┌──────────────────────────────────────────────┐
│ Order #1                     [ 🔄 Refresh ]  │
│ Table T-01 • Karachi Biryani & Grill         │
├──────────────────────────────────────────────┤
│          [ PAY AT COUNTER ]                  │
│                 #1                           │
│ Please pay PKR 786.50 at the counter to      │
│ begin cooking.                               │
├──────────────────────────────────────────────┤
│                   👨‍🍳                        │
│            Cooking in Kitchen                │
│    Our chefs are preparing your fresh meal   │
│                                              │
│ [ ⏱️ Estimated prep time: ~15 minutes ]      │ <- ETA only once accepted
├──────────────────────────────────────────────┤
│ LIVE PROGRESS                                │
│ (✓) Floor Approval • Approved                │
│ (✓) Kitchen Accepted • In kitchen queue      │
│ (3) Cooking • Currently on grill             │
│ ( ) Ready • Brought to table                 │
│ ( ) Served • Order complete                  │
├──────────────────────────────────────────────┤
│ ITEMS ORDERED                                │
│ 1x Chicken Dum Biryani (Single)   PKR 550.00 │
│ 1x Fresh Mint Zeera Raita         PKR 100.00 │
│ ──────────────────────────────────────────── │
│ Total Paid                        PKR 786.50 │
│                                              │
│ [          Order More Items               ]  │
└──────────────────────────────────────────────┘
```
