import { Link } from 'react-router-dom';
import { EyeIcon, StarIcon } from '@heroicons/react/24/outline';
import { Listing } from '../services/supabaseApi';
import { WatchButton } from './WatchButton';
import { ShareButton } from './ShareButton';

interface ListingCardProps {
  listing: Listing;
  variant?: 'default' | 'featured' | 'promoted';
  showCategory?: boolean;
}

export function ListingCard({ 
  listing, 
  variant = 'default', 
  showCategory = true 
}: ListingCardProps) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Today';
    if (diffDays === 2) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays - 1} days ago`;
    return date.toLocaleDateString();
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'featured':
        return 'ring-2 ring-blue-500 bg-blue-50/30';
      case 'promoted':
        return 'ring-2 ring-yellow-500 bg-gradient-to-br from-yellow-50 to-orange-50';
      default:
        return 'hover:shadow-lg';
    }
  };

  const getBadge = () => {
    if (variant === 'promoted') {
      return (
        <div className="absolute top-2 left-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg">
          ⭐ PROMOTED
        </div>
      );
    }
    if (variant === 'featured') {
      return (
        <div className="absolute top-2 left-2 bg-blue-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg">
          ✨ FEATURED
        </div>
      );
    }
    return null;
  };

  return (
    <div className={`relative bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden transition-all duration-300 ${getVariantStyles()}`}>
      {getBadge()}
      
        {/* Image */}
        <div className="relative h-48 bg-gray-100">
          {listing.images && listing.images.length > 0 ? (
            <img
              src={`http://localhost:3002${listing.images[0].path}?t=${Date.now()}`}
              alt={listing.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-100">
              <div className="text-gray-400 text-4xl">📷</div>
            </div>
          )}
        
        {/* Action buttons */}
        <div className="absolute top-2 right-2 flex space-x-1">
          <ShareButton listing={listing} variant="icon" size="sm" />
          <WatchButton listingId={listing.id} size="sm" />
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Price and condition */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-2xl font-bold text-gray-900">
            {formatPrice(listing.price)}
          </span>
          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
            {listing.condition}
          </span>
        </div>

        {/* Title */}
        <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 hover:text-blue-600 transition-colors">
          <Link to={`/listing/${listing.id}`}>
            {listing.title}
          </Link>
        </h3>

        {/* Category */}
        {showCategory && listing.category && (
          <div className="text-xs text-blue-600 font-medium mb-2">
            {listing.category.name}
          </div>
        )}

        {/* Location and stats */}
        <div className="flex items-center justify-between text-sm text-gray-500">
          <div className="flex items-center space-x-1">
            <span>📍</span>
            <span>{listing.location}</span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1">
              <EyeIcon className="h-4 w-4" />
              <span>{listing.view_count || 0}</span>
            </div>
            <span>{formatDate(listing.created_at)}</span>
          </div>
        </div>

        {/* Seller info */}
        {listing.user && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center">
                <span className="text-xs font-medium text-gray-600">
                  {listing.user.user_metadata?.first_name?.[0] || 'U'}{listing.user.user_metadata?.last_name?.[0] || 'U'}
                </span>
              </div>
              <span className="text-sm text-gray-600">
                {listing.user.user_metadata?.first_name || 'User'} {listing.user.user_metadata?.last_name || ''}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

