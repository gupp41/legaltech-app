import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { stripe } from '@/lib/stripe'
import { createBrowserClient } from '@supabase/ssr'

const relevantEvents = new Set([
  'checkout.session.completed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.payment_succeeded',
  'invoice.payment_failed',
])

export async function POST(request: NextRequest) {
  const body = await request.text()
  const headersList = await headers()
  const signature = headersList.get('stripe-signature')

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    )
  }

  let event: any

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (error) {
    console.error('Webhook signature verification failed:', error)
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    )
  }

  if (relevantEvents.has(event.type)) {
    try {
      await handleWebhookEvent(event)
    } catch (error) {
      console.error('Error handling webhook event:', error)
      return NextResponse.json(
        { error: 'Webhook handler failed' },
        { status: 500 }
      )
    }
  }

  return NextResponse.json({ received: true })
}

async function handleWebhookEvent(event: any) {
  console.log(`Processing webhook event: ${event.type}`)

  // Initialize Supabase client
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutSessionCompleted(event.data.object, supabase)
      break
    case 'customer.subscription.created':
      await handleSubscriptionCreated(event.data.object, supabase)
      break
    case 'customer.subscription.updated':
      await handleSubscriptionUpdated(event.data.object, supabase)
      break
    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(event.data.object, supabase)
      break
    case 'invoice.payment_succeeded':
      await handlePaymentSucceeded(event.data.object, supabase)
      break
    case 'invoice.payment_failed':
      await handlePaymentFailed(event.data.object, supabase)
      break
    default:
      console.log(`Unhandled event type: ${event.type}`)
  }
}

async function handleCheckoutSessionCompleted(session: any, supabase: any) {
  try {
    const { userId, plan, interval } = session.metadata
    console.log(`Processing checkout completion for user ${userId}, plan: ${plan}, interval: ${interval}`)

    // Create subscription record in database
    const { error: subError } = await supabase
      .from('subscriptions')
      .insert({
        user_id: userId,
        plan_type: plan,
        status: 'active',
        start_date: new Date().toISOString(),
        stripe_subscription_id: session.subscription,
        metadata: {
          interval,
          checkout_session_id: session.id,
        }
      })

    if (subError) {
      console.error('Error creating subscription record:', subError)
      throw subError
    }

    // Update user's current plan
    const { error: userError } = await supabase
      .from('users')
      .update({
        current_plan: plan,
        plan_start_date: new Date().toISOString(),
      })
      .eq('id', userId)

    if (userError) {
      console.error('Error updating user plan:', userError)
      throw userError
    }

    console.log(`✅ Successfully upgraded user ${userId} to ${plan} plan`)
  } catch (error) {
    console.error('Error in handleCheckoutSessionCompleted:', error)
    throw error
  }
}

async function handleSubscriptionCreated(subscription: any, supabase: any) {
  try {
    const { userId, plan } = subscription.metadata
    console.log(`Subscription created for user ${userId}, plan: ${plan}`)

    // Update subscription record with Stripe data
    const { error } = await supabase
      .from('subscriptions')
      .update({
        status: subscription.status,
        end_date: subscription.current_period_end ? new Date(subscription.current_period_end * 1000).toISOString() : null,
      })
      .eq('stripe_subscription_id', subscription.id)

    if (error) {
      console.error('Error updating subscription record:', error)
      throw error
    }

    console.log(`✅ Subscription ${subscription.id} created for user ${userId}`)
  } catch (error) {
    console.error('Error in handleSubscriptionCreated:', error)
    throw error
  }
}

async function handleSubscriptionUpdated(subscription: any, supabase: any) {
  try {
    console.log(`Updating subscription ${subscription.id}`)

    const { error } = await supabase
      .from('subscriptions')
      .update({
        status: subscription.status,
        end_date: subscription.current_period_end ? new Date(subscription.current_period_end * 1000).toISOString() : null,
      })
      .eq('stripe_subscription_id', subscription.id)

    if (error) {
      console.error('Error updating subscription record:', error)
      throw error
    }

    console.log(`✅ Subscription ${subscription.id} updated`)
  } catch (error) {
    console.error('Error in handleSubscriptionUpdated:', error)
    throw error
  }
}

async function handleSubscriptionDeleted(subscription: any, supabase: any) {
  try {
    const { userId } = subscription.metadata || {}
    console.log(`Subscription ${subscription.id} deleted for user ${userId}`)

    if (!userId) {
      console.error('No userId found in subscription metadata')
      return
    }

    // Update subscription record
    const { error } = await supabase
      .from('subscriptions')
      .update({
        status: 'cancelled',
        end_date: new Date().toISOString(),
      })
      .eq('stripe_subscription_id', subscription.id)

    if (error) {
      console.error('Error updating subscription record:', error)
      throw error
    }

    // Downgrade user to free plan
    const { error: userError } = await supabase
      .from('users')
      .update({
        current_plan: 'free',
        plan_end_date: new Date().toISOString(),
      })
      .eq('id', userId)

    if (userError) {
      console.error('Error downgrading user plan:', userError)
      throw error
    }

    console.log(`✅ User ${userId} downgraded to free plan`)
  } catch (error) {
    console.error('Error in handleSubscriptionDeleted:', error)
    throw error
  }
}

async function handlePaymentSucceeded(invoice: any, supabase: any) {
  try {
    console.log(`Payment succeeded for invoice ${invoice.id}`)
    
    // If this is a subscription invoice, update the subscription status
    if (invoice.subscription) {
      const { error } = await supabase
        .from('subscriptions')
        .update({
          status: 'active',
          last_payment_date: new Date().toISOString(),
        })
        .eq('stripe_subscription_id', invoice.subscription)

      if (error) {
        console.error('Error updating subscription payment status:', error)
        throw error
      }

      console.log(`✅ Payment status updated for subscription ${invoice.subscription}`)
    }
  } catch (error) {
    console.error('Error in handlePaymentSucceeded:', error)
    throw error
  }
}

async function handlePaymentFailed(invoice: any, supabase: any) {
  try {
    console.log(`Payment failed for invoice ${invoice.id}`)
    
    // If this is a subscription invoice, update the subscription status
    if (invoice.subscription) {
      const { error } = await supabase
        .from('subscriptions')
        .update({
          status: 'past_due',
          last_payment_date: new Date().toISOString(),
        })
        .eq('stripe_subscription_id', invoice.subscription)

      if (error) {
        console.error('Error updating subscription payment status:', error)
        throw error
      }

      console.log(`⚠️ Payment failed status updated for subscription ${invoice.subscription}`)
    }
  } catch (error) {
    console.error('Error in handlePaymentFailed:', error)
    throw error
  }
}
