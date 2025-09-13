import { supabase } from '../lib/supabase';

// Types for subscription management
export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price_monthly: number;
  price_yearly?: number;
  max_listings: number;
  max_featured_listings: number;
  max_vehicle_listings: number;
  features: string[];
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface PricingConfig {
  id: string;
  config_key: string;
  config_value: any;
  description: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserSubscription {
  id: string;
  user_id: string;
  plan_id: string;
  status: 'active' | 'cancelled' | 'expired' | 'suspended';
  stripe_subscription_id?: string;
  stripe_customer_id?: string;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  cancelled_at?: string;
  created_at: string;
  updated_at: string;
  subscription_plan?: SubscriptionPlan;
}

export interface Payment {
  id: string;
  user_id: string;
  subscription_id?: string;
  amount: number;
  currency: string;
  payment_type: 'subscription' | 'featured_listing' | 'vehicle_listing' | 'one_time';
  payment_method: string;
  stripe_payment_intent_id?: string;
  stripe_charge_id?: string;
  status: 'pending' | 'succeeded' | 'failed' | 'refunded';
  description?: string;
  metadata: any;
  created_at: string;
  updated_at: string;
}

// Subscription Plans API
export const subscriptionApi = {
  // Get all subscription plans
  async getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
    const { data, error } = await supabase
      .from('subscription_plans')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  // Get active subscription plans
  async getActiveSubscriptionPlans(): Promise<SubscriptionPlan[]> {
    const { data, error } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  // Create subscription plan
  async createSubscriptionPlan(plan: Omit<SubscriptionPlan, 'id' | 'created_at' | 'updated_at'>): Promise<SubscriptionPlan> {
    const { data, error } = await supabase
      .from('subscription_plans')
      .insert(plan)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Update subscription plan
  async updateSubscriptionPlan(id: string, updates: Partial<SubscriptionPlan>): Promise<SubscriptionPlan> {
    const { data, error } = await supabase
      .from('subscription_plans')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Delete subscription plan
  async deleteSubscriptionPlan(id: string): Promise<void> {
    const { error } = await supabase
      .from('subscription_plans')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  // Get user's current subscription
  async getUserSubscription(userId: string): Promise<UserSubscription | null> {
    const { data, error } = await supabase
      .from('user_subscriptions')
      .select(`
        *,
        subscription_plan:subscription_plans(*)
      `)
      .eq('user_id', userId)
      .eq('status', 'active')
      .gte('current_period_end', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      // If no subscription exists, create a default free one
      if (error.code === 'PGRST116') {
        return await this.createDefaultSubscription(userId);
      }
      throw error;
    }
    return data;
  },

  // Create default free subscription for a user
  async createDefaultSubscription(userId: string): Promise<UserSubscription | null> {
    // First get the free plan
    const { data: freePlan, error: planError } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('name', 'Free')
      .eq('is_active', true)
      .single();

    if (planError || !freePlan) {
      console.error('Could not find free plan:', planError);
      return null;
    }

    // Create subscription
    const { data, error } = await supabase
      .from('user_subscriptions')
      .insert({
        user_id: userId,
        plan_id: freePlan.id,
        status: 'active',
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days from now
      })
      .select(`
        *,
        subscription_plan:subscription_plans(*)
      `)
      .single();

    if (error) {
      console.error('Could not create default subscription:', error);
      return null;
    }

    return data;
  },

  // Get user's subscription history
  async getUserSubscriptionHistory(userId: string): Promise<UserSubscription[]> {
    const { data, error } = await supabase
      .from('user_subscriptions')
      .select(`
        *,
        subscription_plan:subscription_plans(*)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Get user's payments
  async getUserPayments(userId: string): Promise<Payment[]> {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Check if user can create listing (new logic: free listings are a pool)
  async canUserCreateListing(userId: string, listingType: 'free' | 'featured' | 'vehicle'): Promise<{ canCreate: boolean; reason?: string; canPayForAdditional?: boolean; additionalCost?: number }> {
    console.log('API: Checking canUserCreateListing for:', userId, listingType);
    
    try {
      // Get user's subscription and usage data
      const [subscription, usage] = await Promise.all([
        this.getUserSubscription(userId),
        this.getUserUsage(userId)
      ]);

      console.log('API: Subscription data:', subscription);
      console.log('API: Usage data:', usage);

      const currentUsage = usage || {
        free_listings_used: 0,
        featured_listings_used: 0,
        vehicle_listings_used: 0
      };

      // Get free listing limit (this is the total pool of free listings)
      let freeLimit = 5; // Default free limit
      if (subscription?.subscription_plan) {
        freeLimit = subscription.subscription_plan.max_listings || 5;
      }

      const freeUsed = currentUsage.free_listings_used || 0;
      const canCreateFree = freeUsed < freeLimit;

      console.log(`API: Free limit check: ${freeUsed}/${freeLimit}, canCreate: ${canCreateFree}`);

      // If user can create free listings, they can create any type (free, featured, vehicle)
      if (canCreateFree) {
        return { 
          canCreate: true,
          canPayForAdditional: true // They can always pay for more after free limit
        };
      }

      // If free limit reached, check if they can pay for additional listings
      const additionalCost = await this.getAdditionalListingCost();
      return {
        canCreate: false,
        reason: `You've reached your free listing limit (${freeLimit}). You can pay $${additionalCost} for additional listings.`,
        canPayForAdditional: true,
        additionalCost
      };

    } catch (error) {
      console.error('API: Error checking limits:', error);
      return { 
        canCreate: true, // Allow on error for free listings
        canPayForAdditional: true
      };
    }
  },

  // Get cost for additional listings after free limit is reached
  async getAdditionalListingCost(): Promise<number> {
    try {
      const { data } = await supabase
        .from('pricing_config')
        .select('config_value')
        .eq('config_key', 'additional_listing_price')
        .single();
      
      return data?.config_value || 5.00;
    } catch (error) {
      console.error('Error getting additional listing cost:', error);
      return 5.00; // Default cost
    }
  },

  // Get cost for additional featured/vehicle modifiers
  async getAdditionalModifierCost(type: 'featured' | 'vehicle'): Promise<number> {
    try {
      const configKey = type === 'featured' ? 'additional_featured_price' : 'additional_vehicle_price';
      const { data } = await supabase
        .from('pricing_config')
        .select('config_value')
        .eq('config_key', configKey)
        .single();
      
      return data?.config_value || (type === 'featured' ? 2.99 : 4.99);
    } catch (error) {
      console.error(`Error getting ${type} modifier cost:`, error);
      return type === 'featured' ? 2.99 : 4.99;
    }
  },

  // Get user's current usage for the month
  async getUserUsage(userId: string): Promise<any> {
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
    
    const { data, error } = await supabase
      .from('user_listing_usage')
      .select('*')
      .eq('user_id', userId)
      .eq('month_year', currentMonth)
      .single();

    if (error && error.code !== 'PGRST116') {
      // If no usage record exists, create one
      if (error.code === 'PGRST116') {
        return await this.createDefaultUsage(userId, currentMonth);
      }
      throw error;
    }
    return data;
  },

  // Create default usage record for a user
  async createDefaultUsage(userId: string, monthYear: string): Promise<any> {
    const { data, error } = await supabase
      .from('user_listing_usage')
      .insert({
        user_id: userId,
        month_year: monthYear,
        free_listings_used: 0,
        featured_listings_used: 0,
        vehicle_listings_used: 0
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Get pricing configuration
  async getPricingConfig(): Promise<Record<string, any>> {
    const { data, error } = await supabase
      .from('pricing_config')
      .select('*')
      .eq('is_active', true);

    if (error) throw error;
    
    const config: Record<string, any> = {};
    data?.forEach(item => {
      config[item.config_key] = item.config_value;
    });
    
    return config;
  },

  // Update pricing configuration
  async updatePricingConfig(configKey: string, configValue: any): Promise<PricingConfig> {
    const { data, error } = await supabase
      .from('pricing_config')
      .update({ config_value: configValue })
      .eq('config_key', configKey)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Get user listing usage for current month
  async getUserListingUsage(userId: string): Promise<any> {
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
    
    const { data, error } = await supabase
      .from('user_listing_usage')
      .select('*')
      .eq('user_id', userId)
      .eq('month_year', currentMonth)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows returned
    return data;
  },

  // Create payment record
  async createPayment(payment: Omit<Payment, 'id' | 'created_at' | 'updated_at'>): Promise<Payment> {
    const { data, error } = await supabase
      .from('payments')
      .insert(payment)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Update payment status
  async updatePaymentStatus(paymentIntentId: string, status: Payment['status'], stripeData?: any): Promise<Payment> {
    const updates: any = { status };
    if (stripeData) {
      if (stripeData.payment_intent_id) updates.stripe_payment_intent_id = stripeData.payment_intent_id;
      if (stripeData.charge_id) updates.stripe_charge_id = stripeData.charge_id;
    }

    const { data, error } = await supabase
      .from('payments')
      .update(updates)
      .eq('stripe_payment_intent_id', paymentIntentId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};
