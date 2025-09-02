#!/usr/bin/env bun

// Test the MCP server functionality
import { DoxygenCrawler } from "./src/crawler.js";

async function testMCPFunctionality() {
  console.log("Testing MCP Server functionality...");
  
  const crawler = new DoxygenCrawler();
  
  try {
    console.log("\n=== Test 1: Search Documentation ===");
    const searchResults = await crawler.searchDocs(
      "https://open.ys7.com/doc/en/pc", 
      "stream", 
      5
    );
    console.log("Search Results:", JSON.stringify(searchResults, null, 2));
    
    console.log("\n=== Test 2: Get Page Content ===");
    const pageContent = await crawler.getPageContent(
      "https://open.ys7.com/doc/en/pc",
      "index.html"
    );
    console.log("Page Content Preview:", pageContent.substring(0, 300));
    
    console.log("\n=== Test 3: List Classes ===");
    const classes = await crawler.listClasses("https://open.ys7.com/doc/en/pc");
    console.log("Classes:", JSON.stringify(classes, null, 2));
    
    console.log("\n=== Test 4: Get Class Details ===");
    if (classes.length > 0) {
      const classDetails = await crawler.getClassDetails(
        "https://open.ys7.com/doc/en/pc",
        classes[1].name
      );
      console.log("Class Details:", JSON.stringify(classDetails, null, 2));
    }
    
  } catch (error) {
    console.error("Test failed:", error);
  } finally {
    await crawler.close();
  }
}

testMCPFunctionality().catch(console.error);