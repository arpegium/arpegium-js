import { Orchestrator } from '../index';
import { mockLogger, clearLoggerMocks } from './__mocks__';

describe('Blocking Middleware Tests', () => {
  let orchestrator: Orchestrator;
  const tools = { logger: mockLogger };

  beforeEach(() => {
    orchestrator = new Orchestrator();
    clearLoggerMocks();
  });

  describe('Validator Middleware Blocking', () => {
    test('should stop execution when validator fails with blocking: true (default)', async () => {
      const flow = {
        name: "validator-blocking-test",
        middlewares: [
          {
            type: "validator",
            name: "BlockingValidator",
            options: {
              schema: {
                type: "object",
                properties: {
                  requiredField: { type: "string" }
                },
                required: ["requiredField"]
              },
              origin: "body",
              blocking: true // Explicit, but this is the default
            }
          },
          {
            type: "mapper",
            name: "ShouldNotExecute",
            options: {
              output: true,
              mapping: [
                {
                  value: "THIS_SHOULD_NOT_APPEAR",
                  to: "status"
                }
              ]
            }
          }
        ]
      };

      const input = {
        body: {
          // Missing requiredField
          otherField: "value"
        },
        headers: {},
        env: {}
      };

      // Should throw an error and stop execution
      await expect(
        orchestrator.runFlow(flow, input, tools)
      ).rejects.toThrow('Validation failed');
    });

    test('should continue execution when validator fails with blocking: false', async () => {
      const flow = {
        name: "validator-non-blocking-test",
        middlewares: [
          {
            type: "validator",
            name: "NonBlockingValidator",
            options: {
              schema: {
                type: "object",
                properties: {
                  requiredField: { type: "string" }
                },
                required: ["requiredField"]
              },
              origin: "body",
              blocking: false // This allows continuation despite validation failure
            }
          },
          {
            type: "mapper",
            name: "ContinueAfterError",
            options: {
              output: true,
              mapping: [
                {
                  value: "EXECUTION_CONTINUED",
                  to: "status"
                }
              ]
            }
          }
        ]
      };

      const input = {
        body: {
          // Missing requiredField
          otherField: "value"
        },
        headers: {},
        env: {}
      };

      // Should NOT throw an error and continue execution
      const result = await orchestrator.runFlow(flow, input, tools);
      
      // Verify that execution continued to the mapper
      expect(result.status).toBe("EXECUTION_CONTINUED");
      
      // Verify that non-blocking errors were collected
      expect(result.nonBlockingErrors).toBeDefined();
      expect(result.nonBlockingErrors).toHaveLength(1);
      expect(result.nonBlockingErrors[0].middleware).toBe("NonBlockingValidator");
      expect(result.nonBlockingErrors[0].type).toBe("validator");
      expect(result.nonBlockingErrors[0].blocking).toBe(false);
    });

    test('should pass validation with blocking: false when data is valid', async () => {
      const flow = {
        name: "validator-non-blocking-success-test",
        middlewares: [
          {
            type: "validator",
            name: "NonBlockingValidator",
            options: {
              schema: {
                type: "object",
                properties: {
                  requiredField: { type: "string" }
                },
                required: ["requiredField"]
              },
              origin: "body",
              blocking: false
            }
          },
          {
            type: "mapper",
            name: "SuccessMapper",
            options: {
              output: true,
              mapping: [
                {
                  value: "VALIDATION_PASSED",
                  to: "status"
                }
              ]
            }
          }
        ]
      };

      const input = {
        body: {
          requiredField: "valid-value"
        },
        headers: {},
        env: {}
      };

      const result = await orchestrator.runFlow(flow, input, tools);
      
      // Should succeed and execute mapper
      expect(result.status).toBe("VALIDATION_PASSED");
      
      // Should not have any non-blocking errors
      expect(result.nonBlockingErrors).toBeUndefined();
    });
  });

  describe('HTTP Request Middleware Blocking', () => {
    test('should stop execution when HTTP request fails with blocking: true (default)', async () => {
      const flow = {
        name: "http-blocking-test",
        middlewares: [
          {
            type: "httpRequest",
            name: "BlockingHttpRequest",
            options: {
              url: "https://invalid-domain-that-does-not-exist.fake/api",
              method: "GET",
              blocking: true // Explicit, but this is the default
            }
          },
          {
            type: "mapper",
            name: "ShouldNotExecute",
            options: {
              output: true,
              mapping: [
                {
                  value: "THIS_SHOULD_NOT_APPEAR",
                  to: "status"
                }
              ]
            }
          }
        ]
      };

      const input = {
        body: {},
        headers: {},
        env: {}
      };

      // Should throw an error and stop execution
      await expect(
        orchestrator.runFlow(flow, input, tools)
      ).rejects.toThrow();
    });

    test('should continue execution when HTTP request fails with blocking: false', async () => {
      const flow = {
        name: "http-non-blocking-test",
        middlewares: [
          {
            type: "httpRequest",
            name: "NonBlockingHttpRequest",
            options: {
              url: "https://invalid-domain-that-does-not-exist.fake/api",
              method: "GET",
              blocking: false // This allows continuation despite HTTP failure
            }
          },
          {
            type: "mapper",
            name: "ContinueAfterError",
            options: {
              output: true,
              mapping: [
                {
                  value: "EXECUTION_CONTINUED_AFTER_HTTP_ERROR",
                  to: "status"
                }
              ]
            }
          }
        ]
      };

      const input = {
        body: {},
        headers: {},
        env: {}
      };

      // Should NOT throw an error and continue execution
      const result = await orchestrator.runFlow(flow, input, tools);
      
      // Verify that execution continued to the mapper
      expect(result.status).toBe("EXECUTION_CONTINUED_AFTER_HTTP_ERROR");
      
      // Verify that non-blocking errors were collected
      expect(result.nonBlockingErrors).toBeDefined();
      expect(result.nonBlockingErrors).toHaveLength(1);
      expect(result.nonBlockingErrors[0].middleware).toBe("NonBlockingHttpRequest");
      expect(result.nonBlockingErrors[0].type).toBe("httpRequest");
      expect(result.nonBlockingErrors[0].blocking).toBe(false);
    });

    test('should succeed with blocking: false when HTTP request is valid', async () => {
      const flow = {
        name: "http-non-blocking-success-test",
        middlewares: [
          {
            type: "httpRequest",
            name: "NonBlockingHttpRequest",
            options: {
              url: "https://jsonplaceholder.typicode.com/posts/1",
              method: "GET",
              blocking: false
            }
          },
          {
            type: "mapper",
            name: "SuccessMapper",
            options: {
              output: true,
              mapping: [
                {
                  origin: "globals",
                  from: "NonBlockingHttpRequest.title",
                  to: "postTitle"
                },
                {
                  value: "HTTP_SUCCESS",
                  to: "status"
                }
              ]
            }
          }
        ]
      };

      const input = {
        body: {},
        headers: {},
        env: {}
      };

      const result = await orchestrator.runFlow(flow, input, tools);
      
      // Should succeed and execute mapper
      expect(result.status).toBe("HTTP_SUCCESS");
      expect(result.postTitle).toBeDefined();
      
      // Should not have any non-blocking errors
      expect(result.nonBlockingErrors).toBeUndefined();
    });
  });

  describe('Mixed Blocking and Non-Blocking Middlewares', () => {
    test('should collect multiple non-blocking errors and continue execution', async () => {
      const flow = {
        name: "mixed-blocking-test",
        middlewares: [
          {
            type: "validator",
            name: "NonBlockingValidator1",
            options: {
              schema: {
                type: "object",
                properties: {
                  field1: { type: "string" }
                },
                required: ["field1"]
              },
              origin: "body",
              blocking: false
            }
          },
          {
            type: "validator",
            name: "NonBlockingValidator2",
            options: {
              schema: {
                type: "object",
                properties: {
                  field2: { type: "number" }
                },
                required: ["field2"]
              },
              origin: "body",
              blocking: false
            }
          },
          {
            type: "httpRequest",
            name: "NonBlockingHttpRequest",
            options: {
              url: "https://invalid-domain-that-does-not-exist.fake/api",
              method: "GET",
              blocking: false
            }
          },
          {
            type: "mapper",
            name: "FinalMapper",
            options: {
              output: true,
              mapping: [
                {
                  value: "ALL_ERRORS_COLLECTED",
                  to: "status"
                },
                {
                  value: 3,
                  to: "expectedErrorCount"
                }
              ]
            }
          }
        ]
      };

      const input = {
        body: {
          // Missing both field1 and field2 to trigger validation errors
          otherField: "value"
        },
        headers: {},
        env: {}
      };

      const result = await orchestrator.runFlow(flow, input, tools);
      
      // Verify that execution continued to the final mapper
      expect(result.status).toBe("ALL_ERRORS_COLLECTED");
      expect(result.expectedErrorCount).toBe(3);
      
      // Verify that all non-blocking errors were collected
      expect(result.nonBlockingErrors).toBeDefined();
      expect(result.nonBlockingErrors).toHaveLength(3);
      
      // Check each error
      const errorsByMiddleware = result.nonBlockingErrors.reduce((acc: any, error: any) => {
        acc[error.middleware] = error;
        return acc;
      }, {});
      
      expect(errorsByMiddleware['NonBlockingValidator1']).toBeDefined();
      expect(errorsByMiddleware['NonBlockingValidator1'].type).toBe('validator');
      expect(errorsByMiddleware['NonBlockingValidator1'].blocking).toBe(false);
      
      expect(errorsByMiddleware['NonBlockingValidator2']).toBeDefined();
      expect(errorsByMiddleware['NonBlockingValidator2'].type).toBe('validator');
      expect(errorsByMiddleware['NonBlockingValidator2'].blocking).toBe(false);
      
      expect(errorsByMiddleware['NonBlockingHttpRequest']).toBeDefined();
      expect(errorsByMiddleware['NonBlockingHttpRequest'].type).toBe('httpRequest');
      expect(errorsByMiddleware['NonBlockingHttpRequest'].blocking).toBe(false);
    });

    test('should stop at first blocking error even with previous non-blocking errors', async () => {
      const flow = {
        name: "mixed-blocking-stop-test",
        middlewares: [
          {
            type: "validator",
            name: "NonBlockingValidator",
            options: {
              schema: {
                type: "object",
                properties: {
                  field1: { type: "string" }
                },
                required: ["field1"]
              },
              origin: "body",
              blocking: false
            }
          },
          {
            type: "validator",
            name: "BlockingValidator",
            options: {
              schema: {
                type: "object",
                properties: {
                  field2: { type: "number" }
                },
                required: ["field2"]
              },
              origin: "body",
              blocking: true // This should stop execution
            }
          },
          {
            type: "mapper",
            name: "ShouldNotExecute",
            options: {
              output: true,
              mapping: [
                {
                  value: "THIS_SHOULD_NOT_APPEAR",
                  to: "status"
                }
              ]
            }
          }
        ]
      };

      const input = {
        body: {
          // Missing both field1 and field2
          otherField: "value"
        },
        headers: {},
        env: {}
      };

      // Should throw an error at the blocking validator
      await expect(
        orchestrator.runFlow(flow, input, tools)
      ).rejects.toThrow('Validation failed');
    });
  });
});
