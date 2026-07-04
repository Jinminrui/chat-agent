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
});
