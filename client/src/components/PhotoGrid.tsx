import { Link } from 'react-router-dom';
import { ChevronRightIcon, StarIcon, FireIcon } from '@heroicons/react/24/outline';
import { Listing } from '../services/supabaseApi';

interface PhotoGridProps {
  type: 'newest' | 'featured' | 'popular';
  title: string;
  icon: React.ReactNode;
  limit: number;
  linkTo: string;
  listings?: Listing[];
  isLoading?: boolean;
  error?: any;
}

export function PhotoGrid({ type, title, icon, limit, linkTo, listings, isLoading, error }: PhotoGridProps) {

  if (isLoading) {
    return (
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            {icon}
            <h2 className="text-xl font-bold text-gray-900">{title}</h2>
          </div>
          <div className="h-4 w-16 bg-gray-200 rounded animate-pulse"></div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {[...Array(limit)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="aspect-square bg-gray-200 rounded-lg"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            {icon}
            <h2 className="text-xl font-bold text-gray-900">{title}</h2>
          </div>
        </div>
        <div className="text-center py-8 text-gray-500">
          Error loading {type} listings: {error.message}
        </div>
      </div>
    );
  }

  if (!listings || listings.length === 0) {
    return (
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            {icon}
            <h2 className="text-xl font-bold text-gray-900">{title}</h2>
          </div>
        </div>
        <div className="text-center py-8 text-gray-500">
          No {type} listings available
        </div>
      </div>
    );
  }

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          {icon}
          <h2 className="text-xl font-bold text-gray-900">{title}</h2>
        </div>
        <Link 
          to={linkTo} 
          className="flex items-center text-blue-600 hover:text-blue-700 font-medium text-sm transition-colors"
        >
          View all
          <ChevronRightIcon className="h-4 w-4 ml-1" />
        </Link>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 max-w-6xl mx-auto">
        {listings?.slice(0, limit).map((listing: any) => (
          <Link
            key={listing.id}
            to={`/listing/${listing.id}`}
            className="group relative"
          >
            <div className="aspect-square rounded-lg overflow-hidden bg-gray-100 relative">
              {listing.images && listing.images.length > 0 ? (
                <img
                  src={listing.images[0].path}
                  alt={listing.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-100 to-indigo-100">
                  <div className="text-center">
                    <div className="text-gray-400 text-3xl mb-2">📷</div>
                    <div className="text-xs text-gray-500 font-medium">{listing.category?.name || 'Item'}</div>
                  </div>
                </div>
              )}
              
              {/* Badge */}
              {type === 'featured' && (
                <div className="absolute top-2 left-2 bg-blue-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg">
                  ✨ FEATURED
                </div>
              )}
              {type === 'newest' && (
                <div className="absolute top-2 left-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg">
                  🆕 NEW
                </div>
              )}
              
              {/* Price overlay */}
              <div className="absolute bottom-2 left-2 right-2">
                <div className="bg-black/70 text-white text-sm font-bold px-2 py-1 rounded backdrop-blur-sm">
                  ${listing.price.toLocaleString()}
                </div>
              </div>
            </div>
            
            {/* Title */}
            <div className="mt-2">
              <h3 className="text-sm font-medium text-gray-900 line-clamp-2 group-hover:text-blue-600 transition-colors">
                {listing.title}
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                {listing.location}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
