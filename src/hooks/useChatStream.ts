import { useState, useCallback } from 'react';
import { toast } from 'sonner';

// Use the Java backend directly, fallback to localhost
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
const CHAT_URL = `${API_BASE_URL}/api/chat/stream`;

interface UseChatStreamOptions {
  patientId: string | number | null;
  conversationId: string | null;
  onConversationIdChange?: (id: string) => void;
}

export const useChatStream = ({ patientId, conversationId, onConversationIdChange }: UseChatStreamOptions) => {
  const [isLoading, setIsLoading] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState(conversationId);

  const sendMessage = useCallback(async (
    message: string,
    onDelta: (text: string) => void,
    onDone: () => void
  ) => {
    setIsLoading(true);
    let receivedContent = false;

    try {
      // Convert patientId to a number for the Java backend
      let numericPatientId: number = 1;
      if (patientId) {
        if (typeof patientId === 'number') {
          numericPatientId = patientId;
        } else if (typeof patientId === 'string') {
          const parsed = parseInt(patientId, 10);
          if (!isNaN(parsed)) {
            numericPatientId = parsed;
          }
        }
      }

      console.log('[Chat] Sending to:', CHAT_URL, { message, patientId: numericPatientId });

      const response = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          patientId: numericPatientId,
          conversationId: currentConversationId || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Error al conectar con el asistente');
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

        // Process line by line as SSE data arrives
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const rawLine of lines) {
          const line = rawLine.trim();
          if (!line) continue;

          // Parse SSE line - handle both direct format and proxy-wrapped format
          // Direct: "event: init" or "data: content"
          // Proxy-wrapped: "data:event: init" or "data:data: content"
          
          let actualLine = line;
          
          // Remove outer "data:" wrapper if present (from proxy)
          if (line.startsWith('data:')) {
            actualLine = line.slice(5).trim();
          }

          // Now parse the actual content
          if (actualLine.startsWith('event:')) {
            const eventType = actualLine.slice(6).trim();
            
            if (eventType === 'complete') {
              console.log('[Chat] Stream complete');
            } else if (eventType === 'init') {
              // Init event - next data line will have the conversation ID
              // We'll handle it when we see the data line
            } else if (eventType === 'error') {
              // Error event - next data line will have error details
            }
          } else if (actualLine.startsWith('data:')) {
            const dataContent = actualLine.slice(5).trim();
            
            if (!dataContent || dataContent === '[DONE]') continue;

            // Try to parse as JSON (for init/complete/error events)
            try {
              const parsed = JSON.parse(dataContent);
              
              if (parsed.conversationId) {
                console.log('[Chat] Got conversation ID:', parsed.conversationId);
                setCurrentConversationId(parsed.conversationId);
                onConversationIdChange?.(parsed.conversationId);
                continue;
              }
              
              if (parsed.status === 'done') {
                continue;
              }
              
              if (parsed.error) {
                throw new Error(parsed.error);
              }
            } catch {
              // Not JSON - it's regular text content
              // Unescape newlines from backend
              const unescapedData = dataContent.replace(/\\n/g, '\n').replace(/\\r/g, '\r');
              console.log('[Chat] Content chunk:', unescapedData.slice(0, 50) + '...');
              onDelta(unescapedData);
              receivedContent = true;
            }
          } else if (actualLine && !actualLine.startsWith('event:') && !actualLine.startsWith(':')) {
            // Plain text content (shouldn't happen but handle it)
            const unescapedData = actualLine.replace(/\\n/g, '\n').replace(/\\r/g, '\r');
            onDelta(unescapedData);
            receivedContent = true;
          }
        }
      }

      // Process any remaining buffer
      if (buffer.trim()) {
        let line = buffer.trim();
        if (line.startsWith('data:')) {
          line = line.slice(5).trim();
        }
        if (line.startsWith('data:')) {
          const dataContent = line.slice(5).trim();
          if (dataContent && dataContent !== '[DONE]') {
            try {
              JSON.parse(dataContent); // Check if JSON
            } catch {
              const unescapedData = dataContent.replace(/\\n/g, '\n').replace(/\\r/g, '\r');
              onDelta(unescapedData);
              receivedContent = true;
            }
          }
        }
      }

      console.log('[Chat] Stream ended, received content:', receivedContent);
      onDone();
    } catch (error) {
      console.error('[Chat] Stream error:', error);
      toast.error(error instanceof Error ? error.message : 'Error al enviar mensaje');
      onDone();
    } finally {
      setIsLoading(false);
    }
  }, [patientId, currentConversationId, onConversationIdChange]);

  const resetConversation = useCallback(() => {
    setCurrentConversationId(null);
  }, []);

  return {
    sendMessage,
    isLoading,
    conversationId: currentConversationId,
    resetConversation,
  };
};
