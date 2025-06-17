'use client'

import { useEffect, useState } from 'react'

export default function DebugInfo() {
  const [debugInfo, setDebugInfo] = useState<any>({})
  
  useEffect(() => {
    console.log('🔧 DebugInfo component mounted')
    
    const info = {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      pathname: window.location.pathname,
      environment: process.env.NODE_ENV,
      hasConsole: typeof console !== 'undefined',
      hasWindow: typeof window !== 'undefined',
      hasDocument: typeof document !== 'undefined'
    }
    
    console.log('🔧 Debug Info:', info)
    setDebugInfo(info)
  }, [])
  
  if (process.env.NODE_ENV !== 'development') {
    return null
  }
  
  return (
    <div className="fixed top-10 left-4 z-[9999] bg-red-500 text-white p-4 rounded-lg shadow-lg max-w-sm text-xs">
      <h3 className="font-bold mb-2">🔧 Debug Info</h3>
      <div className="space-y-1">
        <div>URL: {debugInfo.pathname}</div>
        <div>Time: {debugInfo.timestamp?.split('T')[1]?.split('.')[0]}</div>
        <div>Console: {debugInfo.hasConsole ? '✅' : '❌'}</div>
        <div>Window: {debugInfo.hasWindow ? '✅' : '❌'}</div>
        <div>Document: {debugInfo.hasDocument ? '✅' : '❌'}</div>
        <div className="mt-2 text-yellow-200">
          Check browser console for logs!
        </div>
      </div>
    </div>
  )
} 