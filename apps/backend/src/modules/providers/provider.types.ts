export type ProviderResult =
  | { type: "tool-call"; toolName: string; input: unknown }
  | { type: "final"; content: string };

export type ChatProvider = {
  stream(input: {
    messages: Array<{ role: string; content: string }>;
  }): Promise<ProviderResult>;
};
