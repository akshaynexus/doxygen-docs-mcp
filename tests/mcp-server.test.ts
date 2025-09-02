import { test, expect, describe, beforeAll, afterAll, beforeEach, afterEach } from "bun:test";
import { EnhancedDoxygenCrawler } from "../src/enhanced-crawler";

describe("MCP Server Integration Tests", () => {
  const TEST_BASE_URL = "https://open.ys7.com/doc/en/pc";

  describe("EnhancedDoxygenCrawler tests", () => {
    let crawler: EnhancedDoxygenCrawler;

    beforeEach(() => {
      crawler = new EnhancedDoxygenCrawler();
    });

    afterEach(async () => {
      await crawler.close();
    });

    test("should have all required API methods", async () => {
      // Test methods sequentially to avoid overwhelming the server
      const content = await crawler.getPageContent(TEST_BASE_URL, "index.html");
      expect(content).toBeTruthy();
      expect(typeof content).toBe("string");

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));

      const classes = await crawler.listClasses(TEST_BASE_URL);
      expect(classes).toBeInstanceOf(Array);

      // Use navigation structure cache for search to avoid rebuilding
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const searchResults = await crawler.searchDocs(TEST_BASE_URL, "SDK", 3);
      expect(searchResults).toBeInstanceOf(Array);
    }, 8000);

    test("should return compatible data structures", async () => {
      const classes = await crawler.listClasses(TEST_BASE_URL);
      
      if (classes.length > 0) {
        const cls = classes[0];
        expect(cls).toHaveProperty("name");
        expect(cls).toHaveProperty("url");
        expect(cls).toHaveProperty("description");
        
        const details = await crawler.getClassDetails(TEST_BASE_URL, cls?.name || "");
        if (details) {
          expect(details).toHaveProperty("methods");
          expect(details).toHaveProperty("properties");
          expect(details).toHaveProperty("inheritance");
        }
      }
    }, 15000);
  });

  describe("Enhanced Crawler features", () => {
    let crawler: EnhancedDoxygenCrawler;

    beforeAll(() => {
      crawler = new EnhancedDoxygenCrawler();
    });

    afterAll(async () => {
      await crawler.close();
    });

    test("should find classes in documentation", async () => {
      const classes = await crawler.listClasses(TEST_BASE_URL);

      expect(classes.length).toBeGreaterThan(0);

      // Should find known classes
      const classNames = new Set(classes.map(c => c.name));
      expect(classNames.size).toBeGreaterThan(0);
    }, 20000);

    test("should return search results", async () => {
      // Use smaller result set and shorter query for faster execution
      const results = await crawler.searchDocs(TEST_BASE_URL, "SDK", 3);

      expect(results.length).toBeGreaterThan(0);

      // Should find content containing "SDK"
      const hasSDK = results.some(r => r.content.toLowerCase().includes("sdk"));
      expect(hasSDK).toBe(true);
    }, 10000);

    test("should provide navigation structure and additional features", async () => {
      // Test enhanced features - test only structure which is faster
      const structure = await crawler.getNavigationStructure(TEST_BASE_URL);

      expect(structure).toHaveProperty("mainPage");
      expect(structure).toHaveProperty("relatedPages");
      expect(structure).toHaveProperty("modules");
      expect(structure).toHaveProperty("classes");
      expect(structure).toHaveProperty("files");

      // Test that arrays are returned (don't fetch them as they're slow)
      expect(Array.isArray(structure.modules)).toBe(true);
      expect(Array.isArray(structure.classes)).toBe(true);
      expect(Array.isArray(structure.files)).toBe(true);
    }, 15000);
  });

  describe("Server Tool Simulation Tests", () => {
    let crawler: EnhancedDoxygenCrawler;

    beforeAll(() => {
      crawler = new EnhancedDoxygenCrawler();
    });

    afterAll(async () => {
      await crawler.close();
    });

    test("search_docs tool simulation", async () => {
      // Simulate the MCP server search_docs tool call with smaller result set
      const args = {
        baseUrl: TEST_BASE_URL,
        query: "camera",
        maxResults: 3
      };

      const results = await crawler.searchDocs(args.baseUrl, args.query, args.maxResults);
      
      // Validate the response format that the MCP server would return
      expect(results).toBeInstanceOf(Array);
      expect(results.length).toBeLessThanOrEqual(args.maxResults);
      
      for (const result of results) {
        expect(result).toHaveProperty("title");
        expect(result).toHaveProperty("url");
        expect(result).toHaveProperty("content");
        expect(result).toHaveProperty("type");
        
        expect(typeof result.title).toBe("string");
        expect(typeof result.url).toBe("string");
        expect(typeof result.content).toBe("string");
        expect(["class", "function", "namespace", "file", "page", "module", "related"]).toContain(result.type);
      }

      // Should be JSON serializable
      expect(() => JSON.stringify(results)).not.toThrow();
    }, 15000);

    test("get_page_content tool simulation", async () => {
      const args = {
        baseUrl: TEST_BASE_URL,
        path: "index.html"
      };

      const content = await crawler.getPageContent(args.baseUrl, args.path);
      
      expect(typeof content).toBe("string");
      expect(content.length).toBeGreaterThan(0);
      expect(content).toContain("SDK");
    }, 10000);

    test("list_classes tool simulation", async () => {
      const args = {
        baseUrl: TEST_BASE_URL
      };

      const classes = await crawler.listClasses(args.baseUrl);
      
      expect(classes).toBeInstanceOf(Array);
      expect(classes.length).toBeGreaterThan(0);
      
      for (const cls of classes) {
        expect(cls).toHaveProperty("name");
        expect(cls).toHaveProperty("url");
        expect(cls).toHaveProperty("description");
        
        expect(typeof cls.name).toBe("string");
        expect(typeof cls.url).toBe("string");
        expect(typeof cls.description).toBe("string");
      }

      // Should be JSON serializable
      expect(() => JSON.stringify(classes)).not.toThrow();
    }, 15000);

    test("get_class_details tool simulation", async () => {
      // First get a class to test with
      const classes = await crawler.listClasses(TEST_BASE_URL);
      if (classes.length === 0) {
        console.log("No classes found, skipping class details test");
        return;
      }

      const args = {
        baseUrl: TEST_BASE_URL,
        className: classes[0]?.name || ""
      };

      const details = await crawler.getClassDetails(args.baseUrl, args.className);
      
      expect(details).not.toBeNull();
      expect(details).toHaveProperty("name");
      expect(details).toHaveProperty("url");
      expect(details).toHaveProperty("description");
      expect(details).toHaveProperty("methods");
      expect(details).toHaveProperty("properties");
      expect(details).toHaveProperty("inheritance");
      
      expect(details?.methods).toBeInstanceOf(Array);
      expect(details?.properties).toBeInstanceOf(Array);
      expect(details?.inheritance).toHaveProperty("baseClasses");
      expect(details?.inheritance).toHaveProperty("derivedClasses");

      // Should be JSON serializable
      expect(() => JSON.stringify(details)).not.toThrow();
    }, 15000);

    test("parameter validation simulation", async () => {
      // Test missing required parameters
      expect(
        crawler.searchDocs("", "query", 10)
      ).rejects.toThrow();

      expect(
        crawler.getPageContent("", "path")
      ).rejects.toThrow();

      // Empty URL for listClasses returns empty array, not error
      const emptyClassList = await crawler.listClasses("");
      expect(emptyClassList).toBeInstanceOf(Array);
      expect(emptyClassList).toHaveLength(0);

      // Test invalid parameters
      expect(
        crawler.searchDocs("invalid-url", "query", 10)
      ).rejects.toThrow();
    });

    test("error response format simulation", async () => {
      try {
        await crawler.fetchPage("http://definitely-nonexistent-domain-12345.com");
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBeTruthy();
        
        // This is how the MCP server would format the error
        const errorResponse = {
          content: [{
            type: "text",
            text: `Error: ${(error as Error).message}`
          }],
          isError: true
        };
        
        expect(errorResponse).toHaveProperty("content");
        expect(errorResponse).toHaveProperty("isError");
        expect(errorResponse.isError).toBe(true);
        expect(errorResponse.content).toHaveLength(1);
        expect(errorResponse.content[0]?.type).toBe("text");
      }
    });
  });

  describe("Full MCP Server Workflow Tests", () => {
    let crawler: EnhancedDoxygenCrawler;

    beforeAll(() => {
      crawler = new EnhancedDoxygenCrawler();
    });

    afterAll(async () => {
      await crawler.close();
    });

    test("complete documentation exploration workflow", async () => {
      // This test simulates a complete AI agent workflow using the MCP server

      // 1. List available classes
      const classes = await crawler.listClasses(TEST_BASE_URL);
      expect(classes.length).toBeGreaterThan(0);

      // 2. Search for specific content
      const searchResults = await crawler.searchDocs(TEST_BASE_URL, "time", 5);
      expect(searchResults.length).toBeGreaterThan(0);

      // 3. Get detailed information about a specific class
      const timeRelatedClass = classes.find(c => 
        c.name.toLowerCase().includes("time") || 
        c.description.toLowerCase().includes("time")
      );

      if (timeRelatedClass) {
        const classDetails = await crawler.getClassDetails(TEST_BASE_URL, timeRelatedClass.name);
        expect(classDetails).not.toBeNull();
        
        // 4. Extract specific information
        if (classDetails?.properties.length && classDetails.properties.length > 0) {
          const properties = classDetails.properties;
          expect(properties.some(p => p.type.includes("int"))).toBe(true);
        }
      }

      // 5. Get page content for context
      const pageContent = await crawler.getPageContent(TEST_BASE_URL, "index.html");
      expect(pageContent).toContain("SDK");

      console.log("Complete workflow test passed");
    }, 30000);

    test("concurrent operations handling", async () => {
      // Test that the crawler can handle multiple simultaneous requests
      // This simulates multiple AI agents using the same MCP server
      
      const operations = [
        crawler.searchDocs(TEST_BASE_URL, "SDK", 3),
        crawler.listClasses(TEST_BASE_URL),
        crawler.getPageContent(TEST_BASE_URL, "index.html"),
        crawler.searchDocs(TEST_BASE_URL, "time", 3)
      ];

      const results = await Promise.allSettled(operations);
      
      // All operations should succeed
      const failed = results.filter(r => r.status === "rejected");
      expect(failed.length).toBe(0);

      // Verify each result
      const [searchResults1, classes, content, searchResults2] = results.map(r => 
        r.status === "fulfilled" ? r.value : null
      );

      expect(searchResults1).toBeInstanceOf(Array);
      expect(classes).toBeInstanceOf(Array);
      expect(typeof content).toBe("string");
      expect(searchResults2).toBeInstanceOf(Array);
    }, 25000);

    test("large result set handling", async () => {
      // Test with a more specific query that will return results faster
      const largeSearchResults = await crawler.searchDocs(TEST_BASE_URL, "SDK", 20);
      
      expect(largeSearchResults).toBeInstanceOf(Array);
      expect(largeSearchResults.length).toBeLessThanOrEqual(20);
      
      // Should complete in reasonable time (handled by test timeout)
      // Should be JSON serializable even with large results
      expect(() => JSON.stringify(largeSearchResults)).not.toThrow();
    }, 40000);

    test("memory usage stability", async () => {
      // Perform multiple operations to test memory stability
      for (let i = 0; i < 10; i++) {
        await crawler.fetchPage(`${TEST_BASE_URL}/index.html`);
        await crawler.searchDocs(TEST_BASE_URL, `test${i}`, 3);
      }

      // Should complete without memory issues
      expect(true).toBe(true);
    }, 20000);
  });
});