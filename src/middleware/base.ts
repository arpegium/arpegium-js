import { MiddlewareFunction, MiddlewareResult } from "../core/types";
import { addTrace } from "../utils/executionTrace";

export interface MiddlewareHooks {
  before?: (ctx: any, mw: any, tools?: any) => Promise<void> | void;
  after?: (ctx: any, mw: any, result: MiddlewareResult, tools?: any, span?: any) => Promise<void> | void;
}

export const createMiddleware = (
  fn: MiddlewareFunction,
  hooks?: MiddlewareHooks
): MiddlewareFunction => {
  return async (ctx: any, mw: any, tools?: any, span?: any) => {
    if (hooks?.before) await hooks.before(ctx, mw, tools);

    const mwStart = Date.now();
    let result;
    try {
      result = await fn(ctx, mw, tools, span);
      if (!result || typeof result !== "object" || !("ctx" in result) || !("status" in result)) {
        result = { ctx: result || ctx, status: "success" } as MiddlewareResult;
      }
    } catch (error) {
      tools?.logger?.error({
        message: `Middleware execution failed: ${mw.name || mw.type}`,
        middleware: { name: mw.name, type: mw.type },
        error: error instanceof Error ? error.message : String(error)
      });
      result = { ctx, status: "failed", error } as MiddlewareResult;
    }
    const mwEnd = Date.now();

    if (hooks?.after) await hooks.after(ctx, mw, result, tools, span);

    // Comentado porque ahora usamos ExecutionTrace class en el orchestrator
    // addTrace(ctx, {
    //   name: mw.name,
    //   type: mw.type,
    //   status: result.status,
    //   parent: mw.parent || null,
    //   isControl: ["parallel", "sequence", "switch"].includes(mw.type),
    //   durationMs: mwEnd - mwStart,
    //   startedAt: mwStart,
    //   endedAt: mwEnd,
    //   asyncSend: mw.options?.asyncSend === true
    // });
    
    return result;
  };
};
