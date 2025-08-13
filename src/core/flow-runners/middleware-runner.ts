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
      
      // Determinar el padre correcto: prioridad para currentParent (utilizado por retry)
      const actualParent = (ctx._internal && ctx._internal.currentParent) || parentName || null;
      
      // Add entry to execution trace
      if (executionTrace) {
        traceEntry = executionTrace.addEntry({
          name: config.name,
          type: config.type,
          status: "running",
          parent: actualParent,
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
        // Exception: mapper middleware handles its own interpolation to avoid double processing
        const interpolatedConfig = config.type === 'mapper' ? config : {
          ...config,
          options: interpolateOptions(config.options, ctx)
        };

        // Execute the middleware
        const result = await middleware(ctx, interpolatedConfig, tools, span);
        
        const end = Date.now();
        
        // Check if middleware failed
        if (result && result.status === "failed") {
          // Update trace - FAILED
          if (executionTrace && traceEntry) {
            executionTrace.updateEntry(config.name, {
              status: "failed",
              endedAt: end,
              error: result.error?.message || result.error || "Middleware execution failed",
              meta: result.meta // Incluir los metadatos del middleware
            });
            ctx.executionTrace = executionTrace.getTrace();
          }
          
          // Check if this middleware is blocking (default is true)
          const isBlocking = config.options?.blocking !== false;
          
          if (isBlocking) {
            // For blocking middlewares, throw an error to stop execution
            const errorMessage = result.error?.message || result.error || "Middleware validation failed";
            const error = new Error(errorMessage);
            
            // Include detailed middleware error information
            (error as any).middlewareError = result.error;
            (error as any).middlewareName = config.name;
            (error as any).middlewareType = config.type;
            
            // Si hay detalles específicos del error HTTP, incluirlos
            if (result.error?.requestData || result.error?.response) {
              (error as any).requestDetails = result.error.requestData || { hasBody: false };
              (error as any).responseDetails = result.error.response || {};
            }
            
            // Si hay detalles específicos del retry, incluirlos
            if (result.error?.retryContext) {
              (error as any).retryDetails = result.error.retryContext;
            }
            
            // Only add validationDetails for actual validation errors (from validator middleware)
            if (config.type === 'validator' || result.error?.type === "ValidationError") {
              // Clean and structure validation errors for easier consumption
              const cleanValidationErrors = result.error?.validationErrors?.map((err: any) => ({
                path: err.instancePath || 'root',
                message: err.message
              })) || [];
              
              (error as any).validationDetails = {
                type: result.error?.type || "ValidationError",
                code: result.error?.code || 422, // Default to 422 for validation errors
                message: errorMessage,
                errors: cleanValidationErrors,
                totalErrors: cleanValidationErrors.length,
                // Keep original for debugging if needed
                originalValidationErrors: result.error?.validationErrors || []
              };
            }
            
            throw error;
          } else {
            // For non-blocking middlewares, add to errors but continue
            if (!ctx.nonBlockingErrors) {
              ctx.nonBlockingErrors = [];
            }
            ctx.nonBlockingErrors.push({
              middleware: config.name,
              type: config.type,
              blocking: false,
              error: result.error?.message || result.error || "Middleware execution failed",
              level: level,
              timestamp: new Date().toISOString()
            });
          }
        } else {
          // Update trace - SUCCESS
          if (executionTrace && traceEntry) {
            executionTrace.updateEntry(config.name, {
              status: "success",
              endedAt: end,
              meta: result.meta // Incluir los metadatos del middleware
            });
            ctx.executionTrace = executionTrace.getTrace();
          }
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
