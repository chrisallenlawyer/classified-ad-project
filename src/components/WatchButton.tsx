import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from 'react-query';
import { HeartIcon } from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid';
import { useAuth } from '../contexts/AuthContext';
import { addToFavorites, removeFromFavorites, getUserFavorites } from '../services/supabaseApi';

interface WatchButtonProps {
  listingId: string;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

export function WatchButton({ 
  listingId, 
  size = 'md', 
  showText = false, 
  className = '' 
}: WatchButtonProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isWatched, setIsWatched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Check if item is already watched
  useEffect(() => {
    const checkIfWatched = async () => {
      if (!user) return;
      
      try {
        const favorites = await getUserFavorites();
        const isInFavorites = favorites.some(fav => fav.id === listingId);
        setIsWatched(isInFavorites);
      } catch (err) {
        console.error('Error checking watch status:', err);
      }
    };

    checkIfWatched();
  }, [user, listingId]);

  const addToFavoritesMutation = useMutation(addToFavorites, {
    onSuccess: () => {
      queryClient.invalidateQueries('user-favorites');
      setIsWatched(true);
    },
    onError: (err) => {
      console.error('Error adding to favorites:', err);
    }
  });

  const removeFromFavoritesMutation = useMutation(removeFromFavorites, {
    onSuccess: () => {
      queryClient.invalidateQueries('user-favorites');
      setIsWatched(false);
    },
    onError: (err) => {
      console.error('Error removing from favorites:', err);
    }
  });

  const handleToggleWatch = async () => {
    if (!user) {
      // Redirect to login
      window.location.href = '/login';
      return;
    }

    setIsLoading(true);

    try {
      if (isWatched) {
        await removeFromFavoritesMutation.mutateAsync(listingId);
      } else {
        await addToFavoritesMutation.mutateAsync(listingId);
      }
    } catch (err) {
      console.error('Error toggling watch status:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'px-2 py-1 text-xs';
      case 'lg':
        return 'px-4 py-2 text-base';
      default:
        return 'px-3 py-1.5 text-sm';
    }
  };

  const getIconSize = () => {
    switch (size) {
      case 'sm':
        return 'h-4 w-4';
      case 'lg':
        return 'h-6 w-6';
      default:
        return 'h-5 w-5';
    }
  };

  if (!user) {
    return (
      <button
        onClick={() => window.location.href = '/login'}
        className={`inline-flex items-center ${getSizeClasses()} border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors ${className}`}
      >
        <HeartIcon className={`${getIconSize()} mr-1`} />
        {showText && 'Watch'}
      </button>
    );
  }

  return (
    <button
      onClick={handleToggleWatch}
      disabled={isLoading}
      className={`inline-flex items-center ${getSizeClasses()} rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className} ${
        isWatched
          ? 'bg-red-100 text-red-700 hover:bg-red-200 border border-red-200'
          : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
      }`}
    >
      {isLoading ? (
        <div className={`${getIconSize()} mr-1 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600`} />
      ) : isWatched ? (
        <HeartSolidIcon className={`${getIconSize()} mr-1`} />
      ) : (
        <HeartIcon className={`${getIconSize()} mr-1`} />
      )}
      {showText && (isWatched ? 'Watching' : 'Watch')}
    </button>
  );
}


