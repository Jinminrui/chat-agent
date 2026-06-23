import type { ToolHandler } from "../tool-registry";

type WebSearchInput = {
  query?: unknown;
};

export const webSearchTool: ToolHandler = async (input) => {
  const { query } = input as WebSearchInput;

  return {
    query: typeof query === "string" ? query : null,
    results: [],
    skipped: true,
    reason: "NETWORK_DISABLED_IN_MINIMAL_RUNTIME",
  };
};
