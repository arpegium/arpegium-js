/**
 * Parallel Runner
 * 
 * Handles parallel execution of middleware blocks.
 * Manages concurrent execution, trace aggregation, and result merging.
 */

import { MiddlewareContext, ITools } from '../types';
import { runSingleMiddleware } from './middleware-runner';
import { isParallelConfig, isConditionalConfig } from '../utils/flow-detector';

/**
 * Executes middlewares in parallel and merges results
 * @param middlewares Array of middlewares to execute in parallel
 * @param ctx Current execution context
 * @param registeredMiddlewares Map of registered middlewares
 * @param tools Execution tools
 * @param traceWithObservabilityFn Tracing function
 * @param runMiddlewares Function to run nested middleware arrays
 * @param runConditionalMiddleware Function to run conditional middlewares
 * @param parentSpan Parent span for tracing
 * @param level Execution level
 * @returns Updated context with merged parallel execution results
 */
export async function runParallelMiddlewares(
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
  const parallelTraces: any[] = [];
  const parallelGlobals: any[] = [];
  
  return await traceWithObservabilityFn(
    'parallel-block',
    async (parallelSpan: any) => {
      // Execute all middlewares concurrently
      await Promise.all(
        middlewares.map(async (middleware) => {
          // Create isolated context for each parallel execution
          const tempCtx = createIsolatedContext(ctx);
          
          // Execute based on middleware type
          await executeParallelMiddleware(
            middleware,
            tempCtx,
            registeredMiddlewares,
            tools,
            traceWithObservabilityFn,
            runMiddlewares,
            runConditionalMiddleware,
            parallelSpan,
            level
          );
          
          // Collect results from parallel execution
          parallelTraces.push(...(tempCtx.executionTrace || []));
          parallelGlobals.push(tempCtx.globals);
          
          // Preserve output if exists
          if (tempCtx.output) {
            parallelGlobals[parallelGlobals.length - 1].output = tempCtx.output;
          }
        })
      );
      
      // Add parallel block trace
      addParallelTrace(ctx, blockStart, level);
      
      // Merge parallel execution results
      mergeParallelResults(ctx, parallelTraces, parallelGlobals);
      
      return ctx;
    },
    parentSpan
  );
}

/**
 * Creates an isolated context for parallel execution
 * @param ctx Original context
 * @returns Isolated context copy
 */
function createIsolatedContext(ctx: MiddlewareContext): MiddlewareContext {
  return { 
    ...ctx, 
    globals: { ...ctx.globals },
    executionTrace: [],
    // Copy execution trace reference
    ...(ctx as any)._executionTrace && { _executionTrace: (ctx as any)._executionTrace }
  };
}

/**
 * Executes a single middleware within parallel context
 * @param middleware Middleware configuration
 * @param tempCtx Isolated context
 * @param registeredMiddlewares Map of registered middlewares
 * @param tools Execution tools
 * @param traceWithObservabilityFn Tracing function
 * @param runMiddlewares Function to run middleware arrays
 * @param runConditionalMiddleware Function to run conditionals
 * @param parallelSpan Parent span
 * @param level Execution level
 */
async function executeParallelMiddleware(
  middleware: any,
  tempCtx: MiddlewareContext,
  registeredMiddlewares: Map<string, any>,
  tools: ITools,
  traceWithObservabilityFn: any,
  runMiddlewares: Function,
  runConditionalMiddleware: Function,
  parallelSpan: any,
  level: number
): Promise<void> {
  if (Array.isArray(middleware)) {
    await runMiddlewares(middleware, tempCtx, tools, parallelSpan, false, level + 1);
  } else if (isParallelConfig(middleware)) {
    await runParallelMiddlewares(
      middleware.parallel, 
      tempCtx, 
      registeredMiddlewares,
      tools, 
      traceWithObservabilityFn,
      runMiddlewares,
      runConditionalMiddleware,
      parallelSpan, 
      level + 1
    );
  } else if (isConditionalConfig(middleware)) {
    await runConditionalMiddleware(middleware.conditional, tempCtx, tools, parallelSpan, level + 1);
  } else {
    const result = await runSingleMiddleware(
      middleware, 
      tempCtx, 
      registeredMiddlewares,
      tools, 
      traceWithObservabilityFn,
      parallelSpan, 
      level + 1, 
      "parallel"
    );
    // Update context with middleware result
    Object.assign(tempCtx, result.ctx);
  }
}

/**
 * Adds parallel block execution trace
 * @param ctx Context to update
 * @param blockStart Start time
 * @param level Execution level
 */
function addParallelTrace(ctx: MiddlewareContext, blockStart: number, level: number): void {
  if (ctx.executionTrace) {
    ctx.executionTrace.push({
      type: 'parallel',
      start: blockStart,
      end: Date.now(),
      duration: Date.now() - blockStart,
      level
    });
  }
}

/**
 * Merges results from parallel executions into main context
 * @param ctx Main context to update
 * @param parallelTraces Collected traces from parallel executions
 * @param parallelGlobals Collected globals from parallel executions
 */
function mergeParallelResults(
  ctx: MiddlewareContext, 
  parallelTraces: any[], 
  parallelGlobals: any[]
): void {
  // Merge all parallel traces
  if (ctx.executionTrace) {
    ctx.executionTrace.push(...parallelTraces);
  }

  // Merge globals from all parallel executions
  for (const globals of parallelGlobals) {
    Object.entries(globals).forEach(([key, value]) => {
      ctx.globals[key] = value;
    });
  }
  
  // Merge outputs if they exist
  for (const globals of parallelGlobals) {
    if (globals.output && Object.keys(globals.output).length > 0) {
      ctx.output = { ...ctx.output, ...globals.output };
    }
  }
}
