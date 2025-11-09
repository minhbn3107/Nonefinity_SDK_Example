/**
 * Nonefinity AI SDK
 * A lightweight SDK for integrating Nonefinity AI chat into your applications
 */

export interface NonefinityConfig {
  /** Chat configuration ID */
  chatConfigId: string;
  /** API key for authentication */
  apiKey: string;
  /** Session handling: "auto" generates a session, or provide a function to create custom session names */
  session?: "auto" | (() => string);
  /** API base URL (default: http://localhost:8000) */
  apiUrl?: string;
}

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  models?: Record<string, any>;
  tools?: Record<string, any>;
  interrupt?: Record<string, any>;
}

export interface StreamEvent {
  event: string;
  data: any;
}

export interface ChatResponse {
  /** Full response text (only available for non-streaming) */
  text?: string;
  /** Session ID for this conversation */
  sessionId: string;
  /** Messages in the conversation */
  messages?: ChatMessage[];
}

export class NonefinityClient {
  private config: Required<NonefinityConfig>;
  private sessionId: string | null = null;

  constructor(config: NonefinityConfig) {
    this.config = {
      ...config,
      session: config.session || "auto",
      apiUrl: config.apiUrl || "http://localhost:8000",
    };
  }

  /**
   * Create a new chat session
   * @returns Promise with the session ID
   */
  async createSession(): Promise<string> {
    const sessionName =
      this.config.session === "auto"
        ? this.generateSessionName()
        : this.config.session();

    const response = await fetch(
      `${this.config.apiUrl}/api/v1/chats/sessions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          chat_config_id: this.config.chatConfigId,
          name: sessionName,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to create session: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    console.log('API Response:', data);
    
    // Handle different response formats
    this.sessionId = data.id || data.session_id || data.data?.id || data.data?.session_id;
    
    if (!this.sessionId) {
      throw new Error(`No session ID in response: ${JSON.stringify(data)}`);
    }

    return this.sessionId;
  }

  /**
   * Send a chat message (SSE streaming)
   * @param question The question/message to send
   * @param onEvent Callback for streaming events
   * @returns Promise with the session ID
   */
  async chat(
    question: string,
    onEvent: (event: StreamEvent) => void
  ): Promise<{ sessionId: string }> {
    // Ensure we have a session
    if (!this.sessionId) {
      await this.createSession();
    }

    return new Promise((resolve, reject) => {
      this.streamChat(question, onEvent)
        .then(() => {
          resolve({ sessionId: this.sessionId! });
        })
        .catch(reject);
    });
  }

  /**
   * Send a chat message with streaming response
   * @param question The question/message to send
   * @param onEvent Callback for streaming events
   */
  async streamChat(
    question: string,
    onEvent: (event: StreamEvent) => void
  ): Promise<void> {
    if (!this.sessionId) {
      throw new Error(
        "No active session. Call createSession() or chat() first."
      );
    }

    const response = await fetch(
      `${this.config.apiUrl}/api/v1/chats/sessions/${this.sessionId}/stream`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          role: "user",
          content: question,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Chat request failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    // Process SSE stream
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("No response body available");
    }

    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          // Process remaining buffer
          if (buffer.trim()) {
            this.processSSEBuffer(buffer, onEvent);
          }
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");

        // Keep the last incomplete line in buffer
        buffer = lines.pop() || "";

        // Process complete SSE messages
        for (const line of lines) {
          if (line.trim()) {
            this.processSSELine(line, onEvent);
          }
        }
      }
    } catch (error) {
      onEvent({
        event: "error",
        data: {
          message: error instanceof Error ? error.message : "Stream error",
        },
      });
      throw error;
    }
  }

  /**
   * Send a chat message and wait for complete response (non-streaming)
   * @param question The question/message to send
   * @returns Promise with the complete response
   */
  async chatComplete(question: string): Promise<ChatResponse> {
    let fullResponse = "";

    await this.chat(question, (event) => {
      if (event.event === "message" && event.data.content) {
        fullResponse += event.data.content;
      }
    });

    return {
      text: fullResponse,
      sessionId: this.sessionId!,
    };
  }

  /**
   * Get the current session ID
   */
  getSessionId(): string | null {
    return this.sessionId;
  }

  /**
   * Clear the current session
   */
  clearSession(): void {
    this.sessionId = null;
  }

  /**
   * Set a specific session ID (useful for resuming conversations)
   */
  setSessionId(sessionId: string): void {
    this.sessionId = sessionId;
  }

  // Private helper methods

  private generateSessionName(): string {
    const timestamp = new Date().toISOString().split("T")[0];
    const random = Math.random().toString(36).substring(2, 8);
    return `session-${timestamp}-${random}`;
  }

  private processSSELine(
    line: string,
    onEvent: (event: StreamEvent) => void
  ): void {
    const eventMatch = line.match(/^event: (.+)$/m);
    const dataMatch = line.match(/^data: (.+)$/m);

    if (eventMatch || dataMatch) {
      let eventType = eventMatch ? eventMatch[1] : "message";
      const dataStr = dataMatch ? dataMatch[1] : "{}";

      // Normalize ai_result to message for consistency
      if (eventType === "ai_result") {
        eventType = "message";
      }

      try {
        // Handle special markers
        if (dataStr.trim() === '"[START]"') {
          onEvent({ event: "start", data: {} });
          return;
        }
        if (dataStr.trim() === '"[END]"') {
          onEvent({ event: eventType, data: { done: true } });
          return;
        }

        let data = JSON.parse(dataStr);
        
        // Sometimes data is double-encoded (string within string)
        if (typeof data === 'string') {
          try {
            data = JSON.parse(data);
          } catch (e) {
            // If second parse fails, keep as string
          }
        }
        
        // Extract content from various possible structures
        let content = null;
        
        // Format 1: Direct content field {content: '...', role: '...'}
        if (data.content) {
          content = data.content;
        }
        // Format 2: Nested in model.messages {model: {messages: [AIMessage(content='...', ...)]}}
        else if (data.model?.messages && Array.isArray(data.model.messages)) {
          const lastMessage = data.model.messages[data.model.messages.length - 1];
          if (lastMessage?.content) {
            content = lastMessage.content;
          }
        }
        
        // Send event with extracted content
        if (content) {
          onEvent({ event: eventType, data: { content, raw: data } });
        } else {
          onEvent({ event: eventType, data });
        }
      } catch (e) {
        console.error('SSE parse error:', e, 'Data:', dataStr);
        onEvent({
          event: eventType,
          data: { raw: dataStr, parseError: String(e) },
        });
      }
    }
  }

  private processSSEBuffer(
    buffer: string,
    onEvent: (event: StreamEvent) => void
  ): void {
    const lines = buffer.split("\n\n").filter((line) => line.trim());
    for (const line of lines) {
      this.processSSELine(line, onEvent);
    }
  }
}

// Export for convenience
export default NonefinityClient;
