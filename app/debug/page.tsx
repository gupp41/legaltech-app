"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"

export default function DebugPage() {
  const [sessionInfo, setSessionInfo] = useState<any>(null)
  const [cookies, setCookies] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkSession = async () => {
      const supabase = createClient()
      
      // Get session info
      const { data: { session } } = await supabase.auth.getSession()
      const { data: { user } } = await supabase.auth.getUser()
      
      // Get cookies
      const cookieList = document.cookie.split(';').map(c => c.trim())
      
      setSessionInfo({
        session: session ? {
          access_token: session.access_token ? 'Present' : 'Missing',
          refresh_token: session.refresh_token ? 'Present' : 'Missing',
          expires_at: session.expires_at ? new Date(session.expires_at * 1000).toLocaleString() : 'Missing'
        } : 'No session',
        user: user ? {
          id: user.id,
          email: user.email,
          email_confirmed: user.email_confirmed_at ? 'Yes' : 'No'
        } : 'No user'
      })
      
      setCookies(cookieList)
      setLoading(false)
    }

    checkSession()
  }, [])

  if (loading) {
    return <div className="p-8">Loading session info...</div>
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Session Debug Information</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Session State</h2>
          <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
            {JSON.stringify(sessionInfo, null, 2)}
          </pre>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Browser Cookies</h2>
          <div className="space-y-2">
            {cookies.map((cookie, index) => (
              <div key={index} className="bg-gray-100 p-2 rounded text-sm font-mono">
                {cookie}
              </div>
            ))}
          </div>
        </div>
      </div>
      
      <div className="mt-6 bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Actions</h2>
        <div className="space-x-4">
          <button 
            onClick={() => window.location.href = '/dashboard'}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Try Dashboard Access
          </button>
          <button 
            onClick={() => window.location.href = '/auth/login'}
            className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
          >
            Go to Login
          </button>
        </div>
      </div>
    </div>
  )
}
