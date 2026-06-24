import {
  createToolRegistry,
  type ToolInput,
  type ToolMap,
  type ToolOutput,
} from "../tools/tool-registry";
import type {
  ProviderMessage,
  ProviderToolDefinition,
} from "../providers/provider.types";
import type { CheckpointService } from "./checkpoint.service";

export type RuntimeMessage = ProviderMessage;

type FinalProviderResponse = {
  type: "final";
  content: string;
};

type ToolCallProviderResponse = {
  type: "tool-call";
  toolName: string;
  input: ToolInput;
  toolCallId?: string;
};

type ProviderResponse = FinalProviderResponse | ToolCallProviderResponse;

type RuntimeProvider = {
  stream(input: {
    messages: RuntimeMessage[];
    tools: ProviderToolDefinition[];
  }): Promise<ProviderResponse>;
};

type RuntimeToolCall = {
  toolName: string;
  input: ToolInput;
  output: ToolOutput;
};

export type ToolCallEvent = {
  toolName: string;
  input: ToolInput;
};

export type ToolResultEvent = {
  toolName: string;
  output: ToolOutput;
};

type CreateAgentRuntimeInput = {
  provider: RuntimeProvider;
  tools: ToolMap;
  maxToolCalls: number;
  checkpointService?: CheckpointService;
  onToolCall?: (event: ToolCallEvent) => void;
  onToolResult?: (event: ToolResultEvent) => void;
};

type RunInput = {
  messages: RuntimeMessage[];
  conversationId?: string;
};

type RunResult = {
  content: string;
  toolCalls: RuntimeToolCall[];
};

function getCheckpointVisibleMessageCount(messages: RuntimeMessage[]) {
  return messages.filter(
    (message) =>
      message.role === "user" ||
      (message.role === "assistant" && message.toolName === undefined),
  ).length;
}

function getCheckpointVisibleMessages(messages: RuntimeMessage[]) {
  return messages.filter(
    (message) =>
      message.role === "user" ||
      (message.role === "assistant" && message.toolName === undefined),
  );
}

function createMaxToolCallsExceededError() {
  const error = new Error("MAX_TOOL_CALLS_EXCEEDED");
  error.name = "MAX_TOOL_CALLS_EXCEEDED";

  return Object.assign(error, {
    code: "MAX_TOOL_CALLS_EXCEEDED" as const,
  });
}

function serializeToolOutput(output: ToolOutput) {
  return JSON.stringify(output);
}

export function createAgentRuntime(config: CreateAgentRuntimeInput) {
  const registry = createToolRegistry(config.tools);
  const toolDefinitions = registry.names().map((name) => ({ name }));

  return {
    async run(input: RunInput): Promise<RunResult> {
      const inputMessages = [...input.messages];
      const messages = [...inputMessages];
      const toolCalls: RuntimeToolCall[] = [];
      const { conversationId, checkpointService } = {
        conversationId: input.conversationId,
        checkpointService: config.checkpointService,
      };

      // Resume from checkpoint if available
      if (conversationId && checkpointService) {
        const checkpoint = await checkpointService.load(conversationId);
        if (checkpoint) {
          const state = checkpoint.state as { messages: RuntimeMessage[] };
          const visibleMessages = getCheckpointVisibleMessages(state.messages);
          const visibleMessageCount = getCheckpointVisibleMessageCount(
            state.messages,
          );
          const hasVisiblePrefix = visibleMessages.every(
            (message, index) =>
              inputMessages[index]?.role === message.role &&
              inputMessages[index]?.content === message.content,
          );
          const pendingMessages = hasVisiblePrefix
            ? inputMessages.slice(visibleMessageCount)
            : inputMessages;

          messages.splice(
            0,
            messages.length,
            ...state.messages,
            ...pendingMessages,
          );
        }
      }

      while (true) {
        const response = await config.provider.stream({
          messages,
          tools: toolDefinitions,
        });

        if (response.type === "final") {
          return {
            content: response.content,
            toolCalls,
          };
        }

        if (toolCalls.length >= config.maxToolCalls) {
          throw createMaxToolCallsExceededError();
        }

        config.onToolCall?.({
          toolName: response.toolName,
          input: response.input,
        });

        const output = await registry.run(response.toolName, response.input);

        config.onToolResult?.({
          toolName: response.toolName,
          output,
        });

        toolCalls.push({
          toolName: response.toolName,
          input: response.input,
          output,
        });

        const toolCallId =
          response.toolCallId ?? `tool-call-${toolCalls.length}`;

        messages.push({
          role: "assistant",
          content: "",
          toolName: response.toolName,
          toolCallId,
          toolInput: response.input,
        });
        messages.push({
          role: "tool",
          toolName: response.toolName,
          toolCallId,
          content: serializeToolOutput(output),
        });

        // Save checkpoint after each tool call
        if (conversationId && checkpointService) {
          await checkpointService.save(
            conversationId,
            toolCalls.length,
            messages,
          );
        }
      }
    },
  };
}
