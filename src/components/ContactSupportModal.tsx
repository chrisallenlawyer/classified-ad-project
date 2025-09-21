import React, { useState } from 'react';
import { useMutation, useQueryClient } from 'react-query';
import { 
  XMarkIcon,
  QuestionMarkCircleIcon,
  ExclamationTriangleIcon,
  CreditCardIcon,
  UserCircleIcon,
  ChatBubbleLeftRightIcon,
  BugAntIcon,
  LightBulbIcon,
  ClipboardDocumentListIcon
} from '@heroicons/react/24/outline';
import { sendMessage } from '../services/supabaseApi';
import { useAuth } from '../contexts/AuthContext';

interface ContactSupportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const supportCategories = [
  {
    id: 'general',
    name: 'General Question',
    description: 'General inquiries about the platform',
    icon: QuestionMarkCircleIcon,
    color: 'text-blue-600'
  },
  {
    id: 'technical',
    name: 'Technical Issue',
    description: 'Problems with website functionality',
    icon: ExclamationTriangleIcon,
    color: 'text-red-600'
  },
  {
    id: 'billing',
    name: 'Billing Question',
    description: 'Payment, subscription, or billing issues',
    icon: CreditCardIcon,
    color: 'text-green-600'
  },
  {
    id: 'account',
    name: 'Account Help',
    description: 'Login, profile, or account settings',
    icon: UserCircleIcon,
    color: 'text-purple-600'
  },
  {
    id: 'listing_help',
    name: 'Listing Help',
    description: 'Help with creating or managing listings',
    icon: ClipboardDocumentListIcon,
    color: 'text-yellow-600'
  },
  {
    id: 'payment_issue',
    name: 'Payment Issue',
    description: 'Problems with payments or transactions',
    icon: CreditCardIcon,
    color: 'text-orange-600'
  },
  {
    id: 'bug_report',
    name: 'Bug Report',
    description: 'Report a bug or error you encountered',
    icon: BugAntIcon,
    color: 'text-red-500'
  },
  {
    id: 'feature_request',
    name: 'Feature Request',
    description: 'Suggest a new feature or improvement',
    icon: LightBulbIcon,
    color: 'text-indigo-600'
  }
];

export function ContactSupportModal({ isOpen, onClose }: ContactSupportModalProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Guest user fields
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  
  const isGuest = !user;

  const sendSupportMessage = useMutation(sendMessage, {
    onSuccess: () => {
      queryClient.invalidateQueries('conversations');
      setMessage('');
      setSelectedCategory('');
      onClose();
      // Show success message or redirect to messages
    },
    onError: (error: any) => {
      console.error('Failed to send support message:', error);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim() || !selectedCategory) {
      return;
    }

    // Additional validation for guest users
    if (isGuest && (!guestName.trim() || !guestEmail.trim())) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      if (isGuest) {
        // Send guest support email directly (no database storage)
        const { EmailService } = await import('../services/emailService');
        
        const success = await EmailService.sendGuestSupportNotification(
          guestName.trim(),
          guestEmail.trim(),
          selectedCategory,
          message.trim()
        );
        
        if (success) {
          console.log('👤 Guest support notification sent successfully');
          // Reset form and close modal
          setMessage('');
          setSelectedCategory('');
          setGuestName('');
          setGuestEmail('');
          onClose();
          alert('Your support request has been sent! We will respond to your email address within 24 hours.');
        } else {
          throw new Error('Failed to send guest support notification');
        }
      } else {
        // Regular logged-in user support message
        await sendSupportMessage.mutateAsync({
          content: message.trim(),
          messageType: 'support',
          supportCategory: selectedCategory
        });
      }
    } catch (error) {
      console.error('Error sending support message:', error);
      alert('Failed to send support request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedCategoryInfo = supportCategories.find(cat => cat.id === selectedCategory);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <ChatBubbleLeftRightIcon className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">
              {isGuest ? 'Contact Support (Guest)' : 'Contact Support'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {/* Guest User Information */}
          {isGuest && (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center mb-3">
                <UserCircleIcon className="h-5 w-5 text-yellow-600 mr-2" />
                <h3 className="text-sm font-medium text-yellow-800">Your Information</h3>
              </div>
              <p className="text-sm text-yellow-700 mb-4">
                Since you're not logged in, please provide your contact information so we can respond to you.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Your Name *
                  </label>
                  <input
                    type="text"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="John Smith"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Your Email *
                  </label>
                  <input
                    type="email"
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="john@example.com"
                    required
                  />
                </div>
              </div>
            </div>
          )}

          {/* Category Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              What can we help you with?
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {supportCategories.map((category) => {
                const IconComponent = category.icon;
                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => setSelectedCategory(category.id)}
                    className={`p-4 text-left border rounded-lg transition-all hover:shadow-md ${
                      selectedCategory === category.id
                        ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <IconComponent className={`h-5 w-5 ${category.color} flex-shrink-0 mt-0.5`} />
                      <div>
                        <div className="font-medium text-gray-900">{category.name}</div>
                        <div className="text-sm text-gray-600 mt-1">{category.description}</div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Category Display */}
          {selectedCategoryInfo && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <selectedCategoryInfo.icon className={`h-4 w-4 ${selectedCategoryInfo.color}`} />
                <span className="text-sm font-medium text-blue-900">
                  Selected: {selectedCategoryInfo.name}
                </span>
              </div>
            </div>
          )}

          {/* Message Input */}
          <div className="mb-6">
            <label htmlFor="support-message" className="block text-sm font-medium text-gray-700 mb-2">
              Describe your issue or question
            </label>
            <textarea
              id="support-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-vertical"
              placeholder="Please provide as much detail as possible so we can help you quickly..."
              required
            />
            <div className="mt-1 text-xs text-gray-500">
              {message.length}/1000 characters
            </div>
          </div>

          {/* User Info Display */}
          {user && !isGuest && (
            <div className="mb-6 p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="text-sm text-gray-600">
                <strong>Your account:</strong> {user.email}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                We'll use this information to help resolve your issue
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={
                !message.trim() || 
                !selectedCategory || 
                isSubmitting ||
                (isGuest && (!guestName.trim() || !guestEmail.trim()))
              }
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Sending...</span>
                </>
              ) : (
                <>
                  <ChatBubbleLeftRightIcon className="h-4 w-4" />
                  <span>Send Message</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Footer Note */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-lg">
          <div className="text-xs text-gray-600">
            <strong>Note:</strong> {isGuest 
              ? 'We will respond directly to your email address within 24 hours during business days. To track conversations in the app, please create an account.'
              : 'Your support conversation will appear in your Messages tab. Our support team typically responds within 24 hours during business days.'
            }
          </div>
        </div>
      </div>
    </div>
  );
}
