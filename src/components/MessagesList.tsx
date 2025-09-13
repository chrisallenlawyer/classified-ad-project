import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { 
  EnvelopeIcon, 
  EyeIcon, 
  EyeSlashIcon,
  CheckIcon,
  XMarkIcon,
  PaperAirplaneIcon,
  ArrowUturnLeftIcon,
  InboxIcon,
  PaperAirplaneIcon as SentIcon,
  TrashIcon,
  ArrowPathIcon,
  ArrowTopRightOnSquareIcon
} from '@heroicons/react/24/outline';
import { getUserMessages, getSentMessages, getDeletedMessages, markMessageAsRead, sendMessage, deleteMessage, restoreMessage, permanentDeleteMessage, Message } from '../services/supabaseApi';

type MessageTab = 'incoming' | 'sent' | 'deleted';

export function MessagesList() {
  const queryClient = useQueryClient();
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyMessage, setReplyMessage] = useState('');
  const [isReplying, setIsReplying] = useState(false);
  const [replyError, setReplyError] = useState('');
  const [activeTab, setActiveTab] = useState<MessageTab>('incoming');

  // Fetch incoming messages
  const { data: incomingMessages, isLoading: incomingLoading, error: incomingError } = useQuery(
    'incoming-messages',
    getUserMessages,
    {
      refetchInterval: 30000, // Refetch every 30 seconds
    }
  );

  // Fetch sent messages
  const { data: sentMessages, isLoading: sentLoading, error: sentError } = useQuery(
    'sent-messages',
    getSentMessages,
    {
      refetchInterval: 30000, // Refetch every 30 seconds
    }
  );

  // Fetch deleted messages
  const { data: deletedMessages, isLoading: deletedLoading, error: deletedError } = useQuery(
    'deleted-messages',
    getDeletedMessages,
    {
      refetchInterval: 30000,
    }
  );

  // Determine which messages to show based on active tab
  const messages = activeTab === 'incoming' ? incomingMessages : 
                  activeTab === 'sent' ? sentMessages : 
                  deletedMessages;
  const isLoading = activeTab === 'incoming' ? incomingLoading : 
                   activeTab === 'sent' ? sentLoading : 
                   deletedLoading;
  const error = activeTab === 'incoming' ? incomingError : 
               activeTab === 'sent' ? sentError : 
               deletedError;

  // Mark message as read mutation
  const markAsReadMutation = useMutation(markMessageAsRead, {
    onSuccess: () => {
      queryClient.invalidateQueries('incoming-messages');
      queryClient.invalidateQueries('sent-messages');
      queryClient.invalidateQueries('deleted-messages');
    },
  });

  const handleMarkAsRead = (messageId: string) => {
    markAsReadMutation.mutate(messageId);
  };

  // Send reply mutation
  const sendReplyMutation = useMutation(sendMessage, {
    onSuccess: () => {
      queryClient.invalidateQueries('incoming-messages');
      queryClient.invalidateQueries('sent-messages');
      queryClient.invalidateQueries('deleted-messages');
      setReplyMessage('');
      setShowReplyForm(false);
      setReplyError('');
    },
    onError: (error: any) => {
      setReplyError(error.message || 'Failed to send reply');
    },
  });

  // Delete message mutation
  const deleteMessageMutation = useMutation(deleteMessage, {
    onSuccess: () => {
      queryClient.invalidateQueries('incoming-messages');
      queryClient.invalidateQueries('sent-messages');
      queryClient.invalidateQueries('deleted-messages');
    },
  });

  // Restore message mutation
  const restoreMessageMutation = useMutation(restoreMessage, {
    onSuccess: () => {
      queryClient.invalidateQueries('incoming-messages');
      queryClient.invalidateQueries('sent-messages');
      queryClient.invalidateQueries('deleted-messages');
    },
  });

  // Permanently delete message mutation
  const permanentDeleteMutation = useMutation(permanentDeleteMessage, {
    onSuccess: () => {
      queryClient.invalidateQueries('deleted-messages');
    },
  });

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!replyMessage.trim()) {
      setReplyError('Please enter a reply message');
      return;
    }

    if (!selectedMessage) {
      setReplyError('No message selected');
      return;
    }

    setIsReplying(true);
    setReplyError('');

    try {
      await sendReplyMutation.mutateAsync({
        listingId: selectedMessage.listing_id,
        content: replyMessage.trim(),
        receiverId: selectedMessage.sender_id
      });
    } catch (error) {
      // Error is handled by the mutation
    } finally {
      setIsReplying(false);
    }
  };

  const handleOpenReply = () => {
    setShowReplyForm(true);
    setReplyMessage('');
    setReplyError('');
  };

  const handleCloseReply = () => {
    setShowReplyForm(false);
    setReplyMessage('');
    setReplyError('');
  };

  const handleDeleteMessage = (messageId: string) => {
    if (window.confirm('Are you sure you want to delete this message? It will be moved to Deleted Messages.')) {
      deleteMessageMutation.mutate(messageId);
    }
  };

  const handleRestoreMessage = (messageId: string) => {
    if (window.confirm('Are you sure you want to restore this message?')) {
      restoreMessageMutation.mutate(messageId);
    }
  };

  const handlePermanentDelete = (messageId: string) => {
    if (window.confirm('Are you sure you want to permanently delete this message? This action cannot be undone.')) {
      permanentDeleteMutation.mutate(messageId);
    }
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

  const openListing = (listingId: string) => {
    window.open(`/listing/${listingId}`, '_blank');
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
      <div className="space-y-6">
        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('incoming')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'incoming'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <InboxIcon className="h-5 w-5 inline mr-2" />
              Incoming Messages
            </button>
            <button
              onClick={() => setActiveTab('sent')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'sent'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <SentIcon className="h-5 w-5 inline mr-2" />
              Sent Messages
            </button>
            <button
              onClick={() => setActiveTab('deleted')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'deleted'
                  ? 'border-red-500 text-red-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <TrashIcon className="h-5 w-5 inline mr-2" />
              Deleted Messages
            </button>
          </nav>
        </div>

        {/* Empty State */}
        <div className="text-center py-8">
          <EnvelopeIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            {activeTab === 'incoming' ? 'No incoming messages' : 
             activeTab === 'sent' ? 'No sent messages' : 
             'No deleted messages'}
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {activeTab === 'incoming' 
              ? 'You\'ll see messages from potential buyers here.' 
              : activeTab === 'sent'
              ? 'Messages you send to sellers will appear here.'
              : 'Deleted messages will appear here.'
            }
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('incoming')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'incoming'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <InboxIcon className="h-5 w-5 inline mr-2" />
            Incoming Messages
            {incomingMessages && incomingMessages.length > 0 && (
              <span className="ml-2 bg-blue-100 text-blue-800 text-xs font-medium px-2 py-0.5 rounded-full">
                {incomingMessages.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('sent')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'sent'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <SentIcon className="h-5 w-5 inline mr-2" />
            Sent Messages
            {sentMessages && sentMessages.length > 0 && (
              <span className="ml-2 bg-gray-100 text-gray-800 text-xs font-medium px-2 py-0.5 rounded-full">
                {sentMessages.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('deleted')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'deleted'
                ? 'border-red-500 text-red-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <TrashIcon className="h-5 w-5 inline mr-2" />
            Deleted Messages
            {deletedMessages && deletedMessages.length > 0 && (
              <span className="ml-2 bg-red-100 text-red-800 text-xs font-medium px-2 py-0.5 rounded-full">
                {deletedMessages.length}
              </span>
            )}
          </button>
        </nav>
      </div>

      {/* Messages List */}
      <div className="space-y-4">
      {messages.map((message) => (
        <div
          key={message.id}
          className={`bg-white rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer ${
            !message.is_read && activeTab === 'incoming' ? 'ring-2 ring-blue-200' : ''
          } ${activeTab === 'deleted' ? 'opacity-75' : ''}`}
          onClick={() => setSelectedMessage(message)}
        >
          <div className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <h4 className="text-sm font-medium text-gray-900">
                    {activeTab === 'incoming' ? getSenderName(message) : 
                     activeTab === 'sent' ? `To: ${getSenderName(message)}` :
                     `From: ${getSenderName(message)}`}
                  </h4>
                  {!message.is_read && activeTab === 'incoming' && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      New
                    </span>
                  )}
                  {activeTab === 'sent' && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      Sent
                    </span>
                  )}
                  {activeTab === 'deleted' && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      Deleted
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
                    {activeTab === 'incoming' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedMessage(message);
                          handleOpenReply();
                        }}
                        className="text-xs text-green-600 hover:text-green-800 flex items-center"
                      >
                        <ArrowUturnLeftIcon className="h-3 w-3 mr-1" />
                        Quick Reply
                      </button>
                    )}
                    {!message.is_read && activeTab === 'incoming' && (
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
                    {activeTab !== 'deleted' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteMessage(message.id);
                        }}
                        className="text-xs text-red-600 hover:text-red-800 flex items-center"
                      >
                        <TrashIcon className="h-3 w-3 mr-1" />
                        Delete
                      </button>
                    )}
                    <span className="text-xs text-gray-400">
                      {activeTab === 'incoming' 
                        ? (message.is_read ? 'Read' : 'Unread')
                        : activeTab === 'sent'
                        ? 'Sent'
                        : 'Deleted'
                      }
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
              {/* Listing Information */}
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-blue-900">Listing Information</h4>
                  <button
                    onClick={() => openListing(selectedMessage.listing_id)}
                    className="inline-flex items-center px-3 py-1 border border-blue-300 rounded-md text-sm font-medium text-blue-700 bg-white hover:bg-blue-50"
                  >
                    <ArrowTopRightOnSquareIcon className="h-4 w-4 mr-1" />
                    View Listing
                  </button>
                </div>
                <p className="text-sm text-blue-800 mb-1">
                  <span className="font-medium">Title:</span> {selectedMessage.listing?.title}
                </p>
                <p className="text-sm text-blue-800 mb-1">
                  <span className="font-medium">Price:</span> ${selectedMessage.listing?.price?.toLocaleString()}
                </p>
                <p className="text-sm text-blue-800">
                  <span className="font-medium">Category:</span> {selectedMessage.listing?.category?.name || 'N/A'}
                </p>
              </div>

              {/* Message Information */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900">
                    {activeTab === 'incoming' ? 'From:' : 
                     activeTab === 'sent' ? 'To:' : 
                     'From:'} {getSenderName(selectedMessage)}
                  </h4>
                  <span className="text-sm text-gray-500">
                    {formatDate(selectedMessage.created_at)}
                  </span>
                </div>
              </div>

              <div className="bg-white border rounded-lg p-4">
                <h5 className="font-medium text-gray-900 mb-2">Message:</h5>
                <p className="text-gray-700 whitespace-pre-wrap">
                  {selectedMessage.content}
                </p>
              </div>

              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  {!selectedMessage.is_read && activeTab === 'incoming' && (
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
                  {activeTab === 'incoming' && (
                    <button
                      onClick={handleOpenReply}
                      className="inline-flex items-center px-3 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                    >
                      <ArrowUturnLeftIcon className="h-4 w-4 mr-1" />
                      Reply
                    </button>
                  )}
                  {activeTab === 'deleted' && (
                    <button
                      onClick={() => handleRestoreMessage(selectedMessage.id)}
                      className="inline-flex items-center px-3 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-green-600 hover:bg-green-700"
                    >
                      <ArrowPathIcon className="h-4 w-4 mr-1" />
                      Restore
                    </button>
                  )}
                  {activeTab === 'deleted' && (
                    <button
                      onClick={() => handlePermanentDelete(selectedMessage.id)}
                      className="inline-flex items-center px-3 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-red-600 hover:bg-red-700"
                    >
                      <TrashIcon className="h-4 w-4 mr-1" />
                      Permanently Delete
                    </button>
                  )}
                </div>
                <div className="text-sm text-gray-500">
                  Status: {activeTab === 'incoming' 
                    ? (selectedMessage.is_read ? 'Read' : 'Unread')
                    : activeTab === 'sent'
                    ? 'Sent'
                    : 'Deleted'
                  }
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reply Form Modal */}
      {showReplyForm && selectedMessage && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Reply to Message</h3>
              <button
                onClick={handleCloseReply}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">
                <span className="font-medium">Replying to:</span> {getSenderName(selectedMessage)}
              </p>
              <p className="text-sm text-gray-600">
                <span className="font-medium">About:</span> {selectedMessage.listing?.title}
              </p>
            </div>

            <form onSubmit={handleReply} className="space-y-4">
              <div>
                <label htmlFor="replyMessage" className="block text-sm font-medium text-gray-700 mb-2">
                  Your Reply
                </label>
                <textarea
                  id="replyMessage"
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Type your reply here..."
                  maxLength={500}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {replyMessage.length}/500 characters
                </p>
              </div>

              {replyError && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3">
                  <p className="text-red-600 text-sm">{replyError}</p>
                </div>
              )}

              <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                <p className="text-blue-800 text-sm">
                  <strong>Note:</strong> Your reply will be sent to the buyer through our secure messaging system. 
                  They will receive an email notification.
                </p>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={handleCloseReply}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isReplying || !replyMessage.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {isReplying ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Sending...
                    </>
                  ) : (
                    <>
                      <PaperAirplaneIcon className="h-4 w-4 mr-2" />
                      Send Reply
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
