import type { ToolHandler } from "../tool-registry";

type FetchUrlInput = {
  url?: unknown;
};

export const fetchUrlTool: ToolHandler = async (input) => {
  const { url } = input as FetchUrlInput;

  return {
    url: typeof url === "string" ? url : null,
    content: null,
    skipped: true,
    reason: "NETWORK_DISABLED_IN_MINIMAL_RUNTIME",
  };
};
