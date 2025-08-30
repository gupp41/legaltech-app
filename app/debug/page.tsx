"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function DebugPage() {
  const [testResult, setTestResult] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)

  const testPDFLibrary = async () => {
    setIsLoading(true)
    setTestResult("Testing PDF library import...")
    
    try {
      console.log('Testing PDF library import...')
      
      // Test 1: Basic import
      const pdfjsLib = await import('pdfjs-dist')
      console.log('✅ PDF library imported successfully')
      console.log('Version:', pdfjsLib.version)
      
      // Test 2: Check if getDocument function exists
      if (typeof pdfjsLib.getDocument === 'function') {
        console.log('✅ getDocument function available')
      } else {
        console.log('❌ getDocument function not available')
      }
      
      // Test 3: Check if GlobalWorkerOptions exists
      if (pdfjsLib.GlobalWorkerOptions) {
        console.log('✅ GlobalWorkerOptions available')
        console.log('Current worker source:', pdfjsLib.GlobalWorkerOptions.workerSrc)
      } else {
        console.log('❌ GlobalWorkerOptions not available')
      }
      
      setTestResult(`PDF Library Test Results:
✅ Import successful
Version: ${pdfjsLib.version}
getDocument: ${typeof pdfjsLib.getDocument === 'function' ? 'Available' : 'Not available'}
GlobalWorkerOptions: ${pdfjsLib.GlobalWorkerOptions ? 'Available' : 'Not available'}
Worker Source: ${pdfjsLib.GlobalWorkerOptions?.workerSrc || 'Not set'}`)
      
    } catch (error) {
      console.error('PDF library test failed:', error)
      setTestResult(`PDF Library Test Failed:
Error: ${error instanceof Error ? error.message : 'Unknown error'}
Type: ${error instanceof Error ? error.name : typeof error}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">Debug Page</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>PDF Library Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={testPDFLibrary} 
            disabled={isLoading}
          >
            Test PDF Library Import
          </Button>
          
          {testResult && (
            <div className="mt-4">
              <h3 className="font-semibold mb-2">Test Result:</h3>
              <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
                {testResult}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Environment Info</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div><strong>User Agent:</strong> {typeof window !== 'undefined' ? navigator.userAgent : 'Server-side rendering'}</div>
            <div><strong>Platform:</strong> {typeof window !== 'undefined' ? navigator.platform : 'Server-side rendering'}</div>
            <div><strong>Language:</strong> {typeof window !== 'undefined' ? navigator.language : 'Server-side rendering'}</div>
            <div><strong>Online:</strong> {typeof window !== 'undefined' ? (navigator.onLine ? 'Yes' : 'No') : 'Server-side rendering'}</div>
            <div><strong>Window Size:</strong> {typeof window !== 'undefined' ? `${window.innerWidth} x ${window.innerHeight}` : 'Server-side rendering'}</div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
