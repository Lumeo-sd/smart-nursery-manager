import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import puppeteer from 'puppeteer-core';

let browser = null;
let page = null;

const CHROME_URL = process.env.CHROME_URL || 'ws://localhost:9222';

async function getPage() {
  if (!browser) {
    browser = await puppeteer.connect({
      browserWSEndpoint: CHROME_URL,
      defaultViewport: null
    });
  }
  
  const pages = await browser.pages();
  page = pages.find(p => p.url().includes('localhost:3002')) || pages[0];
  
  if (!page) {
    throw new Error('No page found. Make sure PWA is running on localhost:3002');
  }
  
  return page;
}

const server = new Server(
  { name: 'browser-debug', version: '1.0.0' },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'evaluate_js',
        description: 'Execute JavaScript code in the PWA browser context and return the result',
        inputSchema: {
          type: 'object',
          properties: {
            code: { type: 'string', description: 'JavaScript code to execute' }
          },
          required: ['code']
        }
      },
      {
        name: 'get_page_info',
        description: 'Get current page URL and title',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      },
      {
        name: 'screenshot',
        description: 'Take a screenshot of the current page',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      },
      {
        name: 'console_logs',
        description: 'Get browser console logs from the PWA',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      }
    ]
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  try {
    const p = await getPage();
    
    switch (name) {
      case 'evaluate_js': {
        const result = await p.evaluate(async (code) => {
          try {
            const evalResult = eval(code);
            return { success: true, result: evalResult };
          } catch (e) {
            return { success: false, error: e.message };
          }
        }, args.code);
        
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      }
      
      case 'get_page_info': {
        const info = await p.evaluate(() => ({
          url: window.location.href,
          title: document.title,
          csrfToken: document.cookie.match(/csrf_token=([^;]+)/)?.[1] || 'not found'
        }));
        
        return { content: [{ type: 'text', text: JSON.stringify(info, null, 2) }] };
      }
      
      case 'screenshot': {
        const screenshot = await p.screenshot({ encoding: 'base64' });
        return { content: [{ type: 'text', text: `Screenshot saved (base64, ${screenshot.length} bytes)` }] };
      }
      
      case 'console_logs': {
        const logs = await p.evaluate(() => {
          return window.__debugLogs || [];
        });
        return { content: [{ type: 'text', text: JSON.stringify(logs, null, 2) }] };
      }
      
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return { 
      content: [{ type: 'text', text: `Error: ${error.message}` }],
      isError: true 
    };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
console.error('Browser Debug MCP server running...');
