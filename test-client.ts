#!/usr/bin/env bun

// Simple test to verify the crawler works without the full MCP setup
import { DoxygenCrawler } from "./src/crawler.js";

async function testCrawler() {
  console.log("Testing Doxygen Crawler...");
  
  const crawler = new DoxygenCrawler();
  
  try {
    // Test 1: Basic page fetch
    console.log("\n=== Testing page fetch ===");
    const content = await crawler.getPageContent("https://open.ys7.com/doc/en/pc", "index.html");
    console.log("Fetched page content length:", content.length);
    console.log("Preview:", content.substring(0, 200) + "...");
    
    // Test 2: Search functionality
    console.log("\n=== Testing search ===");
    const searchResults = await crawler.searchDocs("https://open.ys7.com/doc/en/pc", "camera", 3);
    console.log("Search results count:", searchResults.length);
    searchResults.forEach((result, i) => {
      console.log(`${i + 1}. ${result.title} (${result.type})`);
      console.log(`   URL: ${result.url}`);
      console.log(`   Content: ${result.content.substring(0, 100)}...`);
    });
    
    // Test 3: List classes
    console.log("\n=== Testing class listing ===");
    const classes = await crawler.listClasses("https://open.ys7.com/doc/en/pc");
    console.log("Found classes count:", classes.length);
    classes.slice(0, 5).forEach((cls, i) => {
      console.log(`${i + 1}. ${cls.name}`);
      console.log(`   URL: ${cls.url}`);
      console.log(`   Description: ${cls.description}`);
    });
    
  } catch (error) {
    console.error("Test failed:", error);
  } finally {
    await crawler.close();
  }
}

testCrawler().catch(console.error);