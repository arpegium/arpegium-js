# Arpegium JS Examples

This directory contains practical examples of how to use Arpegium JS in different environments.

## Available Examples

### 1. Basic Usage (`usage-example.ts`)
Basic example showing how to use Arpegium JS with simple flows.

### 2. Express Server (`express-server.ts`)
Complete Express.js server integration with dynamic flow execution.

### 3. AWS Lambda (`lambda-integration.ts`)
AWS Lambda handler integration example.

## Running the Examples

### Express Server Example

1. **Install dependencies:**
   ```bash
   npm install express @types/express arpegium-js
   ```

2. **Run the server:**
   ```bash
   npx ts-node examples/express-server.ts
   ```

3. **Test the endpoints:**

   **Health Check:**
   ```bash
   curl http://localhost:3000/health
   ```

   **List Available Flows:**
   ```bash
   curl http://localhost:3000/api/flows
   ```

   **Execute User Registration Flow:**
   ```bash
   curl -X POST http://localhost:3000/api/flows/user-registration \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer your-token" \
     -d '{
       "email": "user@example.com",
       "password": "password123",
       "name": "John Doe"
     }'
   ```

   **Execute Transaction Validation Flow:**
   ```bash
   # High amount transaction (will be blocked)
   curl -X POST http://localhost:3000/api/flows/transaction-validation \
     -H "Content-Type: application/json" \
     -d '{
       "amount": 1500,
       "type": "transfer", 
       "userId": "user-123"
     }'

   # Low amount transaction (will be approved)
   curl -X POST http://localhost:3000/api/flows/transaction-validation \
     -H "Content-Type: application/json" \
     -d '{
       "amount": 500,
       "type": "payment",
       "userId": "user-123"
     }'
   ```

### AWS Lambda Example

1. **Install dependencies:**
   ```bash
   npm install aws-lambda @types/aws-lambda arpegium-js
   ```

2. **Deploy using your preferred method:**
   - AWS SAM
   - Serverless Framework
   - AWS CDK
   - Manual deployment

### Basic Usage Example

```bash
npx ts-node examples/usage-example.ts
```

## Flow Configuration Examples

### User Registration Flow
```json
{
  "name": "user-registration",
  "middlewares": [
    {
      "type": "customAuth",
      "name": "AuthCheck"
    },
    {
      "type": "validator", 
      "name": "InputValidation",
      "options": {
        "origin": "body",
        "schema": {
          "type": "object",
          "properties": {
            "email": { "type": "string", "format": "email" },
            "password": { "type": "string", "minLength": 8 },
            "name": { "type": "string", "minLength": 2 }
          },
          "required": ["email", "password", "name"]
        }
      }
    },
    {
      "parallel": [
        {
          "type": "mapper",
          "name": "PrepareUserData",
          "options": {
            "mapping": [
              { "origin": "body", "from": "email", "to": "userEmail" },
              { "origin": "body", "from": "name", "to": "userName" },
              { "fn": "getCurrentTimestamp()", "to": "createdAt" }
            ]
          }
        },
        {
          "type": "mapper",
          "name": "GenerateId", 
          "options": {
            "mapping": [
              { "fn": "mockValue('user-' + Date.now(), 'user-default')", "to": "userId" }
            ]
          }
        }
      ]
    },
    {
      "type": "mapper",
      "name": "FinalResponse",
      "options": {
        "output": true,
        "mapping": [
          { "origin": "globals", "from": "PrepareUserData.userEmail", "to": "email" },
          { "origin": "globals", "from": "PrepareUserData.userName", "to": "name" },
          { "origin": "globals", "from": "GenerateId.userId", "to": "userId" },
          { "origin": "globals", "from": "PrepareUserData.createdAt", "to": "registeredAt" },
          { "value": "USER_REGISTERED", "to": "status" }
        ]
      }
    }
  ]
}
```

