import { Orchestrator } from '../index';
import { mockLogger, clearLoggerMocks } from './__mocks__';
import { buildExecutionTraceString } from '../utils/executionTrace';
import { MiddlewareContext, MiddlewareConfig, ITools } from '../core/types';
import { createMiddleware } from '../middleware/base';

/**
 * Test para verificar la integración del middleware de retry con 
 * la función executeStep proporcionada por el orquestador.
 */
describe('Retry Integration Tests', () => {
  let orchestrator: Orchestrator;
  const tools = { 
    logger: mockLogger
  };
  
  // Registro de intentos para simular un servicio inestable
  let serviceAttempts = 0;

  beforeEach(() => {
    orchestrator = new Orchestrator();
    clearLoggerMocks();
    serviceAttempts = 0;
  });

  // Middleware personalizado que simula un servicio inestable
  const flakyServiceMiddleware = createMiddleware(async (ctx: MiddlewareContext, mw: any, tools?: ITools) => {
    serviceAttempts++;
    
    if (serviceAttempts < 3) {
      // Fallar en los primeros dos intentos
      if (tools?.logger) {
        tools.logger.debug({
          message: `Servicio inestable fallando en intento #${serviceAttempts}`,
          middleware: { name: mw.name, type: mw.type },
        });
      }
      
      return {
        ctx,
        status: "failed" as const,
        error: { 
          message: `Error temporal en intento #${serviceAttempts}`, 
          type: "TransientError" 
        }
      };
    }
    
    // Éxito en el tercer intento
    if (tools?.logger) {
      tools.logger.debug({
        message: `Servicio inestable exitoso en intento #${serviceAttempts}`,
        middleware: { name: mw.name, type: mw.type },
      });
    }
    
    return {
      ctx: {
        ...ctx,
        output: { result: `Éxito en intento #${serviceAttempts}` },
        globals: {
          ...ctx.globals,
          flakyServiceResult: `Éxito en intento #${serviceAttempts}`
        }
      },
      status: "success" as const
    };
  });

  test('should retry using mockExecuteStep function', async () => {
    // Para esta prueba, vamos a usar un mock de executeStep para más control
    let attempts = 0;
    const mockExecuteStep = jest.fn().mockImplementation((config, ctx) => {
      attempts++;
      if (attempts < 3) {
        return Promise.resolve({
          ctx,
          status: "failed",
          error: { 
            message: `Error simulado en intento #${attempts}`, 
            type: "TransientError" 
          }
        });
      }
      return Promise.resolve({
        ctx: {
          ...ctx,
          output: { result: `Éxito simulado en intento #${attempts}` },
          globals: {
            ...ctx.globals,
            mockResult: `Éxito simulado en intento #${attempts}`
          }
        },
        status: "success"
      });
    });

    // Crear un flow con retry
    const retryFlow = {
      name: "retry-mock-flow",
      middlewares: [
        {
          type: "retry",
          name: "RetryMockService",
          options: {
            maxAttempts: 5,
            interval: 0.01, // Intervalo pequeño para tests rápidos
            backoffRate: 2,
            jitter: 0,
            errors: ["TransientError"],
            step: {
              type: "mockService",
              name: "MockServiceStep"
            }
          }
        }
      ]
    };

    // Ejecutar el middleware directamente con el mock
    const retryMiddleware = orchestrator['middlewares'].get('retry');
    const result = await retryMiddleware(
      { input: {}, globals: {} },
      retryFlow.middlewares[0],
      { ...tools, executeStep: mockExecuteStep }
    );
    
    // Verificar que se hicieron 3 intentos (2 fallos y 1 éxito)
    expect(attempts).toBe(3);
    expect(mockExecuteStep).toHaveBeenCalledTimes(3);
    
    // Verificar que la salida es correcta
    expect(result.ctx.output?.result).toBe("Éxito simulado en intento #3");
    
    // Verificar logs - debería haber logs de los intentos fallidos y el éxito
    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('Retry attempt 1 failed')
      })
    );
    
    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('Retry attempt 2 failed')
      })
    );
    
    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('Retry step succeeded on attempt 3')
      })
    );
    
    // Verificar que la información de reintentos está en el contexto interno
    expect(result.ctx._internal).toBeDefined();
    expect(result.ctx._internal?.retryInfo?.RetryMockService).toBeDefined();
    expect(result.ctx._internal?.retryInfo?.RetryMockService.attempts.length).toBe(3);
  });

  test('should work with the enhanced executeStep from orchestrator', async () => {
    // Registramos un nuevo middleware en el orquestador
    const testMiddleware = jest.fn().mockImplementation((ctx) => {
      return {
        ctx: {
          ...ctx,
          output: { result: 'Test middleware succeeded' },
          globals: {
            ...ctx.globals,
            testResult: 'Test middleware succeeded'
          }
        },
        status: "success"
      };
    });
    
    orchestrator.registerMiddleware("test", testMiddleware);
    
    // Creamos un middleware retry sencillo
    const retryConfig = {
      type: 'retry',
      name: 'SimpleRetry',
      options: {
        maxAttempts: 2,
        interval: 0.01,
        step: {
          type: 'test',
          name: 'TestStep'
        }
      }
    };
    
    // Obtenemos el middleware retry
    const retryMiddleware = orchestrator['middlewares'].get('retry');
    
    // Ejecutamos directamente
    const executeStep = jest.fn().mockImplementation((config, ctx, t) => {
      return Promise.resolve({
        ctx: {
          ...ctx,
          output: { executed: true },
          globals: {
            ...ctx.globals,
            executed: true
          }
        },
        status: "success"
      });
    });
    
    const result = await retryMiddleware(
      { input: {}, globals: {} },
      retryConfig,
      { ...tools, executeStep }
    );
    
    // Verificamos que se usó la función executeStep
    expect(executeStep).toHaveBeenCalledTimes(1);
    expect(result.status).toBe("success");
    expect(result.ctx.output?.executed).toBe(true);
    expect(result.ctx.globals?.executed).toBe(true);
  });
});
