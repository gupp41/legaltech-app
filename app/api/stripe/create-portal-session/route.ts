import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { stripe } from '@/lib/stripe'

export async function POST(request: NextRequest) {
  try {
    const { returnUrl, userId, userEmail } = await request.json()

    console.log('🔍 Portal API - Request data:', { returnUrl, userId, userEmail })

    // Check environment variables
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      console.error('🔍 Portal API - Missing NEXT_PUBLIC_SUPABASE_URL')
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('🔍 Portal API - Missing SUPABASE_SERVICE_ROLE_KEY')
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

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

    if (subError) {
      console.log('🔍 Portal API - Database error:', subError.message)
      return NextResponse.json(
        { error: 'Database error' },
        { status: 500 }
      )
    }

    if (!subscription || subscription.length === 0) {
      console.log('🔍 Portal API - No subscription found for user:', userId)
      return NextResponse.json(
        { error: 'No active subscription found' },
        { status: 404 }
      )
    }

    console.log('🔍 Portal API - Found subscription:', subscription[0])

    // Use the user's email as the customer identifier
    const customerEmail = userEmail
    
    // Try to find the customer in Stripe by email
    console.log('🔍 Portal API - Looking for Stripe customer with email:', customerEmail)
    const customers = await stripe.customers.list({
      email: customerEmail,
      limit: 1
    })

    let customerId = customers.data[0]?.id
    console.log('🔍 Portal API - Found existing customer:', customerId)

    // If no customer found, create one
    if (!customerId) {
      console.log('🔍 Portal API - Creating new Stripe customer')
      const customer = await stripe.customers.create({
        email: customerEmail,
        metadata: {
          user_id: userId
        }
      })
      customerId = customer.id
      console.log('🔍 Portal API - Created new customer:', customerId)
    }

    // Create portal session
    console.log('🔍 Portal API - Creating portal session for customer:', customerId)
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl || `${process.env.NEXT_PUBLIC_APP_URL}/settings`,
    })

    console.log('🔍 Portal API - Portal session created successfully:', session.url)
    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Error creating portal session:', error)
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined
    })
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
