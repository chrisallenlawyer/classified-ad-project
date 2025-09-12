import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { createListingWithImages, getCategories, Category, UploadedImage, uploadMultipleImages } from '../services/supabaseApi';
import { subscriptionApi } from '../services/subscriptionApi';
import PaymentForm from './PaymentForm';
import { 
  StarIcon, 
  TruckIcon, 
  CreditCardIcon,
  CheckCircleIcon 
} from '@heroicons/react/24/outline';

const CreateListingForm: React.FC = () => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    category_id: '',
    location: '',
    zip_code: '',
    contact_email: '',
    contact_phone: '',
    condition: 'good',
    expires_at: '',
    listing_type: 'free' as 'free' | 'featured' | 'vehicle'
  });
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [pricingConfig, setPricingConfig] = useState<any>({});
  const [userSubscription, setUserSubscription] = useState<any>(null);
  const [userUsage, setUserUsage] = useState<any>(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentType, setPaymentType] = useState<'featured_listing' | 'vehicle_listing' | 'vehicle_featured_listing'>('featured_listing');
  const [limitError, setLimitError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  // Load saved form data from localStorage
  const loadSavedData = () => {
    const savedData = localStorage.getItem('listingFormData');
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        setFormData(prev => ({
          ...prev,
          ...parsed,
          title: '', // Always clear title for new listing
          description: '', // Always clear description for new listing
          price: '', // Always clear price for new listing
        }));
      } catch (err) {
        console.error('Error loading saved form data:', err);
      }
    }
  };

  // Save form data to localStorage (excluding title, description, price)
  const saveFormData = (data: typeof formData) => {
    const dataToSave = {
      category_id: data.category_id,
      location: data.location,
      zip_code: data.zip_code,
      contact_email: data.contact_email,
      contact_phone: data.contact_phone,
      condition: data.condition,
      expires_at: data.expires_at
    };
    localStorage.setItem('listingFormData', JSON.stringify(dataToSave));
  };

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const data = await getCategories();
        setCategories(data);
      } catch (err) {
        console.error('Error fetching categories:', err);
      }
    };

    fetchCategories();
    loadSavedData(); // Load saved form data
    loadPricingData(); // Load pricing configuration
  }, []);

  // Load pricing configuration and user subscription
  const loadPricingData = async () => {
    if (!user) return;
    
    try {
      const [config, subscription, usage] = await Promise.all([
        subscriptionApi.getPricingConfig(),
        subscriptionApi.getUserSubscription(user.id),
        subscriptionApi.getUserUsage(user.id)
      ]);
      setPricingConfig(config);
      setUserSubscription(subscription);
      setUserUsage(usage);
    } catch (error) {
      console.error('Error loading pricing data:', error);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    let newFormData = {
      ...formData,
      [name]: value
    };
    
    // If category is changed, check if it's a vehicle category
    if (name === 'category_id') {
      const selectedCategory = categories.find(cat => cat.id === value);
      if (selectedCategory?.is_vehicle) {
        // For vehicle categories, only allow vehicle or featured (not free)
        if (formData.listing_type === 'free') {
          newFormData = {
            ...newFormData,
            listing_type: 'vehicle'
          };
        }
        // If already featured or vehicle, keep it
      } else if (formData.listing_type === 'vehicle') {
        // If switching away from vehicle category, reset to free
        newFormData = {
          ...newFormData,
          listing_type: 'free'
        };
      }
    }
    
    setFormData(newFormData);
    
    // Save form data to localStorage (excluding title, description, price)
    if (name !== 'title' && name !== 'description' && name !== 'price') {
      saveFormData(newFormData);
    }
  };

  const handleImageUpload = async (files: FileList) => {
    if (!files.length) return;

    setUploadingImages(true);
    try {
      const fileArray = Array.from(files);
      const uploadedImages = await uploadMultipleImages(fileArray);
      setImages(prev => [...prev, ...uploadedImages]);
    } catch (err: any) {
      console.error('Error uploading images:', err);
      setError(err.message || 'Failed to upload images');
    } finally {
      setUploadingImages(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      handleImageUpload(files);
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  // Handle listing type change
  const handleListingTypeChange = async (type: 'free' | 'featured' | 'vehicle') => {
    if (!user) return;
    
    // Prevent switching to 'free' if a vehicle category is selected
    if (type === 'free' && formData.category_id && categories.find(cat => cat.id === formData.category_id)?.is_vehicle) {
      return;
    }
    
    setFormData(prev => ({ ...prev, listing_type: type }));
    setLimitError('');
    
    // Check if user can create this type of listing
    try {
      // For vehicle categories, always check vehicle limits regardless of listing type
      const selectedCategory = categories.find(cat => cat.id === formData.category_id);
      const isVehicleCategory = selectedCategory?.is_vehicle;
      const checkType = isVehicleCategory ? 'vehicle' : type;
      
      console.log('Checking limits for user:', user.id, 'listing_type:', checkType);
      console.log('User subscription:', userSubscription);
      console.log('User usage:', userUsage);
      
      const canCreate = await subscriptionApi.canUserCreateListing(user.id, checkType);
      if (!canCreate) {
        const plan = userSubscription?.subscription_plan;
        const usage = userUsage;
        
        if (checkType === 'free') {
          const freeLimit = plan?.max_listings || 5;
          const used = usage?.free_listings_used || 0;
          setLimitError(`You've reached your free listing limit (${used}/${freeLimit}). Please upgrade your plan or wait until next month.`);
        } else if (checkType === 'featured') {
          const featuredLimit = plan?.max_featured_listings || 0;
          const used = usage?.featured_listings_used || 0;
          setLimitError(`You've reached your featured listing limit (${used}/${featuredLimit}). Please upgrade your plan or wait until next month.`);
        } else if (checkType === 'vehicle') {
          const vehicleLimit = plan?.max_vehicle_listings || 0;
          const used = usage?.vehicle_listings_used || 0;
          setLimitError(`You've reached your vehicle listing limit (${used}/${vehicleLimit}). Please upgrade your plan or wait until next month.`);
        }
        return;
      }
    } catch (error) {
      console.error('Error checking listing limits:', error);
      setLimitError('Unable to verify listing limits. Please try again.');
      return;
    }
    
    // Set payment amount and type based on category and listing type
    const selectedCategory = categories.find(cat => cat.id === formData.category_id);
    const isVehicleCategory = selectedCategory?.is_vehicle;
    
    if (isVehicleCategory) {
      if (type === 'featured') {
        // Vehicle category + featured = both fees
        setPaymentAmount((pricingConfig.vehicle_listing_price?.amount || 20) + (pricingConfig.featured_listing_price?.amount || 5));
        setPaymentType('vehicle_featured_listing');
      } else {
        // Vehicle category + vehicle = just vehicle fee
        setPaymentAmount(pricingConfig.vehicle_listing_price?.amount || 20);
        setPaymentType('vehicle_listing');
      }
    } else if (type === 'featured') {
      setPaymentAmount(pricingConfig.featured_listing_price?.amount || 5);
      setPaymentType('featured_listing');
    } else if (type === 'vehicle') {
      setPaymentAmount(pricingConfig.vehicle_listing_price?.amount || 20);
      setPaymentType('vehicle_listing');
    }
  };

  // Handle payment success
  const handlePaymentSuccess = async (_paymentId: string) => {
    setShowPaymentForm(false);
    // Continue with listing creation
    await createListing();
  };

  // Handle payment error
  const handlePaymentError = (error: string) => {
    setError(`Payment failed: ${error}`);
    setShowPaymentForm(false);
  };

  // Create listing (called after payment or for free listings)
  const createListing = async () => {
    try {
      // Calculate expiration date
      const daysToAdd = parseInt(formData.expires_at) || 30;
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + daysToAdd);

      // Determine final listing type and fee based on category
      const selectedCategory = categories.find(cat => cat.id === formData.category_id);
      const isVehicleCategory = selectedCategory?.is_vehicle;
      
      let finalListingType = formData.listing_type;
      let finalListingFee = 0;
      
      if (isVehicleCategory) {
        // For vehicle categories, determine if it's featured + vehicle
        if (formData.listing_type === 'featured') {
          finalListingType = 'vehicle';
          finalListingFee = paymentAmount || ((pricingConfig.vehicle_listing_price?.amount || 20) + (pricingConfig.featured_listing_price?.amount || 5));
        } else {
          finalListingType = 'vehicle';
          finalListingFee = paymentAmount || (pricingConfig.vehicle_listing_price?.amount || 20);
        }
      } else if (formData.listing_type !== 'free') {
        finalListingFee = paymentAmount || 0;
      }

      const listingData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        price: parseFloat(formData.price),
        category_id: formData.category_id,
        location: formData.location.trim(),
        zip_code: formData.zip_code.trim(),
        contact_email: formData.contact_email.trim() || undefined,
        contact_phone: formData.contact_phone.trim() || undefined,
        condition: formData.condition,
        expires_at: expirationDate.toISOString(),
        images: images,
        listing_type: finalListingType,
        listing_fee: finalListingFee
      };

      console.log('About to call createListingWithImages with:', listingData);
      const newListing = await createListingWithImages(listingData, user);
      console.log('Listing created successfully:', newListing);
      navigate(`/listing/${newListing.id}`);
    } catch (err: any) {
      console.error('Error creating listing:', err);
      setError(err.message || 'Failed to create listing. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('Form submitted!');
    console.log('User:', user);
    console.log('Form data:', formData);
    
    setIsLoading(true);
    setError('');
    setLimitError('');

    // Check subscription limits first
    if (user && formData.listing_type) {
      try {
        console.log('Checking limits for user:', user.id, 'listing_type:', formData.listing_type);
        console.log('User subscription:', userSubscription);
        console.log('User usage:', userUsage);
        
        const canCreate = await subscriptionApi.canUserCreateListing(user.id, formData.listing_type);
        console.log('Can create listing:', canCreate);
        
        if (!canCreate) {
          const plan = userSubscription?.subscription_plan;
          const usage = userUsage;
          
          if (formData.listing_type === 'free') {
            const freeLimit = plan?.max_listings || 5;
            const used = usage?.free_listings_used || 0;
            setLimitError(`You've reached your free listing limit (${used}/${freeLimit}). Please upgrade your plan or wait until next month.`);
          } else if (formData.listing_type === 'featured') {
            const featuredLimit = plan?.max_featured_listings || 0;
            const used = usage?.featured_listings_used || 0;
            setLimitError(`You've reached your featured listing limit (${used}/${featuredLimit}). Please upgrade your plan or wait until next month.`);
          } else if (formData.listing_type === 'vehicle') {
            const vehicleLimit = plan?.max_vehicle_listings || 0;
            const used = usage?.vehicle_listings_used || 0;
            setLimitError(`You've reached your vehicle listing limit (${used}/${vehicleLimit}). Please upgrade your plan or wait until next month.`);
          }
          setIsLoading(false);
          return;
        }
      } catch (error) {
        console.error('Error checking listing limits:', error);
        setLimitError('Unable to verify listing limits. Please try again.');
        setIsLoading(false);
        return;
      }
    }

    // Validation
    if (!formData.title.trim()) {
      setError('Title is required');
      setIsLoading(false);
      return;
    }

    if (!formData.description.trim()) {
      setError('Description is required');
      setIsLoading(false);
      return;
    }

    if (!formData.price || parseFloat(formData.price) <= 0) {
      setError('Please enter a valid price');
      setIsLoading(false);
      return;
    }

    if (!formData.category_id) {
      setError('Please select a category');
      setIsLoading(false);
      return;
    }

    // Check if trying to create a free listing for a vehicle category
    const selectedCategory = categories.find(cat => cat.id === formData.category_id);
    if (selectedCategory?.is_vehicle && formData.listing_type === 'free') {
      setError('Vehicle categories require a vehicle listing fee. Please select "Vehicle Listing" or "Featured Listing" instead.');
      setIsLoading(false);
      return;
    }

    if (!formData.location.trim()) {
      setError('Location is required');
      setIsLoading(false);
      return;
    }

    // Check if payment is required
    const isVehicleCategory = selectedCategory?.is_vehicle;
    
    if (formData.listing_type === 'featured' || formData.listing_type === 'vehicle' || isVehicleCategory) {
      // Determine payment type and amount
      if (isVehicleCategory) {
        if (formData.listing_type === 'featured') {
          // Vehicle category + featured = both fees
          setPaymentType('vehicle_featured_listing');
          setPaymentAmount((pricingConfig.vehicle_listing_price?.amount || 20) + (pricingConfig.featured_listing_price?.amount || 5));
        } else {
          // Vehicle category + vehicle = just vehicle fee
          setPaymentType('vehicle_listing');
          setPaymentAmount(pricingConfig.vehicle_listing_price?.amount || 20);
        }
      } else if (formData.listing_type === 'featured') {
        setPaymentType('featured_listing');
        setPaymentAmount(pricingConfig.featured_listing_price?.amount || 5);
      } else {
        setPaymentType('vehicle_listing');
        setPaymentAmount(pricingConfig.vehicle_listing_price?.amount || 20);
      }
      
      setShowPaymentForm(true);
      setIsLoading(false);
      return;
    }

    // For free listings, create directly
    await createListing();
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Sign In Required</h2>
          <p className="text-gray-600 mb-6">You need to be signed in to create a listing.</p>
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

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white shadow-sm rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Create New Listing</h1>
                <p className="text-gray-600">Fill out the form below to post your item for sale.</p>
                <p className="text-sm text-blue-600 mt-1">
                  ✨ Your contact info and preferences are remembered for faster listing creation
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  localStorage.removeItem('listingFormData');
                  setFormData({
                    title: '',
                    description: '',
                    price: '',
                    category_id: '',
                    location: '',
                    zip_code: '',
                    contact_email: '',
                    contact_phone: '',
                    condition: 'good',
                    expires_at: '',
                    listing_type: 'free' as 'free' | 'featured' | 'vehicle'
                  });
                }}
                className="text-sm text-gray-500 hover:text-gray-700 underline"
              >
                Clear saved data
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Title */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                Title *
              </label>
              <input
                type="text"
                id="title"
                name="title"
                required
                value={formData.title}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="What are you selling?"
                maxLength={200}
              />
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                Description *
              </label>
              <textarea
                id="description"
                name="description"
                required
                rows={4}
                value={formData.description}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Describe your item in detail..."
              />
            </div>

            {/* Image Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Images
              </label>
              <div className="space-y-4">
                {/* File Input */}
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingImages}
                    className="w-full px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg hover:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {uploadingImages ? (
                      <span className="text-gray-500">Uploading images...</span>
                    ) : (
                      <span className="text-gray-600">Click to upload images or drag and drop</span>
                    )}
                  </button>
                  <p className="text-xs text-gray-500 mt-1">
                    Upload up to 10 images (PNG, JPG, GIF, WebP). Max 5MB per image.
                  </p>
                </div>

                {/* Image Preview */}
                {images.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {images.map((image, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={`http://localhost:3002${image.imageUrl}`}
                          alt={`Upload ${index + 1}`}
                          className="w-full h-24 object-cover rounded-lg border border-gray-200"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500"
                        >
                          ×
                        </button>
                        {index === 0 && (
                          <div className="absolute bottom-1 left-1 bg-indigo-500 text-white text-xs px-2 py-1 rounded">
                            Primary
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Price, Category, Condition, and Expiration */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-2">
                  Price *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">$</span>
                  </div>
                  <input
                    type="number"
                    id="price"
                    name="price"
                    required
                    min="0"
                    step="0.01"
                    value={formData.price}
                    onChange={handleChange}
                    className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="category_id" className="block text-sm font-medium text-gray-700 mb-2">
                  Category *
                </label>
                <select
                  id="category_id"
                  name="category_id"
                  required
                  value={formData.category_id}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="">Select a category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.icon} {category.name} {category.is_vehicle ? '🚗' : ''}
                    </option>
                  ))}
                </select>
                {formData.category_id && categories.find(cat => cat.id === formData.category_id)?.is_vehicle && (
                  <p className="mt-2 text-sm text-blue-600 flex items-center">
                    <TruckIcon className="h-4 w-4 mr-1" />
                    This is a vehicle category. Vehicle listing: ${pricingConfig.vehicle_listing_price?.amount || 20}. Featured listing: ${(pricingConfig.vehicle_listing_price?.amount || 20) + (pricingConfig.featured_listing_price?.amount || 5)} (includes both fees).
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="condition" className="block text-sm font-medium text-gray-700 mb-2">
                  Condition *
                </label>
                <select
                  id="condition"
                  name="condition"
                  required
                  value={formData.condition}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="new">New</option>
                  <option value="like-new">Like New</option>
                  <option value="good">Good</option>
                  <option value="fair">Fair</option>
                  <option value="poor">Poor</option>
                </select>
              </div>

              <div>
                <label htmlFor="expires_at" className="block text-sm font-medium text-gray-700 mb-2">
                  Expires In *
                </label>
                <select
                  id="expires_at"
                  name="expires_at"
                  required
                  value={formData.expires_at}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="">Select duration</option>
                  <option value="7">7 days</option>
                  <option value="14">14 days</option>
                  <option value="30">30 days</option>
                  <option value="60">60 days</option>
                  <option value="90">90 days</option>
                </select>
              </div>
            </div>

            {/* Listing Type and Pricing Options */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Listing Type
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Free Listing */}
                <div
                  className={`relative border-2 rounded-lg p-4 transition-all ${
                    formData.listing_type === 'free'
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  } ${
                    formData.category_id && categories.find(cat => cat.id === formData.category_id)?.is_vehicle
                      ? 'opacity-50 cursor-not-allowed'
                      : 'cursor-pointer'
                  }`}
                  onClick={() => {
                    if (!(formData.category_id && categories.find(cat => cat.id === formData.category_id)?.is_vehicle)) {
                      handleListingTypeChange('free');
                    }
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">Free Listing</h3>
                      <p className="text-xs text-gray-600 mt-1">Basic listing visibility</p>
                      {formData.category_id && categories.find(cat => cat.id === formData.category_id)?.is_vehicle && (
                        <p className="text-xs text-red-600 mt-1">Not available for vehicle categories (use Featured or Vehicle listing)</p>
                      )}
                    </div>
                    <div className="flex items-center">
                      {formData.listing_type === 'free' && (
                        <CheckCircleIcon className="h-5 w-5 text-primary-600" />
                      )}
                    </div>
                  </div>
                  <div className="mt-2 text-lg font-bold text-green-600">$0</div>
                </div>

                {/* Featured Listing */}
                <div
                  className={`relative border-2 rounded-lg p-4 cursor-pointer transition-all ${
                    formData.listing_type === 'featured'
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => handleListingTypeChange('featured')}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900 flex items-center">
                        <StarIcon className="h-4 w-4 text-yellow-500 mr-1" />
                        Featured Listing
                      </h3>
                      <p className="text-xs text-gray-600 mt-1">Enhanced visibility & priority</p>
                    </div>
                    <div className="flex items-center">
                      {formData.listing_type === 'featured' && (
                        <CheckCircleIcon className="h-5 w-5 text-primary-600" />
                      )}
                    </div>
                  </div>
                  <div className="mt-2 text-lg font-bold text-primary-600">
                    {formData.category_id && categories.find(cat => cat.id === formData.category_id)?.is_vehicle ? (
                      <div>
                        <div className="text-sm text-gray-500 line-through">${pricingConfig.featured_listing_price?.amount || 5}</div>
                        <div>${(pricingConfig.vehicle_listing_price?.amount || 20) + (pricingConfig.featured_listing_price?.amount || 5)}</div>
                        <div className="text-xs text-gray-600">Vehicle + Featured</div>
                      </div>
                    ) : (
                      `$${pricingConfig.featured_listing_price?.amount || 5}`
                    )}
                  </div>
                </div>

                {/* Vehicle Listing */}
                <div
                  className={`relative border-2 rounded-lg p-4 cursor-pointer transition-all ${
                    formData.listing_type === 'vehicle'
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => handleListingTypeChange('vehicle')}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900 flex items-center">
                        <TruckIcon className="h-4 w-4 text-blue-500 mr-1" />
                        Vehicle Listing
                      </h3>
                      <p className="text-xs text-gray-600 mt-1">Specialized vehicle features</p>
                    </div>
                    <div className="flex items-center">
                      {formData.listing_type === 'vehicle' && (
                        <CheckCircleIcon className="h-5 w-5 text-primary-600" />
                      )}
                    </div>
                  </div>
                  <div className="mt-2 text-lg font-bold text-primary-600">
                    ${pricingConfig.vehicle_listing_price?.amount || 20}
                  </div>
                </div>
              </div>

              {/* Usage Display */}
              {userSubscription && userUsage && (
                <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Your Current Usage</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Free Listings:</span>
                      <span className="ml-2 font-medium">
                        {userUsage.free_listings_used || 0} / {userSubscription.subscription_plan?.max_listings || 5}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Featured Listings:</span>
                      <span className="ml-2 font-medium">
                        {userUsage.featured_listings_used || 0} / {userSubscription.subscription_plan?.max_featured_listings || 0}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Vehicle Listings:</span>
                      <span className="ml-2 font-medium">
                        {userUsage.vehicle_listings_used || 0} / {userSubscription.subscription_plan?.max_vehicle_listings || 0}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Payment Info */}
              {formData.listing_type !== 'free' && (
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center">
                    <CreditCardIcon className="h-5 w-5 text-blue-500 mr-2" />
                    <div>
                      <p className="text-sm font-medium text-blue-900">
                        Payment Required
                      </p>
                      <p className="text-xs text-blue-700">
                        You'll be redirected to secure payment after submitting this form.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Location and Zip Code */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">
                  Location *
                </label>
                <input
                  type="text"
                  id="location"
                  name="location"
                  required
                  value={formData.location}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="City, State (e.g., Tuscaloosa, AL)"
                />
              </div>
              
              <div>
                <label htmlFor="zip_code" className="block text-sm font-medium text-gray-700 mb-2">
                  Zip Code *
                </label>
                <input
                  type="text"
                  id="zip_code"
                  name="zip_code"
                  required
                  value={formData.zip_code}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="35201"
                  maxLength={10}
                />
              </div>
            </div>

            {/* Contact Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="contact_email" className="block text-sm font-medium text-gray-700 mb-2">
                  Contact Email
                </label>
                <input
                  type="email"
                  id="contact_email"
                  name="contact_email"
                  value={formData.contact_email}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="your@email.com"
                />
                <p className="text-xs text-gray-500 mt-1">Leave blank to use your account email</p>
              </div>

              <div>
                <label htmlFor="contact_phone" className="block text-sm font-medium text-gray-700 mb-2">
                  Contact Phone
                </label>
                <input
                  type="tel"
                  id="contact_phone"
                  name="contact_phone"
                  value={formData.contact_phone}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="(205) 555-0123"
                />
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <div className="text-red-600 text-sm">{error}</div>
              </div>
            )}

            {/* Limit Error Message */}
            {limitError && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                <div className="text-yellow-800 text-sm font-medium">{limitError}</div>
                <div className="text-yellow-700 text-sm mt-1">
                  Consider upgrading your subscription plan for more listings.
                </div>
              </div>
            )}

            {/* Submit Buttons */}
            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => navigate('/')}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Creating...' : 'Create Listing'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Payment Form Modal */}
      {showPaymentForm && (
        <PaymentForm
          amount={paymentAmount}
          currency="USD"
          paymentType={paymentType}
          onSuccess={handlePaymentSuccess}
          onError={handlePaymentError}
          onCancel={() => setShowPaymentForm(false)}
        />
      )}
    </div>
  );
};

export default CreateListingForm;
