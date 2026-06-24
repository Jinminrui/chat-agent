import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface AssistantMarkdownProps {
  content: string;
  className?: string;
}

export function AssistantMarkdown({
  content,
  className = "",
}: AssistantMarkdownProps) {
  return (
    <div
      className={[
        "space-y-3 break-words text-sm leading-relaxed",
        "[&_a]:break-all [&_a]:text-primary [&_a]:underline",
        "[&_blockquote]:border-l-2 [&_blockquote]:border-border/70 [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground",
        "[&_code]:rounded [&_code]:bg-black/5 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.9em]",
        "[&_h1]:text-base [&_h1]:font-semibold [&_h1]:leading-6",
        "[&_h2]:text-sm [&_h2]:font-semibold [&_h2]:leading-6",
        "[&_h3]:text-sm [&_h3]:font-medium [&_h3]:leading-6",
        "[&_li]:ml-5 [&_li]:pl-1",
        "[&_ol]:list-decimal [&_ol]:space-y-1",
        "[&_p]:whitespace-pre-wrap",
        "[&_pre]:overflow-x-auto [&_pre]:rounded-xl [&_pre]:bg-zinc-950 [&_pre]:p-3 [&_pre]:text-xs [&_pre]:text-zinc-50",
        "[&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-inherit",
        "[&_ul]:list-disc [&_ul]:space-y-1",
        className,
      ].join(" ")}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}
