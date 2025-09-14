-- Add downgrade_to_plan_id column to user_subscriptions table
-- This tracks what plan the user will switch to when their current term expires

ALTER TABLE user_subscriptions 
ADD COLUMN IF NOT EXISTS downgrade_to_plan_id UUID;

-- Add foreign key constraint
ALTER TABLE user_subscriptions 
ADD CONSTRAINT fk_user_subscriptions_downgrade_plan_id 
FOREIGN KEY (downgrade_to_plan_id) 
REFERENCES subscription_plans(id);

-- Add comment
COMMENT ON COLUMN user_subscriptions.downgrade_to_plan_id IS 'Plan ID to switch to when current term expires (for downgrades)';
