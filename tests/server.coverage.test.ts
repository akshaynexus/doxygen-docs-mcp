import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { DoxygenMCPServer } from "../src/server";

// Focused unit tests to achieve 100% coverage for src/server.ts
// without relying on network by mocking the crawler and server transport.

describe("server.ts coverage (unit, offline)", () => {
  let server: DoxygenMCPServer;

  // Simple fake crawler that returns deterministic values
  const makeMockCrawler = () => ({
    searchDocs: async (_baseUrl: string, query: string, maxResults: number) => [
      { title: `Result for ${query}`, url: "/r1", content: "snippet", type: "page" },
      ...(maxResults > 1 ? [{ title: "Second", url: "/r2", content: "snippet2", type: "class" }] : [])
    ].slice(0, maxResults),
    getPageContent: async (_baseUrl: string, path: string) => `content-for:${path}`,
    listClasses: async (_baseUrl: string) => [
      { name: "Foo", url: "/class_Foo.html", description: "Test class" },
    ],
    getClassDetails: async (_baseUrl: string, className: string) => ({
      name: className,
      url: `/class_${className}.html`,
      description: "Details",
      methods: [],
      properties: [],
      inheritance: { baseClasses: [], derivedClasses: [] },
    }),
    close: async () => {},
  });

  // Minimal fake server that captures handlers
  function makeFakeServer() {
    const handlers: { listTools?: Function; callTool?: Function } = {};
    return {
      handlers,
      setRequestHandler: (_schema: any, handler: any) => {
        // list tools handler takes no args; call tool takes one arg (request)
        if (handler.length === 0) handlers.listTools = handler;
        else handlers.callTool = handler;
      },
      connect: async (_transport: any) => { /* no-op for tests */ },
    } as any;
  }

  beforeEach(() => {
    server = new DoxygenMCPServer();
    // Replace internal server with fake to capture handlers
    (server as any).server = makeFakeServer();
    // Replace crawler to avoid network
    (server as any).crawler = makeMockCrawler();
    server.setupHandlers();
  });

  afterEach(async () => {
    await (server as any).crawler.close();
  });

  test("lists tools via handler", async () => {
    const fake = (server as any).server;
    const res = await fake.handlers.listTools!();
    expect(res.tools).toBeInstanceOf(Array);
    expect(res.tools.length).toBe(4);
    // Tool names should match those defined in setupHandlers
    const names = res.tools.map((t: any) => t.name);
    expect(names).toEqual([
      "search_docs",
      "get_page_content",
      "list_classes",
      "get_class_details",
    ]);
  });

  test("callTool handlers: success paths", async () => {
    const fake = (server as any).server;

    // search_docs
    let r = await fake.handlers.callTool!({
      params: { name: "search_docs", arguments: { baseUrl: "http://x", query: "q", maxResults: 2 } }
    });
    expect(r.content[0].type).toBe("text");
    expect(() => JSON.parse(r.content[0].text)).not.toThrow();

    // get_page_content
    r = await fake.handlers.callTool!({
      params: { name: "get_page_content", arguments: { baseUrl: "http://x", path: "index.html" } }
    });
    expect(r.content[0].text).toBe("content-for:index.html");

    // list_classes
    r = await fake.handlers.callTool!({
      params: { name: "list_classes", arguments: { baseUrl: "http://x" } }
    });
    expect(() => JSON.parse(r.content[0].text)).not.toThrow();

    // get_class_details
    r = await fake.handlers.callTool!({
      params: { name: "get_class_details", arguments: { baseUrl: "http://x", className: "Foo" } }
    });
    const parsed = JSON.parse(r.content[0].text);
    expect(parsed.name).toBe("Foo");
  });

  test("callTool handlers: error paths (unknown tool and invalid args)", async () => {
    const fake = (server as any).server;

    // Unknown tool
    const r1 = await fake.handlers.callTool!({ params: { name: "unknown", arguments: {} } });
    expect(r1.isError).toBe(true);
    expect(r1.content[0].text).toContain("Unknown tool");

    // Invalid args for search_docs (missing baseUrl)
    const r2 = await fake.handlers.callTool!({
      params: { name: "search_docs", arguments: { query: "q" } }
    });
    expect(r2.isError).toBe(true);
    expect(r2.content[0].text).toContain("Error:");
  });

  test("run() connects transport and logs", async () => {
    // Spy on connect and console.error
    let connected = false;
    (server as any).server.connect = async (_transport: any) => { connected = true; };

    const origErr = console.error;
    const msgs: string[] = [];
    console.error = ((...args: any[]) => { msgs.push(args.join(" ")); }) as any;

    try {
      await server.run();
      expect(connected).toBe(true);
      const msg = msgs.join("\n");
      expect(msg).toContain("Doxygen Docs MCP Server running on stdio");
    } finally {
      console.error = origErr;
    }
  });
});
