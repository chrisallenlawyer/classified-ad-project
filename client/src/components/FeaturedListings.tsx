import { useQuery } from 'react-query';
import { Link } from 'react-router-dom';
import { ChevronRightIcon } from '@heroicons/react/24/outline';
import { ListingCard } from './ListingCard';
import { getFeaturedListings } from '../services/supabaseApi';

export function FeaturedListings() {
  const { data: featuredListings, isLoading } = useQuery(
    'featured-listings',
    () => getFeaturedListings(6)
  );

  if (isLoading) {
    return (
      <div className="mb-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Featured Listings</h2>
          <div className="h-6 w-20 bg-gray-200 rounded animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-gray-200 rounded-xl h-64"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mb-12">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">✨ Featured Listings</h2>
        <Link 
          to="/search?featured=true" 
          className="flex items-center text-blue-600 hover:text-blue-700 font-medium transition-colors"
        >
          View all featured
          <ChevronRightIcon className="h-4 w-4 ml-1" />
        </Link>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {featuredListings?.data?.map((listing: any) => (
          <ListingCard 
            key={listing.id} 
            listing={listing} 
            variant="featured"
          />
        ))}
      </div>
    </div>
  );
}


