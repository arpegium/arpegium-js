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
  
  // Navegamos hasta el penúltimo nivel, creando objetos si no existen
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    const nextKey = keys[i + 1];
    
    // Si el siguiente key es un número, necesitamos un array
    if (!isNaN(Number(nextKey))) {
      if (!Array.isArray(curr[key])) curr[key] = [];
    } else {
      // Si no existe o no es un objeto, lo creamos
      if (!curr[key] || typeof curr[key] !== 'object' || Array.isArray(curr[key])) {
        curr[key] = {};
      }
    }
    curr = curr[key];
  }
  
  // Asignamos el valor al último key
  const lastKey = keys[keys.length - 1];
  if (Array.isArray(curr) && !isNaN(Number(lastKey))) {
    curr[Number(lastKey)] = value;
  } else {
    curr[lastKey] = value;
  }
}

// Helper para decidir la fuente de datos para cada item
function resolveSource(origin: string | undefined, ctx: any) {
  if (!origin || origin === "body") return ctx.input?.body;
  if (origin === "input") return ctx.input;
  if (origin === "output") return ctx.output;
  if (origin === "globals") return ctx.globals;
  if (origin === "headers") return ctx.input?.headers;
  if (origin === "pathParameters") return ctx.input?.pathParameters;
  if (origin === "queryStringParameters") return ctx.input?.queryStringParameters;
  
  // Default fallback
  return ctx.input?.body;
}

export const mapperMiddleware = createMiddleware(async (ctx, mw, tools, span) => {
  const result: any = {};
  
  // Mapper handles its own interpolation - config comes without pre-interpolation
  const mapping = mw.options?.mapping || mw;

  if (Array.isArray(mapping)) {
    for (const mapItem of mapping) {
      try {
        let value;

        // Determine precedence: fn > value > from
        if (mapItem.fn) {
          // Parse function call: functionName(arg1, arg2, ...)
          const fnMatch = /^([a-zA-Z0-9_]+)(?:\((.*)\))?$/.exec(mapItem.fn.trim());
          if (fnMatch) {
            const fnName = fnMatch[1];
            const fnArgsRaw = fnMatch[2];
            const fn = tools?.functionRegistry?.[fnName];
            
            if (fn) {
              let args: any[] = [];
              if (fnArgsRaw) {
                // Create interpolation context like interpolation-handler does
                const interpolationContext = {
                  ...ctx.globals,
                  ...ctx.input,
                  env: ctx.input?.env || process.env,
                  ...(ctx.input?.body || {}),
                  ...(ctx.input?.pathParameters || {}),
                  _ctx: ctx
                };
                
                // Parse arguments and interpolate each one
                args = fnArgsRaw.split(',').map(arg => {
                  const trimmed = arg.trim();
                  
                  // Check if it's an interpolation pattern
                  if (trimmed.includes('{{') && trimmed.includes('}}')) {
                    const interpolated = interpolate(trimmed, interpolationContext);
                    // Always return the interpolated value, even if null
                    return interpolated;
                  }
                  
                  // Remove quotes if present
                  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || 
                      (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
                    return trimmed.slice(1, -1);
                  }
                  // Try to parse as number only for reasonable sized numbers
                  if (!isNaN(Number(trimmed)) && trimmed.length < 10) {
                    return Number(trimmed);
                  }
                  // For long numbers (like PAN), keep as string
                  return trimmed;
                });
              }
              
              // Ensure we always pass the right number of arguments, including null values
              value = fn(...args);
            } else {
              tools?.logger?.error(`Function ${fnName} not found in functionRegistry`);
              value = undefined; // Return undefined when function not found
            }
          } else {
            // Fallback to interpolation for complex expressions
            const interpolationContext = {
              ...ctx.globals,
              ...ctx.input,
              env: ctx.input?.env || process.env,
              ...(ctx.input?.body || {}),
              ...(ctx.input?.pathParameters || {}),
              _ctx: ctx
            };
            value = interpolate(mapItem.fn, interpolationContext);
          }
        } else if (mapItem.hasOwnProperty('value')) {
          value = mapItem.value;
        } else if (mapItem.from) {
          // Check for wildcard "*" to copy entire object
          if (mapItem.from === '*') {
            value = resolveSource(mapItem.origin, ctx);
          } else {
            const sourceData = resolveSource(mapItem.origin, ctx);
            value = getByPath(sourceData, mapItem.from);
          }
        }

        if (value !== undefined) {
          setByPath(result, mapItem.to, value);
        }
      } catch (error) {
        tools?.logger?.error(`Error processing mapping item: ${error}`);
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
        } else {
          tools?.logger?.error(`Function ${(to as any).fn} not found in functionRegistry`);
          value = undefined; // Return undefined when function not found
        }
      }
      
      if (value !== undefined) {
        result[to as string] = value;
      }
    }
  }

  // Check if this mapper should be the final output (explicit true required)
  const isOutputMapper = mw.options?.output === true;

  // Set result as output or globals
  if (Object.keys(result).length > 0) {
    if (isOutputMapper) {
      // Replace entire output with just this mapper's result
      ctx.output = result;
    } else {
      // Only add to globals, don't modify output
      if (mw.name) {
        ctx.globals[mw.name] = result;
      }
    }
  }

  const hasResultOutput = Object.keys(result).length > 0;
  const resultOutputKeys = hasResultOutput ? Object.keys(result) : [];

  return { ctx, status: "success" };
});
