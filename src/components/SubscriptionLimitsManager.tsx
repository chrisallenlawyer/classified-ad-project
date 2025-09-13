import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { 
  PencilIcon, 
  CheckIcon, 
  XMarkIcon,
  PlusIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import { subscriptionApi, SubscriptionPlan } from '../services/subscriptionApi';

interface SubscriptionLimitsManagerProps {
  onClose: () => void;
}

export function SubscriptionLimitsManager({ onClose }: SubscriptionLimitsManagerProps) {
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price_monthly: 0,
    price_yearly: 0,
    max_listings: 5,
    max_featured_listings: 0,
    max_vehicle_listings: 0,
    features: [] as string[],
    is_active: true,
    sort_order: 0
  });
  const [newFeature, setNewFeature] = useState('');

  const queryClient = useQueryClient();

  const { data: plans, isLoading } = useQuery(
    'subscription-plans',
    subscriptionApi.getSubscriptionPlans
  );

  const updatePlanMutation = useMutation(
    ({ id, updates }: { id: string; updates: Partial<SubscriptionPlan> }) =>
      subscriptionApi.updateSubscriptionPlan(id, updates),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('subscription-plans');
        setEditingPlan(null);
      }
    }
  );

  const createPlanMutation = useMutation(
    (planData: Omit<SubscriptionPlan, 'id' | 'created_at' | 'updated_at'>) =>
      subscriptionApi.createSubscriptionPlan(planData),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('subscription-plans');
        setIsCreating(false);
        resetForm();
      }
    }
  );

  const deletePlanMutation = useMutation(
    (planId: string) => subscriptionApi.deleteSubscriptionPlan(planId),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('subscription-plans');
      }
    }
  );

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price_monthly: 0,
      price_yearly: 0,
      max_listings: 5,
      max_featured_listings: 0,
      max_vehicle_listings: 0,
      features: [],
      is_active: true,
      sort_order: 0
    });
    setNewFeature('');
  };

  const handleEdit = (plan: SubscriptionPlan) => {
    setEditingPlan(plan);
    setFormData({
      name: plan.name,
      description: plan.description,
      price_monthly: plan.price_monthly,
      price_yearly: plan.price_yearly || 0,
      max_listings: plan.max_listings,
      max_featured_listings: plan.max_featured_listings,
      max_vehicle_listings: plan.max_vehicle_listings,
      features: [...plan.features],
      is_active: plan.is_active,
      sort_order: plan.sort_order
    });
  };

  const handleSave = () => {
    if (editingPlan) {
      updatePlanMutation.mutate({
        id: editingPlan.id,
        updates: formData
      });
    } else {
      createPlanMutation.mutate(formData);
    }
  };

  const handleDelete = (planId: string) => {
    if (confirm('Are you sure you want to delete this subscription plan?')) {
      deletePlanMutation.mutate(planId);
    }
  };

  const addFeature = () => {
    if (newFeature.trim()) {
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

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading subscription plans...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-6xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Subscription Plans & Limits</h2>
          <div className="flex space-x-2">
            <button
              onClick={() => {
                setIsCreating(true);
                resetForm();
              }}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              New Plan
            </button>
            <button
              onClick={onClose}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <XMarkIcon className="h-4 w-4 mr-2" />
              Close
            </button>
          </div>
        </div>

        {isCreating || editingPlan ? (
          <div className="bg-gray-50 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {editingPlan ? 'Edit Plan' : 'Create New Plan'}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Plan Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Monthly Price ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.price_monthly}
                  onChange={(e) => setFormData(prev => ({ ...prev, price_monthly: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Yearly Price ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.price_yearly}
                  onChange={(e) => setFormData(prev => ({ ...prev, price_yearly: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max Free Listings
                </label>
                <input
                  type="number"
                  value={formData.max_listings}
                  onChange={(e) => setFormData(prev => ({ ...prev, max_listings: parseInt(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max Featured Listings
                </label>
                <input
                  type="number"
                  value={formData.max_featured_listings}
                  onChange={(e) => setFormData(prev => ({ ...prev, max_featured_listings: parseInt(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max Vehicle Listings
                </label>
                <input
                  type="number"
                  value={formData.max_vehicle_listings}
                  onChange={(e) => setFormData(prev => ({ ...prev, max_vehicle_listings: parseInt(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sort Order
                </label>
                <input
                  type="number"
                  value={formData.sort_order}
                  onChange={(e) => setFormData(prev => ({ ...prev, sort_order: parseInt(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Features
              </label>
              <div className="flex space-x-2 mb-2">
                <input
                  type="text"
                  value={newFeature}
                  onChange={(e) => setNewFeature(e.target.value)}
                  placeholder="Add a feature..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  onKeyPress={(e) => e.key === 'Enter' && addFeature()}
                />
                <button
                  onClick={addFeature}
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
                >
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.features.map((feature, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-primary-100 text-primary-800"
                  >
                    {feature}
                    <button
                      onClick={() => removeFeature(index)}
                      className="ml-2 text-primary-600 hover:text-primary-800"
                    >
                      <XMarkIcon className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div className="flex items-center mt-4">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">
                Active Plan
              </label>
            </div>

            <div className="flex justify-end space-x-2 mt-6">
              <button
                onClick={() => {
                  setEditingPlan(null);
                  setIsCreating(false);
                  resetForm();
                }}
                className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={updatePlanMutation.isLoading || createPlanMutation.isLoading}
                className="px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-md hover:bg-primary-700 disabled:opacity-50"
              >
                {updatePlanMutation.isLoading || createPlanMutation.isLoading ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        ) : null}

        <div className="space-y-4">
          {plans?.map((plan) => (
            <div key={plan.id} className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <h3 className="text-lg font-medium text-gray-900">{plan.name}</h3>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      plan.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {plan.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{plan.description}</p>
                  
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Monthly Price</p>
                      <p className="text-lg font-semibold text-gray-900">${plan.price_monthly}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Free Listings</p>
                      <p className="text-lg font-semibold text-gray-900">{plan.max_listings}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Featured Listings</p>
                      <p className="text-lg font-semibold text-gray-900">{plan.max_featured_listings}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Vehicle Listings</p>
                      <p className="text-lg font-semibold text-gray-900">{plan.max_vehicle_listings}</p>
                    </div>
                  </div>

                  {plan.features.length > 0 && (
                    <div className="mt-3">
                      <p className="text-sm font-medium text-gray-500 mb-2">Features:</p>
                      <div className="flex flex-wrap gap-2">
                        {plan.features.map((feature, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs bg-gray-100 text-gray-800"
                          >
                            {feature}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex space-x-2 ml-4">
                  <button
                    onClick={() => handleEdit(plan)}
                    className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <PencilIcon className="h-4 w-4 mr-1" />
                    Edit
                  </button>
                  {plan.name !== 'Free' && (
                    <button
                      onClick={() => handleDelete(plan.id)}
                      className="inline-flex items-center px-3 py-1 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50"
                    >
                      <TrashIcon className="h-4 w-4 mr-1" />
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
