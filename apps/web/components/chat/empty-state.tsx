import { MessageSquare, Search, Clock, Mail } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  onSuggestionClick: (suggestion: string) => void;
}

const suggestions = [
  {
    icon: Search,
    text: "总结这个网页的内容",
    color: "text-blue-400",
  },
  {
    icon: Search,
    text: "搜索最新的 AI 新闻",
    color: "text-purple-400",
  },
  {
    icon: Clock,
    text: "现在几点了？",
    color: "text-amber-400",
  },
  {
    icon: Mail,
    text: "帮我写一封邮件",
    color: "text-emerald-400",
  },
];

export function EmptyState({ onSuggestionClick }: EmptyStateProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center p-8">
      <div className="mb-10 text-center">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5">
          <MessageSquare className="h-7 w-7 text-primary/80" />
        </div>
        <h2 className="mb-2 text-xl font-medium tracking-tight">
          欢迎使用 Chat Agent
        </h2>
        <p className="text-sm text-muted-foreground/60">
          我可以帮你搜索网页、获取信息、回答问题
        </p>
      </div>
      <div className="grid w-full max-w-lg grid-cols-1 gap-2 sm:grid-cols-2">
        {suggestions.map((suggestion, index) => (
          <button
            key={suggestion.text}
            onClick={() => onSuggestionClick(suggestion.text)}
            className={cn(
              "group flex items-center gap-3 rounded-xl px-4 py-3 text-left text-sm",
              "border border-border/40 bg-muted/20",
              "transition-all duration-200",
              "hover:border-border/60 hover:bg-muted/40 hover:shadow-sm",
              "active:scale-[0.98]",
            )}
            style={{
              animationDelay: `${index * 50}ms`,
            }}
          >
            <suggestion.icon
              className={cn(
                "h-4 w-4 shrink-0 transition-transform duration-200 group-hover:scale-110",
                suggestion.color,
              )}
            />
            <span className="text-foreground/80 group-hover:text-foreground">
              {suggestion.text}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
