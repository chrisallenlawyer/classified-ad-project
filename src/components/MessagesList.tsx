import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { 
  EnvelopeIcon, 
  EyeIcon, 
  EyeSlashIcon,
  CheckIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { getUserMessages, markMessageAsRead, Message } from '../services/supabaseApi';

export function MessagesList() {
  const queryClient = useQueryClient();
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);

  // Fetch user's messages
  const { data: messages, isLoading, error } = useQuery(
    'user-messages',
    getUserMessages,
    {
      refetchInterval: 30000, // Refetch every 30 seconds
    }
  );

  // Mark message as read mutation
  const markAsReadMutation = useMutation(markMessageAsRead, {
    onSuccess: () => {
      queryClient.invalidateQueries('user-messages');
    },
  });

  const handleMarkAsRead = (messageId: string) => {
    markAsReadMutation.mutate(messageId);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getSenderName = (message: Message) => {
    if (message.sender?.user_metadata?.first_name) {
      return `${message.sender.user_metadata.first_name} ${message.sender.user_metadata.last_name || ''}`.trim();
    }
    return message.sender?.email || 'Unknown User';
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2 mb-4"></div>
              <div className="h-3 bg-gray-200 rounded w-full"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <EnvelopeIcon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Error loading messages</h3>
        <p className="mt-1 text-sm text-gray-500">There was an error loading your messages.</p>
      </div>
    );
  }

  if (!messages || messages.length === 0) {
    return (
      <div className="text-center py-8">
        <EnvelopeIcon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No messages yet</h3>
        <p className="mt-1 text-sm text-gray-500">You'll see messages from potential buyers here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {messages.map((message) => (
        <div
          key={message.id}
          className={`bg-white rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer ${
            !message.is_read ? 'ring-2 ring-blue-200' : ''
          }`}
          onClick={() => setSelectedMessage(message)}
        >
          <div className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <h4 className="text-sm font-medium text-gray-900">
                    {getSenderName(message)}
                  </h4>
                  {!message.is_read && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      New
                    </span>
                  )}
                </div>
                
                <p className="text-sm text-gray-600 mb-2">
                  About: <span className="font-medium">{message.listing?.title}</span>
                </p>
                
                <p className="text-sm text-gray-700 line-clamp-2">
                  {message.content}
                </p>
                
                <div className="flex items-center justify-between mt-3">
                  <p className="text-xs text-gray-500">
                    {formatDate(message.created_at)}
                  </p>
                  <div className="flex items-center space-x-2">
                    {!message.is_read && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMarkAsRead(message.id);
                        }}
                        className="text-xs text-blue-600 hover:text-blue-800 flex items-center"
                      >
                        <CheckIcon className="h-3 w-3 mr-1" />
                        Mark as read
                      </button>
                    )}
                    <span className="text-xs text-gray-400">
                      {message.is_read ? 'Read' : 'Unread'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* Message Detail Modal */}
      {selectedMessage && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Message Details</h3>
              <button
                onClick={() => setSelectedMessage(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900">
                    From: {getSenderName(selectedMessage)}
                  </h4>
                  <span className="text-sm text-gray-500">
                    {formatDate(selectedMessage.created_at)}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-2">
                  About: <span className="font-medium">{selectedMessage.listing?.title}</span>
                </p>
                <p className="text-sm text-gray-500">
                  Price: ${selectedMessage.listing?.price?.toLocaleString()}
                </p>
              </div>

              <div className="bg-white border rounded-lg p-4">
                <h5 className="font-medium text-gray-900 mb-2">Message:</h5>
                <p className="text-gray-700 whitespace-pre-wrap">
                  {selectedMessage.content}
                </p>
              </div>

              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  {!selectedMessage.is_read && (
                    <button
                      onClick={() => {
                        handleMarkAsRead(selectedMessage.id);
                        setSelectedMessage({ ...selectedMessage, is_read: true });
                      }}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                    >
                      <CheckIcon className="h-4 w-4 mr-1" />
                      Mark as Read
                    </button>
                  )}
                </div>
                <div className="text-sm text-gray-500">
                  Status: {selectedMessage.is_read ? 'Read' : 'Unread'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


