// Ejemplo de integración de Arpegium JS con Express Server
// npm install express @types/express arpegium-js

import express from 'express';
import { Orchestrator } from 'arpegium-js';

function createExpressApp() {
  const app = express();
  
  // Middleware para parsear JSON
  app.use(express.json());
  
  // Crear instancia del orchestrator
  const orchestrator = new Orchestrator();
  
  // Registrar middlewares personalizados
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

  // Logger simple
  const logger = {
    info: (data: any) => console.log('[INFO]', JSON.stringify(data, null, 2)),
    error: (data: any) => console.error('[ERROR]', JSON.stringify(data, null, 2)),
    warn: (data: any) => console.warn('[WARN]', JSON.stringify(data, null, 2)),
    debug: (data: any) => console.debug('[DEBUG]', JSON.stringify(data, null, 2))
  };

  // Endpoint dinámico para ejecutar flujos
  app.post('/api/flows/:flowName', async (req, res) => {
    const { flowName } = req.params;
    
    try {
      const input = {
        body: req.body,
        headers: req.headers,
        pathParameters: req.params,
        queryStringParameters: req.query,
        method: req.method,
        url: req.url,
        env: process.env
      };

      const tools = {
        logger,
        functionRegistry: {
          getCurrentUser: () => input.headers?.['x-user-id'] || 'anonymous',
          formatCurrency: (amount: number) => new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: 'ARS'
          }).format(amount)
        }
      };

      const flow = await loadFlowConfig(flowName);
      
      if (!flow) {
        return res.status(404).json({
          error: `Flow '${flowName}' not found`,
          availableFlows: ['user-registration', 'transaction-validation']
        });
      }

      const result = await orchestrator.runFlow(flow, input, tools);

      res.json({
        success: true,
        flowName,
        result,
        executedAt: new Date().toISOString()
      });

    } catch (error: any) {
      logger.error({
        message: 'Flow execution failed',
        flowName,
        error: error.message
      });

      res.status(500).json({
        success: false,
        error: error.message,
        flowName
      });
    }
  });

  // Endpoint para listar flujos disponibles
  app.get('/api/flows', (req, res) => {
    res.json({
      availableFlows: [
        {
          name: 'user-registration',
          description: 'Registro de usuario con validaciones',
          method: 'POST',
          endpoint: '/api/flows/user-registration'
        },
        {
          name: 'transaction-validation', 
          description: 'Validación de transacciones financieras',
          method: 'POST',
          endpoint: '/api/flows/transaction-validation'
        }
      ]
    });
  });

  // Health check
  app.get('/health', (req, res) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'arpegium-js-express-server'
    });
  });

  return app;
}

