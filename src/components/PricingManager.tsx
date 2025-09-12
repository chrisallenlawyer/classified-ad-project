import React, { useState, useEffect } from 'react';
import { subscriptionApi, SubscriptionPlan, PricingConfig } from '../services/subscriptionApi';
import { 
  CurrencyDollarIcon, 
  PlusIcon, 
  PencilIcon, 
  TrashIcon,
  CheckIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

interface PricingManagerProps {
  onClose: () => void;
}

export default function PricingManager({ onClose }: PricingManagerProps) {
  const [subscriptionPlans, setSubscriptionPlans] = useState<SubscriptionPlan[]>([]);
  const [pricingConfig, setPricingConfig] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'plans' | 'pricing'>('plans');
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [showCreatePlan, setShowCreatePlan] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load data on component mount
  useEffect(() => {
    loadData();
  }, []);


  const loadData = async () => {
    try {
      setLoading(true);
      const [plans, config] = await Promise.all([
        subscriptionApi.getSubscriptionPlans(),
        subscriptionApi.getPricingConfig()
      ]);
      setSubscriptionPlans(plans);
      setPricingConfig(config);
    } catch (error) {
      console.error('Error loading pricing data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSavePlan = async (planData: Partial<SubscriptionPlan>) => {
    try {
      console.log('handleSavePlan called with:', planData);
      setSaving(true);
      if (editingPlan) {
        console.log('Updating existing plan:', editingPlan.id);
        await subscriptionApi.updateSubscriptionPlan(editingPlan.id, planData);
      } else {
        console.log('Creating new plan');
        await subscriptionApi.createSubscriptionPlan(planData as Omit<SubscriptionPlan, 'id' | 'created_at' | 'updated_at'>);
      }
      console.log('Plan saved successfully, reloading data...');
      await loadData();
      setEditingPlan(null);
      setShowCreatePlan(false);
    } catch (error) {
      console.error('Error saving plan:', error);
      alert('Error saving plan: ' + (error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePlan = async (planId: string) => {
    if (!confirm('Are you sure you want to delete this subscription plan?')) return;
    
    try {
      await subscriptionApi.deleteSubscriptionPlan(planId);
      await loadData();
    } catch (error) {
      console.error('Error deleting plan:', error);
    }
  };

  const handleUpdatePricing = async (key: string, value: any) => {
    try {
      setSaving(true);
      await subscriptionApi.updatePricingConfig(key, value);
      setPricingConfig(prev => ({ ...prev, [key]: value }));
    } catch (error) {
      console.error('Error updating pricing:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading pricing data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <CurrencyDollarIcon className="h-8 w-8 text-primary-600" />
            <h2 className="text-2xl font-bold text-gray-900">Pricing Management</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('plans')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'plans'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Subscription Plans
            </button>
            <button
              onClick={() => setActiveTab('pricing')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'pricing'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Pricing Configuration
            </button>
          </nav>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {activeTab === 'plans' ? (
            <SubscriptionPlansTab
              plans={subscriptionPlans}
              onEdit={setEditingPlan}
              onDelete={handleDeletePlan}
              onSave={handleSavePlan}
              onShowCreate={() => setShowCreatePlan(true)}
              saving={saving}
            />
          ) : (
            <PricingConfigTab
              config={pricingConfig}
              onUpdate={handleUpdatePricing}
              saving={saving}
            />
          )}
        </div>

        {/* Modals */}
        {editingPlan && (
          <PlanEditModal
            plan={editingPlan}
            onSave={handleSavePlan}
            onClose={() => setEditingPlan(null)}
            saving={saving}
          />
        )}

        {showCreatePlan && (
          <PlanEditModal
            onSave={handleSavePlan}
            onClose={() => setShowCreatePlan(false)}
            saving={saving}
          />
        )}
      </div>
    </div>
  );
}

// Subscription Plans Tab Component
function SubscriptionPlansTab({
  plans,
  onEdit,
  onDelete,
  onSave,
  onShowCreate,
  saving
}: {
  plans: SubscriptionPlan[];
  onEdit: (plan: SubscriptionPlan) => void;
  onDelete: (planId: string) => void;
  onSave: (planData: Partial<SubscriptionPlan>) => void;
  onShowCreate: () => void;
  saving: boolean;
}) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">Subscription Plans</h3>
        <button
          onClick={onShowCreate}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          Add Plan
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`relative bg-white border-2 rounded-lg p-6 ${
              plan.is_active ? 'border-primary-200' : 'border-gray-200 opacity-60'
            }`}
          >
            {!plan.is_active && (
              <div className="absolute top-2 right-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                  Inactive
                </span>
              </div>
            )}

            <div className="text-center">
              <h4 className="text-xl font-bold text-gray-900">{plan.name}</h4>
              <p className="text-sm text-gray-600 mt-1">{plan.description}</p>
              
              <div className="mt-4">
                <span className="text-3xl font-bold text-primary-600">
                  ${plan.price_monthly}
                </span>
                <span className="text-gray-600">/month</span>
                {plan.price_yearly && (
                  <div className="text-sm text-gray-500">
                    ${plan.price_yearly}/year (${(plan.price_yearly / 12).toFixed(2)}/month)
                  </div>
                )}
              </div>

              <div className="mt-6 space-y-2">
                <div className="text-sm">
                  <span className="font-medium">Listings:</span>{' '}
                  {plan.max_listings === 0 ? 'Unlimited' : plan.max_listings}/month
                </div>
                <div className="text-sm">
                  <span className="font-medium">Featured:</span>{' '}
                  {plan.max_featured_listings === 0 ? 'Unlimited' : plan.max_featured_listings}/month
                </div>
                <div className="text-sm">
                  <span className="font-medium">Vehicles:</span>{' '}
                  {plan.max_vehicle_listings === 0 ? 'Unlimited' : plan.max_vehicle_listings}/month
                </div>
              </div>

              <div className="mt-6 flex space-x-2">
                <button
                  onClick={() => onEdit(plan)}
                  className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  <PencilIcon className="h-4 w-4 mr-1" />
                  Edit
                </button>
                <button
                  onClick={() => onDelete(plan.id)}
                  className="inline-flex items-center justify-center px-3 py-2 border border-red-300 shadow-sm text-sm leading-4 font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Pricing Configuration Tab Component
function PricingConfigTab({
  config,
  onUpdate,
  saving
}: {
  config: Record<string, any>;
  onUpdate: (key: string, value: any) => void;
  saving: boolean;
}) {
  const pricingItems = [
    {
      key: 'featured_listing_price',
      label: 'Featured Listing Price',
      description: 'Price to upgrade a listing to featured status',
      type: 'currency'
    },
    {
      key: 'vehicle_listing_price',
      label: 'Vehicle Listing Price',
      description: 'Price to create a vehicle listing',
      type: 'currency'
    },
    {
      key: 'free_listing_limit',
      label: 'Free Listing Limit',
      description: 'Number of free listings per month',
      type: 'number'
    }
  ];

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">Pricing Configuration</h3>
      
      <div className="space-y-6">
        {pricingItems.map((item) => (
          <div key={item.key} className="bg-gray-50 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h4 className="text-lg font-medium text-gray-900">{item.label}</h4>
                <p className="text-sm text-gray-600 mt-1">{item.description}</p>
              </div>
              <div className="ml-6">
                <PricingInput
                  value={config[item.key]}
                  onChange={(value) => onUpdate(item.key, value)}
                  type={item.type}
                  saving={saving}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Pricing Input Component
function PricingInput({
  value,
  onChange,
  type,
  saving
}: {
  value: any;
  onChange: (value: any) => void;
  type: 'currency' | 'number';
  saving: boolean;
}) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    if (type === 'currency') {
      const numValue = parseFloat(inputValue) || 0;
      onChange({ amount: numValue, currency: 'USD' });
    } else if (type === 'number') {
      const numValue = parseInt(inputValue) || 0;
      onChange({ monthly: numValue });
    }
  };

  const displayValue = type === 'currency' ? value?.amount || 0 : value?.monthly || 0;

  return (
    <div className="flex items-center space-x-2">
      {type === 'currency' && <span className="text-gray-500">$</span>}
      <input
        type="number"
        value={displayValue}
        onChange={handleChange}
        className="w-24 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        min="0"
        step={type === 'currency' ? '0.01' : '1'}
        disabled={saving}
      />
      {saving && (
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600"></div>
      )}
    </div>
  );
}

// Plan Edit Modal Component
function PlanEditModal({
  plan,
  onSave,
  onClose,
  saving
}: {
  plan?: SubscriptionPlan;
  onSave: (planData: Partial<SubscriptionPlan>) => void;
  onClose: () => void;
  saving: boolean;
}) {
  const [formData, setFormData] = useState({
    name: plan?.name || '',
    description: plan?.description || '',
    price_monthly: plan?.price_monthly || 0,
    price_yearly: plan?.price_yearly || 0,
    max_listings: plan?.max_listings || 0,
    max_featured_listings: plan?.max_featured_listings || 0,
    max_vehicle_listings: plan?.max_vehicle_listings || 0,
    features: plan?.features || [],
    is_active: plan?.is_active ?? true,
    sort_order: plan?.sort_order || 0
  });

  const [newFeature, setNewFeature] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted with data:', formData);
    onSave(formData);
  };

  const addFeature = () => {
    if (newFeature.trim()) {
      console.log('Adding feature:', newFeature.trim());
      setFormData(prev => ({
        ...prev,
        features: [...prev.features, newFeature.trim()]
      }));
      setNewFeature('');
    }
  };

  const removeFeature = (index: number) => {
    setFormData(prev => ({
      ...prev,
      features: prev.features.filter((_, i) => i !== index)
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            {plan ? 'Edit Plan' : 'Create New Plan'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">Plan Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Sort Order</label>
              <input
                type="number"
                value={formData.sort_order}
                onChange={(e) => setFormData(prev => ({ ...prev, sort_order: parseInt(e.target.value) || 0 }))}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">Monthly Price ($)</label>
              <input
                type="number"
                step="0.01"
                value={formData.price_monthly}
                onChange={(e) => setFormData(prev => ({ ...prev, price_monthly: parseFloat(e.target.value) || 0 }))}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Yearly Price ($)</label>
              <input
                type="number"
                step="0.01"
                value={formData.price_yearly}
                onChange={(e) => setFormData(prev => ({ ...prev, price_yearly: parseFloat(e.target.value) || 0 }))}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">Max Listings (0 = unlimited)</label>
              <input
                type="number"
                value={formData.max_listings}
                onChange={(e) => setFormData(prev => ({ ...prev, max_listings: parseInt(e.target.value) || 0 }))}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Max Featured Listings</label>
              <input
                type="number"
                value={formData.max_featured_listings}
                onChange={(e) => setFormData(prev => ({ ...prev, max_featured_listings: parseInt(e.target.value) || 0 }))}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Max Vehicle Listings</label>
              <input
                type="number"
                value={formData.max_vehicle_listings}
                onChange={(e) => setFormData(prev => ({ ...prev, max_vehicle_listings: parseInt(e.target.value) || 0 }))}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Features</label>
            <p className="text-sm text-gray-500 mt-1 mb-3">
              Add features that will be displayed to users (e.g., "Priority Support", "Advanced Analytics", "Custom Branding")
            </p>
            <div className="mt-2 space-y-2">
              {formData.features.map((feature, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <span className="flex-1 px-3 py-2 bg-gray-100 rounded-md text-sm">{feature}</span>
                  <button
                    type="button"
                    onClick={() => removeFeature(index)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newFeature}
                  onChange={(e) => setNewFeature(e.target.value)}
                  placeholder="e.g., Priority Support, Advanced Analytics, Custom Branding..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addFeature();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={addFeature}
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
                >
                  Add
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">
              Active plan
            </label>
          </div>

          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              onClick={() => console.log('Create/Update Plan button clicked')}
              className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 flex items-center"
            >
              {saving && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              )}
              {plan ? 'Update Plan' : 'Create Plan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
