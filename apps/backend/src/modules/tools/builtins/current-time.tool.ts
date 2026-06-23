import type { ToolHandler } from "../tool-registry";

export const currentTimeTool: ToolHandler = async () => {
  return {
    iso: new Date().toISOString(),
  };
};
