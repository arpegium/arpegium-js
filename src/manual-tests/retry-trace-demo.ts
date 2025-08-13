/**
 * Script para demostrar el middleware de retry y su visualización en el executionTrace
 * 
 * Este script ejecuta un flujo que utiliza el middleware de retry con un servicio 
 * que fallará inicialmente pero eventualmente tendrá éxito, mostrando cómo se 
 * registran los reintentos en el executionTrace.
 */

import { Orchestrator } from '../index';
import { printExecutionTrace, buildExecutionTraceString } from '../utils/executionTrace';
import { MiddlewareContext, MiddlewareConfig, ITools } from '../core/types';

// Crear un servicio simulado que falla los primeros intentos
let serviceAttempts = 0;
const flakyService = async (ctx: MiddlewareContext) => {
  console.log(`[Flaky Service] Intento #${serviceAttempts + 1}`);
  
  // Fallar los primeros 2 intentos
  if (serviceAttempts < 2) {
    serviceAttempts++;
    throw new Error(`Error temporal en intento #${serviceAttempts}`);
  }
  
  // Éxito en el tercer intento
  console.log('[Flaky Service] ¡Éxito en el intento #3!');
  return { result: 'Operación completada con éxito' };
};

// Crear un logger simple para visualizar el proceso
const logger = {
  debug: (msg: any) => console.log(`[DEBUG] ${typeof msg === 'object' ? JSON.stringify(msg) : msg}`),
  info: (msg: any) => console.log(`[INFO] ${typeof msg === 'object' ? JSON.stringify(msg) : msg}`),
  warn: (msg: any) => console.log(`[WARN] ${typeof msg === 'object' ? JSON.stringify(msg) : msg}`),
  error: (msg: any) => console.log(`[ERROR] ${typeof msg === 'object' ? JSON.stringify(msg) : msg}`),
};

// Middleware personalizado para simular el servicio externo
const customServiceMiddleware = async (
  ctx: MiddlewareContext, 
  mw: MiddlewareConfig, 
  tools: ITools
) => {
  try {
    console.log('[Custom Service Middleware] Ejecutando servicio...');
    const result = await flakyService(ctx);
    return {
      ctx: {
        ...ctx,
        output: result,
        finalResult: result.result // Añadimos esto para facilitar el acceso al resultado final
      },
      status: "success" as const
    };
  } catch (error: any) {
    console.log(`[Custom Service Middleware] Error: ${error.message}`);
    return {
      ctx,
      status: "failed" as const,
      error: {
        message: error.message,
        type: "TransientError"  // Importante: este tipo se usa para retry
      }
    };
  }
};

// Definir el flujo con retry
const retryFlow = {
  name: "retry-demo-flow",
  middlewares: [
    {
      type: "retry",
      name: "RetryService",
      options: {
        maxAttempts: 5,         // Máximo de 5 intentos
        interval: 1,            // Esperar 1 segundo antes del primer reintento
        backoffRate: 2,         // Duplicar el tiempo de espera en cada reintento
        jitter: 0.2,            // Añadir un 20% de jitter al tiempo de espera
        errors: ["TransientError"], // Solo reintentar errores transitorios
        step: {
          type: "customService", // Middleware personalizado que simula un servicio externo
          name: "FlakyExternalService"
        }
      }
    },
    {
      type: "mapper",
      name: "ResultMapper",
      options: {
        mapping: [
          {
            origin: "output",
            from: "result",
            to: "finalResult"
          }
        ]
      }
    }
  ]
};

// Función principal
async function main() {
  try {
    console.log('=== Demo del Middleware de Retry ===\n');
    
    // Crear y configurar el orquestador
    const orchestrator = new Orchestrator();
    
    // Registrar el middleware personalizado
    orchestrator.registerMiddleware("customService", customServiceMiddleware);
    
    // Reemplazar el middleware de retry para que acepte la ejecución directa del paso
    const originalRetryMiddleware = orchestrator['middlewares'].get('retry');
    const wrappedRetryMiddleware = async (
      ctx: MiddlewareContext,
      mw: MiddlewareConfig,
      tools: ITools,
      span?: any
    ) => {
      // Esta es la función que el middleware de retry espera
      const executeStep = async (stepConfig: any, stepCtx: MiddlewareContext, stepTools: ITools, stepSpan?: any) => {
        // Buscar el middleware adecuado según el tipo de paso
        const middleware = orchestrator['middlewares'].get(stepConfig.type);
        if (!middleware) {
          return {
            ctx: stepCtx,
            status: "failed" as const,
            error: {
              message: `Middleware type '${stepConfig.type}' not found`,
              type: "ConfigurationError"
            }
          };
        }
        
        // Ejecutar el middleware directamente
        return await middleware(stepCtx, stepConfig, stepTools, stepSpan);
      };
      
      // Llamar al middleware original con la función executeStep
      return originalRetryMiddleware(ctx, mw, {
        ...tools,
        executeStep
      }, span);
    };
    
    // Reemplazar el middleware original
    orchestrator.registerMiddleware("retry", wrappedRetryMiddleware);
    
    console.log('Ejecutando flujo con reintentos...\n');
    
    // Ejecutar el flujo
    const result = await orchestrator.runFlow(
      retryFlow,
      { input: { request: 'test-request' } },
      { logger }
    );
    
    console.log('\n=== Flujo completado ===');
    console.log('Resultado final:', result.finalResult);
    
    // Mostrar el execution trace formateado
    console.log('\n=== Execution Trace ===');
    if (result.executionTrace && Array.isArray(result.executionTrace)) {
      const traceStr = buildExecutionTraceString(result.executionTrace);
      console.log(traceStr);
    } else {
      console.log("No hay execution trace disponible.");
      
      // Intentar obtener el trace directamente del contexto del resultado
      if (result._internal && result._internal.retryInfo) {
        console.log("Información de reintentos disponible en _internal:");
        console.log(JSON.stringify(result._internal.retryInfo, null, 2));
      }
    }
    
  } catch (error) {
    console.error('Error ejecutando el flujo:', error);
  }
}

// Ejecutar script
main().catch(console.error);
