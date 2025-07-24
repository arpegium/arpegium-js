/**
 * Utils Index
 * 
 * Exports all utility functions for easy importing.
 */

export { 
  isMiddlewareConfig, 
  isParallelConfig, 
  isSequenceConfig, 
  isConditionalConfig 
} from './flow-detector';

export { resolveFlowOutput } from './output-resolver';

export { 
  createExecutionContext,
  finalizeExecutionTrace,
  setupFlowExecution,
  completeFlowExecution
} from './execution-trace-handler';
