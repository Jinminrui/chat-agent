import { Card, CardContent } from "@/components/ui/card";
import { MessageSquare, Search, Clock, Mail } from "lucide-react";

interface EmptyStateProps {
  onSuggestionClick: (suggestion: string) => void;
}

const suggestions = [
  {
    icon: Search,
    text: "总结这个网页的内容",
  },
  {
    icon: Search,
    text: "搜索最新的 AI 新闻",
  },
  {
    icon: Clock,
    text: "现在几点了？",
  },
  {
    icon: Mail,
    text: "帮我写一封邮件",
  },
];

export function EmptyState({ onSuggestionClick }: EmptyStateProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center p-8">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary">
          <MessageSquare className="h-8 w-8 text-primary-foreground" />
        </div>
        <h2 className="mb-2 text-2xl font-semibold">欢迎使用 Chat Agent</h2>
        <p className="text-muted-foreground">
          我可以帮你搜索网页、获取信息、回答问题
        </p>
      </div>
      <div className="grid w-full max-w-2xl grid-cols-1 gap-3 sm:grid-cols-2">
        {suggestions.map((suggestion) => (
          <Card
            key={suggestion.text}
            className="cursor-pointer transition-colors hover:bg-accent"
            onClick={() => onSuggestionClick(suggestion.text)}
          >
            <CardContent className="flex items-center gap-3 p-4">
              <suggestion.icon className="h-5 w-5 text-muted-foreground" />
              <span>{suggestion.text}</span>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
