# 🚀 Stripe Integration Setup Guide

## 📋 Overview
This guide will help you set up Stripe integration for the subscription system.

## 🔑 Required Environment Variables

Add these to your `.env.local` file:

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here

# Stripe Price IDs (create these in your Stripe dashboard)
STRIPE_PLUS_MONTHLY_PRICE_ID=price_plus_monthly_id_here
STRIPE_PLUS_YEARLY_PRICE_ID=price_plus_yearly_id_here
STRIPE_MAX_MONTHLY_PRICE_ID=price_max_monthly_id_here
STRIPE_MAX_YEARLY_PRICE_ID=price_max_yearly_id_here

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 🛠️ Stripe Dashboard Setup

### 1. Create Products and Prices

#### Plus Plan
- **Product Name:** Plus Plan
- **Monthly Price:** $29.00 USD, recurring monthly
- **Yearly Price:** $290.00 USD, recurring yearly

#### Max Plan
- **Product Name:** Max Plan
- **Monthly Price:** $99.00 USD, recurring monthly
- **Yearly Price:** $990.00 USD, recurring yearly

### 2. Create Coupon
- **Coupon ID:** `FIRST_MONTH_50`
- **Type:** Percentage off
- **Amount:** 50%
- **Duration:** Once
- **Applies to:** All products

### 3. Configure Webhooks

Add these webhook endpoints in your Stripe dashboard:

```
https://your-domain.com/api/stripe/webhook
```

**Events to listen for:**
- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`

## 🧪 Testing

### Test Cards
- **Success:** 4242 4242 4242 4242
- **Decline:** 4000 0000 0000 0002
- **3D Secure:** 4000 0025 0000 3155

### Test Scenarios
1. **Upgrade to Plus Plan**
   - Select Plus plan
   - Choose monthly/yearly
   - Complete checkout
   - Verify subscription created

2. **Upgrade to Max Plan**
   - Select Max plan
   - Choose monthly/yearly
   - Complete checkout
   - Verify subscription created

3. **Cancel Subscription**
   - Go to billing portal
   - Cancel subscription
   - Verify downgrade to free

## 🔒 Security Notes

- Never commit `.env.local` to version control
- Use test keys for development
- Verify webhook signatures
- Implement proper error handling

## 📱 Usage

### Frontend Integration
The settings page automatically handles:
- Plan selection
- Interval selection (monthly/yearly)
- Stripe checkout redirect
- Success/cancel handling

### Backend Integration
The API routes handle:
- Checkout session creation
- Webhook processing
- Subscription management
- Database updates

## 🚨 Troubleshooting

### Common Issues

1. **Webhook not receiving events**
   - Check webhook endpoint URL
   - Verify webhook secret
   - Check server logs

2. **Checkout session creation fails**
   - Verify Stripe secret key
   - Check price IDs exist
   - Verify coupon exists

3. **Database not updating**
   - Check webhook signature
   - Verify database permissions
   - Check RLS policies

### Debug Mode
Enable detailed logging by checking the browser console and server logs.

## 📚 Next Steps

1. **Production Deployment**
   - Switch to live Stripe keys
   - Update webhook endpoints
   - Test with real payments

2. **Advanced Features**
   - Implement prorated billing
   - Add usage-based pricing
   - Create custom checkout flows

3. **Analytics**
   - Track conversion rates
   - Monitor subscription metrics
   - Analyze user behavior

---

*Last Updated: August 30, 2025*  
*Version: 1.0*  
*Status: Ready for Implementation*
