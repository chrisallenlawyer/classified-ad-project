import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { 
  ChatBubbleLeftRightIcon,
  UserCircleIcon,
  ClockIcon,
  PaperAirplaneIcon,
  ExclamationTriangleIcon,
  QuestionMarkCircleIcon,
  CreditCardIcon,
  BugAntIcon,
  LightBulbIcon,
  ClipboardDocumentListIcon,
  ArchiveBoxIcon,
  TrashIcon,
  EllipsisVerticalIcon
} from '@heroicons/react/24/outline';
import { getSupportConversations, sendSupportReply, markMessageAsRead, archiveSupportConversation, deleteSupportConversation } from '../services/supabaseApi';

const categoryIcons: Record<string, { icon: any; color: string; name: string }> = {
  general: { icon: QuestionMarkCircleIcon, color: 'text-blue-600', name: 'General Question' },
  technical: { icon: ExclamationTriangleIcon, color: 'text-red-600', name: 'Technical Issue' },
  billing: { icon: CreditCardIcon, color: 'text-green-600', name: 'Billing Question' },
  account: { icon: UserCircleIcon, color: 'text-purple-600', name: 'Account Help' },
  listing_help: { icon: ClipboardDocumentListIcon, color: 'text-yellow-600', name: 'Listing Help' },
  payment_issue: { icon: CreditCardIcon, color: 'text-orange-600', name: 'Payment Issue' },
  bug_report: { icon: BugAntIcon, color: 'text-red-500', name: 'Bug Report' },
  feature_request: { icon: LightBulbIcon, color: 'text-indigo-600', name: 'Feature Request' }
};

