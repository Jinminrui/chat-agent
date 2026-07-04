import type { Tool } from "../tool-registry";

type WebSearchInput = {
  query?: unknown;
};

export const webSearchTool: Tool = {
  definition: {
    name: "web-search",
    description:
      "Search Google web results for current information using SerpAPI.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "The search query.",
        },
        num: {
          type: "number",
          description: "Number of organic results to return, from 1 to 10.",
        },
      },
      required: ["query"],
      additionalProperties: false,
    },
  },
  handler: async (input) => {
    const { query } = input as WebSearchInput;

    return {
      query: typeof query === "string" ? query : null,
      results: [],
      skipped: true,
      reason: "NETWORK_DISABLED_IN_MINIMAL_RUNTIME",
    };
  },
};
