"use client";

import { useState, useRef, useEffect } from "react";
import { ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface ComposerProps {
  /** 提交消息的回调函数 */
  onSubmit: (message: string) => void;
  /** 是否禁用输入（如正在接收流式响应时） */
  disabled?: boolean;
}

/**
 * 消息输入框组件
 *
 * 功能：
 * - 自适应高度：根据内容自动调整 textarea 高度，最大 200px
 * - 快捷键支持：Enter 发送，Shift + Enter 换行
 * - 空消息禁用：发送按钮在输入为空时禁用
 * - 流式响应禁用：disabled 状态下禁止输入
 */
export function Composer({ onSubmit, disabled }: ComposerProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 自适应高度：每次 value 变化时重置高度，跟随内容增长
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [value]);

  function submitMessage() {
    if (!value.trim()) return;
    onSubmit(value);
    setValue("");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    submitMessage();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    // Enter 发送，Shift + Enter 换行
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submitMessage();
    }
  }

  const canSend = value.trim() && !disabled;

  return (
    <div className="border-t border-border/50 bg-background/80 backdrop-blur-sm">
      <form onSubmit={handleSubmit} className="mx-auto max-w-3xl p-4">
        <div className="flex items-end gap-2 rounded-2xl bg-muted/30 p-2 transition-colors focus-within:bg-muted/50">
          <Textarea
            ref={textareaRef}
            placeholder="输入消息..."
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className="min-h-[36px] max-h-[200px] resize-none border-0 bg-transparent px-2 py-1.5 text-sm shadow-none focus-visible:ring-0"
            disabled={disabled}
          />
          <Button
            type="button"
            size="icon"
            disabled={!canSend}
            aria-label="发送"
            onClick={submitMessage}
            className={cn(
              "h-8 w-8 shrink-0 rounded-xl transition-all",
              canSend
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "bg-muted text-muted-foreground",
            )}
          >
            <ArrowUp className="h-4 w-4" />
          </Button>
        </div>
        <p className="mt-2 text-center text-xs text-muted-foreground/40">
          按 Enter 发送，Shift + Enter 换行
        </p>
      </form>
    </div>
  );
}
