import React, { useState } from 'react';
import { XMarkIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import { sendMessage } from '../services/supabaseApi';
import { sendMessageNotification, EmailService } from '../services/emailService';
import { supabase } from '../lib/supabase';

interface ContactSellerFormProps {
  listingId: string;
  sellerName: string;
  sellerEmail: string;
  sellerId: string;
  listingTitle: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function ContactSellerForm({ 
  listingId, 
  sellerName, 
  sellerEmail,
  sellerId,
  listingTitle, 
  onClose, 
  onSuccess 
}: ContactSellerFormProps) {
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { user } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim()) {
      setError('Please enter a message');
      return;
    }

    if (!user) {
      setError('You must be logged in to send a message');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await sendMessage({
        listingId,
        content: message.trim(),
        receiverId: sellerId,
      });

      // Send email notification to the seller (only if they have notifications enabled)
      try {
        console.log('📧 Attempting to send notification email to:', {
          sellerEmail,
          sellerId,
          sellerName,
          listingTitle
        });

        // Validate we have the seller's email
        if (!sellerEmail || sellerEmail === 'seller@example.com') {
          console.warn('📧 Invalid or test seller email, skipping notification:', sellerEmail);
          return;
        }

        // Check if seller has email notifications enabled
        const emailNotificationsEnabled = await EmailService.checkUserEmailPreferences(sellerId);
        
        if (emailNotificationsEnabled) {
          const senderName = user.user_metadata?.first_name && user.user_metadata?.last_name 
            ? `${user.user_metadata.first_name} ${user.user_metadata.last_name}`
            : user.email || 'Someone';
          
          console.log('📧 Sending notification email with data:', {
            to: sellerEmail,
            senderName,
            sellerName,
            listingTitle,
            messagePreview: message.trim().substring(0, 100)
          });
          
          await sendMessageNotification(
            sellerEmail,
            sellerName,
            senderName,
            listingTitle,
            message.trim(),
            listingId
          );
          console.log('📧 Message notification email sent successfully');
        } else {
          console.log('📧 Seller has email notifications disabled, skipping email');
        }
      } catch (emailError) {
        console.error('📧 Failed to send message notification email:', emailError);
        // Don't block message sending if email fails
      }
      
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error sending message:', err);
      setError(err.message || 'Failed to send message. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
          <div className="mt-3 text-center">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Sign In Required</h3>
            <p className="text-sm text-gray-500 mb-6">
              You need to be signed in to contact the seller.
            </p>
            <div className="flex justify-center space-x-4">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onClose();
                  window.location.href = '/login';
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Sign In
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Contact Seller</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600">
            <span className="font-medium">Item:</span> {listingTitle}
          </p>
          <p className="text-sm text-gray-600">
            <span className="font-medium">Seller:</span> {sellerName}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
              Your Message
            </label>
            <textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Hi! I'm interested in this item. Could you tell me more about it?"
              maxLength={500}
            />
            <p className="text-xs text-gray-500 mt-1">
              {message.length}/500 characters
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
            <p className="text-blue-800 text-sm">
              <strong>Note:</strong> Your message will be sent to the seller through our secure messaging system. 
              The seller will receive an email notification and can respond through their dashboard.
            </p>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !message.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Sending...
                </>
              ) : (
                <>
                  <PaperAirplaneIcon className="h-4 w-4 mr-2" />
                  Send Message
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


