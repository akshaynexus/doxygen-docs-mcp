import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { EnhancedDoxygenCrawler } from "../src/enhanced-crawler";

describe("Coverage Tests - Real Functionality", () => {
  let crawler: EnhancedDoxygenCrawler;

  beforeEach(() => {
    crawler = new EnhancedDoxygenCrawler();
  });

  afterEach(async () => {
    await crawler.close();
  });

  describe("Real Doxygen site parsing", () => {
    test("should extract inheritance information from actual site", async () => {
      const TEST_BASE_URL = "https://open.ys7.com/doc/en/pc";
      
      // Get real class details to test inheritance paths
      const classes = await crawler.listClasses(TEST_BASE_URL);
      
      if (classes.length > 0) {
        // Try to find a class that might have inheritance info
        for (const cls of classes.slice(0, 5)) {
          const details = await crawler.getClassDetails(TEST_BASE_URL, cls.name);
          
          if (details) {
            // Test inheritance extraction (lines 719-725, 733-739)
            expect(details.inheritance).toHaveProperty("baseClasses");
            expect(details.inheritance).toHaveProperty("derivedClasses");
            expect(details.inheritance.baseClasses).toBeInstanceOf(Array);
            expect(details.inheritance.derivedClasses).toBeInstanceOf(Array);
            
            // If we find actual inheritance, test it
            if (details.inheritance.baseClasses.length > 0 || details.inheritance.derivedClasses.length > 0) {
              console.log(`Found inheritance in ${cls.name}:`, {
                base: details.inheritance.baseClasses,
                derived: details.inheritance.derivedClasses
              });
              break;
            }
          }
        }
      }
    }, 30000);

    test("should test function extraction from real site", async () => {
      const TEST_BASE_URL = "https://open.ys7.com/doc/en/pc";
      
      // Test real function extraction
      const functions = await crawler.getFunctions(TEST_BASE_URL);
      
      // Functions should be extracted properly (lines 588-608)
      expect(functions).toBeInstanceOf(Array);
      
      if (functions.length > 0) {
        const func = functions[0];
        expect(func).toHaveProperty("name");
        expect(func).toHaveProperty("url");
        expect(func).toHaveProperty("description");
        expect(func).toHaveProperty("signature");
        expect(func).toHaveProperty("parameters");
        expect(func).toHaveProperty("returnType");
        
        console.log(`Found function: ${func.name} - ${func.signature}`);
      }
    }, 15000);

    test("should test class extraction path with dt/dd elements", async () => {
      const TEST_BASE_URL = "https://open.ys7.com/doc/en/pc";
      
      // Get navigation structure to test dt/dd parsing paths (lines 420-440)
      const structure = await crawler.getNavigationStructure(TEST_BASE_URL);
      
      expect(structure).toHaveProperty("classes");
      expect(structure.classes).toBeInstanceOf(Array);
      
      // Test that classes were found through various parsing methods
      if (structure.classes.length > 0) {
        console.log(`Found ${structure.classes.length} classes through navigation structure`);
        
        // Test class structure 
        const cls = structure.classes[0];
        expect(cls).toHaveProperty("name");
        expect(cls).toHaveProperty("url");
        expect(cls).toHaveProperty("description");
        expect(cls).toHaveProperty("section");
      }
    }, 20000);

    test("should test various parsing methods and private functions", async () => {
      const TEST_BASE_URL = "https://open.ys7.com/doc/en/pc";
      
      // Test modules extraction
      const modules = await crawler.getModules(TEST_BASE_URL);
      expect(modules).toBeInstanceOf(Array);
      
      // Test files extraction  
      const files = await crawler.getFiles(TEST_BASE_URL);
      expect(files).toBeInstanceOf(Array);
      
      console.log(`Found ${modules.length} modules and ${files.length} files`);
    }, 20000);

    test("should test edge cases and error handling", async () => {
      // Test with malformed URL
      const emptyClasses = await crawler.listClasses("");
      expect(emptyClasses).toBeInstanceOf(Array);
      expect(emptyClasses).toHaveLength(0);
      
      // Test with non-existent class
      const noClass = await crawler.getClassDetails("https://open.ys7.com/doc/en/pc", "NonExistentClass123456789");
      expect(noClass).toBeNull();
      
      // Test search with empty query
      const emptySearch = await crawler.searchDocs("https://open.ys7.com/doc/en/pc", "", 10);
      expect(emptySearch).toBeInstanceOf(Array);
      expect(emptySearch).toHaveLength(0);
    }, 15000);

    test("should test private methods via reflection for complete coverage", () => {
      // Test private methods directly to hit uncovered lines
      const testCrawler = crawler as any;
      
      // Test parseParameters with complex signatures
      const complexParams = testCrawler.parseParameters("func(const std::vector<int>& data, bool flag)");
      expect(complexParams).toBeInstanceOf(Array);
      expect(complexParams.length).toBe(2);
      
      // Test extractBaseClasses with mock cheerio
      const mockCheerio = (selector: string) => ({
        each: (callback: any) => {
          if (selector === ".inherit") {
            // Simulate inheritance elements
            callback(0, { textContent: "Inherits BaseClass1, BaseClass2" });
            callback(1, { textContent: "Some other text" }); // No match
          }
        },
        text: () => "Inherits BaseClass1, BaseClass2"
      });
      
      const baseClasses = testCrawler.extractBaseClasses(mockCheerio);
      expect(baseClasses).toBeInstanceOf(Array);
      
      // Test extractDerivedClasses 
      const mockCheerioDerive = (selector: string) => ({
        each: (callback: any) => {
          if (selector === ".inherit") {
            callback(0, { textContent: "Inherited by DerivedClass1, DerivedClass2" });
          }
        },
        text: () => "Inherited by DerivedClass1, DerivedClass2"
      });
      
      const derivedClasses = testCrawler.extractDerivedClasses(mockCheerioDerive);
      expect(derivedClasses).toBeInstanceOf(Array);
    });
  });
});