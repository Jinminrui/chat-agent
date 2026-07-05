export type ToolInput = Record<string, unknown>;

export type ToolOutput = unknown;

export type ToolHandler = (
  input: ToolInput,
) => Promise<ToolOutput> | ToolOutput;

export type JsonSchemaObject = {
  type: "object";
  properties?: Record<string, unknown>;
  required?: string[];
  additionalProperties?: boolean;
};

export type ToolDefinition = {
  name: string;
  description: string;
  parameters: JsonSchemaObject;
};

export type Tool = {
  definition: ToolDefinition;
  handler: ToolHandler;
};

export type ToolMap = Record<string, Tool>;

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
    definitions() {
      return Object.values(tools).map((tool) => tool.definition);
    },
    async run(toolName: string, input: ToolInput) {
      const tool = hasOwnTool(tools, toolName) ? tools[toolName] : undefined;

      if (!tool) {
        const error = new Error(`TOOL_NOT_FOUND: ${toolName}`);
        error.name = "TOOL_NOT_FOUND";
        throw error;
      }

      return tool.handler(input);
    },
  };
}
