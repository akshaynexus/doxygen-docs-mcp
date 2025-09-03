#!/usr/bin/env bun

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { EnhancedDoxygenCrawler as DoxygenCrawler } from "./enhanced-crawler";
import { z } from "zod";

const SearchDocsSchema = z.object({
  baseUrl: z
    .string()
    .optional()
    .describe(
      "Base URL of the Doxygen documentation site (optional if provided via MCP server args)"
    ),
  query: z.string().describe("Search query to find in documentation"),
  maxResults: z.number().default(10).describe("Maximum number of results to return"),
});

const GetPageContentSchema = z.object({
  baseUrl: z
    .string()
    .optional()
    .describe(
      "Base URL of the Doxygen documentation site (optional if provided via MCP server args)"
    ),
  path: z.string().describe("Path to specific documentation page"),
});

const ListClassesSchema = z.object({
  baseUrl: z
    .string()
    .optional()
    .describe(
      "Base URL of the Doxygen documentation site (optional if provided via MCP server args)"
    ),
});

const GetClassDetailsSchema = z.object({
  baseUrl: z
    .string()
    .optional()
    .describe(
      "Base URL of the Doxygen documentation site (optional if provided via MCP server args)"
    ),
  className: z.string().describe("Name of the class to get details for"),
});

export class DoxygenMCPServer {
  private server: Server;
  private crawler: DoxygenCrawler;
  private defaultBaseUrl?: string;

  constructor() {
    this.server = new Server(
      {
        name: "doxygen-docs-mcp",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.crawler = new DoxygenCrawler();
    this.defaultBaseUrl = this.parseBaseUrlFromArgs(process.argv);
    this.setupHandlers();
  }

  private parseBaseUrlFromArgs(argv: string[]): string | undefined {
    // Support flags: --baseUrl <url>, --base-url <url>, --baseUrl=<url>, --base-url=<url>
    const args = argv.slice(2);
    for (let i = 0; i < args.length; i++) {
      const token = args[i];
      if (token === "--baseUrl" || token === "--base-url") {
        const next = args[i + 1];
        if (typeof next === "string" && next && !next.startsWith("--")) {
          return next;
        }
        continue;
      }
      if (typeof token === "string") {
        const match = token.match(/^--base[-]?url=(.+)$/i);
        if (match && match[1]) return match[1];
      }
    }
    return undefined;
  }

  public setupHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: "search_docs",
          description: "Search through Doxygen documentation for specific content",
          inputSchema: {
            type: "object",
            properties: {
              baseUrl: {
                type: "string",
                description:
                  "Base URL of the Doxygen documentation site (optional if provided via MCP server args)",
              },
              query: {
                type: "string",
                description: "Search query to find in documentation",
              },
              maxResults: {
                type: "number",
                description: "Maximum number of results to return",
                default: 10,
              },
            },
            required: ["query"],
          },
        },
        {
          name: "get_page_content",
          description: "Get the content of a specific documentation page",
          inputSchema: {
            type: "object",
            properties: {
              baseUrl: {
                type: "string",
                description:
                  "Base URL of the Doxygen documentation site (optional if provided via MCP server args)",
              },
              path: {
                type: "string",
                description: "Path to specific documentation page",
              },
            },
            required: ["path"],
          },
        },
        {
          name: "list_classes",
          description: "List all classes/modules in the documentation",
          inputSchema: {
            type: "object",
            properties: {
              baseUrl: {
                type: "string",
                description:
                  "Base URL of the Doxygen documentation site (optional if provided via MCP server args)",
              },
            },
            required: [],
          },
        },
        {
          name: "get_class_details",
          description: "Get detailed information about a specific class",
          inputSchema: {
            type: "object",
            properties: {
              baseUrl: {
                type: "string",
                description:
                  "Base URL of the Doxygen documentation site (optional if provided via MCP server args)",
              },
              className: {
                type: "string",
                description: "Name of the class to get details for",
              },
            },
            required: ["className"],
          },
        },
      ] as Tool[],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case "search_docs": {
            const { baseUrl, query, maxResults } = SearchDocsSchema.parse(args);
            const resolvedBaseUrl = baseUrl ?? this.defaultBaseUrl;
            if (!resolvedBaseUrl) {
              throw new Error(
                "Base URL not provided. Pass 'baseUrl' in the call or start the MCP server with --baseUrl."
              );
            }
            const results = await this.crawler.searchDocs(resolvedBaseUrl, query, maxResults);
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(results, null, 2),
                },
              ],
            };
          }

          case "get_page_content": {
            const { baseUrl, path } = GetPageContentSchema.parse(args);
            const resolvedBaseUrl = baseUrl ?? this.defaultBaseUrl;
            if (!resolvedBaseUrl) {
              throw new Error(
                "Base URL not provided. Pass 'baseUrl' in the call or start the MCP server with --baseUrl."
              );
            }
            const content = await this.crawler.getPageContent(resolvedBaseUrl, path);
            return {
              content: [
                {
                  type: "text",
                  text: content,
                },
              ],
            };
          }

          case "list_classes": {
            const { baseUrl } = ListClassesSchema.parse(args);
            const resolvedBaseUrl = baseUrl ?? this.defaultBaseUrl;
            if (!resolvedBaseUrl) {
              throw new Error(
                "Base URL not provided. Pass 'baseUrl' in the call or start the MCP server with --baseUrl."
              );
            }
            const classes = await this.crawler.listClasses(resolvedBaseUrl);
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(classes, null, 2),
                },
              ],
            };
          }

          case "get_class_details": {
            const { baseUrl, className } = GetClassDetailsSchema.parse(args);
            const resolvedBaseUrl = baseUrl ?? this.defaultBaseUrl;
            if (!resolvedBaseUrl) {
              throw new Error(
                "Base URL not provided. Pass 'baseUrl' in the call or start the MCP server with --baseUrl."
              );
            }
            const details = await this.crawler.getClassDetails(resolvedBaseUrl, className);
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(details, null, 2),
                },
              ],
            };
          }

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("Doxygen Docs MCP Server running on stdio");
  }
}


// Only start the server when this file is executed directly, not when imported for tests
if (import.meta.main) {
  const server = new DoxygenMCPServer();
  server.run().catch(console.error);
}
