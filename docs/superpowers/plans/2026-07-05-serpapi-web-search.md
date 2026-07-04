# SerpAPI Web Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 基于 SerpAPI 实现可被模型可靠调用的 `web-search` 工具，并把后端工具系统升级为带 definition 和 handler 的 Tool 对象模型。

**Architecture:** 后端工具注册表从裸 handler map 升级为 Tool map，每个工具自带模型可见的名称、描述和 JSON schema 参数。Agent runtime 从 registry 读取完整工具定义传给 provider，OpenAI provider 将定义映射为 function tools，`web-search` handler 使用原生 `fetch` 调用 SerpAPI 并返回精简结果。

**Tech Stack:** TypeScript、Fastify、OpenAI SDK、Vitest、pnpm、Node 原生 `fetch`。

---

## File Structure

- Modify: `apps/backend/src/modules/tools/tool-registry.ts`
  - 定义 `ToolDefinition`、`Tool`、`ToolMap`。
  - 保留 `run()` 行为，新增 `definitions()`。
- Modify: `apps/backend/src/modules/providers/provider.types.ts`
  - 扩展 `ProviderToolDefinition`，包含 `description` 和 `parameters`。
- Modify: `apps/backend/src/modules/providers/openai.provider.ts`
  - `toOpenAITools()` 使用完整 definition。
  - mock mode 仍只依赖工具名判断可用工具。
- Modify: `apps/backend/src/modules/chat/agent-runtime.ts`
  - 从 registry 读取完整 definitions。
- Modify: `apps/backend/src/modules/tools/builtins/current-time.tool.ts`
  - 从 `ToolHandler` 导出升级为 `Tool` 导出。
- Modify: `apps/backend/src/modules/tools/builtins/fetch-url.tool.ts`
  - 从 `ToolHandler` 导出升级为 `Tool` 导出。
- Modify: `apps/backend/src/modules/tools/builtins/web-search.tool.ts`
  - 实现 SerpAPI 请求、输入规范化、响应抽取和结构化失败。
- Modify: `apps/backend/src/app.ts`
  - 默认工具 map 使用 Tool 对象。
- Modify: `apps/backend/tests/chat/agent-runtime.test.ts`
  - 测试 registry definitions 和 runtime 传递完整工具定义。
  - 将测试工具改为 Tool 对象。
- Modify: `apps/backend/tests/providers/openai.provider.test.ts`
  - 更新 mock mode 工具定义。
  - 新增 OpenAI function tool 映射测试。
- Create: `apps/backend/tests/tools/web-search.tool.test.ts`
  - 覆盖缺 key、无效 query、成功解析和请求失败。
- Modify: `.env.example`
  - 添加 `SERPAPI_API_KEY`。
- Modify: `README.md`
  - 环境变量表增加 `SERPAPI_API_KEY` 说明。

---

### Task 1: 升级工具注册表类型

**Files:**
- Modify: `apps/backend/src/modules/tools/tool-registry.ts`
- Create: `apps/backend/tests/tools/tool-registry.test.ts`

- [ ] **Step 1: 写 registry definitions 失败测试**

创建 `apps/backend/tests/tools/tool-registry.test.ts`：

```ts
import { describe, expect, it } from "vitest";
import { createToolRegistry } from "../../src/modules/tools/tool-registry";

describe("tool registry", () => {
  it("returns registered tool definitions", () => {
    const registry = createToolRegistry({
      "current-time": {
        definition: {
          name: "current-time",
          description: "Return the current server time.",
          parameters: {
            type: "object",
            properties: {},
            additionalProperties: false,
          },
        },
        handler: async () => ({ iso: "2026-06-23T10:00:00.000Z" }),
      },
    });

    expect(registry.definitions()).toEqual([
      {
        name: "current-time",
        description: "Return the current server time.",
        parameters: {
          type: "object",
          properties: {},
          additionalProperties: false,
        },
      },
    ]);
  });

  it("only treats own properties as registered tools", () => {
    const registry = createToolRegistry({
      "current-time": {
        definition: {
          name: "current-time",
          description: "Return the current server time.",
          parameters: {
            type: "object",
            properties: {},
            additionalProperties: false,
          },
        },
        handler: async () => ({ iso: "2026-06-23T10:00:00.000Z" }),
      },
    });

    expect(registry.has("current-time")).toBe(true);
    expect(registry.has("toString")).toBe(false);
    expect(registry.has("constructor")).toBe(false);
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm --filter backend test -- apps/backend/tests/tools/tool-registry.test.ts`

