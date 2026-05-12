"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { computeProjection } from "@/lib/calculations";
import { DEFAULT_INPUTS, type CalculatorInputs } from "@/types/inputs";
import { loadInputs, saveInputs, clearInputs } from "@/lib/storage";
import { applyBenchmarks, filledSlotsFrom, getNextSlot, isReadyForDashboard, SLOT_DEFS } from "@/lib/slots";
import type { ChatMessage, ChatResponse } from "@/types/chat";
import { InputPanel } from "@/components/InputPanel";
import { ResultsSummary } from "@/components/ResultsSummary";
import { BurndownChart } from "@/components/BurndownChart";
import { ScenarioBreakdown } from "@/components/ScenarioBreakdown";
import { PlaybookView } from "@/components/PlaybookView";
import { Header } from "@/components/Header";
import { ChatPanel } from "@/components/chat/ChatPanel";

type Phase = "chat" | "dashboard";

const WELCOME: ChatMessage = {
  role: "assistant",
  content: SLOT_DEFS.useCase.fallbackQuestion,
  chips: SLOT_DEFS.useCase.fallbackChips,
};

export default function Page() {
  const [phase, setPhase] = useState<Phase>("chat");
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME]);
  const [collected, setCollected] = useState<Partial<CalculatorInputs>>({});
  const [chatLoading, setChatLoading] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  // Hydrate from localStorage: if user already completed a session, jump straight to dashboard.
  useEffect(() => {
    const saved = loadInputs();
    if (saved) {
      setCollected(saved);
      setPhase("dashboard");
    }
    setHydrated(true);
  }, []);

  // Persist collected inputs once the dashboard is visible.
  useEffect(() => {
    if (hydrated && phase === "dashboard") {
      const full = applyBenchmarks(collected);
      saveInputs(full);
    }
  }, [collected, hydrated, phase]);

  const fullInputs: CalculatorInputs = useMemo(() => applyBenchmarks(collected), [collected]);
  const projection = useMemo(() => computeProjection(fullInputs), [fullInputs]);

  const latestChips = useMemo(() => {
    const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");
    return lastAssistant?.chips;
  }, [messages]);

  const send = useCallback(
    async (text: string) => {
      if (chatLoading) return;
      setHasInteracted(true);

      const userMsg: ChatMessage = { role: "user", content: text };
      const nextMessages = [...messages, userMsg];
      setMessages(nextMessages);
      setChatLoading(true);

      const nextSlot = getNextSlot(filledSlotsFrom(collected));

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: nextMessages,
            filledSlots: collected,
            nextSlotKey: nextSlot?.key ?? null,
            variant: phase === "chat" ? "hero" : "sidebar",
          }),
        });
        const data = (await res.json()) as ChatResponse & { source?: string };

        // Merge slot updates into collected inputs.
        const merged: Partial<CalculatorInputs> = { ...collected };
        const updatedKeys: string[] = [];
        for (const [k, v] of Object.entries(data.slotUpdates ?? {})) {
          // Skip if the value is empty string or NaN
          if (typeof v === "string" && v.trim() === "") continue;
          if (typeof v === "number" && !Number.isFinite(v)) continue;
          (merged as Record<string, unknown>)[k] = v;
          updatedKeys.push(k);
        }
        setCollected(merged);

        const assistantMsg: ChatMessage = {
          role: "assistant",
          content: data.message,
          chips: data.suggestedChips,
          updatedSlots: updatedKeys.length > 0 ? updatedKeys : undefined,
        };
        setMessages((m) => [...m, assistantMsg]);

        // Transition to dashboard once required slots are filled.
        if (phase === "chat") {
          const ready = isReadyForDashboard(filledSlotsFrom(merged));
          if (data.done || ready) {
            setPhase("dashboard");
          }
        }
      } catch (err) {
        setMessages((m) => [
          ...m,
          {
            role: "assistant",
            content:
              "Hmm, I lost connection for a moment. Try sending that again, or use the sliders on the side.",
          },
        ]);
        // Surface error to console for debugging
        // eslint-disable-next-line no-console
        console.error("chat error", err);
      } finally {
        setChatLoading(false);
      }
    },
    [chatLoading, messages, collected, phase],
  );

  function resetAll() {
    clearInputs();
    setCollected({});
    setMessages([WELCOME]);
    setPhase("chat");
    setHasInteracted(false);
  }

  // -- Render --

  if (phase === "chat") {
    return (
      <div className="min-h-screen bg-background">
        <Header onReset={resetAll} />
        <main className="mx-auto flex max-w-5xl items-start justify-center px-4 py-10 sm:px-6 sm:py-14">
          <ChatPanel
            variant="hero"
            messages={messages}
            onSend={send}
            loading={chatLoading}
            latestChips={!hasInteracted ? WELCOME.chips : latestChips}
          />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header onReset={resetAll} />
      <main className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          <div className="min-w-0 space-y-6">
            <ResultsSummary summary={projection.summary} />
            <BurndownChart daily={projection.daily} summary={projection.summary} />
            <ScenarioBreakdown projection={projection} />
            <details className="card-base">
              <summary className="cursor-pointer border-b p-4 text-sm font-medium">
                Advanced filters
              </summary>
              <div className="p-2">
                <InputPanel
                  inputs={fullInputs}
                  onChange={(next) => setCollected(next)}
                  projection={projection}
                />
              </div>
            </details>
            <PlaybookView inputs={fullInputs} summary={projection.summary} />
          </div>
          <ChatPanel
            variant="sidebar"
            messages={messages}
            onSend={send}
            loading={chatLoading}
            latestChips={latestChips}
          />
        </div>
        <footer className="mt-10 border-t pt-4 text-xs text-muted-foreground">
          <p>
            All cost numbers are pure formulas from your inputs. The playbook and chat are generated
            by Gemini given your scenario context.
          </p>
        </footer>
      </main>
    </div>
  );
}
