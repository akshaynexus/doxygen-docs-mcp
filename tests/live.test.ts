import { test, expect, describe, beforeAll, afterAll } from "bun:test";
import { EnhancedDoxygenCrawler } from "../src/enhanced-crawler";

describe("Live Doxygen Site Integration Tests", () => {
  let crawler: EnhancedDoxygenCrawler;
  const TEST_BASE_URL = "https://open.ys7.com/doc/en/pc";

  beforeAll(() => {
    crawler = new EnhancedDoxygenCrawler();
  });

  afterAll(async () => {
    await crawler.close();
  });

  describe("fetchPage - Live HTTP requests", () => {
    test("should fetch the main index page", async () => {
      const content = await crawler.fetchPage(`${TEST_BASE_URL}/index.html`);
      
      expect(content).toContain("OPEN SDK");
      expect(content).toContain("Brief Introduction");
      expect(content.length).toBeGreaterThan(100);
    }, 10000);

    test("should handle invalid domain errors properly", async () => {
      await expect(
        crawler.fetchPage("https://definitely-does-not-exist-12345.com/page.html")
      ).rejects.toThrow(/Failed to fetch/);
    }, 10000);

    test("should cache responses", async () => {
      // Clear any existing cache first
      await crawler.close();
      crawler = new EnhancedDoxygenCrawler();
      
      const start1 = Date.now();
      await crawler.fetchPage(`${TEST_BASE_URL}/index.html`);
      const time1 = Date.now() - start1;

      const start2 = Date.now(); 
      await crawler.fetchPage(`${TEST_BASE_URL}/index.html`);
      const time2 = Date.now() - start2;

      // Second call should be faster (cached) or at least not slower
      expect(time2).toBeLessThanOrEqual(time1 + 10); // Allow 10ms tolerance
    }, 10000);
  });

  describe("getNavigationStructure - Live site analysis", () => {
    test("should extract complete navigation structure", async () => {
      const structure = await crawler.getNavigationStructure(TEST_BASE_URL);
      
      expect(structure.mainPage).toBe(`${TEST_BASE_URL}/index.html`);
      expect(structure.classes).toBeInstanceOf(Array);
      expect(structure.files).toBeInstanceOf(Array);
      expect(structure.modules).toBeInstanceOf(Array);
      
      // Should find at least some content
      const totalItems = structure.classes.length + structure.files.length + structure.modules.length;
      expect(totalItems).toBeGreaterThan(0);
    }, 15000);
  });

  describe("listClasses - Live class extraction", () => {
    test("should find actual classes in the documentation", async () => {
      const classes = await crawler.listClasses(TEST_BASE_URL);
      
      expect(classes).toBeInstanceOf(Array);
      expect(classes.length).toBeGreaterThan(0);
      
      // Verify class structure
      for (const cls of classes) {
        expect(cls).toHaveProperty("name");
        expect(cls).toHaveProperty("url");
        expect(cls).toHaveProperty("description");
        expect(cls.name).toMatch(/\w+/); // Should have actual names
        expect(cls.url).toMatch(/^https?:\/\//); // Should be full URLs
      }
      
      // Should find the known STREAM_TIME classes
      const streamTimeClasses = classes.filter(c => c.name.includes("STREAM_TIME"));
      expect(streamTimeClasses.length).toBeGreaterThan(0);
    }, 15000);

    test("should avoid duplicate class entries", async () => {
      const classes = await crawler.listClasses(TEST_BASE_URL);
      
      const classNames = classes.map(c => c.name);
      const uniqueNames = new Set(classNames);
      
      expect(uniqueNames.size).toBe(classNames.length);
    }, 15000);
  });

  describe("getClassDetails - Live class parsing", () => {
    test("should extract detailed information for STREAM_TIME", async () => {
      const details = await crawler.getClassDetails(TEST_BASE_URL, "STREAM_TIME");
      
      expect(details).not.toBeNull();
      expect(details!.name).toMatch(/STREAM_TIME/);
      expect(details!.url.toLowerCase()).toContain("s_t_r_e_a_m");
      
      // Should have properties (time fields)
      expect(details!.properties.length).toBeGreaterThan(0);
      
      // Check for expected time properties
      const propertyNames = details!.properties.map(p => p.name);
      const timeFields = propertyNames.filter(name => 
        name.toLowerCase().includes("year") || 
        name.toLowerCase().includes("month") || 
        name.toLowerCase().includes("day") ||
        name.toLowerCase().includes("hour") ||
        name.toLowerCase().includes("minute") ||
        name.toLowerCase().includes("second")
      );
      expect(timeFields.length).toBeGreaterThan(0);
      
      // Properties should have proper structure
      for (const prop of details!.properties) {
        expect(prop).toHaveProperty("name");
        expect(prop).toHaveProperty("type");
        expect(prop).toHaveProperty("description");
        expect(prop).toHaveProperty("visibility");
        expect(prop.name).toBeTruthy();
        expect(prop.type).toBeTruthy();
      }
    }, 15000);

    test("should return null for non-existent class", async () => {
      const details = await crawler.getClassDetails(TEST_BASE_URL, "NonExistentClass123456");
      expect(details).toBeNull();
    }, 10000);

    test("should find class by partial name match", async () => {
      const details = await crawler.getClassDetails(TEST_BASE_URL, "STREAM");
      expect(details).not.toBeNull();
      expect(details!.name).toMatch(/STREAM/i);
    }, 10000);
  });

  describe("getPageContent - Live content extraction", () => {
    test("should extract clean content from index page", async () => {
      const content = await crawler.getPageContent(TEST_BASE_URL, "index.html");
      
      expect(content).toContain("OPEN SDK");
      expect(content.length).toBeGreaterThan(50);
      
      // Should not contain HTML tags
      expect(content).not.toMatch(/<[^>]+>/);
      
      // Should contain version information
      expect(content).toMatch(/V\d+\.\d+\.\d+/);
    }, 10000);

    test("should handle absolute URLs", async () => {
      const fullUrl = `${TEST_BASE_URL}/index.html`;
      const content = await crawler.getPageContent(TEST_BASE_URL, fullUrl);
      
      expect(content).toContain("OPEN SDK");
    }, 10000);

    test("should extract content from class pages", async () => {
      const classes = await crawler.listClasses(TEST_BASE_URL);
      if (classes.length > 0) {
        const classUrl = classes[0].url.replace(TEST_BASE_URL + "/", "");
        const content = await crawler.getPageContent(TEST_BASE_URL, classUrl);
        
        expect(content.length).toBeGreaterThan(10);
        expect(content).not.toMatch(/<[^>]+>/);
      }
    }, 15000);
  });

  describe("searchDocs - Live search functionality", () => {
    test("should find results for 'SDK' search term", async () => {
      const results = await crawler.searchDocs(TEST_BASE_URL, "SDK", 10);
      
      expect(results).toBeInstanceOf(Array);
      expect(results.length).toBeGreaterThan(0);
      
      for (const result of results) {
        expect(result).toHaveProperty("title");
        expect(result).toHaveProperty("url");
        expect(result).toHaveProperty("content");
        expect(result).toHaveProperty("type");
        expect(result).toHaveProperty("section");
        
        expect(result.title).toBeTruthy();
        expect(result.url).toMatch(/^https?:\/\//);
        expect(result.content.toLowerCase()).toContain("sdk");
      }
    }, 20000);

    test("should respect maxResults parameter", async () => {
      const results = await crawler.searchDocs(TEST_BASE_URL, "SDK", 3);
      expect(results.length).toBeLessThanOrEqual(3);
    }, 15000);

    test("should categorize results by type and section", async () => {
      const results = await crawler.searchDocs(TEST_BASE_URL, "SDK", 5);
      
      if (results.length > 0) {
        const types = new Set(results.map(r => r.type));
        const sections = new Set(results.map(r => r.section).filter(s => s));
        
        expect(types.size).toBeGreaterThan(0);
        
        // Should have valid types
        for (const type of types) {
          expect(["class", "function", "namespace", "file", "page", "module", "related"]).toContain(type);
        }
      }
    }, 30000);

    test("should return empty array for non-existent search terms", async () => {
      const results = await crawler.searchDocs(TEST_BASE_URL, "xyznonexistentterm123", 2);
      expect(results).toHaveLength(0);
    }, 20000);
  });

  describe("getModules - Live module extraction", () => {
    test("should extract modules if they exist", async () => {
      const modules = await crawler.getModules(TEST_BASE_URL);
      
      expect(modules).toBeInstanceOf(Array);
      
      // If modules exist, they should have proper structure
      for (const module of modules) {
        expect(module).toHaveProperty("name");
        expect(module).toHaveProperty("url");
        expect(module).toHaveProperty("description");
        expect(module).toHaveProperty("classes");
        expect(module).toHaveProperty("functions");
        
        expect(module.name).toBeTruthy();
        expect(module.url).toMatch(/^https?:\/\//);
      }
    }, 10000);
  });

  describe("getFiles - Live file extraction", () => {
    test("should extract file listings", async () => {
      const files = await crawler.getFiles(TEST_BASE_URL);
      
      expect(files).toBeInstanceOf(Array);
      
      // If files exist, they should have proper structure
      for (const file of files) {
        expect(file).toHaveProperty("name");
        expect(file).toHaveProperty("url");
        expect(file).toHaveProperty("description");
        expect(file).toHaveProperty("path");
        expect(file).toHaveProperty("classes");
        expect(file).toHaveProperty("functions");
        
        expect(file.name).toBeTruthy();
        expect(file.url).toMatch(/^https?:\/\//);
        expect(file.path).toBeTruthy();
      }
    }, 10000);
  });

  describe("getFunctions - Live function extraction", () => {
    test("should extract functions from the documentation", async () => {
      const functions = await crawler.getFunctions(TEST_BASE_URL);
      
      expect(functions).toBeInstanceOf(Array);
      
      // If functions exist, they should have proper structure
      for (const func of functions.slice(0, 3)) {
        expect(func).toHaveProperty("name");
        expect(func).toHaveProperty("url");
        expect(func).toHaveProperty("description");
        expect(func).toHaveProperty("signature");
        expect(func).toHaveProperty("parameters");
        expect(func).toHaveProperty("returnType");
        
        expect(func.name).toBeTruthy();
        expect(func.url).toMatch(/^https?:\/\//);
        expect(func.parameters).toBeInstanceOf(Array);
      }
    }, 8000);
  });

  describe("Error handling with live site", () => {
    test("should handle malformed URLs gracefully", async () => {
      await expect(
        crawler.fetchPage("not-a-valid-url")
      ).rejects.toThrow();
    });

    test("should handle network timeouts", async () => {
      // Test with a very slow/non-responsive endpoint
      await expect(
        crawler.fetchPage("https://httpstat.us/408")
      ).rejects.toThrow();
    }, 15000);
  });

  describe("Integration with different Doxygen versions", () => {
    test("should work with the YS7 OpenSDK site structure", async () => {
      // This is a comprehensive integration test
      const structure = await crawler.getNavigationStructure(TEST_BASE_URL);
      const classes = await crawler.listClasses(TEST_BASE_URL);
      const searchResults = await crawler.searchDocs(TEST_BASE_URL, "OpenSDK", 5);
      
      expect(structure).toBeTruthy();
      expect(classes.length).toBeGreaterThan(0);
      expect(searchResults.length).toBeGreaterThan(0);
      
      // Try to get details for a real class
      if (classes.length > 0) {
        const classDetails = await crawler.getClassDetails(TEST_BASE_URL, classes[0].name);
        expect(classDetails).toBeTruthy();
      }
    }, 30000);
  });

  describe("Performance tests", () => {
    test("should complete basic operations within reasonable time", async () => {
      const start = Date.now();
      
      await crawler.fetchPage(`${TEST_BASE_URL}/index.html`);
      const classes = await crawler.listClasses(TEST_BASE_URL);
      await crawler.searchDocs(TEST_BASE_URL, "SDK", 3);
      
      const duration = Date.now() - start;
      
      // Should complete within 30 seconds
      expect(duration).toBeLessThan(30000);
      expect(classes.length).toBeGreaterThan(0);
    }, 35000);
  });

  describe("Data validation", () => {
    test("should return consistent data types across methods", async () => {
      const classes = await crawler.listClasses(TEST_BASE_URL);
      const structure = await crawler.getNavigationStructure(TEST_BASE_URL);
      const searchResults = await crawler.searchDocs(TEST_BASE_URL, "test", 3);
      
      // Validate array types
      expect(classes).toBeInstanceOf(Array);
      expect(structure.classes).toBeInstanceOf(Array);
      expect(structure.modules).toBeInstanceOf(Array);
      expect(structure.files).toBeInstanceOf(Array);
      expect(structure.relatedPages).toBeInstanceOf(Array);
      expect(searchResults).toBeInstanceOf(Array);
      
      // Validate string types
      expect(typeof structure.mainPage).toBe("string");
      
      // Validate object structures
      if (classes.length > 0) {
        const cls = classes[0];
        expect(typeof cls.name).toBe("string");
        expect(typeof cls.url).toBe("string");
        expect(typeof cls.description).toBe("string");
      }
    }, 20000);
  });
});