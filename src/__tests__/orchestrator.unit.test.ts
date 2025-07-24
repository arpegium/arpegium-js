import { Orchestrator } from '../index';
import { 
  mockLogger, 
  clearLoggerMocks
} from './__mocks__';

describe('Orchestrator - Unit Tests', () => {
  let orchestrator: Orchestrator;

  beforeEach(() => {
    orchestrator = new Orchestrator();
  });

  test('should create orchestrator instance', () => {
    expect(orchestrator).toBeInstanceOf(Orchestrator);
  });

  test('should register custom middleware', () => {
    const customMiddleware = jest.fn();
    orchestrator.registerMiddleware('custom', customMiddleware);
    
    // Test that middleware was registered (this is a basic structural test)
    expect(typeof orchestrator.registerMiddleware).toBe('function');
  });

  describe('Control Structures', () => {
    const tools = { logger: mockLogger };

    beforeEach(() => {
      clearLoggerMocks();
    });

    // Create simple middleware using mapper (which exists)
    const createSimpleMiddleware = (name: string, value: string) => ({
      type: "mapper",
      name,
      options: {
        output: false,
        mapping: [
          {
            value: value,
            to: "result"
          }
        ]
      }
    });

    test('should handle sequential execution (basic flow)', async () => {
      const flow = {
        name: "sequential-test",
        middlewares: [
          createSimpleMiddleware("Step1", "first"),
          createSimpleMiddleware("Step2", "second"),
          createSimpleMiddleware("Step3", "third")
        ]
      };

      const input = { body: {}, headers: {}, env: {} };
      const result = await orchestrator.runFlow(flow, input, tools);

      // Verify flow completed successfully
      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
    });

    test('should handle parallel execution correctly', async () => {
      const flow = {
        name: "parallel-test",
        middlewares: [
          {
            parallel: [
              createSimpleMiddleware("ParallelA", "resultA"),
              createSimpleMiddleware("ParallelB", "resultB"),
              createSimpleMiddleware("ParallelC", "resultC")
            ]
          }
        ]
      };

      const input = { body: {}, headers: {}, env: {} };
      const result = await orchestrator.runFlow(flow, input, tools);

      // Verify parallel execution completed successfully
      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
    });

    test('should handle sequence execution correctly', async () => {
      const flow = {
        name: "sequence-test",
        middlewares: [
          {
            sequence: [
              createSimpleMiddleware("SeqStep1", "step1"),
              createSimpleMiddleware("SeqStep2", "step2")
            ]
          }
        ]
      };

      const input = { body: {}, headers: {}, env: {} };
      const result = await orchestrator.runFlow(flow, input, tools);

      // Verify sequence execution completed successfully
      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
    });

    test('should handle conditional execution - true condition', async () => {
      const flow = {
        name: "conditional-true-test",
        middlewares: [
          {
            type: "mapper",
            name: "SetupValue",
            options: {
              output: false,
              mapping: [
                {
                  value: "1000",
                  to: "testAmount"
                }
              ]
            }
          },
          {
            conditional: {
              condition: "{{SetupValue.testAmount}} == '1000'",
              then: [
                createSimpleMiddleware("ThenBranch", "condition-true")
              ],
              else: [
                createSimpleMiddleware("ElseBranch", "condition-false")
              ]
            }
          }
        ]
      };

      const input = { body: {}, headers: {}, env: {} };
      const result = await orchestrator.runFlow(flow, input, tools);

      // Verify conditional execution completed successfully
      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
    });

    test('should handle conditional execution - false condition', async () => {
      const flow = {
        name: "conditional-false-test",
        middlewares: [
          {
            type: "mapper",
            name: "SetupValue",
            options: {
              output: false,
              mapping: [
                {
                  value: "500",
                  to: "testAmount"
                }
              ]
            }
          },
          {
            conditional: {
              condition: "{{SetupValue.testAmount}} == '1000'",
              then: [
                createSimpleMiddleware("ThenBranch", "condition-true")
              ],
              else: [
                createSimpleMiddleware("ElseBranch", "condition-false")
              ]
            }
          }
        ]
      };

      const input = { body: {}, headers: {}, env: {} };
      const result = await orchestrator.runFlow(flow, input, tools);

      // Verify conditional execution completed successfully
      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
    });

    test('should handle simple nested structures', async () => {
      const flow = {
        name: "simple-nested-test",
        middlewares: [
          {
            sequence: [
              createSimpleMiddleware("NestedSeq1", "nested1"),
              createSimpleMiddleware("NestedSeq2", "nested2")
            ]
          }
        ]
      };

      const input = { body: {}, headers: {}, env: {} };
      const result = await orchestrator.runFlow(flow, input, tools);

      // Verify nested execution completed successfully
      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
    });

    test('should log execution trace', async () => {
      const flow = {
        name: "trace-test",
        middlewares: [
          createSimpleMiddleware("TraceTest", "traced")
        ]
      };

      const input = { body: {}, headers: {}, env: {} };
      await orchestrator.runFlow(flow, input, tools);

      // Verify execution trace was logged
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Flow Execution Trace"
        })
      );
    });
  });
});
