import { useState, useCallback, useRef } from 'react';
import { api, MessageDto, PagedMessagesResponse, ConversationDto } from '@/lib/api';
import { Message } from '@/types/health';

interface UseChatHistoryOptions {
  patientId: number | null;
  initialPageSize?: number;
  pageSize?: number;
}

interface UseChatHistoryReturn {
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  conversationId: string | null;
  setConversationId: (id: string | null) => void;
  hasMoreMessages: boolean;
  isLoadingHistory: boolean;
  isLoadingMore: boolean;
  loadInitialMessages: (convId: string) => Promise<void>;
  loadMoreMessages: () => Promise<void>;
  loadActiveConversation: () => Promise<ConversationDto | null>;
  clearHistory: () => void;
  currentPage: number;
}

// Convert backend MessageDto to frontend Message format
const convertToMessage = (dto: MessageDto): Message => ({
  id: dto.id.toString(),
  content: dto.content,
  sender: dto.type === 'USER' ? 'user' : 'misha',
  timestamp: new Date(dto.createdAt),
});

export const useChatHistory = ({
  patientId,
  initialPageSize = 15,
  pageSize = 20,
}: UseChatHistoryOptions): UseChatHistoryReturn => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  
  // Keep track of loaded message IDs to prevent duplicates
  const loadedMessageIds = useRef<Set<string>>(new Set());

  /**
   * Load the active (most recent) conversation for the patient
   */
  const loadActiveConversation = useCallback(async (): Promise<ConversationDto | null> => {
    if (!patientId) return null;

    try {
      setIsLoadingHistory(true);
      const conversation = await api.getActiveConversationForPatient(patientId);
      
      if (conversation) {
        setConversationId(conversation.externalConversationId);
        // Load initial messages for this conversation
        await loadInitialMessages(conversation.externalConversationId);
      }
      
      return conversation;
    } catch (error) {
      console.error('Error loading active conversation:', error);
      return null;
    } finally {
      setIsLoadingHistory(false);
    }
  }, [patientId]);

  /**
   * Load initial messages for a conversation
   */
  const loadInitialMessages = useCallback(async (convId: string): Promise<void> => {
    if (!convId) return;

    try {
      setIsLoadingHistory(true);
      loadedMessageIds.current.clear();
      
      const response: PagedMessagesResponse = await api.getInitialMessages(convId, initialPageSize);
      
      const convertedMessages = response.messages.map(convertToMessage);
      
      // Track loaded message IDs
      convertedMessages.forEach(msg => loadedMessageIds.current.add(msg.id));
      
      setMessages(convertedMessages);
      setHasMoreMessages(response.hasMore);
      setCurrentPage(0);
      setConversationId(convId);
    } catch (error) {
      console.error('Error loading initial messages:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [initialPageSize]);

  /**
   * Load more (older) messages when scrolling up
   */
  const loadMoreMessages = useCallback(async (): Promise<void> => {
    if (!conversationId || !hasMoreMessages || isLoadingMore) return;

    try {
      setIsLoadingMore(true);
      
      const nextPage = currentPage + 1;
      const response: PagedMessagesResponse = await api.getMessagesForConversation(
        conversationId,
        nextPage,
        pageSize
      );
      
      // Filter out already loaded messages and convert
      const newMessages = response.messages
        .filter(dto => !loadedMessageIds.current.has(dto.id.toString()))
        .map(convertToMessage);
      
      // Track new message IDs
      newMessages.forEach(msg => loadedMessageIds.current.add(msg.id));
      
      // Prepend older messages to the beginning
      setMessages(prev => [...newMessages, ...prev]);
      setHasMoreMessages(response.hasMore);
      setCurrentPage(nextPage);
    } catch (error) {
      console.error('Error loading more messages:', error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [conversationId, hasMoreMessages, isLoadingMore, currentPage, pageSize]);

  /**
   * Clear all history and reset state
   */
  const clearHistory = useCallback(() => {
    setMessages([]);
    setConversationId(null);
    setHasMoreMessages(false);
    setCurrentPage(0);
    loadedMessageIds.current.clear();
  }, []);

  return {
    messages,
    setMessages,
    conversationId,
    setConversationId,
    hasMoreMessages,
    isLoadingHistory,
    isLoadingMore,
    loadInitialMessages,
    loadMoreMessages,
    loadActiveConversation,
    clearHistory,
    currentPage,
  };
};

