import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { BellIcon, EnvelopeIcon } from '@heroicons/react/24/outline';
import { supabase } from '../lib/supabase';

export function NotificationSettings() {
  const { user } = useAuth();
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Load notification preferences from user metadata
    if (user) {
      const emailNotifPref = user.user_metadata?.email_notifications;
      setEmailNotifications(emailNotifPref !== false); // Default to true if not set
    }
  }, [user]);

  const handleToggleEmailNotifications = async () => {
    setIsLoading(true);
    
    try {
      const newValue = !emailNotifications;
      
      // Update user metadata in Supabase
      const { error } = await supabase.auth.updateUser({
        data: {
          ...user?.user_metadata,
          email_notifications: newValue
        }
      });

      if (error) {
        throw error;
      }

      setEmailNotifications(newValue);
      console.log('📧 Email notification preferences updated:', { emailNotifications: newValue });
      
    } catch (err) {
      console.error('Error updating notification preferences:', err);
      // Revert on error
      setEmailNotifications(!emailNotifications);
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center mb-4">
        <BellIcon className="h-6 w-6 text-gray-400 mr-3" />
        <h3 className="text-lg font-medium text-gray-900">Notification Settings</h3>
      </div>
      
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <EnvelopeIcon className="h-5 w-5 text-gray-400 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-900">Email Notifications</p>
              <p className="text-sm text-gray-500">
                Receive email notifications when you get new messages
              </p>
            </div>
          </div>
          <button
            onClick={handleToggleEmailNotifications}
            disabled={isLoading}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
              emailNotifications ? 'bg-blue-600' : 'bg-gray-200'
            } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                emailNotifications ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-md p-3">
          <p className="text-green-800 text-sm">
            <strong>✅ Email notifications are active!</strong> You'll receive professional email alerts 
            when someone messages you about your listings. Powered by Resend email service.
          </p>
        </div>
      </div>
    </div>
  );
}


