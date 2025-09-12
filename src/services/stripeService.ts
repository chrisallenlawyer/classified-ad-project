import { loadStripe, Stripe } from '@stripe/stripe-js';
import { subscriptionApi } from './subscriptionApi';

// Initialize Stripe
let stripePromise: Promise<Stripe | null>;

export const initializeStripe = (publishableKey: string) => {
  if (!stripePromise) {
    stripePromise = loadStripe(publishableKey);
  }
  return stripePromise;
};

// Payment types
export interface PaymentIntent {
  id: string;
  client_secret: string;
  amount: number;
  currency: string;
  status: string;
}

export interface PaymentMethod {
  id: string;
  type: string;
  card?: {
    brand: string;
    last4: string;
    exp_month: number;
    exp_year: number;
  };
}

// Stripe service
export const stripeService = {
  // Initialize Stripe with publishable key
  async initialize() {
    try {
      const config = await subscriptionApi.getPricingConfig();
      const publishableKey = config.stripe_config?.publishable_key;
      
      if (!publishableKey) {
        throw new Error('Stripe publishable key not configured');
      }
      
      // For mock keys, return null to skip Stripe initialization
      if (publishableKey === 'pk_test_mock') {
        console.log('Using mock Stripe key - skipping Stripe initialization');
        return null;
      }
      
      return await initializeStripe(publishableKey);
    } catch (error) {
      console.error('Error initializing Stripe:', error);
      throw error;
    }
  },

  // Create payment intent for one-time payments
  async createPaymentIntent(
    amount: number,
    currency: string = 'usd',
    paymentType: 'featured_listing' | 'vehicle_listing' | 'one_time',
    description?: string
  ): Promise<PaymentIntent> {
    try {
      // In a real implementation, this would call your backend API
      // For now, we'll simulate the payment intent creation
      const mockPaymentIntent: PaymentIntent = {
        id: `pi_${Date.now()}`,
        client_secret: `pi_${Date.now()}_secret_${Math.random().toString(36).substr(2, 9)}`,
        amount: Math.round(amount * 100), // Convert to cents
        currency,
        status: 'requires_payment_method'
      };

      // Create payment record in database
      const { supabase } = await import('../lib/supabase');
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      await subscriptionApi.createPayment({
        user_id: currentUser.id,
        amount,
        currency: currency.toUpperCase(),
        payment_type: paymentType,
        payment_method: 'stripe',
        status: 'pending',
        description: description || `${paymentType} payment`,
        metadata: {
          stripe_payment_intent_id: mockPaymentIntent.id
        }
      });

      return mockPaymentIntent;
    } catch (error) {
      console.error('Error creating payment intent:', error);
      throw error;
    }
  },

  // Process payment with Stripe
  async processPayment(
    clientSecret: string,
    paymentMethodId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const stripe = await this.initialize();
      
      // If Stripe is not initialized (mock mode), simulate successful payment
      if (!stripe) {
        console.log('Mock mode: Simulating successful payment');
        
        try {
          // Update payment status in database
          const paymentIntentId = clientSecret.split('_secret_')[0];
          console.log('Updating payment status for:', paymentIntentId);
          
          await subscriptionApi.updatePaymentStatus(
            paymentIntentId,
            'succeeded',
            {
              payment_intent_id: paymentIntentId,
              charge_id: `ch_${Date.now()}`
            }
          );

          console.log('Payment status updated successfully');
          return { success: true };
        } catch (dbError) {
          console.error('Database update error:', dbError);
          // Even if database update fails, we can still return success for mock mode
          return { success: true };
        }
      }

      // Confirm payment intent with real Stripe
      const { error } = await stripe.confirmPayment({
        clientSecret: clientSecret,
        confirmParams: {
          payment_method: paymentMethodId,
          return_url: `${window.location.origin}/payment/success`
        }
      });

      if (error) {
        return { success: false, error: error.message };
      }

      // Update payment status in database
      // Extract payment intent ID from client secret
      const paymentIntentId = clientSecret.split('_secret_')[0];
      await subscriptionApi.updatePaymentStatus(
        paymentIntentId,
        'succeeded',
        {
          payment_intent_id: paymentIntentId,
          charge_id: `ch_${Date.now()}`
        }
      );

      return { success: true };
    } catch (error) {
      console.error('Error processing payment:', error);
      return { success: false, error: 'Payment processing failed' };
    }
  },

  // Create subscription
  async createSubscription(
    planId: string,
    paymentMethodId: string
  ): Promise<{ success: boolean; subscriptionId?: string; error?: string }> {
    try {
      const stripe = await this.initialize();
      
      // Get subscription plan details
      const plans = await subscriptionApi.getSubscriptionPlans();
      const plan = plans.find(p => p.id === planId);
      
      if (!plan) {
        throw new Error('Subscription plan not found');
      }

      // In a real implementation, this would call your backend API
      // For now, we'll simulate subscription creation
      const mockSubscriptionId = `sub_${Date.now()}`;
      
      // Create subscription record in database
      const { supabase } = await import('../lib/supabase');
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      const now = new Date();
      const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days from now

      await subscriptionApi.createPayment({
        user_id: currentUser.id,
        amount: plan.price_monthly,
        currency: 'USD',
        payment_type: 'subscription',
        payment_method: 'stripe',
        status: 'succeeded',
        description: `Subscription to ${plan.name} plan`,
        metadata: {
          stripe_subscription_id: mockSubscriptionId,
          plan_id: planId
        }
      });

      return { success: true, subscriptionId: mockSubscriptionId };
    } catch (error) {
      console.error('Error creating subscription:', error);
      return { success: false, error: 'Subscription creation failed' };
    }
  },

  // Get payment methods for user
  async getPaymentMethods(): Promise<PaymentMethod[]> {
    try {
      const stripe = await this.initialize();
      if (!stripe) {
        throw new Error('Stripe not initialized');
      }

      // In a real implementation, this would call your backend API
      // For now, we'll return mock data
      return [
        {
          id: 'pm_1234567890',
          type: 'card',
          card: {
            brand: 'visa',
            last4: '4242',
            exp_month: 12,
            exp_year: 2025
          }
        }
      ];
    } catch (error) {
      console.error('Error getting payment methods:', error);
      return [];
    }
  },

  // Add payment method
  async addPaymentMethod(): Promise<{ success: boolean; paymentMethodId?: string; error?: string }> {
    try {
      const stripe = await this.initialize();
      if (!stripe) {
        throw new Error('Stripe not initialized');
      }

      // Create payment method setup intent
      const { error, setupIntent } = await stripe.confirmSetup({
        elements: {
          // In a real implementation, you'd use Stripe Elements
        },
        confirmParams: {
          return_url: `${window.location.origin}/payment/success`
        }
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, paymentMethodId: setupIntent?.payment_method as string };
    } catch (error) {
      console.error('Error adding payment method:', error);
      return { success: false, error: 'Failed to add payment method' };
    }
  }
};

// Payment form component props
export interface PaymentFormProps {
  amount: number;
  currency?: string;
  paymentType: 'featured_listing' | 'vehicle_listing' | 'subscription';
  planId?: string;
  onSuccess: (paymentId: string) => void;
  onError: (error: string) => void;
  onCancel: () => void;
}

// Utility functions
export const formatPrice = (amount: number, currency: string = 'USD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase()
  }).format(amount);
};

export const formatPriceCents = (amountCents: number, currency: string = 'USD'): string => {
  return formatPrice(amountCents / 100, currency);
};

