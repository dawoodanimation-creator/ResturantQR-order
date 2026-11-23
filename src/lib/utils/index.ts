import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Utility to merge Tailwind classes safely with clsx
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format paisa integer into PKR currency string
 * e.g., 55000 paisa -> "PKR 550.00"
 */
export function formatPaisaToPKR(paisa: number, includeDecimals = true): string {
  const rupees = paisa / 100
  if (!includeDecimals && Number.isInteger(rupees)) {
    return `PKR ${rupees.toLocaleString('en-PK')}`
  }
  return `PKR ${rupees.toLocaleString('en-PK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

/**
 * Convert whole rupees into integer paisa
 */
export function rupeesToPaisa(rupees: number): number {
  return Math.round(rupees * 100)
}
