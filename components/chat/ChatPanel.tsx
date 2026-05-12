"use client";
import { useEffect, useRef } from "react";
import { ChatMessageView, ThinkingBubble } from "./ChatMessage";
import { ChatComposer } from "./ChatComposer";
import type { ChatMessage } from "@/types/chat";
import { cn } from "@/lib/utils";
import { Sparkles, MessageCircle } from "lucide-react";

interface Props {
  variant: "hero" | "sidebar";
  messages: ChatMessage[];
  onSend: (text: string) => void;
  loading?: boolean;
  /** Chips shown next to the composer (from the latest assistant turn) */
  latestChips?: string[];
}

export function ChatPanel({ variant, messages, onSend, loading, latestChips }: Props) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!scrollerRef.current) return;
    scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight;
  }, [messages, loading]);

  if (variant === "hero") {
    return (
      <div className="mx-auto w-full max-w-2xl">
        <div className="mb-8 text-center">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            <Sparkles size={12} /> AI ROI strategist
          </div>
          <h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            AI isn&apos;t a cost. It&apos;s leverage.
          </h1>
          <p className="mt-3 text-balance text-base text-muted-foreground">
            Tell me what you&apos;re thinking — I&apos;ll model the day-by-day cost and build you a
            phased rollout plan.
          </p>
        </div>

        <div className="card-base p-4">
          <div ref={scrollerRef} className="mb-4 max-h-[50vh] space-y-3 overflow-y-auto pr-1">
            {messages.map((m, i) => (
              <ChatMessageView key={i} message={m} showSlotBadge />
            ))}
            {loading && <ThinkingBubble />}
          </div>
          <ChatComposer
            onSend={onSend}
            disabled={loading}
            chips={latestChips}
            autoFocus
            placeholder="Tell me about your situation…"
          />
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          A few quick questions and your dashboard appears. You can adjust anything afterward.
        </p>
      </div>
    );
  }

  // sidebar variant
  return (
    <aside
      className={cn(
        "card-base flex flex-col",
        "lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)]",
      )}
    >
      <div className="flex items-center gap-2 border-b p-3">
        <MessageCircle size={14} className="text-muted-foreground" />
        <h3 className="text-sm font-semibold">Keep adjusting</h3>
        <span className="ml-auto text-[10px] uppercase tracking-wide text-muted-foreground">
          Live
        </span>
      </div>
      <div ref={scrollerRef} className="flex-1 space-y-3 overflow-y-auto p-3">
        {messages.map((m, i) => (
          <ChatMessageView key={i} message={m} showSlotBadge />
        ))}
        {loading && <ThinkingBubble />}
      </div>
      <div className="border-t p-3">
        <ChatComposer
          onSend={onSend}
          disabled={loading}
          chips={latestChips}
          placeholder="Ask a what-if, or change a number…"
        />
      </div>
    </aside>
  );
}
