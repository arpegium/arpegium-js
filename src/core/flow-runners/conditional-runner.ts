/**
 * Conditional Runner
 * 
 * Handles conditional execution of middleware blocks.
 * Evaluates conditions and executes appropriate branches.
 */

import { MiddlewareContext, ITools } from '../types';
import { evaluateCondition } from '../evaluators/condition-evaluator';
import { deepInterpolate } from '../evaluators/interpolation-handler';

/**
 * Executes conditional middleware blocks based on condition evaluation
 * @param conditionalConfig Conditional configuration object
 * @param ctx Current execution context
 * @param tools Execution tools
 * @param traceWithObservabilityFn Tracing function
 * @param runMiddlewares Function to run middleware arrays
 * @param parentSpan Parent span for tracing
 * @param level Execution level
 * @param parentName Parent trace entry name for hierarchical display
 * @returns Updated context after conditional execution
 */
export async function runConditionalMiddleware(
  conditionalConfig: any,
  ctx: MiddlewareContext,
  tools: ITools,
  traceWithObservabilityFn: any,
  runMiddlewares: Function,
  parentSpan?: any,
  level: number = 0,
  parentName?: string
): Promise<MiddlewareContext> {
  const blockStart = Date.now();
  let conditionResult = false;
  let evaluatedCondition = '';
  let executedBranch = '';
  
  return await traceWithObservabilityFn(
    'conditional-block',
    async (conditionalSpan: any) => {
      const executionTrace = (ctx as any)._executionTrace;
      
      // Add conditional block entry to execution trace
      let traceEntry: any = null;
      if (executionTrace) {
        traceEntry = executionTrace.addEntry({
          name: `conditional-${Date.now()}`,
          type: 'conditional',
          status: 'running',
          parent: parentName,  // Use parentName parameter
          isControl: true,
          startedAt: blockStart
        });
        // Update context array to reflect changes
        ctx.executionTrace = executionTrace.getTrace();
      }

      // Evaluate the condition
      const conditionEvaluation = await evaluateConditionalExpression(
        conditionalConfig, 
        ctx,
        tools
      );
      
      conditionResult = conditionEvaluation.result;
      evaluatedCondition = conditionEvaluation.expression;
      
      // Execute appropriate branch based on condition result
      if (conditionResult && conditionalConfig.then) {
        executedBranch = 'then';
        // Handle then branch - could be single middleware or array
        if (Array.isArray(conditionalConfig.then)) {
          await runMiddlewares(conditionalConfig.then, ctx, tools, conditionalSpan, false, level + 1);
        } else {
          await runMiddlewares([conditionalConfig.then], ctx, tools, conditionalSpan, false, level + 1);
        }
      } else if (!conditionResult && conditionalConfig.else) {
        executedBranch = 'else';
        // Handle else branch - could be single middleware or array  
        if (Array.isArray(conditionalConfig.else)) {
          await runMiddlewares(conditionalConfig.else, ctx, tools, conditionalSpan, false, level + 1);
        } else {
          await runMiddlewares([conditionalConfig.else], ctx, tools, conditionalSpan, false, level + 1);
        }
      }

      // Mark conditional block as completed
      if (executionTrace && traceEntry) {
        traceEntry.status = 'completed';
        traceEntry.endedAt = Date.now();
        traceEntry.duration = traceEntry.endedAt - traceEntry.startedAt;
        traceEntry.condition = evaluatedCondition;
        traceEntry.conditionResult = conditionResult;
        traceEntry.executedBranch = executedBranch;
        // Update context array to reflect changes
        ctx.executionTrace = executionTrace.getTrace();
      }
      
      // Add conditional execution trace
      addConditionalTrace(
        ctx, 
        blockStart, 
        level, 
        evaluatedCondition, 
        conditionResult, 
        executedBranch
      );
      
      return ctx;
    },
    parentSpan
  );
}

/**
 * Evaluates the conditional expression
 * @param conditionalConfig Configuration containing the condition
 * @param ctx Execution context for variable interpolation
 * @returns Object with evaluation result and interpolated expression
 */
async function evaluateConditionalExpression(
  conditionalConfig: any, 
  ctx: MiddlewareContext,
  tools?: any
): Promise<{ result: boolean; expression: string }> {
  try {
    // Support both 'if' and 'condition' fields
    const conditionField = conditionalConfig.if || conditionalConfig.condition;
    
    // Interpolate variables in the condition string
    const interpolatedCondition = deepInterpolate(conditionField, ctx);
    
    // Evaluate the condition
    const conditionResult = evaluateCondition(interpolatedCondition);
    
    // Add evaluation trace
    if (ctx.executionTrace) {
      ctx.executionTrace.push({
        type: 'condition-evaluation',
        condition: conditionField,
        interpolated: interpolatedCondition,
        result: conditionResult,
        timestamp: Date.now()
      });
    }
    
    return {
      result: conditionResult,
      expression: interpolatedCondition
    };
  } catch (error) {
    // Support both 'if' and 'condition' fields for error handling
    const conditionField = conditionalConfig.if || conditionalConfig.condition;
    
    // Log the error
    tools?.logger?.error({
      message: 'Error evaluating conditional expression',
      condition: conditionField,
      error: error instanceof Error ? error.message : String(error)
    });
    
    // Add error trace
    if (ctx.executionTrace) {
      ctx.executionTrace.push({
        type: 'condition-evaluation-error',
        condition: conditionField,
        error: error instanceof Error ? error.message : String(error),
        timestamp: Date.now()
      });
    }
    
    return {
      result: false,
      expression: conditionField
    };
  }
}

/**
 * Adds conditional execution trace to context
 * @param ctx Context to update
 * @param blockStart Start time of conditional block
 * @param level Execution level
 * @param condition Evaluated condition string
 * @param result Condition evaluation result
 * @param executedBranch Which branch was executed ('then', 'else', or '')
 */
function addConditionalTrace(
  ctx: MiddlewareContext,
  blockStart: number,
  level: number,
  condition: string,
  result: boolean,
  executedBranch: string
): void {
  if (ctx.executionTrace) {
    ctx.executionTrace.push({
      type: 'conditional',
      start: blockStart,
      end: Date.now(),
      duration: Date.now() - blockStart,
      level,
      condition,
      result,
      executedBranch
    });
  }
}

/**
 * Validates conditional configuration structure
 * @param conditionalConfig Configuration to validate
 * @returns True if valid, false otherwise
 */
export function isValidConditionalConfig(conditionalConfig: any): boolean {
  if (!conditionalConfig || typeof conditionalConfig !== 'object') {
    return false;
  }
  
  // Must have an 'if' or 'condition' field
  const conditionField = conditionalConfig.if || conditionalConfig.condition;
  if (!conditionField || typeof conditionField !== 'string') {
    return false;
  }
  
  // Must have at least 'then' or 'else' branch
  if (!conditionalConfig.then && !conditionalConfig.else) {
    return false;
  }
  
  return true;
}

/**
 * Creates a default conditional configuration for testing
 * @param condition Condition string
 * @param thenMiddlewares Middlewares to execute when condition is true
 * @param elseMiddlewares Optional middlewares to execute when condition is false
 * @returns Conditional configuration object
 */
export function createConditionalConfig(
  condition: string,
  thenMiddlewares: any[],
  elseMiddlewares?: any[]
): any {
  const config: any = {
    if: condition,
    then: thenMiddlewares
  };
  
  if (elseMiddlewares) {
    config.else = elseMiddlewares;
  }
  
  return config;
}
