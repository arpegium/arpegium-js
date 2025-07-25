/**
 * Integration Tests for Complex Nested Flows
 * 
 * These tests validate that the framework can handle real-world complex flows
 * with multiple levels of nesting, conditional logic, and cross-references.
 */

import { Orchestrator } from '../index';
import * as fs from 'fs';
import * as path from 'path';

describe('Complex Flow Integration Tests', () => {
  let orchestrator: Orchestrator;
  let tools: any;

  beforeEach(() => {
    orchestrator = new Orchestrator();
    
    // Define function registry for the complex flow
    const functionRegistry = {
      // Basic utility functions 
      mockValue: (value: any, fallback: any) => value || fallback,
      getCurrentTimestamp: () => Date.now(),
      setStatus: (status: string) => status,
      mockPriority: () => Math.floor(Math.random() * 10),
      
      // Conditional logic for picking first defined value
      conditionalValue: (value1: any, value2: any, fallback: any = null) => {
        // Treat unresolved interpolations as undefined
        if (typeof value1 === 'string' && value1.startsWith('{{') && value1.endsWith('}}')) {
          value1 = undefined;
        }
        if (typeof value2 === 'string' && value2.startsWith('{{') && value2.endsWith('}}')) {
          value2 = undefined;
        }
        
        if (value1 !== null && value1 !== undefined && value1 !== '') return value1;
        if (value2 !== null && value2 !== undefined && value2 !== '') return value2;
        return fallback;
      },
    };
    
    // Define tools with function registry
    tools = {
      logger: console,
      functionRegistry
    };
  });

  describe('Production Complex Flow (flujo-complex.json)', () => {
    let flowConfig: any;

    beforeAll(() => {
      // Read the complex flow configuration
      const flowPath = path.join(__dirname, '../../flows', 'flujo-complex.json');
      flowConfig = JSON.parse(fs.readFileSync(flowPath, 'utf8'));
    });

    test('should handle high amount transfer with nested conditional paths', async () => {
      const input = {
        body: {
          userId: 'user123',
          amount: 5000,
          type: 'transfer' // Flow expects 'type', not 'transactionType'
        }
      };

      // Use runFlow() and check output content
      const result = await orchestrator.runFlow(flowConfig, input, tools);

      // Verify the flow executed successfully
      expect(result).toBeDefined();
      
      // Verify the final result contains expected fields from high amount transfer path
      expect(result.userId).toBe('user123');
      expect(result.amount).toBe(5000); // Amount comes as number from mockValue
      expect(result.transactionType).toBe('transfer'); // This comes from InputMapper mapping
      expect(result.status).toBe('success'); // Status is set to 'success' by mapper
      expect(result.riskStatus).toBe('BLOCKED'); // High amount process
      expect(result.blockReason).toBe('TRANSFER_BLOCKED'); // Transfer validation
    });

    test('should handle low amount payment with parallel else path', async () => {
      const input = {
        body: {
          userId: 'user456',
          amount: 500,
          type: 'payment' // Flow expects 'type', not 'transactionType'
        }
      };

      // Use runFlow() and check output content
      const result = await orchestrator.runFlow(flowConfig, input, tools);

      // Verify the flow executed successfully
      expect(result).toBeDefined();
      
      // Verify the final result contains expected fields from low amount path
      expect(result.userId).toBe('user456');
      expect(result.amount).toBe(500); // Amount comes as number from mockValue
      expect(result.transactionType).toBe('payment'); // This comes from InputMapper mapping
      expect(result.processType).toBe('FAST_TRACK'); // Low amount gets fast track
      expect(result.riskStatus).toBe('ACCEPTED'); // Low amount process
      expect(result.status).toBe('success'); // Status is set to 'success' by mapper
    });

    test('should handle high amount payment with different conditional branch', async () => {
      const input = {
        body: {
          userId: 'user789',
          amount: 7500,
          type: 'payment' // Flow expects 'type', not 'transactionType'
        }
      };

      // Use runFlow() and check output content
      const result = await orchestrator.runFlow(flowConfig, input, tools);

      // Verify the flow executed successfully
      expect(result).toBeDefined();
      
      // Verify the final result contains expected fields from high amount payment path
      expect(result.userId).toBe('user789');
      expect(result.amount).toBe(7500); // Amount comes as number from mockValue
      expect(result.transactionType).toBe('payment'); // This comes from InputMapper mapping
      expect(result.riskStatus).toBe('BLOCKED'); // High amount process
      expect(result.blockReason).toBe('PAYMENT_BLOCKED'); // Payment validation
      expect(result.status).toBe('success'); // Status is set to 'success' by mapper
    });

    test('should execute all required middlewares in complex nested flow', async () => {
      const testInput = {
        body: {
          amount: 1200,
          type: 'transfer', // Flow expects 'type', not 'transactionType'
          userId: 'integration-test'
        }
      };

      // Use runFlow() to execute the complete flow
      const result = await orchestrator.runFlow(flowConfig, testInput, tools);

      // Verify the flow executed successfully and produced a complete result
      expect(result).toBeDefined();
      expect(result.userId).toBeDefined();
      expect(result.amount).toBeDefined();
      expect(result.status).toBe('success'); // Status is set to 'success' by mapper
      
      // For high amounts (>1000), no processType is set (only for low amounts in FastTrack)
      // We should check riskStatus instead
      expect(result.riskStatus).toBe('BLOCKED'); // High amount process sets BLOCKED
    });
  });

  describe('Nested Flow Architecture Tests', () => {
    const testComplexNestedFlow = {
      "name": "complex-nested-test",
      "middlewares": [
        {
          "parallel": [
            {
              "sequence": [
                {
                  "parallel": [
                    { "type": "debug", "name": "Debug1", "options": { "message": "Parallel 1.1" }},
                    { "type": "debug", "name": "Debug2", "options": { "message": "Parallel 1.2" }}
                  ]
                },
                { "type": "debug", "name": "Debug3", "options": { "message": "After nested parallel" }}
              ]
            },
            {
              "conditional": {
                "if": "{{test}} === 'complex nesting'",
                "then": {
                  "sequence": [
                    { "type": "debug", "name": "Debug4", "options": { "message": "Conditional then sequence 1" }},
                    {
                      "parallel": [
                        { "type": "debug", "name": "Debug5", "options": { "message": "Conditional parallel 1" }},
                        { "type": "debug", "name": "Debug6", "options": { "message": "Conditional parallel 2" }}
                      ]
                    }
                  ]
                }
              }
            }
          ]
        }
      ]
    };

    test('should execute complex nested architecture: Parallel → Sequence → Conditional → Parallel', async () => {
      // Use runFlow() to execute the complete nested flow
      const result = await orchestrator.runFlow(testComplexNestedFlow, {
        test: "complex nesting"
      }, {});

      // For debug middlewares without output marker, result comes from the last valid middleware
      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
      
      // The flow should complete without errors, demonstrating successful nested architecture
      // Debug middleware returns timestamp and message, so we check for those
      expect(result.timestamp || result.message || result.point).toBeDefined();
    });

    test('should handle conditional with false condition gracefully', async () => {
      // Use runFlow() to execute flow with false conditional
      const result = await orchestrator.runFlow(testComplexNestedFlow, {
        test: "different value" // This should trigger the else branch (no execution)
      }, {});

      // The flow should complete successfully even with false conditional
      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
      
      // Should have a result from the parallel sequence branch that always executes
      expect(result.timestamp || result.message || result.point).toBeDefined();
    });
  });

  describe('Cross-Reference and Interpolation Tests', () => {
    test('should properly interpolate variables between nested middlewares', async () => {
      const crossRefFlow = {
        "name": "cross-reference-test",
        "middlewares": [
          {
            "type": "mapper",
            "name": "DataProvider",
            "options": {
              "mapping": [
                { "value": "test-value", "to": "sharedData" }
              ]
            }
          },
          {
            "type": "mapper", 
            "name": "DataConsumer",
            "options": {
              "mapping": [
                { "origin": "globals", "from": "DataProvider.sharedData", "to": "consumedData" }
              ],
              "output": true
            }
          }
        ]
      };

      // Use runFlow() to execute the cross-reference flow
      const result = await orchestrator.runFlow(crossRefFlow, {}, {});

      // Verify that cross-reference interpolation worked
      expect(result).toBeDefined();
      expect(result.consumedData).toBe('test-value');
    });
  });
});
