import {
  createToolRegistry,
  type ToolInput,
  type ToolMap,
  type ToolOutput,
} from "../tools/tool-registry";
import type { CheckpointService } from "./checkpoint.service";

type RuntimeMessage = {
  role: "user" | "assistant" | "tool";
  content: string;
  toolName?: string;
};

type FinalProviderResponse = {
  type: "final";
  content: string;
};

type ToolCallProviderResponse = {
  type: "tool-call";
  toolName: string;
  input: ToolInput;
};

type ProviderResponse = FinalProviderResponse | ToolCallProviderResponse;

type RuntimeProvider = {
  stream(input: { messages: RuntimeMessage[] }): Promise<ProviderResponse>;
};

type RuntimeToolCall = {
  toolName: string;
  input: ToolInput;
  output: ToolOutput;
};

type CreateAgentRuntimeInput = {
  provider: RuntimeProvider;
  tools: ToolMap;
  maxToolCalls: number;
  checkpointService?: CheckpointService;
};

type RunInput = {
  messages: RuntimeMessage[];
  conversationId?: string;
};

type RunResult = {
  content: string;
  toolCalls: RuntimeToolCall[];
};

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

  return {
    async run(input: RunInput): Promise<RunResult> {
      const messages = [...input.messages];
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
          messages.splice(0, messages.length, ...state.messages);
          // toolCalls will be rebuilt from the provider loop
        }
      }

      while (true) {
        const response = await config.provider.stream({ messages });

        if (response.type === "final") {
          return {
            content: response.content,
            toolCalls,
          };
        }

        if (toolCalls.length >= config.maxToolCalls) {
          throw createMaxToolCallsExceededError();
        }

        const output = await registry.run(response.toolName, response.input);

        toolCalls.push({
          toolName: response.toolName,
          input: response.input,
          output,
        });

        messages.push({
          role: "assistant",
          content: "",
          toolName: response.toolName,
        });
        messages.push({
          role: "tool",
          toolName: response.toolName,
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
