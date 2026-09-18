import Link from 'next/link'
import { PageEnter } from '@/components/PageEnter'

export default function NotFound() {
  return (
    <PageEnter>
    <main className="mx-auto max-w-[1200px] px-4 py-16">
      <h1 className="text-[22px] font-medium text-paper">Not found</h1>
      <p className="mt-2 text-sm text-muted">That market is not on LONGER.</p>
      <Link href="/" className="btn btn-ink mt-6">
        Back to Explore
      </Link>
    </main>
    </PageEnter>
  )
}
