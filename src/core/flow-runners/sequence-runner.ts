/**
 * Sequence Runner
 * 
 * Handles sequential execution of middleware blocks.
 * Manages step-by-step execution with proper context flow.
 */

import { MiddlewareContext, ITools } from '../types';
import { runSingleMiddleware } from './middleware-runner';
import { isParallelConfig, isConditionalConfig } from '../utils/flow-detector';
import { runParallelMiddlewares } from './parallel-runner';

/**
 * Executes middlewares in sequence, passing context between steps
 * @param middlewares Array of middlewares to execute sequentially
 * @param ctx Current execution context
 * @param registeredMiddlewares Map of registered middlewares
 * @param tools Execution tools
 * @param traceWithObservabilityFn Tracing function
 * @param runMiddlewares Function to run nested middleware arrays
 * @param runConditionalMiddleware Function to run conditional middlewares
 * @param parentSpan Parent span for tracing
 * @param level Execution level
 * @returns Updated context after sequential execution
 */
export async function runSequenceMiddlewares(
  middlewares: any[],
  ctx: MiddlewareContext,
  registeredMiddlewares: Map<string, any>,
  tools: ITools,
  traceWithObservabilityFn: any,
  runMiddlewares: Function,
  runConditionalMiddleware: Function,
  parentSpan?: any,
  level: number = 0
): Promise<MiddlewareContext> {
  const blockStart = Date.now();
  
  return await traceWithObservabilityFn(
    'sequence-block',
    async (sequenceSpan: any) => {
      // Execute middlewares one by one
      for (const middleware of middlewares) {
        await executeSequentialMiddleware(
          middleware,
          ctx,
          registeredMiddlewares,
          tools,
          traceWithObservabilityFn,
          runMiddlewares,
          runConditionalMiddleware,
          sequenceSpan,
          level
        );
      }
      
      // Add sequence block trace
      addSequenceTrace(ctx, blockStart, level);
      
      return ctx;
    },
    parentSpan
  );
}

/**
 * Executes a single middleware within sequential context
 * @param middleware Middleware configuration
 * @param ctx Current context (updated in place)
 * @param registeredMiddlewares Map of registered middlewares
 * @param tools Execution tools
 * @param traceWithObservabilityFn Tracing function
 * @param runMiddlewares Function to run middleware arrays
 * @param runConditionalMiddleware Function to run conditionals
 * @param sequenceSpan Parent span
 * @param level Execution level
 */
async function executeSequentialMiddleware(
  middleware: any,
  ctx: MiddlewareContext,
  registeredMiddlewares: Map<string, any>,
  tools: ITools,
  traceWithObservabilityFn: any,
  runMiddlewares: Function,
  runConditionalMiddleware: Function,
  sequenceSpan: any,
  level: number
): Promise<void> {
  if (Array.isArray(middleware)) {
    // Execute nested middleware array sequentially
    await runMiddlewares(middleware, ctx, tools, sequenceSpan, false, level + 1);
  } else if (isParallelConfig(middleware)) {
    // Execute parallel block within sequence
    await runParallelMiddlewares(
      middleware.parallel, 
      ctx, 
      registeredMiddlewares,
      tools, 
      traceWithObservabilityFn,
      runMiddlewares,
      runConditionalMiddleware,
      sequenceSpan, 
      level + 1
    );
  } else if (isConditionalConfig(middleware)) {
    // Execute conditional block within sequence
    await runConditionalMiddleware(middleware.conditional, ctx, tools, sequenceSpan, level + 1);
  } else {
    // Execute single middleware and update context
    const result = await runSingleMiddleware(
      middleware, 
      ctx, 
      registeredMiddlewares,
      tools, 
      traceWithObservabilityFn,
      sequenceSpan, 
      level + 1, 
      "sequential"
    );
    
    // Update context with middleware result (in-place update for sequence)
    updateContextInPlace(ctx, result.ctx);
  }
}

/**
 * Updates context in place with middleware execution results
 * @param ctx Target context to update
 * @param updatedCtx Source context with updates
 */
function updateContextInPlace(ctx: MiddlewareContext, updatedCtx: MiddlewareContext): void {
  // Update globals
  Object.assign(ctx.globals, updatedCtx.globals);
  
  // Update output if it exists
  if (updatedCtx.output) {
    ctx.output = { ...ctx.output, ...updatedCtx.output };
  }
  
  // Update execution trace
  if (updatedCtx.executionTrace && ctx.executionTrace) {
    ctx.executionTrace.push(...updatedCtx.executionTrace);
  }
  
  // Update any other properties that might have been modified
  Object.keys(updatedCtx).forEach(key => {
    if (key !== 'globals' && key !== 'output' && key !== 'executionTrace') {
      (ctx as any)[key] = (updatedCtx as any)[key];
    }
  });
}

/**
 * Adds sequence block execution trace
 * @param ctx Context to update
 * @param blockStart Start time
 * @param level Execution level
 */
function addSequenceTrace(ctx: MiddlewareContext, blockStart: number, level: number): void {
  if (ctx.executionTrace) {
    ctx.executionTrace.push({
      type: 'sequence',
      start: blockStart,
      end: Date.now(),
      duration: Date.now() - blockStart,
      level
    });
  }
}

/**
 * Utility function to run a single middleware array in sequence
 * Used by the main orchestrator for standard array execution
 * @param middlewares Array of middlewares
 * @param ctx Execution context
 * @param registeredMiddlewares Registered middleware map
 * @param tools Execution tools
 * @param traceWithObservabilityFn Tracing function
 * @param runMiddlewares Main middleware runner function
 * @param runConditionalMiddleware Conditional runner function
 * @param parentSpan Parent tracing span
 * @param level Execution level
 * @returns Updated context
 */
export async function runMiddlewareArrayInSequence(
  middlewares: any[],
  ctx: MiddlewareContext,
  registeredMiddlewares: Map<string, any>,
  tools: ITools,
  traceWithObservabilityFn: any,
  runMiddlewares: Function,
  runConditionalMiddleware: Function,
  parentSpan?: any,
  level: number = 0
): Promise<MiddlewareContext> {
  // For regular arrays, just execute each middleware in order
  for (const middleware of middlewares) {
    await executeSequentialMiddleware(
      middleware,
      ctx,
      registeredMiddlewares,
      tools,
      traceWithObservabilityFn,
      runMiddlewares,
      runConditionalMiddleware,
      parentSpan,
      level
    );
  }
  
  return ctx;
}
