import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getUserListings, deleteListing, updateListing, Listing, getUnreadMessageCount, getUserFavorites } from '../services/supabaseApi';
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon, 
  EyeIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  TagIcon,
  MapPinIcon,
  EnvelopeIcon
} from '@heroicons/react/24/outline';
import { MessagesList } from '../components/MessagesList';
import { NotificationSettings } from '../components/NotificationSettings';

export function SellerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'listings' | 'messages' | 'watched'>('listings');

  // Fetch user's listings
  const { data: listings, isLoading, error } = useQuery(
    'user-listings',
    getUserListings,
    {
      enabled: !!user,
      onError: (err) => {
        console.error('Error fetching listings:', err);
      }
    }
  );

  // Fetch unread message count
  const { data: unreadCount } = useQuery(
    'unread-message-count',
    getUnreadMessageCount,
    {
      enabled: !!user,
      refetchInterval: 30000, // Refetch every 30 seconds
    }
  );

  // Fetch user's watched items
  const { data: watchedItems, isLoading: watchedLoading } = useQuery(
    'user-favorites',
    getUserFavorites,
    {
      enabled: !!user,
    }
  );

  // Delete listing mutation
  const deleteListingMutation = useMutation(deleteListing, {
    onSuccess: () => {
      queryClient.invalidateQueries('user-listings');
      setShowDeleteModal(false);
      setSelectedListing(null);
    },
    onError: (err) => {
      console.error('Error deleting listing:', err);
    }
  });

  // Update listing status mutation
  const updateListingMutation = useMutation(
    ({ id, status }: { id: string; status: string }) => updateListing(id, { status }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('user-listings');
      },
      onError: (err) => {
        console.error('Error updating listing:', err);
      }
    }
  );

  const handleDelete = () => {
    if (selectedListing) {
      deleteListingMutation.mutate(selectedListing.id);
    }
  };

  const handleStatusChange = (listingId: string, newStatus: string) => {
    updateListingMutation.mutate({ id: listingId, status: newStatus });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'sold': return 'bg-blue-100 text-blue-800';
      case 'expired': return 'bg-yellow-100 text-yellow-800';
      case 'removed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Sign In Required</h2>
          <p className="text-gray-600 mb-6">You need to be signed in to view your listings.</p>
          <button
            onClick={() => navigate('/login')}
            className="btn-primary"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-64 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white rounded-lg shadow p-6">
                  <div className="h-48 bg-gray-200 rounded mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Error Loading Listings</h2>
            <p className="text-gray-600 mb-6">There was an error loading your listings. Please try again.</p>
            <button
              onClick={() => window.location.reload()}
              className="btn-primary"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Dashboard</h1>
            <p className="text-gray-600 mt-2">
              Manage your classified ads and track their performance
            </p>
          </div>
          <div className="mt-4 sm:mt-0">
            <button
              onClick={() => navigate('/create')}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Create New Listing
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('listings')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'listings'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <TagIcon className="h-5 w-5 inline mr-2" />
                My Listings
              </button>
              <button
                onClick={() => setActiveTab('messages')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'messages'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <EnvelopeIcon className="h-5 w-5 inline mr-2" />
                Messages
                {unreadCount && unreadCount > 0 && (
                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    {unreadCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('watched')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'watched'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <EyeIcon className="h-5 w-5 inline mr-2" />
                Watched Items
              </button>
            </nav>
          </div>
        </div>

        {/* Content based on active tab */}
        {activeTab === 'listings' ? (
          <>
            {/* Stats */}
            {listings && listings.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <TagIcon className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Total Listings</p>
                      <p className="text-2xl font-bold text-gray-900">{listings.length}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <EyeIcon className="h-6 w-6 text-green-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Total Views</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {listings.reduce((sum, listing) => sum + (listing.view_count || 0), 0)}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-yellow-100 rounded-lg">
                      <CurrencyDollarIcon className="h-6 w-6 text-yellow-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Total Value</p>
                      <p className="text-2xl font-bold text-gray-900">
                        ${listings.reduce((sum, listing) => sum + listing.price, 0).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <CalendarIcon className="h-6 w-6 text-purple-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Active Listings</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {listings.filter(listing => listing.status === 'active').length}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

        {/* Listings Grid */}
        {!listings || listings.length === 0 ? (
          <div className="text-center py-12">
            <div className="mx-auto h-24 w-24 text-gray-400 mb-4">
              <TagIcon className="h-full w-full" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No listings yet</h3>
            <p className="text-gray-600 mb-6">Get started by creating your first listing.</p>
            <button
              onClick={() => navigate('/create')}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Create Your First Listing
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {listings.map((listing) => (
              <div key={listing.id} className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow">
                {/* Image */}
                <div className="aspect-w-16 aspect-h-9 bg-gray-200 rounded-t-lg overflow-hidden">
                  {listing.images && listing.images.length > 0 ? (
                    <img
                      src={`http://localhost:3002${listing.images[0].path}?t=${Date.now()}`}
                      alt={listing.title}
                      className="w-full h-48 object-cover"
                    />
                  ) : (
                    <div className="w-full h-48 flex items-center justify-center bg-gradient-to-br from-blue-100 to-indigo-100">
                      <div className="text-center">
                        <div className="text-gray-400 text-4xl mb-2">📷</div>
                        <div className="text-sm text-gray-500 font-medium">No Image</div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-6">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">
                      {listing.title}
                    </h3>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(listing.status)}`}>
                      {listing.status}
                    </span>
                  </div>

                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                    {listing.description}
                  </p>

                  <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                    <div className="flex items-center">
                      <MapPinIcon className="h-4 w-4 mr-1" />
                      {listing.location}
                    </div>
                    <div className="text-lg font-bold text-gray-900">
                      ${listing.price.toLocaleString()}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                    <span>Posted {formatDate(listing.created_at)}</span>
                    <span>{listing.view_count || 0} views</span>
                  </div>

                  {/* Actions */}
                  <div className="flex space-x-2">
                    <button
                      onClick={() => navigate(`/listing/${listing.id}`)}
                      className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                    >
                      <EyeIcon className="h-4 w-4 mr-1" />
                      View
                    </button>
                    <button
                      onClick={() => navigate(`/edit/${listing.id}`)}
                      className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                    >
                      <PencilIcon className="h-4 w-4 mr-1" />
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        setSelectedListing(listing);
                        setShowDeleteModal(true);
                      }}
                      className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-red-300 rounded-md text-sm font-medium text-red-700 bg-white hover:bg-red-50"
                    >
                      <TrashIcon className="h-4 w-4 mr-1" />
                      Delete
                    </button>
                  </div>

                  {/* Status Actions */}
                  {listing.status === 'active' && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <select
                        value={listing.status}
                        onChange={(e) => handleStatusChange(listing.id, e.target.value)}
                        className="w-full text-sm border border-gray-300 rounded-md px-3 py-2"
                      >
                        <option value="active">Keep Active</option>
                        <option value="sold">Mark as Sold</option>
                        <option value="removed">Remove</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
          </>
        ) : activeTab === 'messages' ? (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">Messages from Buyers</h2>
                <p className="text-sm text-gray-600">Communicate with potential buyers about your listings</p>
              </div>
              <div className="p-6">
                <MessagesList />
              </div>
            </div>
            
            <NotificationSettings />
          </div>
        ) : activeTab === 'watched' ? (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Watched Items</h2>
              <p className="text-sm text-gray-600">Items you're interested in and want to keep track of</p>
            </div>
            <div className="p-6">
              {watchedLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="bg-gray-200 rounded-lg h-32"></div>
                    </div>
                  ))}
                </div>
              ) : !watchedItems || watchedItems.length === 0 ? (
                <div className="text-center py-8">
                  <EyeIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No watched items yet</h3>
                  <p className="mt-1 text-sm text-gray-500">Start browsing and watch items you're interested in.</p>
                  <div className="mt-6">
                    <button
                      onClick={() => navigate('/')}
                      className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Browse Items
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {watchedItems.map((listing) => (
                    <div key={listing.id} className="bg-white border rounded-lg shadow hover:shadow-md transition-shadow">
                      <div className="aspect-w-16 aspect-h-9 bg-gray-200 rounded-t-lg overflow-hidden">
                        {listing.images && listing.images.length > 0 ? (
                          <img
                            src={`http://localhost:3002${listing.images[0].path}`}
                            alt={listing.title}
                            className="w-full h-48 object-cover"
                          />
                        ) : (
                          <div className="w-full h-48 flex items-center justify-center bg-gradient-to-br from-blue-100 to-indigo-100">
                            <div className="text-center">
                              <div className="text-gray-400 text-4xl mb-2">📷</div>
                              <div className="text-sm text-gray-500 font-medium">No Image</div>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="p-4">
                        <h3 className="text-lg font-semibold text-gray-900 line-clamp-2 mb-2">
                          {listing.title}
                        </h3>
                        <p className="text-gray-600 text-sm mb-2 line-clamp-2">
                          {listing.description}
                        </p>
                        <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
                          <span>{listing.location}</span>
                          <span className="text-lg font-bold text-gray-900">
                            ${listing.price.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => navigate(`/listing/${listing.id}`)}
                            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                          >
                            View Details
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : null}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && selectedListing && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3 text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                  <TrashIcon className="h-6 w-6 text-red-600" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mt-4">Delete Listing</h3>
                <div className="mt-2 px-7 py-3">
                  <p className="text-sm text-gray-500">
                    Are you sure you want to delete "{selectedListing.title}"? This action cannot be undone.
                  </p>
                </div>
                <div className="flex justify-center space-x-4 mt-4">
                  <button
                    onClick={() => setShowDeleteModal(false)}
                    className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={deleteListingMutation.isLoading}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                  >
                    {deleteListingMutation.isLoading ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
