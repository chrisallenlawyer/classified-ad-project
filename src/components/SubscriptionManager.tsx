import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { subscriptionApi, SubscriptionPlan, UserSubscription, Payment } from '../services/subscriptionApi';
import { 
  CreditCardIcon, 
  CheckCircleIcon, 
  XCircleIcon,
  CalendarIcon,
  ChartBarIcon,
  StarIcon,
  TruckIcon
} from '@heroicons/react/24/outline';

const SubscriptionManager: React.FC = () => {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [usage, setUsage] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      loadSubscriptionData();
    }
  }, [user]);

  const loadSubscriptionData = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const [subscriptionData, plansData, paymentsData, usageData] = await Promise.all([
        subscriptionApi.getUserSubscription(user.id),
        subscriptionApi.getActiveSubscriptionPlans(),
        subscriptionApi.getUserPayments(user.id),
        subscriptionApi.getUserUsage(user.id)
      ]);
      
      setSubscription(subscriptionData);
      setPlans(plansData);
      setPayments(paymentsData);
      setUsage(usageData);
    } catch (err: any) {
      console.error('Error loading subscription data:', err);
      setError(err.message || 'Failed to load subscription data');
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (planId: string) => {
    console.log('Upgrading to plan:', planId);
    
    // Find the selected plan
    const plan = plans.find(p => p.id === planId);
    if (!plan) return;
    
    // Show upgrade confirmation with plan details
    const confirmUpgrade = window.confirm(
      `Upgrade to ${plan.name}?\n\n` +
      `Price: $${plan.price_monthly}/month\n` +
      `Features:\n` +
      `• ${plan.max_listings} listings per month\n` +
      `• ${plan.max_featured_listings} featured listings\n` +
      `• ${plan.max_vehicle_listings} vehicle listings\n\n` +
      `This will be processed through Stripe payment system.`
    );
    
    if (confirmUpgrade) {
      alert(`Subscription upgraded to ${plan.name}! Payment processing will be implemented with full Stripe integration.`);
      // In a real implementation, this would redirect to Stripe checkout
    }
  };

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-100';
      case 'cancelled': return 'text-red-600 bg-red-100';
      case 'expired': return 'text-gray-600 bg-gray-100';
      case 'suspended': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="h-64 bg-gray-200 rounded-lg"></div>
              <div className="h-64 bg-gray-200 rounded-lg"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="text-red-600">{error}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Subscription Management</h1>
          <p className="text-gray-600 mt-2">Manage your subscription plan and view usage statistics</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Current Subscription */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <CreditCardIcon className="h-6 w-6 text-primary-600 mr-2" />
              Current Plan
            </h2>
            
            {subscription ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-medium text-gray-900">
                    {subscription.subscription_plan?.name || 'Unknown Plan'}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(subscription.status)}`}>
                    {subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)}
                  </span>
                </div>
                
                <div className="text-2xl font-bold text-primary-600">
                  {formatPrice(subscription.subscription_plan?.price_monthly || 0)}/month
                </div>
                
                <div className="text-sm text-gray-600">
                  <div>Next billing: {formatDate(subscription.current_period_end)}</div>
                  {subscription.cancel_at_period_end && (
                    <div className="text-red-600 mt-1">Cancels at period end</div>
                  )}
                </div>
                
                <div className="pt-4 border-t border-gray-200">
                  <h3 className="font-medium text-gray-900 mb-2">Plan Features</h3>
                  <ul className="text-sm text-gray-600 space-y-1">
                    {subscription.subscription_plan?.features?.map((feature, index) => (
                      <li key={index} className="flex items-center">
                        <CheckCircleIcon className="h-4 w-4 text-green-500 mr-2" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <XCircleIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No active subscription</p>
                <p className="text-sm text-gray-500 mt-1">You're currently on the free plan</p>
              </div>
            )}
          </div>

          {/* Usage Statistics */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <ChartBarIcon className="h-6 w-6 text-primary-600 mr-2" />
              Usage This Month
            </h2>
            
            {usage ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-gray-900">
                      {usage.free_listings_used || 0}
                    </div>
                    <div className="text-sm text-gray-600">Free Listings</div>
                    <div className="text-xs text-gray-500">
                      / {subscription?.subscription_plan?.max_listings || 5}
                    </div>
                  </div>
                  
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-gray-900">
                      {usage.featured_listings_used || 0}
                    </div>
                    <div className="text-sm text-gray-600">Featured Listings</div>
                    <div className="text-xs text-gray-500">
                      / {subscription?.subscription_plan?.max_featured_listings || 0}
                    </div>
                  </div>
                </div>
                
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900">
                    {usage.vehicle_listings_used || 0}
                  </div>
                  <div className="text-sm text-gray-600">Vehicle Listings</div>
                  <div className="text-xs text-gray-500">
                    / {subscription?.subscription_plan?.max_vehicle_listings || 0}
                  </div>
                </div>
                
                <div className="pt-4 border-t border-gray-200">
                  <div className="text-sm text-gray-600">
                    <div className="flex justify-between">
                      <span>Total Listings:</span>
                      <span className="font-medium">{usage.total_listings_created || 0}</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <ChartBarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No usage data available</p>
              </div>
            )}
          </div>
        </div>

        {/* Available Plans */}
        <div className="mt-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Available Plans</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`bg-white rounded-lg shadow-sm border-2 p-6 flex flex-col ${
                  subscription?.subscription_plan?.id === plan.id
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-center flex-grow">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{plan.name}</h3>
                  <div className="text-3xl font-bold text-primary-600 mb-4">
                    {formatPrice(plan.price_monthly)}
                    <span className="text-sm font-normal text-gray-600">/month</span>
                  </div>
                  
                  <div className="space-y-2 mb-6">
                    <div className="flex items-center text-sm text-gray-600">
                      <CheckCircleIcon className="h-4 w-4 text-green-500 mr-2" />
                      {plan.max_listings} listings/month
                    </div>
                    {plan.max_featured_listings > 0 && (
                      <div className="flex items-center text-sm text-gray-600">
                        <StarIcon className="h-4 w-4 text-yellow-500 mr-2" />
                        {plan.max_featured_listings} featured listings
                      </div>
                    )}
                    {plan.max_vehicle_listings > 0 && (
                      <div className="flex items-center text-sm text-gray-600">
                        <TruckIcon className="h-4 w-4 text-blue-500 mr-2" />
                        {plan.max_vehicle_listings} vehicle listings
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="mt-auto">
                  {subscription?.subscription_plan?.id === plan.id ? (
                    <div className="px-4 py-2 bg-primary-100 text-primary-800 rounded-md text-sm font-medium text-center">
                      Current Plan
                    </div>
                  ) : (
                    <button
                      onClick={() => handleUpgrade(plan.id)}
                      className="w-full px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      {subscription ? 'Upgrade' : 'Subscribe'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Payment History */}
        <div className="mt-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Payment History</h2>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            {payments.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Description
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {payments.map((payment) => (
                      <tr key={payment.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(payment.created_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {payment.description}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatPrice(payment.amount)} {payment.currency}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(payment.status)}`}>
                            {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8">
                <CreditCardIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No payment history</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionManager;
