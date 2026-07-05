import type { Tool } from "../tool-registry";

type FetchUrlInput = {
  url?: unknown;
};

export const fetchUrlTool: Tool = {
  definition: {
    name: "fetch-url",
    description: "Fetch the text content of a URL.",
    parameters: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description: "The absolute URL to fetch.",
        },
      },
      required: ["url"],
      additionalProperties: false,
    },
  },
  handler: async (input) => {
    const { url } = input as FetchUrlInput;

    return {
      url: typeof url === "string" ? url : null,
      content: null,
      skipped: true,
      reason: "NETWORK_DISABLED_IN_MINIMAL_RUNTIME",
    };
  },
};
