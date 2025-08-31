import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, Scale } from "lucide-react"
import Link from "next/link"

export default function AuthCallbackPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo and branding */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Scale className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">LegalTech AI</h1>
          </div>
        </div>

        <Card className="shadow-lg border-0">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 bg-blue-100 p-3 rounded-full w-fit">
              <Loader2 className="h-6 w-6 text-blue-600 animate-spin" />
            </div>
            <CardTitle className="text-2xl font-semibold">Confirming your email</CardTitle>
            <CardDescription>
              Please wait while we verify your email address and sign you in.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-sm text-slate-600">
              You will be automatically redirected to your dashboard once verification is complete.
            </p>
            <Button asChild variant="outline" className="w-full bg-transparent">
              <Link href="/auth/login">Back to sign in</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
