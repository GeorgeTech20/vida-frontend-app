// API service for connecting to the Java backend
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

export interface MessageDto {
  id: number;
  content: string;
  type: 'USER' | 'ASSISTANT';
  createdAt: string;
  responseTimeMs?: number;
}

export interface ConversationDto {
  id: number;
  externalConversationId: string;
  status: 'ACTIVE' | 'ARCHIVED' | 'COMPLETED';
  initialSymptom?: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  lastMessage?: MessageDto;
}

export interface PagedMessagesResponse {
  messages: MessageDto[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  hasMore: boolean;
  conversationId: string;
}

export interface ChatRequest {
  message: string;
  patientId: number;
  conversationId?: string;
}

export interface ChatResponse {
  response: string;
  conversationId: string;
  tokensUsed: number;
}

class ApiService {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * Get all conversations for a patient
   */
  async getConversationsForPatient(patientId: number): Promise<ConversationDto[]> {
    const response = await fetch(`${this.baseUrl}/api/chat/conversations/patient/${patientId}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch conversations: ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * Get the active (most recent) conversation for a patient
   */
  async getActiveConversationForPatient(patientId: number): Promise<ConversationDto | null> {
    const response = await fetch(`${this.baseUrl}/api/chat/conversations/patient/${patientId}/active`);
    if (response.status === 204) {
      return null;
    }
    if (!response.ok) {
      throw new Error(`Failed to fetch active conversation: ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * Get messages for a conversation with pagination
   * Page 0 returns the most recent messages
   */
  async getMessagesForConversation(
    conversationId: string,
    page: number = 0,
    size: number = 20
  ): Promise<PagedMessagesResponse> {
    const response = await fetch(
      `${this.baseUrl}/api/chat/conversations/${conversationId}/messages?page=${page}&size=${size}`
    );
    if (!response.ok) {
      throw new Error(`Failed to fetch messages: ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * Get initial messages for a conversation (for page load)
   */
  async getInitialMessages(conversationId: string, size: number = 15): Promise<PagedMessagesResponse> {
    const response = await fetch(
      `${this.baseUrl}/api/chat/conversations/${conversationId}/messages/initial?size=${size}`
    );
    if (!response.ok) {
      throw new Error(`Failed to fetch initial messages: ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * Send a chat message and receive streaming response
   */
  async sendChatStreamMessage(
    request: ChatRequest,
    onInit: (conversationId: string) => void,
    onDelta: (text: string) => void,
    onComplete: () => void,
    onError: (error: string) => void
  ): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error: ${response.status}`);
      }

      if (!response.body) {
        throw new Error('No response body');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Process SSE events
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        let currentEvent = '';

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEvent = line.slice(7).trim();
          } else if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();

            if (currentEvent === 'init') {
              // Parse the init event to get conversation ID
              try {
                const parsed = JSON.parse(data);
                if (parsed.conversationId) {
                  onInit(parsed.conversationId);
                }
              } catch {
                console.warn('Failed to parse init event:', data);
              }
            } else if (currentEvent === 'complete') {
              onComplete();
            } else if (currentEvent === 'error') {
              try {
                const parsed = JSON.parse(data);
                onError(parsed.error || 'Unknown error');
              } catch {
                onError(data);
              }
            } else {
              // Regular data chunk - unescape newlines
              const unescapedData = data.replace(/\\n/g, '\n').replace(/\\r/g, '\r');
              onDelta(unescapedData);
            }
            
            // Reset event after processing data
            if (line.trim() === '') {
              currentEvent = '';
            }
          }
        }
      }

      onComplete();
    } catch (error) {
      console.error('Chat stream error:', error);
      onError(error instanceof Error ? error.message : 'Error connecting to chat service');
    }
  }

  /**
   * Send a chat message (non-streaming)
   */
  async sendChatMessage(request: ChatRequest): Promise<ChatResponse> {
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Clear/archive a conversation
   */
  async clearConversation(conversationId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/chat/${conversationId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error(`Failed to clear conversation: ${response.statusText}`);
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<string> {
    const response = await fetch(`${this.baseUrl}/api/chat/health`);
    if (!response.ok) {
      throw new Error('Health check failed');
    }
    return response.text();
  }
}

// Export a singleton instance
export const api = new ApiService();
export default api;

