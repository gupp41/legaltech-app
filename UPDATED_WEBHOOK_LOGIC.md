# 🔄 Updated Stripe Webhook Logic

## 🎯 **New Approach: Single Source of Truth**

### **Current Problem:**
- Webhook updates both `subscriptions` and `profiles` tables
- Creates data inconsistency and complexity
- Two sources of truth = confusion

### **New Solution:**
- `subscriptions` table = **Source of Truth**
- `profiles` table = **Auto-synced Cache** (via database trigger)
- Webhook only updates `subscriptions` table
- Database trigger automatically syncs to `profiles`

## 📝 **Updated Webhook Functions**

### **1. Checkout Session Completed**
```typescript
async function handleCheckoutSessionCompleted(session: any, supabase: any) {
  try {
    const { userId, plan, interval } = session.metadata
    
    // ONLY update subscriptions table
    const { error: subError } = await supabase
      .from('subscriptions')
      .insert({
        user_id: userId,
        plan_type: plan,
        status: 'active',
        current_period_start: new Date().toISOString(),
        current_period_end: session.subscription_details?.current_period_end 
          ? new Date(session.subscription_details.current_period_end * 1000).toISOString()
          : null,
        stripe_subscription_id: session.subscription,
        stripe_price_id: session.subscription_details?.items?.data?.[0]?.price?.id,
        cancel_at_period_end: false,
        metadata: {
          interval,
          checkout_session_id: session.id,
        }
      })

    // Database trigger will automatically sync to profiles table
    // No need to manually update profiles!
    
    if (subError) throw subError
    console.log(`✅ Subscription created for user ${userId}`)
  } catch (error) {
    console.error('Error in handleCheckoutSessionCompleted:', error)
    throw error
  }
}
```

### **2. Subscription Updated**
```typescript
async function handleSubscriptionUpdated(subscription: any, supabase: any) {
  try {
    // ONLY update subscriptions table
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
    
    if (error) throw error
    console.log(`✅ Subscription ${subscription.id} updated`)
  } catch (error) {
    console.error('Error in handleSubscriptionUpdated:', error)
    throw error
  }
}
```

### **3. Subscription Cancelled**
```typescript
async function handleSubscriptionDeleted(subscription: any, supabase: any) {
  try {
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
    // (set to 'free' plan when subscription ends)
    
    if (error) throw error
    console.log(`✅ Subscription ${subscription.id} cancelled`)
  } catch (error) {
    console.error('Error in handleSubscriptionDeleted:', error)
    throw error
  }
}
```

## 🎯 **Benefits of This Approach**

### **✅ Advantages:**
1. **Single Source of Truth** - All subscription data in one place
2. **Automatic Sync** - Database trigger keeps profiles in sync
3. **Complete History** - Track all subscription changes
4. **Stripe Integration** - Direct mapping to Stripe objects
5. **Simplified Logic** - Webhook only updates one table
6. **Data Consistency** - No more sync issues

### **🔧 Implementation Steps:**
1. Run the consolidated schema migration
2. Update webhook functions to only update `subscriptions`
3. Update UI queries to use `user_subscriptions` view
4. Test the database trigger sync
5. Remove manual profile updates from webhook

## 📊 **New Query Patterns**

### **Get User's Current Plan:**
```sql
-- Use the view for easy access
SELECT * FROM user_subscriptions WHERE user_id = $1;

-- Or direct query with plan details
SELECT s.*, pd.name, pd.features, pd.limits 
FROM subscriptions s
JOIN plan_details pd ON s.plan_type = pd.plan_type
WHERE s.user_id = $1 AND s.status = 'active';
```

### **Get Plan Features and Limits:**
```sql
-- Get plan details for any plan type
SELECT * FROM plan_details WHERE plan_type = 'plus';
```

This approach eliminates the data duplication issue and provides a much cleaner, more maintainable architecture! 🚀
