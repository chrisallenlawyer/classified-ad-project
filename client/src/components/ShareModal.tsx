import { useState } from 'react';
import { XMarkIcon, LinkIcon, CheckIcon } from '@heroicons/react/24/outline';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  listing: {
    id: string;
    title: string;
    description: string;
    price: number;
    location: string;
    images?: Array<{ path: string }>;
    category?: { name: string };
  };
}

export function ShareModal({ isOpen, onClose, listing }: ShareModalProps) {
  const [copied, setCopied] = useState(false);
  const [customMessage, setCustomMessage] = useState('');

  if (!isOpen) return null;

  const listingUrl = `${window.location.origin}/listing/${listing.id}`;
  const shareText = customMessage || `${listing.title} - $${listing.price.toLocaleString()} in ${listing.location}`;
  const shareUrl = encodeURIComponent(listingUrl);
  const shareTextEncoded = encodeURIComponent(shareText);

  const socialPlatforms = [
    {
      name: 'Facebook',
      icon: '📘',
      url: `https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`,
      color: 'bg-blue-600 hover:bg-blue-700'
    },
    {
      name: 'Twitter',
      icon: '🐦',
      url: `https://twitter.com/intent/tweet?text=${shareTextEncoded}&url=${shareUrl}`,
      color: 'bg-sky-500 hover:bg-sky-600'
    },
    {
      name: 'LinkedIn',
      icon: '💼',
      url: `https://www.linkedin.com/sharing/share-offsite/?url=${shareUrl}`,
      color: 'bg-blue-700 hover:bg-blue-800'
    },
    {
      name: 'WhatsApp',
      icon: '💬',
      url: `https://wa.me/?text=${shareTextEncoded}%20${shareUrl}`,
      color: 'bg-green-600 hover:bg-green-700'
    },
    {
      name: 'Telegram',
      icon: '✈️',
      url: `https://t.me/share/url?url=${shareUrl}&text=${shareTextEncoded}`,
      color: 'bg-blue-500 hover:bg-blue-600'
    },
    {
      name: 'Reddit',
      icon: '🤖',
      url: `https://reddit.com/submit?url=${shareUrl}&title=${shareTextEncoded}`,
      color: 'bg-orange-600 hover:bg-orange-700'
    }
  ];

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(listingUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  const handleSocialShare = (url: string) => {
    window.open(url, '_blank', 'width=600,height=400');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative w-full max-w-md transform overflow-hidden rounded-lg bg-white shadow-xl transition-all">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
            <h3 className="text-lg font-semibold text-gray-900">Share Listing</h3>
            <button
              onClick={onClose}
              className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-4">
            {/* Listing Preview */}
            <div className="mb-6 rounded-lg border border-gray-200 p-4">
              <div className="flex space-x-3">
                {listing.images && listing.images.length > 0 ? (
                  <img
                    src={listing.images[0].path}
                    alt={listing.title}
                    className="h-16 w-16 rounded-lg object-cover"
                  />
                ) : (
                  <div className="h-16 w-16 rounded-lg bg-gray-200 flex items-center justify-center">
                    <span className="text-2xl">📷</span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-gray-900 truncate">
                    {listing.title}
                  </h4>
                  <p className="text-lg font-bold text-blue-600">
                    ${listing.price.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {listing.location}
                  </p>
                </div>
              </div>
            </div>

            {/* Custom Message */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Custom Message (Optional)
              </label>
              <textarea
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                placeholder="Add a personal message..."
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                rows={3}
              />
            </div>

            {/* Copy Link */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Share Link
              </label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={listingUrl}
                  readOnly
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button
                  onClick={handleCopyLink}
                  className={`flex items-center space-x-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    copied
                      ? 'bg-green-100 text-green-700 border border-green-300'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
                  }`}
                >
                  {copied ? (
                    <>
                      <CheckIcon className="h-4 w-4" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <LinkIcon className="h-4 w-4" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Social Platforms */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Share on Social Media
              </label>
              <div className="grid grid-cols-2 gap-3">
                {socialPlatforms.map((platform) => (
                  <button
                    key={platform.name}
                    onClick={() => handleSocialShare(platform.url)}
                    className={`flex items-center space-x-2 rounded-lg px-4 py-3 text-white font-medium transition-colors ${platform.color}`}
                  >
                    <span className="text-lg">{platform.icon}</span>
                    <span className="text-sm">{platform.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 px-6 py-4">
            <div className="flex justify-end space-x-3">
              <button
                onClick={onClose}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
