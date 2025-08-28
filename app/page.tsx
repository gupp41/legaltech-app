import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Scale, FileText, Shield, Zap, Users, TrendingUp } from "lucide-react"
import Link from "next/link"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Scale className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">LegalTech AI</h1>
          </div>
          <div className="flex items-center gap-4">
            <Button asChild variant="ghost">
              <Link href="/auth/login">Sign in</Link>
            </Button>
            <Button asChild className="bg-blue-600 hover:bg-blue-700">
              <Link href="/auth/signup">Get started</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-5xl font-bold text-slate-900 mb-6">
            Automate Your Legal Workflows with <span className="text-blue-600">AI-Powered Analysis</span>
          </h1>
          <p className="text-xl text-slate-600 mb-8 leading-relaxed">
            Transform how you handle contracts, compliance checks, and legal research. Cut costs by 60% and improve
            processing speed by 10x with our intelligent automation platform.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Button asChild size="lg" className="bg-blue-600 hover:bg-blue-700 h-12 px-8">
              <Link href="/auth/signup">Start free trial</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="h-12 px-8 bg-transparent">
              <Link href="#features">Learn more</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="container mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-slate-900 mb-4">Powerful Features for Legal Professionals</h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
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
      <section className="bg-blue-600 text-white py-20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Transform Your Legal Practice?</h2>
          <p className="text-xl mb-8 text-blue-100">
            Join leading law firms and HR departments already saving time and reducing costs
          </p>
          <Button asChild size="lg" variant="secondary" className="h-12 px-8">
            <Link href="/auth/signup">Start your free trial</Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="bg-blue-600 p-2 rounded-lg">
                <Scale className="h-5 w-5 text-white" />
              </div>
              <span className="font-semibold">LegalTech AI</span>
            </div>
            <p className="text-slate-400">© 2024 LegalTech AI. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
