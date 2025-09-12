import { useQuery } from 'react-query';
import { Link } from 'react-router-dom';
import { ChevronRightIcon, StarIcon } from '@heroicons/react/24/outline';
import { ListingCard } from './ListingCard';
import { getPromotedListings } from '../services/supabaseApi';

export function PromotedListings() {
  const { data: promotedListings, isLoading } = useQuery(
    'promoted-listings',
    () => getPromotedListings(4)
  );

  if (isLoading) {
    return (
      <div className="mb-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">⭐ Promoted Listings</h2>
          <div className="h-6 w-20 bg-gray-200 rounded animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
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
        <div className="flex items-center space-x-2">
          <StarIcon className="h-6 w-6 text-yellow-500" />
          <h2 className="text-2xl font-bold text-gray-900">Promoted Listings</h2>
        </div>
        <Link 
          to="/search?promoted=true" 
          className="flex items-center text-blue-600 hover:text-blue-700 font-medium transition-colors"
        >
          View all promoted
          <ChevronRightIcon className="h-4 w-4 ml-1" />
        </Link>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {promotedListings?.data?.map((listing: any) => (
          <ListingCard 
            key={listing.id} 
            listing={listing} 
            variant="promoted"
          />
        ))}
      </div>
    </div>
  );
}


