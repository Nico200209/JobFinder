import { cn } from '@/lib/utils'

export type JobStatus =
  | 'new' | 'reviewing' | 'applied' | 'interview'
  | 'offer' | 'rejected' | 'ghosted' | 'saved' | 'archived'

const statusClasses: Record<JobStatus, string> = {
  new: 'bg-blue-500/10 text-blue-400',
  reviewing: 'bg-yellow-500/10 text-yellow-400',
  applied: 'bg-purple-500/10 text-purple-400',
  interview: 'bg-emerald-500/10 text-emerald-400',
  offer: 'bg-green-500/10 text-green-400',
  rejected: 'bg-red-500/10 text-red-400',
  ghosted: 'bg-zinc-500/10 text-zinc-400',
  saved: 'bg-blue-500/10 text-blue-300',
  archived: 'bg-zinc-700/50 text-zinc-500',
}

const statusLabels: Record<JobStatus, string> = {
  new: 'New',
  reviewing: 'Reviewing',
  applied: 'Applied',
  interview: 'Interview',
  offer: 'Offer',
  rejected: 'Rejected',
  ghosted: 'Ghosted',
  saved: 'Saved',
  archived: 'Archived',
}

interface BadgeProps {
  status: JobStatus
  className?: string
}

export function Badge({ status, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
        statusClasses[status],
        className
      )}
    >
      {statusLabels[status]}
    </span>
  )
}
