import { ReactNode } from 'react'

interface PageWrapperProps {
  label: string
  title: string
  subtitle?: string
  action?: ReactNode
  children: ReactNode
}

export function PageWrapper({
  label,
  title,
  subtitle,
  action,
  children,
}: PageWrapperProps) {
  return (
    <div className="flex flex-col min-h-full">
      {/* Hero header */}
      <div className="px-6 pt-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-zinc-500 uppercase tracking-widest mb-1">
              {label}
            </p>
            <h1 className="text-2xl font-bold text-white">{title}</h1>
            {subtitle && (
              <p className="text-sm text-zinc-500 mt-1">{subtitle}</p>
            )}
          </div>
          {action && <div className="flex-shrink-0 mt-5">{action}</div>}
        </div>
        <hr className="border-zinc-800 mt-6" />
      </div>

      {/* Page content */}
      <div className="px-6 py-6 flex-1">{children}</div>
    </div>
  )
}
