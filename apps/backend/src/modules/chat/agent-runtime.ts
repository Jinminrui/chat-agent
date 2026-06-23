import {
  createToolRegistry,
  type ToolInput,
  type ToolMap,
  type ToolOutput,
} from "../tools/tool-registry";

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
};

type RunInput = {
  messages: RuntimeMessage[];
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
      }
    },
  };
}
