import * as cheerio from "cheerio";

// Search index interfaces
interface PageIndex {
  url: string;
  title: string;
  content: string;
  type: "class" | "function" | "namespace" | "file" | "page" | "module" | "related";
  section: string;
  timestamp: number;
}

interface SearchIndex {
  pages: PageIndex[];
  timestamp: number;
  baseUrl: string;
}

export interface SearchResult {
  title: string;
  url: string;
  content: string;
  type: "class" | "function" | "namespace" | "file" | "page" | "module" | "related";
  section?: string;
}

export interface ClassInfo {
  name: string;
  url: string;
  description: string;
  namespace?: string;
  section?: string;
}

export interface ModuleInfo {
  name: string;
  url: string;
  description: string;
  classes: ClassInfo[];
  functions: FunctionInfo[];
}

export interface FunctionInfo {
  name: string;
  url: string;
  description: string;
  signature: string;
  parameters: ParameterInfo[];
  returnType: string;
}

export interface ParameterInfo {
  name: string;
  type: string;
  description: string;
}

export interface FileInfo {
  name: string;
  url: string;
  description: string;
  path: string;
  classes: ClassInfo[];
  functions: FunctionInfo[];
}

export interface NavigationStructure {
  mainPage: string;
  relatedPages: string[];
  modules: ModuleInfo[];
  classes: ClassInfo[];
  files: FileInfo[];
}

export interface ClassDetails extends ClassInfo {
  methods: Array<{
    name: string;
    description: string;
    parameters: string;
    returnType: string;
    visibility: "public" | "private" | "protected";
  }>;
  properties: Array<{
    name: string;
    type: string;
    description: string;
    visibility: "public" | "private" | "protected";
  }>;
  inheritance: {
    baseClasses: string[];
    derivedClasses: string[];
  };
}

export class EnhancedDoxygenCrawler {
  private cache = new Map<string, any>();
  private searchIndexCache = new Map<string, SearchIndex>();
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes
  private searchIndexTimeout = 30 * 60 * 1000; // 30 minutes for search index

  private getCacheKey(baseUrl: string, path: string = ""): string {
    return `${baseUrl}${path}`;
  }

  private isValidCache(timestamp: number): boolean {
    return Date.now() - timestamp < this.cacheTimeout;
  }

  private isValidSearchIndex(timestamp: number): boolean {
    return Date.now() - timestamp < this.searchIndexTimeout;
  }

