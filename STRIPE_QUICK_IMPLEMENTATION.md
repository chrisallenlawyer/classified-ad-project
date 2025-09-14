# Stripe Integration - Quick Implementation Guide
## Critical Changes Needed Before Going Live

This is a condensed version of the full roadmap, focusing on the essential changes needed to integrate Stripe with the existing subscription system.

---

## 🚨 **Critical Database Changes**

### **1. Add Stripe Columns to `user_subscriptions`:**
```sql
-- Run this in Supabase SQL Editor
ALTER TABLE user_subscriptions 
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_price_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_status TEXT DEFAULT 'incomplete';

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_stripe_customer_id 
ON user_subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_stripe_subscription_id 
ON user_subscriptions(stripe_subscription_id);
```

### **2. Create Webhook Events Table:**
```sql
CREATE TABLE IF NOT EXISTS stripe_webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stripe_event_id TEXT UNIQUE NOT NULL,
    event_type TEXT NOT NULL,
    processed BOOLEAN DEFAULT FALSE,
    event_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 🔧 **Essential Backend Changes**

### **1. Install Stripe SDK:**
```bash
npm install stripe @stripe/stripe-js
```

### **2. Update Environment Variables:**
```env
# Add to .env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### **3. Create Stripe Service (`src/services/stripeService.ts`):**
```typescript
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export const stripeService = {
  async createCustomer(userId: string, email: string, name: string) {
    return await stripe.customers.create({
      email,
      name,
      metadata: { userId }
    });
  },

  async createSubscription(customerId: string, priceId: string, paymentMethodId: string) {
    return await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      default_payment_method: paymentMethodId,
      expand: ['latest_invoice.payment_intent'],
    });
  },

  async cancelSubscription(subscriptionId: string) {
    return await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });
  },

  verifyWebhookSignature(payload: string, signature: string) {
    return stripe.webhooks.constructEvent(
      payload,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  }
};
```

### **4. Update Subscription API Functions:**
```typescript
// In src/services/subscriptionApi.ts

// Update createUserSubscription to use Stripe
async createUserSubscription(userId: string, planId: string, paymentMethodId: string) {
  // 1. Get plan details
  const plan = await this.getSubscriptionPlan(planId);
  
  // 2. Get or create Stripe customer
  let customer = await this.getOrCreateStripeCustomer(userId);
  
  // 3. Create Stripe subscription
  const stripeSubscription = await stripeService.createSubscription(
    customer.id,
    plan.stripe_price_id,
    paymentMethodId
  );
  
  // 4. Save to database
  const { data, error } = await supabase
    .from('user_subscriptions')
    .insert({
      user_id: userId,
      plan_id: planId,
      stripe_customer_id: customer.id,
      stripe_subscription_id: stripeSubscription.id,
      stripe_price_id: plan.stripe_price_id,
      stripe_status: stripeSubscription.status,
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
  await stripeService.cancelSubscription(subscription.stripe_subscription_id);
  
  // Update database
  const { data, error } = await supabase
    .from('user_subscriptions')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
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

---

## 🎨 **Essential Frontend Changes**

### **1. Install Stripe React SDK:**
```bash
npm install @stripe/stripe-js @stripe/react-stripe-js
```

### **2. Update Subscription Plans with Stripe Price IDs:**
```sql
-- Add Stripe price IDs to subscription plans
UPDATE subscription_plans 
SET stripe_price_id = 'price_1234567890' 
WHERE name = 'Free Plan';

UPDATE subscription_plans 
SET stripe_price_id = 'price_0987654321' 
WHERE name = 'Pro Plan';
```

### **3. Add Payment Method Collection:**
```typescript
// In CreateListingForm.tsx - when payment is required
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

const stripePromise = loadStripe(process.env.VITE_STRIPE_PUBLISHABLE_KEY!);

// Add payment method collection before creating subscription
const PaymentMethodForm = ({ onSuccess }) => {
  const stripe = useStripe();
  const elements = useElements();
  
  const handleSubmit = async (event) => {
    event.preventDefault();
    const { error, paymentMethod } = await stripe.createPaymentMethod({
      type: 'card',
      card: elements.getElement(CardElement),
    });
    
    if (error) {
      alert(error.message);
    } else {
      onSuccess(paymentMethod.id);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <CardElement />
      <button type="submit">Add Payment Method</button>
    </form>
  );
};
```

---

## 🔗 **Webhook Implementation**

### **1. Create Webhook Endpoint:**
```typescript
// In your server routes
app.post('/webhooks/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const signature = req.headers['stripe-signature'];
  
  try {
    const event = stripeService.verifyWebhookSignature(req.body, signature);
    
    // Store event
    await supabase.from('stripe_webhook_events').insert({
      stripe_event_id: event.id,
      event_type: event.type,
      event_data: event.data.object,
    });

    // Handle event
    switch (event.type) {
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;
      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object);
        break;
    }
    
    res.json({ received: true });
  } catch (err) {
    res.status(400).send(`Webhook Error: ${err.message}`);
  }
});
```

### **2. Configure Webhook in Stripe Dashboard:**
- Endpoint URL: `https://yourdomain.com/webhooks/stripe`
- Events to send:
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_succeeded`
  - `invoice.payment_failed`

---

## 🧪 **Testing Checklist**

### **1. Test Mode Setup:**
- [ ] Use Stripe test keys
- [ ] Test subscription creation
- [ ] Test subscription cancellation
- [ ] Test webhook processing

### **2. Test Cards:**
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`

### **3. Webhook Testing:**
- Use Stripe CLI: `stripe listen --forward-to localhost:3000/webhooks/stripe`
- Test all event types
- Verify database updates

---

## 🚀 **Go Live Checklist**

### **1. Production Setup:**
- [ ] Switch to live Stripe keys
- [ ] Update webhook endpoints
- [ ] Test with real payment methods
- [ ] Monitor error logs

### **2. Database Migration:**
- [ ] Run schema updates
- [ ] Add Stripe price IDs to plans
- [ ] Test all subscription flows

### **3. Final Testing:**
- [ ] Test subscription creation
- [ ] Test cancellation
- [ ] Test payment failures
- [ ] Verify webhook processing

---

## ⚠️ **Critical Notes**

1. **Never store card details** - always use Stripe's secure storage
2. **Always verify webhook signatures** - prevents fraud
3. **Test thoroughly** - payment issues can be costly
4. **Monitor webhook processing** - failed webhooks can cause data inconsistencies
5. **Have a rollback plan** - in case of critical issues

---

This quick implementation guide covers the essential changes needed to integrate Stripe with your existing subscription system. The full roadmap provides more detailed implementation and testing strategies.
