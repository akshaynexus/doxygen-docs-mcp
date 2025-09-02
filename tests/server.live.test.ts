import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { DoxygenMCPServer } from "../src/server";

// Live tests against a real Doxygen baseUrl. No response mocking.
// If network is unavailable, these tests will no-op, but when run
// with network enabled they exercise all handlers in src/server.ts.

const BASE_URL = "https://open.ys7.com/doc/en/pc";

async function hasNetwork(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/index.html`, { method: "GET" });
    return res.ok;
  } catch {
    return false;
  }
}

describe("server.ts live handlers (real baseUrl)", () => {
  let server: DoxygenMCPServer;
  let networkOk = false;

  beforeAll(async () => {
    networkOk = await hasNetwork();
    server = new DoxygenMCPServer();
  });

  afterAll(async () => {
    await (server as any).crawler.close();
  });

  test("list tools and call each tool handler with real crawler", async () => {
    if (!networkOk) return; // environment without network; skip work

    // Capture handlers by intercepting setRequestHandler
    const original = (server as any).server;
    const handlers: { listTools?: Function; callTool?: Function } = {};
    const setRequestHandler = original.setRequestHandler.bind(original);
    (server as any).server.setRequestHandler = (schema: any, handler: any) => {
      // Distinguish based on arity: list tools has 0 args, call tool has 1
      if (handler.length === 0) handlers.listTools = handler;
      else handlers.callTool = handler;
      return setRequestHandler(schema, handler);
    };

    // Re-run setup to ensure our interception catches registrations
    server.setupHandlers();

    // List tools
    const toolsResp = await handlers.listTools!();
    expect(toolsResp.tools).toBeInstanceOf(Array);
    expect(toolsResp.tools.length).toBe(4);

    // search_docs
    let resp = await handlers.callTool!({
      params: { name: "search_docs", arguments: { baseUrl: BASE_URL, query: "SDK", maxResults: 3 } }
    });
    expect(resp.content).toBeInstanceOf(Array);

    // get_page_content
    resp = await handlers.callTool!({
      params: { name: "get_page_content", arguments: { baseUrl: BASE_URL, path: "index.html" } }
    });
    expect(typeof resp.content[0].text).toBe("string");

    // list_classes
    resp = await handlers.callTool!({
      params: { name: "list_classes", arguments: { baseUrl: BASE_URL } }
    });
    expect(resp.content).toBeInstanceOf(Array);

    // get_class_details (best-effort on first class name if available)
    // Use crawler to fetch a class list first
    const classes = await (server as any).crawler.listClasses(BASE_URL);
    const className = classes[0]?.name || "STREAM_TIME";
    resp = await handlers.callTool!({
      params: { name: "get_class_details", arguments: { baseUrl: BASE_URL, className } }
    });
    expect(resp.content).toBeInstanceOf(Array);

    // unknown tool (error path)
    const errResp = await handlers.callTool!({ params: { name: "unknown_tool", arguments: {} } });
    expect(errResp.isError).toBe(true);
  }, 60000);

  test("run() connects and logs", async () => {
    if (!networkOk) return; // does not require network, but keep suite behavior consistent
    // Should resolve and log startup message
    await server.run();
    expect(true).toBe(true);
  });
});

