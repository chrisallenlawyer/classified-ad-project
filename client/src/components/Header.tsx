import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import { isUserAdmin } from '../services/supabaseApi';

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">LC</span>
            </div>
            <span className="text-xl font-bold text-gray-900">Local Classifieds</span>
          </Link>


              {/* Navigation */}
              <nav className="hidden md:flex items-center space-x-6">
                <Link to="/" className="text-gray-700 hover:text-primary-600 font-medium">
                  Browse
                </Link>
                {user && (
                  <>
                    <Link to="/dashboard" className="text-gray-700 hover:text-primary-600 font-medium">
                      My Dashboard
                    </Link>
                    <Link to="/create" className="text-gray-700 hover:text-primary-600 font-medium">
                      Sell
                    </Link>
                    <Link to="/subscription-dashboard" className="text-gray-700 hover:text-primary-600 font-medium">
                      Subscription
                    </Link>
                  </>
                )}
                {user && isUserAdmin(user) && (
                  <Link to="/admin" className="text-gray-700 hover:text-primary-600 font-medium">
                    Admin
                  </Link>
                )}
                {user ? (
                  <div className="flex items-center space-x-4">
                    <span className="text-gray-700">
                      Welcome, {user.user_metadata?.first_name || user.email}
                    </span>
                    <Link to="/change-password" className="text-gray-700 hover:text-primary-600 font-medium">
                      Change Password
                    </Link>
                    <button
                      onClick={handleSignOut}
                      className="text-gray-700 hover:text-primary-600 font-medium"
                    >
                      Sign Out
                    </button>
                  </div>
                ) : (
                  <>
                    <Link to="/login" className="text-gray-700 hover:text-primary-600 font-medium">
                      Login
                    </Link>
                    <Link to="/register" className="btn-primary">
                      Sign Up
                    </Link>
                  </>
                )}
              </nav>

          {/* Mobile menu button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 rounded-md text-gray-700 hover:text-primary-600 hover:bg-gray-100"
          >
            {isMenuOpen ? (
              <XMarkIcon className="h-6 w-6" />
            ) : (
              <Bars3Icon className="h-6 w-6" />
            )}
          </button>
        </div>

        {/* Mobile menu */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-gray-200 py-4">
            <div className="space-y-4">
                  <div className="px-4 space-y-2">
                    <Link
                      to="/"
                      className="block py-2 text-gray-700 hover:text-primary-600 font-medium"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Browse
                    </Link>
                    {user && (
                      <>
                        <Link
                          to="/dashboard"
                          className="block py-2 text-gray-700 hover:text-primary-600 font-medium"
                          onClick={() => setIsMenuOpen(false)}
                        >
                          My Dashboard
                        </Link>
                        <Link
                          to="/create"
                          className="block py-2 text-gray-700 hover:text-primary-600 font-medium"
                          onClick={() => setIsMenuOpen(false)}
                        >
                          Sell
                        </Link>
                        <Link
                          to="/subscription"
                          className="block py-2 text-gray-700 hover:text-primary-600 font-medium"
                          onClick={() => setIsMenuOpen(false)}
                        >
                          Subscription
                        </Link>
                      </>
                    )}
                    {user && isUserAdmin(user) && (
                      <Link
                        to="/admin"
                        className="block py-2 text-gray-700 hover:text-primary-600 font-medium"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        Admin
                      </Link>
                    )}
                    {user ? (
                      <div className="py-2">
                        <div className="text-gray-700 mb-2">
                          Welcome, {user.user_metadata?.first_name || user.email}
                        </div>
                        <Link
                          to="/change-password"
                          className="block py-2 text-gray-700 hover:text-primary-600 font-medium"
                          onClick={() => setIsMenuOpen(false)}
                        >
                          Change Password
                        </Link>
                        <button
                          onClick={() => {
                            handleSignOut();
                            setIsMenuOpen(false);
                          }}
                          className="text-gray-700 hover:text-primary-600 font-medium"
                        >
                          Sign Out
                        </button>
                      </div>
                    ) : (
                      <>
                        <Link
                          to="/login"
                          className="block py-2 text-gray-700 hover:text-primary-600 font-medium"
                          onClick={() => setIsMenuOpen(false)}
                        >
                          Login
                        </Link>
                        <Link
                          to="/register"
                          className="block py-2 btn-primary text-center"
                          onClick={() => setIsMenuOpen(false)}
                        >
                          Sign Up
                        </Link>
                      </>
                    )}
                  </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
