# Stripe Integration Roadmap
## Complete Implementation Guide for Production Launch

This document outlines all the changes needed to integrate Stripe payment processing with the existing subscription system before going live.

---

## 🎯 **Current State vs. Target State**

### **Current State (Database Only):**
- ✅ Subscription management in database
- ✅ Cancellation/downgrade UI
- ✅ Term-based benefit handling
- ✅ Usage tracking and limits
- ❌ No actual payment processing
- ❌ No recurring billing
- ❌ No payment failure handling

### **Target State (Full Stripe Integration):**
- ✅ All current features PLUS
- ✅ Real payment processing
- ✅ Recurring billing management
- ✅ Payment failure handling
- ✅ Webhook event processing
- ✅ Stripe customer management

---

## 📋 **Implementation Checklist**

### **Phase 1: Database Schema Updates**
- [ ] Add Stripe-related columns to existing tables
- [ ] Create Stripe webhook events table
- [ ] Add indexes for performance
- [ ] Update RLS policies for new columns

### **Phase 2: Stripe API Integration**
- [ ] Install Stripe SDK
- [ ] Create Stripe service layer
- [ ] Implement customer management
- [ ] Implement subscription management
- [ ] Implement payment method management

### **Phase 3: Webhook Implementation**
- [ ] Create webhook endpoint
- [ ] Implement event handlers
- [ ] Add webhook signature verification
- [ ] Handle failed payments and retries

### **Phase 4: Frontend Updates**
- [ ] Add payment method management UI
- [ ] Update subscription flows
- [ ] Add payment failure notifications
- [ ] Update billing history display

### **Phase 5: Testing & Deployment**
- [ ] Test with Stripe test mode
- [ ] Test webhook endpoints
- [ ] Test payment failure scenarios
- [ ] Deploy to production
- [ ] Switch to live Stripe keys

---

## 🗄️ **Database Schema Changes**

### **1. Update `user_subscriptions` table:**
```sql
-- Add Stripe-related columns
ALTER TABLE user_subscriptions 
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_price_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_payment_method_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_invoice_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_status TEXT DEFAULT 'incomplete',
ADD COLUMN IF NOT EXISTS stripe_current_period_start TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS stripe_current_period_end TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS stripe_cancel_at_period_end BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS stripe_canceled_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS stripe_ended_at TIMESTAMP WITH TIME ZONE;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_stripe_customer_id 
ON user_subscriptions(stripe_customer_id);

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_stripe_subscription_id 
ON user_subscriptions(stripe_subscription_id);

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_stripe_status 
ON user_subscriptions(stripe_status);
```

### **2. Create `stripe_webhook_events` table:**
```sql
CREATE TABLE IF NOT EXISTS stripe_webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stripe_event_id TEXT UNIQUE NOT NULL,
    event_type TEXT NOT NULL,
    processed BOOLEAN DEFAULT FALSE,
    processing_error TEXT,
    event_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_stripe_event_id 
ON stripe_webhook_events(stripe_event_id);

CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_event_type 
ON stripe_webhook_events(event_type);

CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_processed 
ON stripe_webhook_events(processed);
```

### **3. Update `payments` table:**
```sql
-- Add Stripe-related columns
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_charge_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_invoice_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_payment_method_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_status TEXT DEFAULT 'pending';

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_payments_stripe_payment_intent_id 
ON payments(stripe_payment_intent_id);

CREATE INDEX IF NOT EXISTS idx_payments_stripe_charge_id 
ON payments(stripe_charge_id);
```

---

## 🔧 **Backend Implementation**

### **1. Install Dependencies:**
```bash
npm install stripe @stripe/stripe-js
npm install --save-dev @types/stripe
```

### **2. Environment Variables:**
```env
# Add to .env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_WEBHOOK_ENDPOINT_SECRET=whsec_...
```

### **3. Create Stripe Service (`src/services/stripeService.ts`):**
```typescript
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export class StripeService {
  // Customer Management
  async createCustomer(userId: string, email: string, name: string) {
    return await stripe.customers.create({
      email,
      name,
      metadata: { userId }
    });
  }

  async getCustomer(customerId: string) {
    return await stripe.customers.retrieve(customerId);
  }

  // Subscription Management
  async createSubscription(customerId: string, priceId: string, paymentMethodId: string) {
    return await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      default_payment_method: paymentMethodId,
      expand: ['latest_invoice.payment_intent'],
    });
  }

  async cancelSubscription(subscriptionId: string, atPeriodEnd: boolean = true) {
    return await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: atPeriodEnd,
    });
  }

  async updateSubscription(subscriptionId: string, newPriceId: string) {
    return await stripe.subscriptions.update(subscriptionId, {
      items: [{ price: newPriceId }],
    });
  }

  // Payment Methods
  async createPaymentMethod(type: string, card: any) {
    return await stripe.paymentMethods.create({
      type: type as any,
      card,
    });
  }

  async attachPaymentMethod(paymentMethodId: string, customerId: string) {
    return await stripe.paymentMethods.attach(paymentMethodId, {
      customer: customerId,
    });
  }

  // Webhook Verification
  verifyWebhookSignature(payload: string, signature: string) {
    return stripe.webhooks.constructEvent(
      payload,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  }
}

export const stripeService = new StripeService();
```

