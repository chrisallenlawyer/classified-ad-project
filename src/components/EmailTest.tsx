import React, { useState } from 'react';
import { EmailService, sendWelcomeEmail, sendMessageNotification, sendSubscriptionEmail, sendSignupConfirmationEmail, sendPasswordResetEmail } from '../services/emailService';

export const EmailTest: React.FC = () => {
  const [testEmail, setTestEmail] = useState('');
  const [testName, setTestName] = useState('Test User');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string>('');
  const [emailType, setEmailType] = useState<'welcome' | 'message' | 'subscription' | 'signup_confirmation' | 'password_reset'>('welcome');

  const handleTestEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testEmail) return;

    setSending(true);
    setResult('');

    // Check if email service is configured
    if (!EmailService.isConfigured()) {
      setResult('❌ Email service not configured. Please set VITE_RESEND_API_KEY in your .env file.');
      setSending(false);
      return;
    }

    console.log('📧 Testing email service directly');

    try {
      let success = false;

      switch (emailType) {
        case 'welcome':
          success = await sendWelcomeEmail(testEmail, testName);
          break;
        case 'message':
          success = await sendMessageNotification(
            testEmail,
            testName,
            'John Seller',
            'Used iPhone 12 Pro',
            'Hi, is this still available? I can pick it up today.',
            'test-listing-123'
          );
          break;
        case 'subscription':
          success = await sendSubscriptionEmail(
            testEmail,
            testName,
            'Professional Plan',
            19.99,
            'upgraded'
          );
          break;
        case 'signup_confirmation':
          success = await sendSignupConfirmationEmail(
            testEmail,
            testName,
            'https://bamaclassifieds.com/confirm-signup?token=test123'
          );
          break;
        case 'password_reset':
          success = await sendPasswordResetEmail(
            testEmail,
            testName,
            'https://bamaclassifieds.com/reset-password?token=test456'
          );
          break;
      }

      if (success) {
        setResult('✅ Email sent successfully! Check your inbox.');
        console.log('📧 Email sent successfully');
      } else {
        setResult('❌ Failed to send email. Check console for details.');
        console.error('📧 Email sending failed');
      }
    } catch (error) {
      console.error('Email test error:', error);
      setResult('❌ Error: ' + (error as Error).message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md max-w-lg mx-auto">
      <h3 className="text-lg font-semibold mb-4">Test Email Service</h3>
      
      {!EmailService.isConfigured() && (
        <div className="mb-4 p-3 bg-yellow-100 border border-yellow-400 rounded-md">
          <p className="text-yellow-800 text-sm">
            <strong>⚠️ Configuration Required:</strong> Please set your VITE_RESEND_API_KEY in the .env file
          </p>
        </div>
      )}
      
      <form onSubmit={handleTestEmail} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Email Type:
          </label>
          <select
            value={emailType}
            onChange={(e) => setEmailType(e.target.value as 'welcome' | 'message' | 'subscription' | 'signup_confirmation' | 'password_reset')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="welcome">Welcome Email</option>
            <option value="message">Message Notification</option>
            <option value="subscription">Subscription Update</option>
            <option value="signup_confirmation">Signup Confirmation</option>
            <option value="password_reset">Password Reset</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Test Email Address:
          </label>
          <input
            type="email"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            placeholder="your-email@example.com"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Test Name:
          </label>
          <input
            type="text"
            value={testName}
            onChange={(e) => setTestName(e.target.value)}
            placeholder="Test User"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
        
        <button
          type="submit"
          disabled={sending || !EmailService.isConfigured()}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {sending ? 'Sending...' : `Send ${emailType.charAt(0).toUpperCase() + emailType.slice(1)} Email`}
        </button>
      </form>
      
      {result && (
        <div className={`mt-4 p-3 rounded-md ${result.includes('✅') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {result}
        </div>
      )}

      <div className="mt-4 text-sm text-gray-600">
        <p><strong>Email Templates Available:</strong></p>
        <ul className="list-disc list-inside mt-2 space-y-1">
          <li><strong>Welcome:</strong> Professional onboarding email</li>
          <li><strong>Message:</strong> Notification when someone messages about a listing</li>
          <li><strong>Subscription:</strong> Plan upgrade/downgrade confirmations</li>
          <li><strong>Signup Confirmation:</strong> Custom email verification (replaces Supabase default)</li>
          <li><strong>Password Reset:</strong> Custom password reset (replaces Supabase default)</li>
        </ul>
      </div>
    </div>
  );
};

export default EmailTest;
