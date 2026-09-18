import { Suspense } from 'react'
import { Explore } from '@/components/Explore'

export default function Page() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-[1200px] px-4 py-16 text-sm text-muted">Loading market…</div>}>
      <Explore />
    </Suspense>
  )
}
