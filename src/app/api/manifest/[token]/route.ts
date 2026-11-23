import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

interface TableWithRestaurant {
  table_number: string
  restaurant: {
    name: string
    slug: string
    brand_color: string | null
  } | null
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const supabase = createAdminClient()

  const { data } = await supabase
    .from('tables')
    .select('table_number, restaurant:restaurants(name, slug, brand_color)')
    .eq('qr_token', token)
    .single()

  const table = data as unknown as TableWithRestaurant | null
  const restaurantName = table?.restaurant?.name || 'Restaurant QR'
  const tableNumber = table?.table_number || ''
  const brandColor = table?.restaurant?.brand_color || '#0f766e'

  const manifest = {
    name: `${restaurantName} - Table ${tableNumber}`,
    short_name: restaurantName,
    description: `Quick table ordering at ${restaurantName}`,
    start_url: `/r/${table?.restaurant?.slug || ''}/t/${token}`,
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: brandColor,
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }

  return NextResponse.json(manifest, {
    headers: {
      'Content-Type': 'application/manifest+json',
      'Cache-Control': 'no-store',
    },
  })
}
