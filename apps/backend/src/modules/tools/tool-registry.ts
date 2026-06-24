export type ToolInput = Record<string, unknown>;

export type ToolOutput = unknown;

export type ToolHandler = (
  input: ToolInput,
) => Promise<ToolOutput> | ToolOutput;

export type ToolMap = Record<string, ToolHandler>;

function hasOwnTool(tools: ToolMap, toolName: string) {
  return Object.prototype.hasOwnProperty.call(tools, toolName);
}

export function createToolRegistry(tools: ToolMap) {
  return {
    has(toolName: string) {
      return hasOwnTool(tools, toolName);
    },
    names() {
      return Object.keys(tools);
    },
    async run(toolName: string, input: ToolInput) {
      const tool = hasOwnTool(tools, toolName) ? tools[toolName] : undefined;

      if (!tool) {
        const error = new Error(`TOOL_NOT_FOUND: ${toolName}`);
        error.name = "TOOL_NOT_FOUND";
        throw error;
      }

      return tool(input);
    },
  };
}