### Transaction Validation Flow
```json
{
  "name": "transaction-validation",
  "middlewares": [
    {
      "type": "mapper",
      "name": "InputMapper",
      "options": {
        "mapping": [
          { "origin": "body", "from": "amount", "to": "transactionAmount" },
          { "origin": "body", "from": "type", "to": "transactionType" },
          { "origin": "body", "from": "userId", "to": "userId" }
        ]
      }
    },
    {
      "conditional": {
        "condition": "{{InputMapper.transactionAmount}} > 1000",
        "then": {
          "type": "mapper",
          "name": "HighAmountProcess",
          "options": {
            "mapping": [
              { "value": "BLOCKED", "to": "riskStatus" },
              { "value": "HIGH_RISK", "to": "riskLevel" },
              { "value": "MANUAL_REVIEW_REQUIRED", "to": "action" }
            ]
          }
        },
        "else": {
          "type": "mapper", 
          "name": "LowAmountProcess",
          "options": {
            "mapping": [
              { "value": "APPROVED", "to": "riskStatus" },
              { "value": "LOW_RISK", "to": "riskLevel" },
              { "value": "AUTO_APPROVED", "to": "action" }
            ]
          }
        }
      }
    },
    {
      "type": "mapper",
      "name": "FinalValidation",
      "options": {
        "output": true,
        "mapping": [
          { "origin": "globals", "from": "InputMapper.userId", "to": "userId" },
          { "origin": "globals", "from": "InputMapper.transactionAmount", "to": "amount" },
          { "origin": "globals", "from": "InputMapper.transactionType", "to": "type" },
          { "fn": "conditionalValue({{HighAmountProcess.riskStatus}}, {{LowAmountProcess.riskStatus}})", "to": "status" },
          { "fn": "conditionalValue({{HighAmountProcess.riskLevel}}, {{LowAmountProcess.riskLevel}})", "to": "riskLevel" },
          { "fn": "conditionalValue({{HighAmountProcess.action}}, {{LowAmountProcess.action}})", "to": "action" },
          { "fn": "getCurrentTimestamp()", "to": "validatedAt" }
        ]
      }
    }
  ]
}
```

## Custom Middleware Examples

### Authentication Middleware
```typescript
orchestrator.registerMiddleware('customAuth', async (ctx, mw, tools) => {
  const token = ctx.input.headers?.authorization;
  if (!token) {
    return {
      ctx,
      status: "failed",
      error: "Missing authorization token"
    };
  }
  
  const isValid = token.startsWith('Bearer ');
  if (!isValid) {
    return {
      ctx,
      status: "failed", 
      error: "Invalid token format"
    };
  }
  
  if (mw.name) {
    ctx.globals = ctx.globals || {};
    ctx.globals[mw.name] = { 
      userId: 'user-123',
      permissions: ['read', 'write']
    };
  }
  
  return { ctx, status: "success" };
});
```

### Database Middleware
```typescript
orchestrator.registerMiddleware('database', async (ctx, mw, tools) => {
  const options = mw.options || {};
  const { operation, table, data, where } = options;
  
  try {
    let result;
    switch (operation) {
      case 'create':
        result = await db.insert(table, data);
        break;
      case 'read':
        result = await db.select(table, where);
        break;
      case 'update':
        result = await db.update(table, data, where);
        break;
      case 'delete':
        result = await db.delete(table, where);
        break;
      default:
        throw new Error(`Unknown database operation: ${operation}`);
    }
    
    if (mw.name) {
      ctx.globals = ctx.globals || {};
      ctx.globals[mw.name] = result;
    }
    
    return { ctx, status: "success" };
  } catch (error) {
    return {
      ctx,
      status: "failed",
      error: `Database operation failed: ${error.message}`
    };
  }
});
```

## Production Considerations

1. **Error Handling**: Implement comprehensive error handling and logging
2. **Security**: Validate and sanitize all inputs
3. **Performance**: Consider caching flow configurations
4. **Monitoring**: Add metrics and observability
5. **Configuration**: Store flow configs in external storage (DB, S3, etc.)
6. **Authentication**: Implement proper authentication and authorization
7. **Rate Limiting**: Add rate limiting for API endpoints
