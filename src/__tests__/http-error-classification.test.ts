import { Orchestrator } from "../core/orchestrator";

describe('HTTP Error Classification', () => {
  let orchestrator: Orchestrator;

  beforeEach(() => {
    orchestrator = new Orchestrator();
  });

  it('should not include validationDetails for HTTP errors', async () => {
    const flow = {
      name: "http-error-test",
      middlewares: [
        {
          type: "httpRequest",
          name: "FailingHttpRequest",
          options: {
            url: "http://invalid-domain-that-does-not-exist.com/test",
            method: "GET",
            blocking: true
          }
        }
      ]
    };

    const input = {
      body: {},
      pathParameters: {},
      headers: {}
    };

    const tools = { logger: console, functionRegistry: {} };

    try {
      await orchestrator.runFlow(flow, input, tools);
      fail('Expected an error to be thrown');
    } catch (error: any) {
      // Verify the error structure
      expect(error.middlewareName).toBe('FailingHttpRequest');
      expect(error.middlewareType).toBe('httpRequest');
      expect(error.middlewareError).toBeDefined();
      
      // Most importantly: HTTP errors should NOT have validationDetails
      expect(error.validationDetails).toBeUndefined();
      
      // Should have the HTTP error details
      expect(error.middlewareError.requestData).toBeDefined();
      expect(error.middlewareError.networkError).toBeDefined();
      expect(error.middlewareError.message).toContain('HTTP request failed');
    }
  });

  it('should include validationDetails only for validator errors', async () => {
    const flow = {
      name: "validation-error-test",
      middlewares: [
        {
          type: "validator",
          name: "EmailValidator",
          options: {
            origin: "body",
            schema: {
              type: "object",
              properties: {
                email: { type: "string", format: "email" }
              },
              required: ["email"]
            },
            blocking: true
          }
        }
      ]
    };

    const input = {
      body: { email: "invalid-email" }, // Invalid email format
      pathParameters: {},
      headers: {}
    };

    const tools = { logger: console, functionRegistry: {} };

    try {
      await orchestrator.runFlow(flow, input, tools);
      fail('Expected a validation error to be thrown');
    } catch (error: any) {
      // Verify the error structure
      expect(error.middlewareName).toBe('EmailValidator');
      expect(error.middlewareType).toBe('validator');
      expect(error.middlewareError).toBeDefined();
      
      // Validation errors SHOULD have validationDetails
      expect(error.validationDetails).toBeDefined();
      expect(error.validationDetails.type).toBe('ValidationError');
      expect(error.validationDetails.code).toBe(422);
      expect(error.validationDetails.errors).toBeDefined();
      expect(Array.isArray(error.validationDetails.errors)).toBe(true);
    }
  });

  it('should handle missing URL error without validationDetails', async () => {
    const flow = {
      name: "missing-url-test",
      middlewares: [
        {
          type: "httpRequest",
          name: "MissingUrlRequest",
          options: {
            // url is missing
            method: "GET",
            blocking: true
          }
        }
      ]
    };

    const input = {
      body: {},
      pathParameters: {},
      headers: {}
    };

    const tools = { logger: console, functionRegistry: {} };

    try {
      await orchestrator.runFlow(flow, input, tools);
      fail('Expected an error to be thrown');
    } catch (error: any) {
      // Verify the error structure
      expect(error.middlewareName).toBe('MissingUrlRequest');
      expect(error.middlewareType).toBe('httpRequest');
      expect(error.middlewareError).toBeDefined();
      
      // HTTP configuration errors should NOT have validationDetails
      expect(error.validationDetails).toBeUndefined();
      
      // Should have the HTTP error details
      expect(error.middlewareError.requestData).toBeDefined();
      expect(error.middlewareError.message).toContain('HTTP request middleware requires a URL');
    }
  });
});
