import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { 
  ChatBubbleLeftRightIcon,
  PaperAirplaneIcon,
  TrashIcon,
  EllipsisVerticalIcon
} from '@heroicons/react/24/outline';
import { getUserSupportConversations, sendMessage, markMessageAsRead, deleteConversation, Conversation, Message } from '../services/supabaseApi';
import { useAuth } from '../contexts/AuthContext';

export function SupportChatInterface() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<string | null>(null);

  // Fetch user's support conversations
  const { data: conversations = [], isLoading, error } = useQuery(
    'userSupportConversations',
    getUserSupportConversations,
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
      queryClient.invalidateQueries('userSupportConversations');
      setNewMessage('');
      setTimeout(scrollToBottom, 100);
    },
    onError: (error: any) => {
      console.error('Failed to send support message:', error);
    },
  });

  // Mark as read mutation
  const markAsReadMutation = useMutation(markMessageAsRead, {
    onSuccess: () => {
      queryClient.invalidateQueries('userSupportConversations');
    },
  });

  // Delete conversation mutation
  const deleteConversationMutation = useMutation(deleteConversation, {
    onSuccess: () => {
      queryClient.invalidateQueries('userSupportConversations');
      setShowDeleteModal(false);
      setConversationToDelete(null);
      // If we deleted the currently selected conversation, clear selection
      if (conversationToDelete === selectedConversationId) {
        setSelectedConversationId(null);
      }
    },
    onError: (error: any) => {
      console.error('Failed to delete support conversation:', error);
    },
  });

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !selectedConversation) {
      console.log('❌ Cannot send support message:', { newMessage: newMessage.trim(), selectedConversation });
      return;
    }

    console.log('📞 Sending support reply:', {
      content: newMessage.trim(),
      messageType: 'support',
      supportCategory: selectedConversation.supportCategory
    });

    sendMessageMutation.mutate({
      content: newMessage.trim(),
      messageType: 'support',
      supportCategory: selectedConversation.supportCategory
    });
  };

  // Mark messages as read when conversation is selected
  useEffect(() => {
    if (selectedConversation && user) {
      const unreadMessages = selectedConversation.messages.filter(
        msg => msg.receiver_id === user.id && !msg.is_read
      );
      
      unreadMessages.forEach(message => {
        markAsReadMutation.mutate(message.id);
      });
    }
  }, [selectedConversationId, user]);

  const handleDeleteConversation = (conversationId: string) => {
    setConversationToDelete(conversationId);
    setShowDeleteModal(true);
  };

  const confirmDelete = () => {
    if (conversationToDelete) {
      deleteConversationMutation.mutate(conversationToDelete);
    }
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setConversationToDelete(null);
  };

  const getCategoryDisplayName = (category?: string) => {
    if (!category) return 'General';
    return category.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const getCategoryColor = (category?: string) => {
    const colors: { [key: string]: string } = {
      'technical': 'bg-red-100 text-red-800',
      'billing': 'bg-green-100 text-green-800',
      'feature_request': 'bg-purple-100 text-purple-800',
      'bug_report': 'bg-orange-100 text-orange-800',
      'listing_help': 'bg-blue-100 text-blue-800',
      'payment_issue': 'bg-yellow-100 text-yellow-800',
      'general': 'bg-gray-100 text-gray-800'
    };
    return colors[category || 'general'] || 'bg-gray-100 text-gray-800';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-500">Loading support conversations...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-red-500">Error loading support conversations</div>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-gray-500">
        <ChatBubbleLeftRightIcon className="h-12 w-12 mb-4" />
        <h3 className="text-lg font-medium mb-2">No Support Conversations</h3>
        <p className="text-center">
          You haven't contacted support yet. Use the "Contact Support" button in the header to get help.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-[600px]">
      {/* Conversations List */}
      <div className="w-1/3 border-r border-gray-200 overflow-y-auto">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Support Conversations</h3>
          <p className="text-sm text-gray-600">Your help requests and support tickets</p>
        </div>
        
        <div className="space-y-1">
          {conversations.map((conversation) => (
            <div
              key={conversation.id}
              onClick={() => setSelectedConversationId(conversation.id)}
              className={`relative group p-4 cursor-pointer border-b border-gray-100 hover:bg-gray-50 ${
                selectedConversationId === conversation.id ? 'bg-blue-50 border-blue-200' : ''
              }`}
            >
              <div className="flex items-start space-x-3">
                {/* Support Icon */}
                <div className="h-10 w-10 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
                  <ChatBubbleLeftRightIcon className="h-5 w-5 text-white" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900">Support Team</p>
                    {conversation.unreadCount > 0 && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        {conversation.unreadCount}
                      </span>
                    )}
                  </div>
                  
                  {/* Category Badge */}
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium mt-1 ${getCategoryColor(conversation.supportCategory)}`}>
                    {getCategoryDisplayName(conversation.supportCategory)}
                  </span>
                  
                  <p className="text-sm text-gray-600 truncate mt-1">
                    {conversation.lastMessage.content}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(conversation.lastActivity).toLocaleString()}
                  </p>
                </div>
              </div>
              
              {/* Delete Button */}
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteConversation(conversation.id);
                  }}
                  className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                  title="Delete conversation"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Messages Panel */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            {/* Header */}
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Support Conversation</h3>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(selectedConversation.supportCategory)}`}>
                    {getCategoryDisplayName(selectedConversation.supportCategory)}
                  </span>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {selectedConversation.messages.map((message) => {
                const isFromUser = message.sender_id === user?.id;
                
                return (
                  <div
                    key={message.id}
                    className={`flex ${isFromUser ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        isFromUser
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-900'
                      }`}
                    >
                      <p className="text-sm">{message.content}</p>
                      <p className={`text-xs mt-1 ${isFromUser ? 'text-blue-100' : 'text-gray-500'}`}>
                        {new Date(message.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type your message..."
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={sendMessageMutation.isLoading}
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim() || sendMessageMutation.isLoading}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {sendMessageMutation.isLoading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <PaperAirplaneIcon className="h-4 w-4" />
                  )}
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <ChatBubbleLeftRightIcon className="h-12 w-12 mx-auto mb-4" />
              <p>Select a support conversation to view messages</p>
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
              <h3 className="text-lg font-medium text-gray-900">Delete Support Conversation</h3>
            </div>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this support conversation? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={cancelDelete}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
                disabled={deleteConversationMutation.isLoading}
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg"
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