export function SupportMessages() {
  const queryClient = useQueryClient();
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [isReplying, setIsReplying] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [conversationToAction, setConversationToAction] = useState<string | null>(null);

  // Fetch support conversations
  const { data: conversations = [], isLoading, error } = useQuery(
    'support-conversations',
    getSupportConversations,
    {
      refetchInterval: 30000, // Refetch every 30 seconds
    }
  );

  // Send reply mutation
  const sendReplyMutation = useMutation(
    ({ conversationId, content }: { conversationId: string; content: string }) =>
      sendSupportReply(conversationId, content),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('support-conversations');
        setReplyMessage('');
        setIsReplying(false);
      },
      onError: (error: any) => {
        console.error('Failed to send support reply:', error);
      },
    }
  );

  // Mark as read mutation
  const markAsReadMutation = useMutation(markMessageAsRead, {
    onSuccess: () => {
      queryClient.invalidateQueries('support-conversations');
    },
  });

  // Archive conversation mutation
  const archiveConversationMutation = useMutation(archiveSupportConversation, {
    onSuccess: () => {
      queryClient.invalidateQueries('support-conversations');
      setShowArchiveModal(false);
      setConversationToAction(null);
      // Clear selection if we archived the selected conversation
      if (conversationToAction === selectedConversationId) {
        setSelectedConversationId(null);
      }
    },
    onError: (error: any) => {
      console.error('Failed to archive conversation:', error);
    },
  });

  // Delete conversation mutation
  const deleteConversationMutation = useMutation(deleteSupportConversation, {
    onSuccess: () => {
      queryClient.invalidateQueries('support-conversations');
      setShowDeleteModal(false);
      setConversationToAction(null);
      // Clear selection if we deleted the selected conversation
      if (conversationToAction === selectedConversationId) {
        setSelectedConversationId(null);
      }
    },
    onError: (error: any) => {
      console.error('Failed to delete conversation:', error);
    },
  });

  const selectedConversation = conversations.find(conv => conv.id === selectedConversationId);

  const handleConversationSelect = (conversationId: string) => {
    setSelectedConversationId(conversationId);
    
    // Mark unread messages as read
    const conversation = conversations.find(conv => conv.id === conversationId);
    if (conversation) {
      conversation.messages
        .filter((msg: any) => !msg.is_read)
        .forEach((msg: any) => markAsReadMutation.mutate(msg.id));
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!replyMessage.trim() || !selectedConversationId) {
      return;
    }

    setIsReplying(true);
    
    try {
      await sendReplyMutation.mutateAsync({
        conversationId: selectedConversationId,
        content: replyMessage.trim()
      });
    } catch (error) {
      console.error('Error sending reply:', error);
      setIsReplying(false);
    }
  };

  const handleArchiveConversation = (conversationId: string) => {
    setConversationToAction(conversationId);
    setShowArchiveModal(true);
  };

  const handleDeleteConversation = (conversationId: string) => {
    setConversationToAction(conversationId);
    setShowDeleteModal(true);
  };

  const confirmArchive = () => {
    if (conversationToAction) {
      archiveConversationMutation.mutate(conversationToAction);
    }
  };

  const confirmDelete = () => {
    if (conversationToAction) {
      deleteConversationMutation.mutate(conversationToAction);
    }
  };

  const cancelAction = () => {
    setShowArchiveModal(false);
    setShowDeleteModal(false);
    setConversationToAction(null);
  };

  const formatTime = (dateString: string) => {
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

  const formatRelativeTime = (date: Date) => {
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
        <p className="text-red-600">Error loading support messages. Please try again.</p>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="text-center py-12">
        <ChatBubbleLeftRightIcon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-4 text-lg font-medium text-gray-900">No support messages</h3>
        <p className="mt-2 text-gray-500">
          Support requests from users will appear here when they contact support.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-[600px] flex">
      {/* Left Sidebar - Support Conversations */}
      <div className="w-1/3 border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <ChatBubbleLeftRightIcon className="h-5 w-5 mr-2" />
            Support Messages
            {conversations.length > 0 && (
              <span className="ml-2 bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                {conversations.length}
              </span>
            )}
          </h3>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {conversations.map((conversation: any) => {
            const categoryInfo = categoryIcons[conversation.category] || categoryIcons.general;
            const IconComponent = categoryInfo.icon;
            
            return (
              <div
                key={conversation.id}
                className={`p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors relative group ${
                  selectedConversationId === conversation.id ? 'bg-blue-50 border-blue-200' : ''
                }`}
              >
                {/* Action Buttons - Archive and Delete */}
                <div className="absolute top-2 right-2 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleArchiveConversation(conversation.id);
                    }}
                    className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                    title="Archive conversation"
                  >
                    <ArchiveBoxIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteConversation(conversation.id);
                    }}
                    className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                    title="Delete conversation permanently"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>

                {/* Clickable Conversation Content */}
                <div 
                  onClick={() => handleConversationSelect(conversation.id)}
                  className="flex items-start space-x-3 cursor-pointer"
                >
                  <div className="flex-shrink-0">
                    <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center">
                      <IconComponent className={`h-5 w-5 ${categoryInfo.color}`} />
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {conversation.user?.user_metadata?.first_name 
                          ? `${conversation.user.user_metadata.first_name} ${conversation.user.user_metadata.last_name || ''}`.trim()
                          : conversation.user?.email || 'User'
                        }
                      </p>
                      <div className="flex items-center space-x-1">
                        <span className="text-xs text-gray-500">
                          {formatRelativeTime(conversation.lastActivity)}
                        </span>
                        {conversation.unreadCount > 0 && (
                          <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-600 rounded-full">
                            {conversation.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <p className="text-sm text-gray-600 truncate mt-1">
                      {categoryInfo.name}
                    </p>
                    
                    <p className="text-xs text-gray-500 truncate mt-1">
                      {conversation.lastMessage.content}
                    </p>
                    
                    <div className="flex items-center mt-2 text-xs text-gray-400">
                      <ClockIcon className="h-3 w-3 mr-1" />
                      {conversation.messageCount} message{conversation.messageCount !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right Panel - Conversation View */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            {/* Conversation Header */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    {selectedConversation.user?.user_metadata?.first_name 
                      ? `${selectedConversation.user.user_metadata.first_name} ${selectedConversation.user.user_metadata.last_name || ''}`.trim()
                      : selectedConversation.user?.email || 'User'
                    }
                  </h3>
                  <p className="text-sm text-gray-500">
                    {categoryIcons[selectedConversation.category]?.name || 'Support Request'} • {selectedConversation.user?.email}
                  </p>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {selectedConversation.messages.map((message: any) => {
                const isFromAdmin = message.sender_id !== selectedConversation.userId;
                
                return (
                  <div
                    key={message.id}
                    className={`flex ${isFromAdmin ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className="max-w-xs lg:max-w-md">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="text-xs text-gray-500">
                          {isFromAdmin ? 'Support Team' : 
                            (selectedConversation.user?.user_metadata?.first_name 
                              ? `${selectedConversation.user.user_metadata.first_name} ${selectedConversation.user.user_metadata.last_name || ''}`.trim()
                              : selectedConversation.user?.email || 'User'
                            )
                          }
                        </span>
                        <span className="text-xs text-gray-400">
                          {formatTime(message.created_at)}
                        </span>
                      </div>
                      
                      <div
                        className={`rounded-lg px-4 py-2 ${
                          isFromAdmin
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
            </div>

            {/* Reply Form */}
            <form onSubmit={handleSendReply} className="p-4 border-t border-gray-200">
              <div className="flex space-x-3">
                <textarea
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  placeholder="Type your response..."
                  rows={3}
                  className="flex-1 rounded-lg border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  disabled={isReplying}
                />
                <button
                  type="submit"
                  disabled={!replyMessage.trim() || isReplying}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 self-end"
                >
                  {isReplying ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <PaperAirplaneIcon className="h-4 w-4" />
                  )}
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <ChatBubbleLeftRightIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">Select a support conversation</h3>
              <p className="mt-2 text-gray-500">
                Choose a conversation from the list to view and respond to the user's request.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Archive Confirmation Modal */}
      {showArchiveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center mb-4">
              <ArchiveBoxIcon className="h-6 w-6 text-blue-600 mr-3" />
              <h3 className="text-lg font-medium text-gray-900">Archive Conversation</h3>
            </div>
            
            <p className="text-gray-600 mb-6">
              Are you sure you want to archive this support conversation? It will be removed from the active list but can be restored if needed.
            </p>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={cancelAction}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                disabled={archiveConversationMutation.isLoading}
              >
                Cancel
              </button>
              <button
                onClick={confirmArchive}
                className="px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 flex items-center space-x-2"
                disabled={archiveConversationMutation.isLoading}
              >
                {archiveConversationMutation.isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Archiving...</span>
                  </>
                ) : (
                  <>
                    <ArchiveBoxIcon className="h-4 w-4" />
                    <span>Archive</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center mb-4">
              <TrashIcon className="h-6 w-6 text-red-600 mr-3" />
              <h3 className="text-lg font-medium text-gray-900">Delete Conversation</h3>
            </div>
            
            <p className="text-gray-600 mb-6">
              Are you sure you want to permanently delete this support conversation? This action cannot be undone and will remove all messages in this conversation.
            </p>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={cancelAction}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                disabled={deleteConversationMutation.isLoading}
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 flex items-center space-x-2"
                disabled={deleteConversationMutation.isLoading}
              >
                {deleteConversationMutation.isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <TrashIcon className="h-4 w-4" />
                    <span>Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