Expected: FAIL，TypeScript 或运行时提示 `definitions` 不存在，或 `ToolMap` 仍期待 handler。

- [ ] **Step 3: 实现 Tool 对象类型和 definitions**

将 `apps/backend/src/modules/tools/tool-registry.ts` 改为：

```ts
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
```

- [ ] **Step 4: 运行 registry 相关测试**

Run: `pnpm --filter backend test -- apps/backend/tests/tools/tool-registry.test.ts`

Expected: PASS。此时全量后端 lint 仍可能失败，因为内置工具和 runtime 测试会在后续任务迁移。

- [ ] **Step 5: 提交 registry 类型改动**

```bash
git add apps/backend/src/modules/tools/tool-registry.ts apps/backend/tests/tools/tool-registry.test.ts
git commit -m "refactor(tools): 引入工具定义对象模型"
```

---

### Task 2: 让 runtime 和 provider 使用完整工具定义

**Files:**
- Modify: `apps/backend/src/modules/providers/provider.types.ts`
- Modify: `apps/backend/src/modules/providers/openai.provider.ts`
- Modify: `apps/backend/src/modules/chat/agent-runtime.ts`
- Modify: `apps/backend/tests/chat/agent-runtime.test.ts`
- Modify: `apps/backend/tests/providers/openai.provider.test.ts`

- [ ] **Step 1: 写 runtime 传递完整 definition 的失败测试**

在 `apps/backend/tests/chat/agent-runtime.test.ts` 中新增测试：

```ts
  it("passes full tool definitions to the provider", async () => {
    const provider = {
      stream: vi.fn().mockResolvedValue({
        type: "final",
        content: "done",
      }),
    };

    const runtime = createAgentRuntime({
      provider,
      tools: {
        "web-search": {
          definition: {
            name: "web-search",
            description: "Search the web for current information.",
            parameters: {
              type: "object",
              properties: {
                query: { type: "string" },
              },
              required: ["query"],
              additionalProperties: false,
            },
          },
          handler: async () => ({ results: [] }),
        },
      },
      maxToolCalls: 3,
    });

    await runtime.run({
      messages: [{ role: "user", content: "搜索 SerpAPI" }],
    });

    expect(provider.stream).toHaveBeenCalledWith(
      expect.objectContaining({
        tools: [
          {
            name: "web-search",
            description: "Search the web for current information.",
            parameters: {
              type: "object",
              properties: {
                query: { type: "string" },
              },
              required: ["query"],
              additionalProperties: false,
            },
          },
        ],
      }),
    );
  });
```

- [ ] **Step 2: 写 provider function tool 映射失败测试**

在 `apps/backend/tests/providers/openai.provider.test.ts` 顶部把 import 改为：

```ts
import OpenAI from "openai";
import { describe, expect, it, vi } from "vitest";
import { createOpenAIProvider } from "../../src/modules/providers/openai.provider";

vi.mock("openai");
```

在文件末尾新增：

```ts
describe("openai provider tool definitions", () => {
  it("maps tool descriptions and parameter schemas to OpenAI function tools", async () => {
    const previousApiKey = process.env.LLM_API_KEY;
    process.env.LLM_API_KEY = "test-key";

    const createMock = vi.fn().mockResolvedValue({
      async *[Symbol.asyncIterator]() {
        yield { choices: [{ delta: { content: "ok" } }] };
      },
    });

    vi.mocked(OpenAI).mockImplementation(
      () =>
        ({
          chat: {
            completions: {
              create: createMock,
            },
          },
        }) as unknown as OpenAI,
    );

    const provider = createOpenAIProvider();

    try {
      await provider.stream({
        messages: [{ role: "user", content: "搜索一下" }],
        tools: [
          {
            name: "web-search",
            description: "Search the web for current information.",
            parameters: {
              type: "object",
              properties: {
                query: { type: "string" },
              },
              required: ["query"],
              additionalProperties: false,
            },
          },
        ],
      });

      expect(createMock).toHaveBeenCalledWith(
        expect.objectContaining({
          tools: [
            {
              type: "function",
              function: {
                name: "web-search",
                description: "Search the web for current information.",
                parameters: {
                  type: "object",
                  properties: {
                    query: { type: "string" },
                  },
                  required: ["query"],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: "auto",
        }),
      );
    } finally {
      if (previousApiKey === undefined) {
        delete process.env.LLM_API_KEY;
      } else {
        process.env.LLM_API_KEY = previousApiKey;
      }
      vi.restoreAllMocks();
    }
  });
});
```

