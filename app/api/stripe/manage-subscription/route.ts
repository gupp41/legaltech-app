import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { stripe } from '@/lib/stripe'

export async function POST(request: NextRequest) {
  try {
    const { action, subscriptionId } = await request.json()

    // Validate request
    if (!action || !subscriptionId) {
      return NextResponse.json(
        { error: 'Missing required fields: action, subscriptionId' },
        { status: 400 }
      )
    }

    // Get authenticated user
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify user owns this subscription
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('stripe_subscription_id', subscriptionId)
      .eq('user_id', user.id)
      .single()

    if (subError || !subscription) {
      return NextResponse.json(
        { error: 'Subscription not found' },
        { status: 404 }
      )
    }

    let result

    switch (action) {
      case 'cancel':
        result = await stripe.subscriptions.update(subscriptionId, {
          cancel_at_period_end: true,
        })
        break
      
      case 'reactivate':
        result = await stripe.subscriptions.update(subscriptionId, {
          cancel_at_period_end: false,
        })
        break
      
      case 'delete':
        result = await stripe.subscriptions.del(subscriptionId)
        break
      
      default:
        return NextResponse.json(
          { error: 'Invalid action. Must be "cancel", "reactivate", or "delete"' },
          { status: 400 }
        )
    }

    // Update local database
    if (action === 'cancel') {
      await supabase
        .from('subscriptions')
        .update({
          status: 'cancelled',
          end_date: new Date(result.current_period_end * 1000).toISOString(),
        })
        .eq('stripe_subscription_id', subscriptionId)
    } else if (action === 'reactivate') {
      await supabase
        .from('subscriptions')
        .update({
          status: 'active',
          end_date: null,
        })
        .eq('stripe_subscription_id', subscriptionId)
    } else if (action === 'delete') {
      await supabase
        .from('subscriptions')
        .update({
          status: 'deleted',
          end_date: new Date().toISOString(),
        })
        .eq('stripe_subscription_id', subscriptionId)
      
      // Downgrade user to free plan
      await supabase
        .from('users')
        .update({
          current_plan: 'free',
          plan_end_date: new Date().toISOString(),
        })
        .eq('id', user.id)
    }

    return NextResponse.json({ success: true, result })
  } catch (error) {
    console.error('Error managing subscription:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
