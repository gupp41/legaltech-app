"use client"

import { useState, useEffect } from "react"
import { createBrowserClient } from "@supabase/ssr"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import { 
  User, 
  CreditCard, 
  Settings, 
  Shield, 
  BarChart3, 
  Crown,
  Star,
  Zap,
  Check,
  X,
  AlertCircle,
  Info,
  Download,
  Bell,
  Palette,
  Globe,
  ArrowLeft
} from "lucide-react"
import { UsageDisplay } from "@/components/usage-display"
import { ThemeToggle } from "@/components/theme-toggle"

interface User {
  id: string
  email: string
  current_plan: string
  plan_start_date: string
  plan_end_date?: string
}

interface Subscription {
  id: string
  plan_type: string
  status: string
  start_date: string
  end_date?: string
  stripe_subscription_id?: string
}

interface UsageData {
  documents_uploaded: number
  analyses_performed: number
  storage_used_bytes: number
  text_extractions: number
}

const PLAN_LIMITS = {
  free: {
    documents: 5,
    analyses: 20,
    storage: 100 * 1024 * 1024, // 100 MB
    extractions: 5
  },
  plus: {
    documents: 50,
    analyses: 200,
    storage: 2 * 1024 * 1024 * 1024, // 2 GB
    extractions: 50
  },
  max: {
    documents: -1, // unlimited
    analyses: -1, // unlimited
    storage: 50 * 1024 * 1024 * 1024, // 50 GB
    extractions: -1 // unlimited
  }
}

// Fallback plan features if database query fails
const getDefaultPlanFeatures = (planType: string) => {
  const defaultFeatures = {
    free: [
      "Basic document management",
      "Standard AI analysis quality",
      "Email support (48-hour response)",
      "Basic export options",
      "User dashboard",
      "Document history"
    ],
    plus: [
      "Everything in Free, plus:",
      "Advanced document organization",
      "Priority AI analysis",
      "Enhanced export options",
      "Email support (24-hour response)",
      "Basic analytics dashboard",
      "Team collaboration (up to 3 users)",
      "Document templates",
      "Advanced search and filtering"
    ],
    max: [
      "Everything in Plus, plus:",
      "Unlimited everything",
      "Priority processing",
      "Advanced analytics and reporting",
      "Team management (up to 10 users)",
      "API access for integrations",
      "Custom branding options",
      "Phone + email support (4-hour response)",
      "Bulk operations",
      "Advanced security features",
      "Compliance reporting",
      "Custom workflows",
      "White-label options"
    ]
  }
  
  return defaultFeatures[planType as keyof typeof defaultFeatures] || []
}

