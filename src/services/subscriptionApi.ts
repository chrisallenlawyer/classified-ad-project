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

  // Check if user can create listing (corrected logic with separate limits)
  async canUserCreateListing(userId: string, listingType: 'free' | 'featured' | 'vehicle'): Promise<{ 
    canCreate: boolean; 
    reason?: string; 
    canPayForAdditional?: boolean; 
    additionalCost?: number;
    requiresPayment?: boolean;
    paymentType?: 'additional_basic' | 'additional_vehicle' | 'additional_featured';
  }> {
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

      // Get limits from subscription plan
      let freeLimit = 5; // Default free limit
      let maxFeaturedInFree = 1; // Default max featured in free pool
      let maxVehicleInFree = 1; // Default max vehicle in free pool
      
      if (subscription?.subscription_plan) {
        freeLimit = subscription.subscription_plan.max_listings || 5;
        maxFeaturedInFree = subscription.subscription_plan.max_featured_listings || 1;
        maxVehicleInFree = subscription.subscription_plan.max_vehicle_listings || 1;
      }

      const freeUsed = currentUsage.free_listings_used || 0;
      const featuredUsed = currentUsage.featured_listings_used || 0;
      const vehicleUsed = currentUsage.vehicle_listings_used || 0;

      console.log(`API: Usage - Free: ${freeUsed}/${freeLimit}, Featured: ${featuredUsed}/${maxFeaturedInFree}, Vehicle: ${vehicleUsed}/${maxVehicleInFree}`);

      // Check if user can create this type of listing for free
      if (freeUsed < freeLimit) {
        // User has free listings remaining
        if (listingType === 'free') {
          // Basic free listing - always allowed if free pool not exhausted
          return { 
            canCreate: true,
            canPayForAdditional: true,
            requiresPayment: false
          };
        } else if (listingType === 'featured') {
          // Featured listing - check if they can use featured in free pool
          if (featuredUsed < maxFeaturedInFree) {
            return { 
              canCreate: true,
              canPayForAdditional: true,
              requiresPayment: false
            };
          } else {
            // Can't use featured in free pool, but can pay for additional featured
            const featuredCost = await this.getAdditionalModifierCost('featured');
            return {
              canCreate: false,
              reason: `You've used all ${maxFeaturedInFree} featured listing(s) in your free pool. You can pay $${featuredCost} for additional featured listings.`,
              canPayForAdditional: true,
              additionalCost: featuredCost,
              requiresPayment: true,
              paymentType: 'additional_featured'
            };
          }
        } else if (listingType === 'vehicle') {
          // Vehicle listing - check if they can use vehicle in free pool
          if (vehicleUsed < maxVehicleInFree) {
            return { 
              canCreate: true,
              canPayForAdditional: true,
              requiresPayment: false
            };
          } else {
            // Can't use vehicle in free pool, but can pay for additional vehicle
            const vehicleCost = await this.getAdditionalModifierCost('vehicle');
            return {
              canCreate: false,
              reason: `You've used all ${maxVehicleInFree} vehicle listing(s) in your free pool. You can pay $${vehicleCost} for additional vehicle listings.`,
              canPayForAdditional: true,
              additionalCost: vehicleCost,
              requiresPayment: true,
              paymentType: 'additional_vehicle'
            };
          }
        }
      }

      // No free listings remaining - check if they can pay for additional
      if (listingType === 'free') {
        // Basic free listing - they can pay for additional
        const additionalCost = await this.getAdditionalListingCost();
        return {
          canCreate: false,
          reason: `You've reached your free listing limit (${freeLimit}). You can pay $${additionalCost} for additional basic listings.`,
          canPayForAdditional: true,
          additionalCost,
          requiresPayment: true,
          paymentType: 'additional_basic'
        };
      } else if (listingType === 'featured') {
        // Featured listing - they can pay for additional featured
        const featuredCost = await this.getAdditionalModifierCost('featured');
        return {
          canCreate: false,
          reason: `You've reached your free listing limit (${freeLimit}). You can pay $${featuredCost} for additional featured listings.`,
          canPayForAdditional: true,
          additionalCost: featuredCost,
          requiresPayment: true,
          paymentType: 'additional_featured'
        };
      } else if (listingType === 'vehicle') {
        // Vehicle listing - they can pay for additional vehicle
        const vehicleCost = await this.getAdditionalModifierCost('vehicle');
        return {
          canCreate: false,
          reason: `You've reached your free listing limit (${freeLimit}). You can pay $${vehicleCost} for additional vehicle listings.`,
          canPayForAdditional: true,
          additionalCost: vehicleCost,
          requiresPayment: true,
          paymentType: 'additional_vehicle'
        };
      }

      return {
        canCreate: false,
        reason: 'Unable to determine listing type.',
        canPayForAdditional: false
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

  // Update user usage tracking (corrected logic with proper counting)
  async updateUserListingUsage(userId: string, listingType: 'free' | 'featured' | 'vehicle', isPaidAdditional: boolean = false): Promise<void> {
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
    
    try {
      // Get current usage record
      const { data: existingUsage, error: fetchError } = await supabase
        .from('user_listing_usage')
        .select('*')
        .eq('user_id', userId)
        .eq('month_year', currentMonth)
        .single();
      
      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Error fetching usage data:', fetchError);
        return;
      }

      const currentUsage = existingUsage || {
        free_listings_used: 0,
        featured_listings_used: 0,
        vehicle_listings_used: 0,
        total_listings_created: 0
      };

      // Update usage based on listing type and payment status
      const updates: any = {
        total_listings_created: currentUsage.total_listings_created + 1
      };

      if (isPaidAdditional) {
        // Paid additional listing - only count the specific type, NOT free
        console.log('Paid additional listing - not counting against free pool');
        if (listingType === 'featured') {
          updates.featured_listings_used = (currentUsage.featured_listings_used || 0) + 1;
        } else if (listingType === 'vehicle') {
          updates.vehicle_listings_used = (currentUsage.vehicle_listings_used || 0) + 1;
        } else if (listingType === 'free') {
          // Additional basic listing - don't count against free pool
          // Just count total listings created
        }
        // Don't increment free_listings_used for paid additional listings
      } else {
        // Free listing - count against free pool and any modifiers
        console.log('Free listing - counting against free pool');
        updates.free_listings_used = (currentUsage.free_listings_used || 0) + 1;
        
        if (listingType === 'featured') {
          updates.featured_listings_used = (currentUsage.featured_listings_used || 0) + 1;
        }
        if (listingType === 'vehicle') {
          updates.vehicle_listings_used = (currentUsage.vehicle_listings_used || 0) + 1;
        }
      }

      updates.updated_at = new Date().toISOString();

      if (existingUsage) {
        // Update existing usage record
        const { error: updateError } = await supabase
          .from('user_listing_usage')
          .update(updates)
          .eq('user_id', userId)
          .eq('month_year', currentMonth);

        if (updateError) {
          console.error('Error updating usage:', updateError);
        }
      } else {
        // Create new usage record
        const { error: insertError } = await supabase
          .from('user_listing_usage')
          .insert({
            user_id: userId,
            month_year: currentMonth,
            ...updates
          });

        if (insertError) {
          console.error('Error creating usage record:', insertError);
        }
      }

      console.log('Usage updated:', updates);
    } catch (error) {
      console.error('Error updating user listing usage:', error);
    }
  },

  // Update user's subscription plan
  async updateUserSubscription(userId: string, planId: string): Promise<UserSubscription> {
    const { data, error } = await supabase
      .from('user_subscriptions')
      .update({ 
        subscription_plan_id: planId,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .select(`
        *,
        subscription_plan:subscription_plans(*)
      `)
      .single();

    if (error) throw error;
    return data;
  },

  // Get user's current usage for the month (based on actual listing creation dates)
  async getUserUsage(userId: string): Promise<any> {
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
    
    try {
      // Get actual usage from listings created in the last 31 days
      const thirtyOneDaysAgo = new Date();
      thirtyOneDaysAgo.setDate(thirtyOneDaysAgo.getDate() - 31);
      
      const { data: listings, error: listingsError } = await supabase
        .from('listings')
        .select('id, listing_type, is_featured, is_promoted, created_at, listing_fee')
        .eq('user_id', userId)
        .gte('created_at', thirtyOneDaysAgo.toISOString())
        .order('created_at', { ascending: false });

      if (listingsError) {
        console.error('Error fetching listings for usage:', listingsError);
        return null;
      }

      // Calculate usage based on actual listings
      let freeListingsUsed = 0;
      let featuredListingsUsed = 0;
      let vehicleListingsUsed = 0;

      listings?.forEach(listing => {
        // Check if this was a free listing (no fee charged)
        const wasFree = !listing.listing_fee || listing.listing_fee === 0;
        
        if (wasFree) {
          // Free listing - counts against free pool
          freeListingsUsed++;
          
          if (listing.is_featured) {
            featuredListingsUsed++;
          }
          if (listing.listing_type === 'vehicle') {
            vehicleListingsUsed++;
          }
        } else {
          // Paid listing - doesn't count against free pool, but counts for type
          if (listing.is_featured) {
            featuredListingsUsed++;
          }
          if (listing.listing_type === 'vehicle') {
            vehicleListingsUsed++;
          }
        }
      });

      return {
        free_listings_used: freeListingsUsed,
        featured_listings_used: featuredListingsUsed,
        vehicle_listings_used: vehicleListingsUsed,
        total_listings_created: listings?.length || 0
      };

    } catch (error) {
      console.error('Error calculating usage from listings:', error);
      return null;
    }
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
  },

  // Check if usage limits should reset (31 days)
  async shouldResetUsage(userId: string): Promise<boolean> {
    try {
      const { data: usage } = await supabase
        .from('user_listing_usage')
        .select('created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!usage) return false;

      const lastUsageDate = new Date(usage.created_at);
      const now = new Date();
      const daysSinceLastUsage = Math.floor((now.getTime() - lastUsageDate.getTime()) / (1000 * 60 * 60 * 24));

      return daysSinceLastUsage >= 31;
    } catch (error) {
      console.error('Error checking usage reset:', error);
      return false;
    }
  },

  // Reset usage for a user (called when 31 days have passed)
  async resetUserUsage(userId: string): Promise<void> {
    try {
      // Delete old usage records
      await supabase
        .from('user_listing_usage')
        .delete()
        .eq('user_id', userId);

      console.log('Usage reset for user:', userId);
    } catch (error) {
      console.error('Error resetting user usage:', error);
    }
  }
};
