import { cn } from '@/lib/utils'

interface ScoreBadgeProps {
  score: number | 'language_barrier'
  className?: string
}

function getScoreClasses(score: number | 'language_barrier'): string {
  if (score === 'language_barrier') return 'bg-zinc-500/10 text-zinc-500'
  if (score >= 0.85) return 'bg-emerald-400/10 text-emerald-400'
  if (score >= 0.6) return 'bg-yellow-400/10 text-yellow-400'
  return 'bg-red-400/10 text-red-400'
}

function formatScore(score: number | 'language_barrier'): string {
  if (score === 'language_barrier') return 'Lang ✗'
  return `${Math.round(score * 100)}%`
}

export function ScoreBadge({ score, className }: ScoreBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-mono',
        getScoreClasses(score),
        className
      )}
    >
      {formatScore(score)}
    </span>
  )
}