- [ ] **Step 3: 运行测试确认失败**

Run: `pnpm --filter backend test -- apps/backend/tests/chat/agent-runtime.test.ts apps/backend/tests/providers/openai.provider.test.ts`

Expected: FAIL，`ProviderToolDefinition` 缺少字段或 provider 仍使用默认描述和空参数。

- [ ] **Step 4: 扩展 provider 类型**

将 `apps/backend/src/modules/providers/provider.types.ts` 中 `ProviderToolDefinition` 改为：

```ts
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
```

- [ ] **Step 5: 更新 runtime 使用 registry.definitions()**

在 `apps/backend/src/modules/chat/agent-runtime.ts` 中把：

```ts
const toolDefinitions = registry.names().map((name) => ({ name }));
```

改为：

```ts
const toolDefinitions = registry.definitions();
```

- [ ] **Step 6: 更新 OpenAI 工具映射**

在 `apps/backend/src/modules/providers/openai.provider.ts` 中把 `toOpenAITools()` 改为：

```ts
function toOpenAITools(tools: ProviderToolDefinition[] = []) {
  return tools.map((tool) => ({
    type: "function" as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  }));
}
```

- [ ] **Step 7: 更新 provider mock mode 测试的工具定义**

把 `apps/backend/tests/providers/openai.provider.test.ts` 中的 `tools: [{ name: "current-time" }]` 改为：

```ts
tools: [
  {
    name: "current-time",
    description: "Return the current server time.",
    parameters: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
],
```

- [ ] **Step 8: 运行 provider 和 runtime 测试**

Run: `pnpm --filter backend test -- apps/backend/tests/chat/agent-runtime.test.ts apps/backend/tests/providers/openai.provider.test.ts`

Expected: provider tests PASS；agent-runtime tests 中尚未迁移的 ToolMap 用例可能需要 Task 3 继续处理。

- [ ] **Step 9: 提交 runtime/provider 改动**

```bash
git add apps/backend/src/modules/providers/provider.types.ts apps/backend/src/modules/providers/openai.provider.ts apps/backend/src/modules/chat/agent-runtime.ts apps/backend/tests/chat/agent-runtime.test.ts apps/backend/tests/providers/openai.provider.test.ts
git commit -m "refactor(agent): 传递完整工具定义给模型"
```

---

### Task 3: 迁移内置工具为 Tool 对象

**Files:**
- Modify: `apps/backend/src/modules/tools/builtins/current-time.tool.ts`
- Modify: `apps/backend/src/modules/tools/builtins/fetch-url.tool.ts`
- Modify: `apps/backend/src/app.ts`
- Modify: `apps/backend/tests/chat/agent-runtime.test.ts`
- Modify: `apps/backend/tests/chat/chat-persistence.test.ts`

- [ ] **Step 1: 迁移 current-time 工具**

将 `apps/backend/src/modules/tools/builtins/current-time.tool.ts` 改为：

```ts
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
```

- [ ] **Step 2: 迁移 fetch-url 工具**

将 `apps/backend/src/modules/tools/builtins/fetch-url.tool.ts` 改为：

```ts
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
```

- [ ] **Step 3: 更新测试中的工具 map**

在 `apps/backend/tests/chat/agent-runtime.test.ts` 和 `apps/backend/tests/chat/chat-persistence.test.ts` 中，将每个：

```ts
tools: {
  "current-time": async () => ({ iso: "2026-06-23T10:00:00.000Z" }),
},
```

替换为：

```ts
tools: {
  "current-time": {
    definition: {
      name: "current-time",
      description: "Return the current server time.",
      parameters: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
    },
    handler: async () => ({ iso: "2026-06-23T10:00:00.000Z" }),
  },
},
```

`tools: {}` 保持不变。

- [ ] **Step 4: 确认 app 默认工具无需额外包装**

检查 `apps/backend/src/app.ts` 的默认工具：

