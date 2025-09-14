import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from 'react-query';
import { getCategories } from '../services/supabaseApi';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';

export function HeroSection() {
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  // Get categories for quick search buttons
  const { data: categories } = useQuery('categories', getCategories);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleSearchClick = () => {
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleCategorySearch = (categoryId: string) => {
    navigate(`/search?category=${categoryId}`);
  };

  return (
    <div className="relative bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800 overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-black opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <div className="text-center">
          {/* Main Heading */}
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
            Find Your Next
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-accent-from to-accent-to">
              Great Deal
            </span>
          </h1>
          
          {/* Subheading */}
          <p className="text-xl md:text-2xl text-primary-100 mb-8 max-w-3xl mx-auto leading-relaxed">
            Discover amazing items from your local community. Buy, sell, and trade with confidence in your neighborhood.
          </p>

          {/* Search Bar */}
          <div className="max-w-2xl mx-auto mb-8">
            <form onSubmit={handleSearch} className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-6 w-6 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search for items, categories, or locations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-4 text-lg border-0 rounded-2xl shadow-lg focus:ring-4 focus:ring-primary-300 focus:outline-none"
              />
              <button 
                type="button"
                onClick={handleSearchClick}
                className="absolute right-2 top-2 bottom-2 bg-primary-600 hover:bg-primary-700 text-white px-6 rounded-xl font-semibold transition-colors duration-200"
              >
                Search
              </button>
            </form>
            
            {/* Advanced Search Link */}
            <div className="text-center mt-4">
              <Link
                to="/search"
                className="text-primary-100 hover:text-white text-sm font-medium underline decoration-dotted underline-offset-4 transition-colors duration-200"
              >
                Advanced Search
              </Link>
            </div>
          </div>

          {/* Quick Category Search */}
          {categories && categories.length > 0 && (
            <div className="max-w-4xl mx-auto">
              <p className="text-primary-100 text-sm mb-4">Popular categories:</p>
              <div className="flex flex-wrap justify-center gap-2">
                {categories.slice(0, 8).map((category: any) => (
                  <button
                    key={category.id}
                    onClick={() => handleCategorySearch(category.id)}
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-full text-sm font-medium transition-colors duration-200 backdrop-blur-sm border border-white/20"
                  >
                    {category.icon} {category.name}
                  </button>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>

    </div>
  );
}

