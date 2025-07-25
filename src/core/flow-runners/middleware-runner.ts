/**
 * Middleware Runner
 * 
 * Handles execution of individual middleware components.
 * Manages tracing, error handling, and context updates for single middleware execution.
 */

import { MiddlewareContext, ITools } from '../types';
import { interpolateOptions } from '../evaluators/interpolation-handler';

/**
 * Executes a single middleware with proper tracing and error handling
 * @param config Middleware configuration
 * @param ctx Current execution context
 * @param middlewares Registered middleware map
 * @param tools Execution tools (logger, tracer, etc.)
 * @param traceWithObservabilityFn Observability tracing function
 * @param parentSpan Parent span for tracing
 * @param level Execution level for debugging
 * @param parentName Parent context name for tracing
 * @returns Execution result with updated context
 */
export async function runSingleMiddleware(
  config: any,
  ctx: MiddlewareContext,
  middlewares: Map<string, any>,
  tools: ITools,
  traceWithObservabilityFn: any,
  parentSpan?: any,
  level: number = 0,
  parentName?: string
): Promise<{ ctx: MiddlewareContext; result?: any; stopExecution?: boolean }> {
  const start = Date.now();
  const executionTrace = (ctx as any)._executionTrace;
  
  return await traceWithObservabilityFn(
    `middleware-${config.type}-${config.name}`,
    async (span: any) => {
      let traceEntry;
      
      // Add entry to execution trace
      if (executionTrace) {
        traceEntry = executionTrace.addEntry({
          name: config.name,
          type: config.type,
          status: "running",
          parent: parentName || null,
          startedAt: start
        });
        // Update context array to reflect changes
        ctx.executionTrace = executionTrace.getTrace();
      }

      try {
        const middleware = middlewares.get(config.type);
        if (!middleware) {
          throw new Error(`Middleware type '${config.type}' not found`);
        }

        // Interpolate middleware options with current context
        const interpolatedConfig = {
          ...config,
          options: interpolateOptions(config.options, ctx)
        };

        // Execute the middleware
        const result = await middleware(ctx, interpolatedConfig, tools, span);
        
        const end = Date.now();
        
        // Update trace - SUCCESS
        if (executionTrace && traceEntry) {
          executionTrace.updateEntry(config.name, {
            status: "success",
            endedAt: end
          });
          ctx.executionTrace = executionTrace.getTrace();
        }

        // Check if middleware requested execution to stop
        if (result && (result as any).stopExecution === true) {
          return { ctx: result.ctx, result, stopExecution: true };
        }

        // Middleware has already updated context correctly
        return { ctx, result };
        
      } catch (error) {
        const end = Date.now();
        
        // Update trace - ERROR
        if (executionTrace && traceEntry) {
          executionTrace.updateEntry(config.name, {
            status: "failed",
            endedAt: end,
            error: error instanceof Error ? error.message : String(error)
          });
          ctx.executionTrace = executionTrace.getTrace();
        }
        
        // Create detailed error information
        const errorInfo = {
          middleware: config.name,
          type: config.type,
          blocking: config.options?.blocking !== false,
          error: error instanceof Error ? error.message : String(error),
          level: level,
          timestamp: new Date().toISOString()
        };

        // Handle blocking vs non-blocking errors
        if (errorInfo.blocking) {
          throw error;
        } else {
          // Add to non-blocking errors collection
          if (!ctx.nonBlockingErrors) {
            ctx.nonBlockingErrors = [];
          }
          ctx.nonBlockingErrors.push(errorInfo);
          return { ctx };
        }
      }
    },
    parentSpan
  );
}
