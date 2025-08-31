import Stripe from 'stripe'

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set in environment variables')
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia',
  typescript: true,
})

export const STRIPE_PLANS = {
  plus: {
    monthly: {
      priceId: process.env.STRIPE_PLUS_MONTHLY_PRICE_ID || 'price_plus_monthly',
      amount: 2900, // $29.00 in cents
      interval: 'month'
    },
    yearly: {
      priceId: process.env.STRIPE_PLUS_YEARLY_PRICE_ID || 'price_plus_yearly',
      amount: 29000, // $290.00 in cents
      interval: 'year'
    }
  },
  max: {
    monthly: {
      priceId: process.env.STRIPE_MAX_MONTHLY_PRICE_ID || 'price_max_monthly',
      amount: 9900, // $99.00 in cents
      interval: 'month'
    },
    yearly: {
      priceId: process.env.STRIPE_MAX_YEARLY_PRICE_ID || 'price_max_yearly',
      amount: 99000, // $990.00 in cents
      interval: 'year'
    }
  }
}

export const getStripePlanPrice = (plan: string, interval: 'monthly' | 'yearly') => {
  const planData = STRIPE_PLANS[plan as keyof typeof STRIPE_PLANS]
  if (!planData) {
    throw new Error(`Invalid plan: ${plan}`)
  }
  
  return planData[interval]
}
