-- Subscription and Pricing Schema for Supabase
-- This script creates all necessary tables for subscription management

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create subscription plans table
CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  price_monthly DECIMAL(10,2) NOT NULL,
  price_yearly DECIMAL(10,2),
  max_listings INTEGER NOT NULL DEFAULT 5,
  max_featured_listings INTEGER NOT NULL DEFAULT 0,
  max_vehicle_listings INTEGER NOT NULL DEFAULT 0,
  features JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user subscriptions table
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES subscription_plans(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired', 'suspended')),
  stripe_subscription_id VARCHAR(255),
  stripe_customer_id VARCHAR(255),
  current_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  current_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create payments table
CREATE TABLE IF NOT EXISTS payments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES user_subscriptions(id) ON DELETE SET NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  payment_type VARCHAR(50) NOT NULL CHECK (payment_type IN ('subscription', 'featured_listing', 'vehicle_listing', 'vehicle_featured_listing', 'one_time')),
  payment_method VARCHAR(50) NOT NULL,
  stripe_payment_intent_id VARCHAR(255),
  stripe_charge_id VARCHAR(255),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'succeeded', 'failed', 'refunded')),
  description TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create pricing configuration table
CREATE TABLE IF NOT EXISTS pricing_config (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  config_key VARCHAR(100) NOT NULL UNIQUE,
  config_value JSONB NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user listing usage tracking table
CREATE TABLE IF NOT EXISTS user_listing_usage (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES user_subscriptions(id) ON DELETE SET NULL,
  month_year VARCHAR(7) NOT NULL, -- Format: YYYY-MM
  free_listings_used INTEGER DEFAULT 0,
  featured_listings_used INTEGER DEFAULT 0,
  vehicle_listings_used INTEGER DEFAULT 0,
  total_listings_created INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, month_year)
);

-- Add new columns to listings table for subscription features
ALTER TABLE listings 
ADD COLUMN IF NOT EXISTS listing_type VARCHAR(20) DEFAULT 'free' CHECK (listing_type IN ('free', 'featured', 'vehicle')),
ADD COLUMN IF NOT EXISTS listing_fee DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS zip_code VARCHAR(10),
ADD COLUMN IF NOT EXISTS condition VARCHAR(50) DEFAULT 'good';

-- Add is_vehicle column to categories table
ALTER TABLE categories 
ADD COLUMN IF NOT EXISTS is_vehicle BOOLEAN DEFAULT FALSE;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_plan_id ON user_subscriptions(plan_id);

