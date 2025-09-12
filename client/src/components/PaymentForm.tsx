import React, { useState } from 'react';
import { 
  CreditCardIcon, 
  CheckIcon, 
  XMarkIcon,
  ExclamationTriangleIcon 
} from '@heroicons/react/24/outline';
import StripePaymentForm from './StripePaymentForm';

export interface PaymentFormProps {
  amount: number;
  currency?: string;
  paymentType: 'subscription' | 'featured_listing' | 'vehicle_listing' | 'vehicle_featured_listing' | 'one_time';
  planId?: string;
  onSuccess: (paymentId: string) => void;
  onError: (error: string) => void;
  onCancel: () => void;
}

export const formatPrice = (amount: number, currency: string = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency
  }).format(amount);
};

export default function PaymentForm({
  amount,
  currency = 'USD',
  paymentType,
  planId,
  onSuccess,
  onError,
  onCancel
}: PaymentFormProps) {
  const getPaymentDescription = () => {
    switch (paymentType) {
      case 'subscription':
        return 'Subscription Payment';
      case 'featured_listing':
        return 'Featured Listing Upgrade';
      case 'vehicle_listing':
        return 'Vehicle Listing Fee';
      case 'vehicle_featured_listing':
        return 'Vehicle + Featured Listing';
      case 'one_time':
        return 'One-time Payment';
      default:
        return 'Payment';
    }
  };

  const handlePaymentSuccess = (paymentIntent: any) => {
    onSuccess(paymentIntent.id);
  };

  const handlePaymentError = (error: string) => {
    onError(error);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <CreditCardIcon className="h-6 w-6 text-primary-600" />
            <h3 className="text-lg font-semibold text-gray-900">Payment Details</h3>
          </div>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Payment Summary */}
        <div className="p-6 border-b border-gray-200 bg-gray-50">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-900">
              {paymentType === 'subscription' ? 'Subscription' : 'Payment Amount'}
            </span>
            <span className="text-lg font-bold text-primary-600">
              {formatPrice(amount, currency)}
            </span>
          </div>
          {paymentType === 'featured_listing' && (
            <p className="text-xs text-gray-600 mt-1">
              Upgrade your listing to featured status
            </p>
          )}
          {paymentType === 'vehicle_listing' && (
            <p className="text-xs text-gray-600 mt-1">
              Create a vehicle listing
            </p>
          )}
          {paymentType === 'vehicle_featured_listing' && (
            <p className="text-xs text-gray-600 mt-1">
              Create a featured vehicle listing
            </p>
          )}
        </div>

        {/* Stripe Payment Form */}
        <div className="p-6">
          <StripePaymentForm
            amount={amount}
            description={getPaymentDescription()}
            onSuccess={handlePaymentSuccess}
            onError={handlePaymentError}
            onCancel={onCancel}
          />
        </div>
      </div>
    </div>
  );
}

