/**
 * Execute Step Module
 * 
 * Provides functionality to execute a single middleware step within a flow.
 * This is used primarily by the retry middleware to execute nested steps.
 */

import { MiddlewareContext, MiddlewareConfig, MiddlewareResult, ITools } from "../types";
import { runSingleMiddleware } from "./middleware-runner";
import { 
  isSequenceConfig,
  isParallelConfig,
  isConditionalConfig
} from '../utils';
import { runSequenceMiddlewares } from './sequence-runner';
import { runParallelMiddlewares } from './parallel-runner';
import { runConditionalMiddleware } from './conditional-runner';

/**
 * Create a function that can execute a single middleware step
 * This is used by middlewares like retry that need to execute other middlewares
 * 
 * @param middlewares Map of registered middlewares
 * @param tools Tools available for middleware execution
 * @param traceWithObservabilityFn Function for tracing execution
 * @param parentName Parent middleware name for tracing
 * @returns A function that can execute a middleware step
 */
export function createExecuteStepFunction(
  middlewares: Map<string, any>,
  tools: ITools,
  traceWithObservabilityFn: any,
  parentName?: string
) {
  return async (
    stepConfig: MiddlewareConfig,
    stepCtx: MiddlewareContext,
    stepTools: ITools,
    stepSpan?: any
  ): Promise<MiddlewareResult> => {
    try {
      let executeResult: any;
      
      // Obtener el padre actual de la estructura interna
      const actualParentName = (stepCtx._internal && stepCtx._internal.currentParent) || parentName;
      
      // Generar un nombre para la estructura si está dentro de un retry
      const generateStructureName = () => {
        if (stepCtx._internal && stepCtx._internal.currentParent) {
          // Si estamos dentro de un retry, dar un nombre a la estructura para mostrarla en el trace
          return `${stepCtx._internal.currentParent}_internal_step`;
        }
        return undefined;
      };
      
      // Detectar si el paso es una estructura de control y ejecutarla adecuadamente
      if (isSequenceConfig(stepConfig)) {
        // Es una secuencia
        const structureName = generateStructureName();
        const updatedCtx = await runSequenceMiddlewares(
          stepConfig.sequence || [],
          stepCtx,
          middlewares,
          stepTools,
          traceWithObservabilityFn,
          async (mws: any[], ctx: MiddlewareContext, tools: ITools, parentSpan?: any) => {
            for (const mw of mws) {
              const innerResult = await runSingleMiddleware(
                mw,
                ctx,
                middlewares,
                tools,
                traceWithObservabilityFn,
                parentSpan,
                0,
                actualParentName
              );
              ctx = innerResult.ctx;
            }
            return ctx;
          },
          runParallelMiddlewares,
          runConditionalMiddleware,
          stepSpan,
          0,
          parentName
        );
        
        executeResult = { 
          ctx: updatedCtx,
          result: { status: "success", ctx: updatedCtx }
        };
      } else if (isParallelConfig(stepConfig)) {
        // Es un paralelo
        const updatedCtx = await runParallelMiddlewares(
          stepConfig.parallel || [],
          stepCtx,
          middlewares,
          stepTools,
          traceWithObservabilityFn,
          async (mws: any[], ctx: MiddlewareContext, tools: ITools, parentSpan?: any) => {
            for (const mw of mws) {
              const innerResult = await runSingleMiddleware(
                mw,
                ctx,
                middlewares,
                tools,
                traceWithObservabilityFn,
                parentSpan,
                0,
                actualParentName
              );
              ctx = innerResult.ctx;
            }
            return ctx;
          },
          runSequenceMiddlewares,
          runConditionalMiddleware,
          stepSpan,
          0,
          parentName
        );
        
        executeResult = { 
          ctx: updatedCtx,
          result: { status: "success", ctx: updatedCtx }
        };
      } else if (isConditionalConfig(stepConfig)) {
        // Es un condicional
        const updatedCtx = await runConditionalMiddleware(
          stepConfig.conditional || {},
          stepCtx,
          stepTools,
          traceWithObservabilityFn,
          async (mws: any[], ctx: MiddlewareContext, tools: ITools, parentSpan?: any) => {
            for (const mw of mws) {
              const innerResult = await runSingleMiddleware(
                mw,
                ctx,
                middlewares,
                tools,
                traceWithObservabilityFn,
                parentSpan,
                0,
                actualParentName
              );
              ctx = innerResult.ctx;
            }
            return ctx;
          },
          stepSpan,
          0,
          parentName
        );
        
        executeResult = { 
          ctx: updatedCtx,
          result: { status: "success", ctx: updatedCtx }
        };
      } else {
        // Es un middleware normal
        executeResult = await runSingleMiddleware(
          stepConfig,
          stepCtx,
          middlewares,
          stepTools,
          traceWithObservabilityFn,
          stepSpan,
          0,
          parentName
        );
      }
      
      // Return the result in the format expected by the middleware
      if (executeResult.result && typeof executeResult.result === 'object' && 'status' in executeResult.result) {
        return executeResult.result as MiddlewareResult;
      }
      
      // If no specific result format is returned, create a standard one
      return { 
        ctx: executeResult.ctx, 
        status: "success" 
      };
    } catch (error) {
      // Handle errors and return a failed result
      return {
        ctx: stepCtx,
        status: "failed",
        error: error instanceof Error ? error : new Error(String(error))
      };
    }
  };
}
