/// <reference types="vite/client" />

import { useEffect, useState, useCallback, useRef } from "react";
import {
    ChatWidget,
    NonefinityClient,
    getDefaultApiUrl,
} from "@nonefinity/ai-sdk";
import "./index.css";

type SessionStatus = "idle" | "loading" | "ready" | "error";

const STATUS_LABEL: Record<SessionStatus, string> = {
    idle: "Waiting for setup",
    loading: "Creating session…",
    ready: "Widget ready",
    error: "Needs attention",
};

type HeadlessMessage = {
    id: string;
    role: "user" | "assistant";
    content: string;
};

interface HeadlessHookProps {
    sessionId: string | null;
    apiKey?: string;
    apiUrl: string;
}

const normalizeDataPayload = (value: unknown): unknown => {
    if (typeof value === "string") {
        const trimmed = value.trim();
        if (
            (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
            (trimmed.startsWith("[") && trimmed.endsWith("]"))
        ) {
            try {
                return JSON.parse(trimmed);
            } catch {
                return trimmed;
            }
        }
        return trimmed;
    }
    return value;
};

const useHeadlessStreamingChat = ({
    sessionId,
    apiKey,
    apiUrl,
}: HeadlessHookProps) => {
    const [messages, setMessages] = useState<HeadlessMessage[]>([]);
    const [input, setInput] = useState("");
    const [isStreaming, setIsStreaming] = useState(false);
    const [isThinking, setIsThinking] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    useEffect(() => {
        if (!sessionId || !apiKey) {
            setMessages([]);
            return;
        }

        let cancelled = false;
        const loadHistory = async () => {
            try {
                const headers: Record<string, string> = {};
                if (apiKey) {
                    headers["Authorization"] = `Bearer ${apiKey}`;
                }
                const response = await fetch(
                    `${apiUrl}/chats/sessions/${sessionId}`,
                    { headers }
                );
                const json = await response.json();
                const history =
                    json?.data?.messages?.chat_messages ||
                    json?.data?.chat_messages ||
                    [];

                if (!cancelled) {
                    setMessages(
                        history.map((msg: any, index: number) => ({
                            id: msg.id || `${msg.role}-${index}`,
                            role:
                                msg.role === "assistant" ? "assistant" : "user",
                            content: msg.content || "",
                        }))
                    );
                }
            } catch (err) {
                console.error("Failed to load history", err);
            }
        };

        loadHistory();
        return () => {
            cancelled = true;
        };
    }, [sessionId, apiKey, apiUrl]);

    const sendMessage = useCallback(async () => {
        const trimmed = input.trim();
        if (!trimmed || !sessionId || !apiKey || isStreaming) return;

        const userMessage: HeadlessMessage = {
            id: `user-${Date.now()}`,
            role: "user",
            content: trimmed,
        };

        setMessages((prev) => [...prev, userMessage]);
        setInput("");
        setIsStreaming(true);
        setIsThinking(true);
        setErrorMessage(null);

        const headers: Record<string, string> = {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
        };

        const processChunk = (
            chunk: string,
            append: (text: string) => void
        ) => {
            const eventMatch = chunk.match(/^event: (.+)$/m);
            const dataMatch = chunk.match(/^data: (.+)$/m);
            if (!eventMatch && !dataMatch) {
                return;
            }

            const eventType = eventMatch ? eventMatch[1] : "message";
            const dataRaw = dataMatch ? dataMatch[1] : "";

            let parsed: unknown = dataRaw;
            try {
                parsed = JSON.parse(dataRaw);
            } catch {
                parsed = dataRaw;
            }

            parsed = normalizeDataPayload(parsed);

            if (typeof parsed === "string") {
                if (parsed === "[START]") {
                    setIsThinking(true);
                    return;
                }
                if (parsed === "[END]") {
                    setIsStreaming(false);
                    return;
                }
            }

            if (eventType === "ai_result") {
                const piece =
                    typeof parsed === "string"
                        ? parsed
                        : (parsed as { content?: string })?.content || "";
                if (piece) {
                    append(piece);
                    setIsThinking(false);
                }
            }
        };

        try {
            const response = await fetch(
                `${apiUrl}/chats/sessions/${sessionId}/stream`,
                {
                    method: "POST",
                    headers,
                    body: JSON.stringify({ role: "user", content: trimmed }),
                }
            );

            if (!response.body) {
                throw new Error("Stream response body is empty");
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = "";
            let accumulatedContent = "";
            const appendContent = (text: string) => {
                accumulatedContent += text;
            };

            while (true) {
                const { done, value } = await reader.read();
                if (done) {
                    if (buffer.trim()) {
                        processChunk(buffer, appendContent);
                    }
                    break;
                }

                buffer += decoder.decode(value, { stream: true });
                const segments = buffer.split("\n\n");
                buffer = segments.pop() || "";
                for (const segment of segments) {
                    processChunk(segment, appendContent);
                }
            }

            if (accumulatedContent) {
                const assistantMessage: HeadlessMessage = {
                    id: `assistant-${Date.now()}`,
                    role: "assistant",
                    content: accumulatedContent,
                };
                setMessages((prev) => [...prev, assistantMessage]);
            }
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : "Failed to stream message";
            setErrorMessage(message);
        } finally {
            setIsStreaming(false);
            setIsThinking(false);
        }
    }, [apiKey, apiUrl, input, isStreaming, sessionId]);

    return {
        messages,
        input,
        setInput,
        isStreaming,
        isThinking,
        errorMessage,
        sendMessage,
    };
};

// Headless Chat Component
const HeadlessChat = ({
    sessionId,
    apiKey,
    apiUrl,
}: {
    sessionId: string;
    apiKey: string;
    apiUrl: string;
}) => {
    const {
        messages,
        input,
        setInput,
        isStreaming,
        isThinking,
        errorMessage,
        sendMessage,
    } = useHeadlessStreamingChat({
        sessionId,
        apiKey,
        apiUrl,
    });
    const messagesRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const node = messagesRef.current;
        if (!node) return;
        node.scrollTo({
            top: node.scrollHeight,
            behavior: messages.length > 1 ? "smooth" : "auto",
        });
    }, [messages, isThinking]);

    return (
        <div className="headless-chat">
            <h3>Headless Mode (Custom UI)</h3>
            <div
                className="headless-messages"
                aria-live="polite"
                ref={messagesRef}
            >
                {messages.length === 0 && !isThinking && (
                    <div className="headless-empty">
                        <h4>No messages yet</h4>
                        <p>Send a prompt to see the assistant respond here.</p>
                    </div>
                )}

                {messages.map((msg, idx) => (
                    <div key={idx} className={`headless-message ${msg.role}`}>
                        <span className="bubble-meta">
                            {msg.role === "assistant" ? "Assistant" : "You"}
                        </span>
                        <p>{msg.content}</p>
                    </div>
                ))}

                {isThinking && (
                    <div className="headless-thinking">
                        <span className="dot" />
                        <p>Assistant is thinking…</p>
                    </div>
                )}
            </div>
            <div className="headless-input">
                <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                    placeholder="Type a message..."
                    disabled={isStreaming}
                />
                <button
                    type="button"
                    onClick={() => sendMessage()}
                    disabled={isStreaming}
                >
                    Send
                </button>
            </div>
            {errorMessage && <p className="error-message">{errorMessage}</p>}
        </div>
    );
};

