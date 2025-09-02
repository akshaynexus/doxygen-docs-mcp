# Doxygen Documentation MCP Server - Detailed Documentation

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [API Reference](#api-reference)
- [Configuration](#configuration)
- [MCP Integration](#mcp-integration)
- [Advanced Usage](#advanced-usage)
- [Performance Tuning](#performance-tuning)
- [Troubleshooting](#troubleshooting)
- [Examples](#examples)

## Overview

The Doxygen Documentation MCP Server is a specialized tool designed to bridge the gap between AI agents and Doxygen-generated documentation. It provides a standardized API through the Model Context Protocol (MCP) to crawl, parse, and search documentation sites in real-time.

### Key Benefits

- **Real-time Documentation Access**: No need to maintain outdated cached documentation
- **Universal Compatibility**: Works with any standard Doxygen site
- **Performance Optimized**: Intelligent caching reduces redundant requests
- **Type Safety**: Full TypeScript support with comprehensive interfaces
- **Live Testing**: All functionality tested against real documentation sites

## Architecture

### Core Components

```
┌─────────────────────────────────────────────────┐
│                MCP Server                       │
├─────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────────┐   │
│  │   Tool Router   │  │   Error Handler     │   │
│  └─────────────────┘  └─────────────────────┘   │
├─────────────────────────────────────────────────┤
│              Enhanced Crawler                   │
├─────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────────┐   │
│  │  HTTP Client    │  │   HTML Parser       │   │
│  │  (with cache)   │  │   (Cheerio)         │   │
│  └─────────────────┘  └─────────────────────┘   │
│  ┌─────────────────┐  ┌─────────────────────┐   │
│  │  Search Index   │  │   Type Extractors   │   │
│  │  (30min cache)  │  │   (Class/Method)    │   │
│  └─────────────────┘  └─────────────────────┘   │
└─────────────────────────────────────────────────┘
```

### Caching Strategy

The server implements a two-tier caching system:

1. **HTTP Response Cache** (5 minutes)
   - Caches raw HTML responses from documentation sites
   - Reduces network requests and improves response time
   - Automatically expires to ensure fresh content

2. **Search Index Cache** (30 minutes)
   - Caches processed search indices for fast lookups
   - Significantly improves search performance
   - Longer timeout as search structure changes infrequently

## API Reference

### Enhanced Crawler Class

The `EnhancedDoxygenCrawler` is the main class providing all crawling functionality.

#### Constructor

```typescript
const crawler = new EnhancedDoxygenCrawler();
```

No configuration required. The crawler is ready to use immediately.

#### Methods

##### `fetchPage(url: string): Promise<string>`

Fetches raw HTML content from a URL with caching.

**Parameters:**
- `url` (string): Full URL to fetch

**Returns:**
- Promise resolving to HTML content string

**Throws:**
- `Error` if URL is invalid or fetch fails

**Example:**
```typescript
const html = await crawler.fetchPage('https://open.ys7.com/doc/en/pc/index.html');
```

##### `getNavigationStructure(baseUrl: string): Promise<NavigationStructure>`

Extracts the complete navigation structure from a Doxygen site.

**Parameters:**
- `baseUrl` (string): Base URL of the documentation site

**Returns:**
```typescript
interface NavigationStructure {
  mainPage: string;
  relatedPages: string[];
  modules: ModuleInfo[];
  classes: ClassInfo[];
  files: FileInfo[];
}
```

**Example:**
```typescript
const structure = await crawler.getNavigationStructure('https://open.ys7.com/doc/en/pc');
console.log(`Found ${structure.classes.length} classes`);
```

##### `listClasses(baseUrl: string): Promise<ClassInfo[]>`

Lists all classes found in the documentation.

**Returns:**
```typescript
interface ClassInfo {
  name: string;
  url: string;
  description: string;
  namespace?: string;
  section: string;
}
```

**Example:**
```typescript
const classes = await crawler.listClasses(baseUrl);
const classNames = classes.map(c => c.name);
```

##### `getClassDetails(baseUrl: string, className: string): Promise<ClassDetails | null>`

Gets detailed information about a specific class.

**Parameters:**
- `baseUrl` (string): Base URL of the documentation site
- `className` (string): Name of the class (supports partial matching)

**Returns:**
```typescript
interface ClassDetails {
  name: string;
  url: string;
  description: string;
  methods: MethodInfo[];
  properties: PropertyInfo[];
  inheritance: {
    baseClasses: string[];
    derivedClasses: string[];
  };
  namespace?: string;
  section: string;
}
```

**Returns `null`** if class not found.

**Example:**
```typescript
const details = await crawler.getClassDetails(baseUrl, 'STREAM_TIME');
if (details) {
  console.log(`Found ${details.methods.length} methods`);
}
```

##### `searchDocs(baseUrl: string, query: string, maxResults: number): Promise<SearchResult[]>`

Searches through documentation for specific content.

**Parameters:**
- `baseUrl` (string): Base URL of the documentation site
- `query` (string): Search term (case-insensitive)
- `maxResults` (number): Maximum results to return

**Returns:**
```typescript
interface SearchResult {
  title: string;
  url: string;
  content: string;        // Content snippet around the match
  type: 'class' | 'function' | 'namespace' | 'file' | 'page' | 'module' | 'related';
  section: string;
}
```

**Example:**
```typescript
const results = await crawler.searchDocs(baseUrl, 'camera', 10);
results.forEach(result => {
  console.log(`${result.type}: ${result.title}`);
});
```

##### `getPageContent(baseUrl: string, path: string): Promise<string>`

Extracts clean text content from a documentation page.

**Parameters:**
- `baseUrl` (string): Base URL of the documentation site
- `path` (string): Relative path or full URL to the page

**Returns:**
- Promise resolving to clean text content (HTML tags removed)

**Example:**
```typescript
const content = await crawler.getPageContent(baseUrl, 'index.html');
// or with full URL
const content2 = await crawler.getPageContent(baseUrl, 'https://open.ys7.com/doc/en/pc/index.html');
```

##### `close(): Promise<void>`

Cleans up resources and clears caches.

**Example:**
```typescript
await crawler.close();
```

### Type Definitions

#### Complete Interface Definitions

```typescript
interface MethodInfo {
  name: string;
  signature: string;
  description: string;
  parameters: ParameterInfo[];
  returnType: string;
  visibility: 'public' | 'private' | 'protected';
  isStatic: boolean;
  isVirtual: boolean;
}

interface PropertyInfo {
  name: string;
  type: string;
  description: string;
  visibility: 'public' | 'private' | 'protected';
  isStatic: boolean;
  isConst: boolean;
}

interface ParameterInfo {
  name: string;
  type: string;
  description: string;
}

interface ModuleInfo {
  name: string;
  url: string;
  description: string;
  classes: string[];
  functions: string[];
}

interface FileInfo {
  name: string;
  url: string;
  description: string;
  path: string;
  classes: string[];
  functions: string[];
}

interface FunctionInfo {
  name: string;
  url: string;
  description: string;
  signature: string;
  parameters: ParameterInfo[];
  returnType: string;
}
```

## Configuration

### Environment Variables

The server can be configured using environment variables:

```bash
# Optional: Set cache timeouts (in milliseconds)
export DOXYGEN_HTTP_CACHE_TIMEOUT=300000    # 5 minutes (default)
export DOXYGEN_SEARCH_CACHE_TIMEOUT=1800000 # 30 minutes (default)

# Optional: Set request timeout
export DOXYGEN_REQUEST_TIMEOUT=10000        # 10 seconds (default)

# Optional: Enable debug logging
export DOXYGEN_DEBUG=true
```

### MCP Server Configuration

When using with Claude Desktop or other MCP clients, add to your configuration:

```json
{
  "mcpServers": {
    "doxygen-docs": {
      "command": "bun",
      "args": ["run", "src/server.ts"],
      "cwd": "/path/to/doxygen-docs-mcp"
    }
  }
}
```

## MCP Integration

### Available Tools

When running as an MCP server, the following tools are exposed:

#### 1. `search_docs`

**Description:** Search through Doxygen documentation for specific content

**Schema:**
```json
{
  "name": "search_docs",
  "description": "Search through Doxygen documentation for specific content",
  "inputSchema": {
    "type": "object",
    "properties": {
      "baseUrl": {
        "type": "string",
        "description": "Base URL of the Doxygen documentation site"
      },
      "query": {
        "type": "string", 
        "description": "Search term or phrase"
      },
      "maxResults": {
        "type": "number",
        "description": "Maximum number of results to return",
        "default": 10,
        "minimum": 1,
        "maximum": 50
      }
    },
    "required": ["baseUrl", "query"]
  }
}
```

#### 2. `get_page_content`

**Description:** Extract clean text content from a specific documentation page

**Schema:**
```json
{
  "name": "get_page_content",
  "description": "Extract clean text content from a specific documentation page",
  "inputSchema": {
    "type": "object",
    "properties": {
      "baseUrl": {
        "type": "string",
        "description": "Base URL of the Doxygen documentation site"
      },
      "path": {
        "type": "string",
        "description": "Relative path to the page (e.g., 'index.html', 'class_example.html')"
      }
    },
    "required": ["baseUrl", "path"]
  }
}
```

#### 3. `list_classes`

**Description:** List all classes found in the documentation

**Schema:**
```json
{
  "name": "list_classes",
  "description": "List all classes found in the Doxygen documentation",
  "inputSchema": {
    "type": "object",
    "properties": {
      "baseUrl": {
        "type": "string",
        "description": "Base URL of the Doxygen documentation site"
      }
    },
    "required": ["baseUrl"]
  }
}
```

#### 4. `get_class_details`

**Description:** Get detailed information about a specific class

**Schema:**
```json
{
  "name": "get_class_details", 
  "description": "Get detailed information about a specific class including methods and properties",
  "inputSchema": {
    "type": "object",
    "properties": {
      "baseUrl": {
        "type": "string",
        "description": "Base URL of the Doxygen documentation site"
      },
      "className": {
        "type": "string",
        "description": "Name of the class to get details for"
      }
    },
    "required": ["baseUrl", "className"]
  }
}
```

### Error Handling

All tools return standardized error responses:

```json
{
  "content": [
    {
      "type": "text", 
      "text": "Error: Detailed error message"
    }
  ],
  "isError": true
}
```

## Advanced Usage

### Custom Documentation Sites

The crawler can be extended to work with custom Doxygen themes:

```typescript
class CustomDoxygenCrawler extends EnhancedDoxygenCrawler {
  // Override methods for custom parsing logic
  protected extractClasses(html: string, baseUrl: string): ClassInfo[] {
    // Custom class extraction logic
    return super.extractClasses(html, baseUrl);
  }
}
```

### Batch Processing

Process multiple documentation sites:

```typescript
const sites = [
  'https://open.ys7.com/doc/en/pc',
  'https://example.com/docs',
  'https://another-site.com/api'
];

const crawler = new EnhancedDoxygenCrawler();

for (const site of sites) {
  try {
    const classes = await crawler.listClasses(site);
    console.log(`${site}: ${classes.length} classes found`);
  } catch (error) {
    console.error(`Failed to process ${site}:`, error.message);
  }
}

await crawler.close();
```

### Performance Monitoring

Monitor crawler performance:

```typescript
const crawler = new EnhancedDoxygenCrawler();

console.time('search');
const results = await crawler.searchDocs(baseUrl, 'query', 10);
console.timeEnd('search');

console.log(`Found ${results.length} results`);
```

## Performance Tuning

### Optimizing Search Performance

1. **Use Specific Queries**: More specific search terms return faster
2. **Limit Results**: Use appropriate `maxResults` values
3. **Cache Warmup**: Initial requests are slower due to index building

### Memory Management

```typescript
// Process large numbers of sites
for (const site of largeSiteList) {
  const crawler = new EnhancedDoxygenCrawler();
  
  try {
    await processSite(crawler, site);
  } finally {
    await crawler.close(); // Important: clean up resources
  }
}
```

### Concurrent Processing

```typescript
const crawler = new EnhancedDoxygenCrawler();

// Process multiple queries concurrently
const promises = [
  crawler.searchDocs(baseUrl, 'camera', 5),
  crawler.searchDocs(baseUrl, 'video', 5),
  crawler.searchDocs(baseUrl, 'audio', 5)
];

const results = await Promise.all(promises);
```

## Troubleshooting

### Common Issues

#### 1. "Failed to fetch" Errors

**Cause:** Network connectivity or invalid URLs

**Solution:**
```typescript
try {
  const content = await crawler.fetchPage(url);
} catch (error) {
  if (error.message.includes('Failed to fetch')) {
    console.log('Check network connectivity and URL validity');
  }
}
```

#### 2. Empty Results

**Cause:** Site structure differs from standard Doxygen layout

**Solution:**
- Check if site uses custom Doxygen theme
- Verify the site is actually Doxygen-generated
- Try with a known working site first

#### 3. Slow Performance

**Cause:** Network latency or large documentation sites

**Solutions:**
- Use smaller `maxResults` values
- Implement request timeouts
- Use more specific search queries

#### 4. Memory Issues

**Cause:** Processing many large sites without cleanup

**Solution:**
```typescript
// Always clean up
try {
  await processSites();
} finally {
  await crawler.close();
}
```

### Debug Mode

Enable debug logging:

```bash
export DOXYGEN_DEBUG=true
bun run src/server.ts
```

### Testing Connectivity

Test basic connectivity to a site:

```typescript
const crawler = new EnhancedDoxygenCrawler();

try {
  const html = await crawler.fetchPage('https://open.ys7.com/doc/en/pc/index.html');
  console.log('Connectivity OK');
  console.log(`Page size: ${html.length} bytes`);
} catch (error) {
  console.error('Connectivity failed:', error.message);
} finally {
  await crawler.close();
}
```

## Examples

### Example 1: Basic Documentation Search

```typescript
import { EnhancedDoxygenCrawler } from './src/enhanced-crawler';

async function searchDocumentation() {
  const crawler = new EnhancedDoxygenCrawler();
  const baseUrl = 'https://open.ys7.com/doc/en/pc';
  
  try {
    // Search for camera-related documentation
    const results = await crawler.searchDocs(baseUrl, 'camera', 10);
    
    console.log(`Found ${results.length} results for 'camera':`);
    results.forEach((result, index) => {
      console.log(`${index + 1}. [${result.type}] ${result.title}`);
      console.log(`   URL: ${result.url}`);
      console.log(`   Content: ${result.content.substring(0, 100)}...`);
      console.log();
    });
  } catch (error) {
    console.error('Search failed:', error.message);
  } finally {
    await crawler.close();
  }
}

searchDocumentation();
```

### Example 2: Class Analysis

```typescript
import { EnhancedDoxygenCrawler } from './src/enhanced-crawler';

async function analyzeClasses() {
  const crawler = new EnhancedDoxygenCrawler();
  const baseUrl = 'https://open.ys7.com/doc/en/pc';
  
  try {
    // Get all classes
    const classes = await crawler.listClasses(baseUrl);
    console.log(`Found ${classes.length} classes`);
    
    // Analyze time-related classes
    const timeClasses = classes.filter(c => 
      c.name.toLowerCase().includes('time') || 
      c.description.toLowerCase().includes('time')
    );
    
    console.log(`\\nTime-related classes (${timeClasses.length}):`);
    
    for (const cls of timeClasses.slice(0, 3)) { // Analyze first 3
      console.log(`\\n--- ${cls.name} ---`);
      
      const details = await crawler.getClassDetails(baseUrl, cls.name);
      if (details) {
        console.log(`Description: ${details.description}`);
        console.log(`Methods: ${details.methods.length}`);
        console.log(`Properties: ${details.properties.length}`);
        
        // Show properties
        if (details.properties.length > 0) {
          console.log('Properties:');
          details.properties.slice(0, 3).forEach(prop => {
            console.log(`  - ${prop.name}: ${prop.type}`);
          });
        }
      }
    }
  } catch (error) {
    console.error('Analysis failed:', error.message);
  } finally {
    await crawler.close();
  }
}

analyzeClasses();
```

### Example 3: Site Navigation

```typescript
import { EnhancedDoxygenCrawler } from './src/enhanced-crawler';

async function exploreNavigation() {
  const crawler = new EnhancedDoxygenCrawler();
  const baseUrl = 'https://open.ys7.com/doc/en/pc';
  
  try {
    const structure = await crawler.getNavigationStructure(baseUrl);
    
    console.log('=== Documentation Navigation Structure ===');
    console.log(`Main Page: ${structure.mainPage}`);
    console.log(`Related Pages: ${structure.relatedPages.length}`);
    console.log(`Modules: ${structure.modules.length}`);
    console.log(`Classes: ${structure.classes.length}`);
    console.log(`Files: ${structure.files.length}`);
    
    // Show first few items of each type
    if (structure.modules.length > 0) {
      console.log('\\n--- Modules ---');
      structure.modules.slice(0, 3).forEach(module => {
        console.log(`${module.name}: ${module.description}`);
      });
    }
    
    if (structure.classes.length > 0) {
      console.log('\\n--- Classes ---');
      structure.classes.slice(0, 5).forEach(cls => {
        console.log(`${cls.name}: ${cls.description.substring(0, 60)}...`);
      });
    }
    
    if (structure.files.length > 0) {
      console.log('\\n--- Files ---');
      structure.files.slice(0, 3).forEach(file => {
        console.log(`${file.name}: ${file.path}`);
      });
    }
  } catch (error) {
    console.error('Navigation exploration failed:', error.message);
  } finally {
    await crawler.close();
  }
}

exploreNavigation();
```

### Example 4: MCP Server Usage

```typescript
// This is how an AI agent would use the MCP server

// 1. Search for specific functionality
const searchResult = await mcpClient.callTool('search_docs', {
  baseUrl: 'https://open.ys7.com/doc/en/pc',
  query: 'streaming video',
  maxResults: 5
});

// 2. Get detailed information about a class
const classDetails = await mcpClient.callTool('get_class_details', {
  baseUrl: 'https://open.ys7.com/doc/en/pc',
  className: 'VideoStream'
});

// 3. Read specific documentation page
const pageContent = await mcpClient.callTool('get_page_content', {
  baseUrl: 'https://open.ys7.com/doc/en/pc', 
  path: 'index.html'
});

// 4. List all available classes for overview
const classList = await mcpClient.callTool('list_classes', {
  baseUrl: 'https://open.ys7.com/doc/en/pc'
});
```

### Example 5: Error Handling and Retries

```typescript
import { EnhancedDoxygenCrawler } from './src/enhanced-crawler';

async function robustCrawling() {
  const crawler = new EnhancedDoxygenCrawler();
  const baseUrl = 'https://open.ys7.com/doc/en/pc';
  
  async function withRetry<T>(
    operation: () => Promise<T>, 
    maxRetries: number = 3
  ): Promise<T> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await operation();
      } catch (error) {
        if (i === maxRetries - 1) throw error;
        console.log(`Attempt ${i + 1} failed, retrying...`);
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
    throw new Error('All retries failed');
  }
  
  try {
    // Robust search with retries
    const results = await withRetry(() => 
      crawler.searchDocs(baseUrl, 'camera', 10)
    );
    
    console.log(`Successfully found ${results.length} results`);
    
    // Process results with error handling
    for (const result of results) {
      try {
        if (result.type === 'class') {
          const details = await withRetry(() =>
            crawler.getClassDetails(baseUrl, result.title)
          );
          
          if (details) {
            console.log(`${result.title}: ${details.methods.length} methods`);
          }
        }
      } catch (error) {
        console.log(`Failed to get details for ${result.title}: ${error.message}`);
      }
    }
  } catch (error) {
    console.error('Robust crawling failed:', error.message);
  } finally {
    await crawler.close();
  }
}

robustCrawling();
```

## Best Practices

1. **Always Clean Up**: Call `crawler.close()` when done
2. **Handle Errors**: Network requests can fail, always use try/catch
3. **Use Appropriate Limits**: Don't request more results than needed
4. **Cache Awareness**: Subsequent requests to the same site are faster
5. **Specific Queries**: More specific search terms perform better
6. **Resource Management**: Create new crawlers for large batch processing

## Contributing

See the main [README.md](./README.md) for contribution guidelines.

For questions or support, please open an issue on the repository.