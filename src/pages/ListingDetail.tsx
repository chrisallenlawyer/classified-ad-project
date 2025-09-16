import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getListingById, incrementListingViews } from '../services/supabaseApi';
import { Listing } from '../services/supabaseApi';
import { ContactSellerForm } from '../components/ContactSellerForm';
import { WatchButton } from '../components/WatchButton';
import { ShareButton } from '../components/ShareButton';
import { useAuth } from '../contexts/AuthContext';
import SEOHead from '../components/SEOHead';
import { generateListingStructuredData, generateKeywords } from '../utils/seo';

const ListingDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showContactForm, setShowContactForm] = useState(false);
  const [contactSuccess, setContactSuccess] = useState(false);

  useEffect(() => {
    const fetchListing = async () => {
      if (!id) {
        console.error('No listing ID provided');
        setError('No listing ID provided');
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        setError(null);
        console.log('Fetching listing with ID:', id);
        console.log('Current URL:', window.location.href);
        
        // Add a small delay to ensure the listing is fully created
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const data = await getListingById(id);
        console.log('Listing data received:', data);
        
        if (!data) {
          console.error('Listing not found for ID:', id);
          setError('Listing not found');
          return;
        }
        
        console.log('Setting listing data:', data);
        setListing(data);
        
        // Increment view count
        try {
          await incrementListingViews(id);
        } catch (viewError) {
          console.warn('Failed to increment view count:', viewError);
          // Don't fail the whole operation for view count
        }
      } catch (err: any) {
        console.error('Error fetching listing:', err);
        console.error('Error details:', err);
        setError(err.message || 'Failed to load listing');
      } finally {
        setLoading(false);
      }
    };

    fetchListing();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading listing...</p>
        </div>
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Listing Not Found</h2>
          <p className="text-gray-600 mb-6">{error || 'This listing could not be found.'}</p>
          <button
            onClick={() => navigate('/')}
            className="bg-primary-600 text-white px-6 py-2 rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Generate SEO data
  const seoData = {
    title: listing.title,
    description: listing.description || `Find ${listing.title} for sale. ${listing.price ? `Price: $${listing.price}` : 'Contact for price'}. ${listing.location ? `Located in ${listing.location}` : ''}`,
    keywords: generateKeywords(listing),
    image: listing.images?.[0]?.path || '/default-listing.jpg',
    url: window.location.href,
    type: 'product' as const,
    publishedTime: listing.created_at,
    modifiedTime: listing.updated_at,
    author: listing.user?.user_metadata?.first_name || 'Anonymous',
    category: listing.category?.name || 'Category',
    price: listing.price,
    currency: 'USD',
    availability: listing.is_active ? 'in stock' as const : 'out of stock' as const
  };

  // Generate breadcrumbs
  const breadcrumbs = [
    { name: 'Home', url: '/' },
    { name: listing.category?.name || 'Category', url: `/search?category=${listing.category?.id}` },
    { name: listing.title, url: window.location.href }
  ];

  return (
    <>
      <SEOHead 
        seoData={seoData}
        structuredData={generateListingStructuredData(listing)}
        breadcrumbs={breadcrumbs}
        canonicalUrl={window.location.href}
      />
      <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="mb-6 flex items-center text-gray-600 hover:text-gray-900"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>

        <div className="bg-white shadow-sm rounded-lg overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Image section */}
            <div className="p-6">
              {listing.images && listing.images.length > 0 ? (
                <div className="space-y-4">
                  {/* Main image */}
                  <div className="aspect-w-16 aspect-h-12 bg-gray-200 rounded-lg overflow-hidden">
                    <img
                      src={listing.images[0].path}
                      alt={listing.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  
                  {/* Thumbnail gallery */}
                  {listing.images.length > 1 && (
                    <div className="grid grid-cols-4 gap-2">
                      {listing.images.slice(1).map((image, index) => (
                        <div key={index} className="aspect-square bg-gray-200 rounded-lg overflow-hidden cursor-pointer hover:opacity-75 transition-opacity">
                          <img
                            src={image.path}
                            alt={`${listing.title} ${index + 2}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="aspect-w-16 aspect-h-12 bg-gray-200 rounded-lg overflow-hidden">
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <div className="text-center">
                      <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <p>No image available</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Details section */}
            <div className="p-6">
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <h1 className="text-3xl font-bold text-gray-900">{listing.title}</h1>
                  <div className="flex items-center space-x-4">
                    <span className="text-3xl font-bold text-indigo-600">
                      {formatPrice(listing.price)}
                    </span>
                    <div className="flex items-center space-x-2">
                      <ShareButton listing={listing} variant="button" size="lg" />
                      <WatchButton listingId={listing.id} size="lg" showText={true} />
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <span className="flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {listing.location}
                  </span>
                  <span className="flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    {listing.view_count || 0} views
                  </span>
                </div>
              </div>

              {/* Category and condition */}
              <div className="mb-6">
                <div className="flex items-center space-x-4">
                  {listing.category && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800">
                      {listing.category.icon} {listing.category.name}
                    </span>
                  )}
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800 capitalize">
                    {listing.condition}
                  </span>
                </div>
              </div>

              {/* Description */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Description</h3>
                <p className="text-gray-700 whitespace-pre-wrap">{listing.description}</p>
              </div>

              {/* Contact Seller - Only show if user is not the owner */}
              {user && user.id !== listing.user_id && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Contact Seller</h3>
                  {contactSuccess ? (
                    <div className="bg-green-50 border border-green-200 rounded-md p-4">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="ml-3">
                          <h3 className="text-sm font-medium text-green-800">Message Sent!</h3>
                          <div className="mt-2 text-sm text-green-700">
                            <p>Your message has been sent to the seller. They will receive an email notification and can respond through their dashboard.</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-gray-600 text-sm">
                        Interested in this item? Send a message to the seller through our secure messaging system.
                      </p>
                      <button
                        onClick={() => setShowContactForm(true)}
                        className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center"
                      >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        Contact Seller
                      </button>
                      <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                        <p className="text-blue-800 text-xs">
                          <strong>Privacy:</strong> Your contact information is protected. The seller will only see your message, not your email or phone number.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Owner Actions - Only show if user is the owner */}
              {user && user.id === listing.user_id && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Your Listing</h3>
                  <div className="space-y-4">
                    <p className="text-gray-600 text-sm">
                      This is your listing. You can manage it from your seller dashboard.
                    </p>
                    <button
                      onClick={() => navigate('/dashboard')}
                      className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg hover:bg-indigo-700 transition-colors font-medium flex items-center justify-center"
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v2H8V5z" />
                      </svg>
                      My Dashboard
                    </button>
                  </div>
                </div>
              )}

              {/* Listing details */}
              <div className="border-t pt-6">
                <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                  <div>
                    <span className="font-medium">Listed:</span> {formatDate(listing.created_at)}
                  </div>
                  <div>
                    <span className="font-medium">Expires:</span> {formatDate(listing.expires_at)}
                  </div>
                  <div>
                    <span className="font-medium">Zip Code:</span> {listing.zip_code}
                  </div>
                  <div>
                    <span className="font-medium">Status:</span> 
                    <span className={`ml-1 capitalize ${
                      listing.is_active ? 'text-green-600' : 'text-gray-600'
                    }`}>
                      {listing.is_active ? 'active' : 'inactive'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contact Seller Form Modal */}
      {showContactForm && (
        <ContactSellerForm
          listingId={listing.id}
          sellerName={listing.user?.user_metadata?.first_name || listing.user?.email || 'Seller'}
          listingTitle={listing.title}
          onClose={() => setShowContactForm(false)}
          onSuccess={() => setContactSuccess(true)}
        />
      )}
      </div>
    </>
  );
};

export default ListingDetail;
