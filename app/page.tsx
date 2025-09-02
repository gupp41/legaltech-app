'use client'

import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Scale, FileText, Shield, Zap, Users, TrendingUp, CheckCircle, AlertCircle } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"
import { createBrowserClient } from '@supabase/ssr'
import { ThemeToggle } from "@/components/theme-toggle"

export default function HomePage() {
  const [emailConfirmation, setEmailConfirmation] = useState<{
    status: 'idle' | 'loading' | 'success' | 'error'
    message: string
  }>({ status: 'idle', message: '' })

  useEffect(() => {
    const handleEmailConfirmation = async () => {
      const urlParams = new URLSearchParams(window.location.search)
      const code = urlParams.get('code')
      const codeVerifier = urlParams.get('code_verifier')
      const error = urlParams.get('error')
      const errorDescription = urlParams.get('error_description')

      console.log('Home page received params:', { code, codeVerifier, error, errorDescription })

      if (error) {
        setEmailConfirmation({
          status: 'error',
          message: errorDescription || 'Email confirmation failed'
        })
        return
      }

      if (code) {
        setEmailConfirmation({ status: 'loading', message: 'Processing magic link...' })

        try {
          const supabase = createBrowserClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
          )

          console.log('Attempting to authenticate with code:', code)
          console.log('Code verifier present:', !!codeVerifier)

          // First, check if user is already authenticated
          const { data: { session } } = await supabase.auth.getSession()
          if (session) {
            console.log('User already has session, redirecting to dashboard')
            setEmailConfirmation({
              status: 'success',
              message: 'Already authenticated! Redirecting to dashboard...'
            })
            setTimeout(() => {
              window.location.href = '/dashboard'
            }, 1000)
            return
          }

          let result
          try {
            // Try to exchange the code for a session
            result = await supabase.auth.exchangeCodeForSession(code)
            console.log('Exchange result:', result)
          } catch (exchangeError) {
            console.error('Exchange failed:', exchangeError)
            
            // If exchange fails, try to redirect to dashboard anyway
            // The user might already be authenticated through the magic link
            console.log('Attempting to redirect to dashboard...')
            window.location.href = '/dashboard'
            return
          }

          const { error } = result

          if (error) {
            console.error('Authentication error:', error)
            setEmailConfirmation({
              status: 'error',
              message: error.message || 'Failed to authenticate'
            })
          } else {
            setEmailConfirmation({
              status: 'success',
              message: 'Successfully authenticated! Redirecting to dashboard...'
            })
            
            // Clean up the URL and redirect to dashboard
            window.history.replaceState({}, document.title, window.location.pathname)
            setTimeout(() => {
              window.location.href = '/dashboard'
            }, 2000)
          }
        } catch (err) {
          console.error('Authentication error:', err)
          setEmailConfirmation({
            status: 'error',
            message: 'An unexpected error occurred'
          })
        }
      } else {
        // No code present, but let's check if user is already authenticated
        const checkAuth = async () => {
          try {
            const supabase = createBrowserClient(
              process.env.NEXT_PUBLIC_SUPABASE_URL!,
              process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
            )
            
            const { data: { session } } = await supabase.auth.getSession()
            if (session) {
              console.log('User is authenticated, redirecting to dashboard')
              window.location.href = '/dashboard'
            }
          } catch (err) {
            console.log('No active session found')
          }
        }
        
        checkAuth()
      }
    }

    handleEmailConfirmation()
  }, [])

  // Show email confirmation status if processing
  if (emailConfirmation.status !== 'idle') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="bg-blue-600 p-2 rounded-lg">
                <Scale className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-foreground">LegalTech AI</h1>
            </div>
          </div>

          <Card className="shadow-lg border-0">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 bg-blue-100 p-3 rounded-full w-fit">
                {emailConfirmation.status === 'loading' && (
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                )}
                {emailConfirmation.status === 'success' && (
                  <CheckCircle className="h-6 w-6 text-green-600" />
                )}
                {emailConfirmation.status === 'error' && (
                  <AlertCircle className="h-6 w-6 text-red-600" />
                )}
              </div>
              <CardTitle className="text-2xl font-semibold">
                {emailConfirmation.status === 'loading' && 'Confirming Email'}
                {emailConfirmation.status === 'success' && 'Email Confirmed!'}
                {emailConfirmation.status === 'error' && 'Confirmation Failed'}
              </CardTitle>
              <CardDescription>
                {emailConfirmation.message}
              </CardDescription>
            </CardHeader>
            <CardHeader className="text-center">
              <Button asChild className="w-full bg-blue-600 hover:bg-blue-700">
                <Link href="/auth/login">Continue to Sign In</Link>
              </Button>
            </CardHeader>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Scale className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-xl font-bold text-foreground">LegalTech AI</h1>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <ThemeToggle />
            <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
              <Link href="/auth/login">Sign in</Link>
            </Button>
            <Button asChild className="bg-blue-600 hover:bg-blue-700 text-white text-sm sm:text-base px-3 sm:px-4">
              <Link href="/auth/signup">Get started</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-12 sm:py-20 text-center">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-6 leading-tight">
            Automate Your Legal Workflows with <span className="text-blue-600">AI-Powered Analysis</span>
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground mb-8 leading-relaxed">
            Transform how you handle contracts, compliance checks, and legal research. Cut costs by 60% and improve
            processing speed by 10x with our intelligent automation platform.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button asChild size="lg" className="bg-blue-600 hover:bg-blue-700 text-white h-12 px-6 sm:px-8 w-full sm:w-auto">
              <Link href="/auth/signup">Start free trial</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="h-12 px-6 sm:px-8 bg-transparent w-full sm:w-auto">
              <Link href="#features">Learn more</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="container mx-auto px-4 py-12 sm:py-20">
        <div className="text-center mb-12 sm:mb-16">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">Powerful Features for Legal Professionals</h2>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
            Everything you need to streamline legal processes and make data-driven decisions
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <div className="bg-blue-100 p-3 rounded-lg w-fit mb-4">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
              <CardTitle>Contract Analysis</CardTitle>
              <CardDescription>
                AI-powered contract review identifying risks, obligations, and key terms in seconds
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader>
              <div className="bg-green-100 p-3 rounded-lg w-fit mb-4">
                <Shield className="h-6 w-6 text-green-600" />
              </div>
              <CardTitle>Compliance Checks</CardTitle>
              <CardDescription>
                Automated compliance verification against industry regulations and standards
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader>
              <div className="bg-purple-100 p-3 rounded-lg w-fit mb-4">
                <Zap className="h-6 w-6 text-purple-600" />
              </div>
              <CardTitle>Legal Research</CardTitle>
              <CardDescription>
                Intelligent research assistant that finds relevant cases, statutes, and precedents
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader>
              <div className="bg-orange-100 p-3 rounded-lg w-fit mb-4">
                <Users className="h-6 w-6 text-orange-600" />
              </div>
              <CardTitle>Team Collaboration</CardTitle>
              <CardDescription>
                Secure document sharing and collaborative review workflows for legal teams
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader>
              <div className="bg-red-100 p-3 rounded-lg w-fit mb-4">
                <TrendingUp className="h-6 w-6 text-red-600" />
              </div>
              <CardTitle>Analytics Dashboard</CardTitle>
              <CardDescription>
                Comprehensive insights and reporting on legal document processing and risks
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader>
              <div className="bg-teal-100 p-3 rounded-lg w-fit mb-4">
                <Shield className="h-6 w-6 text-teal-600" />
              </div>
              <CardTitle>Enterprise Security</CardTitle>
              <CardDescription>Bank-grade encryption, SOC 2 compliance, and advanced access controls</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-blue-600 text-white py-12 sm:py-20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4">Ready to Transform Your Legal Practice?</h2>
          <p className="text-lg sm:text-xl mb-8 text-blue-100">
            Join leading law firms and HR departments already saving time and reducing costs
          </p>
          <Button asChild size="lg" className="h-12 px-6 sm:px-8 bg-white text-blue-600 hover:bg-gray-100 hover:text-blue-700 border-0 shadow-lg">
            <Link href="/auth/signup">Start your free trial</Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-8 sm:py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="bg-blue-600 p-2 rounded-lg">
                <Scale className="h-5 w-5 text-white" />
              </div>
              <span className="font-semibold">LegalTech AI</span>
            </div>
            <p className="text-muted-foreground text-sm sm:text-base">© 2025 LegalTech AI. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
