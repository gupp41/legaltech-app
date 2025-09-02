import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { stripe } from '@/lib/stripe'

export async function POST(request: NextRequest) {
  try {
    const { returnUrl, userId, userEmail } = await request.json()

    console.log('🔍 Portal API - Request data:', { returnUrl, userId, userEmail })

    // Basic validation - ensure we have user info
    if (!userId || !userEmail) {
      console.log('🔍 Portal API - Missing user data')
      return NextResponse.json(
        { error: 'Missing user information' },
        { status: 400 }
      )
    }

    // Create a simple Supabase client for database queries (no auth needed)
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!, // Use service role key for server-side queries
      {
        cookies: {
          getAll() {
            return []
          },
          setAll() {
            // No cookies needed for service role
          },
        },
      }
    )

    // Get user's subscription - check for any active subscription
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')

    if (subError || !subscription || subscription.length === 0) {
      console.log('🔍 Portal API - No subscription found:', subError?.message)
      return NextResponse.json(
        { error: 'No active subscription found' },
        { status: 404 }
      )
    }

    // Use the user's email as the customer identifier
    const customerEmail = userEmail
    
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
