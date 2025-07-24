/**
 * Flow Configuration Detector
 * 
 * Utilities for detecting different types of flow configurations
 * including parallel, sequence, conditional, and standard middleware configurations.
 */

/**
 * Checks if an array of middlewares should be executed in parallel
 * @param middlewares Array of middleware configurations
 * @returns True if all items are valid middleware objects (parallel execution)
 */
export function isParallelArray(middlewares: any[]): boolean {
  return middlewares.length > 1 && middlewares.every(mw => 
    typeof mw === 'object' && mw !== null && !Array.isArray(mw) && mw.type
  );
}

/**
 * Checks if a configuration is a parallel block
 * @param config Configuration object to check
 * @returns True if config has a 'parallel' array property
 */
export function isParallelConfig(config: any): boolean {
  return config && typeof config === 'object' && Array.isArray(config.parallel);
}

/**
 * Checks if a configuration is a sequence block
 * @param config Configuration object to check
 * @returns True if config has a 'sequence' array property
 */
export function isSequenceConfig(config: any): boolean {
  return config && typeof config === 'object' && Array.isArray(config.sequence);
}

/**
 * Checks if a configuration is a conditional block
 * @param config Configuration object to check
 * @returns True if config has conditional logic with condition(s)
 */
export function isConditionalConfig(config: any): boolean {
  return config && typeof config === 'object' && config.conditional && 
         (config.conditional.condition || config.conditional.conditions);
}

/**
 * Checks if a configuration is a standard middleware
 * @param config Configuration object to check
 * @returns True if config is a middleware with type property
 */
export function isMiddlewareConfig(config: any): boolean {
  return config && typeof config === 'object' && typeof config.type === 'string';
}