// Cargar configuración de flujos
async function loadFlowConfig(flowName: string) {
  const flows: Record<string, any> = {
    'user-registration': {
      name: 'user-registration',
      middlewares: [
        {
          type: 'customAuth',
          name: 'AuthCheck',
          options: {}
        },
        {
          type: 'validator',
          name: 'InputValidation',
          options: {
            origin: 'body',
            schema: {
              type: 'object',
              properties: {
                email: { type: 'string', format: 'email' },
                password: { type: 'string', minLength: 8 },
                name: { type: 'string', minLength: 2 }
              },
              required: ['email', 'password', 'name']
            }
          }
        },
        {
          parallel: [
            {
              type: 'mapper',
              name: 'PrepareUserData',
              options: {
                mapping: [
                  { origin: 'body', from: 'email', to: 'userEmail' },
                  { origin: 'body', from: 'name', to: 'userName' },
                  { fn: 'getCurrentTimestamp()', to: 'createdAt' }
                ]
              }
            },
            {
              type: 'mapper',
              name: 'GenerateId',
              options: {
                mapping: [
                  { fn: 'mockValue("user-" + Date.now(), "user-default")', to: 'userId' }
                ]
              }
            }
          ]
        },
        {
          type: 'mapper',
          name: 'FinalResponse',
          options: {
            output: true,
            mapping: [
              { origin: 'globals', from: 'PrepareUserData.userEmail', to: 'email' },
              { origin: 'globals', from: 'PrepareUserData.userName', to: 'name' },
              { origin: 'globals', from: 'GenerateId.userId', to: 'userId' },
              { origin: 'globals', from: 'PrepareUserData.createdAt', to: 'registeredAt' },
              { value: 'USER_REGISTERED', to: 'status' }
            ]
          }
        }
      ]
    },
    'transaction-validation': {
      name: 'transaction-validation',
      middlewares: [
        {
          type: 'mapper',
          name: 'InputMapper',
          options: {
            mapping: [
              { origin: 'body', from: 'amount', to: 'transactionAmount' },
              { origin: 'body', from: 'type', to: 'transactionType' },
              { origin: 'body', from: 'userId', to: 'userId' }
            ]
          }
        },
        {
          conditional: {
            condition: '{{InputMapper.transactionAmount}} > 1000',
            then: {
              type: 'mapper',
              name: 'HighAmountProcess',
              options: {
                mapping: [
                  { value: 'BLOCKED', to: 'riskStatus' },
                  { value: 'HIGH_RISK', to: 'riskLevel' },
                  { value: 'MANUAL_REVIEW_REQUIRED', to: 'action' }
                ]
              }
            },
            else: {
              type: 'mapper',
              name: 'LowAmountProcess',
              options: {
                mapping: [
                  { value: 'APPROVED', to: 'riskStatus' },
                  { value: 'LOW_RISK', to: 'riskLevel' },
                  { value: 'AUTO_APPROVED', to: 'action' }
                ]
              }
            }
          }
        },
        {
          type: 'mapper',
          name: 'FinalValidation',
          options: {
            output: true,
            mapping: [
              { origin: 'globals', from: 'InputMapper.userId', to: 'userId' },
              { origin: 'globals', from: 'InputMapper.transactionAmount', to: 'amount' },
              { origin: 'globals', from: 'InputMapper.transactionType', to: 'type' },
              { fn: 'conditionalValue({{HighAmountProcess.riskStatus}}, {{LowAmountProcess.riskStatus}})', to: 'status' },
              { fn: 'conditionalValue({{HighAmountProcess.riskLevel}}, {{LowAmountProcess.riskLevel}})', to: 'riskLevel' },
              { fn: 'conditionalValue({{HighAmountProcess.action}}, {{LowAmountProcess.action}})', to: 'action' },
              { fn: 'getCurrentTimestamp()', to: 'validatedAt' }
            ]
          }
        }
      ]
    }
  };

  return flows[flowName] || null;
}

// Iniciar servidor
if (require.main === module) {
  const app = createExpressApp();
  const PORT = process.env.PORT || 3000;
  
  app.listen(PORT, () => {
    console.log(`🚀 Arpegium JS Express Server running on port ${PORT}`);
    console.log(`📋 Available endpoints:`);
    console.log(`   GET  http://localhost:${PORT}/health`);
    console.log(`   GET  http://localhost:${PORT}/api/flows`);
    console.log(`   POST http://localhost:${PORT}/api/flows/:flowName`);
    console.log(`\n💡 Example requests:`);
    console.log(`\n📝 User Registration:`);
    console.log(`curl -X POST http://localhost:${PORT}/api/flows/user-registration \\`);
    console.log(`  -H "Content-Type: application/json" \\`);
    console.log(`  -H "Authorization: Bearer your-token" \\`);
    console.log(`  -d '{"email":"user@example.com","password":"password123","name":"John Doe"}'`);
    console.log(`\n💰 Transaction Validation:`);
    console.log(`curl -X POST http://localhost:${PORT}/api/flows/transaction-validation \\`);
    console.log(`  -H "Content-Type: application/json" \\`);
    console.log(`  -d '{"amount":1500,"type":"transfer","userId":"user-123"}'`);
  });
}

export { createExpressApp, loadFlowConfig };
