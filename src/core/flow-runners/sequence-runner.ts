/**
 * Sequence Runner
 * 
 * Handles sequential execution of middleware blocks.
 * Manages step-by-step execution with proper context flow.
 */

import { MiddlewareContext, ITools } from '../types';
import { runSingleMiddleware } from './middleware-runner';
import { isParallelConfig, isConditionalConfig, isSequenceConfig } from '../utils/flow-detector';
import { runParallelMiddlewares } from './parallel-runner';

/**
 * Executes middlewares in sequence, passing context between steps
 * @param middlewares Array of middlewares to execute sequentially
 * @param ctx Current execution context
 * @param registeredMiddlewares Map of registered middlewares
 * @param tools Execution tools
 * @param traceWithObservabilityFn Tracing function
 * @param runMiddlewares Function to run nested middleware arrays
 * @param runParallelMiddlewares Function to run parallel middlewares
 * @param runConditionalMiddleware Function to run conditional middlewares
 * @param parentSpan Parent span for tracing
 * @param level Execution level
 * @param parentName Parent trace entry name for hierarchical display
 * @returns Updated context after sequential execution
 */
export async function runSequenceMiddlewares(
  middlewares: any[],
  ctx: MiddlewareContext,
  registeredMiddlewares: Map<string, any>,
  tools: ITools,
  traceWithObservabilityFn: any,
  runMiddlewares: Function,
  runParallelMiddlewares: Function,
  runConditionalMiddleware: Function,
  parentSpan?: any,
  level: number = 0,
  parentName?: string
): Promise<MiddlewareContext> {
  const blockStart = Date.now();
  const executionTrace = (ctx as any)._executionTrace;
  
  return await traceWithObservabilityFn(
    'sequence-block',
    async (sequenceSpan: any) => {
      // Add sequence block entry to execution trace
      let traceEntry: any = null;
      if (executionTrace) {
        traceEntry = executionTrace.addEntry({
          name: `sequence-${Date.now()}`,
          type: 'sequence',
          status: 'running',
          parent: parentName,  // Use parentName parameter
          isControl: true,
          startedAt: blockStart
        });
        // Update context array to reflect changes
        ctx.executionTrace = executionTrace.getTrace();
      }

      // Execute middlewares one by one
      for (const middleware of middlewares) {
        await executeSequentialMiddleware(
          middleware,
          ctx,
          registeredMiddlewares,
          tools,
          traceWithObservabilityFn,
          runMiddlewares,
          runParallelMiddlewares,
          runConditionalMiddleware,
          sequenceSpan,
          level,
          traceEntry?.name  // Pass sequence block name as parent
        );
      }

      // Mark sequence block as completed
      if (executionTrace && traceEntry) {
        traceEntry.status = 'completed';
        traceEntry.endedAt = Date.now();
        traceEntry.duration = traceEntry.endedAt - traceEntry.startedAt;
        // Update context array to reflect changes
        ctx.executionTrace = executionTrace.getTrace();
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
 * @param runParallelMiddlewares Function to run parallel middlewares
 * @param runConditionalMiddleware Function to run conditionals
 * @param sequenceSpan Parent span
 * @param level Execution level
 * @param parentName Parent trace entry name for hierarchical display
 */
async function executeSequentialMiddleware(
  middleware: any,
  ctx: MiddlewareContext,
  registeredMiddlewares: Map<string, any>,
  tools: ITools,
  traceWithObservabilityFn: any,
  runMiddlewares: Function,
  runParallelMiddlewares: Function,
  runConditionalMiddleware: Function,
  sequenceSpan: any,
  level: number,
  parentName?: string
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
      runParallelMiddlewares,
      runConditionalMiddleware,
      sequenceSpan, 
      level + 1,
      parentName  // Pass sequence block name as parent
    );
  } else if (isSequenceConfig(middleware)) {
    // Execute nested sequence block within sequence
    await runSequenceMiddlewares(
      middleware.sequence, 
      ctx, 
      registeredMiddlewares,
      tools, 
      traceWithObservabilityFn,
      runMiddlewares,
      runParallelMiddlewares,
      runConditionalMiddleware,
      sequenceSpan, 
      level + 1
    );
  } else if (isConditionalConfig(middleware)) {
    // Execute conditional block within sequence
    await runConditionalMiddleware(
      middleware.conditional, 
      ctx, 
      tools, 
      traceWithObservabilityFn,
      runMiddlewares,
      sequenceSpan, 
      level + 1
    );
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
      parentName  // Pass parent name for hierarchical trace
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
  
  // Note: Execution trace is now handled by _executionTrace system
  // Update any other properties that might have been modified
  Object.keys(updatedCtx).forEach(key => {
    if (key !== 'globals' && key !== 'output' && key !== 'executionTrace') {
      (ctx as any)[key] = (updatedCtx as any)[key];
    }
  });
}

/**
 * Adds sequence execution trace to context
 * @param ctx Execution context
 * @param blockStart Start time
 * @param level Execution level
 */
function addSequenceTrace(ctx: MiddlewareContext, blockStart: number, level: number): void {
  // Note: Execution trace is now handled by _executionTrace system
  // The sequence structure timing is managed at a higher level
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
 * @param runParallelMiddlewares Parallel runner function
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
  runParallelMiddlewares: Function,
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
      runParallelMiddlewares,
      runConditionalMiddleware,
      parentSpan,
      level
    );
  }
  
  return ctx;
}
