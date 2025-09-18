import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { sendMessage } from '../services/supabaseApi';
import { sendMessageNotification } from '../services/emailService';

interface ContactSellerModalProps {
  isOpen: boolean;
  onClose: () => void;
  listing: {
    id: string;
    title: string;
    user: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
    };
  };
}

const ContactSellerModal: React.FC<ContactSellerModalProps> = ({
  isOpen,
  onClose,
  listing
}) => {
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const { user } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setError('Please log in to send messages');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Send message to database
      const messageData = await sendMessage({
        content: message,
        senderId: user.id,
        receiverId: listing.user.id,
        listingId: listing.id
      });

      if (messageData) {
        // Send email notification to the seller
        try {
          const senderName = user.user_metadata?.first_name && user.user_metadata?.last_name 
            ? `${user.user_metadata.first_name} ${user.user_metadata.last_name}`
            : user.email || 'Someone';
          
          const receiverName = `${listing.user.firstName} ${listing.user.lastName}`.trim() || 'Seller';
          
          await sendMessageNotification(
            listing.user.email,
            receiverName,
            senderName,
            listing.title,
            message,
            listing.id
          );
          console.log('📧 Message notification email sent successfully');
        } catch (emailError) {
          console.error('📧 Failed to send message notification email:', emailError);
          // Don't block message sending if email fails
        }

        setSuccess(true);
        setMessage('');
        setTimeout(() => {
          setSuccess(false);
          onClose();
        }, 2000);
      }
    } catch (err) {
      console.error('Failed to send message:', err);
      setError('Failed to send message. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              Contact Seller
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <span className="sr-only">Close</span>
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="mb-4">
            <h4 className="font-medium text-gray-900 truncate">{listing.title}</h4>
            <p className="text-sm text-gray-600">
              Seller: {listing.user.firstName} {listing.user.lastName}
            </p>
          </div>

          {!user ? (
            <div className="text-center py-4">
              <p className="text-gray-600 mb-4">Please log in to contact the seller</p>
              <button
                onClick={onClose}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                Close
              </button>
            </div>
          ) : success ? (
            <div className="text-center py-4">
              <div className="text-green-600 mb-2">
                <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-green-600 font-medium">Message sent successfully!</p>
              <p className="text-sm text-gray-600">The seller will be notified by email.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                  Your Message
                </label>
                <textarea
                  id="message"
                  rows={4}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Hi, I'm interested in your listing. Is it still available?"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </div>

              {error && (
                <div className="text-red-600 text-sm">{error}</div>
              )}

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-medium py-2 px-4 rounded-md text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading || !message.trim()}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Sending...' : 'Send Message'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContactSellerModal;
