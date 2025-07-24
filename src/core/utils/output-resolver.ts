/**
 * Output Resolver
 * 
 * Handles resolution of final output from flow execution results.
 * Finds middlewares marked for output and resolves the appropriate response.
 */

import { MiddlewareContext, ITools } from '../types';

/**
 * Resolves the final output from flow execution result
 * @param result Flow execution result context
 * @param middlewares Original middleware configuration
 * @param tools Optional tools for debugging
 * @returns Final output object or data
 */
export function resolveFlowOutput(
  result: MiddlewareContext, 
  middlewares: any[], 
  tools?: ITools
): any {
  // Find middleware marked with output: true
  const outputMiddleware = findOutputMiddleware(middlewares);
  
  // Debug logging for output resolution
  if (tools?.logger) {
    tools.logger.info({
      message: "Debug runFlow output resolution",
      debug: {
        outputMiddleware: outputMiddleware ? { 
          name: outputMiddleware.name, 
          type: outputMiddleware.type 
        } : null,
        hasResultOutput: !!result.output,
        resultOutputKeys: result.output ? Object.keys(result.output) : [],
        globalsKeys: Object.keys(result.globals),
        finalResponseInGlobals: !!result.globals['FinalResponse']
      }
    });
  }
  
  // If there's a middleware marked as output and we have output in context
  if (outputMiddleware && result.output) {
    return result.output;
  }
  
  // If we found the output middleware in globals, return its result
  if (outputMiddleware && outputMiddleware.name && result.globals[outputMiddleware.name]) {
    return result.globals[outputMiddleware.name];
  }

  // Find any result that's not system metadata
  const resultKeys = Object.keys(result.globals).filter(
    key => result.globals[key] !== null &&
           result.globals[key] !== undefined
  );
  
  // Return the last valid result
  if (resultKeys.length > 0) {
    const lastKey = resultKeys[resultKeys.length - 1];
    return result.globals[lastKey];
  }

  // If no specific results, return empty object
  return {};
}

/**
 * Recursively searches for middleware marked with output: true
 * @param middlewares Array of middleware configurations to search
 * @returns Middleware configuration marked for output, or null
 */
export function findOutputMiddleware(middlewares: any[]): any {
  for (const middleware of middlewares) {
    if (Array.isArray(middleware)) {
      const found = findOutputMiddleware(middleware);
      if (found) return found;
    } else if (middleware.parallel) {
      const found = findOutputMiddleware(middleware.parallel);
      if (found) return found;
    } else if (middleware.sequence) {
      const found = findOutputMiddleware(middleware.sequence);
      if (found) return found;
    } else if (middleware.conditional) {
      const found = findOutputInConditional(middleware.conditional);
      if (found) return found;
    } else if (middleware.type && middleware.options?.output === true) {
      return middleware;
    }
  }
  return null;
}

/**
 * Searches for output middleware within conditional branches
 * @param conditional Conditional configuration object
 * @returns Middleware marked for output in conditional branches, or null
 */
function findOutputInConditional(conditional: any): any {
  // Search in 'then' branch
  if (conditional.then) {
    if (Array.isArray(conditional.then)) {
      const found = findOutputMiddleware(conditional.then);
      if (found) return found;
    } else if (conditional.then.type && conditional.then.options?.output === true) {
      return conditional.then;
    }
  }
  
  // Search in 'else' branch
  if (conditional.else) {
    if (Array.isArray(conditional.else)) {
      const found = findOutputMiddleware(conditional.else);
      if (found) return found;
    } else if (conditional.else.type && conditional.else.options?.output === true) {
      return conditional.else;
    }
  }
  
  return null;
}