```ts
const defaultTools: ToolMap = {
  "current-time": currentTimeTool,
  "fetch-url": fetchUrlTool,
  "web-search": webSearchTool,
};
```

保持该形状；导入名不变。

- [ ] **Step 5: 运行迁移相关测试**

Run: `pnpm --filter backend test -- apps/backend/tests/chat/agent-runtime.test.ts apps/backend/tests/chat/chat-persistence.test.ts`

Expected: PASS。

- [ ] **Step 6: 提交内置工具迁移**

```bash
git add apps/backend/src/modules/tools/builtins/current-time.tool.ts apps/backend/src/modules/tools/builtins/fetch-url.tool.ts apps/backend/src/app.ts apps/backend/tests/chat/agent-runtime.test.ts apps/backend/tests/chat/chat-persistence.test.ts
git commit -m "refactor(tools): 迁移内置工具为对象模型"
```

---

### Task 4: 实现 SerpAPI web-search 工具

**Files:**
- Modify: `apps/backend/src/modules/tools/builtins/web-search.tool.ts`
- Create: `apps/backend/tests/tools/web-search.tool.test.ts`

- [ ] **Step 1: 写缺 key 和无效 query 失败测试**

创建 `apps/backend/tests/tools/web-search.tool.test.ts`：

```ts
import { afterEach, describe, expect, it, vi } from "vitest";
import { webSearchTool } from "../../src/modules/tools/builtins/web-search.tool";

describe("web-search tool", () => {
  const originalApiKey = process.env.SERPAPI_API_KEY;
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    if (originalApiKey === undefined) {
      delete process.env.SERPAPI_API_KEY;
    } else {
      process.env.SERPAPI_API_KEY = originalApiKey;
    }
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("returns skipped when SERPAPI_API_KEY is missing", async () => {
    delete process.env.SERPAPI_API_KEY;

    const result = await webSearchTool.handler({ query: "SerpAPI" });

    expect(result).toEqual({
      query: "SerpAPI",
      results: [],
      skipped: true,
      reason: "SERPAPI_API_KEY_MISSING",
    });
  });

  it("returns skipped for invalid query", async () => {
    process.env.SERPAPI_API_KEY = "test-key";

    const result = await webSearchTool.handler({ query: "   " });

    expect(result).toEqual({
      query: null,
      results: [],
      skipped: true,
      reason: "INVALID_QUERY",
    });
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm --filter backend test -- apps/backend/tests/tools/web-search.tool.test.ts`

Expected: FAIL，因为当前 `webSearchTool` 仍是 handler 函数，没有 `.handler`。

- [ ] **Step 3: 实现 Tool 定义、输入规范化和基础失败返回**

将 `apps/backend/src/modules/tools/builtins/web-search.tool.ts` 先改为：

```ts
import type { Tool } from "../tool-registry";

type WebSearchInput = {
  query?: unknown;
  num?: unknown;
};

function normalizeQuery(query: unknown) {
  return typeof query === "string" && query.trim().length > 0
    ? query.trim()
    : null;
}

function normalizeNum(num: unknown) {
  if (typeof num !== "number" || !Number.isFinite(num)) {
    return 5;
  }

  return Math.min(10, Math.max(1, Math.trunc(num)));
}

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
    const { query, num } = input as WebSearchInput;
    const normalizedQuery = normalizeQuery(query);

    if (!normalizedQuery) {
      return {
        query: null,
        results: [],
        skipped: true,
        reason: "INVALID_QUERY",
      };
    }

    if (!process.env.SERPAPI_API_KEY) {
      return {
        query: normalizedQuery,
        results: [],
        skipped: true,
        reason: "SERPAPI_API_KEY_MISSING",
      };
    }

    return {
      query: normalizedQuery,
      results: [],
      num: normalizeNum(num),
    };
  },
};
```

- [ ] **Step 4: 运行基础测试**

Run: `pnpm --filter backend test -- apps/backend/tests/tools/web-search.tool.test.ts`

Expected: PASS。

- [ ] **Step 5: 写成功解析测试**

在 `apps/backend/tests/tools/web-search.tool.test.ts` 追加：