### **4. Update Subscription API (`src/services/subscriptionApi.ts`):**
```typescript
// Add Stripe integration to existing functions
import { stripeService } from './stripeService';

// Update createUserSubscription to use Stripe
async createUserSubscription(userId: string, planId: string, paymentMethodId: string) {
  // 1. Get or create Stripe customer
  let customer = await this.getOrCreateStripeCustomer(userId);
  
  // 2. Create Stripe subscription
  const stripeSubscription = await stripeService.createSubscription(
    customer.id,
    plan.stripe_price_id,
    paymentMethodId
  );
  
  // 3. Save to database with Stripe IDs
  const { data, error } = await supabase
    .from('user_subscriptions')
    .insert({
      user_id: userId,
      plan_id: planId,
      stripe_customer_id: customer.id,
      stripe_subscription_id: stripeSubscription.id,
      stripe_price_id: plan.stripe_price_id,
      stripe_payment_method_id: paymentMethodId,
      stripe_status: stripeSubscription.status,
      stripe_current_period_start: new Date(stripeSubscription.current_period_start * 1000).toISOString(),
      stripe_current_period_end: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
      status: 'active',
      current_period_start: new Date(stripeSubscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
    })
    .select(`
      *,
      subscription_plan:subscription_plans!plan_id(*)
    `)
    .single();

  if (error) throw error;
  return data;
}

// Update cancelUserSubscription to use Stripe
async cancelUserSubscription(userId: string) {
  const subscription = await this.getUserSubscription(userId);
  if (!subscription?.stripe_subscription_id) {
    throw new Error('No Stripe subscription found');
  }

  // Cancel in Stripe
  await stripeService.cancelSubscription(subscription.stripe_subscription_id, true);
  
  // Update database
  const { data, error } = await supabase
    .from('user_subscriptions')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      stripe_cancel_at_period_end: true,
      updated_at: new Date().toISOString()
    })
    .eq('user_id', userId)
    .eq('status', 'active')
    .select(`
      *,
      subscription_plan:subscription_plans!plan_id(*)
    `)
    .single();

  if (error) throw error;
  return data;
}
```

### **5. Create Webhook Handler (`src/routes/webhooks.ts`):**
```typescript
import express from 'express';
import { stripeService } from '../services/stripeService';
import { supabase } from '../lib/supabase';

const router = express.Router();

// Stripe webhook endpoint
router.post('/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const signature = req.headers['stripe-signature'] as string;
  
  try {
    const event = stripeService.verifyWebhookSignature(req.body, signature);
    
    // Store event in database
    await supabase.from('stripe_webhook_events').insert({
      stripe_event_id: event.id,
      event_type: event.type,
      event_data: event.data.object,
    });

    // Process event
    await handleStripeEvent(event);
    
    res.json({ received: true });
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(400).send(`Webhook Error: ${err.message}`);
  }
});

async function handleStripeEvent(event: any) {
  switch (event.type) {
    case 'customer.subscription.created':
      await handleSubscriptionCreated(event.data.object);
      break;
    case 'customer.subscription.updated':
      await handleSubscriptionUpdated(event.data.object);
      break;
    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(event.data.object);
      break;
    case 'invoice.payment_succeeded':
      await handlePaymentSucceeded(event.data.object);
      break;
    case 'invoice.payment_failed':
      await handlePaymentFailed(event.data.object);
      break;
    case 'customer.subscription.trial_will_end':
      await handleTrialWillEnd(event.data.object);
      break;
    default:
      console.log(`Unhandled event type: ${event.type}`);
  }
}

async function handleSubscriptionCreated(subscription: any) {
  // Update subscription status in database
  await supabase
    .from('user_subscriptions')
    .update({
      stripe_status: subscription.status,
      stripe_current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      stripe_current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    })
    .eq('stripe_subscription_id', subscription.id);
}

async function handleSubscriptionUpdated(subscription: any) {
  // Handle subscription changes
  await supabase
    .from('user_subscriptions')
    .update({
      stripe_status: subscription.status,
      stripe_cancel_at_period_end: subscription.cancel_at_period_end,
      stripe_canceled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null,
    })
    .eq('stripe_subscription_id', subscription.id);
}

async function handleSubscriptionDeleted(subscription: any) {
  // Handle subscription cancellation
  await supabase
    .from('user_subscriptions')
    .update({
      status: 'cancelled',
      stripe_status: 'canceled',
      stripe_ended_at: new Date(subscription.ended_at * 1000).toISOString(),
    })
    .eq('stripe_subscription_id', subscription.id);
}

async function handlePaymentSucceeded(invoice: any) {
  // Record successful payment
  await supabase.from('payments').insert({
    user_id: invoice.customer,
    amount: invoice.amount_paid / 100, // Convert from cents
    currency: invoice.currency,
    status: 'completed',
    stripe_invoice_id: invoice.id,
    stripe_charge_id: invoice.charge,
    payment_type: 'subscription',
    created_at: new Date().toISOString(),
  });
}

async function handlePaymentFailed(invoice: any) {
  // Handle failed payment
  await supabase
    .from('user_subscriptions')
    .update({
      stripe_status: 'past_due',
    })
    .eq('stripe_customer_id', invoice.customer);
  
  // Send notification to user
  // TODO: Implement notification system
}

export default router;
```

