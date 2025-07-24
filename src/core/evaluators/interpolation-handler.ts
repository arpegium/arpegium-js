/**
 * Interpolation Handler
 * 
 * Handles variable interpolation within middleware options and conditions.
 * Provides context-aware string interpolation using data from previous middlewares.
 */

import { interpolate } from '../../utils/interpolate';
import { MiddlewareContext } from '../types';

/**
 * Interpolates a single options object with context data
 * @param options Options object that may contain interpolation strings
 * @param ctx Current middleware context containing globals and input data
 * @returns Interpolated options object with resolved values
 */
export function interpolateOptions(options: any, ctx: MiddlewareContext): any {
  if (!options) return options;
  
  return deepInterpolate(options, ctx);
}

/**
 * Recursively interpolates all string values in an object structure
 * @param obj Object to interpolate (can be string, array, or object)
 * @param ctx Middleware context for interpolation data
 * @returns Deeply interpolated object with resolved values
 */
export function deepInterpolate(obj: any, ctx: MiddlewareContext): any {
  if (typeof obj === 'string') {
    // Create comprehensive interpolation context
    const interpolationContext = {
      ...ctx.globals, // Data from previous middlewares
      ...ctx.input,   // Complete input data
      env: ctx.input?.env || process.env,
      // Add body properties for easy access
      ...(ctx.input?.body || {}),
      // Add path parameters for direct access
      ...(ctx.input?.pathParameters || {}),
      // Add complete context reference
      _ctx: ctx
    };
    return interpolate(obj, interpolationContext);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => deepInterpolate(item, ctx));
  }
  
  if (obj && typeof obj === 'object') {
    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = deepInterpolate(value, ctx);
    }
    return result;
  }
  
  return obj;
}
