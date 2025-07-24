import { createMiddleware } from "../base";
import { interpolate } from "../../utils/interpolate";

// Helper para obtener valor por path (dot notation)
function getByPath(obj: any, path: string) {
  return path.split('.').reduce((acc, key) => acc && acc[key], obj);
}

// Helper para setear valor por path (dot notation)
function setByPath(obj: any, path: string, value: any) {
  const keys = path.split('.');
  let curr = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    const nextKey = keys[i + 1];
    if (!isNaN(Number(nextKey))) {
      if (!Array.isArray(curr[key])) curr[key] = [];
    } else {
      if (!curr[key]) curr[key] = {};
    }
    curr = curr[key];
  }
  const lastKey = keys[keys.length - 1];
  if (Array.isArray(curr) && !isNaN(Number(lastKey))) {
    curr[Number(lastKey)] = value;
  } else {
    curr[lastKey] = value;
  }
}

// Helper para decidir la fuente de datos para cada item
function resolveSource(origin: string | null, ctx: any) {
  if (origin === "input") return ctx.input;
  if (origin === "output") return ctx.output;
  if (origin === "globals") return ctx.globals;
  if (["body", "headers", "pathParameters", "queryStringParameters", "resource"].includes(origin || "")) {
    return origin ? ctx.input?.[origin as keyof typeof ctx.input] : undefined;
  }
  return (ctx.output && Object.keys(ctx.output).length > 0 ? ctx.output : ctx.input);
}

export const mapperMiddleware = createMiddleware(async (ctx, mw, tools, span) => {
  const options = mw.options || {};
  const mapping = options.mapping || [];
  const result: any = {};

  // Mejora el contexto de interpolación
  const interpolationContext = {
    ...ctx.globals, // Primero los globals para acceso a datos de otros middlewares
    ...ctx.input,   // Luego el input completo
    env: ctx.input?.env || process.env,
    // Agrega propiedades del body para fácil acceso
    ...(ctx.input?.body || {}),
    // Agrega pathParameters para acceso directo
    ...(ctx.input?.pathParameters || {}),
    // Agregar referencia al contexto completo para funciones que lo necesiten
    _ctx: ctx
  };

  if (Array.isArray(mapping)) {
    for (const mapItem of mapping) {
      let value;

      // Prioridad: fn > value > from
      if (mapItem.fn) {
        // Ejecutar función
        const fnMatch = /^([a-zA-Z0-9_]+)(?:\((.*)\))?$/.exec(mapItem.fn.trim());
        if (fnMatch) {
          const fnName = fnMatch[1];
          const fnArgsRaw = fnMatch[2];
          const fn = tools?.functionRegistry?.[fnName];
          if (fn) {
            let args: any[] = [];
            if (fnArgsRaw !== undefined) {
              args = fnArgsRaw.split(",").map(arg => {
                const trimmed = arg.trim();
                // Usa el contexto mejorado para interpolación
                const interpolated = interpolate(trimmed, interpolationContext);
                if (interpolated === trimmed) {
                  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
                    return trimmed.slice(1, -1);
                  }
                  if (!isNaN(Number(trimmed))) {
                    return Number(trimmed);
                  }
                  if (trimmed === "true") return true;
                  if (trimmed === "false") return false;
                }
                return interpolated;
              });
            }
            if (args.length === 0) {
              // Para funciones sin argumentos, no agregar parámetros adicionales
              args = [];
            }
            value = fn(...args);
          }
        }
      } else if (mapItem.value !== undefined) {
        // Usar valor literal
        value = mapItem.value;
      } else if (mapItem.from) {
        // Mapear desde origen
        if (mapItem.origin === "body" && ctx.input?.body) {
          value = getByPath(ctx.input.body, mapItem.from);
        } else if (mapItem.origin === "headers" && ctx.input?.headers) {
          value = getByPath(ctx.input.headers, mapItem.from);
        } else if (mapItem.origin === "pathParameters" && ctx.input?.pathParameters) {
          value = getByPath(ctx.input.pathParameters, mapItem.from);
        } else if (mapItem.origin === "queryStringParameters" && ctx.input?.queryStringParameters) {
          value = getByPath(ctx.input.queryStringParameters, mapItem.from);
        } else if (mapItem.from === "*" && mapItem.origin === "body") {
          value = ctx.input?.body;
        } else if (mapItem.origin === "globals" && ctx.globals) {
          value = getByPath(ctx.globals, mapItem.from);
        } else {
          // Buscar en globals por defecto
          value = getByPath(ctx.globals, mapItem.from);
        }
      }

      if (value !== undefined && value !== null) {
        // Soporte para dataType
        const dataType = mapItem.dataType || "string";
        if (dataType === "number") value = Number(value);
        else if (dataType === "boolean") value = value === "true" || value === true;
        else if (dataType === "string") {
          if (mapItem.forceString === true) {
            value = JSON.stringify(value);
          } else if (typeof value !== "string" && typeof value !== "number" && typeof value !== "boolean") {
            // Keep objects and arrays as-is for non-string types
          } else {
            value = String(value);
          }
        }
        else if (dataType === "array") {
          if (typeof value === "string" && value.trim().startsWith("[") && value.trim().endsWith("]")) {
            try {
              value = JSON.parse(value);
            } catch {
              value = [value];
            }
          }
          if (!Array.isArray(value)) value = [value];
        }
      }
      
      if (mapItem.to) {
        setByPath(result, mapItem.to, value);
      }
    }
  } else {
    // Handle object mapping format
    for (const [from, to] of Object.entries(mapping)) {
      let value = getByPath(ctx.input, from);
      if (value === undefined && ctx.globals) {
        value = getByPath(ctx.globals, from);
      }
      
      if (typeof to === "object" && to !== null && typeof (to as any).fn === "string") {
        const fn = tools?.functionRegistry?.[(to as any).fn];
        if (fn) {
          value = fn(value, ctx);
        }
      }
      
      setByPath(result, typeof to === "string" ? to : (to as any).path, value);
    }
  }

  // Guardar el resultado en globals si el middleware tiene nombre
  if (mw.name) {
    ctx.globals = ctx.globals || {};
    ctx.globals[mw.name] = result;
  }

  // Determinar si debe ser output
  const shouldOutput = options.output !== false;
  if (shouldOutput) {
    ctx.output = result;
  }

  return { ctx, status: "success" };
});