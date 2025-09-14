import { useState } from 'react';
import { ShareIcon } from '@heroicons/react/24/outline';
import { ShareModal } from './ShareModal';

interface ShareButtonProps {
  listing: {
    id: string;
    title: string;
    description: string;
    price: number;
    location: string;
    images?: Array<{ path: string }>;
    category?: { name: string };
  };
  variant?: 'icon' | 'button' | 'text';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function ShareButton({ 
  listing, 
  variant = 'icon', 
  size = 'md',
  className = '' 
}: ShareButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleShare = () => {
    // Go directly to modal for consistent user experience
    setIsModalOpen(true);
  };

  const getButtonContent = () => {
    switch (variant) {
      case 'text':
        return (
          <span className="flex items-center space-x-2">
            <ShareIcon className="h-4 w-4" />
            <span>Share</span>
          </span>
        );
      case 'button':
        return (
          <span className="flex items-center space-x-2">
            <ShareIcon className="h-4 w-4" />
            <span>Share</span>
          </span>
        );
      case 'icon':
      default:
        return <ShareIcon className="h-4 w-4" />;
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'p-1.5 text-xs';
      case 'lg':
        return 'p-3 text-base';
      case 'md':
      default:
        return 'p-2 text-sm';
    }
  };

  return (
    <>
      <button
        onClick={handleShare}
        className={`
          inline-flex items-center justify-center
          rounded-lg border border-gray-300 bg-white
          text-gray-700 hover:bg-gray-50 hover:border-gray-400
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
          transition-colors duration-200
          ${getSizeClasses()}
          ${className}
        `}
        title="Share this listing"
      >
        {getButtonContent()}
      </button>

      <ShareModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        listing={listing}
      />
    </>
  );
}
