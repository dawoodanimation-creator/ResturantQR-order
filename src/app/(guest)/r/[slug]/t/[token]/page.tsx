import { notFound } from 'next/navigation'
import { getGuestMenuAction } from '@/app/actions/guest'
import { GuestView } from '@/components/guest/GuestView'

export const instant = false

interface PageProps {
  params: Promise<{
    slug: string
    token: string
  }>
}

export async function generateMetadata({ params }: PageProps) {
  const { slug, token } = await params
  const context = await getGuestMenuAction(slug, token)
  if (!context) {
    return { title: 'Menu - Restaurant QR' }
  }
  return {
    title: `${context.restaurant.name} - Table ${context.table.tableNumber} Menu`,
    description: `Browse menu and order online from your table at ${context.restaurant.name}.`,
  }
}

export default async function GuestPage({ params }: PageProps) {
  const { slug, token } = await params
  const context = await getGuestMenuAction(slug, token)

  if (!context) {
    notFound()
  }

  // Restaurant Suspension Gate (SPEC §4.F: suspended restaurants show a notice instead of the app)
  if (context.restaurant.isSuspended) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-6">
        <div className="max-w-sm w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 text-center space-y-3 shadow-md">
          <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 flex items-center justify-center mx-auto text-xl font-bold">
            ⚠️
          </div>
          <h1 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
            {context.restaurant.name} is Temporarily Unavailable
          </h1>
          <p className="text-xs text-zinc-500 leading-relaxed">
            Online ordering is currently suspended for this establishment. Please speak directly with the staff.
          </p>
        </div>
      </div>
    )
  }

  return <GuestView context={context} />
}
