import { PageWrapper } from '@/components/layout/PageWrapper'
import { Skeleton } from '@/components/ui/Skeleton'

export default function DashboardPage() {
  return (
    <PageWrapper
      label="Overview"
      title="Dashboard"
      subtitle="Your job search at a glance"
    >
      {/* Stat cards skeleton — replaced in Phase 7 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>

      {/* Priority queue skeleton */}
      <div className="mt-8">
        <Skeleton className="h-4 w-36 mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      </div>
    </PageWrapper>
  )
}
