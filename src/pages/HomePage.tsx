import { useQuery } from 'react-query';
import { Link } from 'react-router-dom';
import { FireIcon } from '@heroicons/react/24/outline';
import { getCategories, getFeaturedListings, getNewestListings, getPopularListings } from '../services/supabaseApi';
import { HeroSection } from '../components/HeroSection';
import { PhotoGrid } from '../components/PhotoGrid';
import SEOHead from '../components/SEOHead';
import { defaultSEO, generateWebsiteStructuredData } from '../utils/seo';

export function HomePage() {
  const { data: categories, isLoading: categoriesLoading } = useQuery('categories', getCategories);
  const { data: featuredListings, isLoading: featuredLoading } = useQuery('featured-listings', () => getFeaturedListings(6));
  const { data: newestListings, isLoading: newestLoading } = useQuery('newest-listings', () => getNewestListings(6));
  const { data: popularListings, isLoading: popularLoading } = useQuery('popular-listings', () => getPopularListings(6));

  return (
    <>
      <SEOHead 
        seoData={{
          ...defaultSEO,
          title: 'Classified Ads - Buy, Sell, Trade Anything',
          description: 'Find great deals on classified ads. Buy, sell, and trade anything from cars to electronics, furniture to real estate. Safe, secure, and easy to use.',
          keywords: 'classified ads, buy sell, marketplace, local ads, online classifieds, trading, second hand, used items, cars, electronics, furniture, real estate',
          url: window.location.href
        }}
        structuredData={generateWebsiteStructuredData()}
      />
      <div className="min-h-screen bg-gray-50">
        {/* Hero Section */}
        <HeroSection />

      {/* Featured Listings - Above the Fold */}
      <div className="bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <PhotoGrid
            type="featured"
            title="Featured Listings"
            icon={<span className="text-lg">✨</span>}
            limit={6}
            linkTo="/search?featured=true"
            listings={featuredListings}
            isLoading={featuredLoading}
          />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Other Listings - Centered */}
        <div className="space-y-8">
          {/* Newest Listings */}
          <PhotoGrid
            type="newest"
            title="Newest Listings"
            icon={<span className="text-lg">🆕</span>}
            limit={6}
            linkTo="/search?sort=created_at"
            listings={newestListings}
            isLoading={newestLoading}
          />

          {/* Popular Listings */}
          <PhotoGrid
            type="popular"
            title="Popular This Week"
            icon={<FireIcon className="h-5 w-5 text-red-500" />}
            limit={6}
            linkTo="/search?sort=view_count"
            listings={popularListings}
            isLoading={popularLoading}
          />
        </div>

        {/* Categories Grid */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Browse by Category</h2>
            <Link 
              to="/search" 
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              View all categories
            </Link>
          </div>
          
          {categoriesLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {[...Array(12)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-24 bg-gray-200 rounded-xl"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {categories?.map((category: any) => (
                <Link
                  key={category.id}
                  to={`/search?category=${category.id}`}
                  className="card hover:shadow-lg transition-all duration-200 text-center group hover:-translate-y-1"
                >
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl mx-auto mb-3 flex items-center justify-center group-hover:from-blue-200 group-hover:to-indigo-200 transition-all duration-200">
                    <span className="text-2xl">{category.icon || '📁'}</span>
                  </div>
                  <h3 className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                    {category.name}
                  </h3>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Call to Action */}
        <div className="bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800 rounded-2xl p-8 md:p-12 text-center text-white mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Start Selling?
          </h2>
          <p className="text-xl text-primary-100 mb-8 max-w-2xl mx-auto">
            Join thousands of local sellers and buyers. List your items in minutes and start making money today.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              to="/create" 
              className="bg-white text-primary-600 hover:bg-gray-100 font-semibold py-3 px-8 rounded-xl transition-colors duration-200 shadow-lg"
            >
              Start Selling Now
            </Link>
            <Link 
              to="/search" 
              className="border-2 border-white text-white hover:bg-white hover:text-primary-600 font-semibold py-3 px-8 rounded-xl transition-colors duration-200"
            >
              Browse Listings
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-2xl mx-auto mb-4 flex items-center justify-center">
              <span className="text-2xl">🛡️</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Safe & Secure</h3>
            <p className="text-gray-600">
              All users are verified and we provide secure messaging between buyers and sellers.
            </p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-2xl mx-auto mb-4 flex items-center justify-center">
              <span className="text-2xl">📍</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Local Focus</h3>
            <p className="text-gray-600">
              Find items in your neighborhood. No shipping required - meet up locally.
            </p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-purple-100 rounded-2xl mx-auto mb-4 flex items-center justify-center">
              <span className="text-2xl">⭐</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Trusted Community</h3>
            <p className="text-gray-600">
              Rate and review users to build a trusted local marketplace.
            </p>
          </div>
        </div>
      </div>
      </div>
    </>
  );
}
