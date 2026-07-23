import { useState, useCallback, useRef } from "react";
import type { ChatStreamEvent } from "@chat-agent/shared";
import { streamChat } from "@/lib/api/chat";

/**
 * Agent 过程状态类型
 *
 * 用于展示 LLM 调用工具时的实时状态，如"正在搜索..."、"fetch_url 调用完成"等。
 */
export type ProcessStatus = {
  /** 正在调用的工具名称，如 "web_search"、"fetch_url" */
  toolName?: string;
  /** 状态：运行中 / 成功 / 失败 */
  status: "running" | "success" | "error";
  /** 用户友好的状态描述文本 */
  label: string;
};

/**
 * 流式聊天 Hook
 *
 * 核心职责：
 * - 管理流式响应的状态（streaming/delta/error/processStatus）
 * - 累积流式文本片段（delta），拼接完整回答
 * - 实时展示 Agent 过程状态（如搜索中、工具调用中）
 * - 流完成后通过回调返回完整回答
 *
 * 返回值：
 * - streaming: 是否正在接收流式响应
 * - delta: 累积的流式文本（包含所有已接收的片段）
 * - error: 错误信息，无错误时为 null
 * - processStatus: Agent 过程状态（思考中/生成中/工具调用中）
 * - send: 发送消息的函数
 */
export function useChatStream(opts?: { onComplete?: (response: string) => void }) {
  const [streaming, setStreaming] = useState(false);
  const [delta, setDelta] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [processStatus, setProcessStatus] = useState<ProcessStatus | null>(null);
  /** 累积的完整回答文本，用于 onComplete 回调 */
  const accumulatedRef = useRef("");
  /** 使用 ref 保存 opts，避免 useCallback 依赖变化导致重新创建 */
  const optsRef = useRef(opts);
  optsRef.current = opts;

  const send = useCallback(
    async (conversationId: string, message: string) => {
      setStreaming(true);
      setDelta("");
      setError(null);
      setProcessStatus({ status: "running", label: "正在思考..." });
      accumulatedRef.current = "";

      try {
        await streamChat(
          { conversationId, message },
          {
            onEvent(event: ChatStreamEvent) {
              if (event.event === "delta") {
                // 文本片段：累积到完整回答中，实时更新显示
                accumulatedRef.current += event.data.content;
                setDelta(accumulatedRef.current);
                setProcessStatus({
                  status: "running",
                  label: "正在生成回答...",
                });
              } else if (event.event === "tool.start") {
                // 工具开始：显示工具名称和调用状态
                setProcessStatus({
                  toolName: event.data.toolName,
                  status: "running",
                  label: `正在调用 ${event.data.toolName}...`,
                });
              } else if (event.event === "tool.end") {
                // 工具完成：显示成功状态
                setProcessStatus({
                  toolName: event.data.toolName,
                  status: "success",
                  label: `${event.data.toolName} 调用完成`,
                });
              } else if (event.event === "error") {
                // 错误事件：抛出异常，由外层 catch 处理
                throw new Error(event.data.msg);
              }
            },
            onComplete() {
              // 流结束：清除状态，触发回调返回完整回答
              setProcessStatus(null);
              setStreaming(false);
              optsRef.current?.onComplete?.(accumulatedRef.current);
            },
          },
        );
      } catch (err) {
        // 异常处理：清除状态，设置错误信息
        setProcessStatus(null);
        setError(err instanceof Error ? err.message : "Unknown error");
        setStreaming(false);
      }
    },
    [],
  );

  return { streaming, delta, error, processStatus, send };
}
