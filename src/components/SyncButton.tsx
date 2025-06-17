'use client'

import { useState } from 'react'
import { RefreshCw } from 'lucide-react'

export default function SyncButton() {
  const [isSyncing, setIsSyncing] = useState(false)
  const [message, setMessage] = useState('')

  const handleSync = async () => {
    setIsSyncing(true)
    setMessage('')

    try {
      const response = await fetch('/api/sync-activities', {
        method: 'POST',
      })

      const data = await response.json()

      if (response.ok) {
        setMessage(`Successfully synced ${data.count} activities!`)
        // Refresh the page to show new data
        window.location.reload()
      } else {
        setMessage(data.error || 'Failed to sync activities')
      }
    } catch (error) {
      setMessage('Error syncing activities')
    } finally {
      setIsSyncing(false)
    }
  }

  return (
    <div className="flex flex-col items-end space-y-2">
      <button
        onClick={handleSync}
        disabled={isSyncing}
        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <RefreshCw 
          className={`w-4 h-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} 
        />
        {isSyncing ? 'Syncing...' : 'Sync Activities'}
      </button>
      
      {message && (
        <p className={`text-sm ${
          message.includes('Successfully') ? 'text-green-600' : 'text-red-600'
        }`}>
          {message}
        </p>
      )}
    </div>
  )
} 