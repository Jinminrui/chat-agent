export type ProviderMessage = {
  role: "user" | "assistant" | "tool";
  content: string;
  toolName?: string;
  toolCallId?: string;
  toolInput?: Record<string, unknown>;
};

export type ProviderToolDefinition = {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties?: Record<string, unknown>;
    required?: string[];
    additionalProperties?: boolean;
  };
};

export type ProviderResult =
  | {
      type: "tool-call";
      toolName: string;
      input: Record<string, unknown>;
      toolCallId?: string;
    }
  | { type: "final"; content: string };

export type ChatProvider = {
  stream(input: {
    messages: ProviderMessage[];
    tools?: ProviderToolDefinition[];
    onDelta?: (content: string) => void;
  }): Promise<ProviderResult>;
};