```ts
  it("returns organic results, answer box, and knowledge graph from SerpAPI", async () => {
    process.env.SERPAPI_API_KEY = "test-key";
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        organic_results: [
          {
            title: "SerpAPI",
            link: "https://serpapi.com/",
            snippet: "Search API results.",
          },
          {
            title: "Missing link",
            snippet: "This item should be ignored.",
          },
        ],
        answer_box: {
          title: "SerpAPI answer",
          answer: "A search API.",
          snippet: "SerpAPI provides search results.",
          link: "https://serpapi.com/answer",
        },
        knowledge_graph: {
          title: "SerpAPI",
          type: "Company",
          description: "Search API provider.",
          source: {
            name: "SerpAPI",
            link: "https://serpapi.com/",
          },
        },
      }),
    });
    globalThis.fetch = fetchMock;

    const result = await webSearchTool.handler({ query: " SerpAPI ", num: 20 });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const requestedUrl = new URL(String(fetchMock.mock.calls[0]?.[0]));
    expect(requestedUrl.origin).toBe("https://serpapi.com");
    expect(requestedUrl.pathname).toBe("/search.json");
    expect(requestedUrl.searchParams.get("engine")).toBe("google");
    expect(requestedUrl.searchParams.get("q")).toBe("SerpAPI");
    expect(requestedUrl.searchParams.get("api_key")).toBe("test-key");
    expect(requestedUrl.searchParams.get("num")).toBe("10");

    expect(result).toEqual({
      query: "SerpAPI",
      results: [
        {
          title: "SerpAPI",
          link: "https://serpapi.com/",
          snippet: "Search API results.",
        },
      ],
      answerBox: {
        title: "SerpAPI answer",
        answer: "A search API.",
        snippet: "SerpAPI provides search results.",
        link: "https://serpapi.com/answer",
      },
      knowledgeGraph: {
        title: "SerpAPI",
        type: "Company",
        description: "Search API provider.",
        source: {
          name: "SerpAPI",
          link: "https://serpapi.com/",
        },
      },
    });
  });
```

- [ ] **Step 6: 写请求失败测试**

继续追加：

```ts
  it("returns structured error when SerpAPI request fails", async () => {
    process.env.SERPAPI_API_KEY = "test-key";
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
    });

    const result = await webSearchTool.handler({ query: "SerpAPI" });

    expect(result).toEqual({
      query: "SerpAPI",
      results: [],
      error: true,
      reason: "SERPAPI_REQUEST_FAILED",
    });
  });
```

- [ ] **Step 7: 运行新增测试确认失败**

Run: `pnpm --filter backend test -- apps/backend/tests/tools/web-search.tool.test.ts`

Expected: FAIL，因为 handler 还没有真实请求和解析逻辑。

- [ ] **Step 8: 实现 SerpAPI 请求与响应抽取**

在 `apps/backend/src/modules/tools/builtins/web-search.tool.ts` 中加入辅助函数：

```ts
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function optionalString(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function parseOrganicResults(payload: Record<string, unknown>) {
  const results = Array.isArray(payload.organic_results)
    ? payload.organic_results
    : [];

  return results.flatMap((item) => {
    if (!isRecord(item)) return [];

    const title = optionalString(item.title);
    const link = optionalString(item.link);

    if (!title || !link) return [];

    return [
      {
        title,
        link,
        snippet: optionalString(item.snippet) ?? null,
      },
    ];
  });
}

function parseAnswerBox(payload: Record<string, unknown>) {
  if (!isRecord(payload.answer_box)) return undefined;

  const answerBox = {
    title: optionalString(payload.answer_box.title),
    answer: optionalString(payload.answer_box.answer),
    snippet: optionalString(payload.answer_box.snippet),
    link: optionalString(payload.answer_box.link),
  };

  return Object.values(answerBox).some(Boolean) ? answerBox : undefined;
}

function parseKnowledgeGraph(payload: Record<string, unknown>) {
  if (!isRecord(payload.knowledge_graph)) return undefined;

  const source = isRecord(payload.knowledge_graph.source)
    ? {
        name: optionalString(payload.knowledge_graph.source.name),
        link: optionalString(payload.knowledge_graph.source.link),
      }
    : undefined;
  const knowledgeGraph = {
    title: optionalString(payload.knowledge_graph.title),
    type: optionalString(payload.knowledge_graph.type),
    description: optionalString(payload.knowledge_graph.description),
    source:
      source && Object.values(source).some(Boolean) ? source : undefined,
  };

  return Object.values(knowledgeGraph).some(Boolean)
    ? knowledgeGraph
    : undefined;
}
```

