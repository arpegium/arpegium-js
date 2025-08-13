/**
 * Script simplificado para demostrar el middleware de retry 
 */

import { Orchestrator } from '../index';
import { MiddlewareContext, MiddlewareConfig, ITools, MiddlewareResult } from '../core/types';

// Crear un servicio simulado que falla los primeros intentos
let serviceAttempts = 0;

// Función principal
async function main() {
  console.log('=== Demo del Middleware de Retry ===\n');
  
  // Crear un orquestador
  const orchestrator = new Orchestrator();
  
  // Obtener el middleware de retry
  const retryMiddleware = orchestrator['middlewares'].get('retry');
  
  // Crear un mock de un paso que falla los primeros intentos
  const mockExecuteStep = async (
    config: any, 
    stepCtx: MiddlewareContext, 
    stepTools: any
  ): Promise<MiddlewareResult> => {
    serviceAttempts++;
    console.log(`[Servicio] Intento #${serviceAttempts}`);
    
    if (serviceAttempts < 3) {
      console.log(`[Servicio] Fallo en intento #${serviceAttempts}`);
      return {
        ctx: stepCtx,
        status: "failed",
        error: { 
          message: `Error en intento ${serviceAttempts}`, 
          type: "TransientError" 
        }
      };
    }
    
    console.log(`[Servicio] Éxito en intento #${serviceAttempts}`);
    return {
      ctx: {
        ...stepCtx,
        output: { result: 'Operación completada con éxito' }
      },
      status: "success"
    };
  };
  
  // Crear un contexto inicial simple
  const ctx: MiddlewareContext = {
    input: { request: 'test-request' },
    globals: {},
    _internal: {}
  };
  
  // Configurar el middleware de retry
  const retryConfig: MiddlewareConfig = {
    type: 'retry',
    name: 'RetryService',
    options: {
      maxAttempts: 5,
      interval: 0.5,  // Medio segundo inicial
      backoffRate: 2, // Dobla el tiempo en cada intento
      jitter: 0.2,    // 20% de aleatoriedad
      errors: ["TransientError"],
      step: {
        type: 'custom',
        name: 'TestService'
      }
    }
  };
  
  // Configurar herramientas
  const tools: ITools = {
    executeStep: mockExecuteStep,
    logger: {
      debug: (msg: any) => console.log(`[DEBUG] ${JSON.stringify(msg)}`),
      info: (msg: any) => console.log(`[INFO] ${JSON.stringify(msg)}`),
      warn: (msg: any) => console.log(`[WARN] ${JSON.stringify(msg)}`),
      error: (msg: any) => console.log(`[ERROR] ${JSON.stringify(msg)}`)
    }
  };
  
  console.log('Ejecutando middleware de retry...\n');
  
  try {
    // Ejecutar el middleware directamente
    const result = await retryMiddleware(ctx, retryConfig, tools);
    
    console.log('\n=== Middleware ejecutado con éxito ===');
    console.log('Estado:', result.status);
    console.log('Intentos:', result.meta?.retryAttempts);
    
    console.log('\n=== Metadatos de Retry ===');
    if (result.meta?.retryInfo) {
      console.log('Configuración:');
      console.log(`- Máximo de intentos: ${result.meta.retryInfo.maxAttempts}`);
      console.log(`- Intervalo base: ${result.meta.retryInfo.baseInterval}s`);
      console.log(`- Tasa de backoff: ${result.meta.retryInfo.backoffRate}`);
      console.log(`- Jitter: ${result.meta.retryInfo.jitter}`);
      
      console.log('\nIntentos:');
      result.meta.retryInfo.attempts.forEach((attempt: any, idx: number) => {
        const icon = attempt.status === 'success' ? '✓' : 
                     attempt.status === 'retrying' ? '↻' : '✗';
        console.log(`${icon} Intento #${attempt.attempt}: ${attempt.status}`);
        
        if (attempt.status === 'retrying') {
          console.log(`  - Tiempo de espera: ${attempt.waitTime?.toFixed(2)}s`);
        }
        
        if (attempt.error) {
          console.log(`  - Error: ${attempt.error}`);
        }
      });
    }
    
    console.log('\n=== Información en contexto interno ===');
    console.log(JSON.stringify(ctx._internal, null, 2));
    
  } catch (error) {
    console.error('Error ejecutando el middleware:', error);
  }
}

// Ejecutar script
main().catch(console.error);
