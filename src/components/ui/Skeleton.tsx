import { cn } from '@/lib/utils'

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('bg-zinc-800 rounded animate-pulse', className)} />
}