把 handler 中 key 存在后的返回逻辑替换为：

```ts
    const url = new URL("https://serpapi.com/search.json");
    url.searchParams.set("engine", "google");
    url.searchParams.set("q", normalizedQuery);
    url.searchParams.set("api_key", process.env.SERPAPI_API_KEY);
    url.searchParams.set("num", String(normalizeNum(num)));

    try {
      const response = await fetch(url);

      if (!response.ok) {
        return {
          query: normalizedQuery,
          results: [],
          error: true,
          reason: "SERPAPI_REQUEST_FAILED",
        };
      }

      const payload = await response.json();

      if (!isRecord(payload)) {
        return {
          query: normalizedQuery,
          results: [],
          error: true,
          reason: "SERPAPI_REQUEST_FAILED",
        };
      }

      return {
        query: normalizedQuery,
        results: parseOrganicResults(payload),
        ...(parseAnswerBox(payload)
          ? { answerBox: parseAnswerBox(payload) }
          : {}),
        ...(parseKnowledgeGraph(payload)
          ? { knowledgeGraph: parseKnowledgeGraph(payload) }
          : {}),
      };
    } catch {
      return {
        query: normalizedQuery,
        results: [],
        error: true,
        reason: "SERPAPI_REQUEST_FAILED",
      };
    }
```

- [ ] **Step 9: 运行 web-search 测试**

Run: `pnpm --filter backend test -- apps/backend/tests/tools/web-search.tool.test.ts`

Expected: PASS。

- [ ] **Step 10: 提交 web-search 实现**

```bash
git add apps/backend/src/modules/tools/builtins/web-search.tool.ts apps/backend/tests/tools/web-search.tool.test.ts
git commit -m "feat(tools): 基于 SerpAPI 实现网页搜索"
```

---

### Task 5: 更新环境变量文档

**Files:**
- Modify: `.env.example`
- Modify: `README.md`

- [ ] **Step 1: 更新 .env.example**

在 `.env.example` 的 LLM 配置之后添加：

```dotenv
# SerpAPI 配置
SERPAPI_API_KEY=""
```

- [ ] **Step 2: 更新 README 环境变量表**

在 `README.md` 的环境变量表中，在 `LLM_MODEL` 后加入：

```md
| `SERPAPI_API_KEY` | - | SerpAPI 搜索密钥；配置后启用 `web-search` 真实网页搜索 |
```

- [ ] **Step 3: 查看文档差异**

Run: `git diff -- .env.example README.md`

Expected: 只包含 `SERPAPI_API_KEY` 相关说明。

- [ ] **Step 4: 提交文档更新**

```bash
git add .env.example README.md
git commit -m "docs: 补充 SerpAPI 环境变量说明"
```

---

### Task 6: 全量验证与收尾

**Files:**
- Verify only.

- [ ] **Step 1: 运行后端 lint**

Run: `pnpm lint:backend`

Expected: PASS，TypeScript 无类型错误。

- [ ] **Step 2: 运行后端测试**

Run: `pnpm test:backend`

Expected: PASS，包含新增 `web-search.tool.test.ts`。

- [ ] **Step 3: 检查工作区状态**

Run: `git status --short`

Expected: 无未提交文件。

- [ ] **Step 4: 如验证修复产生改动，提交修复**

如果 Step 1 或 Step 2 暴露类型或测试问题，先做最小修复，再运行：

```bash
pnpm lint:backend
pnpm test:backend
git add apps/backend/src apps/backend/tests
git commit -m "fix(tools): 修复 web-search 工具验证问题"
```

Expected: lint 和 test PASS，工作区干净。

---

## Self-Review

- Spec 覆盖：计划覆盖 Tool 对象模型、provider schema 映射、SerpAPI 普通网页搜索、answer box、knowledge graph、结构化失败、`.env.example`、README、后端 lint/test。
- 范围检查：未包含新闻/图片搜索、前端 UI、第三方 schema 库或通用校验框架。
- 类型一致性：`ToolDefinition`、`Tool`、`ToolMap`、`ProviderToolDefinition`、`webSearchTool.handler` 在各任务中使用一致。
- 占位检查：计划没有使用未定义的实现占位；每个代码修改步骤都给出具体代码或明确替换片段。
