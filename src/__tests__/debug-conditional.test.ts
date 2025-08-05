/**
 * Debug test for conditional in parallel
 */

import { Orchestrator } from '../core/orchestrator';
import { MiddlewareContext } from '../core/types';

describe('Debug Conditional in Parallel', () => {
  test('Simple conditional inside parallel', async () => {
    const orchestrator = new Orchestrator();
    
    orchestrator.registerMiddleware('test-middleware-1', async (ctx: MiddlewareContext) => {
      console.log('Middleware 1 executed');
      ctx.globals.test1 = 'executed';
      return ctx;
    });

    orchestrator.registerMiddleware('test-middleware-2', async (ctx: MiddlewareContext) => {
      console.log('Middleware 2 executed');
      ctx.globals.test2 = 'executed';
      return ctx;
    });

    const context = {
      input: {},
      globals: { condition: true }
    };

    const flow = {
      name: 'debug-conditional-parallel',
      middlewares: [
        {
          parallel: [
            { type: 'test-middleware-1' },
            {
              conditional: {
                if: "{{condition}} === true",
                then: [
                  { type: 'test-middleware-2' }
                ]
              }
            }
          ]
        }
      ]
    };

    const result = await orchestrator.execute(flow, context, {});
    
    console.log('Final result globals:', result.globals);
    
    expect(result.globals.test1).toBe('executed');
    expect(result.globals.test2).toBe('executed');
  });

  test('Complex conditional with null checks and logical operators', async () => {
    const orchestrator = new Orchestrator();
    
    orchestrator.registerMiddleware('test-null-check', async (ctx: MiddlewareContext) => {
      console.log('Null check middleware executed');
      ctx.globals.nullCheckExecuted = true;
      return ctx;
    });

    orchestrator.registerMiddleware('test-both-values', async (ctx: MiddlewareContext) => {
      console.log('Both values middleware executed');
      ctx.globals.bothValuesExecuted = true;
      return ctx;
    });

    // Test case 1: Both values are not null
    const contextWithValues = {
      input: {},
      globals: { 
        modeloResponse: {
          score: 85,
          decil: 7
        }
      }
    };

    const flowWithValues = {
      name: 'test-null-checks',
      middlewares: [
        {
          conditional: {
            if: "{{modeloResponse.score}} != null && {{modeloResponse.decil}} != null",
            then: [
              { type: 'test-both-values' }
            ],
            else: [
              { type: 'test-null-check' }
            ]
          }
        }
      ]
    };

    const resultWithValues = await orchestrator.execute(flowWithValues, contextWithValues, {});
    
    console.log('Result with values:', resultWithValues.globals);
    
    expect(resultWithValues.globals.bothValuesExecuted).toBe(true);
    expect(resultWithValues.globals.nullCheckExecuted).toBeUndefined();

    // Test case 2: One value is null
    const contextWithNull = {
      input: {},
      globals: { 
        modeloResponse: {
          score: 85,
          decil: null
        }
      }
    };

    const resultWithNull = await orchestrator.execute(flowWithValues, contextWithNull, {});
    
    console.log('Result with null:', resultWithNull.globals);
    
    expect(resultWithNull.globals.nullCheckExecuted).toBe(true);
    expect(resultWithNull.globals.bothValuesExecuted).toBeUndefined();

    // Test case 3: Both values are null
    const contextBothNull = {
      input: {},
      globals: { 
        modeloResponse: {
          score: null,
          decil: null
        }
      }
    };

    const resultBothNull = await orchestrator.execute(flowWithValues, contextBothNull, {});
    
    console.log('Result with both null:', resultBothNull.globals);
    
    expect(resultBothNull.globals.nullCheckExecuted).toBe(true);
    expect(resultBothNull.globals.bothValuesExecuted).toBeUndefined();

    // Test case 4: Missing properties (undefined)
    const contextMissing = {
      input: {},
      globals: { 
        modeloResponse: {}
      }
    };

    // Let's add some debug logging to understand what's happening
    orchestrator.registerMiddleware('debug-conditional', async (ctx: MiddlewareContext) => {
      console.log('Debug conditional - modeloResponse:', ctx.globals.modeloResponse);
      console.log('Debug conditional - score:', ctx.globals.modeloResponse?.score);
      console.log('Debug conditional - decil:', ctx.globals.modeloResponse?.decil);
      return ctx;
    });

    const flowWithDebug = {
      name: 'test-null-checks-debug',
      middlewares: [
        { type: 'debug-conditional' },
        {
          conditional: {
            if: "{{modeloResponse.score}} != null && {{modeloResponse.decil}} != null",
            then: [
              { type: 'test-both-values' }
            ],
            else: [
              { type: 'test-null-check' }
            ]
          }
        }
      ]
    };

    const resultMissing = await orchestrator.execute(flowWithDebug, contextMissing, {});
    
    console.log('Result with missing properties:', resultMissing.globals);
    
    expect(resultMissing.globals.nullCheckExecuted).toBe(true);
    expect(resultMissing.globals.bothValuesExecuted).toBeUndefined();
  });
});
