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
});