export default function App() {
    const apiKey = import.meta.env.VITE_API_KEY as string | undefined;
    const apiUrl =
        (import.meta.env.VITE_API_URL as string | undefined) ||
        getDefaultApiUrl();
    const envChatConfig =
        (import.meta.env.VITE_CHAT_CONFIG_ID as string | undefined) || "";

    const [client, setClient] = useState<NonefinityClient | null>(null);
    const [chatConfigId, setChatConfigId] = useState(envChatConfig);
    const [resolvedConfigId, setResolvedConfigId] = useState<string | null>(
        envChatConfig || null
    );
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [status, setStatus] = useState<SessionStatus>("idle");
    const [error, setError] = useState<string | null>(null);

    // New State for Modes
    const [mode, setMode] = useState<"widget" | "headless">("widget");
    const [primaryColor, setPrimaryColor] = useState("#3b82f6");
    const [themeMode, setThemeMode] = useState<"light" | "dark">("light");

    useEffect(() => {
        if (!apiKey) {
            setStatus("error");
            setError("Missing VITE_API_KEY. Update your .env file.");
            return;
        }

        const instance = new NonefinityClient({ apiKey, debug: true });
        setClient(instance);
        setStatus("idle");
        setError(null);
    }, [apiKey]);

    const resolveChatConfigId = async (): Promise<string> => {
        if (!client) {
            throw new Error("SDK client is not ready yet.");
        }

        const trimmed = chatConfigId.trim();
        if (trimmed) {
            setResolvedConfigId(trimmed);
            return trimmed;
        }

        if (resolvedConfigId) {
            return resolvedConfigId;
        }

        const configs = await client.listConfigs(0, 1);
        if (!configs.success || !configs.data?.chat_configs?.length) {
            throw new Error(
                "No chat configuration found. Create one in the dashboard."
            );
        }

        const autoId = configs.data.chat_configs[0].id_alias;
        setResolvedConfigId(autoId);
        return autoId;
    };

    const createWidgetSession = async (event?: React.FormEvent) => {
        event?.preventDefault();
        if (!client) {
            return;
        }

        setStatus("loading");
        setError(null);

        try {
            const configId = await resolveChatConfigId();
            const result = await client.createSession({
                chat_config_id: configId,
                name: `Widget session ${new Date().toISOString()}`,
            });

            if (!result.success || !result.data?.id) {
                throw new Error(result.error || "Failed to create session");
            }

            setSessionId(result.data.id);
            setStatus("ready");
        } catch (err) {
            setStatus("error");
            setSessionId(null);
            setError(
                err instanceof Error
                    ? err.message
                    : "Unknown error creating session"
            );
        }
    };

    const resetSession = () => {
        setSessionId(null);
        setStatus("idle");
        setError(null);
    };

    const truncatedKey = apiKey
        ? `${apiKey.slice(0, 4)}…${apiKey.slice(-4)}`
        : "—";
    const readyForWidget = Boolean(apiKey && sessionId);

    return (
        <div className="app-shell">
            <main className="app-panel">
                <header className="panel-header">
                    <div>
                        <p className="eyebrow">Nonefinity SDK</p>
                        <h1>Widget playground</h1>
                        <p className="muted">
                            Configure a test session and embed the
                            <code> ChatWidget </code>
                            directly in this sandbox.
                        </p>
                    </div>
                    <div className={`status-pill status-pill--${status}`}>
                        <span className="dot" />
                        {STATUS_LABEL[status]}
                    </div>
                </header>

                <section className="card">
                    <h2>Environment summary</h2>
                    <dl>
                        <div>
                            <dt>API key</dt>
                            <dd>{truncatedKey}</dd>
                        </div>
                        <div>
                            <dt>API URL</dt>
                            <dd>{apiUrl}</dd>
                        </div>
                        <div>
                            <dt>Chat config (auto)</dt>
                            <dd>{resolvedConfigId ?? "—"}</dd>
                        </div>
                        <div>
                            <dt>Session</dt>
                            <dd>{sessionId ?? "—"}</dd>
                        </div>
                    </dl>
                </section>

                <section className="card">
                    <h2>Configure widget session</h2>
                    <form
                        className="control-grid"
                        onSubmit={createWidgetSession}
                    >
                        <label className="field">
                            <span>Chat configuration ID</span>
                            <input
                                value={chatConfigId}
                                onChange={(event) =>
                                    setChatConfigId(event.target.value)
                                }
                                placeholder="Leave blank to auto-detect"
                                autoComplete="off"
                            />
                            <small>
                                Provide a specific config or let the SDK use the
                                first one it finds.
                            </small>
                        </label>
                        <label className="field">
                            <span>API key</span>
                            <input value={apiKey || ""} readOnly />
                            <small>Loaded from your local .env file.</small>
                        </label>
                        <label className="field">
                            <span>API URL</span>
                            <input value={apiUrl} readOnly />
                            <small>
                                Powered by the SDK default. Override using
                                <code> VITE_API_URL </code>
                            </small>
                        </label>
                        <div className="actions">
                            <button
                                type="button"
                                className="ghost"
                                onClick={resetSession}
                                disabled={!sessionId}
                            >
                                Reset session
                            </button>
                            <button
                                type="submit"
                                className="primary"
                                disabled={!client || status === "loading"}
                            >
                                {status === "loading"
                                    ? "Creating session…"
                                    : "Generate session"}
                            </button>
                        </div>
                    </form>
                    {error && <p className="error-message">{error}</p>}
                    {!apiKey && (
                        <p className="error-message">
                            VITE_API_KEY is required to talk to the SDK.
                        </p>
                    )}
                </section>

                {readyForWidget && (
                    <section className="card">
                        <h2>Mode Selection</h2>
                        <div className="mode-toggle-group">
                            <button
                                className={mode === "widget" ? "active" : ""}
                                onClick={() => setMode("widget")}
                            >
                                Widget Mode
                            </button>
                            <button
                                className={mode === "headless" ? "active" : ""}
                                onClick={() => setMode("headless")}
                            >
                                Headless Mode
                            </button>
                        </div>

                        {mode === "widget" && (
                            <div className="widget-customization">
                                <h3>Widget Customization</h3>
                                <div className="control-group">
                                    <label>Primary Color:</label>
                                    <input
                                        type="color"
                                        value={primaryColor}
                                        onChange={(e) =>
                                            setPrimaryColor(e.target.value)
                                        }
                                    />
                                </div>
                                <div className="control-group">
                                    <label>Theme Mode:</label>
                                    <select
                                        value={themeMode}
                                        onChange={(e) =>
                                            setThemeMode(
                                                e.target.value as
                                                    | "light"
                                                    | "dark"
                                            )
                                        }
                                    >
                                        <option value="light">Light</option>
                                        <option value="dark">Dark</option>
                                    </select>
                                </div>
                            </div>
                        )}
                    </section>
                )}

                {readyForWidget && mode === "headless" && apiKey && (
                    <section className="card">
                        <HeadlessChat
                            sessionId={sessionId as string}
                            apiKey={apiKey}
                            apiUrl={apiUrl}
                        />
                    </section>
                )}
            </main>

            {readyForWidget && mode === "widget" && apiKey && (
                <ChatWidget
                    sessionId={sessionId as string}
                    apiKey={apiKey}
                    position="bottom-right"
                    title="Nonefinity Assistant"
                    placeholder="Type a message…"
                    theme={{
                        mode: themeMode,
                        primaryColor: primaryColor,
                    }}
                />
            )}
        </div>
    );
}
