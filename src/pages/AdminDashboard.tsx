import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon, 
  EyeIcon, 
  EyeSlashIcon, 
  SwatchIcon, 
  CurrencyDollarIcon,
  UsersIcon,
  ListBulletIcon,
  EnvelopeIcon,
  CheckIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { getCategories, createCategory, updateCategory, deleteCategory, getListings, updateListing, deleteListing, getUsers, updateUserRole, isUserAdmin } from '../services/supabaseApi';
import { useAuth } from '../contexts/AuthContext';
import { ColorPaletteManager } from '../components/ColorPaletteManager';
import CollapsibleSection from '../components/CollapsibleSection';
import { SubscriptionLimitsManager } from '../components/SubscriptionLimitsManager';
import { PricingManager } from '../components/PricingManager';

interface Category {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  is_active: boolean;
  is_vehicle: boolean;
  created_at: string;
  updated_at: string;
}

export function AdminDashboard() {
  console.log('AdminDashboard component rendered');
  
  // Simple test to see if component is rendering
  if (typeof window !== 'undefined') {
    console.log('AdminDashboard: Component is rendering in browser');
  }

  const { user } = useAuth();

  // Check if user is admin
  if (!user || !isUserAdmin(user)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-6">You don't have permission to access the admin dashboard.</p>
          <a href="/" className="text-blue-600 hover:text-blue-700 font-medium">
            Return to Home
          </a>
        </div>
      </div>
    );
  }
  
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [showPricingManager, setShowPricingManager] = useState(false);
  const [newCategory, setNewCategory] = useState({
    name: '',
    description: '',
    icon: '📦',
    isVehicle: false
  });

  // Collapsible sections state
  const [expandedSections, setExpandedSections] = useState({
    categories: false,
    colorPalette: false,
    pricing: false,
    users: false,
    listings: false,
    email: false
  });

  // Admin features state
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  
  // Category change state
  const [showCategoryChangeModal, setShowCategoryChangeModal] = useState(false);
  const [selectedListingForCategoryChange, setSelectedListingForCategoryChange] = useState<any>(null);
  const [newCategoryId, setNewCategoryId] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showUserDetailModal, setShowUserDetailModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [showListingDetailModal, setShowListingDetailModal] = useState(false);
  const [selectedListing, setSelectedListing] = useState<any>(null);
  const [listingSearchTerm, setListingSearchTerm] = useState('');
  const [showSubscriptionLimitsManager, setShowSubscriptionLimitsManager] = useState(false);

  const queryClient = useQueryClient();

  // Fetch categories
  const { data: categories, isLoading, error } = useQuery(
    'admin-categories',
    () => getCategories()
  );

  // Fetch listings for admin management
  const { data: listings, isLoading: listingsLoading } = useQuery(
    'admin-listings',
    () => getListings({ limit: 100, offset: 0 })
  );

  // Fetch users (we'll need to create this API function)
  const { data: users, isLoading: usersLoading } = useQuery(
    'admin-users',
    () => fetchUsers()
  );

  console.log('Admin Dashboard Debug:', { 
    categories, 
    categoriesType: typeof categories, 
    categoriesIsArray: Array.isArray(categories),
    isLoading, 
    error 
  });

  // Helper functions
  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const fetchUsers = async () => {
    try {
      const users = await getUsers();
      console.log('Fetched users:', users);
      return users;
    } catch (error) {
      console.error('Error fetching users:', error);
      return [];
    }
  };

  const handleToggleAdmin = async (userId: string, isAdmin: boolean) => {
    try {
      await updateUserRole(userId, isAdmin);
      // Refresh users list
      queryClient.invalidateQueries('admin-users');
      console.log(`User ${userId} admin status updated to: ${isAdmin}`);
    } catch (error) {
      console.error('Error updating user admin status:', error);
      alert('Failed to update user admin status. Please try again.');
    }
  };

  const handleApproveListing = async (listingId: string) => {
    try {
      await updateListing(listingId, { is_active: true } as any);
      queryClient.invalidateQueries('admin-listings');
    } catch (error) {
      console.error('Error approving listing:', error);
    }
  };

  const handleRejectListing = async (listingId: string) => {
    try {
      await updateListing(listingId, { is_active: false } as any);
      queryClient.invalidateQueries('admin-listings');
    } catch (error) {
      console.error('Error rejecting listing:', error);
    }
  };

  const handleDeleteListing = async (listingId: string) => {
    if (confirm('Are you sure you want to delete this listing?')) {
      try {
        await deleteListing(listingId);
        queryClient.invalidateQueries('admin-listings');
      } catch (error) {
        console.error('Error deleting listing:', error);
      }
    }
  };

  const handleMakeFeatured = async (listingId: string) => {
    try {
      await updateListing(listingId, { 
        is_featured: true, 
        listing_type: 'featured' 
      } as any);
      queryClient.invalidateQueries('admin-listings');
    } catch (error) {
      console.error('Error making listing featured:', error);
    }
  };

  const handleRemoveFeatured = async (listingId: string) => {
    try {
      await updateListing(listingId, { 
        is_featured: false, 
        listing_type: 'free' 
      } as any);
      queryClient.invalidateQueries('admin-listings');
    } catch (error) {
      console.error('Error removing featured status:', error);
    }
  };

  const handleChangeCategory = (listing: any) => {
    setSelectedListingForCategoryChange(listing);
    setNewCategoryId(listing.category_id);
    setShowCategoryChangeModal(true);
  };

  const handleConfirmCategoryChange = async () => {
    if (!selectedListingForCategoryChange || !newCategoryId) return;

    try {
      await updateListing(selectedListingForCategoryChange.id, {
        category_id: newCategoryId
      } as any);
      queryClient.invalidateQueries('admin-listings');
      setShowCategoryChangeModal(false);
      setSelectedListingForCategoryChange(null);
      setNewCategoryId('');
    } catch (error) {
      console.error('Error changing category:', error);
      alert('Failed to change category. Please try again.');
    }
  };

  const handleSendEmail = async () => {
    if (!emailSubject.trim() || !emailMessage.trim()) {
      alert('Please fill in both subject and message');
      return;
    }
    
    if (selectedUsers.length === 0) {
      alert('Please select at least one user');
      return;
    }

    try {
      // This would typically call an email service
      console.log('Sending email to users:', selectedUsers);
      console.log('Subject:', emailSubject);
      console.log('Message:', emailMessage);
      
      // Reset form
      setEmailSubject('');
      setEmailMessage('');
      setSelectedUsers([]);
      setShowEmailModal(false);
      alert('Email sent successfully!');
    } catch (error) {
      console.error('Error sending email:', error);
      alert('Failed to send email');
    }
  };

  const handleUserClick = (user: any) => {
    setSelectedUser(user);
    setShowUserDetailModal(true);
  };

  const filteredUsers = users?.filter((user: any) => 
    user.email.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
    user.first_name?.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
    user.last_name?.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
    (user.is_admin ? 'admin' : 'user').includes(userSearchTerm.toLowerCase())
  ) || [];

  const getSubscriptionBadgeColor = (plan: string, status: string) => {
    if (status === 'none' || plan === 'Free') return 'bg-gray-100 text-gray-800';
    if (plan === 'Basic') return 'bg-blue-100 text-blue-800';
    if (plan === 'Pro') return 'bg-purple-100 text-purple-800';
    if (plan === 'Business') return 'bg-green-100 text-green-800';
    return 'bg-gray-100 text-gray-800';
  };

  const handleListingClick = (listing: any) => {
    setSelectedListing(listing);
    setShowListingDetailModal(true);
  };

  const filteredListings = listings?.filter((listing: any) => 
    listing.title.toLowerCase().includes(listingSearchTerm.toLowerCase()) ||
    listing.description.toLowerCase().includes(listingSearchTerm.toLowerCase()) ||
    listing.location.toLowerCase().includes(listingSearchTerm.toLowerCase()) ||
    listing.listing_type?.toLowerCase().includes(listingSearchTerm.toLowerCase()) ||
    listing.condition?.toLowerCase().includes(listingSearchTerm.toLowerCase())
  ) || [];

  const getListingTypeBadgeColor = (type: string) => {
    if (type === 'featured') return 'bg-yellow-100 text-yellow-800';
    if (type === 'vehicle') return 'bg-blue-100 text-blue-800';
    return 'bg-gray-100 text-gray-800';
  };

  const getListingStatusBadgeColor = (isActive: boolean) => {
    return isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
  };

  // Create category mutation
  const createCategoryMutation = useMutation(
    (categoryData: any) => createCategory(categoryData),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('admin-categories');
        setIsAddingCategory(false);
        setNewCategory({ name: '', description: '', icon: '📦', isVehicle: false });
        alert('Category created successfully!');
      },
      onError: (error: any) => {
        console.error('Error creating category:', error);
        alert('Failed to create category: ' + (error.message || 'Unknown error'));
      }
    }
  );

  // Update category mutation
  const updateCategoryMutation = useMutation(
    ({ id, data }: { id: string; data: any }) => updateCategory(id, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('admin-categories');
        setEditingCategory(null);
        alert('Category updated successfully!');
      },
      onError: (error: any) => {
        console.error('Error updating category:', error);
        alert('Failed to update category: ' + (error.message || 'Unknown error'));
      }
    }
  );

  // Delete category mutation
  const deleteCategoryMutation = useMutation(
    (id: string) => deleteCategory(id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('admin-categories');
        alert('Category deleted successfully!');
      },
      onError: (error: any) => {
        console.error('Error deleting category:', error);
        alert('Failed to delete category: ' + (error.message || 'Unknown error'));
      }
    }
  );

  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (newCategory.name.trim()) {
      createCategoryMutation.mutate({
        name: newCategory.name,
        description: newCategory.description,
        icon: newCategory.icon,
        is_vehicle: newCategory.isVehicle
      });
    }
  };

  const handleUpdateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCategory && editingCategory.name.trim()) {
      updateCategoryMutation.mutate({
        id: editingCategory.id,
        data: {
          name: editingCategory.name,
          description: editingCategory.description,
          icon: editingCategory.icon,
          is_vehicle: editingCategory.isVehicle
        }
      });
    }
  };

  const handleDeleteCategory = (id: string) => {
    if (window.confirm('Are you sure you want to delete this category?')) {
      deleteCategoryMutation.mutate(id);
    }
  };

  const toggleCategoryStatus = (category: Category) => {
    updateCategoryMutation.mutate({
      id: category.id,
      data: { is_active: !category.is_active }
    });
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Debug: Show if component is rendering but no data
  if (!isLoading && !categories) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Admin Dashboard</h1>
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p>Debug: Component is rendering but no categories data. Error: {error ? String(error) : 'No error'}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-red-800 mb-2">Error Loading Admin Dashboard</h2>
          <p className="text-red-600 mb-4">There was an error loading the admin dashboard data.</p>
          <pre className="bg-red-100 p-3 rounded text-sm text-red-800 overflow-auto">
            {JSON.stringify(error, null, 2)}
          </pre>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
        <p className="text-gray-600">Manage your classified ads platform</p>
      </div>

      {/* Categories Section */}
      <CollapsibleSection
        title="Categories"
        icon={<ListBulletIcon className="h-6 w-6 text-primary-600" />}
        isExpanded={expandedSections.categories}
        onToggle={() => toggleSection('categories')}
      >
        <div className="flex items-center justify-between mb-6">
          <div></div>
          <button
            onClick={() => setIsAddingCategory(true)}
            className="btn-primary flex items-center space-x-2"
          >
            <PlusIcon className="h-4 w-4" />
            <span>Add Category</span>
          </button>
        </div>

        {/* Add Category Form */}
        {isAddingCategory && (
          <form onSubmit={handleCreateCategory} className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Category</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  value={newCategory.name}
                  onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                  className="input-field"
                  placeholder="Category name"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={newCategory.description}
                  onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                  className="input-field"
                  placeholder="Category description"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Icon
                </label>
                <input
                  type="text"
                  value={newCategory.icon}
                  onChange={(e) => setNewCategory({ ...newCategory, icon: e.target.value })}
                  className="input-field"
                  placeholder="📦"
                />
              </div>
            </div>
            <div className="mt-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={newCategory.isVehicle}
                  onChange={(e) => setNewCategory({ ...newCategory, isVehicle: e.target.checked })}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm font-medium text-gray-700">
                  Vehicle Category (requires vehicle listing fee)
                </span>
              </label>
              <p className="text-xs text-gray-500 mt-1">
                When checked, listings in this category will be treated as vehicle listings and charged accordingly.
              </p>
            </div>
            <div className="flex space-x-3 mt-4">
              <button type="submit" className="btn-primary">
                Create Category
              </button>
              <button
                type="button"
                onClick={() => setIsAddingCategory(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Categories List */}
        <div className="space-y-3">
          {!categories || !Array.isArray(categories) || categories.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No categories found. Click "Add Category" to create your first category.</p>
              {!Array.isArray(categories) && (
                <p className="text-red-500 mt-2">
                  Debug: categories is not an array. Type: {typeof categories}
                </p>
              )}
            </div>
          ) : (
            categories.map((category: Category) => (
              <div
                key={category.id}
                className={`flex items-center justify-between p-4 rounded-lg border ${
                  category.is_active ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-4">
                  <span className="text-2xl">{category.icon}</span>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className={`font-medium ${category.is_active ? 'text-gray-900' : 'text-gray-500'}`}>
                        {category.name}
                      </h3>
                      {category.is_vehicle && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          🚗 Vehicle
                        </span>
                      )}
                    </div>
                    <p className={`text-sm ${category.is_active ? 'text-gray-600' : 'text-gray-400'}`}>
                      {category.description || 'No description'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => toggleCategoryStatus(category)}
                    className={`p-2 rounded-lg ${
                      category.is_active
                        ? 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                        : 'text-gray-600 hover:text-gray-800 hover:bg-gray-200'
                    }`}
                    title={category.is_active ? 'Hide category' : 'Show category'}
                  >
                    {category.is_active ? (
                      <EyeSlashIcon className="h-4 w-4" />
                    ) : (
                      <EyeIcon className="h-4 w-4" />
                    )}
                  </button>
                  <button
                    onClick={() => setEditingCategory(category)}
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                    title="Edit category"
                  >
                    <PencilIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteCategory(category.id)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                    title="Delete category"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Edit Category Modal */}
        {editingCategory && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Edit Category</h3>
              <form onSubmit={handleUpdateCategory}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Name *
                    </label>
                    <input
                      type="text"
                      value={editingCategory.name}
                      onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                      className="input-field"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <input
                      type="text"
                      value={editingCategory.description || ''}
                      onChange={(e) => setEditingCategory({ ...editingCategory, description: e.target.value })}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Icon
                    </label>
                    <input
                      type="text"
                      value={editingCategory.icon || ''}
                      onChange={(e) => setEditingCategory({ ...editingCategory, icon: e.target.value })}
                      className="input-field"
                    />
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="isActive"
                        checked={editingCategory.is_active}
                        onChange={(e) => setEditingCategory({ ...editingCategory, is_active: e.target.checked })}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
                        Active (visible to users)
                      </label>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="isVehicle"
                        checked={editingCategory.is_vehicle}
                        onChange={(e) => setEditingCategory({ ...editingCategory, is_vehicle: e.target.checked })}
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                      />
                      <label htmlFor="isVehicle" className="ml-2 block text-sm text-gray-900">
                        Vehicle Category (requires vehicle listing fee)
                      </label>
                    </div>
                    <p className="text-xs text-gray-500">
                      When checked, listings in this category will be treated as vehicle listings and charged accordingly.
                    </p>
                  </div>
                </div>
                <div className="flex space-x-3 mt-6">
                  <button type="submit" className="btn-primary">
                    Update Category
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingCategory(null)}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </CollapsibleSection>

      {/* Color Palette Management Section */}
      <CollapsibleSection
        title="Color Palette Management"
        icon={<SwatchIcon className="h-6 w-6 text-primary-600" />}
        isExpanded={expandedSections.colorPalette}
        onToggle={() => toggleSection('colorPalette')}
      >
        <ColorPaletteManager />
      </CollapsibleSection>

      {/* Pricing Management Section */}
      <CollapsibleSection
        title="Pricing Management"
        icon={<CurrencyDollarIcon className="h-6 w-6 text-primary-600" />}
        isExpanded={expandedSections.pricing}
        onToggle={() => toggleSection('pricing')}
      >
        <div className="flex items-center justify-between mb-6">
          <div></div>
          <button
            onClick={() => setShowPricingManager(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            <CurrencyDollarIcon className="h-4 w-4 mr-2" />
            Manage Pricing
          </button>
        </div>
        <div className="bg-gray-50 rounded-lg p-6">
          <p className="text-gray-600 mb-4">
            Manage subscription plans, pricing configuration, and payment settings for your classified ads platform.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <h3 className="font-medium text-gray-900 mb-2">Subscription Plans</h3>
              <p className="text-sm text-gray-600 mb-3">Create and manage different subscription tiers for users.</p>
              <div className="text-xs text-gray-500">Free, Basic, Pro, Business plans</div>
              <button
                onClick={() => setShowSubscriptionLimitsManager(true)}
                className="mt-2 inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-white bg-primary-600 hover:bg-primary-700"
              >
                Manage Subscription Limits
              </button>
            </div>
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <h3 className="font-medium text-gray-900 mb-2">Pricing Configuration</h3>
              <p className="text-sm text-gray-600 mb-3">Set prices for additional listings and modifiers.</p>
              <div className="text-xs text-gray-500">Additional Basic, Featured, Vehicle listings</div>
              <button
                onClick={() => {
                  console.log('Pricing manager button clicked');
                  setShowPricingManager(true);
                }}
                className="mt-2 inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-white bg-primary-600 hover:bg-primary-700"
              >
                Manage Pricing
              </button>
            </div>
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <h3 className="font-medium text-gray-900 mb-2">Payment Settings</h3>
              <p className="text-sm text-gray-600 mb-3">Configure Stripe integration and payment methods.</p>
              <div className="text-xs text-gray-500">Stripe, PayPal, etc.</div>
            </div>
          </div>
        </div>
      </CollapsibleSection>


      {/* User Management Section */}
      <CollapsibleSection
        title="User Management"
        icon={<UsersIcon className="h-6 w-6 text-primary-600" />}
        isExpanded={expandedSections.users}
        onToggle={() => toggleSection('users')}
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-gray-600">Manage users, view activity, and send communications.</p>
            <div className="flex space-x-2">
              <button
                onClick={() => setShowEmailModal(true)}
                className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <EnvelopeIcon className="h-4 w-4 mr-2" />
                Email Users
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search users by name, email, or subscription plan..."
              value={userSearchTerm}
              onChange={(e) => setUserSearchTerm(e.target.value)}
              className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
          
          {usersLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading users...</p>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedUsers(filteredUsers.map((u: any) => u.id));
                        } else {
                          setSelectedUsers([]);
                        }
                      }}
                    />
                    <span className="ml-2 text-sm font-medium text-gray-900">
                      Select All ({filteredUsers.length} users)
                    </span>
                  </div>
                  <div className="text-sm text-gray-500">
                    {userSearchTerm && `Filtered from ${users?.length || 0} total users`}
                  </div>
                </div>
              </div>
              <div className="divide-y divide-gray-200">
                {filteredUsers.length === 0 ? (
                  <div className="px-6 py-8 text-center text-gray-500">
                    {userSearchTerm ? 'No users found matching your search.' : 'No users found.'}
                  </div>
                ) : (
                  filteredUsers.map((user: any) => (
                    <div 
                      key={user.id} 
                      className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 cursor-pointer"
                      onClick={() => handleUserClick(user)}
                    >
                      <div className="flex items-center flex-1">
                        <input
                          type="checkbox"
                          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                          checked={selectedUsers.includes(user.id)}
                          onChange={(e) => {
                            e.stopPropagation();
                            if (e.target.checked) {
                              setSelectedUsers(prev => [...prev, user.id]);
                            } else {
                              setSelectedUsers(prev => prev.filter(id => id !== user.id));
                            }
                          }}
                        />
                        <div className="ml-4 flex-1">
                          <div className="flex items-center space-x-3">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {user.first_name && user.last_name 
                                  ? `${user.first_name} ${user.last_name}` 
                                  : user.email.split('@')[0]
                                }
                              </div>
                              <div className="text-sm text-gray-500">{user.email}</div>
                            </div>
                            <div className="flex space-x-2">
                              {user.is_admin && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                  Admin
                                </span>
                              )}
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                User
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500">
                            <span>Joined: {new Date(user.created_at).toLocaleDateString()}</span>
                            <span>•</span>
                            <span>Last updated: {new Date(user.updated_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleAdmin(user.id, !user.is_admin);
                          }}
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                            user.is_admin 
                              ? 'bg-red-100 text-red-800 hover:bg-red-200' 
                              : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                          }`}
                        >
                          {user.is_admin ? 'Remove Admin' : 'Make Admin'}
                        </button>
                        <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </CollapsibleSection>

      {/* Listing Management Section */}
      <CollapsibleSection
        title="Listing Management"
        icon={<ListBulletIcon className="h-6 w-6 text-primary-600" />}
        isExpanded={expandedSections.listings}
        onToggle={() => toggleSection('listings')}
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-gray-600">Review, approve, and manage user listings.</p>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search listings by title, description, location, type, or condition..."
              value={listingSearchTerm}
              onChange={(e) => setListingSearchTerm(e.target.value)}
              className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
          
          {listingsLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading listings...</p>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium text-gray-900">
                    {filteredListings.length} listing(s)
                  </div>
                  <div className="text-sm text-gray-500">
                    {listingSearchTerm && `Filtered from ${listings?.length || 0} total listings`}
                  </div>
                </div>
              </div>
              <div className="divide-y divide-gray-200">
                {filteredListings.length === 0 ? (
                  <div className="px-6 py-8 text-center text-gray-500">
                    {listingSearchTerm ? 'No listings found matching your search.' : 'No listings found.'}
                  </div>
                ) : (
                  filteredListings.map((listing: any) => (
                    <div 
                      key={listing.id} 
                      className="px-6 py-4 hover:bg-gray-50 cursor-pointer"
                      onClick={() => handleListingClick(listing)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="text-lg font-medium text-gray-900">{listing.title}</h3>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getListingStatusBadgeColor(listing.is_active)}`}>
                              {listing.is_active ? 'Active' : 'Inactive'}
                            </span>
                            {listing.listing_type && listing.listing_type !== 'free' && (
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getListingTypeBadgeColor(listing.listing_type)}`}>
                                {listing.listing_type === 'featured' ? 'Featured' : 'Vehicle'}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mb-2 line-clamp-2">{listing.description}</p>
                          <div className="flex items-center space-x-4 text-sm text-gray-500">
                            <span className="font-medium text-green-600">${listing.price}</span>
                            <span>•</span>
                            <span>{listing.location}</span>
                            <span>•</span>
                            <span>Created: {new Date(listing.created_at).toLocaleDateString()}</span>
                            <span>•</span>
                            <span>Views: {listing.view_count || 0}</span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 ml-4">
                          {!listing.is_active && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleApproveListing(listing.id);
                              }}
                              className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                            >
                              <CheckIcon className="h-4 w-4 mr-1" />
                              Approve
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRejectListing(listing.id);
                            }}
                            className="inline-flex items-center px-3 py-1 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50"
                          >
                            <XMarkIcon className="h-4 w-4 mr-1" />
                            {listing.is_active ? 'Deactivate' : 'Reject'}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteListing(listing.id);
                            }}
                            className="inline-flex items-center px-3 py-1 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50"
                          >
                            <TrashIcon className="h-4 w-4 mr-1" />
                            Delete
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleChangeCategory(listing);
                            }}
                            className="inline-flex items-center px-3 py-1 border border-blue-300 text-sm font-medium rounded-md text-blue-700 bg-white hover:bg-blue-50"
                          >
                            <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                            </svg>
                            Change Category
                          </button>
                          {listing.is_featured ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveFeatured(listing.id);
                              }}
                              className="inline-flex items-center px-3 py-1 border border-yellow-300 text-sm font-medium rounded-md text-yellow-700 bg-white hover:bg-yellow-50"
                            >
                              Remove Featured
                            </button>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMakeFeatured(listing.id);
                              }}
                              className="inline-flex items-center px-3 py-1 border border-blue-300 text-sm font-medium rounded-md text-blue-700 bg-white hover:bg-blue-50"
                            >
                              Make Featured
                            </button>
                          )}
                          <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </CollapsibleSection>

      {/* Email Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Email Users</h3>
              <button
                onClick={() => setShowEmailModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subject
                </label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Email subject"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Message
                </label>
                <textarea
                  value={emailMessage}
                  onChange={(e) => setEmailMessage(e.target.value)}
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Your message to users..."
                />
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600">
                  <strong>Selected Users:</strong> {selectedUsers.length} user(s)
                </p>
                {selectedUsers.length === 0 && (
                  <p className="text-sm text-red-600 mt-1">
                    Please select at least one user to send an email to.
                  </p>
                )}
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
              <button
                onClick={() => setShowEmailModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSendEmail}
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
              >
                Send Email
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Detail Modal */}
      {showUserDetailModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">User Details</h3>
              <button
                onClick={() => setShowUserDetailModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Basic Information */}
                <div className="space-y-6">
                  <div>
                    <h4 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-gray-500">Name:</span>
                        <span className="text-sm text-gray-900">{selectedUser.full_name || 'Not provided'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-gray-500">Email:</span>
                        <span className="text-sm text-gray-900">{selectedUser.email}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-gray-500">Phone:</span>
                        <span className="text-sm text-gray-900">{selectedUser.phone || 'Not provided'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-gray-500">Location:</span>
                        <span className="text-sm text-gray-900">{selectedUser.location || 'Not provided'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-gray-500">Joined:</span>
                        <span className="text-sm text-gray-900">{new Date(selectedUser.created_at).toLocaleDateString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-gray-500">Last Sign In:</span>
                        <span className="text-sm text-gray-900">{new Date(selectedUser.last_sign_in).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Subscription Information */}
                  <div>
                    <h4 className="text-lg font-medium text-gray-900 mb-4">Subscription</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-500">Plan:</span>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSubscriptionBadgeColor(selectedUser.subscription_plan, selectedUser.subscription_status)}`}>
                          {selectedUser.subscription_plan}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-gray-500">Status:</span>
                        <span className={`text-sm ${selectedUser.subscription_status === 'active' ? 'text-green-600' : 'text-gray-600'}`}>
                          {selectedUser.subscription_status === 'active' ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      {selectedUser.subscription_expires && (
                        <div className="flex justify-between">
                          <span className="text-sm font-medium text-gray-500">Expires:</span>
                          <span className="text-sm text-gray-900">{new Date(selectedUser.subscription_expires).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Activity & Statistics */}
                <div className="space-y-6">
                  <div>
                    <h4 className="text-lg font-medium text-gray-900 mb-4">Activity & Statistics</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="text-2xl font-bold text-gray-900">{selectedUser.total_listings}</div>
                        <div className="text-sm text-gray-500">Total Listings</div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="text-2xl font-bold text-green-600">{selectedUser.active_listings}</div>
                        <div className="text-sm text-gray-500">Active Listings</div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="text-2xl font-bold text-yellow-600">{selectedUser.featured_listings}</div>
                        <div className="text-sm text-gray-500">Featured Listings</div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="text-2xl font-bold text-blue-600">{selectedUser.vehicle_listings}</div>
                        <div className="text-sm text-gray-500">Vehicle Listings</div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-lg font-medium text-gray-900 mb-4">Financial Information</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-gray-500">Total Spent:</span>
                        <span className="text-lg font-bold text-green-600">${selectedUser.total_spent}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-gray-500">Last Activity:</span>
                        <span className="text-sm text-gray-900">{new Date(selectedUser.last_activity).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div>
                    <h4 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h4>
                    <div className="space-y-2">
                      <button className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
                        View User's Listings
                      </button>
                      <button className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
                        Send Direct Email
                      </button>
                      <button className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
                        View Payment History
                      </button>
                      {selectedUser.subscription_status === 'active' && (
                        <button className="w-full px-4 py-2 text-sm font-medium text-red-700 bg-white border border-red-300 rounded-md hover:bg-red-50">
                          Suspend Account
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Listing Detail Modal */}
      {showListingDetailModal && selectedListing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Listing Details</h3>
              <button
                onClick={() => setShowListingDetailModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Basic Information */}
                <div className="space-y-6">
                  <div>
                    <h4 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h4>
                    <div className="space-y-3">
                      <div>
                        <span className="text-sm font-medium text-gray-500">Title:</span>
                        <p className="text-sm text-gray-900 mt-1">{selectedListing.title}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-500">Description:</span>
                        <p className="text-sm text-gray-900 mt-1">{selectedListing.description}</p>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-gray-500">Price:</span>
                        <span className="text-lg font-bold text-green-600">${selectedListing.price}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-gray-500">Condition:</span>
                        <span className="text-sm text-gray-900 capitalize">{selectedListing.condition}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-gray-500">Location:</span>
                        <span className="text-sm text-gray-900">{selectedListing.location}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-gray-500">Zip Code:</span>
                        <span className="text-sm text-gray-900">{selectedListing.zip_code || 'Not provided'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Contact Information */}
                  <div>
                    <h4 className="text-lg font-medium text-gray-900 mb-4">Contact Information</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-gray-500">Contact Email:</span>
                        <span className="text-sm text-gray-900">{selectedListing.contact_email || 'Not provided'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-gray-500">Contact Phone:</span>
                        <span className="text-sm text-gray-900">{selectedListing.contact_phone || 'Not provided'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Status & Statistics */}
                <div className="space-y-6">
                  <div>
                    <h4 className="text-lg font-medium text-gray-900 mb-4">Status & Type</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-500">Status:</span>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getListingStatusBadgeColor(selectedListing.is_active)}`}>
                          {selectedListing.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-500">Type:</span>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getListingTypeBadgeColor(selectedListing.listing_type || 'free')}`}>
                          {selectedListing.listing_type === 'featured' ? 'Featured' : 
                           selectedListing.listing_type === 'vehicle' ? 'Vehicle' : 'Free'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-gray-500">Featured Until:</span>
                        <span className="text-sm text-gray-900">
                          {selectedListing.featured_until ? new Date(selectedListing.featured_until).toLocaleDateString() : 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-gray-500">Expires:</span>
                        <span className="text-sm text-gray-900">
                          {selectedListing.expires_at ? new Date(selectedListing.expires_at).toLocaleDateString() : 'Never'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-lg font-medium text-gray-900 mb-4">Statistics</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="text-2xl font-bold text-gray-900">{selectedListing.view_count || 0}</div>
                        <div className="text-sm text-gray-500">Views</div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="text-2xl font-bold text-green-600">${selectedListing.listing_fee || 0}</div>
                        <div className="text-sm text-gray-500">Listing Fee</div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-lg font-medium text-gray-900 mb-4">Timeline</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-gray-500">Created:</span>
                        <span className="text-sm text-gray-900">{new Date(selectedListing.created_at).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-gray-500">Last Updated:</span>
                        <span className="text-sm text-gray-900">{new Date(selectedListing.updated_at).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Images */}
                  {selectedListing.images && selectedListing.images.length > 0 && (
                    <div>
                      <h4 className="text-lg font-medium text-gray-900 mb-4">Images</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {selectedListing.images.map((image: any, index: number) => (
                          <img
                            key={index}
                            src={image.path || image.imageUrl}
                            alt={`Listing image ${index + 1}`}
                            className="w-full h-24 object-cover rounded-lg border border-gray-200"
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Quick Actions */}
                  <div>
                    <h4 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h4>
                    <div className="space-y-2">
                      <button className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
                        View on Site
                      </button>
                      <button className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
                        Contact Seller
                      </button>
                      {!selectedListing.is_active && (
                        <button 
                          onClick={() => {
                            handleApproveListing(selectedListing.id);
                            setShowListingDetailModal(false);
                          }}
                          className="w-full px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700"
                        >
                          Approve Listing
                        </button>
                      )}
                      <button 
                        onClick={() => {
                          handleRejectListing(selectedListing.id);
                          setShowListingDetailModal(false);
                        }}
                        className="w-full px-4 py-2 text-sm font-medium text-red-700 bg-white border border-red-300 rounded-md hover:bg-red-50"
                      >
                        {selectedListing.is_active ? 'Deactivate' : 'Reject'} Listing
                      </button>
                      {selectedListing.is_featured ? (
                        <button 
                          onClick={() => {
                            handleRemoveFeatured(selectedListing.id);
                            setShowListingDetailModal(false);
                          }}
                          className="w-full px-4 py-2 text-sm font-medium text-yellow-700 bg-white border border-yellow-300 rounded-md hover:bg-yellow-50"
                        >
                          Remove Featured Status
                        </button>
                      ) : (
                        <button 
                          onClick={() => {
                            handleMakeFeatured(selectedListing.id);
                            setShowListingDetailModal(false);
                          }}
                          className="w-full px-4 py-2 text-sm font-medium text-blue-700 bg-white border border-blue-300 rounded-md hover:bg-blue-50"
                        >
                          Make Featured
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Subscription Limits Manager Modal */}
      {showSubscriptionLimitsManager && (
        <SubscriptionLimitsManager onClose={() => setShowSubscriptionLimitsManager(false)} />
      )}

      {/* Pricing Manager Modal */}
      {showPricingManager && (
        <PricingManager onClose={() => setShowPricingManager(false)} />
      )}

      {/* Category Change Modal */}
      {showCategoryChangeModal && selectedListingForCategoryChange && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Change Category</h3>
              <button
                onClick={() => {
                  setShowCategoryChangeModal(false);
                  setSelectedListingForCategoryChange(null);
                  setNewCategoryId('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6">
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  Change category for: <strong>{selectedListingForCategoryChange.title}</strong>
                </p>
                <p className="text-sm text-gray-500">
                  Current category: <span className="font-medium">{selectedListingForCategoryChange.category?.name || 'Unknown'}</span>
                </p>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Category
                </label>
                <select
                  value={newCategoryId}
                  onChange={(e) => setNewCategoryId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">Select a category</option>
                  {categories?.map((category: any) => (
                    <option key={category.id} value={category.id}>
                      {category.icon} {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowCategoryChangeModal(false);
                    setSelectedListingForCategoryChange(null);
                    setNewCategoryId('');
                  }}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmCategoryChange}
                  disabled={!newCategoryId}
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Change Category
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