-- Create partial unique index to ensure only one active subscription per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_subscriptions_active_unique 
ON user_subscriptions(user_id) 
WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_subscription_id ON payments(subscription_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_user_listing_usage_user_id ON user_listing_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_user_listing_usage_month_year ON user_listing_usage(month_year);
CREATE INDEX IF NOT EXISTS idx_listings_listing_type ON listings(listing_type);
CREATE INDEX IF NOT EXISTS idx_listings_is_featured ON listings(is_featured);
CREATE INDEX IF NOT EXISTS idx_categories_is_vehicle ON categories(is_vehicle);

-- Insert default subscription plans
INSERT INTO subscription_plans (name, description, price_monthly, max_listings, max_featured_listings, max_vehicle_listings, features, sort_order) VALUES
('Free', 'Basic listing with limited features', 0.00, 5, 0, 0, '["5 free listings per month", "Basic search visibility", "Standard listing duration"]', 1),
('Basic', 'More listings and better visibility', 9.99, 25, 2, 1, '["25 listings per month", "2 featured listings", "1 vehicle listing", "Priority support", "Enhanced search visibility"]', 2),
('Professional', 'For serious sellers', 19.99, 100, 10, 5, '["100 listings per month", "10 featured listings", "5 vehicle listings", "Priority support", "Analytics dashboard", "Bulk upload tools"]', 3),
('Enterprise', 'Unlimited listings for businesses', 49.99, -1, -1, -1, '["Unlimited listings", "Unlimited featured listings", "Unlimited vehicle listings", "Priority support", "Advanced analytics", "API access", "Custom branding"]', 4)
ON CONFLICT (name) DO NOTHING;

-- Insert default pricing configuration
INSERT INTO pricing_config (config_key, config_value, description) VALUES
('featured_listing_price', '{"amount": 5.00, "currency": "USD"}', 'Price for featured listing upgrade'),
('vehicle_listing_price', '{"amount": 20.00, "currency": "USD"}', 'Price for vehicle listing'),
('vehicle_featured_listing_price', '{"amount": 25.00, "currency": "USD"}', 'Price for vehicle + featured listing'),
('free_listing_limit', '5'::jsonb, 'Number of free listings per month'),
('listing_duration_days', '30'::jsonb, 'Default listing duration in days')
ON CONFLICT (config_key) DO NOTHING;

-- Update existing 'Vehicles' category to be a vehicle category
UPDATE categories 
SET is_vehicle = TRUE 
WHERE name = 'Vehicles';

-- Enable Row Level Security (RLS)
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_listing_usage ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for subscription_plans (public read access)
DROP POLICY IF EXISTS "Subscription plans are viewable by everyone" ON subscription_plans;
CREATE POLICY "Subscription plans are viewable by everyone" ON subscription_plans
  FOR SELECT USING (true);

-- Create RLS policies for user_subscriptions
DROP POLICY IF EXISTS "Users can view their own subscriptions" ON user_subscriptions;
CREATE POLICY "Users can view their own subscriptions" ON user_subscriptions
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own subscriptions" ON user_subscriptions;
CREATE POLICY "Users can insert their own subscriptions" ON user_subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own subscriptions" ON user_subscriptions;
CREATE POLICY "Users can update their own subscriptions" ON user_subscriptions
  FOR UPDATE USING (auth.uid() = user_id);

-- Create RLS policies for payments
DROP POLICY IF EXISTS "Users can view their own payments" ON payments;
CREATE POLICY "Users can view their own payments" ON payments
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own payments" ON payments;
CREATE POLICY "Users can insert their own payments" ON payments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for pricing_config (admin only for write, public read)
DROP POLICY IF EXISTS "Pricing config is viewable by everyone" ON pricing_config;
CREATE POLICY "Pricing config is viewable by everyone" ON pricing_config
  FOR SELECT USING (true);

-- Create RLS policies for user_listing_usage
DROP POLICY IF EXISTS "Users can view their own usage" ON user_listing_usage;
CREATE POLICY "Users can view their own usage" ON user_listing_usage
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own usage" ON user_listing_usage;
CREATE POLICY "Users can insert their own usage" ON user_listing_usage
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own usage" ON user_listing_usage;
CREATE POLICY "Users can update their own usage" ON user_listing_usage
  FOR UPDATE USING (auth.uid() = user_id);

-- Create functions for subscription management
DROP FUNCTION IF EXISTS can_user_create_listing(UUID, TEXT);
CREATE OR REPLACE FUNCTION can_user_create_listing(
  user_uuid UUID,
  listing_type TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  user_subscription RECORD;
  current_usage RECORD;
  current_month TEXT;
  plan_max_listings INTEGER;
  plan_max_featured INTEGER;
  plan_max_vehicle INTEGER;
  current_featured INTEGER;
  current_vehicle INTEGER;
  current_free INTEGER;
BEGIN
  -- Get current month in YYYY-MM format
  current_month := TO_CHAR(NOW(), 'YYYY-MM');
  
  -- Get user's active subscription
  SELECT us.*, sp.max_listings, sp.max_featured_listings, sp.max_vehicle_listings
  INTO user_subscription
  FROM user_subscriptions us
  JOIN subscription_plans sp ON us.plan_id = sp.id
  WHERE us.user_id = user_uuid 
    AND us.status = 'active' 
    AND us.current_period_end > NOW();
  
  -- Get current month's usage
  SELECT 
    COALESCE(free_listings_used, 0) as free_used,
    COALESCE(featured_listings_used, 0) as featured_used,
    COALESCE(vehicle_listings_used, 0) as vehicle_used
  INTO current_usage
  FROM user_listing_usage
  WHERE user_id = user_uuid AND month_year = current_month;
  
  -- If no usage record exists, create one
  IF current_usage IS NULL THEN
    INSERT INTO user_listing_usage (user_id, month_year)
    VALUES (user_uuid, current_month);
    
    current_free := 0;
    current_featured := 0;
    current_vehicle := 0;
  ELSE
    current_free := current_usage.free_used;
    current_featured := current_usage.featured_used;
    current_vehicle := current_usage.vehicle_used;
  END IF;
  
  -- If no subscription, use free plan limits
  IF user_subscription IS NULL THEN
    plan_max_listings := 5;
    plan_max_featured := 0;
    plan_max_vehicle := 0;
  ELSE
    plan_max_listings := user_subscription.max_listings;
    plan_max_featured := user_subscription.max_featured_listings;
    plan_max_vehicle := user_subscription.max_vehicle_listings;
  END IF;
  
  -- Check limits based on listing type
  CASE listing_type
    WHEN 'free' THEN
      RETURN current_free < plan_max_listings;
    WHEN 'featured' THEN
      RETURN current_featured < plan_max_featured;
    WHEN 'vehicle' THEN
      RETURN current_vehicle < plan_max_vehicle;
    ELSE
      RETURN FALSE;
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get user subscription
DROP FUNCTION IF EXISTS get_user_subscription(UUID);
CREATE OR REPLACE FUNCTION get_user_subscription(user_uuid UUID)
RETURNS TABLE (
  id UUID,
  plan_id UUID,
  status TEXT,
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  cancel_at_period_end BOOLEAN,
  plan_name TEXT,
  plan_price DECIMAL,
  plan_max_listings INTEGER,
  plan_max_featured INTEGER,
  plan_max_vehicle INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    us.id,
    us.plan_id,
    us.status,
    us.current_period_start,
    us.current_period_end,
    us.cancel_at_period_end,
    sp.name as plan_name,
    sp.price_monthly as plan_price,
    sp.max_listings as plan_max_listings,
    sp.max_featured_listings as plan_max_featured,
    sp.max_vehicle_listings as plan_max_vehicle
  FROM user_subscriptions us
  JOIN subscription_plans sp ON us.plan_id = sp.id
  WHERE us.user_id = user_uuid 
    AND us.status = 'active' 
    AND us.current_period_end > NOW()
  ORDER BY us.created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get pricing configuration
DROP FUNCTION IF EXISTS get_pricing_config();
CREATE OR REPLACE FUNCTION get_pricing_config()
RETURNS TABLE (
  config_key TEXT,
  config_value JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pc.config_key::TEXT,
    pc.config_value
  FROM pricing_config pc
  WHERE pc.is_active = TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to track listing usage
DROP FUNCTION IF EXISTS track_listing_usage_on_insert();
CREATE OR REPLACE FUNCTION track_listing_usage_on_insert()
RETURNS TRIGGER AS $$
DECLARE
  current_month TEXT;
  usage_record RECORD;
BEGIN
  -- Get current month in YYYY-MM format
  current_month := TO_CHAR(NOW(), 'YYYY-MM');
  
  -- Get or create usage record for this month
  SELECT * INTO usage_record
  FROM user_listing_usage
  WHERE user_id = NEW.user_id AND month_year = current_month;
  
  IF usage_record IS NULL THEN
    -- Create new usage record
    INSERT INTO user_listing_usage (user_id, month_year)
    VALUES (NEW.user_id, current_month);
  END IF;
  
  -- Update usage counts based on listing type
  CASE NEW.listing_type
    WHEN 'free' THEN
      UPDATE user_listing_usage 
      SET 
        free_listings_used = free_listings_used + 1,
        total_listings_created = total_listings_created + 1,
        updated_at = NOW()
      WHERE user_id = NEW.user_id AND month_year = current_month;
    WHEN 'featured' THEN
      UPDATE user_listing_usage 
      SET 
        featured_listings_used = featured_listings_used + 1,
        total_listings_created = total_listings_created + 1,
        updated_at = NOW()
      WHERE user_id = NEW.user_id AND month_year = current_month;
    WHEN 'vehicle' THEN
      UPDATE user_listing_usage 
      SET 
        vehicle_listings_used = vehicle_listings_used + 1,
        total_listings_created = total_listings_created + 1,
        updated_at = NOW()
      WHERE user_id = NEW.user_id AND month_year = current_month;
  END CASE;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create function to track listing usage on delete
DROP FUNCTION IF EXISTS track_listing_usage_on_delete();
CREATE OR REPLACE FUNCTION track_listing_usage_on_delete()
RETURNS TRIGGER AS $$
DECLARE
  current_month TEXT;
BEGIN
  -- Get current month in YYYY-MM format
  current_month := TO_CHAR(NOW(), 'YYYY-MM');
  
  -- Decrement usage counts based on listing type
  CASE OLD.listing_type
    WHEN 'free' THEN
      UPDATE user_listing_usage 
      SET 
        free_listings_used = GREATEST(free_listings_used - 1, 0),
        total_listings_created = GREATEST(total_listings_created - 1, 0),
        updated_at = NOW()
      WHERE user_id = OLD.user_id AND month_year = current_month;
    WHEN 'featured' THEN
      UPDATE user_listing_usage 
      SET 
        featured_listings_used = GREATEST(featured_listings_used - 1, 0),
        total_listings_created = GREATEST(total_listings_created - 1, 0),
        updated_at = NOW()
      WHERE user_id = OLD.user_id AND month_year = current_month;
    WHEN 'vehicle' THEN
      UPDATE user_listing_usage 
      SET 
        vehicle_listings_used = GREATEST(vehicle_listings_used - 1, 0),
        total_listings_created = GREATEST(total_listings_created - 1, 0),
        updated_at = NOW()
      WHERE user_id = OLD.user_id AND month_year = current_month;
  END CASE;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for usage tracking
CREATE TRIGGER track_listing_usage_insert
  AFTER INSERT ON listings
  FOR EACH ROW
  EXECUTE FUNCTION track_listing_usage_on_insert();

CREATE TRIGGER track_listing_usage_delete
  AFTER DELETE ON listings
  FOR EACH ROW
  EXECUTE FUNCTION track_listing_usage_on_delete();

-- Create function to recalculate user usage
DROP FUNCTION IF EXISTS recalculate_user_listing_usage(UUID, TEXT);
CREATE OR REPLACE FUNCTION recalculate_user_listing_usage(user_uuid UUID, target_month TEXT DEFAULT NULL)
RETURNS VOID AS $$
DECLARE
  current_month TEXT;
  usage_counts RECORD;
BEGIN
  -- Use provided month or current month
  current_month := COALESCE(target_month, TO_CHAR(NOW(), 'YYYY-MM'));
  
  -- Get actual counts from listings table
  SELECT 
    COUNT(*) FILTER (WHERE listing_type = 'free') as free_count,
    COUNT(*) FILTER (WHERE listing_type = 'featured') as featured_count,
    COUNT(*) FILTER (WHERE listing_type = 'vehicle') as vehicle_count,
    COUNT(*) as total_count
  INTO usage_counts
  FROM listings
  WHERE user_id = user_uuid 
    AND TO_CHAR(created_at, 'YYYY-MM') = current_month;
  
  -- Update or insert usage record
  INSERT INTO user_listing_usage (user_id, month_year, free_listings_used, featured_listings_used, vehicle_listings_used, total_listings_created)
  VALUES (user_uuid, current_month, usage_counts.free_count, usage_counts.featured_count, usage_counts.vehicle_count, usage_counts.total_count)
  ON CONFLICT (user_id, month_year)
  DO UPDATE SET
    free_listings_used = usage_counts.free_count,
    featured_listings_used = usage_counts.featured_count,
    vehicle_listings_used = usage_counts.vehicle_count,
    total_listings_created = usage_counts.total_count,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to recalculate all user usage
DROP FUNCTION IF EXISTS recalculate_all_user_listing_usage(TEXT);
CREATE OR REPLACE FUNCTION recalculate_all_user_listing_usage(target_month TEXT DEFAULT NULL)
RETURNS VOID AS $$
DECLARE
  current_month TEXT;
  user_record RECORD;
BEGIN
  -- Use provided month or current month
  current_month := COALESCE(target_month, TO_CHAR(NOW(), 'YYYY-MM'));
  
  -- Recalculate for all users who have listings in the target month
  FOR user_record IN 
    SELECT DISTINCT user_id 
    FROM listings 
    WHERE TO_CHAR(created_at, 'YYYY-MM') = current_month
  LOOP
    PERFORM recalculate_user_listing_usage(user_record.user_id, current_month);
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
