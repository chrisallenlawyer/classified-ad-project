import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { 
  ChatBubbleLeftRightIcon,
  PaperAirplaneIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ArrowTopRightOnSquareIcon,
  PhotoIcon,
  TrashIcon,
  EllipsisVerticalIcon
} from '@heroicons/react/24/outline';
import { getConversations, sendMessage, markMessageAsRead, deleteConversation, Conversation, Message } from '../services/supabaseApi';
import { useAuth } from '../contexts/AuthContext';

export function ChatInterface() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [isListingPreviewCollapsed, setIsListingPreviewCollapsed] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<string | null>(null);

  // Fetch listing conversations only (support conversations are now in separate tab)
  const { data: conversations = [], isLoading, error } = useQuery(
    'conversations',
    getConversations,
    {
      refetchInterval: 30000, // Refetch every 30 seconds
    }
  );

  // Auto-select first conversation if none selected
  useEffect(() => {
    if (conversations.length > 0 && !selectedConversationId) {
      setSelectedConversationId(conversations[0].id);
    }
  }, [conversations, selectedConversationId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [selectedConversationId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Find selected conversation
  const selectedConversation = conversations.find(conv => conv.id === selectedConversationId);

  // Send message mutation
  const sendMessageMutation = useMutation(sendMessage, {
    onSuccess: () => {
      queryClient.invalidateQueries('conversations');
      setNewMessage('');
      setTimeout(scrollToBottom, 100);
    },
    onError: (error: any) => {
      console.error('Failed to send message:', error);
    },
  });

  // Mark as read mutation
  const markAsReadMutation = useMutation(markMessageAsRead, {
    onSuccess: () => {
      queryClient.invalidateQueries('conversations');
    },
  });

  // Delete conversation mutation
  const deleteConversationMutation = useMutation(deleteConversation, {
    onSuccess: () => {
      queryClient.invalidateQueries('conversations');
      setShowDeleteModal(false);
      setConversationToDelete(null);
      // If we deleted the currently selected conversation, clear selection
      if (conversationToDelete === selectedConversationId) {
        setSelectedConversationId(null);
      }
    },
    onError: (error: any) => {
      console.error('Failed to delete conversation:', error);
    },
  });

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !selectedConversation) {
      console.log('❌ Cannot send message:', { newMessage: newMessage.trim(), selectedConversation });
      return;
    }

    console.log('📤 Sending message:', {
      listingId: selectedConversation.listingId,
      content: newMessage.trim(),
      receiverId: selectedConversation.otherUserId,
      otherUserName: selectedConversation.otherUser.name
    });

    try {
      if (selectedConversation.messageType === 'support') {
        await sendMessageMutation.mutateAsync({
          content: newMessage.trim(),
          messageType: 'support',
          supportCategory: selectedConversation.supportCategory
        });
      } else {
        await sendMessageMutation.mutateAsync({
          listingId: selectedConversation.listingId,
          content: newMessage.trim(),
          receiverId: selectedConversation.otherUserId
        });
      }
      console.log('✅ Message sent successfully');
    } catch (error) {
      console.error('❌ Error sending message:', error);
    }
  };

  const handleConversationSelect = (conversationId: string) => {
    setSelectedConversationId(conversationId);
    
    // Mark unread messages as read
    const conversation = conversations.find(conv => conv.id === conversationId);
    if (conversation) {
      conversation.messages
        .filter(msg => msg.receiver_id === user?.id && !msg.is_read)
        .forEach(msg => markAsReadMutation.mutate(msg.id));
    }
  };

  const handleDeleteConversation = (conversationId: string) => {
    console.log('🗑️ Delete conversation clicked:', conversationId);
    console.log('🔍 Conversation ID length:', conversationId.length);
    console.log('🔍 Conversation ID parts:', conversationId.split('-'));
    setConversationToDelete(conversationId);
    setShowDeleteModal(true);
  };

  const confirmDeleteConversation = () => {
    if (conversationToDelete) {
      deleteConversationMutation.mutate(conversationToDelete);
    }
  };

  const cancelDeleteConversation = () => {
    setShowDeleteModal(false);
    setConversationToDelete(null);
  };

  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    }
  };

  const formatLastActivity = (date: Date) => {
    const now = new Date();
    const diffInMinutes = (now.getTime() - date.getTime()) / (1000 * 60);
    
    if (diffInMinutes < 60) {
      return `${Math.floor(diffInMinutes)}m ago`;
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)}h ago`;
    } else {
      return `${Math.floor(diffInMinutes / 1440)}d ago`;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">Error loading conversations. Please try again.</p>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="text-center py-12">
        <ChatBubbleLeftRightIcon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-4 text-lg font-medium text-gray-900">No conversations yet</h3>
        <p className="mt-2 text-gray-500">
          Start by messaging someone about a listing, or wait for messages about your listings.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-[600px] flex">
      {/* Left Sidebar - Conversation List */}
      <div className="w-1/3 border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <ChatBubbleLeftRightIcon className="h-5 w-5 mr-2" />
            Messages
          </h2>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {conversations.map((conversation) => (
            <div
              key={conversation.id}
              className={`p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors relative group ${
                selectedConversationId === conversation.id ? 'bg-blue-50 border-blue-200' : ''
              }`}
            >
              {/* Delete button - shows on hover */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteConversation(conversation.id);
                }}
                className="absolute top-2 right-2 p-1 text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                title="Delete conversation"
              >
                <TrashIcon className="h-4 w-4" />
              </button>

              {/* Clickable conversation content */}
              <div 
                onClick={() => handleConversationSelect(conversation.id)}
                className="flex items-start space-x-3 cursor-pointer"
              >
                <div className="flex-shrink-0">
                  {conversation.messageType === 'support' ? (
                    <div className="h-10 w-10 rounded-lg bg-blue-600 flex items-center justify-center">
                      <ChatBubbleLeftRightIcon className="h-5 w-5 text-white" />
                    </div>
                  ) : conversation.listing?.images?.[0] ? (
                    <img
                      src={conversation.listing.images[0]}
                      alt={conversation.listing.title}
                      className="h-10 w-10 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-lg bg-gray-200 flex items-center justify-center">
                      <PhotoIcon className="h-5 w-5 text-gray-400" />
                    </div>
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {conversation.otherUser.name}
                    </p>
                    <div className="flex items-center space-x-1">
                      <span className="text-xs text-gray-500">
                        {formatLastActivity(conversation.lastActivity)}
                      </span>
                      {conversation.unreadCount > 0 && (
                        <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-600 rounded-full">
                          {conversation.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-600 truncate mt-1">
                    {conversation.messageType === 'support' 
                      ? `Support: ${conversation.supportCategory?.replace('_', ' ')}`
                      : conversation.listing?.title
                    }
                  </p>
                  
                  <p className="text-xs text-gray-500 truncate mt-1">
                    {conversation.lastMessage.content}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Panel - Chat */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    {selectedConversation.otherUser.name}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {selectedConversation.messageType === 'support' 
                      ? `Support: ${selectedConversation.supportCategory?.replace('_', ' ')}`
                      : `About: ${selectedConversation.listing?.title}`
                    }
                  </p>
                </div>
              </div>
            </div>

            {/* Listing/Support Preview (Collapsible) */}
            <div className="border-b border-gray-200">
              <button
                onClick={() => setIsListingPreviewCollapsed(!isListingPreviewCollapsed)}
                className="w-full p-3 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between"
              >
                <div className="flex items-center space-x-3">
                  {selectedConversation.messageType === 'support' ? (
                    <div className="h-12 w-12 rounded-lg bg-blue-600 flex items-center justify-center">
                      <ChatBubbleLeftRightIcon className="h-6 w-6 text-white" />
                    </div>
                  ) : selectedConversation.listing?.images?.[0] ? (
                    <img
                      src={selectedConversation.listing.images[0]}
                      alt={selectedConversation.listing.title}
                      className="h-12 w-12 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-lg bg-gray-200 flex items-center justify-center">
                      <PhotoIcon className="h-6 w-6 text-gray-400" />
                    </div>
                  )}
                  
                  <div className="text-left">
                    <p className="font-bold text-gray-900 truncate">
                      {selectedConversation.messageType === 'support' 
                        ? 'Support Conversation'
                        : selectedConversation.listing?.title
                      }
                    </p>
                    <p className="text-sm text-gray-600">
                      {selectedConversation.messageType === 'support' 
                        ? `Category: ${selectedConversation.supportCategory?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}`
                        : `$${selectedConversation.listing?.price.toLocaleString()}${selectedConversation.listing?.category ? ` • ${selectedConversation.listing.category.name}` : ''}`
                      }
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  {selectedConversation.messageType === 'listing' && (
                    <a
                      href={`/listing/${selectedConversation.listingId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 text-gray-400 hover:text-gray-600"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                    </a>
                  )}
                  {isListingPreviewCollapsed ? (
                    <ChevronDownIcon className="h-4 w-4 text-gray-400" />
                  ) : (
                    <ChevronUpIcon className="h-4 w-4 text-gray-400" />
                  )}
                </div>
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {selectedConversation.messages.map((message) => {
                const isFromCurrentUser = message.sender_id === user?.id;
                
                return (
                  <div
                    key={message.id}
                    className={`flex ${isFromCurrentUser ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className="max-w-xs lg:max-w-md">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="text-xs text-gray-500">
                          {isFromCurrentUser ? 'You' : selectedConversation.otherUser.name}
                        </span>
                        <span className="text-xs text-gray-400">
                          {formatMessageTime(message.created_at)}
                        </span>
                      </div>
                      
                      <div
                        className={`rounded-lg px-4 py-2 ${
                          isFromCurrentUser
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-900'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200">
              <div className="flex space-x-3">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 rounded-lg border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={sendMessageMutation.isLoading}
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim() || sendMessageMutation.isLoading}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  <PaperAirplaneIcon className="h-4 w-4" />
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <ChatBubbleLeftRightIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">Select a conversation</h3>
              <p className="mt-2 text-gray-500">
                Choose a conversation from the list to start chatting.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center mb-4">
              <TrashIcon className="h-6 w-6 text-red-600 mr-3" />
              <h3 className="text-lg font-medium text-gray-900">Delete Conversation</h3>
            </div>
            
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this conversation? This action cannot be undone and will remove all messages in this conversation.
            </p>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={cancelDeleteConversation}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                disabled={deleteConversationMutation.isLoading}
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteConversation}
                className="px-4 py-2 text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50"
                disabled={deleteConversationMutation.isLoading}
              >
                {deleteConversationMutation.isLoading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
