import { Orchestrator } from '../index';
import { mockLogger, clearLoggerMocks } from './__mocks__';

describe('HTTP Request Error Details Tests', () => {
  let orchestrator: Orchestrator;
  const tools = { logger: mockLogger };

  beforeEach(() => {
    orchestrator = new Orchestrator();
    clearLoggerMocks();
  });

  test('should include request data in error when URL is missing', async () => {
    const flow = {
      name: "http-no-url-test",
      middlewares: [
        {
          type: "httpRequest",
          name: "MissingUrlRequest",
          options: {
            // No URL provided
            method: "GET",
            headers: {
              "Content-Type": "application/json"
            }
          }
        }
      ]
    };

    const input = { body: {}, headers: {}, env: {} };

    try {
      await orchestrator.runFlow(flow, input, tools);
      fail('Should have thrown an error');
    } catch (error: any) {
      expect(error.middlewareError).toBeDefined();
      expect(error.middlewareError.message).toBe("HTTP request middleware requires a URL in options");
      expect(error.middlewareError.requestData).toBeDefined();
      expect(error.middlewareError.requestData.options).toBeDefined();
      expect(error.middlewareError.requestData.availableOptions).toEqual(expect.arrayContaining(['method', 'headers']));
    }
  });

  test('should include request data in error when URL is not absolute', async () => {
    const flow = {
      name: "http-relative-url-test",
      middlewares: [
        {
          type: "httpRequest",
          name: "RelativeUrlRequest",
          options: {
            url: "/api/users", // Relative URL (invalid)
            method: "GET",
            headers: {
              "Authorization": "Bearer token123"
            },
            body: { userId: 123 }
          }
        }
      ]
    };

    const input = { body: {}, headers: {}, env: {} };

    try {
      await orchestrator.runFlow(flow, input, tools);
      fail('Should have thrown an error');
    } catch (error: any) {
      expect(error.middlewareError).toBeDefined();
      expect(error.middlewareError.message).toContain("HTTP request URL must be absolute");
      expect(error.middlewareError.requestData).toBeDefined();
      expect(error.middlewareError.requestData.originalUrl).toBe("/api/users");
      expect(error.middlewareError.requestData.interpolatedUrl).toBe("/api/users");
      expect(error.middlewareError.requestData.method).toBe("GET");
      expect(error.middlewareError.requestData.headers).toBeDefined();
      expect(error.middlewareError.requestData.body).toEqual({ userId: 123 });
    }
  });

  test('should include request data in network error', async () => {
    const flow = {
      name: "http-network-error-test",
      middlewares: [
        {
          type: "httpRequest",
          name: "NetworkErrorRequest",
          options: {
            url: "https://invalid-domain-that-definitely-does-not-exist.fake/api",
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": "Bearer {{token}}"
            },
            body: {
              data: "test",
              userId: "{{userId}}"
            }
          }
        }
      ]
    };

    const input = { 
      body: { userId: 456, token: "secret123" }, 
      headers: {}, 
      env: {} 
    };

    try {
      await orchestrator.runFlow(flow, input, tools);
      fail('Should have thrown an error');
    } catch (error: any) {
      expect(error.middlewareError).toBeDefined();
      expect(error.middlewareError.message).toContain("HTTP request failed:");
      expect(error.middlewareError.requestData).toBeDefined();
      expect(error.middlewareError.requestData.url).toBe("https://invalid-domain-that-definitely-does-not-exist.fake/api");
      expect(error.middlewareError.requestData.originalUrl).toBe("https://invalid-domain-that-definitely-does-not-exist.fake/api");
      expect(error.middlewareError.requestData.method).toBe("POST");
      expect(error.middlewareError.requestData.headers).toEqual({
        "Content-Type": "application/json",
        "Authorization": "Bearer secret123" // Should be interpolated
      });
      expect(error.middlewareError.requestData.body).toEqual({
        data: "test",
        userId: 456 // Should be interpolated
      });
      expect(error.middlewareError.requestData.originalHeaders).toBeDefined();
      expect(error.middlewareError.requestData.originalBody).toBeDefined();
      expect(error.middlewareError.networkError).toBeDefined();
    }
  });

  test('should include request data when HTTP status is not 200', async () => {
    const flow = {
      name: "http-status-error-test",
      middlewares: [
        {
          type: "httpRequest",
          name: "StatusErrorRequest",
          options: {
            url: "https://jsonplaceholder.typicode.com/posts/99999", // Returns 404 status for non-existent post
            method: "GET",
            headers: {
              "User-Agent": "Arpegium-Test"
            }
          }
        }
      ]
    };

    const input = { body: {}, headers: {}, env: {} };

    try {
      await orchestrator.runFlow(flow, input, tools);
      fail('Should have thrown an error');
    } catch (error: any) {
      expect(error.middlewareError).toBeDefined();
      expect(error.middlewareError.message).toContain("HTTP request failed with status 404");
      expect(error.middlewareError.requestData).toBeDefined();
      expect(error.middlewareError.requestData.url).toBe("https://jsonplaceholder.typicode.com/posts/99999");
      expect(error.middlewareError.requestData.method).toBe("GET");
      expect(error.middlewareError.requestData.headers).toEqual({
        "User-Agent": "Arpegium-Test"
      });
      expect(error.middlewareError.response).toBeDefined();
      expect(error.middlewareError.response.status).toBe(404);
    }
  });
});
