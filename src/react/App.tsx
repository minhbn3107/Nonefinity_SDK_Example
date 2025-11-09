/// <reference types="vite/client" />

import { useState, useEffect, type KeyboardEvent } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
    NonefinitySimpleClient,
    type StreamEvent,
} from "@nonefinity/ai-sdk/simple";

interface Message {
    role: "user" | "assistant";
    content: string;
    timestamp: Date;
}

const MARKDOWN_PLUGINS = [remarkGfm];

export default function App() {
    const [client, setClient] = useState<NonefinitySimpleClient | null>(null);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [initError, setInitError] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [isStreaming, setIsStreaming] = useState(false);
    const [streamingContent, setStreamingContent] = useState("");
    const shortSessionId = sessionId
        ? `${sessionId.slice(0, 4)}…${sessionId.slice(-4)}`
        : "auto";

    useEffect(() => {
        const chatConfigId = import.meta.env.VITE_CHAT_CONFIG_ID;
        const apiKey = import.meta.env.VITE_API_KEY;
        const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:8000";

        if (!chatConfigId || !apiKey) {
            setInitError(
                "Please create a .env file with VITE_CHAT_CONFIG_ID and VITE_API_KEY"
            );
            return;
        }

        try {
            const newClient = new NonefinitySimpleClient({
                chatConfigId,
                apiKey,
                apiUrl,
                session: "auto",
            });
            setClient(newClient);
            setIsConnected(true);
            const existingSession = newClient.getSessionId();
            if (existingSession) setSessionId(existingSession);
        } catch (error) {
            setInitError(
                `Init failed: ${
                    error instanceof Error ? error.message : "Unknown"
                }`
            );
        }
    }, []);

    const sendMessage = async () => {
        if (!client || !input.trim() || isStreaming) return;
        setMessages((prev) => [
            ...prev,
            { role: "user", content: input, timestamp: new Date() },
        ]);
        const currentInput = input;
        setInput("");
        setIsStreaming(true);
        setStreamingContent("");
        let fullContent = "";

        try {
            await client.chat(currentInput, (event: StreamEvent) => {
                if (event.event === "start") {
                    fullContent = "";
                    setStreamingContent("");
                } else if (event.event === "message" && event.data.content) {
                    fullContent += event.data.content;
                    setStreamingContent(fullContent);
                } else if (event.event === "message" && event.data.done) {
                    setMessages((prev) => [
                        ...prev,
                        {
                            role: "assistant",
                            content: fullContent,
                            timestamp: new Date(),
                        },
                    ]);
                    setStreamingContent("");
                    setIsStreaming(false);
                } else if (event.event === "error") {
                    setIsStreaming(false);
                    setStreamingContent("");
                }
            });
        } catch (error) {
            setIsStreaming(false);
            setStreamingContent("");
        }
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const clearChat = () => {
        if (!client) return;
        client.clearSession();
        setMessages([]);
        setStreamingContent("");
        setIsStreaming(false);
        setSessionId(null);
    };

    const newSession = async () => {
        if (!client) return;
        try {
            const newSessionId = await client.createSession();
            setSessionId(newSessionId);
            setMessages([]);
            setStreamingContent("");
            setIsStreaming(false);
        } catch (error) {
            console.error(error);
        }
    };

    if (initError) {
        return (
            <div className="relative min-h-screen overflow-hidden bg-[#030014] px-6 py-12 text-slate-100 flex items-center justify-center">
                <div className="pointer-events-none absolute inset-0">
                    <div className="absolute -top-24 left-1/3 h-72 w-72 rounded-full bg-fuchsia-600/20 blur-3xl" />
                    <div className="absolute -bottom-24 -right-16 h-96 w-96 rounded-full bg-cyan-500/20 blur-[180px]" />
                </div>
                <div className="relative z-10 w-full max-w-lg rounded-3xl border border-white/10 bg-[#0f142c]/80 p-10 shadow-[0_40px_160px_rgba(14,165,233,0.35)] backdrop-blur-xl">
                    <div className="text-[11px] uppercase tracking-[0.45em] text-slate-400">
                        Setup Required
                    </div>
                    <h1 className="mt-4 text-3xl font-semibold text-white">
                        Environment variables missing
                    </h1>
                    <p className="mt-4 text-slate-300 leading-relaxed">
                        {initError}
                    </p>
                    <div className="mt-6 rounded-2xl border border-white/10 bg-black/40 px-5 py-4 font-mono text-sm text-slate-200">
                        <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">
                            .env template
                        </p>
                        <div className="mt-3 space-y-1">
                            <p>VITE_CHAT_CONFIG_ID=your-id</p>
                            <p>VITE_API_KEY=your-key</p>
                            <p>VITE_API_URL=http://localhost:8000</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="relative min-h-screen overflow-hidden bg-[#030014] text-slate-100">
            <div className="pointer-events-none absolute inset-0">
                <div className="absolute -top-48 left-1/2 h-112 w-md -translate-x-1/2 rounded-full bg-[#4338ca]/35 blur-[200px]" />
                <div className="absolute -bottom-40 -right-24 h-128 w-lg rounded-full bg-[#0ea5e9]/25 blur-[220px]" />
                <div className="absolute top-1/3 -left-40 h-80 w-80 rounded-full bg-[#db2777]/20 blur-[180px]" />
            </div>
            <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-10">
                <header className="flex items-center justify-between gap-6 rounded-3xl border border-white/10 bg-[#070b1c]/80 px-8 py-7 shadow-[0_40px_120px_rgba(15,23,42,0.45)] backdrop-blur-xl">
                    <div>
                        <div className="text-[11px] uppercase tracking-[0.55em] text-slate-400/70">
                            Nonefinity
                        </div>
                        <h1 className="mt-2 text-3xl font-semibold text-white md:text-4xl">
                            Vision console
                        </h1>
                    </div>
                    <div className="flex flex-col items-end gap-4 text-sm">
                        <div className="flex items-center gap-2">
                            <span
                                className={`h-2.5 w-2.5 rounded-full ${
                                    isConnected
                                        ? "bg-emerald-400 shadow-[0_0_14px_rgba(52,211,153,0.7)]"
                                        : "bg-rose-400 shadow-[0_0_14px_rgba(251,113,133,0.7)]"
                                }`}
                            />
                            <span className="text-[11px] uppercase tracking-[0.45em] text-slate-300">
                                {isConnected ? "Live" : "Offline"}
                            </span>
                        </div>
                        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 font-mono text-xs text-slate-200">
                            <span className="text-slate-500">session</span>
                            <span>{shortSessionId}</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={newSession}
                                disabled={!isConnected}
                                className="rounded-full bg-linear-to-r from-[#4338ca] via-[#6d28d9] to-[#0ea5e9] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.35em] text-white shadow-[0_20px_60px_rgba(109,40,217,0.45)] transition hover:shadow-[0_25px_80px_rgba(14,165,233,0.5)] disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                New Session
                            </button>
                            <button
                                onClick={clearChat}
                                disabled={!isConnected || messages.length === 0}
                                className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.35em] text-slate-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                Clear Log
                            </button>
                        </div>
                    </div>
                </header>

                <main className="mt-8 flex-1">
                    <div className="flex h-full flex-col rounded-4xl border border-white/10 bg-[#070b1c]/70 shadow-[0_50px_150px_rgba(14,116,144,0.3)] backdrop-blur-2xl">
                        <div className="flex-1 space-y-8 overflow-y-auto px-8 py-10">
                            {messages.length === 0 && !streamingContent && (
                                <div className="flex flex-col items-center justify-center py-16 text-center">
                                    <span className="text-[11px] uppercase tracking-[0.6em] text-slate-500">
                                        Signal prompt
                                    </span>
                                    <h2 className="mt-4 max-w-2xl text-4xl font-semibold text-white">
                                        “What signal are we charting next?”
                                    </h2>
                                    <p className="mt-5 max-w-2xl text-base text-slate-400">
                                        Kick things off with a bold hypothesis
                                        or a tricky scenario. Nonefinity thrives
                                        on turning ambiguity into momentum.
                                    </p>
                                </div>
                            )}

                            {messages.map((msg, i) => {
                                const isUser = msg.role === "user";
                                return (
                                    <div
                                        key={`${
                                            msg.role
                                        }-${i}-${msg.timestamp.getTime()}`}
                                        className={`flex ${
                                            isUser
                                                ? "justify-end"
                                                : "justify-start"
                                        } animate-[fadeIn_0.35s_ease]`}
                                    >
                                        <div
                                            className={`max-w-[75%] rounded-3xl border px-6 py-4 text-[15px] leading-relaxed shadow-lg backdrop-blur ${
                                                isUser
                                                    ? "border-cyan-300/30 bg-linear-to-r from-[#4338ca]/80 via-[#312e81]/85 to-[#0ea5e9]/80 text-white shadow-[0_18px_60px_rgba(56,189,248,0.35)]"
                                                    : "border-white/10 bg-white/8 text-slate-100 shadow-[0_18px_60px_rgba(8,8,20,0.45)]"
                                            }`}
                                        >
                                            <ReactMarkdown
                                                remarkPlugins={MARKDOWN_PLUGINS}
                                                className="markdown-body"
                                            >
                                                {msg.content}
                                            </ReactMarkdown>
                                        </div>
                                    </div>
                                );
                            })}

                            {isStreaming && streamingContent && (
                                <div className="flex justify-start animate-[fadeIn_0.35s_ease]">
                                    <div className="max-w-[75%] rounded-3xl border border-white/10 bg-white/8 px-6 py-4 text-[15px] leading-relaxed text-slate-100 shadow-[0_18px_60px_rgba(8,8,20,0.45)] backdrop-blur">
                                        <ReactMarkdown
                                            remarkPlugins={MARKDOWN_PLUGINS}
                                            className="markdown-body"
                                        >
                                            {streamingContent || ""}
                                        </ReactMarkdown>
                                        <span className="ml-1 inline-block h-4 w-0.5 animate-pulse bg-cyan-300"></span>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="border-t border-white/10 px-8 py-6">
                            <div className="flex flex-col gap-4 md:grid md:grid-cols-[1fr_auto] md:gap-5">
                                <div className="flex-1">
                                    <textarea
                                        value={input}
                                        onChange={(e) =>
                                            setInput(e.target.value)
                                        }
                                        onKeyDown={handleKeyDown}
                                        disabled={!isConnected || isStreaming}
                                        placeholder={
                                            isConnected
                                                ? "Draft your Nonefinity prompt..."
                                                : "Waiting for connection..."
                                        }
                                        rows={1}
                                        className="min-h-[72px] max-h-[220px] w-full resize-none rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-base text-slate-100 placeholder:text-slate-500 transition focus:border-cyan-400/70 focus:outline-none focus:ring-0 disabled:cursor-not-allowed"
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={sendMessage}
                                    disabled={
                                        !isConnected ||
                                        isStreaming ||
                                        !input.trim()
                                    }
                                    className="inline-flex min-h-[60px] w-full items-center justify-center gap-2 whitespace-nowrap rounded-2xl bg-linear-to-r from-[#ec4899] via-[#8b5cf6] to-[#0ea5e9] px-6 text-[11px] font-semibold uppercase tracking-[0.32em] text-white shadow-[0_20px_60px_rgba(236,72,153,0.4)] transition-all hover:shadow-[0_26px_80px_rgba(236,72,153,0.55)] disabled:cursor-not-allowed disabled:opacity-40 md:w-auto md:self-stretch md:px-8"
                                >
                                    {isStreaming ? (
                                        <svg
                                            className="h-5 w-5 animate-spin text-white"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <circle
                                                className="opacity-25"
                                                cx="12"
                                                cy="12"
                                                r="10"
                                                stroke="currentColor"
                                                strokeWidth="4"
                                            ></circle>
                                            <path
                                                className="opacity-75"
                                                fill="currentColor"
                                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                            ></path>
                                        </svg>
                                    ) : (
                                        <>
                                            <span>Transmit</span>
                                            <svg
                                                className="h-4 w-4"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M5 12h14m-7-7l7 7-7 7"
                                                />
                                            </svg>
                                        </>
                                    )}
                                </button>
                            </div>
                            <p className="mt-3 text-center text-xs text-slate-500/80">
                                Press Enter to send • Shift+Enter for a new line
                            </p>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
