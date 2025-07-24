import { Orchestrator } from 'orchestjs';

// Ejemplo de uso básico
async function basicExample() {
  const orchestrator = new Orchestrator();
  
  // Flujo simple de ejemplo
  const flow = {
    name: "ejemplo-basico",
    middlewares: [
      {
        type: "mapper",
        name: "InputMapper",
        options: {
          mapping: [
            {
              origin: "body",
              from: "user",
              to: "userId"
            }
          ]
        }
      },
      {
        type: "validator",
        name: "UserValidator",
        options: {
          schema: {
            userId: { type: "string", required: true }
          }
        }
      }
    ]
  };

  const input = {
    body: { user: "123" },
    headers: {},
    env: {}
  };

  try {
    const result = await orchestrator.runFlow(flow, input, {});
    console.log('Resultado:', result);
  } catch (error) {
    console.error('Error:', error);
  }
}

// Ejemplo con Express Server
import express from 'express';

function createExpressApp() {
  const app = express();
  
  // Middleware para parsear JSON
  app.use(express.json());
  
  // Crear instancia del orchestrator
  const orchestrator = new Orchestrator();
  
  // Registrar middlewares personalizados si es necesario
  orchestrator.registerMiddleware('customAuth', async (ctx, mw, tools) => {
    // Ejemplo de middleware de autenticación personalizado
    const token = ctx.input.headers?.authorization;
    if (!token) {
      return {
        ctx,
        status: "failed",
        error: "Missing authorization token"
      };
    }
    
    // Simular validación de token
    const isValid = token.startsWith('Bearer ');
    if (!isValid) {
      return {
        ctx,
        status: "failed", 
        error: "Invalid token format"
      };
    }
    
    // Agregar información del usuario al contexto
    if (mw.name) {
      ctx.globals = ctx.globals || {};
      ctx.globals[mw.name] = { 
        userId: 'user-123',
        permissions: ['read', 'write']
      };
    }
    
    return { ctx, status: "success" };
  });

  // Logger simple para el ejemplo
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
      // Construir input del contexto de Express
      const input = {
        body: req.body,
        headers: req.headers,
        pathParameters: req.params,
        queryStringParameters: req.query,
        method: req.method,
        url: req.url,
        env: process.env
      };

      // Tools disponibles para los middlewares
      const tools = {
        logger,
        // Agregar más herramientas según necesidad
        functionRegistry: {
          // Funciones personalizadas disponibles en mappers
          getCurrentUser: () => input.headers?.['x-user-id'] || 'anonymous',
          formatCurrency: (amount: number) => new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: 'ARS'
          }).format(amount)
        }
      };

      // Cargar configuración del flujo
      const flow = await loadFlowConfig(flowName);
      
      if (!flow) {
        return res.status(404).json({
          error: `Flow '${flowName}' not found`,
          availableFlows: ['user-registration', 'transaction-validation', 'payment-processing']
        });
      }

      // Ejecutar el flujo
      const result = await orchestrator.runFlow(flow, input, tools);

      // Responder con el resultado
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
        error: error.message,
        request: {
          body: req.body,
          headers: req.headers,
          params: req.params
        }
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
        },
        {
          name: 'payment-processing',
          description: 'Procesamiento de pagos',
          method: 'POST', 
          endpoint: '/api/flows/payment-processing'
        }
      ]
    });
  });

  // Endpoint de health check
  app.get('/health', (req, res) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'orchestjs-express-server'
    });
  });

  return app;
}

// Función para cargar configuración de flujos
async function loadFlowConfig(flowName: string) {
  // En un caso real, esto podría cargar desde:
  // - Base de datos
  // - Sistema de archivos
  // - Servicio externo
  // - Cache Redis
  
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
              type: 'httpRequest',
              name: 'CheckEmailExists',
              options: {
                url: 'https://api.example.com/users/check-email',
                method: 'POST',
                body: { email: '{{body.email}}' }
              }
            },
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
            condition: '{{transactionAmount}} > 1000',
            then: {
              sequence: [
                {
                  type: 'mapper',
                  name: 'HighAmountProcess',
                  options: {
                    mapping: [
                      { value: 'BLOCKED', to: 'riskStatus' },
                      { value: 'HIGH_RISK', to: 'riskLevel' }
                    ]
                  }
                },
                {
                  type: 'httpRequest',
                  name: 'NotifyRiskTeam',
                  options: {
                    url: 'https://api.example.com/risk/notify',
                    method: 'POST',
                    body: {
                      userId: '{{userId}}',
                      amount: '{{transactionAmount}}',
                      riskLevel: 'HIGH'
                    }
                  }
                }
              ]
            },
            else: {
              type: 'mapper',
              name: 'LowAmountProcess',
              options: {
                mapping: [
                  { value: 'APPROVED', to: 'riskStatus' },
                  { value: 'LOW_RISK', to: 'riskLevel' }
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
              { fn: 'conditionalValue({{HighAmountProcess.riskStatus}}, {{LowAmountProcess.riskStatus}})', to: 'status' },
              { fn: 'conditionalValue({{HighAmountProcess.riskLevel}}, {{LowAmountProcess.riskLevel}})', to: 'riskLevel' },
              { fn: 'getCurrentTimestamp()', to: 'validatedAt' }
            ]
          }
        }
      ]
    }
  };

  return flows[flowName] || null;
}

// Iniciar servidor si este archivo se ejecuta directamente
if (require.main === module) {
  const app = createExpressApp();
  const PORT = process.env.PORT || 3000;
  
  app.listen(PORT, () => {
    console.log(`🚀 OrchestJS Express Server running on port ${PORT}`);
    console.log(`📋 Available endpoints:`);
    console.log(`   GET  http://localhost:${PORT}/health`);
    console.log(`   GET  http://localhost:${PORT}/api/flows`);
    console.log(`   POST http://localhost:${PORT}/api/flows/:flowName`);
    console.log(`\n💡 Example request:`);
    console.log(`   curl -X POST http://localhost:${PORT}/api/flows/user-registration \\`);
    console.log(`     -H "Content-Type: application/json" \\`);
    console.log(`     -H "Authorization: Bearer your-token" \\`);
    console.log(`     -d '{"email":"user@example.com","password":"password123","name":"John Doe"}'`);
  });
  
  // También ejecutar el ejemplo básico
  basicExample();
}

// Ejemplo con Lambda (AWS)
import { APIGatewayProxyHandler } from "aws-lambda";

export const lambdaHandler: APIGatewayProxyHandler = async (event) => {
  const orchestrator = new Orchestrator();
  
  // Registrar middlewares personalizados
  orchestrator.registerMiddleware('customMiddleware', (context, options) => {
    // Tu lógica personalizada
    return context;
  });

  const input = {
    body: event.body ? JSON.parse(event.body) : {},
    headers: event.headers || {},
    pathParameters: event.pathParameters || {},
    queryStringParameters: event.queryStringParameters || {},
    env: process.env
  };

  try {
    // Cargar flujo desde archivo o base de datos
    const flow = loadFlow(event.pathParameters?.flowname || 'default');
    
    const result = await orchestrator.runFlow(flow, input);
    
    return {
      statusCode: 200,
      body: JSON.stringify(result),
      headers: {
        'Content-Type': 'application/json'
      }
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};

function loadFlow(flowName: string) {
  // Implementar carga de flujo
  // Puede ser desde filesystem, S3, base de datos, etc.
}

if (require.main === module) {
  basicExample();
}
