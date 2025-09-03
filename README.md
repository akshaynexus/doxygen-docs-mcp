# Doxygen Documentation MCP Server

[![CI](https://github.com/akshaynexus/doxygen-docs-mcp/actions/workflows/test.yml/badge.svg)](https://github.com/akshaynexus/doxygen-docs-mcp/actions/workflows/test.yml)
[![codecov](https://codecov.io/gh/akshaynexus/doxygen-docs-mcp/branch/main/graph/badge.svg)](https://codecov.io/gh/akshaynexus/doxygen-docs-mcp)
[![TypeScript](https://img.shields.io/badge/TypeScript-4.9+-blue.svg)](#)
[![Bun](https://img.shields.io/badge/Bun-1.2+-orange.svg)](#)

A Model Context Protocol (MCP) server that enables AI agents to crawl and parse Doxygen documentation sites. This tool provides real-time access to API documentation for libraries and frameworks, making it easy for AI agents to get up-to-date information about less commonly used libraries.

## Features

- **Universal Doxygen Support**: Works with any standard Doxygen documentation site
- **Intelligent Caching**: HTTP response caching (5 minutes) and search index caching (30 minutes) for optimal performance
- **Comprehensive Parsing**: Extracts classes, functions, modules, files, and related pages
- **Full-Text Search**: Fast search functionality with content snippets and type categorization
- **Live Integration Testing**: All tests run against real documentation sites
- **TypeScript Support**: Full type safety with comprehensive interfaces
- **Performance Optimized**: Tests complete in ~10 seconds with full functionality

## Quick Start

### Installation

```bash
# Clone the repository
git clone https://github.com/akshaynexus/doxygen-docs-mcp.git
cd doxygen-docs-mcp

# Install dependencies
bun install
```

### Usage

#### As an MCP Server

```bash
# Start the MCP server (set base URL once)
bun run src/server.ts --baseUrl https://open.ys7.com/doc/en/pc
```

#### Programmatic Usage

```typescript
import { EnhancedDoxygenCrawler } from './src/enhanced-crawler';

const crawler = new EnhancedDoxygenCrawler();
const baseUrl = 'https://open.ys7.com/doc/en/pc';

// Search documentation
const results = await crawler.searchDocs(baseUrl, 'SDK', 10);

// List all classes
const classes = await crawler.listClasses(baseUrl);

// Get class details
const details = await crawler.getClassDetails(baseUrl, 'STREAM_TIME');

// Get page content
const content = await crawler.getPageContent(baseUrl, 'index.html');

// Get navigation structure
const structure = await crawler.getNavigationStructure(baseUrl);

// Clean up
await crawler.close();
```

## Supported Sites

This MCP server works with any standard Doxygen documentation site, including:

- **YS7 OpenSDK**: https://open.ys7.com/doc/en/pc (tested extensively)
- Any Doxygen-generated documentation with standard HTML structure
- Custom Doxygen themes (may require minor adjustments)

## Testing

The project includes comprehensive test suites:

```bash
# Run all tests
bun test

# Run specific test files
bun test tests/live.test.ts
bun test tests/mcp-server.test.ts
bun test tests/unit.test.ts
```

### Test Coverage

- **Live Integration Tests**: 24 tests against real documentation sites
- **MCP Server Tests**: 15+ tests simulating actual MCP server workflows  
- **Unit Tests**: 25+ tests for internal methods and edge cases
- **Performance Tests**: All tests complete in ~10 seconds

## API Tools

When running as an MCP server, the following tools are available:

### `search_docs`
Search through Doxygen documentation for specific content.

**Parameters:**
- `baseUrl` (string, optional): Base URL of the Doxygen site. If omitted, the server uses the value passed at startup via `--baseUrl`.
- `query` (string, required): Search term
- `maxResults` (number, optional): Maximum results to return (default: 10)

### `get_page_content`
Extract clean text content from a specific documentation page.

**Parameters:**
- `baseUrl` (string, optional): Base URL of the Doxygen site. If omitted, the server uses the value passed at startup via `--baseUrl`.
- `path` (string, required): Relative path to the page

### `list_classes`
List all classes found in the documentation.

**Parameters:**
- `baseUrl` (string, optional): Base URL of the Doxygen site. If omitted, the server uses the value passed at startup via `--baseUrl`.

### `get_class_details`
Get detailed information about a specific class.

**Parameters:**
- `baseUrl` (string, optional): Base URL of the Doxygen site. If omitted, the server uses the value passed at startup via `--baseUrl`.
- `className` (string, required): Name of the class

## Performance Features

- **HTTP Caching**: Responses cached for 5 minutes to avoid redundant requests
- **Search Index Caching**: Search indices cached for 30 minutes for fast subsequent searches
- **Efficient DOM Processing**: Optimized selectors and limited processing for speed
- **Concurrent Operations**: Supports multiple simultaneous requests

## Requirements

- **Bun**: v1.2.20 or higher
- **TypeScript**: v4.9 or higher
- **Network Access**: Required for crawling documentation sites

## Development

```bash
# Install dependencies
bun install

# One-off: Configure repo hooks (pre-commit runs TypeScript typecheck)
bun run setup:hooks
chmod +x githooks/pre-commit

# Run tests in watch mode
bun test --watch

# Build TypeScript
bun build src/server.ts

# Run with hot reload
bun --hot src/server.ts
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes
4. Run tests: `bun test`
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Documentation

For detailed API documentation, configuration options, and examples, see [docs.md](./docs.md).