---

## 🎨 **Frontend Updates**

### **1. Install Stripe React SDK:**
```bash
npm install @stripe/stripe-js @stripe/react-stripe-js
```

### **2. Create Stripe Provider (`src/components/StripeProvider.tsx`):**
```typescript
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';

const stripePromise = loadStripe(process.env.VITE_STRIPE_PUBLISHABLE_KEY!);

export const StripeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <Elements stripe={stripePromise}>
      {children}
    </Elements>
  );
};
```

### **3. Create Payment Method Form (`src/components/PaymentMethodForm.tsx`):**
```typescript
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { useState } from 'react';

export const PaymentMethodForm: React.FC<{ onSuccess: (paymentMethodId: string) => void }> = ({ onSuccess }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);
    const cardElement = elements.getElement(CardElement);
    
    const { error, paymentMethod } = await stripe.createPaymentMethod({
      type: 'card',
      card: cardElement!,
    });

    if (error) {
      console.error(error);
      alert(error.message);
    } else {
      onSuccess(paymentMethod.id);
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="p-4 border border-gray-300 rounded-md">
        <CardElement
          options={{
            style: {
              base: {
                fontSize: '16px',
                color: '#424770',
                '::placeholder': {
                  color: '#aab7c4',
                },
              },
            },
          }}
        />
      </div>
      <button
        type="submit"
        disabled={!stripe || loading}
        className="w-full bg-primary-600 text-white py-2 px-4 rounded-md hover:bg-primary-700 disabled:opacity-50"
      >
        {loading ? 'Processing...' : 'Add Payment Method'}
      </button>
    </form>
  );
};
```

### **4. Update Subscription Dashboard:**
```typescript
// Add payment method management
// Add billing history with Stripe data
// Add payment failure notifications
// Update subscription flows to use Stripe
```

---

## 🧪 **Testing Strategy**

### **1. Stripe Test Mode:**
- Use Stripe test keys
- Test all subscription flows
- Test webhook endpoints
- Test payment failures

### **2. Test Cards:**
```
Success: 4242 4242 4242 4242
Decline: 4000 0000 0000 0002
Insufficient funds: 4000 0000 0000 9995
```

### **3. Webhook Testing:**
- Use Stripe CLI for local testing
- Test all event types
- Verify database updates
- Test error handling

---

## 🚀 **Deployment Checklist**

### **1. Environment Setup:**
- [ ] Add Stripe keys to production environment
- [ ] Configure webhook endpoints in Stripe dashboard
- [ ] Set up webhook signature verification
- [ ] Test webhook delivery

### **2. Database Migration:**
- [ ] Run all schema updates
- [ ] Verify indexes are created
- [ ] Test RLS policies
- [ ] Backup existing data

### **3. Code Deployment:**
- [ ] Deploy updated code
- [ ] Test payment flows
- [ ] Verify webhook processing
- [ ] Monitor error logs

### **4. Go Live:**
- [ ] Switch to live Stripe keys
- [ ] Update webhook endpoints
- [ ] Monitor first payments
- [ ] Set up monitoring and alerts

---

## 📊 **Monitoring & Maintenance**

### **1. Key Metrics to Track:**
- Payment success rate
- Webhook processing time
- Failed payment recovery rate
- Subscription churn rate

### **2. Alerts to Set Up:**
- Webhook processing failures
- Payment failures
- Database connection issues
- High error rates

### **3. Regular Maintenance:**
- Monitor webhook event processing
- Clean up old webhook events
- Update Stripe API version
- Review and update pricing

---

## 💰 **Cost Considerations**

### **Stripe Fees:**
- 2.9% + 30¢ per successful charge
- No monthly fees
- Additional fees for international cards

### **Database Storage:**
- Webhook events table will grow over time
- Consider archiving old events
- Monitor storage usage

---

## 🔒 **Security Considerations**

### **1. Webhook Security:**
- Always verify webhook signatures
- Use HTTPS for webhook endpoints
- Implement rate limiting
- Log all webhook events

### **2. Data Protection:**
- Never store full card details
- Use Stripe's secure storage
- Implement proper access controls
- Regular security audits

---

## 📝 **Implementation Timeline**

### **Week 1: Database & Backend**
- Update database schema
- Implement Stripe service layer
- Update subscription API
- Create webhook handlers

### **Week 2: Frontend & Testing**
- Update frontend components
- Implement payment forms
- Test all flows
- Fix any issues

### **Week 3: Deployment & Go Live**
- Deploy to production
- Configure webhooks
- Test with real payments
- Monitor and optimize

---

This roadmap provides a complete path from the current database-only implementation to a full Stripe-integrated subscription system. Each phase builds on the previous one, ensuring a smooth transition to production-ready payment processing.
