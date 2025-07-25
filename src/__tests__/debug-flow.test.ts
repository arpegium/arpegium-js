/**
 * Simple test to understand the flow structure
 */

import { Orchestrator } from '../core/orchestrator';
import { MiddlewareContext } from '../core/types';

describe('Flow Structure Debug', () => {
  test('Simple middleware execution', async () => {
    const orchestrator = new Orchestrator();
    
    orchestrator.registerMiddleware('test-middleware', async (ctx: MiddlewareContext) => {
      console.log('Context received:', JSON.stringify(ctx, null, 2));
      ctx.globals.testValue = 'executed';
      console.log('Context after modification:', JSON.stringify(ctx, null, 2));
      return ctx;
    });

    const flow = {
      name: 'simple-test',
      middlewares: [
        { type: 'test-middleware' }
      ]
    };

    const result = await orchestrator.runFlow(flow, {}, {});
    console.log('Result returned:', JSON.stringify(result, null, 2));
    
    expect(result).toBeDefined();
  });
});