export default function SettingsPage() {
  const [user, setUser] = useState<User | null>(null)
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [usage, setUsage] = useState<UsageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("account")
  const [planFeatures, setPlanFeatures] = useState<{[key: string]: string[]}>({})
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState('')
  const [plusInterval, setPlusInterval] = useState<'monthly' | 'yearly'>('monthly')
  const [maxInterval, setMaxInterval] = useState<'monthly' | 'yearly'>('monthly')
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  // Helper function to get plan features from database
  const getPlanFeatures = async (planType: string) => {
    try {
      const { data, error } = await supabase
        .from('plan_details')
        .select('features')
        .eq('plan_type', planType)
        .single()
      
      if (error || !data) {
        console.error('Error fetching plan features:', error)
        return getDefaultPlanFeatures(planType)
      }
      
      return data.features || []
    } catch (error) {
      console.error('Error in getPlanFeatures:', error)
      return getDefaultPlanFeatures(planType)
    }
  }

  useEffect(() => {
    console.log('🔍 Settings Debug - useEffect triggered, calling checkUser')
    checkUser()
  }, [])

  useEffect(() => {
    if (user?.id) {
      fetchUserData()
    }
  }, [user?.id])



  // Load plan features from database
  const loadPlanFeatures = async () => {
    try {
      const { data, error } = await supabase
        .from('plan_details')
        .select('plan_type, features')
        .in('plan_type', ['free', 'plus', 'max'])
      
      if (error) {
        console.error('Error loading plan features:', error)
        return
      }
      
      const featuresMap: {[key: string]: string[]} = {}
      data.forEach(plan => {
        featuresMap[plan.plan_type] = plan.features || []
      })
      
      setPlanFeatures(featuresMap)
    } catch (error) {
      console.error('Error in loadPlanFeatures:', error)
    }
  }

  // Load plan features on component mount
  useEffect(() => {
    loadPlanFeatures()
  }, [])

  // Check for successful payment and refresh data
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get('success') === 'true') {
      // Refresh user data after successful payment
      setTimeout(() => {
        checkUser()
        fetchUserData()
      }, 1000)
    }
  }, [])

  // Helper functions for pricing
  const getPlusPrice = () => {
    return plusInterval === 'monthly' ? '$29/month' : '$290/year'
  }

  const getPlusSavings = () => {
    return plusInterval === 'monthly' ? 'Save 17% with annual billing' : 'Billed annually'
  }

  const getMaxPrice = () => {
    return maxInterval === 'monthly' ? '$99/month' : '$990/year'
  }

  const getMaxSavings = () => {
    return maxInterval === 'monthly' ? 'Save 17% with annual billing' : 'Billed annually'
  }

  const handleRefreshData = async () => {
    setRefreshing(true)
    try {
      await checkUser()
      await fetchUserData()
    } finally {
      setRefreshing(false)
    }
  }

  const checkUser = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (authUser) {
        // Try to get subscription data from the subscriptions table first
        const { data: subscriptionData, error: subscriptionError } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', authUser.id)
          .eq('status', 'active')
          .single()

        if (subscriptionData && !subscriptionError) {
          // Use subscription data (source of truth)
          setUser({
            id: authUser.id,
            email: authUser.email || '',
            current_plan: subscriptionData.plan_type,
            plan_start_date: subscriptionData.start_date || new Date().toISOString(),
            plan_end_date: subscriptionData.end_date || undefined
          })
        } else {
          // Fallback to profiles table if no subscription found
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('current_plan, plan_start_date, plan_end_date')
            .eq('id', authUser.id)
            .single()

          setUser({
            id: authUser.id,
            email: authUser.email || '',
            current_plan: profileData?.current_plan || 'free',
            plan_start_date: profileData?.plan_start_date || new Date().toISOString(),
            plan_end_date: profileData?.plan_end_date || undefined
          })
        }
        
        // Set loading to false since we have user data
        setLoading(false)
      } else {
        setLoading(false)
      }
    } catch (error) {
      console.error('Error in checkUser:', error)
      setLoading(false)
    }
  }

  const fetchUserData = async () => {
    if (!user?.id) return

    try {
      setLoading(true)
      
      // Fetch user subscription data from the subscriptions table
      const { data: subData, error: subError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single()

      if (!subError && subData) {
        setSubscription(subData)
        console.log('🔍 Found subscription data:', subData)
      } else {
        console.log('🔍 No subscription data found:', subError?.message)
        setSubscription(null)
      }

      // Fetch usage data
      const currentMonth = new Date().toISOString().slice(0, 7) // YYYY-MM format
      const { data: usageData, error: usageError } = await supabase
        .from('usage_tracking')
        .select('*')
        .eq('user_id', user.id)
        .eq('month_year', currentMonth)
        .single()

      if (!usageError && usageData) {
        setUsage(usageData)
      }

    } catch (error) {
      console.error('Error fetching user data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getPlanIcon = (plan: string) => {
    switch (plan) {
      case 'free':
        return <Shield className="h-5 w-5" />
      case 'plus':
        return <Star className="h-5 w-5" />
      case 'max':
        return <Crown className="h-5 w-5" />
      default:
        return <Shield className="h-5 w-5" />
    }
  }

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case 'free':
        return 'bg-muted text-muted-foreground'
      case 'plus':
        return 'bg-blue-100 text-blue-800'
      case 'max':
        return 'bg-purple-100 text-purple-800'
      default:
        return 'bg-muted text-muted-foreground'
    }
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getUsagePercentage = (current: number, limit: number) => {
    if (limit === -1) return 0 // unlimited
    return Math.min((current / limit) * 100, 100)
  }

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500'
    if (percentage >= 80) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  const handleUpgrade = async (plan: string, interval: 'monthly' | 'yearly' = 'monthly') => {
    try {
      console.log(`Upgrading to ${plan} plan (${interval})`)
      
      if (!user?.id || !user?.email) {
        alert('Please log in to upgrade your plan')
        return
      }
      
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          plan,
          interval,
          userEmail: user.email,
          userId: user.id,
          successUrl: `${window.location.origin}/settings?success=true`,
          cancelUrl: `${window.location.origin}/settings?canceled=true`,
        }),
      })

      const { url, error } = await response.json()

      if (error) {
        throw new Error(error)
      }

      if (url) {
        window.location.href = url
      }
    } catch (error) {
      console.error('Error creating checkout session:', error)
      alert(`Error upgrading to ${plan} plan: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handleDowngrade = async (plan: string) => {
    // TODO: Implement plan downgrade
    console.log(`Downgrading to ${plan} plan`)
    alert(`Downgrade to ${plan} plan - Coming soon!`)
  }

  const handlePasswordChange = async () => {
    try {
      setPasswordLoading(true)
      setPasswordError('')
      setPasswordSuccess('')

      // Validate passwords
      if (passwordData.newPassword !== passwordData.confirmPassword) {
        setPasswordError('New passwords do not match')
        return
      }

      if (passwordData.newPassword.length < 6) {
        setPasswordError('New password must be at least 6 characters long')
        return
      }

      // Update password using Supabase
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      })

      if (error) {
        setPasswordError(error.message)
        return
      }

      setPasswordSuccess('Password updated successfully!')
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      })
      
      // Close modal after 2 seconds
      setTimeout(() => {
        setShowPasswordModal(false)
        setPasswordSuccess('')
      }, 2000)

    } catch (error) {
      setPasswordError('An unexpected error occurred')
      console.error('Password change error:', error)
    } finally {
      setPasswordLoading(false)
    }
  }

  const handleDeleteAccount = async () => {
    try {
      setDeleteLoading(true)
      
      if (!user?.id) {
        console.error('No user ID available')
        return
      }

      console.log('Starting account deletion process for user:', user.id)

      // Delete user data from all tables
      const tables = ['analyses', 'text_extractions', 'documents', 'usage_tracking', 'subscriptions']
      
      for (const table of tables) {
        try {
          const { error } = await supabase
            .from(table)
            .delete()
            .eq('user_id', user.id)
          
          if (error) {
            console.error(`Error deleting from ${table}:`, error)
          } else {
            console.log(`Successfully deleted data from ${table}`)
          }
        } catch (error) {
          console.error(`Exception deleting from ${table}:`, error)
        }
      }

      // Delete user account from Supabase auth
      try {
        const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id)
        
        if (deleteError) {
          console.error('Error deleting user account:', deleteError)
          // Fallback: sign out the user
          await supabase.auth.signOut()
          window.location.href = '/auth/login'
        } else {
          console.log('Successfully deleted user account')
          window.location.href = '/auth/login'
        }
      } catch (error) {
        console.error('Exception during account deletion:', error)
        // Fallback: sign out the user
        await supabase.auth.signOut()
        window.location.href = '/auth/login'
      }

    } catch (error) {
      console.error('Unexpected error during account deletion:', error)
    } finally {
      setDeleteLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground">Please log in to access settings</h1>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.location.href = '/dashboard'}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
          <ThemeToggle />
        </div>
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-2">Manage your account, subscription, and preferences</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 sm:grid-cols-5 gap-1">
          <TabsTrigger value="account" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
            <User className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Account</span>
            <span className="sm:hidden">Account</span>
          </TabsTrigger>
          <TabsTrigger value="subscription" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
            <Crown className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Subscription</span>
            <span className="sm:hidden">Plan</span>
          </TabsTrigger>
          <TabsTrigger value="usage" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
            <BarChart3 className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Usage</span>
            <span className="sm:hidden">Usage</span>
          </TabsTrigger>
          <TabsTrigger value="billing" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
            <CreditCard className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Billing</span>
            <span className="sm:hidden">Billing</span>
          </TabsTrigger>
          <TabsTrigger value="preferences" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
            <Settings className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Preferences</span>
            <span className="sm:hidden">Settings</span>
          </TabsTrigger>
        </TabsList>

        {/* Account Tab */}
        <TabsContent value="account" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Account Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground">Email</label>
                  <p className="text-foreground mt-1">{user.email}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">Current Plan</label>
                  <div className="flex items-center gap-2 mt-1">
                    {getPlanIcon(user.current_plan)}
                    <Badge className={getPlanColor(user.current_plan)}>
                      {user.current_plan.charAt(0).toUpperCase() + user.current_plan.slice(1)}
                    </Badge>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">Plan Start Date</label>
                  <p className="text-foreground mt-1">
                    {new Date(user.plan_start_date).toLocaleDateString()}
                  </p>
                </div>
                {user.plan_end_date && (
                  <div>
                    <label className="text-sm font-medium text-foreground">Plan End Date</label>
                    <p className="text-foreground mt-1">
                      {new Date(user.plan_end_date).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>
              
              <Separator />
              
                            <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPasswordModal(true)}
                  className="w-full sm:w-auto"
                >
                  Change Password
                </Button>
                <Button variant="outline" size="sm" className="w-full sm:w-auto">
                  Export Data
                </Button>
                <Button 
                  variant="destructive" 
                  size="sm" 
                  onClick={() => setShowDeleteModal(true)}
                  disabled={deleteLoading}
                  className="w-full sm:w-auto"
                >
                  {deleteLoading ? 'Deleting...' : 'Delete Account'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Subscription Tab */}
        <TabsContent value="subscription" className="space-y-6">
          {/* Current Plan Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Crown className="h-5 w-5" />
                  Current Plan
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleRefreshData}
                  disabled={refreshing}
                >
                  {refreshing ? 'Refreshing...' : 'Refresh'}
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg border">
                <div className="flex items-center gap-4">
                  {getPlanIcon(user.current_plan)}
                  <div>
                    <h3 className="text-xl font-semibold text-foreground">
                      {user.current_plan.charAt(0).toUpperCase() + user.current_plan.slice(1)} Plan
                    </h3>

                    <p className="text-muted-foreground">
                      {subscription?.stripe_subscription_id ? 'Active Subscription' : 'Free Plan'}
                    </p>
                  </div>
                </div>
                                   <Badge className={getPlanColor(user.current_plan)}>
                     {user.current_plan.charAt(0).toUpperCase() + user.current_plan.slice(1)}
                   </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Plan Comparison */}
          <Card>
            <CardHeader>
              <CardTitle>Plan Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Free Plan */}
                <div className="border rounded-lg p-6 text-center bg-card">
                  <div className="flex justify-center mb-4">
                    <Shield className="h-12 w-12 text-muted-foreground" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2 text-foreground">Free</h3>
                  <p className="text-3xl font-bold mb-4">$0<span className="text-sm text-muted-foreground">/month</span></p>
                  <ul className="text-left space-y-2 mb-6">
                    {(planFeatures.free || getDefaultPlanFeatures('free')).map((feature, index) => (
                      <li key={index} className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    disabled={user.current_plan === 'free'}
                  >
                    {user.current_plan === 'free' ? 'Current Plan' : 'Select Free'}
                  </Button>
                </div>

                                 {/* Plus Plan */}
                 <div className="border rounded-lg p-6 text-center bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                   <div className="flex justify-center mb-4">
                     <Star className="h-12 w-12 text-blue-600" />
                   </div>
                   <h3 className="text-xl font-semibold mb-2 text-foreground">Plus</h3>
                   <div className="mb-4">
                     <div className="flex items-center justify-center gap-4 mb-2">
                       <label className="flex items-center gap-2">
                         <input
                           type="radio"
                           name="plus-interval"
                           value="monthly"
                           checked={plusInterval === 'monthly'}
                           onChange={(e) => setPlusInterval(e.target.value as 'monthly' | 'yearly')}
                           className="text-blue-600"
                         />
                         <span className="text-sm">Monthly</span>
                       </label>
                       <label className="flex items-center gap-2">
                         <input
                           type="radio"
                           name="plus-interval"
                           value="yearly"
                           checked={plusInterval === 'yearly'}
                           onChange={(e) => setPlusInterval(e.target.value as 'monthly' | 'yearly')}
                           className="text-blue-600"
                         />
                         <span className="text-sm">Yearly</span>
                       </label>
                     </div>
                     <p className="text-3xl font-bold">{getPlusPrice()}</p>
                     <p className="text-sm text-blue-600">{getPlusSavings()}</p>
                   </div>
                   <ul className="text-left space-y-2 mb-6">
                     {(planFeatures.plus || getDefaultPlanFeatures('plus')).map((feature, index) => (
                       <li key={index} className="flex items-center gap-2 text-sm">
                         <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                         {feature}
                       </li>
                     ))}
                   </ul>
                   <Button 
                     className="w-full bg-blue-600 hover:bg-blue-700"
                     onClick={() => handleUpgrade('plus', plusInterval)}
                     disabled={user.current_plan === 'plus'}
                   >
                     {user.current_plan === 'plus' ? 'Current Plan' : 'Upgrade to Plus'}
                   </Button>
                 </div>

                                 {/* Max Plan */}
                 <div className="border rounded-lg p-6 text-center bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800">
                   <div className="flex justify-center mb-4">
                     <Crown className="h-12 w-12 text-purple-600" />
                   </div>
                   <h3 className="text-xl font-semibold mb-2 text-foreground">Max</h3>
                   <div className="mb-4">
                     <div className="flex items-center justify-center gap-4 mb-2">
                       <label className="flex items-center gap-2">
                         <input
                           type="radio"
                           name="max-interval"
                           value="monthly"
                           checked={maxInterval === 'monthly'}
                           onChange={(e) => setMaxInterval(e.target.value as 'monthly' | 'yearly')}
                           className="text-purple-600"
                         />
                         <span className="text-sm">Monthly</span>
                       </label>
                       <label className="flex items-center gap-2">
                         <input
                           type="radio"
                           name="max-interval"
                           value="yearly"
                           checked={maxInterval === 'yearly'}
                           onChange={(e) => setMaxInterval(e.target.value as 'monthly' | 'yearly')}
                           className="text-purple-600"
                         />
                         <span className="text-sm">Yearly</span>
                       </label>
                     </div>
                     <p className="text-3xl font-bold">{getMaxPrice()}</p>
                     <p className="text-sm text-purple-600">{getMaxSavings()}</p>
                   </div>
                   <ul className="text-left space-y-2 mb-6">
                     {(planFeatures.max || getDefaultPlanFeatures('max')).map((feature, index) => (
                       <li key={index} className="flex items-center gap-2 text-sm">
                         <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                         {feature}
                       </li>
                     ))}
                   </ul>
                   <Button 
                     className="w-full bg-purple-600 hover:bg-purple-700"
                     onClick={() => handleUpgrade('max', maxInterval)}
                     disabled={user.current_plan === 'max'}
                   >
                     {user.current_plan === 'max' ? 'Current Plan' : 'Upgrade to Max'}
                   </Button>
                 </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Usage Tab */}
        <TabsContent value="usage" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Current Month Usage
              </CardTitle>
            </CardHeader>
            <CardContent>
              <UsageDisplay userId={user.id} />
              
              <Separator className="my-6" />
              
              {/* Detailed Usage Breakdown */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Usage Breakdown</h3>
                
                {/* Documents */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Documents Uploaded</span>
                    <span className="font-medium">
                      {usage?.documents_uploaded || 0} / {PLAN_LIMITS[user.current_plan as keyof typeof PLAN_LIMITS].documents === -1 ? '∞' : PLAN_LIMITS[user.current_plan as keyof typeof PLAN_LIMITS].documents}
                    </span>
                  </div>
                  <Progress 
                    value={getUsagePercentage(usage?.documents_uploaded || 0, PLAN_LIMITS[user.current_plan as keyof typeof PLAN_LIMITS].documents)} 
                    className="h-2"
                  />
                </div>

                {/* Analyses */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>AI Analyses</span>
                    <span className="font-medium">
                      {usage?.analyses_performed || 0} / {PLAN_LIMITS[user.current_plan as keyof typeof PLAN_LIMITS].analyses === -1 ? '∞' : PLAN_LIMITS[user.current_plan as keyof typeof PLAN_LIMITS].analyses}
                    </span>
                  </div>
                  <Progress 
                    value={getUsagePercentage(usage?.analyses_performed || 0, PLAN_LIMITS[user.current_plan as keyof typeof PLAN_LIMITS].analyses)} 
                    className="h-2"
                  />
                </div>

                {/* Storage */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Storage Used</span>
                    <span className="font-medium">
                      {formatBytes(usage?.storage_used_bytes || 0)} / {PLAN_LIMITS[user.current_plan as keyof typeof PLAN_LIMITS].storage === -1 ? '∞' : formatBytes(PLAN_LIMITS[user.current_plan as keyof typeof PLAN_LIMITS].storage)}
                    </span>
                  </div>
                  <Progress 
                    value={getUsagePercentage(usage?.storage_used_bytes || 0, PLAN_LIMITS[user.current_plan as keyof typeof PLAN_LIMITS].storage)} 
                    className="h-2"
                  />
                </div>

                {/* Text Extractions */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Text Extractions</span>
                    <span className="font-medium">
                      {usage?.text_extractions || 0} / {PLAN_LIMITS[user.current_plan as keyof typeof PLAN_LIMITS].extractions === -1 ? '∞' : PLAN_LIMITS[user.current_plan as keyof typeof PLAN_LIMITS].extractions}
                    </span>
                  </div>
                  <Progress 
                    value={getUsagePercentage(usage?.text_extractions || 0, PLAN_LIMITS[user.current_plan as keyof typeof PLAN_LIMITS].extractions)} 
                    className="h-2"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Billing Tab */}
        <TabsContent value="billing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Billing Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {subscription?.stripe_subscription_id ? (
                <div className="space-y-4">
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Check className="h-5 w-5 text-green-600" />
                      <span className="text-green-800 font-medium">Active Stripe Subscription</span>
                    </div>
                    <p className="text-green-700 text-sm mt-1">
                      Subscription ID: {subscription.stripe_subscription_id}
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Plan Type</label>
                      <p className="text-gray-900 mt-1 capitalize">{subscription.plan_type}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Status</label>
                      <p className="text-gray-900 mt-1 capitalize">{subscription.status}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Start Date</label>
                      <p className="text-gray-900 mt-1">
                        {new Date(subscription.start_date).toLocaleDateString()}
                      </p>
                    </div>
                    {subscription.end_date && (
                      <div>
                        <label className="text-sm font-medium text-gray-700">End Date</label>
                        <p className="text-gray-900 mt-1">
                          {new Date(subscription.end_date).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                  </div>
                  
                  <Separator />
                  
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      Update Payment Method
                    </Button>
                    <Button variant="outline" size="sm">
                      View Invoices
                    </Button>
                    <Button variant="destructive" size="sm">
                      Cancel Subscription
                    </Button>
                  </div>
                </div>
              ) : user?.current_plan && user.current_plan !== 'free' ? (
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Star className="h-5 w-5 text-blue-600" />
                      <span className="text-blue-800 font-medium">{user.current_plan.charAt(0).toUpperCase() + user.current_plan.slice(1)} Plan Active</span>
                    </div>
                    <p className="text-blue-700 text-sm mt-1">
                      You're currently on the {user.current_plan} plan. This appears to be a manual upgrade or promotional access.
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Plan Type</label>
                      <p className="text-gray-900 mt-1 capitalize">{user.current_plan}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Status</label>
                      <p className="text-gray-900 mt-1">Active</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Start Date</label>
                      <p className="text-gray-900 mt-1">
                        {new Date(user.plan_start_date).toLocaleDateString()}
                      </p>
                    </div>
                    {user.plan_end_date && (
                      <div>
                        <label className="text-sm font-medium text-gray-700">End Date</label>
                        <p className="text-gray-900 mt-1">
                          {new Date(user.plan_end_date).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                  </div>
                  
                  <Separator />
                  
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center gap-2 text-yellow-700">
                      <Info className="h-4 w-4" />
                      <span className="text-sm">
                        <strong>Note:</strong> This plan doesn't have an active Stripe subscription. 
                        If you need to manage billing or payment methods, please contact support.
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">No Active Subscription</h3>
                  <p className="text-muted-foreground mb-4">
                    You're currently on the free plan. Upgrade to unlock more features and higher limits.
                  </p>
                  <Button onClick={() => setActiveTab("subscription")}>
                    View Plans
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Preferences Tab */}
        <TabsContent value="preferences" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Notifications */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Notifications
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Email Notifications</p>
                      <p className="text-sm text-gray-600">Receive updates about your account and usage</p>
                    </div>
                    <Button variant="outline" size="sm">Configure</Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Usage Alerts</p>
                      <p className="text-sm text-gray-600">Get notified when approaching limits</p>
                    </div>
                    <Button variant="outline" size="sm">Configure</Button>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Appearance */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  Appearance
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Theme</p>
                      <p className="text-sm text-gray-600">Choose your preferred color scheme</p>
                    </div>
                    <Button variant="outline" size="sm">Light</Button>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Data & Privacy */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Data & Privacy
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Data Export</p>
                      <p className="text-sm text-gray-600">Download your data in various formats</p>
                    </div>
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Privacy Settings</p>
                      <p className="text-sm text-gray-600">Manage your privacy preferences</p>
                    </div>
                    <Button variant="outline" size="sm">Configure</Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Change Password</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowPasswordModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </Button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter new password"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Confirm new password"
                />
              </div>

              {passwordError && (
                <div className="text-red-600 dark:text-red-300 text-sm bg-red-50 dark:bg-red-900/20 p-2 rounded">
                  {passwordError}
                </div>
              )}

              {passwordSuccess && (
                <div className="text-green-600 dark:text-green-300 text-sm bg-green-50 dark:bg-green-900/20 p-2 rounded">
                  {passwordSuccess}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button
                  onClick={handlePasswordChange}
                  disabled={passwordLoading || !passwordData.newPassword || !passwordData.confirmPassword}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  {passwordLoading ? 'Updating...' : 'Update Password'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowPasswordModal(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Account Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-card rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-red-600">Delete Account</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDeleteModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="space-y-4">
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="text-sm font-medium text-red-800 dark:text-red-300">Warning: This action cannot be undone</h4>
                    <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                      Deleting your account will permanently remove:
                    </p>
                    <ul className="text-sm text-red-700 dark:text-red-300 mt-2 list-disc list-inside space-y-1">
                      <li>All your uploaded documents</li>
                      <li>All AI analysis results</li>
                      <li>Your usage history and statistics</li>
                      <li>Your subscription and billing information</li>
                      <li>Your account and login credentials</li>
                    </ul>
                  </div>
                </div>
              </div>
              
              <p className="text-sm text-gray-600">
                Are you absolutely sure you want to delete your account? This action is permanent and cannot be reversed.
              </p>
            </div>
            
            <div className="flex space-x-3 mt-6">
              <Button
                variant="destructive"
                onClick={handleDeleteAccount}
                disabled={deleteLoading}
                className="flex-1"
              >
                {deleteLoading ? 'Deleting Account...' : 'Yes, Delete My Account'}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowDeleteModal(false)}
                className="flex-1"
                disabled={deleteLoading}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
