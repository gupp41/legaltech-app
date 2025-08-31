import { NextRequest, NextResponse } from 'next/server'
import { createBrowserClient } from '@supabase/ssr'
import { stripe } from '@/lib/stripe'

export async function POST(request: NextRequest) {
  try {
    const { plan, interval, successUrl, cancelUrl, userEmail, userId } = await request.json()

    // Validate request
    if (!plan || !interval || !successUrl || !cancelUrl || !userEmail || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields: plan, interval, successUrl, cancelUrl, userEmail, userId' },
        { status: 400 }
      )
    }

    if (!['plus', 'max'].includes(plan)) {
      return NextResponse.json(
        { error: 'Invalid plan. Must be "plus" or "max"' },
        { status: 400 }
      )
    }

    if (!['monthly', 'yearly'].includes(interval)) {
      return NextResponse.json(
        { error: 'Invalid interval. Must be "monthly" or "yearly"' },
        { status: 400 }
      )
    }

    // Define plan pricing directly
    const planPricing = {
      plus: {
        monthly: { amount: 2900, interval: 'month' }, // $29.00
        yearly: { amount: 29000, interval: 'year' }   // $290.00
      },
      max: {
        monthly: { amount: 9900, interval: 'month' }, // $99.00
        yearly: { amount: 99000, interval: 'year' }   // $990.00
      }
    }

    const pricing = planPricing[plan as keyof typeof planPricing][interval as 'monthly' | 'yearly']

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      customer_email: userEmail,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan`,
              description: `${interval.charAt(0).toUpperCase() + interval.slice(1)}ly subscription`,
            },
            unit_amount: pricing.amount,
            recurring: {
              interval: pricing.interval as 'month' | 'year',
            },
          },
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        userId,
        plan,
        interval,
      },
      subscription_data: {
        metadata: {
          userId,
          plan,
          interval,
        },
      },
      // Note: Coupon removed for now - you can add it back after creating it in Stripe
      // discounts: [
      //   {
      //     coupon: 'FIRST_MONTH_50',
      //   },
      // ],
    })

    return NextResponse.json({ sessionId: session.id, url: session.url })
  } catch (error) {
    console.error('Error creating checkout session:', error)
    
    // Log more details for debugging
    if (error instanceof Error) {
      console.error('Error message:', error.message)
      console.error('Error stack:', error.stack)
    }
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
