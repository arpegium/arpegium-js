import { Orchestrator } from '../index';
import { mockLogger, clearLoggerMocks } from './__mocks__';
import { buildExecutionTraceString } from '../utils/executionTrace';
import { MiddlewareContext, MiddlewareConfig, ITools, MiddlewareResult } from '../core/types';

describe('Retry Middleware Tests', () => {
  let orchestrator: Orchestrator;
  let mockExecuteStep: jest.Mock;
  const tools = { 
    logger: mockLogger
  };

  beforeEach(() => {
    orchestrator = new Orchestrator();
    clearLoggerMocks();
    mockExecuteStep = jest.fn();
  });

  test('should retry specified number of times and succeed eventually', async () => {
    // Mock para simular un paso que falla los primeros intentos pero luego tiene éxito
    let attempts = 0;
    mockExecuteStep.mockImplementation(() => {
      attempts++;
      if (attempts < 3) {
        return {
          ctx: { input: {}, globals: {} },
          status: "failed",
          error: { message: "Simulated failure", type: "TransientError" }
        };
      }
      return {
        ctx: { input: { success: true }, globals: {} },
        status: "success"
      };
    });

    // Preparar el flow
    const retryFlow = {
      name: "retry-test-flow",
      middlewares: [
        {
          type: "retry",
          name: "RetryMiddleware",
          options: {
            maxAttempts: 5,
            interval: 0.01, // Usar un intervalo pequeño para que el test sea rápido
            backoffRate: 2,
            jitter: 0.1,
            errors: ["TransientError", "NetworkError"],
            step: {
              type: "custom",
              name: "StepToRetry"
            }
          }
        }
      ]
    };

    // Mock para runFlow - necesitamos simular que no arroja excepciones para los tests
    jest.spyOn(orchestrator, 'runFlow').mockImplementation(async () => {
      // Ejecutar el middleware directamente
      const originalMiddleware = orchestrator['middlewares'].get('retry');
      const result = await originalMiddleware(
        { input: {}, globals: {} },
        retryFlow.middlewares[0],
        {
          ...tools,
          executeStep: mockExecuteStep
        }
      );
      
      return result.ctx;
    });
    
    // Ejecutar el flow
    const result = await orchestrator.runFlow(retryFlow, { input: {} }, tools);
    
    // Verificar resultados
    expect(mockExecuteStep).toHaveBeenCalledTimes(3);
    
    // Verificar logs
    expect(mockLogger.info).toHaveBeenCalledWith(expect.objectContaining({
      message: expect.stringContaining('Retry attempt 1 failed')
    }));
    expect(mockLogger.info).toHaveBeenCalledWith(expect.objectContaining({
      message: expect.stringContaining('Retry attempt 2 failed')
    }));
    expect(mockLogger.info).toHaveBeenCalledWith(expect.objectContaining({
      message: expect.stringContaining('Retry step succeeded on attempt 3')
    }));
  });

  test('should not retry for non-retryable error types', async () => {
    // Mock para simular un paso que falla con un error no retryable
    mockExecuteStep.mockImplementation(() => {
      return {
        ctx: { input: {}, globals: {} },
        status: "failed",
        error: { message: "Permission denied", type: "PermissionError" }
      };
    });

    // Preparar el flow
    const retryFlow = {
      name: "retry-test-flow",
      middlewares: [
        {
          type: "retry",
          name: "RetryMiddleware",
          options: {
            maxAttempts: 3,
            interval: 0.01,
            errors: ["TransientError", "NetworkError"], // Solo reintentar estos errores
            step: {
              type: "custom",
              name: "StepToRetry"
            }
          }
        }
      ]
    };

    // Ejecutar el middleware directamente
    const originalMiddleware = orchestrator['middlewares'].get('retry');
    const result = await originalMiddleware(
      { input: {}, globals: {} },
      retryFlow.middlewares[0],
      {
        ...tools,
        executeStep: mockExecuteStep
      }
    );
    
    // Verificar resultados
    expect(mockExecuteStep).toHaveBeenCalledTimes(1); // Solo debería haber un intento
    expect(result.status).toBe('failed');
    
    // Verificar logs
    expect(mockLogger.info).toHaveBeenCalledWith(expect.objectContaining({
      message: expect.stringContaining('Error type \'PermissionError\' is not configured for retry')
    }));
  });

  test('should respect maxAttempts and give up after reaching limit', async () => {
    // Mock para simular un paso que siempre falla
    mockExecuteStep.mockImplementation(() => {
      return {
        ctx: { input: {}, globals: {} },
        status: "failed",
        error: { message: "Network unavailable", type: "NetworkError" }
      };
    });

    // Preparar el flow
    const retryFlow = {
      name: "retry-test-flow",
      middlewares: [
        {
          type: "retry",
          name: "RetryMiddleware",
          options: {
            maxAttempts: 3,
            interval: 0.01,
            errors: ["NetworkError"],
            step: {
              type: "custom",
              name: "StepToRetry"
            }
          }
        }
      ]
    };
    
    // Ejecutar el middleware directamente
    const originalMiddleware = orchestrator['middlewares'].get('retry');
    const result = await originalMiddleware(
      { input: {}, globals: {} },
      retryFlow.middlewares[0],
      {
        ...tools,
        executeStep: mockExecuteStep
      }
    );
    
    // Verificar resultados
    expect(mockExecuteStep).toHaveBeenCalledTimes(3); // Debería haber intentado 3 veces
    expect(result.status).toBe('failed');
    
    // Verificar logs
    expect(mockLogger.info).toHaveBeenCalledWith(expect.objectContaining({
      message: expect.stringContaining('Retry attempt 1 failed')
    }));
    expect(mockLogger.info).toHaveBeenCalledWith(expect.objectContaining({
      message: expect.stringContaining('Retry attempt 2 failed')
    }));
    expect(mockLogger.error).toHaveBeenCalledWith(expect.objectContaining({
      message: expect.stringContaining('Retry middleware failed after')
    }));
  });

  test('should properly include retry metadata in execution trace', async () => {
    // Mock para simular un paso que falla los primeros intentos pero luego tiene éxito
    let attempts = 0;
    mockExecuteStep.mockImplementation(() => {
      attempts++;
      if (attempts < 3) {
        return {
          ctx: { input: {}, globals: {} },
          status: "failed",
          error: { message: "Simulated failure", type: "TransientError" }
        };
      }
      return {
        ctx: { input: { success: true }, globals: {} },
        status: "success"
      };
    });

    // Preparar el flow
    const retryFlow = {
      name: "retry-trace-test",
      middlewares: [
        {
          type: "retry",
          name: "RetryWithTrace",
          options: {
            maxAttempts: 5,
            interval: 0.01,
            step: {
              type: "custom",
              name: "StepToRetry"
            }
          }
        }
      ]
    };
    
    // Crear un mock de trace para el contexto
    const ctx = { 
      input: {}, 
      globals: {}, 
      _internal: {}
    };
    
    // Ejecutar el middleware directamente
    const originalMiddleware = orchestrator['middlewares'].get('retry');
    const result = await originalMiddleware(
      ctx,
      retryFlow.middlewares[0],
      {
        ...tools,
        executeStep: mockExecuteStep
      }
    );
    
    // Verificar que el resultado tiene metadatos
    expect(result.meta).toBeDefined();
    expect(result.meta?.retryAttempts).toBe(3);
    expect(result.meta?.retryInfo).toBeDefined();
    expect(result.meta?.retryInfo.attempts.length).toBe(3);
    
    // Verificar que el contexto tiene la información de reintentos
    expect(ctx._internal).toBeDefined();
    
    // Crear un trace simulado
    const mockTrace = {
      name: 'RetryWithTrace',
      type: 'retry',
      status: 'success',
      meta: result.meta
    };
    
    // Verificar que el trace se formatea correctamente
    const traceString = buildExecutionTraceString([mockTrace]);
    expect(traceString).toContain('RetryWithTrace');
    
    // Verificar los logs
    expect(mockLogger.info).toHaveBeenCalledWith(expect.objectContaining({
      message: expect.stringContaining('Retry attempt 1 failed')
    }));
    expect(mockLogger.info).toHaveBeenCalledWith(expect.objectContaining({
      message: expect.stringContaining('Retry attempt 2 failed')
    }));
    expect(mockLogger.info).toHaveBeenCalledWith(expect.objectContaining({
      message: expect.stringContaining('Retry step succeeded on attempt 3')
    }));
  });
});
