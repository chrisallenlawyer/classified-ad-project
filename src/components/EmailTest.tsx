import React, { useState } from 'react';
import { sendWelcomeEmail } from '../services/emailService';

export const EmailTest: React.FC = () => {
  const [testEmail, setTestEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string>('');

  const handleTestEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testEmail) return;

    setSending(true);
    setResult('');

    try {
      const success = await sendWelcomeEmail(testEmail, 'Test User');
      setResult(success ? '✅ Email sent successfully!' : '❌ Email failed to send');
    } catch (error) {
      console.error('Email test error:', error);
      setResult('❌ Error: ' + (error as Error).message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md max-w-md mx-auto">
      <h3 className="text-lg font-semibold mb-4">Test Email Service</h3>
      
      <form onSubmit={handleTestEmail} className="space-y-4">
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
        
        <button
          type="submit"
          disabled={sending}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {sending ? 'Sending...' : 'Send Test Email'}
        </button>
      </form>
      
      {result && (
        <div className={`mt-4 p-3 rounded-md ${result.includes('✅') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {result}
        </div>
      )}
    </div>
  );
};

export default EmailTest;