  async fetchPage(url: string): Promise<string> {
    const cacheKey = url;
    const cached = this.cache.get(cacheKey);
    
    if (cached && this.isValidCache(cached.timestamp)) {
      return cached.content;
    }

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const content = await response.text();
      
      this.cache.set(cacheKey, {
        content,
        timestamp: Date.now(),
      });
      
      return content;
    } catch (error) {
      throw new Error(`Failed to fetch ${url}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async getNavigationStructure(baseUrl: string): Promise<NavigationStructure> {
    const indexContent = await this.fetchPage(`${baseUrl}/index.html`);
    const $ = cheerio.load(indexContent);
    
    const structure: NavigationStructure = {
      mainPage: `${baseUrl}/index.html`,
      relatedPages: [],
      modules: [],
      classes: [],
      files: [],
    };

    // Extract navigation links
    const navLinks = $(".tabs, .navpath, .nav, #navrow1, #navrow2");
    navLinks.find("a").each((_, element) => {
      const href = $(element).attr("href");
      const text = $(element).text().trim();
      
      if (href && !href.startsWith("#") && !href.startsWith("http")) {
        const fullUrl = `${baseUrl}/${href}`;
        
        if (text.toLowerCase().includes("related") || href.includes("pages")) {
          structure.relatedPages.push(fullUrl);
        }
      }
    });

    // Get modules
    try {
      structure.modules = await this.getModules(baseUrl);
    } catch (error) {
      console.warn("Failed to get modules:", error);
    }

    // Get classes
    try {
      structure.classes = await this.listClasses(baseUrl);
    } catch (error) {
      console.warn("Failed to get classes:", error);
    }

    // Get files
    try {
      structure.files = await this.getFiles(baseUrl);
    } catch (error) {
      console.warn("Failed to get files:", error);
    }

    return structure;
  }

  async getModules(baseUrl: string): Promise<ModuleInfo[]> {
    const modules: ModuleInfo[] = [];
    
    try {
      const content = await this.fetchPage(`${baseUrl}/modules.html`);
      const $ = cheerio.load(content);
      
      $("tr").each((_, element) => {
        const $row = $(element);
        const $link = $row.find("a");
        
        if ($link.length) {
          const href = $link.attr("href");
          const name = $link.text().trim();
          const description = $row.find("td").last().text().trim();
          
          if (href && name) {
            modules.push({
              name,
              url: `${baseUrl}/${href}`,
              description,
              classes: [],
              functions: [],
            });
          }
        }
      });
    } catch (error) {
      // modules.html might not exist
    }
    
    return modules;
  }

  async getFiles(baseUrl: string): Promise<FileInfo[]> {
    const files: FileInfo[] = [];
    
    try {
      const content = await this.fetchPage(`${baseUrl}/files.html`);
      const $ = cheerio.load(content);
      
      $("tr").each((_, element) => {
        const $row = $(element);
        const $link = $row.find("a");
        
        if ($link.length) {
          const href = $link.attr("href");
          const name = $link.text().trim();
          const description = $row.find("td").last().text().trim();
          
          if (href && name && href.endsWith(".html")) {
            files.push({
              name,
              url: `${baseUrl}/${href}`,
              description,
              path: name,
              classes: [],
              functions: [],
            });
          }
        }
      });
    } catch (error) {
      // files.html might not exist
    }
    
    return files;
  }

  private async buildSearchIndex(baseUrl: string): Promise<SearchIndex> {
    const cacheKey = `search_index_${baseUrl}`;
    const cachedIndex = this.searchIndexCache.get(cacheKey);
    
    if (cachedIndex && this.isValidSearchIndex(cachedIndex.timestamp)) {
      return cachedIndex;
    }

    const pages: PageIndex[] = [];
    const structure = await this.getNavigationStructure(baseUrl);
    
    // Build index with key pages only for performance
    const pagesToIndex = [
      { url: structure.mainPage, type: "page" as const, section: "main" },
      // Index first few classes and files for speed
      ...structure.classes.slice(0, 5).map(c => ({ url: c.url, type: "class" as const, section: "classes" })),
      ...structure.files.slice(0, 3).map(f => ({ url: f.url, type: "file" as const, section: "files" })),
      ...structure.modules.slice(0, 2).map(m => ({ url: m.url, type: "module" as const, section: "modules" })),
    ];

    // Process pages sequentially to avoid overwhelming server
    for (const page of pagesToIndex) {
      try {
        const pageContent = await this.fetchPage(page.url);
        const page$ = cheerio.load(pageContent);
        
        const title = page$("title").text() || page$("h1").first().text() || "Untitled";
        
        // Extract clean text content (limit to 800 chars for efficiency)
        page$("nav, .navpath, .footer, script, style, .tabs").remove();
        const textContent = page$("body").text().replace(/\s+/g, " ").trim().substring(0, 800);
        
        pages.push({
          url: page.url,
          title: title.trim(),
          content: textContent,
          type: page.type,
          section: page.section,
          timestamp: Date.now()
        });
      } catch (error) {
        // Skip failed pages silently for robustness
      }
    }

    const searchIndex: SearchIndex = {
      pages,
      timestamp: Date.now(),
      baseUrl
    };

    this.searchIndexCache.set(cacheKey, searchIndex);
    return searchIndex;
  }

  async searchDocs(baseUrl: string, query: string, maxResults: number = 10): Promise<SearchResult[]> {
    // Early return for empty query or invalid maxResults
    if (!query || maxResults <= 0) {
      return [];
    }
    
    // Use cached search index for much faster searches
    const searchIndex = await this.buildSearchIndex(baseUrl);
    const queryLower = query.toLowerCase();
    const results: SearchResult[] = [];
    
    // Search through the cached index
    for (const page of searchIndex.pages) {
      if (results.length >= maxResults) break;
      
      // Check if query matches title or content
      const titleMatch = page.title.toLowerCase().includes(queryLower);
      const contentMatch = page.content.toLowerCase().includes(queryLower);
      
      if (titleMatch || contentMatch) {
        // Create content snippet around the match
        const contentSnippet = this.createSnippetFromText(page.content, query);
        
        results.push({
          title: page.title,
          url: page.url,
          content: contentSnippet,
          type: page.type,
          section: page.section,
        });
      }
    }
    
    // Sort results by relevance (title matches first, then content matches)
    return results.sort((a, b) => {
      const aTitle = a.title.toLowerCase().includes(queryLower) ? 1 : 0;
      const bTitle = b.title.toLowerCase().includes(queryLower) ? 1 : 0;
      return bTitle - aTitle;
    });
  }

  async getPageContent(baseUrl: string, path: string): Promise<string> {
    const url = path.startsWith("http") ? path : `${baseUrl}/${path.replace(/^\//, "")}`;
    const content = await this.fetchPage(url);
    const $ = cheerio.load(content);
    
    // Extract main content, removing navigation and footers
    $("nav, .navpath, .footer, script, style, .tabs").remove();
    
    const mainContent = $(".contents, .textblock, .memitem, .memdoc, main, .documentation").first();
    if (mainContent.length) {
      return mainContent.text().trim();
    }
    
    // Fallback to body content
    return $("body").text().replace(/\s+/g, " ").trim();
  }

  async listClasses(baseUrl: string): Promise<ClassInfo[]> {
    // Return empty array for invalid URLs
    if (!baseUrl) {
      return [];
    }
    
    const classes: ClassInfo[] = [];
    
    // Try different class listing pages
    const possibleClassPages = [
      "annotated.html",
      "classes.html", 
      "hierarchy.html",
    ];
    
    for (const page of possibleClassPages) {
      try {
        const content = await this.fetchPage(`${baseUrl}/${page}`);
        const $ = cheerio.load(content);
        
        // Look for class links in tables and lists
        $("a[href*='class'], a[href*='struct'], a[href*='interface']").each((_, element) => {
          const $el = $(element);
          const href = $el.attr("href");
          const name = $el.text().trim();
          
          if (href && name && !classes.some(c => c.name === name)) {
            const url = href.startsWith("http") ? href : `${baseUrl}/${href}`;
            const description = $el.parent().find(".brief").text() || 
                              $el.closest("tr").find("td").last().text() ||
                              "";
            
            classes.push({
              name,
              url,
              description: description.trim(),
              section: page,
            });
          }
        });

        // Also look for entries in definition lists
        $("dt").each((_, element) => {
          const $dt = $(element);
          const $link = $dt.find("a");
          
          if ($link.length) {
            const href = $link.attr("href");
            const name = $link.text().trim();
            
            if (href && name && (href.includes("class") || href.includes("struct"))) {
              const url = href.startsWith("http") ? href : `${baseUrl}/${href}`;
              const description = $dt.next("dd").text().trim();
              
              if (!classes.some(c => c.name === name)) {
                classes.push({
                  name,
                  url,
                  description,
                  section: page,
                });
              }
            }
          }
        });
      } catch (error) {
        console.error(`Error processing ${page}:`, error);
      }
    }
    
    return classes;
  }

  async getClassDetails(baseUrl: string, className: string): Promise<ClassDetails | null> {
    const classes = await this.listClasses(baseUrl);
    const classInfo = classes.find(c => 
      c.name === className || 
      c.name.toLowerCase() === className.toLowerCase() ||
      c.name.includes(className)
    );
    
    if (!classInfo) {
      return null;
    }
    
    const content = await this.fetchPage(classInfo.url);
    const $ = cheerio.load(content);
    
    const methods: ClassDetails["methods"] = [];
    const properties: ClassDetails["properties"] = [];
    
    // Extract methods and properties (limit to first 15 for performance)
    $(".memitem").slice(0, 15).each((_, element) => {
      const $item = $(element);
      const $prototype = $item.find(".memproto");
      const $doc = $item.find(".memdoc");
      
      if ($prototype.length && $doc.length) {
        const prototypeText = $prototype.text().trim();
        const docText = $doc.text().trim();
        
        if (prototypeText.includes("(") && prototypeText.includes(")")) {
          // It's a method
          const name = this.extractMethodName(prototypeText);
          const visibility = this.extractVisibility(prototypeText);
          
          methods.push({
            name,
            description: docText,
            parameters: this.extractParameters(prototypeText),
            returnType: this.extractReturnType(prototypeText),
            visibility,
          });
        } else {
          // It's a property
          const name = this.extractPropertyName(prototypeText);
          const type = this.extractPropertyType(prototypeText);
          const visibility = this.extractVisibility(prototypeText);
          
          properties.push({
            name,
            type,
            description: docText,
            visibility,
          });
        }
      }
    });
    
    // Create sets once for efficient lookups
    const methodNames = new Set(methods.map(m => m.name));
    const propNames = new Set(properties.map(p => p.name));
    
    // Also check for member lists (limit to first 10 for performance)
    $(".memberdecls .memItemLeft, .memberdecls .memItemRight").slice(0, 10).each((_, element) => {
      const $el = $(element);
      const text = $el.text().trim();
      
      if (text) {
        if (text.includes("(") && text.includes(")")) {
          // Function/method
          const name = this.extractMethodName(text);
          if (name !== "unknown") {
            methods.push({
              name,
              description: $el.next().text().trim(),
              parameters: this.extractParameters(text),
              returnType: this.extractReturnType(text),
              visibility: this.extractVisibility(text),
            });
          }
        } else if (!text.includes("typedef") && !text.includes("#define")) {
          // Property/member variable
          const name = this.extractPropertyName(text);
          if (name !== "unknown") {
            properties.push({
              name,
              type: this.extractPropertyType(text),
              description: $el.next().text().trim(),
              visibility: this.extractVisibility(text),
            });
          }
        }
      }
    });
    
    const inheritance = {
      baseClasses: this.extractBaseClasses($),
      derivedClasses: this.extractDerivedClasses($),
    };
    
    return {
      ...classInfo,
      methods,
      properties,
      inheritance,
    };
  }

  async getFunctions(baseUrl: string): Promise<FunctionInfo[]> {
    // Check cache first
    const cacheKey = `functions_${baseUrl}`;
    const cached = this.cache.get(cacheKey);
    if (cached && this.isValidCache(cached.timestamp)) {
      return cached.data;
    }
    
    const functions: FunctionInfo[] = [];
    
    try {
      // Only check the main index page and functions page if it exists
      const indexContent = await this.fetchPage(`${baseUrl}/index.html`);
      const $ = cheerio.load(indexContent);
      
      // Look for direct function links in the index
      const functionLinks = $("a[href*='function']").toArray().slice(0, 3); // Limit to 3 for performance
      
      for (const link of functionLinks) {
        const href = $(link).attr('href');
        if (!href) {
          continue;
        }

        const functionUrl = href.startsWith('http') ? href : `${baseUrl}/${href}`;
        
        try {
          const funcContent = await this.fetchPage(functionUrl);
          const $func = cheerio.load(funcContent);
          
          // Extract function info from the page
          $func(".memitem").first().each((_, element) => {
            const $item = $func(element);
            const $prototype = $item.find(".memproto");
            const $doc = $item.find(".memdoc");
            
            if ($prototype.length) {
              const prototypeText = $prototype.text().trim();
              
              if (prototypeText.includes("(") && prototypeText.includes(")")) {
                const name = this.extractMethodName(prototypeText);
                if (name !== "unknown") {
                  functions.push({
                    name,
                    url: functionUrl,
                    description: $doc.text().trim(),
                    signature: prototypeText,
                    parameters: this.parseParameters(prototypeText),
                    returnType: this.extractReturnType(prototypeText),
                  });
                }
              }
            }
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.warn(`Failed to load function page ${functionUrl}: ${errorMessage}`);
          
          // If it's a network error, we might want to retry or fail differently
          if (errorMessage.includes('fetch') || errorMessage.includes('network')) {
            console.warn('Network error detected, this might indicate connectivity issues');
          }
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Failed to load function index for ${baseUrl}: ${errorMessage}`);
      
      // This is a more serious error - we couldn't even load the main page
      // In a production system, this might warrant different handling
      throw new Error(`Unable to access documentation at ${baseUrl}: ${errorMessage}`);
    }
    
    // Cache the results
    this.cache.set(cacheKey, {
      data: functions,
      timestamp: Date.now()
    });
    
    return functions;
  }

  private parseParameters(signature: string): ParameterInfo[] {
    const paramMatch = signature.match(/\((.*?)\)/);
    if (!paramMatch || !paramMatch[1]?.trim()) return [];
    
    const paramString = paramMatch[1];
    if (!paramString) return [];
    
    const params = paramString.split(",").map(p => p.trim());
    
    return params.map(param => {
      const parts = param.trim().split(/\s+/);
      const name = parts[parts.length - 1] || "unknown";
      const type = parts.slice(0, -1).join(" ") || "unknown";
      
      return {
        name,
        type,
        description: "", // Would need to parse docs for parameter descriptions
      };
    });
  }

  private determinePageType(url: string, $: cheerio.CheerioAPI): SearchResult["type"] {
    if (url.includes("class") || $(".title").text().includes("Class")) return "class";
    if (url.includes("namespace") || $(".title").text().includes("Namespace")) return "namespace";
    if (url.includes("module") || $(".title").text().includes("Module")) return "module";
    if (url.includes("file") || url.endsWith(".html") && $("code").length > 0) return "file";
    if ($("h1, h2, h3").text().toLowerCase().includes("function")) return "function";
    return "page";
  }

  private extractContentSnippet($: cheerio.CheerioAPI, query: string): string {
    const text = $("body").text();
    const queryIndex = text.toLowerCase().indexOf(query.toLowerCase());
    
    if (queryIndex === -1) {
      return text.substring(0, 200).trim() + "...";
    }
    
    const start = Math.max(0, queryIndex - 100);
    const end = Math.min(text.length, queryIndex + query.length + 100);
    
    return "..." + text.substring(start, end).trim() + "...";
  }

  private extractMethodName(prototype: string): string {
    const match = prototype.match(/(\w+)\s*\(/);
    return match?.[1] || "unknown";
  }

  private extractPropertyName(prototype: string): string {
    const parts = prototype.trim().split(/\s+/);
    return parts[parts.length - 1] || "unknown";
  }

  private extractPropertyType(prototype: string): string {
    const parts = prototype.trim().split(/\s+/);
    return parts.slice(0, -1).join(" ") || "unknown";
  }

  private extractParameters(prototype: string): string {
    const match = prototype.match(/\((.*?)\)/);
    return match?.[1] || "";
  }

  private extractReturnType(prototype: string): string {
    const beforeParen = prototype.split("(")[0];
    if (!beforeParen) return "void";
    const parts = beforeParen.trim().split(/\s+/);
    return parts.slice(0, -1).join(" ") || "void";
  }

  private extractVisibility(prototype: string): "public" | "private" | "protected" {
    if (prototype.includes("private")) return "private";
    if (prototype.includes("protected")) return "protected";
    return "public";
  }

  private extractBaseClasses($: cheerio.CheerioAPI): string[] {
    const bases: string[] = [];
    $(".inherit").each((_, element) => {
      const text = $(element).text();
      if (text.includes("Inherits")) {
        const match = text.match(/Inherits\s+(.+)/);
        if (match?.[1]) {
          bases.push(...match[1].split(",").map(s => s.trim()));
        }
      }
    });
    return bases;
  }

  private extractDerivedClasses($: cheerio.CheerioAPI): string[] {
    const derived: string[] = [];
    $(".inherit").each((_, element) => {
      const text = $(element).text();
      if (text.includes("Inherited by")) {
        const match = text.match(/Inherited by\s+(.+)/);
        if (match?.[1]) {
          derived.push(...match[1].split(",").map(s => s.trim()));
        }
      }
    });
    return derived;
  }

  private createSnippetFromText(content: string, query: string): string {
    const queryLower = query.toLowerCase();
    const contentLower = content.toLowerCase();
    const queryIndex = contentLower.indexOf(queryLower);
    
    if (queryIndex === -1) {
      return content.substring(0, 200) + "...";
    }
    
    // Extract context around the match
    const start = Math.max(0, queryIndex - 100);
    const end = Math.min(content.length, queryIndex + query.length + 100);
    let snippet = content.substring(start, end);
    
    if (start > 0) snippet = "..." + snippet;
    if (end < content.length) snippet = snippet + "...";
    
    return snippet.trim();
  }

  async close(): Promise<void> {
    this.cache.clear();
    this.searchIndexCache.clear();
  }
}