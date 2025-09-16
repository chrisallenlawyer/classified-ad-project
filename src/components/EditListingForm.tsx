import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getListingById, getCategories, Category, UploadedImage, uploadMultipleImages, updateListingWithImages } from '../services/supabaseApi';

const EditListingForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
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
    expires_at: ''
  });
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [loadingListing, setLoadingListing] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch categories
        const categoriesData = await getCategories();
        setCategories(categoriesData);

        // Check if user is authenticated
        console.log('🔍 Full user object:', user);
        console.log('🔍 User ID:', user?.id);
        console.log('🔍 User type:', typeof user);
        
        if (!user) {
          setError('You must be logged in to edit listings');
          return;
        }

        // Fetch listing data
        if (id) {
          const listingData = await getListingById(id);
          
          if (!listingData) {
            setError('Listing not found');
            return;
          }
          
          // Check if user owns this listing
          const listingUserId = listingData.user?.id || listingData.user_id;
          console.log('🔍 User ID from auth:', user?.id);
          console.log('🔍 Listing user ID:', listingUserId);
          console.log('🔍 User type:', typeof user?.id);
          console.log('🔍 Listing user ID type:', typeof listingUserId);
          console.log('🔍 Are they equal?', listingUserId === user?.id);
          
          if (listingUserId !== user?.id) {
            setError('You can only edit your own listings');
            return;
          }

          // Populate form data
          console.log('📝 Listing data received:', listingData);
          console.log('📝 Category ID:', listingData.category_id);
          console.log('📝 Zip Code:', listingData.zip_code);
          
          setFormData({
            title: listingData.title,
            description: listingData.description,
            price: listingData.price.toString(),
            category_id: listingData.category_id || '',
            location: listingData.location,
            zip_code: listingData.zip_code || '',
            contact_email: listingData.contact_email || '',
            contact_phone: listingData.contact_phone || '',
            condition: listingData.condition || 'good',
            expires_at: '30' // Default to 30 days
          });

          // Convert existing images to UploadedImage format
          if (listingData.images && listingData.images.length > 0) {
            console.log('📸 Raw images from listing data:', listingData.images);
            const existingImages: UploadedImage[] = listingData.images.map((img, index) => {
              console.log(`📸 Processing image ${index}:`, img);
              // Handle both string URLs and image objects
              let imageUrl = '';
              if (typeof img === 'string') {
                imageUrl = img;
                console.log(`📸 Image ${index} is string:`, imageUrl);
              } else if (img.path) {
                // Don't add leading slash to full URLs (https://)
                if (img.path.startsWith('http://') || img.path.startsWith('https://')) {
                  imageUrl = img.path;
                } else {
                  imageUrl = img.path.startsWith('/') ? img.path : `/${img.path}`;
                }
                console.log(`📸 Image ${index} has path:`, imageUrl);
              } else if (img.imageUrl) {
                imageUrl = img.imageUrl;
                console.log(`📸 Image ${index} has imageUrl:`, imageUrl);
              }
              
              const result = {
                imageUrl,
                filename: img.filename || 'existing-image',
                originalName: img.original_name || 'existing-image',
                size: img.size || 0,
                mimeType: img.mime_type || 'image/jpeg'
              };
              console.log(`📸 Converted image ${index}:`, result);
              return result;
            });
            console.log('📸 Final existing images array:', existingImages);
            setImages(existingImages);
          }
        }
      } catch (err: any) {
        console.error('Error fetching data:', err);
        setError(err.message || 'Failed to load listing data');
      } finally {
        setLoadingListing(false);
      }
    };

    fetchData();
  }, [id, user?.id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
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

  const moveImageUp = (index: number) => {
    if (index > 0) {
      const newImages = [...images];
      [newImages[index - 1], newImages[index]] = [newImages[index], newImages[index - 1]];
      setImages(newImages);
    }
  };

  const moveImageDown = (index: number) => {
    if (index < images.length - 1) {
      const newImages = [...images];
      [newImages[index], newImages[index + 1]] = [newImages[index + 1], newImages[index]];
      setImages(newImages);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!id) {
      setError('Listing ID not found');
      return;
    }

    setIsLoading(true);
    setError('');

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

    if (!formData.location.trim()) {
      setError('Location is required');
      setIsLoading(false);
      return;
    }

    try {
      // Calculate expiration date
      const daysToAdd = parseInt(formData.expires_at) || 30;
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + daysToAdd);

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
        images: images
      };

      console.log('📝 Form data before submission:', formData);
      console.log('📸 Images being submitted:', images);
      console.log('📝 About to call updateListingWithImages with:', listingData);
      const updatedListing = await updateListingWithImages(id, listingData);
      console.log('Listing updated successfully:', updatedListing);
      navigate(`/listing/${updatedListing.id}`);
    } catch (err: any) {
      console.error('Error updating listing:', err);
      setError(err.message || 'Failed to update listing. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (loadingListing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading listing data...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Sign In Required</h2>
          <p className="text-gray-600 mb-6">You need to be signed in to edit a listing.</p>
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
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow-sm rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">Edit Listing</h1>
            <p className="text-gray-600">Update your listing details and images</p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
                {error}
              </div>
            )}

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
                      <span className="text-gray-600">Click to upload more images or drag and drop</span>
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
                        {/* Image reorder buttons */}
                        <div className="absolute top-1 left-1 flex flex-col space-y-1">
                          {index > 0 && (
                            <button
                              type="button"
                              onClick={() => moveImageUp(index)}
                              className="bg-white bg-opacity-80 hover:bg-opacity-100 rounded-full w-6 h-6 flex items-center justify-center text-xs"
                            >
                              ↑
                            </button>
                          )}
                          {index < images.length - 1 && (
                            <button
                              type="button"
                              onClick={() => moveImageDown(index)}
                              className="bg-white bg-opacity-80 hover:bg-opacity-100 rounded-full w-6 h-6 flex items-center justify-center text-xs"
                            >
                              ↓
                            </button>
                          )}
                        </div>
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
                    step="0.01"
                    min="0"
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
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="condition" className="block text-sm font-medium text-gray-700 mb-2">
                  Condition
                </label>
                <select
                  id="condition"
                  name="condition"
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
                  Expires In
                </label>
                <select
                  id="expires_at"
                  name="expires_at"
                  value={formData.expires_at}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="7">7 days</option>
                  <option value="14">14 days</option>
                  <option value="30">30 days</option>
                  <option value="60">60 days</option>
                  <option value="90">90 days</option>
                </select>
              </div>
            </div>

            {/* Location and Contact Info */}
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
                  placeholder="City, State"
                />
              </div>

              <div>
                <label htmlFor="zip_code" className="block text-sm font-medium text-gray-700 mb-2">
                  ZIP Code
                </label>
                <input
                  type="text"
                  id="zip_code"
                  name="zip_code"
                  value={formData.zip_code}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="12345"
                />
              </div>
            </div>

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
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>

            {/* Submit Buttons */}
            <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Updating...' : 'Update Listing'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditListingForm;
