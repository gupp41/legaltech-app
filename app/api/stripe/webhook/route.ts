import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { stripe } from '@/lib/stripe'

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

  switch (event.type) {
    case 'checkout.session.completed':
      console.log('Checkout session completed:', event.data.object.id)
      break
    case 'customer.subscription.created':
      console.log('Subscription created:', event.data.object.id)
      break
    case 'customer.subscription.updated':
      console.log('Subscription updated:', event.data.object.id)
      break
    case 'customer.subscription.deleted':
      console.log('Subscription deleted:', event.data.object.id)
      break
    case 'invoice.payment_succeeded':
      console.log('Payment succeeded:', event.data.object.id)
      break
    case 'invoice.payment_failed':
      console.log('Payment failed:', event.data.object.id)
      break
    default:
      console.log(`Unhandled event type: ${event.type}`)
  }
}
