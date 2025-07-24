/**
 * Condition Evaluator
 * 
 * Evaluates conditional expressions for flow control logic.
 * Supports numeric comparisons, string comparisons, and logical operators.
 */

/**
 * Main condition evaluation entry point
 * @param condition Condition to evaluate (boolean, string, or number)
 * @returns Boolean result of condition evaluation
 */
export function evaluateCondition(condition: any): boolean {
  if (typeof condition === 'boolean') {
    return condition;
  }
  
  if (typeof condition === 'string') {
    try {
      const trimmed = condition.trim();
      
      // Handle complex conditions with && and ||
      if (trimmed.includes('&&') || trimmed.includes('||')) {
        return evaluateComplexCondition(trimmed);
      }
      
      // Simple condition - use existing parser
      return evaluateSimpleCondition(trimmed);
      
    } catch (error) {
      console.log('Condition parser failed:', error);
      // Fallback for simple boolean values
      return getFallbackBooleanValue(condition);
    }
  }
  
  if (typeof condition === 'number') {
    return condition !== 0;
  }
  
  // For objects, arrays, etc.
  return !!condition;
}

/**
 * Evaluates complex conditions with logical operators (&&, ||)
 * @param condition String condition with logical operators
 * @returns Boolean result of complex condition evaluation
 */
function evaluateComplexCondition(condition: string): boolean {
  // Split by || first (lower precedence)
  const orParts = condition.split('||').map(part => part.trim());
  
  if (orParts.length > 1) {
    // If there's OR, evaluate each part and return true if any is true
    return orParts.some(part => evaluateAndCondition(part));
  }
  
  // If no OR, evaluate as AND
  return evaluateAndCondition(condition);
}

/**
 * Evaluates AND conditions
 * @param condition String condition with AND operators
 * @returns Boolean result of AND condition evaluation
 */
function evaluateAndCondition(condition: string): boolean {
  // Split by &&
  const andParts = condition.split('&&').map(part => part.trim());
  
  if (andParts.length > 1) {
    // If there's AND, all parts must be true
    return andParts.every(part => evaluateSimpleCondition(part));
  }
  
  // If no AND, evaluate as simple condition
  return evaluateSimpleCondition(condition);
}

/**
 * Evaluates simple conditions (no logical operators)
 * @param condition Simple condition string
 * @returns Boolean result of simple condition evaluation
 */
function evaluateSimpleCondition(condition: string): boolean {
  // Numeric comparisons: 900 > 1000, 1500 >= 1000, etc.
  const numericResult = evaluateNumericCondition(condition);
  if (numericResult !== null) {
    return numericResult;
  }
  
  // String comparisons with support for strings without quotes
  const stringResult = evaluateStringCondition(condition);
  if (stringResult !== null) {
    return stringResult;
  }
  
  // Direct boolean values
  const booleanResult = evaluateBooleanCondition(condition);
  if (booleanResult !== null) {
    return booleanResult;
  }
  
  console.log('Simple parser could not handle:', condition);
  return false;
}

/**
 * Evaluates numeric comparison conditions
 * @param condition Condition string with numeric comparison
 * @returns Boolean result or null if not a numeric condition
 */
function evaluateNumericCondition(condition: string): boolean | null {
  const numericMatch = condition.match(/^(\d+(?:\.\d+)?)\s*([><=!]+)\s*(\d+(?:\.\d+)?)$/);
  if (numericMatch) {
    const [, left, operator, right] = numericMatch;
    const leftNum = parseFloat(left);
    const rightNum = parseFloat(right);
    
    switch (operator) {
      case '>': return leftNum > rightNum;
      case '<': return leftNum < rightNum;
      case '>=': return leftNum >= rightNum;
      case '<=': return leftNum <= rightNum;
      case '==': case '===': return leftNum === rightNum;
      case '!=': case '!==': return leftNum !== rightNum;
      default: return false;
    }
  }
  return null;
}

/**
 * Evaluates string comparison conditions
 * @param condition Condition string with string comparison
 * @returns Boolean result or null if not a string condition
 */
function evaluateStringCondition(condition: string): boolean | null {
  // String comparisons with support for strings without quotes
  // Examples: 'payment' === 'transfer', payment === 'transfer', transfer == 'transfer'
  const stringMatch = condition.match(/^(['"]?)([^'"=!<>]*?)\1\s*([=!]+)\s*(['"]?)([^'"=!<>]*?)\4$/);
  if (stringMatch) {
    const [, , leftStr, operator, , rightStr] = stringMatch;
    
    // Debug logging for string comparisons
    console.log('String comparison:', { leftStr, operator, rightStr, condition });
    
    switch (operator) {
      case '==': case '===': return leftStr.trim() === rightStr.trim();
      case '!=': case '!==': return leftStr.trim() !== rightStr.trim();
      default: return false;
    }
  }
  return null;
}

/**
 * Evaluates direct boolean conditions
 * @param condition Condition string representing a boolean
 * @returns Boolean result or null if not a boolean condition
 */
function evaluateBooleanCondition(condition: string): boolean | null {
  const lowerCondition = condition.toLowerCase();
  if (lowerCondition === 'true') return true;
  if (lowerCondition === 'false') return false;
  return null;
}

/**
 * Provides fallback boolean evaluation for edge cases
 * @param condition Original condition value
 * @returns Fallback boolean interpretation
 */
function getFallbackBooleanValue(condition: string): boolean {
  const lowerCondition = condition.toLowerCase();
  if (lowerCondition === 'true' || lowerCondition === '1' || lowerCondition === 'yes') {
    return true;
  }
  if (lowerCondition === 'false' || lowerCondition === '0' || lowerCondition === 'no' || lowerCondition === '') {
    return false;
  }
  return condition.trim() !== '';
}
