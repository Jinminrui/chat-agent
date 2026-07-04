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

      const answerBox = parseAnswerBox(payload);
      const knowledgeGraph = parseKnowledgeGraph(payload);

      return {
        query: normalizedQuery,
        results: parseOrganicResults(payload),
        ...(answerBox ? { answerBox } : {}),
        ...(knowledgeGraph ? { knowledgeGraph } : {}),
      };
    } catch {
      return {
        query: normalizedQuery,
        results: [],
        error: true,
        reason: "SERPAPI_REQUEST_FAILED",
      };
    }
  },
};
