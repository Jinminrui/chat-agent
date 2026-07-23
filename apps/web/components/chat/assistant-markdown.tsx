import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface AssistantMarkdownProps {
  /** Markdown 格式的消息内容 */
  content: string;
  /** 自定义类名 */
  className?: string;
}

/**
 * 助手消息 Markdown 渲染组件
 *
 * 使用 react-markdown + remark-gfm 渲染 LLM 返回的 Markdown 内容。
 * 支持 GitHub Flavored Markdown（表格、任务列表、删除线等）。
 *
 * 样式说明：
 * - 使用 Tailwind 的 arbitrary variant（[&_xxx]）为 Markdown 元素设置样式
 * - 代码块使用深色背景，行内代码使用浅灰色背景
 * - 链接自动换行（break-all），防止长链接溢出
 * - 列表添加适当的缩进和间距
 */
export function AssistantMarkdown({
  content,
  className = "",
}: AssistantMarkdownProps) {
  return (
    <div
      className={[
        "space-y-3 break-words text-sm leading-relaxed",
        // 链接样式：自动换行、主题色、下划线
        "[&_a]:break-all [&_a]:text-primary [&_a]:underline",
        // 引用块：左侧边框、灰色文字
        "[&_blockquote]:border-l-2 [&_blockquote]:border-border/70 [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground",
        // 行内代码：圆角、浅灰背景、等宽字体
        "[&_code]:rounded [&_code]:bg-black/5 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.9em]",
        // 标题样式：递减大小
        "[&_h1]:text-base [&_h1]:font-semibold [&_h1]:leading-6",
        "[&_h2]:text-sm [&_h2]:font-semibold [&_h2]:leading-6",
        "[&_h3]:text-sm [&_h3]:font-medium [&_h3]:leading-6",
        // 列表样式：缩进和间距
        "[&_li]:ml-5 [&_li]:pl-1",
        "[&_ol]:list-decimal [&_ol]:space-y-1",
        "[&_p]:whitespace-pre-wrap",
        // 代码块：深色背景、等宽字体、自动滚动
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
