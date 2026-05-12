"use client";
import type { ChatMessage as ChatMessageType } from "@/types/chat";
import { cn } from "@/lib/utils";

interface Props {
  message: ChatMessageType;
  /** When true, show a subtle "updated X" badge if updatedSlots is set. */
  showSlotBadge?: boolean;
}

const SLOT_LABEL: Record<string, string> = {
  useCase: "use case",
  industry: "industry",
  teamSize: "team size",
  employeeCount: "headcount",
  employeeSalary: "salary",
  teamAvgSalary: "team salary",
  avoidedHireSalary: "avoided-hire salary",
  avoidedHireMonth: "avoided-hire timing",
  aiBuildCost: "AI build cost",
  aiMonthlyOpex: "AI opex",
  productivityGainPct: "productivity gain",
  annualErrorCost: "error cost",
  errorReductionPct: "error reduction",
  horizonMonths: "horizon",
};

export function ChatMessageView({ message, showSlotBadge }: Props) {
  const isUser = message.role === "user";
  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
          isUser
            ? "bg-primary text-primary-foreground rounded-br-sm"
            : "bg-secondary text-secondary-foreground rounded-bl-sm",
        )}
      >
        <p className="whitespace-pre-wrap">{message.content}</p>
        {showSlotBadge && message.updatedSlots && message.updatedSlots.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {message.updatedSlots.map((s) => (
              <span
                key={s}
                className={cn(
                  "rounded-full px-2 py-0.5 text-[10px] font-medium",
                  isUser ? "bg-primary-foreground/15" : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
                )}
              >
                ✓ {SLOT_LABEL[s] ?? s}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function ThinkingBubble() {
  return (
    <div className="flex justify-start">
      <div className="rounded-2xl rounded-bl-sm bg-secondary px-4 py-3">
        <div className="flex gap-1">
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground" />
        </div>
      </div>
    </div>
  );
}
