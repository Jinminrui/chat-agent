# SerpAPI Web Search 工具设计

## 背景

当前后端已经有工具注册与 agent runtime 流程，默认工具包括 `current-time`、`fetch-url` 和 `web-search`。其中 `web-search` 仍是占位实现，只返回 `NETWORK_DISABLED_IN_MINIMAL_RUNTIME`。同时，provider 目前只把工具名传给模型，缺少工具描述和参数 schema，模型无法可靠地知道 `web-search` 应该如何调用。

本设计把工具系统升级为完整 Tool 对象模型，并基于 SerpAPI 实现 `web-search`。目标是让模型能看到工具描述和参数 schema，后端能执行真实网页搜索，同时在缺少 key 或外部服务失败时保持聊天流程不中断。

## 目标

- 将工具注册从 `Record<string, ToolHandler>` 升级为 `Record<string, Tool>`。
- 每个工具自带 `definition` 和 `handler`，其中 `definition` 包含名称、描述和 JSON schema 参数。
- OpenAI provider 将工具定义映射为 function tools，让模型知道可用参数。
- `web-search` 使用 SerpAPI Google Search API 返回普通网页结果，以及可用时的 answer box 和 knowledge graph 摘要。
- 工具失败返回结构化失败结果，不让一次搜索故障导致整轮聊天失败。

## 非目标

- 不实现新闻、图片、地图等搜索类型。
- 不引入第三方 schema 校验库。
- 不建立通用参数校验框架。
- 不保存 SerpAPI 原始响应。
- 不改造前端聊天 UI。

## 架构

工具模型新增以下概念：

```ts
type ToolDefinition = {
  name: string;
  description: string;
  parameters: JsonSchemaObject;
};

type Tool = {
  definition: ToolDefinition;
  handler: ToolHandler;
};
```

`tool-registry` 继续负责工具查找与执行，同时提供 `definitions()`。`agent-runtime` 不再从工具名拼 `{ name }`，而是从 registry 读取完整定义传给 provider。

`ProviderToolDefinition` 扩展为包含 `description` 和 `parameters`。`OpenAIProvider` 的 `toOpenAITools` 直接把这两个字段映射到 OpenAI function tool：

```ts
{
  type: "function",
  function: {
    name,
    description,
    parameters,
  },
}
```

`current-time`、`fetch-url` 和 `web-search` 都迁移为 Tool 对象。这样后续新增工具只需要在工具文件内定义能力，不需要修改 provider 的硬编码逻辑。

## Web Search 输入

`web-search` 支持最小参数集合：

```ts
{
  query: string;
  num?: number;
}
```

- `query` 必填，必须是非空字符串。
- `num` 可选，默认 `5`，执行时限制在 `1` 到 `10` 之间。

## SerpAPI 数据流

handler 读取 `process.env.SERPAPI_API_KEY`。key 存在且输入有效时，使用原生 `fetch` 请求：

```text
https://serpapi.com/search.json?engine=google&q=<query>&api_key=<key>&num=<num>
```

实现不新增 npm 依赖。请求参数使用 `URL` 和 `URLSearchParams` 构造，避免手写 URL 拼接。

## Web Search 输出

成功时返回：

```ts
{
  query: string;
  results: Array<{
    title: string;
    link: string;
    snippet: string | null;
  }>;
  answerBox?: {
    title?: string;
    answer?: string;
    snippet?: string;
    link?: string;
  };
  knowledgeGraph?: {
    title?: string;
    type?: string;
    description?: string;
    source?: {
      name?: string;
      link?: string;
    };
  };
}
```

普通网页结果来自 SerpAPI 的 `organic_results`。只抽取 `title`、`link` 和 `snippet`，并过滤缺少标题或链接的条目。

`answerBox` 来自 `answer_box`，只抽取模型回答最可能使用的标题、答案、摘要和链接字段。

`knowledgeGraph` 来自 `knowledge_graph`，只抽取标题、类型、描述和来源字段。

## 错误处理

工具失败不向上抛错，而是返回结构化结果。

缺少 key：

```ts
{
  query,
  results: [],
  skipped: true,
  reason: "SERPAPI_API_KEY_MISSING",
}
```

无效 query：

```ts
{
  query: null,
  results: [],
  skipped: true,
  reason: "INVALID_QUERY",
}
```

SerpAPI HTTP 失败、网络异常或响应解析失败：

```ts
{
  query,
  results: [],
  error: true,
  reason: "SERPAPI_REQUEST_FAILED",
}
```

错误结果不包含 API key、完整请求 URL 或原始大响应。

## 测试计划

后端测试覆盖以下行为：

1. `tool-registry` 能返回完整 definitions。
2. `tool-registry` 执行工具时只接受自有属性，未知工具仍抛 `TOOL_NOT_FOUND`。
3. `openai.provider` 将工具描述和参数 schema 映射到 OpenAI function tools。
4. `web-search.tool` 在缺少 `SERPAPI_API_KEY` 时返回 skipped。
5. `web-search.tool` 在 query 无效时返回 `INVALID_QUERY`。
6. `web-search.tool` 能从模拟 SerpAPI 响应中解析 organic results、answer box 和 knowledge graph。
7. `web-search.tool` 在 SerpAPI 请求失败时返回结构化 error。
8. 运行现有 backend lint 和 test，确认 ToolMap 迁移没有破坏 agent runtime。

## 文档更新

- `.env.example` 添加 `SERPAPI_API_KEY=`。
- README 环境变量说明补充：配置该 key 后，后端 `web-search` 工具会调用 SerpAPI。

## 成功标准

- 模型收到的工具定义包含 `web-search` 的描述和参数 schema。
- 默认工具完成从 handler map 到 Tool map 的迁移。
- `web-search` 能在配置 SerpAPI key 后返回网页搜索摘要。
- 缺 key 或 SerpAPI 故障不会让聊天请求崩溃。
- 相关单元测试、后端 lint 和后端测试通过。
