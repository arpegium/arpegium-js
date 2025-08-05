# Arpegium JS

A generic, extensible orchestrator framework for creating JSON-defined workflows with middleware-based processing.

## Installation

```bash
npm install arpegium-js
```

## Table of Contents
- [Overview](#overview)
- [Framework Features](#framework-features)
- [Quick Start](#quick-start)
- [Built-in Middlewares](#built-in-middlewares)
- [Flow Control](#flow-control)
- [Error Handling and Blocking Middleware](#error-handling-and-blocking-middleware)
- [Creating Custom Middlewares](#creating-custom-middlewares)
- [Type Definitions](#type-definitions)
- [Development Guide](#development-guide)
- [Examples](#examples)

## Overview

The Orchestrator Framework allows you to define complex business workflows using simple JSON configuration files. It provides a middleware-based architecture where each step in your workflow is a reusable, composable middleware.

## Framework Features

- **JSON-defined workflows**: Define complex orchestration flows using simple JSON configuration
- **Middleware-based architecture**: Extensible middleware system for processing steps
- **Advanced flow control**: Built-in support for `parallel`, `sequence`, and `conditional` execution
- **Complex conditional logic**: Support for numeric/string comparisons and logical operators
- **Variable interpolation**: Access data from previous middlewares using `{{middlewareName.fieldName}}`
- **Enhanced mapper capabilities**: 
  - Wildcard copying with `"from": "*"` to copy all source properties
  - Function execution with parameter support for dynamic transformations
  - Output precedence handling for complex data flows
- **Custom functions**: Support for custom utility functions in mappers via functionRegistry
- **Advanced execution tracing**: 
  - Hierarchical execution tree with visual indentation using pipe symbols (`|`)
  - Real-time flow debugging with temporal ordering
  - Asynchronous trace logging for optimal performance
  - Support for deeply nested control structures
- **Type-safe**: Full TypeScript support with comprehensive type definitions
- **Extensible**: Easy to add custom middlewares and functions
- **Robust error handling**: 
  - Blocking vs non-blocking middleware support
  - Comprehensive error collection and reporting
  - Enhanced HTTP request error details with complete request context
  - JSON schema validation with format support (email, date, etc.)
- **Enhanced HTTP middleware**: 
  - Complete request data in error responses
  - SSL/TLS configuration support
  - Detailed logging and debugging capabilities
- **Comprehensive validation**: JSON schema validation with ajv and ajv-formats support
- **Debug support**: Built-in debug middleware for flow inspection

## Quick Start

```typescript
import { Orchestrator } from 'arpegium-js';

// Create orchestrator instance
const orchestrator = new Orchestrator();

// Optional: Set observability tracer
orchestrator.setObservabilityTracer(yourTracingFunction);

// Register custom middlewares
orchestrator.registerMiddleware('myCustomMiddleware', myCustomMiddleware);

// Define custom functions for mappers (optional)
const functionRegistry = {
  mockValue: (value: any, fallback: any) => value || fallback,
  getCurrentTimestamp: () => Date.now(),
  // ... add your custom functions
};

// Define tools (logger, tracer, etc.)
const tools = {
  logger: yourLogger,
  tracer: yourTracer,
  functionRegistry, // ← Required if using functions in mappers
  // ... other tools
};

// Run a flow
const result = await orchestrator.runFlow(flowConfig, input, tools);
```

## Built-in Middlewares

### Validator Middleware
Validates input data using JSON Schema with comprehensive format support.

```json
{
  "type": "validator",
  "name": "InputValidator",
  "options": {
    "origin": "body",
    "schema": {
      "type": "object",
      "properties": {
        "email": { "type": "string", "format": "email" },
        "age": { "type": "number", "minimum": 0 }
      },
      "required": ["email"]
    },
    "onError": {
      "type": "ValidationError",
      "code": 422
    },
    "blocking": true  // Default: true. Set to false for non-blocking validation
  }
}
```

### Mapper Middleware
Transforms and maps data between different structures with advanced capabilities.

```json
{
  "type": "mapper",
  "name": "DataMapper",
  "options": {
    "output": true,
    "mapping": [
      {
        "origin": "body",
        "from": "user.email",
        "to": "userEmail"
      },
      {
        "value": "ACTIVE",
        "to": "status"
      },
      {
        "fn": "toUpperCase({{user.name}})",
        "to": "userName"
      },
      {
        "origin": "user",
        "from": "*",
        "to": "userData"
      }
    ]
  }
}
```

#### Advanced Mapper Features

1. **Wildcard Copying**: Use `"from": "*"` to copy all properties from the source object:
```json
{
  "origin": "sourceData",
  "from": "*",
  "to": "copiedData"
}
```

2. **Function Execution**: Execute custom functions with parameter support:
```json
{
  "fn": "formatDate({{timestamp}}, 'YYYY-MM-DD')",
  "to": "formattedDate"
}
```

3. **Output Precedence**: When `output: true` is set, mapped values take precedence over direct middleware outputs.

**Note**: The `fn` field requires a custom function to be defined in `tools.functionRegistry`. See [Custom Functions in Mappers](#custom-functions-in-mappers) section.

### HTTP Request Middleware
Makes HTTP requests with comprehensive error reporting and SSL configuration support.

```json
{
  "type": "httpRequest",
  "name": "GetUserData",
  "options": {
    "url": "https://api.example.com/users/{{userId}}",
    "method": "POST",
    "headers": {
      "Authorization": "Bearer {{token}}",
      "Content-Type": "application/json"
    },
    "body": {
      "requestId": "{{requestId}}",
      "timestamp": "{{timestamp}}"
    },
    "rejectUnauthorized": false,
    "blocking": true  // Default: true. Set to false for non-blocking requests
  }
}
```

#### Enhanced Error Reporting
HTTP Request middleware provides detailed error information including:
- Original and interpolated URLs
- Complete headers (original and interpolated)
- Request body data
- Interpolation context
- Network error details
- HTTP response status and body

#### SSL/TLS Configuration
Supports various SSL configurations:
- `rejectUnauthorized: false` - Disable SSL certificate validation
- `allowInsecure: true` - Allow insecure connections
- `ignoreTLSErrors: true` - Ignore all TLS errors
```

## Flow Control

Arpegium JS provides powerful flow control mechanisms to handle complex business logic:

### Sequential Execution
Use the `sequence` block for sequential execution:

```json
{
  "sequence": [
    { "type": "validator", "name": "Step1" },
    { "type": "mapper", "name": "Step2" },
    { "type": "httpRequest", "name": "Step3" }
  ]
}
```

### Parallel Execution
Use the `parallel` block for concurrent execution:

```json
{
  "parallel": [
    {
      "type": "httpRequest",
      "name": "GetUserData",
      "options": {
        "url": "https://api.example.com/users/{{userId}}"
      }
    },
    {
      "type": "httpRequest", 
      "name": "GetAccountData",
      "options": {
        "url": "https://api.example.com/accounts/{{userId}}"
      }
    }
  ]
}
```

### Conditional Execution
Use the `conditional` block for decision-making logic:

```json
{
  "conditional": {
    "condition": "{{transactionAmount}} > 1000",
    "then": {
      "type": "mapper",
      "name": "HighAmountProcess",
      "options": {
        "mapping": [
          {
            "value": "BLOCKED",
            "to": "status"
          }
        ]
      }
    },
    "else": {
      "type": "mapper", 
      "name": "LowAmountProcess",
      "options": {
        "mapping": [
          {
            "value": "APPROVED",
            "to": "status"
          }
        ]
      }
    }
  }
}
```

### Nested Conditional Logic
Support for complex nested conditions:

```json
{
  "conditional": {
    "condition": "{{transactionAmount}} > 1000",
    "then": {
      "sequence": [
        {
          "type": "mapper",
          "name": "HighAmountProcess",
          "options": {
            "mapping": [
              { "value": "BLOCKED", "to": "riskStatus" }
            ]
          }
        },
        {
          "conditional": {
            "condition": "{{transactionType}} == 'transfer'",
            "then": {
              "type": "mapper",
              "name": "TransferValidation",
              "options": {
                "mapping": [
                  { "value": "TRANSFER_BLOCKED", "to": "blockReason" }
                ]
              }
            },
            "else": {
              "type": "mapper",
              "name": "PaymentValidation", 
              "options": {
                "mapping": [
                  { "value": "PAYMENT_BLOCKED", "to": "blockReason" }
                ]
              }
            }
          }
        }
      ]
    },
    "else": {
      "parallel": [
        {
          "type": "mapper",
          "name": "LowAmountProcess",
          "options": {
            "mapping": [
              { "value": "ACCEPTED", "to": "riskStatus" }
            ]
          }
        },
        {
          "type": "mapper",
          "name": "FastTrackProcess",
          "options": {
            "mapping": [
              { "value": "FAST_TRACK", "to": "processType" }
            ]
          }
        }
      ]
    }
  }
}
```

### Complete Flow Example
Combining all flow control mechanisms:

```json
{
  "name": "complex-transaction-flow",
  "middlewares": [
    {
      "type": "mapper",
      "name": "InputMapper",
      "options": {
        "mapping": [
          {
            "origin": "body",
            "from": "amount",
            "to": "transactionAmount"
          },
          {
            "origin": "body", 
            "from": "type",
            "to": "transactionType"
          }
        ]
      }
    },
    {
      "sequence": [
        {
          "parallel": [
            {
              "type": "validator",
              "name": "UserValidation",
              "options": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "userId": { "type": "string", "required": true }
                  }
                }
              }
            },
            {
              "type": "validator",
              "name": "AmountValidation", 
              "options": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "transactionAmount": { "type": "number", "minimum": 0 }
                  }
                }
              }
            }
          ]
        },
        {
          "conditional": {
            "condition": "{{transactionAmount}} > 1000",
            "then": {
              "type": "mapper",
              "name": "HighRiskProcess",
              "options": {
                "mapping": [
                  { "value": "HIGH_RISK", "to": "riskLevel" },
                  { "value": "MANUAL_REVIEW", "to": "status" }
                ]
              }
            },
            "else": {
              "type": "mapper",
              "name": "LowRiskProcess", 
              "options": {
                "mapping": [
                  { "value": "LOW_RISK", "to": "riskLevel" },
                  { "value": "AUTO_APPROVED", "to": "status" }
                ]
              }
            }
          }
        }
      ]
    }
  ]
}
```

### Conditional Logic

Arpegium JS supports complex conditional expressions:

#### Comparison Operators
- **Numeric**: `>`, `>=`, `<`, `<=`, `==`, `!=`
- **String**: `==`, `!=`, `===`, `!==`
- **Logical**: `&&` (AND), `||` (OR)

#### Condition Examples
```json
// Numeric comparison
"condition": "{{amount}} > 1000"

// String comparison  
"condition": "{{type}} == 'transfer'"

// Complex conditions with logical operators
"condition": "{{amount}} > 1000 && {{type}} == 'transfer'"
"condition": "{{status}} == 'active' || {{status}} == 'pending'"

// Nested conditions
"condition": "({{amount}} > 1000 && {{type}} == 'transfer') || {{priority}} == 'high'"
```

#### Variable Interpolation
Access data from previous middlewares using `{{middlewareName.fieldName}}`:

```json
{
  "condition": "{{InputMapper.transactionAmount}} > 1000",
  "then": {
    "type": "mapper",
    "name": "ProcessHighAmount",
    "options": {
      "mapping": [
        {
          "origin": "globals",
          "from": "InputMapper.userId", 
          "to": "processedUserId"
        }
      ]
    }
  }
}
```

### Custom Functions in Mappers

The mapper middleware supports custom functions through the `functionRegistry`. **Note: No functions are provided by default** - you must define and register your own functions.

#### Setting up Function Registry

To use functions in mappers, you must provide a `functionRegistry` in the tools object:

```typescript
// Define your custom functions
const functionRegistry = {
  mockValue: (value: any, fallback: any) => {
    return value || fallback;
  },
  getCurrentTimestamp: () => {
    return Date.now();
  },
  setStatus: (status: string) => {
    return status;
  },
  conditionalValue: (condition: any, value: any) => {
    return condition ? value : undefined;
  },
  toUpperCase: (text: string) => {
    return text ? text.toString().toUpperCase() : '';
  },
  toLowerCase: (text: string) => {
    return text ? text.toString().toLowerCase() : '';
  }
};

// Pass it in tools when running flows
const tools = {
  logger: yourLogger,
  functionRegistry  // ← Required for function support
};

await orchestrator.runFlow(flowConfig, input, tools);
```

#### Using Functions in Mapper Configuration

Once you have a `functionRegistry` configured, you can use functions in mapper configurations:

```json
{
  "type": "mapper",
  "name": "DataProcessor",
  "options": {
    "mapping": [
      {
        "fn": "mockValue({{userId}}, 'default-user')",
        "to": "validatedUser"
      },
      {
        "fn": "getCurrentTimestamp()",
        "to": "processedAt"
      },
      {
        "fn": "setStatus('PROCESSED')",
        "to": "status"
      },
      {
        "fn": "conditionalValue({{highPriority}}, {{lowPriority}})",
        "to": "finalPriority"
      }
    ]
  }
}
```

#### Function Behavior

- **Without functionRegistry**: Functions will fail silently and return `undefined`
- **With functionRegistry**: Functions will execute as defined
- **Missing functions**: If a function is not found in the registry, it returns `undefined`

#### Example Function Implementations

Here are some commonly useful functions you might want to implement:

```typescript
const functionRegistry = {
  // Basic utility functions
  mockValue: (value: any, fallback: any) => value || fallback,
  getCurrentTimestamp: () => Date.now(),
  setStatus: (status: string) => status,
  
  // String manipulation
  toUpperCase: (text: string) => text?.toString().toUpperCase() || '',
  toLowerCase: (text: string) => text?.toString().toLowerCase() || '',
  trim: (text: string) => text?.toString().trim() || '',
  
  // Conditional logic
  conditionalValue: (condition: any, trueValue: any, falseValue: any = null) => {
    return condition ? trueValue : falseValue;
  },
  
  // Type conversion
  toNumber: (value: any) => Number(value) || 0,
  toString: (value: any) => String(value || ''),
  toBoolean: (value: any) => Boolean(value),
  
  // Array/object helpers
  arrayLength: (arr: any[]) => Array.isArray(arr) ? arr.length : 0,
  objectKeys: (obj: object) => Object.keys(obj || {}),
  
  // Date helpers
  formatDate: (timestamp: number, format: string = 'ISO') => {
    const date = new Date(timestamp);
    return format === 'ISO' ? date.toISOString() : date.toLocaleDateString();
  }
};
```

#### Complete Example with Functions

Here's a complete example showing how to use custom functions in a real workflow:

```typescript
import { Orchestrator } from 'arpegium-js';

// 1. Define your function registry
const functionRegistry = {
  // Data validation
  validateEmail: (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },
  
  // Data transformation
  formatPhoneNumber: (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    return cleaned.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3');
  },
  
  // Business logic
  calculateDiscount: (amount: number, customerType: string) => {
    const discounts = { premium: 0.15, standard: 0.05, basic: 0 };
    return amount * (discounts[customerType] || 0);
  },
  
  // Utility functions
  getCurrentTimestamp: () => Date.now(),
  generateId: () => `usr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
};

// 2. Create orchestrator and tools
const orchestrator = new Orchestrator();
const tools = {
  logger: console, // or your custom logger
  functionRegistry
};

// 3. Define your flow
const userProcessingFlow = {
  name: "user-processing-flow",
  middlewares: [
    {
      type: "mapper",
      name: "DataValidator",
      options: {
        output: false,
        mapping: [
          {
            fn: "validateEmail({{body.email}})",
            to: "isEmailValid"
          },
          {
            fn: "generateId()",
            to: "userId"
          }
        ]
      }
    },
    {
      type: "mapper",
      name: "DataProcessor",
      options: {
        output: true,
        mapping: [
          {
            origin: "globals",
            from: "DataValidator.userId",
            to: "id"
          },
          {
            origin: "body",
            from: "email",
            to: "email"
          },
          {
            fn: "formatPhoneNumber({{body.phone}})",
            to: "formattedPhone"
          },
          {
            fn: "calculateDiscount({{body.orderAmount}}, {{body.customerType}})",
            to: "discount"
          },
          {
            fn: "getCurrentTimestamp()",
            to: "processedAt"
          }
        ]
      }
    }
  ]
};

// 4. Run the flow
const input = {
  body: {
    email: "user@example.com",
    phone: "1234567890",
    orderAmount: 100,
    customerType: "premium"
  },
  headers: {},
  env: {}
};

const result = await orchestrator.runFlow(userProcessingFlow, input, tools);
console.log(result);
// Output:
// {
//   id: "usr_1753327334794_k2j3h4g5f",
//   email: "user@example.com", 
//   formattedPhone: "(123) 456-7890",
//   discount: 15,
//   processedAt: 1753327334794
// }
```

#### Important Notes

⚠️ **Function Registry Requirements:**
- Functions are **NOT provided by default** - you must implement them yourself
- Without `functionRegistry` in tools, function calls will return `undefined`
- Missing functions in the registry will also return `undefined`
- Function errors are not automatically caught - implement error handling in your functions

⚠️ **Function Execution Context:**
- Functions receive interpolated values as arguments
- Functions are executed synchronously
- Functions should be pure (no side effects recommended)
- Functions have access to the interpolated context but not the full middleware context

### Debug Middleware

Use the debug middleware to inspect flow execution:

```json
{
  "type": "debug",
  "name": "DebugPoint",
  "options": {
    "point": "before-conditional-logic",
    "stopExecution": false
  }
}
```

This will log the current context state and optionally stop execution for debugging.

## Error Handling and Blocking Middleware

Arpegium JS provides sophisticated error handling through blocking and non-blocking middleware configurations.

### Blocking vs Non-Blocking Middleware

#### Blocking Middleware (Default)
When a middleware has `blocking: true` (default behavior), any error will immediately stop the flow execution:

```json
{
  "type": "validator",
  "name": "CriticalValidation",
  "options": {
    "origin": "body",
    "schema": { /* schema */ },
    "blocking": true  // This is the default
  }
}
```

#### Non-Blocking Middleware
When a middleware has `blocking: false`, errors are collected but don't stop execution:

```json
{
  "type": "validator",
  "name": "OptionalValidation",
  "options": {
    "origin": "body",
    "schema": { /* schema */ },
    "blocking": false  // Continue on error
  }
}
```

### Error Collection
Non-blocking errors are collected in the final response under `nonBlockingErrors`:

```typescript
// Example response with non-blocking errors
{
  "result": { /* successful flow output */ },
  "nonBlockingErrors": [
    {
      "middleware": "OptionalValidation",
      "error": "Validation failed",
      "details": { /* error details */ }
    }
  ]
}
```

### Mixed Error Handling
You can combine blocking and non-blocking middleware in the same flow:

```json
{
  "sequence": [
    {
      "type": "validator",
      "name": "CriticalValidation",
      "options": { "blocking": true }  // Must pass
    },
    {
      "type": "httpRequest", 
      "name": "OptionalEnrichment",
      "options": { "blocking": false } // Can fail
    },
    {
      "type": "mapper",
      "name": "FinalMapping",
      "options": { "blocking": true }   // Must pass
    }
  ]
}
```

## Creating Custom Middlewares

### Basic Middleware Structure

```typescript
import { createMiddleware } from 'arpegium-js';

export const myCustomMiddleware = createMiddleware(async (ctx, mw, tools, span) => {
  // Access middleware options
  const options = mw.options || {};
  
  // Access context data
  const inputData = ctx.input;
  const globals = ctx.globals;
  
  // Use tools (logger, tracer, functions)
  if (tools?.logger) {
    tools.logger.info({ message: 'Processing custom middleware' });
  }
  
  try {
    // Your business logic here
    const result = await processData(inputData, options);
    
    // Save to globals for other middlewares
    if (mw.name) {
      ctx.globals = ctx.globals || {};
      ctx.globals[mw.name] = result;
    }
    
    // Set output (optional)
    const shouldOutput = options.output !== false;
    if (shouldOutput) {
      ctx.output = result;
    }
    
    return { ctx, status: "success" };
    
  } catch (error) {
    return {
      ctx,
      status: "failed",
      error: `Custom middleware failed: ${error.message}`
    };
  }
});
```

### Advanced Middleware with HTTP Requests

```typescript
import { createMiddleware } from 'arpegium-js';
import { interpolate } from 'arpegium-js';

export const apiClientMiddleware = createMiddleware(async (ctx, mw, tools) => {
  const options = mw.options || {};
  
  // Interpolate URL with context data
  const url = interpolate(options.url, ctx);
  const headers = interpolate(options.headers || {}, ctx);
  
  const fetch = require('node-fetch');
  
  try {
    const response = await fetch(url, {
      method: options.method || 'GET',
      headers,
      body: options.body ? JSON.stringify(interpolate(options.body, ctx)) : undefined
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Save to globals
    if (mw.name) {
      ctx.globals = ctx.globals || {};
      ctx.globals[mw.name] = data;
    }
    
    if (tools?.logger) {
      tools.logger.info({
        message: `API request successful for ${mw.name}`,
        response: data
      });
    }
    
    return { ctx, status: "success" };
    
  } catch (error) {
    if (tools?.logger) {
      tools.logger.error({
        message: `API request failed: ${error.message}`,
        request: { url, headers }
      });
    }
    
    return {
      ctx,
      status: "failed",
      error: `API request failed: ${error.message}`
    };
  }
});
```

## Type Definitions

### Core Interfaces

```typescript
export interface MiddlewareContext {
  input: Record<string, any>;
  globals: Record<string, any>;
  output?: Record<string, any>;
}

export interface MiddlewareResult {
  ctx: MiddlewareContext;
  status: "success" | "failed" | "skipped";
  error?: any;
  meta?: Record<string, any>;
}

export interface MiddlewareConfig {
  type: string;
  name: string;
  options?: Record<string, any>;
  blocking?: boolean;
}

export interface FlowConfig {
  name: string;
  middlewares: MiddlewareConfig[];
  errorHandler?: FlowErrorHandler | FlowErrorHandlerConfig;
}

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

export type MiddlewareFunction = (
  ctx: MiddlewareContext,
  mwConfig: MiddlewareConfig,
  tools?: ITools,
  span?: any
) => Promise<MiddlewareResult>;
```

### Orchestrator Configuration

```typescript
export interface OrchestratorConfig {
  middlewareRegistry?: Record<string, MiddlewareFunction>;
  functionRegistry?: Record<string, Function>;
  logger?: ILogger;
  tracer?: ITracer;
  traceWithObservability?: (name: string, fn: (span?: any) => any, parentSpan?: any) => Promise<any>;
}
```

## Execution Tree Visualization

Arpegium JS provides a powerful execution tree feature that shows you exactly how your flow executed, with timing information and hierarchical structure.

### Execution Tree Output

When your flow completes, you'll see a detailed execution tree in the logs:

```
--- Middleware Execution Tree ---
InputMapper [mapper] (✓) (1ms)
>> sequence (24ms)
|  || parallel (0ms)
|  |  UserValidation [validator] (✓) (0ms)
|  |  AmountValidation [validator] (✓) (0ms)
|  DebugBeforeConditional [debug] (✓) (22ms)
|  ?? conditional (2ms)
|  |  >> sequence (1ms)
|  |  |  HighAmountProcess [mapper] (✓) (0ms)
|  |  |  ?? conditional (0ms)
TransferValidation [mapper] (✓) (0ms)
DebugPoint [debug] (✓) (0ms)
FinalResponse [mapper] (✓) (0ms)

Total flow duration: 25ms
-------------------------------
```

### Tree Structure Legend

- `||` - Parallel execution block
- `>>` - Sequential execution block
- `??` - Conditional execution block
- `|` - Indentation level (shows nesting depth)
- `✓` - Successful execution
- `✗` - Failed execution
- `⏳` - Currently running
- `(Xms)` - Execution duration in milliseconds

### Features

- **Hierarchical Visualization**: Shows the exact nesting structure of your flow
- **Temporal Ordering**: Middlewares appear in the order they were executed
- **Performance Insights**: See execution times for each step and control structure
- **Visual Clarity**: Pipe symbols clearly show the relationship between parent and child elements
- **Asynchronous Logging**: Tree generation doesn't impact your API response times

## Development Guide

### Project Structure
