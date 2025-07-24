import { createMiddleware } from "../base";

export const debugMiddleware = createMiddleware(async (ctx, mw, tools, span) => {
  const options = mw.options || {};
  
  // Crear una versión serializable del contexto
  const debugInfo = {
    timestamp: new Date().toISOString(),
    middleware: mw.name || 'debug',
    input: ctx.input,
    output: ctx.output,
    globals: ctx.globals,
    // Información adicional del contexto
    contextKeys: Object.keys(ctx),
    globalsKeys: ctx.globals ? Object.keys(ctx.globals) : [],
    hasOutput: !!ctx.output,
    outputKeys: ctx.output ? Object.keys(ctx.output) : []
  };

  // Log para debugging
  if (tools?.logger) {
    tools.logger.info({
      message: `Debug Middleware - Context Snapshot`,
      debugInfo: debugInfo,
      point: options.point || 'execution-point'
    });
  }

  // Si stopExecution es true, devolver el debug info como output y parar
  if (options.stopExecution === true) {
    return {
      ctx: {
        ...ctx,
        output: debugInfo
      },
      status: "success" as const,
      stopExecution: true
    };
  }

  // Si no para la ejecución, continuar normalmente pero guardar debug en globals
  if (mw.name) {
    ctx.globals = ctx.globals || {};
    ctx.globals[mw.name] = debugInfo;
  }

  return { ctx, status: "success" };
});
