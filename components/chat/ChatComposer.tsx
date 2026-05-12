"use client";
import { useEffect, useRef, useState } from "react";
import { QuickReplyChip } from "./QuickReplyChip";
import { cn } from "@/lib/utils";
import { Send } from "lucide-react";

interface Props {
  onSend: (text: string) => void;
  disabled?: boolean;
  chips?: string[];
  placeholder?: string;
  autoFocus?: boolean;
}

export function ChatComposer({ onSend, disabled, chips, placeholder, autoFocus }: Props) {
  const [value, setValue] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);

  // Auto-grow the textarea
  useEffect(() => {
    if (!ref.current) return;
    ref.current.style.height = "auto";
    ref.current.style.height = `${Math.min(ref.current.scrollHeight, 160)}px`;
  }, [value]);

  useEffect(() => {
    if (autoFocus && ref.current) ref.current.focus();
  }, [autoFocus]);

  function submit(text?: string) {
    const v = (text ?? value).trim();
    if (!v || disabled) return;
    onSend(v);
    setValue("");
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  return (
    <div className="space-y-3">
      {chips && chips.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {chips.map((c) => (
            <QuickReplyChip key={c} text={c} onClick={() => submit(c)} disabled={disabled} />
          ))}
        </div>
      )}
      <div
        className={cn(
          "flex items-end gap-2 rounded-2xl border border-input bg-card p-2 shadow-sm",
          "focus-within:border-primary focus-within:ring-1 focus-within:ring-ring",
        )}
      >
        <textarea
          ref={ref}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={placeholder ?? "Type your answer…"}
          rows={1}
          className={cn(
            "min-h-[36px] flex-1 resize-none bg-transparent px-2 py-1.5 text-sm",
            "placeholder:text-muted-foreground focus-visible:outline-none",
            "disabled:cursor-not-allowed disabled:opacity-50",
          )}
          disabled={disabled}
        />
        <button
          type="button"
          onClick={() => submit()}
          disabled={disabled || !value.trim()}
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground",
            "transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40",
          )}
          aria-label="Send"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
