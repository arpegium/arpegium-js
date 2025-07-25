/**
 * Execution Trace Handler
 * 
 * Handles execution trace logging, formatting and duration calculation.
 * Provides utilities for trace management and debugging output.
 */

import { MiddlewareContext, ITools } from '../types';
import { ExecutionTrace, buildExecutionTraceString } from '../../utils/executionTrace';

/**
 * Creates initial execution context with trace setup
 * @param input Initial input data
 * @returns Context with ExecutionTrace configured
 */
export function createExecutionContext(input: any): {
  context: MiddlewareContext;
  executionTrace: ExecutionTrace;
} {
  const executionTrace = new ExecutionTrace();
  const context: MiddlewareContext = {
    input,
    globals: {},
    executionTrace: executionTrace.getTrace()
  };

  // Add reference to ExecutionTrace for middlewares to use
  (context as any)._executionTrace = executionTrace;

  return { context, executionTrace };
}

/**
 * Finalizes execution trace and logs results
 * @param result Final execution result
 * @param executionTrace ExecutionTrace instance
 * @param tools Tools with logger
 */
export async function finalizeExecutionTrace(
  result: MiddlewareContext,
  executionTrace: ExecutionTrace,
  tools: ITools
): Promise<void> {
  // Update final trace
  result.executionTrace = executionTrace.getTrace();

  // Log execution trace asynchronously (non-blocking)
  if (tools?.logger && result.executionTrace && Array.isArray(result.executionTrace)) {
    // Schedule execution trace logging to run after the main flow completes
    setImmediate(() => {
      logExecutionTrace(result.executionTrace!, tools).catch(error => {
        // Silent catch - execution trace logging should never affect the main flow
        console.error('Async execution trace logging failed:', error);
      });
    });
  }

  // Log non-blocking errors if any
  if (result.nonBlockingErrors && result.nonBlockingErrors.length > 0) {
    logNonBlockingErrors(result.nonBlockingErrors, tools);
  }
}

/**
 * Logs formatted execution trace
 * @param executionTrace Trace entries to log
 * @param tools Tools with logger
 */
async function logExecutionTrace(executionTrace: any[], tools: ITools): Promise<void> {
  try {
    const entries = executionTrace;
    const totalDuration = calculateTotalDuration(entries);
    const traceMessage = buildExecutionTraceString(entries, totalDuration);
    
    tools.logger?.info({
      message: "Flow Execution Trace",
      executionTrace: traceMessage
    });
  } catch (error) {
    // Log the detailed error so we can debug what's wrong
    tools.logger?.error({
      message: "Failed to log execution trace",
      response: {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        entriesCount: executionTrace?.length || 0,
        entriesType: typeof executionTrace,
        firstEntry: executionTrace?.[0] || null
      }
    });
  }
}

/**
 * Calculates total duration from trace entries
 * @param entries Trace entries
 * @returns Total duration in milliseconds
 */
function calculateTotalDuration(entries: any[]): number {
  if (entries.length === 0) return 0;
  
  const startTimes = entries.map(e => e.startedAt).filter(t => t > 0);
  const endTimes = entries.map(e => e.endedAt).filter(t => t > 0);
  
  if (startTimes.length === 0 || endTimes.length === 0) return 0;
  
  return Math.max(...endTimes) - Math.min(...startTimes);
}

/**
 * Logs non-blocking errors summary
 * @param errors Array of non-blocking errors
 * @param tools Tools with logger
 */
function logNonBlockingErrors(errors: any[], tools: ITools): void {
  tools?.logger?.warn({
    message: "Middleware Execution Errors Summary",
    response: {
      totalErrors: errors.length,
      errors: errors
    }
  });
}

/**
 * Sets up execution context with proper trace initialization
 * @param flow Flow configuration
 * @param input Initial input data
 * @returns Prepared context and trace instance
 */
export function setupFlowExecution(flow: any, input: any): {
  context: MiddlewareContext;
  executionTrace: ExecutionTrace;
} {
  return createExecutionContext(input);
}

/**
 * Completes flow execution with trace finalization
 * @param result Final execution result
 * @param executionTrace ExecutionTrace instance
 * @param tools Tools with logger
 * @returns Promise that resolves when trace is finalized
 */
export async function completeFlowExecution(
  result: MiddlewareContext,
  executionTrace: ExecutionTrace,
  tools: ITools
): Promise<void> {
  await finalizeExecutionTrace(result, executionTrace, tools);
}
