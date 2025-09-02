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
  baseUrl: z.string().describe("Base URL of the Doxygen documentation site"),
  query: z.string().describe("Search query to find in documentation"),
  maxResults: z.number().default(10).describe("Maximum number of results to return"),
});

const GetPageContentSchema = z.object({
  baseUrl: z.string().describe("Base URL of the Doxygen documentation site"),
  path: z.string().describe("Path to specific documentation page"),
});

const ListClassesSchema = z.object({
  baseUrl: z.string().describe("Base URL of the Doxygen documentation site"),
});

const GetClassDetailsSchema = z.object({
  baseUrl: z.string().describe("Base URL of the Doxygen documentation site"),
  className: z.string().describe("Name of the class to get details for"),
});

class DoxygenMCPServer {
  private server: Server;
  private crawler: DoxygenCrawler;

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
    this.setupHandlers();
  }

  private setupHandlers() {
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
                description: "Base URL of the Doxygen documentation site",
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
            required: ["baseUrl", "query"],
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
                description: "Base URL of the Doxygen documentation site",
              },
              path: {
                type: "string",
                description: "Path to specific documentation page",
              },
            },
            required: ["baseUrl", "path"],
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
                description: "Base URL of the Doxygen documentation site",
              },
            },
            required: ["baseUrl"],
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
                description: "Base URL of the Doxygen documentation site",
              },
              className: {
                type: "string",
                description: "Name of the class to get details for",
              },
            },
            required: ["baseUrl", "className"],
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
            const results = await this.crawler.searchDocs(baseUrl, query, maxResults);
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
            const content = await this.crawler.getPageContent(baseUrl, path);
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
            const classes = await this.crawler.listClasses(baseUrl);
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
            const details = await this.crawler.getClassDetails(baseUrl, className);
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

const server = new DoxygenMCPServer();
server.run().catch(console.error);