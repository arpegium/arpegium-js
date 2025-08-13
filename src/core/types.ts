export * from './flow-types';

export type MiddlewareContext = {
  input: Record<string, any>;
  globals: Record<string, any>;
  output?: Record<string, any>;
  executionStatus?: MiddlewareExecutionStatus[];
  executionTrace?: any[];
  nonBlockingErrors?: any[];
  _internal?: {
    retryInfo?: Record<string, any>;
    [key: string]: any;
  };
};

export type MiddlewareResult = {
  ctx: MiddlewareContext;
  status: "success" | "failed" | "skipped";
  error?: any;
  meta?: Record<string, any>;
};

export type MiddlewareFunction = (
  ctx: MiddlewareContext,
  mwConfig: MiddlewareConfig,
  tools?: ITools,
  span?: any
) => Promise<MiddlewareResult>;

export type MiddlewareExecutionStatus = {
  name: string;
  type: string;
  status: "success" | "failed" | "skipped";
  error?: any;
  meta?: Record<string, any>;
};

export interface MiddlewareConfig {
  type: string;
  name: string;
  options?: Record<string, any>;
  blocking?: boolean;
  middlewares?: MiddlewareConfig[];
  cases?: any[];
  default?: any;
  inputField?: string;
  outputField?: string;
  origin?: string;
  mapping?: any;
  outputVariableName?: string;
  // Para estructuras de control
  sequence?: MiddlewareConfig[];
  parallel?: MiddlewareConfig[];
  conditional?: {
    condition?: string;
    conditions?: string[];
    if?: string;
    then?: any;
    else?: any;
    branches?: any[];
  };
  onError?: FlowErrorHandlerConfig;
}

import { FlowDefinition } from './flow-types';
export type FlowConfig = FlowDefinition;

export interface FlowErrorHandlerConfig {
  type?: string;
  message?: string;
  code?: number;
  details?: any;
}

export type FlowErrorHandler = (
  error: any,
  middleware: MiddlewareConfig,
  ctx: MiddlewareContext
) => any;

export interface ITools {
  logger?: ILogger;
  tracer?: ITracer;
  functionRegistry?: Record<string, Function>;
  [key: string]: any;
}

export interface ILogger {
  info(data: any): void;
  error(data: any): void;
  warn(data: any): void;
  debug(data: any): void;
}

export interface ITracer {
  startSpan(name: string, options?: Record<string, any>): ISpan;
}

export interface ISpan {
  setTag(key: string, value: any): void;
  finish(): void;
}

export interface OrchestratorConfig {
  middlewareRegistry?: Record<string, MiddlewareFunction>;
  functionRegistry?: Record<string, Function>;
  logger?: ILogger;
  tracer?: ITracer;
  traceWithObservability?: (name: string, fn: (span?: any) => any, parentSpan?: any) => Promise<any>;
}

