"use client"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useState, useEffect } from "react"

export default function AuthTestPage() {
  const [user, setUser] = useState<any>(null)
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      console.log('=== AUTH TEST PAGE ===')
      
      // Check current user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      console.log('Current user:', user)
      console.log('User error:', userError)
      setUser(user)
      
      // Check current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      console.log('Current session:', session)
      console.log('Session error:', sessionError)
      setSession(session)
      
      // Listen for auth changes
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        console.log('Auth state change:', event, session)
        setUser(session?.user ?? null)
        setSession(session)
      })
      
      setLoading(false)
      
      return () => subscription.unsubscribe()
    } catch (error) {
      console.error('Auth test error:', error)
      setLoading(false)
    }
  }

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error('Sign out error:', error)
      } else {
        console.log('Signed out successfully')
        setUser(null)
        setSession(null)
      }
    } catch (error) {
      console.error('Sign out exception:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-slate-600">Loading auth test...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Authentication Test Page</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="font-semibold mb-2">User Status</h3>
                <div className="bg-slate-100 p-3 rounded">
                  <p><strong>Authenticated:</strong> {user ? 'Yes' : 'No'}</p>
                  <p><strong>Email:</strong> {user?.email || 'None'}</p>
                  <p><strong>ID:</strong> {user?.id || 'None'}</p>
                  <p><strong>Email Confirmed:</strong> {user?.email_confirmed_at ? 'Yes' : 'No'}</p>
                </div>
              </div>
              
              <div>
                <h3 className="font-semibold mb-2">Session Status</h3>
                <div className="bg-slate-100 p-3 rounded">
                  <p><strong>Active Session:</strong> {session ? 'Yes' : 'No'}</p>
                  <p><strong>Access Token:</strong> {session?.access_token ? 'Present' : 'None'}</p>
                  <p><strong>Expires:</strong> {session?.expires_at ? new Date(session.expires_at).toLocaleString() : 'None'}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-blue-50 p-3 rounded">
              <p className="text-sm text-blue-800">
                <strong>Debug Info:</strong> Check the browser console for detailed authentication logs.
              </p>
            </div>
            
            <div className="flex gap-2">
              <Button onClick={checkAuth} variant="outline">
                Refresh Auth Status
              </Button>
              
              {user && (
                <Button onClick={signOut} variant="destructive">
                  Sign Out
                </Button>
              )}
              
              <Button onClick={() => window.location.href = '/dashboard'} variant="default">
                Go to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
