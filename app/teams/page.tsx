'use client'

import React from 'react'
import { TeamProvider } from '@/lib/contexts/team-context'
import { TeamSelector } from '@/components/team/team-selector'
import { TeamDashboard } from '@/components/team/team-dashboard'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function TeamsPage() {
  return (
    <TeamProvider>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-4">
                <Link href="/dashboard">
                  <Button variant="ghost" size="sm">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Dashboard
                  </Button>
                </Link>
                <div className="h-6 w-px bg-gray-300" />
                <div className="flex items-center space-x-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  <h1 className="text-xl font-semibold text-gray-900">Team Collaboration</h1>
                </div>
              </div>
              
              <TeamSelector />
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <TeamDashboard />
        </div>
      </div>
    </TeamProvider>
  )
}
