# 🔧 Test Stripe Webhook Endpoint

## Step 1: Check if Webhook Endpoint Exists

Go to your Stripe Dashboard:
1. **Developers → Webhooks**
2. **Look for an endpoint like**: `https://legaltech-app.vercel.app/api/stripe/webhook`
3. **If it doesn't exist, create it**

## Step 2: Create Webhook Endpoint (if missing)

1. **Click "Add endpoint"**
2. **Endpoint URL**: `https://legaltech-app.vercel.app/api/stripe/webhook`
3. **Events to send**:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`

## Step 3: Get Webhook Secret

1. **Click on your webhook endpoint**
2. **Copy the "Signing secret"**
3. **Add it to Vercel environment variables**:
   - Variable name: `STRIPE_WEBHOOK_SECRET`
   - Value: `whsec_...` (the secret from Stripe)

## Step 4: Test Webhook

1. **In Stripe Dashboard, go to your webhook**
2. **Click "Send test webhook"**
3. **Select "checkout.session.completed"**
4. **Send the test webhook**
5. **Check Vercel function logs** for the 🔔 debugging messages

## Step 5: Check Vercel Environment Variables

Make sure these are set in Vercel:
- `STRIPE_WEBHOOK_SECRET`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `STRIPE_SECRET_KEY`

## Step 6: Check Vercel Function Logs

1. **Go to Vercel Dashboard**
2. **Your project → Functions tab**
3. **Look for webhook function logs**
4. **You should see logs starting with 🔔**

## Common Issues:

1. **Webhook not created** - Most likely issue
2. **Wrong endpoint URL** - Should be your Vercel app URL
3. **Missing environment variables** - Check Vercel settings
4. **Webhook secret mismatch** - Verify the secret matches
5. **Events not selected** - Make sure all required events are selected
