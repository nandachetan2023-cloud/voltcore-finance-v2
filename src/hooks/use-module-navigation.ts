'use client'

import { useEffect, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useERPStore, type ModuleId } from '@/store/erp-store'

export function useModuleNavigation() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const activeModule = useERPStore(s => s.activeModule)
  const setActiveModule = useERPStore(s => s.setActiveModule)
  const syncingRef = useRef(false)

  // On mount: initialize from URL if a module param is present
  useEffect(() => {
    const m = searchParams.get('module')
    if (m && m !== 'dashboard') {
      syncingRef.current = true
      setActiveModule(m as ModuleId)
      // Let the next render settle before allowing URL pushes
      requestAnimationFrame(() => { syncingRef.current = false })
    }
  }, [])

  // Follow URL changes from back/forward: store → URL
  useEffect(() => {
    if (syncingRef.current) return
    const m = searchParams.get('module') || 'dashboard'
    if (m !== activeModule) {
      syncingRef.current = true
      setActiveModule(m as ModuleId)
      requestAnimationFrame(() => { syncingRef.current = false })
    }
  }, [searchParams])

  // Push store changes to URL: user clicks → URL updates
  const prevRef = useRef(activeModule)
  useEffect(() => {
    if (syncingRef.current) return
    if (prevRef.current !== activeModule) {
      const urlModule = searchParams.get('module') || 'dashboard'
      if (activeModule !== urlModule) {
        router.push(`/?module=${activeModule}`, { scroll: false })
      }
      prevRef.current = activeModule
    }
  })
}
