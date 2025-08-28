"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"

export default function DashboardTestPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader>
            <CardTitle>Dashboard Test Page</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-slate-600">
              If you can see this page, the dashboard route is accessible.
            </p>
            
            <div className="space-y-2">
              <Link href="/dashboard">
                <Button className="w-full">Go to Main Dashboard</Button>
              </Link>
              
              <Link href="/auth/test">
                <Button variant="outline" className="w-full">Back to Auth Test</Button>
              </Link>
            </div>
            
            <div className="bg-green-50 p-3 rounded">
              <p className="text-sm text-green-800">
                ✅ Dashboard route is working!
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
