import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { subscriptionApi, SubscriptionPlan, UserSubscription, Payment } from '../services/subscriptionApi';
import { 
  CreditCardIcon, 
  CheckCircleIcon, 
  XCircleIcon,
  CalendarIcon,
  ChartBarIcon,
  StarIcon,
  TruckIcon,
  ArrowRightIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

const SubscriptionDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [usage, setUsage] = useState<any>(null);
  const [pricingConfig, setPricingConfig] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showDowngradeModal, setShowDowngradeModal] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [downgrading, setDowngrading] = useState(false);

  useEffect(() => {
    if (user) {
      loadSubscriptionData();
    }
  }, [user]);

  // Refresh data when component becomes visible (user navigates back)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && user) {
        loadSubscriptionData();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [user]);

  const loadSubscriptionData = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const [subscriptionData, plansData, paymentsData, usageData, pricingData] = await Promise.all([
        subscriptionApi.getUserSubscription(user.id),
        subscriptionApi.getActiveSubscriptionPlans(),
        subscriptionApi.getUserPayments(user.id),
        subscriptionApi.getUserUsage(user.id),
        subscriptionApi.getPricingConfig()
      ]);
      
      setSubscription(subscriptionData);
      setPlans(plansData);
      setPayments(paymentsData);
      setUsage(usageData);
      setPricingConfig(pricingData);
    } catch (err: any) {
      console.error('Error loading subscription data:', err);
      setError(err.message || 'Failed to load subscription data');
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = (plan: SubscriptionPlan) => {
    setSelectedPlan(plan);
    setShowUpgradeModal(true);
  };

  const handleSubscriptionUpgrade = async () => {
    if (!selectedPlan || !user) return;
    
    try {
      console.log('Upgrading to plan:', selectedPlan.id);
      
      // Show confirmation dialog
      const confirmUpgrade = window.confirm(
        `Upgrade to ${selectedPlan.name}?\n\n` +
        `Price: $${selectedPlan.price_monthly}/month\n` +
        `Features:\n` +
        `• ${selectedPlan.max_listings} listings per month\n` +
        `• ${selectedPlan.max_featured_listings} featured listings\n` +
        `• ${selectedPlan.max_vehicle_listings} vehicle listings\n\n` +
        `This will update your subscription immediately.`
      );
      
      if (confirmUpgrade) {
        // Actually update the subscription in the database
        const updatedSubscription = await subscriptionApi.updateUserSubscription(user.id, selectedPlan.id);
        
        console.log('Subscription updated successfully:', updatedSubscription);
        alert(`Subscription upgraded to ${selectedPlan.name}! Your new limits are now active.`);
        
        setShowUpgradeModal(false);
        
        // Refresh subscription data to show the changes
        await loadSubscriptionData();
      }
    } catch (err: any) {
      console.error('Error upgrading subscription:', err);
      setError(err.message || 'Failed to upgrade subscription');
    }
  };

  const handleCancelSubscription = async () => {
    if (!user || !subscription) return;

    try {
      setCancelling(true);
      const cancelledSubscription = await subscriptionApi.cancelUserSubscription(user.id);
      console.log('Subscription cancelled successfully:', cancelledSubscription);
      alert('Your subscription has been cancelled. You will continue to have access to your current plan benefits until the end of your billing period.');
      setShowCancelModal(false);
      await loadSubscriptionData();
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      alert('Failed to cancel subscription. Please try again.');
    } finally {
      setCancelling(false);
    }
  };

  const handleDowngradeSubscription = async () => {
    if (!user || !selectedPlan) return;

    try {
      setDowngrading(true);
      const downgradedSubscription = await subscriptionApi.downgradeUserSubscription(user.id, selectedPlan.id);
      console.log('Subscription downgraded successfully:', downgradedSubscription);
      alert(`Your subscription has been downgraded to ${selectedPlan.name}. You will continue to have access to your current plan benefits until the end of your billing period, then switch to the ${selectedPlan.name} plan.`);
      setShowDowngradeModal(false);
      await loadSubscriptionData();
    } catch (error) {
      console.error('Error downgrading subscription:', error);
      alert('Failed to downgrade subscription. Please try again.');
    } finally {
      setDowngrading(false);
    }
  };

  const handleReactivateSubscription = async () => {
    if (!user || !subscription) return;

    try {
      const reactivatedSubscription = await subscriptionApi.reactivateUserSubscription(user.id);
      console.log('Subscription reactivated successfully:', reactivatedSubscription);
      alert('Your subscription has been reactivated! You will continue to be billed for this plan.');
      await loadSubscriptionData();
    } catch (error) {
      console.error('Error reactivating subscription:', error);
      alert('Failed to reactivate subscription. Please try again.');
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

  const getUsagePercentage = (used: number, max: number) => {
    if (max === -1) return 0; // Unlimited
    if (max === 0) return 100; // No allowance
    return Math.min((used / max) * 100, 100);
  };

  const getUsageColor = (used: number, max: number) => {
    const percentage = getUsagePercentage(used, max);
    if (percentage >= 90) return 'text-red-600 bg-red-100';
    if (percentage >= 75) return 'text-yellow-600 bg-yellow-100';
    return 'text-green-600 bg-green-100';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="h-64 bg-gray-200 rounded-lg"></div>
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
        <div className="max-w-6xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mr-2" />
              <div className="text-red-600">{error}</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Subscription Dashboard</h1>
          <p className="text-gray-600 mt-2">Manage your subscription plan and track your usage</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
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
                  {subscription.status === 'cancelled' && (
                    <div className="text-orange-600 mt-1">Downgrades at period end - you keep current benefits until then</div>
                  )}
                </div>
                
                {/* Subscription Action Buttons */}
                <div className="pt-4 border-t border-gray-200">
                  <div className="flex flex-wrap gap-2">
                    {subscription.status === 'active' && (
                      <>
                        <button
                          onClick={() => setShowCancelModal(true)}
                          className="px-3 py-1 text-sm text-red-600 border border-red-300 rounded-md hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500"
                        >
                          Cancel Subscription
                        </button>
                        <button
                          onClick={() => setShowDowngradeModal(true)}
                          className="px-3 py-1 text-sm text-orange-600 border border-orange-300 rounded-md hover:bg-orange-50 focus:outline-none focus:ring-2 focus:ring-orange-500"
                        >
                          Downgrade Plan
                        </button>
                      </>
                    )}
                    {subscription.status === 'cancelled' && (
                      <button
                        onClick={handleReactivateSubscription}
                        className="px-3 py-1 text-sm text-green-600 border border-green-300 rounded-md hover:bg-green-50 focus:outline-none focus:ring-2 focus:ring-green-500"
                      >
                        Reactivate Subscription
                      </button>
                    )}
                  </div>
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
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                      <span className="text-sm text-gray-600">Free Listings</span>
                    </div>
                    <div className="text-sm font-medium">
                      {usage.free_listings_used || 0} / {subscription?.subscription_plan?.max_listings || 5}
                      {subscription?.status === 'cancelled' && (
                        <span className="text-orange-600 text-xs ml-1">(keeping until {formatDate(subscription.current_period_end)})</span>
                      )}
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${getUsagePercentage(usage.free_listings_used || 0, subscription?.subscription_plan?.max_listings || 5)}%` }}
                    ></div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <StarIcon className="h-4 w-4 text-yellow-500 mr-2" />
                      <span className="text-sm text-gray-600">Featured Listings</span>
                    </div>
                    <div className="text-sm font-medium">
                      {usage.featured_listings_used || 0} / {subscription?.subscription_plan?.max_featured_listings || 0}
                      {subscription?.status === 'cancelled' && (
                        <span className="text-orange-600 text-xs ml-1">(keeping until {formatDate(subscription.current_period_end)})</span>
                      )}
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-yellow-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${getUsagePercentage(usage.featured_listings_used || 0, subscription?.subscription_plan?.max_featured_listings || 0)}%` }}
                    ></div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <TruckIcon className="h-4 w-4 text-blue-500 mr-2" />
                      <span className="text-sm text-gray-600">Vehicle Listings</span>
                    </div>
                    <div className="text-sm font-medium">
                      {usage.vehicle_listings_used || 0} / {subscription?.subscription_plan?.max_vehicle_listings || 0}
                      {subscription?.status === 'cancelled' && (
                        <span className="text-orange-600 text-xs ml-1">(keeping until {formatDate(subscription.current_period_end)})</span>
                      )}
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${getUsagePercentage(usage.vehicle_listings_used || 0, subscription?.subscription_plan?.max_vehicle_listings || 0)}%` }}
                    ></div>
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

          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Quick Actions</h2>
              <button
                onClick={() => loadSubscriptionData()}
                className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                Refresh
              </button>
            </div>
            
            <div className="space-y-3">
              <button
                onClick={() => navigate('/create')}
                className="w-full px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors"
              >
                Create New Listing
              </button>
              
              <button
                onClick={() => navigate('/dashboard')}
                className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
              >
                Manage Listings
              </button>
              
              <button
                onClick={() => navigate('/search')}
                className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
              >
                Browse Listings
              </button>
            </div>
            
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h3 className="text-sm font-medium text-gray-900 mb-2">Need Help?</h3>
              <p className="text-sm text-gray-600 mb-3">
                Contact support for subscription questions or technical issues.
              </p>
              <button className="text-sm text-primary-600 hover:text-primary-700 font-medium">
                Contact Support
              </button>
            </div>
          </div>
        </div>

        {/* Available Plans */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Available Plans</h2>
            {!subscription && (
              <p className="text-sm text-gray-600">Upgrade to unlock more features</p>
            )}
          </div>
          
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
                      {plan.max_listings === -1 ? 'Unlimited' : plan.max_listings} listings/month
                    </div>
                    {plan.max_featured_listings > 0 && (
                      <div className="flex items-center text-sm text-gray-600">
                        <StarIcon className="h-4 w-4 text-yellow-500 mr-2" />
                        {plan.max_featured_listings === -1 ? 'Unlimited' : plan.max_featured_listings} featured listings
                      </div>
                    )}
                    {plan.max_vehicle_listings > 0 && (
                      <div className="flex items-center text-sm text-gray-600">
                        <TruckIcon className="h-4 w-4 text-blue-500 mr-2" />
                        {plan.max_vehicle_listings === -1 ? 'Unlimited' : plan.max_vehicle_listings} vehicle listings
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
                      onClick={() => handleUpgrade(plan)}
                      className="w-full px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors flex items-center justify-center"
                    >
                      {subscription ? 'Upgrade' : 'Subscribe'}
                      <ArrowRightIcon className="h-4 w-4 ml-2" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Payment History */}
        <div className="mb-8">
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

        {/* Upgrade Modal */}
        {showUpgradeModal && selectedPlan && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Upgrade to {selectedPlan.name}
                </h3>
                <div className="text-2xl font-bold text-primary-600 mb-4">
                  {formatPrice(selectedPlan.price_monthly)}/month
                </div>
                <div className="space-y-2 mb-6">
                  {selectedPlan.features.map((feature, index) => (
                    <div key={index} className="flex items-center text-sm text-gray-600">
                      <CheckCircleIcon className="h-4 w-4 text-green-500 mr-2" />
                      {feature}
                    </div>
                  ))}
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowUpgradeModal(false)}
                    className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubscriptionUpgrade}
                    className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    Upgrade Now
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Cancel Subscription Modal */}
        {showCancelModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <div className="flex items-center mb-4">
                <ExclamationTriangleIcon className="h-6 w-6 text-red-600 mr-2" />
                <h3 className="text-lg font-semibold text-gray-900">Cancel Subscription</h3>
              </div>
              
              <div className="mb-6">
                <p className="text-gray-600 mb-4">
                  Are you sure you want to cancel your subscription? You will continue to have access to your current plan benefits until <strong>{subscription?.current_period_end ? formatDate(subscription.current_period_end) : 'the end of your billing period'}</strong>.
                </p>
                <p className="text-sm text-gray-500">
                  After that, you'll be moved to the free plan and will lose access to premium features.
                </p>
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowCancelModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  Keep Subscription
                </button>
                <button
                  onClick={handleCancelSubscription}
                  disabled={cancelling}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50"
                >
                  {cancelling ? 'Cancelling...' : 'Cancel Subscription'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Downgrade Subscription Modal */}
        {showDowngradeModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <div className="flex items-center mb-4">
                <ExclamationTriangleIcon className="h-6 w-6 text-orange-600 mr-2" />
                <h3 className="text-lg font-semibold text-gray-900">Downgrade Plan</h3>
              </div>
              
              <div className="mb-6">
                <p className="text-gray-600 mb-4">
                  Select a plan to downgrade to. You will continue to have access to your current plan benefits until <strong>{subscription?.current_period_end ? formatDate(subscription.current_period_end) : 'the end of your billing period'}</strong>.
                </p>
                
                <div className="space-y-2">
                  {plans.filter(plan => plan.id !== subscription?.plan_id).map((plan) => (
                    <label key={plan.id} className="flex items-center p-3 border border-gray-200 rounded-md hover:bg-gray-50 cursor-pointer">
                      <input
                        type="radio"
                        name="downgradePlan"
                        value={plan.id}
                        onChange={() => setSelectedPlan(plan)}
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                      />
                      <div className="ml-3">
                        <div className="font-medium text-gray-900">{plan.name}</div>
                        <div className="text-sm text-gray-600">{formatPrice(plan.price_monthly)}/month</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowDowngradeModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  Keep Current Plan
                </button>
                <button
                  onClick={handleDowngradeSubscription}
                  disabled={downgrading || !selectedPlan}
                  className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50"
                >
                  {downgrading ? 'Downgrading...' : 'Downgrade Plan'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SubscriptionDashboard;