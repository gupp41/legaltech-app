import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe'

export async function POST(request: NextRequest) {
  try {
    const { returnUrl } = await request.json()

    // Debug: Check what cookies we're receiving
    const cookies = request.cookies.getAll()
    console.log('🔍 Portal API - Cookies received:', cookies.map(c => ({ name: c.name, value: c.value.substring(0, 20) + '...' })))

    // Get authenticated user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    console.log('🔍 Portal API - Auth check:', {
      user: user?.email,
      userId: user?.id,
      error: authError?.message
    })

    if (authError || !user) {
      console.log('🔍 Portal API - Unauthorized:', authError?.message)
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user's subscription - check for any active subscription
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')

    if (subError || !subscription || subscription.length === 0) {
      return NextResponse.json(
        { error: 'No active subscription found' },
        { status: 404 }
      )
    }

    // For now, we'll use the user's email as the customer identifier
    // In a production app, you'd want to store the Stripe customer ID
    const customerEmail = user.email!
    
    // Try to find the customer in Stripe by email
    const customers = await stripe.customers.list({
      email: customerEmail,
      limit: 1
    })

    let customerId = customers.data[0]?.id

    // If no customer found, create one
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: customerEmail,
        metadata: {
          user_id: user.id
        }
      })
      customerId = customer.id
    }

    // Create portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl || `${process.env.NEXT_PUBLIC_APP_URL}/settings`,
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Error creating portal session:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
