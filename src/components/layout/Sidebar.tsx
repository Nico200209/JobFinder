'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Briefcase,
  KanbanSquare,
  Settings2,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/jobs', label: 'Jobs', icon: Briefcase },
  { href: '/board', label: 'Board', icon: KanbanSquare },
  { href: '/settings', label: 'Settings', icon: Settings2 },
] as const

const STORAGE_KEY = 'jobradar:sidebar-collapsed'

export function Sidebar() {
  const pathname = usePathname()
  const { signOut } = useAuth()
  const [collapsed, setCollapsed] = useState(false)

  // Restore collapse state from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored !== null) setCollapsed(stored === 'true')
  }, [])

  function toggleCollapse() {
    setCollapsed((prev) => {
      const next = !prev
      localStorage.setItem(STORAGE_KEY, String(next))
      return next
    })
  }

  return (
    <aside
      className={cn(
        'hidden lg:flex flex-col flex-shrink-0 h-screen bg-zinc-950 border-r border-zinc-800',
        'transition-all duration-200 ease-in-out',
        collapsed ? 'w-14' : 'w-[220px]'
      )}
    >
      {/* Header */}
      <div
        className={cn(
          'flex items-center gap-2.5 h-14 border-b border-zinc-800 flex-shrink-0',
          collapsed ? 'justify-center' : 'px-4'
        )}
      >
        <div className="w-6 h-6 bg-blue-500 rounded-md flex-shrink-0" />
        {!collapsed && (
          <span className="font-bold text-white text-sm">JobRadar</span>
        )}
      </div>

      {/* Nav links */}
      <nav className="flex-1 p-2 space-y-0.5 overflow-hidden">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className={cn(
                'flex items-center gap-3 px-2 py-2 rounded-lg text-sm transition-colors',
                collapsed && 'justify-center',
                active
                  ? 'bg-blue-500/10 text-blue-400 font-medium'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800'
              )}
            >
              <Icon size={18} className="flex-shrink-0" />
              {!collapsed && <span>{label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Collapse toggle */}
      <div className="p-2">
        <button
          onClick={toggleCollapse}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className={cn(
            'flex items-center justify-center w-full py-1.5 rounded-lg',
            'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors'
          )}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Footer */}
      <div
        className={cn(
          'flex items-center border-t border-zinc-800 p-3',
          collapsed ? 'justify-center' : 'gap-2'
        )}
      >
        {!collapsed && (
          <>
            <div className="w-7 h-7 bg-zinc-700 rounded-full flex items-center justify-center text-xs font-medium text-zinc-300 flex-shrink-0">
              NG
            </div>
            <span className="text-xs text-zinc-400 truncate flex-1">
              Nicolás García
            </span>
          </>
        )}
        <button
          onClick={signOut}
          title="Sign out"
          className="text-zinc-500 hover:text-zinc-300 transition-colors flex-shrink-0"
        >
          <LogOut size={15} />
        </button>
      </div>
    </aside>
  )
}
