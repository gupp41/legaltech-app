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
  console.log(`🔔 Processing webhook event: ${event.type}`)
  console.log(`🔔 Event data:`, JSON.stringify(event.data.object, null, 2))

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
    console.log(`🔔 Checkout session completed:`, JSON.stringify(session, null, 2))
    const { userId, plan, interval } = session.metadata
    console.log(`🔔 Processing checkout completion for user ${userId}, plan: ${plan}, interval: ${interval}`)

    // Get subscription details from Stripe if available
    const subscriptionDetails = session.subscription_details || {}
    const currentPeriodStart = subscriptionDetails.current_period_start 
      ? new Date(subscriptionDetails.current_period_start * 1000).toISOString()
      : new Date().toISOString()
    const currentPeriodEnd = subscriptionDetails.current_period_end 
      ? new Date(subscriptionDetails.current_period_end * 1000).toISOString()
      : null

    // Create or update subscription record in database (ONLY update subscriptions table)
    const subscriptionData = {
      user_id: userId,
      plan_type: plan,
      status: 'active',
      start_date: new Date().toISOString(),
      current_period_start: currentPeriodStart,
      current_period_end: currentPeriodEnd,
      stripe_subscription_id: session.subscription,
      stripe_price_id: subscriptionDetails.items?.data?.[0]?.price?.id,
      cancel_at_period_end: false,
      metadata: {
        interval,
        checkout_session_id: session.id,
      }
    }
    
    console.log(`🔔 Upserting subscription data:`, JSON.stringify(subscriptionData, null, 2))
    
    const { data: upsertResult, error: subError } = await supabase
      .from('subscriptions')
      .upsert(subscriptionData, {
        onConflict: 'user_id'
      })
      .select()

    console.log(`🔔 Upsert result:`, { upsertResult, subError })

    if (subError) {
      console.error('🔔 Error creating subscription record:', subError)
      throw subError
    }

    // Database trigger will automatically sync to profiles table
    // No need to manually update profiles!
    console.log(`✅ Successfully created subscription for user ${userId} to ${plan} plan`)
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

    // ONLY update subscriptions table with enhanced Stripe data
    const { error } = await supabase
      .from('subscriptions')
      .update({
        status: subscription.status,
        current_period_start: subscription.current_period_start 
          ? new Date(subscription.current_period_start * 1000).toISOString()
          : null,
        current_period_end: subscription.current_period_end 
          ? new Date(subscription.current_period_end * 1000).toISOString()
          : null,
        cancel_at_period_end: subscription.cancel_at_period_end,
        trial_start: subscription.trial_start 
          ? new Date(subscription.trial_start * 1000).toISOString()
          : null,
        trial_end: subscription.trial_end 
          ? new Date(subscription.trial_end * 1000).toISOString()
          : null,
        updated_at: new Date().toISOString()
      })
      .eq('stripe_subscription_id', subscription.id)

    // Database trigger will automatically sync to profiles table

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

    // ONLY update subscriptions table
    const { error } = await supabase
      .from('subscriptions')
      .update({
        status: 'cancelled',
        current_period_end: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('stripe_subscription_id', subscription.id)

    // Database trigger will automatically sync to profiles table
    // (will set to 'free' plan when subscription ends)

    if (error) {
      console.error('Error updating subscription record:', error)
      throw error
    }

    console.log(`✅ Subscription ${subscription.id} cancelled`)
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
          updated_at: new Date().toISOString(),
        })
        .eq('stripe_subscription_id', invoice.subscription)

      // Database trigger will automatically sync to profiles table

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
