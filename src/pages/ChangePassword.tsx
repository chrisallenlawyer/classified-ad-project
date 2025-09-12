import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const ChangePassword: React.FC = () => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');

    // Validation
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      setIsLoading(false);
      return;
    }

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters long');
      setIsLoading(false);
      return;
    }

    try {
      // For now, we'll use the password reset flow since Supabase doesn't have a direct password change
      // In a real app, you'd want to verify the current password first
      const { error } = await user?.updateUser({
        password: newPassword
      });

      if (error) {
        setError(`Failed to update password: ${error.message}`);
      } else {
        setSuccess('Password updated successfully!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => {
          navigate('/dashboard');
        }, 2000);
      }
    } catch (err) {
      setError('Failed to update password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-gray-900">
              Please log in to change your password
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              <a href="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
                Go to login page
              </a>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Change Password
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Update your account password
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="current-password" className="block text-sm font-medium text-gray-700">
                Current Password
              </label>
              <input
                id="current-password"
                name="current-password"
                type="password"
                required
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="Enter current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="new-password" className="block text-sm font-medium text-gray-700">
                New Password
              </label>
              <input
                id="new-password"
                name="new-password"
                type="password"
                required
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700">
                Confirm New Password
              </label>
              <input
                id="confirm-password"
                name="confirm-password"
                type="password"
                required
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="text-red-600 text-sm text-center">{error}</div>
          )}

          {success && (
            <div className="text-green-600 text-sm text-center">{success}</div>
          )}

          <div className="flex space-x-3">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-medium py-2 px-4 rounded-md text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-md text-sm disabled:opacity-50"
            >
              {isLoading ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChangePassword;
