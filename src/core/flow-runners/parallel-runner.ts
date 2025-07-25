/**
 * Parallel Runner
 * 
 * Handles parallel execution of middleware blocks.
 * Manages concurrent execution, trace aggregation, and result merging.
 */

import { MiddlewareContext, ITools } from '../types';

// Counter to ensure unique parallel block names
let parallelCounter = 0;
import { runSingleMiddleware } from './middleware-runner';
import { isParallelConfig, isConditionalConfig, isSequenceConfig } from '../utils/flow-detector';

/**
 * Executes middlewares in parallel and merges results
 * @param middlewares Array of middlewares to execute in parallel
 * @param ctx Current execution context
 * @param registeredMiddlewares Map of registered middlewares
 * @param tools Execution tools
 * @param traceWithObservabilityFn Tracing function
 * @param runMiddlewares Function to run nested middleware arrays
 * @param runSequenceMiddlewares Function to run sequence middlewares
 * @param runConditionalMiddleware Function to run conditional middlewares
 * @param parentSpan Parent span for tracing
 * @param level Execution level
 * @param parentName Parent trace entry name for hierarchical display
 * @returns Updated context with merged parallel execution results
 */
export async function runParallelMiddlewares(
  middlewares: any[],
  ctx: MiddlewareContext,
  registeredMiddlewares: Map<string, any>,
  tools: ITools,
  traceWithObservabilityFn: any,
  runMiddlewares: Function,
  runSequenceMiddlewares: Function,
  runConditionalMiddleware: Function,
  parentSpan?: any,
  level: number = 0,
  parentName?: string
): Promise<MiddlewareContext> {
  const blockStart = Date.now();
  const parallelGlobals: any[] = [];
  const executionTrace = (ctx as any)._executionTrace;
  
  return await traceWithObservabilityFn(
    'parallel-block',
    async (parallelSpan: any) => {
      // Add parallel block entry to execution trace
      let traceEntry: any = null;
      if (executionTrace) {
        traceEntry = executionTrace.addEntry({
          name: `parallel-${Date.now()}-${++parallelCounter}`,
          type: 'parallel',
          status: 'running',
          parent: parentName,  // Use parentName parameter
          isControl: true,
          startedAt: blockStart
        });
        // Update context array to reflect changes
        ctx.executionTrace = executionTrace.getTrace();
      }

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
            runSequenceMiddlewares,
            runConditionalMiddleware,
            parallelSpan,
            level,
            traceEntry?.name  // Pass parallel block name as parent
          );
          
          // Collect results from parallel execution
          // Note: Execution trace is now handled by _executionTrace system
          parallelGlobals.push(tempCtx.globals);
          
          // Preserve output if exists
          if (tempCtx.output) {
            parallelGlobals[parallelGlobals.length - 1].output = tempCtx.output;
          }
        })
      );
      
      // Add parallel block trace
      addParallelTrace(ctx, blockStart, level);
      
      // Update parallel trace entry to success
      if (executionTrace && traceEntry) {
        executionTrace.updateEntry(traceEntry.name, {
          status: 'success',
          endedAt: Date.now()
        });
        ctx.executionTrace = executionTrace.getTrace();
      }
      
      // Merge parallel execution results
      mergeParallelResults(ctx, parallelGlobals);
      
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
    // Don't override executionTrace, let the middleware-runner handle it
    // Copy execution trace reference to ensure continuity
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
 * @param runSequenceMiddlewares Function to run sequence middlewares
 * @param runConditionalMiddleware Function to run conditionals
 * @param parallelSpan Parent span
 * @param level Execution level
 * @param parentName Name of parent parallel block
 */
async function executeParallelMiddleware(
  middleware: any,
  tempCtx: MiddlewareContext,
  registeredMiddlewares: Map<string, any>,
  tools: ITools,
  traceWithObservabilityFn: any,
  runMiddlewares: Function,
  runSequenceMiddlewares: Function,
  runConditionalMiddleware: Function,
  parallelSpan: any,
  level: number,
  parentName?: string
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
      runSequenceMiddlewares,
      runConditionalMiddleware,
      parallelSpan, 
      level + 1,
      parentName  // Pass parent name for proper trace hierarchy
    );
  } else if (isSequenceConfig(middleware)) {
    await runSequenceMiddlewares(
      middleware.sequence, 
      tempCtx, 
      registeredMiddlewares,
      tools, 
      traceWithObservabilityFn,
      runMiddlewares,
      runParallelMiddlewares,
      runConditionalMiddleware,
      parallelSpan, 
      level + 1,
      parentName  // Pass parent name for proper trace hierarchy
    );
  } else if (isConditionalConfig(middleware)) {
    await runConditionalMiddleware(
      middleware.conditional,
      tempCtx,
      tools,
      traceWithObservabilityFn,
      runMiddlewares,
      parallelSpan,
      level + 1,
      parentName  // Pass parent name for proper trace hierarchy
    );
  } else {
    const result = await runSingleMiddleware(
      middleware, 
      tempCtx, 
      registeredMiddlewares,
      tools, 
      traceWithObservabilityFn,
      parallelSpan, 
      level + 1, 
      parentName  // Pass parent parallel block name
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
  // Note: Execution trace is now handled by _executionTrace system
  // The parallel structure timing is managed at a higher level
}

/**
 * Merges results from parallel executions into main context
 * @param ctx Main context to update
 * @param parallelGlobals Collected globals from parallel executions
 */
function mergeParallelResults(
  ctx: MiddlewareContext, 
  parallelGlobals: any[]
): void {
  // Note: Execution traces are now managed by _executionTrace system

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
