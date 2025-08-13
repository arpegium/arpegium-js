/**
 * Retry Middleware with Sequence Flow Test
 * 
 * Tests the retry middleware with a sequence flow as the step to retry.
 */

import { Orchestrator } from "../core/orchestrator";
import { FlowDefinition, MiddlewareContext } from "../core/types";
import { createMiddleware } from "../middleware/base";

let counter = 0;

const counterMiddleware = createMiddleware(async (ctx, mw, tools) => {
  while (counter < 3) {
    counter++;
    ctx.globals.counterStep = `Attempt ${counter}`;
    tools?.logger?.info(`counter Middleware - ${ctx.globals.counterStep}`);
    return { ctx, status: 'failed' };
  }
  return { ctx, status: 'success' }
})

describe('Retry middleware with sequence flow', () => {
  test('Should execute a sequence within retry middleware', async () => {
    // Arrange
    const orchestrator = new Orchestrator();

    // Define a simple flow with a retry middleware that contains a sequence
    const flow: FlowDefinition = {
      name: "retry-sequence-test",
      middlewares: [
        {
          type: "retry",
          name: "RetrySequence",
          options: {
            maxAttempts: 3,
            interval: 0.001, // Small interval for faster tests
            backoffRate: 2,
            step: {
              sequence: [
                {
                  type: "mapper",
                  name: "FirstInSequence",
                  options: {
                    mapping: [
                      {
                        value: "executed",
                        to: "status"
                      }
                    ]
                  }
                },
                {
                  type: "mapper",
                  name: "SecondInSequence",
                  options: {
                    mapping: [{
                      value: "executed",
                      to: "status"
                    }]
                  }
                }
              ]
            }
          }
        },
        {
          type: "mapper",
          name: "FinalMapper",
          options: {
            output: true,
            mapping: [
              {
                origin: "globals",
                from: "SecondInSequence",
                to: "first"
              },
              {
                origin: "globals",
                from: "SecondInSequence",
                to: "second"
              },
            ]
          }
        }
      ]
    };

    // Act
    const result = await orchestrator.runFlow(flow, {}, {});

    // Assert
    expect(result).toBeDefined();
    expect(result.first.status).toBe("executed");
    expect(result.second.status).toBe("executed");
  });

  test('retry three times and fail', async () => {
    // Reset counter for this test
    counter = 0;

    const orchestrator = new Orchestrator();
    // Importante: registrar con el mismo nombre que se usa como "type" en el paso
    orchestrator.registerMiddleware('counter', counterMiddleware);

    const flow: FlowDefinition = {
      name: "retry-sequence-test",
      middlewares: [
        {
          type: "retry",
          name: "RetrySequence",
          options: {
            maxAttempts: 2, // Solo 2 intentos (insuficiente)
            interval: 0.001, // Small interval for faster tests
            backoffRate: 2,
            step: {
              sequence: [{
                type: "counter", // Ahora coincide con el nombre registrado
                name: "CounterMiddleware",
                options: {}
              }]
            }
          }
        },
        {
          type: "mapper",
          name: "FinalMapper",
          options: {
            output: true,
            mapping: [
              {
                origin: "globals",
                from: "customStep",
                to: "result"
              }
            ]
          }
        }
      ]
    };

    // Act & Assert
    try {
      counter = 0
      await orchestrator.runFlow(flow, {}, {
        logger: {
          info: jest.fn(),
          error: jest.fn(),
          debug: jest.fn(),
          warn: jest.fn()
        }
      });
      fail('Should have thrown an error');
    } catch (error) {
      expect(error).toBeDefined();
      expect(counter).toBe(2); // Debe haber intentado 2 veces
    }
  });
});

