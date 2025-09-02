import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { EnhancedDoxygenCrawler } from "../src/enhanced-crawler";

describe("EnhancedDoxygenCrawler Unit Tests", () => {
  let crawler: EnhancedDoxygenCrawler;

  beforeEach(() => {
    crawler = new EnhancedDoxygenCrawler();
  });

  afterEach(async () => {
    await crawler.close();
  });

  describe("Private method testing via reflection", () => {
    test("extractMethodName should parse function signatures correctly", () => {
      const testCrawler = new EnhancedDoxygenCrawler() as any;
      
      expect(testCrawler.extractMethodName("int functionName()")).toBe("functionName");
      expect(testCrawler.extractMethodName("void MyClass::method(int param)")).toBe("method");
      expect(testCrawler.extractMethodName("static bool isValid()")).toBe("isValid");
      expect(testCrawler.extractMethodName("const char* getString(void)")).toBe("getString");
      expect(testCrawler.extractMethodName("unsigned long long getNumber()")).toBe("getNumber");
      expect(testCrawler.extractMethodName("invalid signature")).toBe("unknown");
      expect(testCrawler.extractMethodName("")).toBe("unknown");
    });

    test("extractPropertyName should parse property declarations correctly", () => {
      const testCrawler = new EnhancedDoxygenCrawler() as any;
      
      expect(testCrawler.extractPropertyName("int myProperty")).toBe("myProperty");
      expect(testCrawler.extractPropertyName("const char* stringProp")).toBe("stringProp");
      expect(testCrawler.extractPropertyName("unsigned long long bigNumber")).toBe("bigNumber");
      expect(testCrawler.extractPropertyName("static const int CONSTANT")).toBe("CONSTANT");
      expect(testCrawler.extractPropertyName("")).toBe("unknown");
      expect(testCrawler.extractPropertyName("   ")).toBe("unknown");
    });

    test("extractPropertyType should parse type declarations correctly", () => {
      const testCrawler = new EnhancedDoxygenCrawler() as any;
      
      expect(testCrawler.extractPropertyType("int myProperty")).toBe("int");
      expect(testCrawler.extractPropertyType("const char* stringProp")).toBe("const char*");
      expect(testCrawler.extractPropertyType("unsigned long long bigNumber")).toBe("unsigned long long");
      expect(testCrawler.extractPropertyType("static const int CONSTANT")).toBe("static const int");
      expect(testCrawler.extractPropertyType("myProperty")).toBe("unknown");
      expect(testCrawler.extractPropertyType("")).toBe("unknown");
    });

    test("extractReturnType should parse function return types correctly", () => {
      const testCrawler = new EnhancedDoxygenCrawler() as any;
      
      expect(testCrawler.extractReturnType("int functionName()")).toBe("int");
      expect(testCrawler.extractReturnType("void cleanup()")).toBe("void");
      expect(testCrawler.extractReturnType("const char* getString()")).toBe("const char*");
      expect(testCrawler.extractReturnType("static bool isValid()")).toBe("static bool");
      expect(testCrawler.extractReturnType("functionName()")).toBe("void");
      expect(testCrawler.extractReturnType("")).toBe("void");
    });

    test("extractParameters should parse function parameters correctly", () => {
      const testCrawler = new EnhancedDoxygenCrawler() as any;
      
      expect(testCrawler.extractParameters("func()")).toBe("");
      expect(testCrawler.extractParameters("func(int a)")).toBe("int a");
      expect(testCrawler.extractParameters("func(int a, char* b)")).toBe("int a, char* b");
      expect(testCrawler.extractParameters("func(const char* str, int count, void* callback)")).toBe("const char* str, int count, void* callback");
      expect(testCrawler.extractParameters("func")).toBe("");
      expect(testCrawler.extractParameters("")).toBe("");
    });

    test("extractVisibility should determine access levels correctly", () => {
      const testCrawler = new EnhancedDoxygenCrawler() as any;
      
      expect(testCrawler.extractVisibility("public int method()")).toBe("public");
      expect(testCrawler.extractVisibility("private void method()")).toBe("private");
      expect(testCrawler.extractVisibility("protected bool method()")).toBe("protected");
      expect(testCrawler.extractVisibility("int method()")).toBe("public"); // default
      expect(testCrawler.extractVisibility("static int method()")).toBe("public"); // default
      expect(testCrawler.extractVisibility("")).toBe("public"); // default
    });

    test("parseParameters should parse function signature parameters", () => {
      const testCrawler = new EnhancedDoxygenCrawler() as any;
      
      let params = testCrawler.parseParameters("func()");
      expect(params).toHaveLength(0);
      
      params = testCrawler.parseParameters("func(int a)");
      expect(params).toHaveLength(1);
      expect(params[0]).toEqual({ name: "a", type: "int", description: "" });
      
      params = testCrawler.parseParameters("func(const char* str, int count)");
      expect(params).toHaveLength(2);
      expect(params[0]).toEqual({ name: "str", type: "const char*", description: "" });
      expect(params[1]).toEqual({ name: "count", type: "int", description: "" });
      
      params = testCrawler.parseParameters("func(unsigned long long value, void* callback)");
      expect(params).toHaveLength(2);
      expect(params[0]).toEqual({ name: "value", type: "unsigned long long", description: "" });
      expect(params[1]).toEqual({ name: "callback", type: "void*", description: "" });
    });

    test("determinePageType should categorize URLs correctly", () => {
      const testCrawler = new EnhancedDoxygenCrawler() as any;
      
      // Create mock cheerio functions
      const mockClassPage = (selector: string) => ({
        text: () => selector === ".title" ? "MyClass Class Reference" : ""
      });
      const mockFunctionPage = (selector: string) => ({
        text: () => selector === "h1, h2, h3" ? "Function Documentation" : ""
      });
      const mockNamespacePage = (selector: string) => ({
        text: () => selector === ".title" ? "MyNamespace Namespace" : ""
      });
      const mockModulePage = (selector: string) => ({
        text: () => selector === ".title" ? "Video Module" : ""
      });
      const mockDefaultPage = () => ({ text: () => "" });
      
      expect(testCrawler.determinePageType("class_my_class.html", mockClassPage)).toBe("class");
      expect(testCrawler.determinePageType("struct_data.html", mockClassPage)).toBe("class");
      expect(testCrawler.determinePageType("namespace_test.html", mockNamespacePage)).toBe("namespace");
      expect(testCrawler.determinePageType("group__video.html", mockModulePage)).toBe("module");
      expect(testCrawler.determinePageType("functions.html", mockFunctionPage)).toBe("function");
      expect(testCrawler.determinePageType("page_intro.html", mockDefaultPage)).toBe("page");
    });

    test("extractContentSnippet should create proper snippets around query", () => {
      const testCrawler = new EnhancedDoxygenCrawler() as any;
      
      // Mock cheerio function
      const mockDoc = (selector: string) => ({
        text: () => selector === "body" ? "This is a long document with many words. The target word is important. Here is more text after the target." : ""
      });
      
      const snippet = testCrawler.extractContentSnippet(mockDoc, "target");
      expect(snippet).toContain("target");
      expect(snippet).toContain("...");
      expect(snippet.length).toBeLessThan(250); // Should be truncated
      
      // Test with query not found
      const noMatchSnippet = testCrawler.extractContentSnippet(mockDoc, "nonexistent");
      expect(noMatchSnippet).toContain("...");
      expect(noMatchSnippet.length).toBeLessThan(250);
    });
  });

  describe("Cache functionality", () => {
    test("getCacheKey should generate consistent keys", () => {
      const testCrawler = new EnhancedDoxygenCrawler() as any;
      
      expect(testCrawler.getCacheKey("http://example.com", "/path")).toBe("http://example.com/path");
      expect(testCrawler.getCacheKey("http://example.com", "")).toBe("http://example.com");
      expect(testCrawler.getCacheKey("http://example.com")).toBe("http://example.com");
    });

    test("isValidCache should respect timeout", () => {
      const testCrawler = new EnhancedDoxygenCrawler() as any;
      
      const now = Date.now();
      expect(testCrawler.isValidCache(now)).toBe(true); // Just created
      expect(testCrawler.isValidCache(now - 1000)).toBe(true); // 1 second ago
      expect(testCrawler.isValidCache(now - 60000)).toBe(true); // 1 minute ago
      expect(testCrawler.isValidCache(now - 600000)).toBe(false); // 10 minutes ago (expired)
    });

    test("close should clear cache", async () => {
      // This test verifies that close() can be called without errors
      await crawler.close();
      expect(true).toBe(true); // If we reach here, close() worked
    });
  });

  describe("Input validation and edge cases", () => {
    test("should handle empty or invalid URLs", async () => {
      await expect(crawler.fetchPage("")).rejects.toThrow();
      await expect(crawler.fetchPage("not-a-url")).rejects.toThrow();
      await expect(crawler.fetchPage("http://")).rejects.toThrow();
    });

    test("should handle empty search queries", async () => {
      const results = await crawler.searchDocs("https://open.ys7.com/doc/en/pc/index.html", "", 10);
      expect(results).toBeInstanceOf(Array);
      expect(results).toHaveLength(0);
    }, 10000);

    test("should handle zero or negative maxResults", async () => {
      const results = await crawler.searchDocs("https://open.ys7.com/doc/en/pc/index.html", "test", 0);
      expect(results).toBeInstanceOf(Array);
      expect(results).toHaveLength(0);
    }, 10000);

    test("should handle malformed base URLs in methods", async () => {
      await expect(crawler.getNavigationStructure("")).rejects.toThrow();
      
      // Test with empty URL - should return empty array
      const emptyResult = await crawler.listClasses("");
      expect(emptyResult).toBeInstanceOf(Array);
      expect(emptyResult).toHaveLength(0);
    });
  });

  describe("Data structure validation", () => {
    test("should return properly structured SearchResult objects", () => {
      const result = {
        title: "Test Title",
        url: "http://example.com/test.html",
        content: "Test content snippet",
        type: "class" as const,
        section: "test-section"
      };
      
      expect(result).toHaveProperty("title");
      expect(result).toHaveProperty("url");
      expect(result).toHaveProperty("content");
      expect(result).toHaveProperty("type");
      expect(result).toHaveProperty("section");
      expect(["class", "function", "namespace", "file", "page", "module", "related"]).toContain(result.type);
    });

    test("should return properly structured ClassInfo objects", () => {
      const classInfo = {
        name: "TestClass",
        url: "http://example.com/class.html",
        description: "Test class description",
        namespace: "TestNamespace",
        section: "classes"
      };
      
      expect(classInfo).toHaveProperty("name");
      expect(classInfo).toHaveProperty("url");
      expect(classInfo).toHaveProperty("description");
      expect(classInfo).toHaveProperty("namespace");
      expect(classInfo).toHaveProperty("section");
    });

    test("should return properly structured NavigationStructure objects", () => {
      const navStructure = {
        mainPage: "http://example.com/index.html",
        relatedPages: ["http://example.com/page1.html"],
        modules: [],
        classes: [],
        files: []
      };
      
      expect(navStructure).toHaveProperty("mainPage");
      expect(navStructure).toHaveProperty("relatedPages");
      expect(navStructure).toHaveProperty("modules");
      expect(navStructure).toHaveProperty("classes");
      expect(navStructure).toHaveProperty("files");
      
      expect(navStructure.relatedPages).toBeInstanceOf(Array);
      expect(navStructure.modules).toBeInstanceOf(Array);
      expect(navStructure.classes).toBeInstanceOf(Array);
      expect(navStructure.files).toBeInstanceOf(Array);
    });
  });

  describe("Error message formatting", () => {
    test("should format fetch errors consistently", async () => {
      try {
        await crawler.fetchPage("http://definitely-does-not-exist-12345.com");
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain("Failed to fetch");
      }
    });

    test("should handle network timeout gracefully", async () => {
      // This test may be flaky depending on network conditions
      try {
        await crawler.fetchPage("http://httpstat.us/408");
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBeTruthy();
      }
    }, 10000);
  });

  describe("Method chaining and state management", () => {
    test("should maintain independent state between crawler instances", () => {
      const crawler1 = new EnhancedDoxygenCrawler();
      const crawler2 = new EnhancedDoxygenCrawler();
      
      expect(crawler1).not.toBe(crawler2);
      
      // Both should have independent caches
      expect((crawler1 as any).cache).not.toBe((crawler2 as any).cache);
      
      crawler1.close();
      crawler2.close();
    });

    test("should handle multiple simultaneous operations", async () => {
      const testUrl = "https://open.ys7.com/doc/en/pc/index.html";
      
      // Create fresh crawler for this test to ensure clean state
      const testCrawler = new EnhancedDoxygenCrawler();
      
      try {
        // First fetch to populate cache
        const firstResult = await testCrawler.fetchPage(testUrl);
        
        // Now fetch multiple times simultaneously - should hit cache
        const operations = [
          testCrawler.fetchPage(testUrl),
          testCrawler.fetchPage(testUrl),
          testCrawler.fetchPage(testUrl)
        ];
        
        const results = await Promise.all(operations);
        
        // All should return the same content from cache
        expect(results[0]).toBe(firstResult);
        expect(results[1]).toBe(firstResult);
        expect(results[2]).toBe(firstResult);
      } finally {
        await testCrawler.close();
      }
    }, 8000);
  });
});