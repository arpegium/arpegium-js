import { MiddlewareContext, ITools } from "./types";
import { createBasicMiddleware } from "../middleware/basics/index";

// Import modular components
import { 
  isMiddlewareConfig, 
  isParallelConfig, 
  isSequenceConfig, 
  isConditionalConfig,
  resolveFlowOutput,
  setupFlowExecution,
  completeFlowExecution
} from './utils';

import { 
  runSingleMiddleware,
  runParallelMiddlewares,
  runSequenceMiddlewares,
  runConditionalMiddleware
} from './flow-runners';

export class Orchestrator {
  private middlewares: Map<string, any> = new Map();
  private traceWithObservabilityFn: any;

  constructor() {
    this.registerBasicMiddlewares();
    // Función de tracing por defecto (no-op)
    this.traceWithObservabilityFn = async (name: string, fn: Function, parentSpan?: any) => {
      return await fn(null);
    };
  }

  // Método para inyectar la función de observabilidad desde el handler
  setObservabilityTracer(traceFn: any) {
    this.traceWithObservabilityFn = traceFn;
  }

  registerMiddleware(type: string, middleware: any) {
    this.middlewares.set(type, middleware);
  }

  private registerBasicMiddlewares() {
    const basicMiddlewares = createBasicMiddleware();
    Object.entries(basicMiddlewares).forEach(([type, middleware]) => {
      this.registerMiddleware(type, middleware);
    });
  }

  async execute(
    flow: any, 
    initialContext: MiddlewareContext, 
    tools: ITools
  ): Promise<MiddlewareContext> {
    let ctx = { ...initialContext };
    
    if (!ctx.globals) {
      ctx.globals = {};
    }
    
    // Only initialize executionTrace if no _executionTrace system exists
    if (!ctx.executionTrace && !(ctx as any)._executionTrace) {
      ctx.executionTrace = [];
    }

    try {
      ctx = await this.runMiddlewares(flow.middlewares, ctx, tools, null, true, 0);
      return ctx;
    } catch (error) {
      tools?.logger?.error({
        message: 'Error executing orchestrator',
        error: error instanceof Error ? error.message : String(error),
        flow: flow.name
      });
      throw error;
    }
  }

  private async runMiddlewares(
    middlewares: any[],
    ctx: MiddlewareContext,
    tools: ITools,
    parentSpan?: any,
    isRoot: boolean = false,
    level: number = 0
  ): Promise<MiddlewareContext> {
    for (const mwConfig of middlewares) {
      if (Array.isArray(mwConfig)) {
        // Array anidado - mantener compatibilidad
        ctx = await this.runMiddlewares(mwConfig, ctx, tools, parentSpan, false, level + 1);
      } else if (isParallelConfig(mwConfig)) {
        // Nueva sintaxis: { parallel: [...] }
        ctx = await runParallelMiddlewares(
          mwConfig.parallel, 
          ctx, 
          this.middlewares,
          tools, 
          this.traceWithObservabilityFn,
          this.runMiddlewares.bind(this),
          (sequence: any[], ctx: MiddlewareContext, registeredMiddlewares: Map<string, any>, tools: ITools, traceWithObservabilityFn: any, runMiddlewares: Function, runParallelMiddlewares: Function, runConditionalMiddleware: Function, parentSpan?: any, level?: number, parentName?: string) => 
            runSequenceMiddlewares(sequence, ctx, this.middlewares, tools, this.traceWithObservabilityFn, this.runMiddlewares.bind(this), runParallelMiddlewares, runConditionalMiddleware, parentSpan, level, parentName),
          (conditional: any, ctx: MiddlewareContext, tools: ITools, traceWithObservabilityFn: any, runMiddlewares: Function, parentSpan?: any, level?: number) => 
            runConditionalMiddleware(conditional, ctx, tools, this.traceWithObservabilityFn, this.runMiddlewares.bind(this), parentSpan, level),
          parentSpan, 
          level + 1,
          undefined  // No parent for root level parallel
        );
      } else if (isSequenceConfig(mwConfig)) {
        // Nueva sintaxis: { sequence: [...] }
        ctx = await runSequenceMiddlewares(
          mwConfig.sequence, 
          ctx, 
          this.middlewares,
          tools, 
          this.traceWithObservabilityFn,
          this.runMiddlewares.bind(this),
          (parallel: any[], ctx: MiddlewareContext, registeredMiddlewares: Map<string, any>, tools: ITools, traceWithObservabilityFn: any, runMiddlewares: Function, runSequenceMiddlewares: Function, runConditionalMiddleware: Function, parentSpan?: any, level?: number, parentName?: string) => 
            runParallelMiddlewares(parallel, ctx, this.middlewares, tools, this.traceWithObservabilityFn, this.runMiddlewares.bind(this), runSequenceMiddlewares, runConditionalMiddleware, parentSpan, level, parentName),
          (conditional: any, ctx: MiddlewareContext, tools: ITools, traceWithObservabilityFn: any, runMiddlewares: Function, parentSpan?: any, level?: number) => 
            runConditionalMiddleware(conditional, ctx, tools, this.traceWithObservabilityFn, this.runMiddlewares.bind(this), parentSpan, level),
          parentSpan, 
          level + 1,
          undefined  // No parent for root level sequence
        );
      } else if (isConditionalConfig(mwConfig)) {
        // Nueva sintaxis: { conditional: {...} }
        ctx = await runConditionalMiddleware(
          mwConfig.conditional,
          ctx,
          tools,
          this.traceWithObservabilityFn,
          this.runMiddlewares.bind(this),
          parentSpan,
          level + 1
        );
      } else if (!isRoot && isMiddlewareConfig(mwConfig)) {
        // Middleware individual
        const result = await this.runSingleMiddleware(mwConfig, ctx, tools, parentSpan, level, undefined);
        ctx = result.ctx;
        // Verificar si se solicitó parar la ejecución
        if ((result as any).stopExecution === true) {
          return ctx;
        }
      } else {
        // Middleware individual
        const result = await this.runSingleMiddleware(mwConfig, ctx, tools, parentSpan, level, undefined);
        ctx = result.ctx;
        // Verificar si se solicitó parar la ejecución
        if ((result as any).stopExecution === true) {
          return ctx;
        }
      }
    }
    return ctx;
  }

  async runFlow(
    flow: any,
    input: any,
    tools: ITools
  ): Promise<any> {
    // Setup execution context with trace
    const { context: initialContext, executionTrace } = setupFlowExecution(flow, input);

    // Execute the flow
    const result = await this.execute(flow, initialContext, tools);

    // Finalize execution trace and logging
    await completeFlowExecution(result, executionTrace, tools);

    // Resolve and return final output
    return resolveFlowOutput(result, flow.middlewares, tools);
  }

  private async runSingleMiddleware(
    config: any, 
    ctx: MiddlewareContext, 
    tools: ITools, 
    parentSpan?: any, 
    level: number = 0,
    parentName?: string
  ): Promise<{ ctx: MiddlewareContext; result?: any }> {
    return await runSingleMiddleware(
      config,
      ctx,
      this.middlewares,
      tools,
      this.traceWithObservabilityFn,
      parentSpan,
      level,
      parentName
    );
  }

}

export const createOrchestrator = () => new Orchestrator();