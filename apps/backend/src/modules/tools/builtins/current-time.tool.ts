import type { Tool } from "../tool-registry";

export const currentTimeTool: Tool = {
  definition: {
    name: "current-time",
    description: "Return the current server time as an ISO timestamp.",
    parameters: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
  handler: async () => ({
    iso: new Date().toISOString(),
  }),
};
