import { createMiddleware } from "../base";
import { MiddlewareResult, MiddlewareContext, MiddlewareConfig, ITools } from "../../core/types";
import { 
  isSequenceConfig, 
  isParallelConfig, 
  isConditionalConfig 
} from "../../core/utils";

export const retryMiddleware = createMiddleware(async (ctx, mw, tools, span) => {
  const options = mw.options || {};
  
  // Verificar que tenemos un paso para reintentar
  if (!options.step) {
    if (tools?.logger) {
      tools.logger.error({
        message: "Retry middleware requires a step to retry",
        middleware: { name: mw.name, type: mw.type },
      });
    }
    return {
      ctx,
      status: "failed",
      error: {
        message: "Retry middleware requires a step to retry",
        details: "The 'step' property is required in options"
      }
    };
  }

  // Configuración por defecto
  const maxAttempts = options.maxAttempts || 3;
  const baseInterval = options.interval || 1; // en segundos
  const backoffRate = options.backoffRate || 2;
  const errorTypes = options.errors || [];
  const jitter = options.jitter || 0;

  if (tools?.logger) {
    tools.logger.debug({
      message: `Retry middleware initialized`,
      config: {
        maxAttempts,
        baseInterval,
        backoffRate,
        errorTypes: errorTypes.length ? errorTypes : 'all',
        jitter,
      },
      middleware: { name: mw.name, type: mw.type }
    });
  }

  // Ejecutar el paso con reintentos
  let attempt = 1;
  let lastError = null;
  let result: MiddlewareResult | null = null;
  let attemptStartTime = 0;
  
  // Crear metadatos para el executionTrace
  const retryMetadata = {
    attempts: [],
    maxAttempts,
    baseInterval,
    backoffRate,
    jitter,
    retryableErrors: errorTypes.length > 0 ? errorTypes : ['all']
  };

  // Añadir los metadatos al contexto para que estén disponibles en el execution trace
  if (!ctx._internal) ctx._internal = {};
  if (!ctx._internal.retryInfo) ctx._internal.retryInfo = {};
  ctx._internal.retryInfo[mw.name || 'unnamed_retry'] = retryMetadata;

  // Definir una función interna para ejecutar el paso si no se proporcionó
  // Necesitamos una función executeStep para ejecutar el paso interno
  if (!tools?.executeStep) {
    if (tools?.logger) {
      tools.logger.error({
        message: "Retry middleware requires an executeStep function",
        middleware: { name: mw.name, type: mw.type },
      });
    }
    return {
      ctx,
      status: "failed",
      error: {
        message: "Retry middleware requires an executeStep function",
        details: "Please make sure this middleware is being executed by the orchestrator"
      }
    };
  }
  
  // Utilizamos la función executeStep proporcionada por el orquestador
  const executeStep = tools.executeStep;

  while (attempt <= maxAttempts) {
    try {
      // Tracer
      if (span) {
        span.setTag('retry.attempt', attempt);
        span.setTag('retry.max_attempts', maxAttempts);
      }

      // Registrar inicio del intento actual
      const attemptStartTime = Date.now();
      if (tools?.logger) {
        tools.logger.debug({
          message: `Starting retry attempt ${attempt}/${maxAttempts}`,
          middleware: { name: mw.name, type: mw.type },
          attempt,
          maxAttempts
        });
      }

      // Configurar el contexto para ejecutar el paso interno con el retry como padre
      // Esto permitirá que los pasos internos aparezcan como hijos del retry en el execution trace
      const stepContext = {
        ...ctx,
        _internal: {
          ...ctx._internal,
          currentParent: mw.name // Establecer el nombre del retry como padre
        }
      };

      // Ejecutar el paso usando la función executeStep disponible
      // Para estructuras de control como sequence, parallel y conditional,
      // no necesitamos asignar un tipo ya que executeStep debe manejarlas directamente
      result = await executeStep(options.step, stepContext, tools || {}, span);
      
      // Calcular duración del intento
      const attemptDuration = Date.now() - attemptStartTime;
      
      // Si fue exitoso, salir del bucle
      if (result && result.status === "success") {
        if (tools?.logger) {
          tools.logger.info({
            message: `Retry step succeeded on attempt ${attempt}`,
            middleware: { name: mw.name, type: mw.type },
            attempt,
            totalAttempts: maxAttempts,
            durationMs: attemptDuration
          });
        }
        
        // Registrar el intento exitoso en execution trace
        const attemptInfo = {
          attempt,
          status: "success",
          timestamp: attemptStartTime,
          durationMs: attemptDuration,
          stepType: typeof options.step === 'object' && 'type' in options.step ? options.step.type : 
                   (options.step && typeof options.step === 'object' && 'sequence' in options.step) ? 'sequence' :
                   (options.step && typeof options.step === 'object' && 'parallel' in options.step) ? 'parallel' : 
                   (options.step && typeof options.step === 'object' && 'conditional' in options.step) ? 'conditional' : 'unknown'
        };
        
        // Añadir al registro de intentos
        ctx._internal?.retryInfo?.[mw.name || 'unnamed_retry']?.attempts.push(attemptInfo);
        
        break;
      }

      // Si falló pero es un error que no queremos reintentar, salir del bucle
      if (result && result.error) {
        const errorType = result.error.type || 
                         (result.error.name ? result.error.name : "UnknownError");
        
        // Determinar el tipo de paso que estamos reintentando
        const stepType = typeof options.step === 'object' && 'type' in options.step ? options.step.type : 
                        (options.step && typeof options.step === 'object' && 'sequence' in options.step) ? 'sequence' :
                        (options.step && typeof options.step === 'object' && 'parallel' in options.step) ? 'parallel' : 
                        (options.step && typeof options.step === 'object' && 'conditional' in options.step) ? 'conditional' : 'unknown';
        
        if (errorTypes.length > 0 && !errorTypes.includes(errorType)) {
          if (tools?.logger) {
            tools.logger.info({
              message: `Error type '${errorType}' is not configured for retry`,
              middleware: { name: mw.name, type: mw.type },
              attempt,
              errorType,
              stepType,
              durationMs: attemptDuration,
              retryableErrors: errorTypes
            });
          }
          
          // Registrar en el execution trace que este error no es reintentable
          const attemptInfo = {
            attempt,
            status: "failed",
            errorType,
            notRetryable: true,
            timestamp: attemptStartTime,
            durationMs: attemptDuration,
            stepType,
            error: result.error instanceof Error ? result.error.message : String(result.error),
            statusCode: result.error.statusCode || result.error.code || null
          };
          
          // Añadir al registro de intentos
          ctx._internal?.retryInfo?.[mw.name || 'unnamed_retry']?.attempts.push(attemptInfo);
          
          break;
        }
      }

      // Si llegamos al máximo de intentos, salir del bucle
      if (attempt >= maxAttempts) {
        // Determinar el tipo de paso que estamos reintentando
        const stepType = typeof options.step === 'object' && 'type' in options.step ? options.step.type : 
                        (options.step && typeof options.step === 'object' && 'sequence' in options.step) ? 'sequence' :
                        (options.step && typeof options.step === 'object' && 'parallel' in options.step) ? 'parallel' : 
                        (options.step && typeof options.step === 'object' && 'conditional' in options.step) ? 'conditional' : 'unknown';
        
        if (tools?.logger) {
          tools.logger.error({
            message: `Maximum retry attempts (${maxAttempts}) reached`,
            middleware: { name: mw.name, type: mw.type },
            stepType,
            durationMs: attemptDuration,
            attemptsMade: attempt
          });
        }
        
        // Registrar que se alcanzó el máximo de intentos
        const attemptInfo = {
          attempt,
          status: "failed",
          maxAttemptsReached: true,
          timestamp: attemptStartTime,
          durationMs: attemptDuration,
          stepType,
          totalAttempts: attempt,
          error: result?.error ? (
            result.error instanceof Error ? result.error.message : String(result.error)
          ) : "Unknown error",
          statusCode: result?.error?.statusCode || result?.error?.code || null
        };
        
        // Añadir al registro de intentos
        ctx._internal?.retryInfo?.[mw.name || 'unnamed_retry']?.attempts.push(attemptInfo);
        
        break;
      }

      // Calcular el tiempo de espera para el próximo intento (backoff exponencial)
      const waitTime = baseInterval * Math.pow(backoffRate, attempt - 1);
      // Agregar jitter si está configurado
      const jitterAmount = jitter > 0 ? (Math.random() * jitter * waitTime) : 0;
      const totalWaitTime = waitTime + jitterAmount;

      // Determinar el tipo de paso que estamos reintentando
      const stepType = typeof options.step === 'object' && 'type' in options.step ? options.step.type : 
                      (options.step && typeof options.step === 'object' && 'sequence' in options.step) ? 'sequence' :
                      (options.step && typeof options.step === 'object' && 'parallel' in options.step) ? 'parallel' : 
                      (options.step && typeof options.step === 'object' && 'conditional' in options.step) ? 'conditional' : 'unknown';
      
      // Registrar el intento fallido en execution trace
      const attemptInfo = {
        attempt,
        status: "retrying",
        waitTime: totalWaitTime,
        timestamp: attemptStartTime,
        durationMs: attemptDuration,
        stepType,
        errorType: result && result.error && result.error.type ? result.error.type : 
                  (result && result.error && result.error.name ? result.error.name : "UnknownError"),
        error: result && result.error ? (
          result.error instanceof Error ? result.error.message : String(result.error)
        ) : "Unknown error",
        statusCode: result && result.error ? result.error.statusCode || result.error.code || null : null
      };
      
      // Añadir al registro de intentos
      ctx._internal?.retryInfo?.[mw.name || 'unnamed_retry']?.attempts.push(attemptInfo);

      if (tools?.logger) {
        tools.logger.info({
          message: `Retry attempt ${attempt} failed, retrying in ${totalWaitTime.toFixed(2)}s`,
          middleware: { name: mw.name, type: mw.type },
          attempt,
          nextAttemptIn: totalWaitTime,
          error: result && result.error ? 
                (result.error instanceof Error ? result.error.message : String(result.error)) : 
                "Unknown error"
        });
      }

      // Esperar antes del próximo intento
      await new Promise(resolve => setTimeout(resolve, totalWaitTime * 1000));
      attempt++;

    } catch (error) {
      lastError = error;
      // Calcular duración del intento que falló
      const attemptDuration = Date.now() - attemptStartTime;
      
      // Determinar el tipo de paso que estamos reintentando
      const stepType = typeof options.step === 'object' && 'type' in options.step ? options.step.type : 
                      (options.step && typeof options.step === 'object' && 'sequence' in options.step) ? 'sequence' :
                      (options.step && typeof options.step === 'object' && 'parallel' in options.step) ? 'parallel' : 
                      (options.step && typeof options.step === 'object' && 'conditional' in options.step) ? 'conditional' : 'unknown';
      
      if (tools?.logger) {
        tools.logger.error({
          message: `Unexpected error in retry middleware during attempt ${attempt}`,
          middleware: { name: mw.name, type: mw.type },
          stepType,
          attempt,
          durationMs: attemptDuration,
          error: error instanceof Error ? error.message : String(error)
        });
      }
      
      // Registrar el error inesperado en execution trace
      const attemptInfo = {
        attempt,
        status: "error",
        timestamp: attemptStartTime,
        durationMs: attemptDuration,
        stepType,
        error: error instanceof Error ? error.message : String(error),
        errorType: error instanceof Error ? error.name : "UnknownError",
        unexpectedError: true
      };
      
      // Añadir al registro de intentos
      ctx._internal?.retryInfo?.[mw.name || 'unnamed_retry']?.attempts.push(attemptInfo);

      // Si llegamos al máximo de intentos o es un error interno del middleware, salir del bucle
      if (attempt >= maxAttempts) {
        break;
      }

      attempt++;
    }
  }

  // Si después de todos los intentos, no tenemos resultado o es un fallo, devolver el último error
  if (!result || result.status === "failed") {
    if (tools?.logger) {
      tools.logger.error({
        message: `Retry middleware failed after ${attempt} attempts`,
        middleware: { name: mw.name, type: mw.type },
        attempts: attempt,
        maxAttempts,
      });
    }

    // Obtener la información de reintentos para incluirla en el meta
    const retryInfo = ctx._internal?.retryInfo?.[mw.name || 'unnamed_retry'] || {
      attempts: [],
      maxAttempts,
      baseInterval,
      backoffRate,
      jitter
    };

    // Mejorar el objeto de error para incluir detalles completos
    let enhancedError;

    if (result?.error) {
      // Si el resultado tiene un error, usarlo como base
      enhancedError = {
        // Preservar el mensaje original del error
        message: result.error.message || (result.error instanceof Error ? result.error.message : String(result.error)),
        
        // Añadir contexto sobre el retry
        retryContext: {
          middlewareName: mw.name,
          middlewareType: mw.type,
          attemptsExecuted: attempt,
          maxAttempts: maxAttempts
        },
        
        // Preservar todos los detalles originales del error
        ...(typeof result.error === 'object' ? result.error : {}),
        
        // Si es un error HTTP, preservar los detalles específicos
        ...(result.error.requestData ? { requestData: result.error.requestData } : {}),
        ...(result.error.response ? { response: result.error.response } : {})
      };
    } else if (lastError) {
      // Si hay un error del catch
      enhancedError = {
        message: lastError instanceof Error ? lastError.message : String(lastError),
        retryContext: {
          middlewareName: mw.name,
          middlewareType: mw.type,
          attemptsExecuted: attempt,
          maxAttempts: maxAttempts
        }
      };
    } else {
      // Error genérico si no hay otros detalles
      enhancedError = {
        message: `Step failed after ${attempt} retry attempts`,
        details: "Maximum retry attempts exceeded"
      };
    }

    return {
      ctx,
      status: "failed",
      error: enhancedError,
      meta: {
        retryAttempts: attempt,
        maxAttempts,
        retryInfo: retryInfo
      }
    };
  }

  // Obtener la información de reintentos para incluirla en el meta
  const retryInfo = ctx._internal?.retryInfo?.[mw.name || 'unnamed_retry'] || {
    attempts: [],
    maxAttempts,
    baseInterval,
    backoffRate,
    jitter
  };
  
  // Determinar el tipo de paso que se reintentó
  const stepType = typeof options.step === 'object' && 'type' in options.step ? options.step.type : 
                  (options.step && typeof options.step === 'object' && 'sequence' in options.step) ? 'sequence' :
                  (options.step && typeof options.step === 'object' && 'parallel' in options.step) ? 'parallel' : 
                  (options.step && typeof options.step === 'object' && 'conditional' in options.step) ? 'conditional' : 'unknown';
  
  // Calcular estadísticas de los reintentos
  let totalDuration = 0;
  let avgDuration = 0;
  const attemptDurations = retryInfo.attempts
    .filter((a: any) => typeof a.durationMs === 'number')
    .map((a: any) => a.durationMs);
  
  if (attemptDurations.length > 0) {
    totalDuration = attemptDurations.reduce((sum: number, duration: number) => sum + duration, 0);
    avgDuration = totalDuration / attemptDurations.length;
  }
  
  // Crear estadísticas para el trace
  const retryStats = {
    attemptsCount: attempt,
    totalDurationMs: totalDuration,
    avgAttemptDurationMs: Math.round(avgDuration),
    successAttempt: attempt
  };
  
  // Asegurarse de que la información de retry esté disponible en el contexto para el execution trace
  if (!ctx.executionTrace) ctx.executionTrace = [];
  
  // Buscar si ya existe una entrada para este middleware en executionTrace
  const existingEntryIndex = ctx.executionTrace.findIndex((entry: any) => 
    entry.name === mw.name && entry.type === 'retry'
  );
  
  if (existingEntryIndex >= 0) {
    // Si existe, actualizar la entrada
    ctx.executionTrace[existingEntryIndex].meta = {
      ...ctx.executionTrace[existingEntryIndex].meta || {},
      retryInfo,
      retryStats
    };
  } else {
    // Si no existe, crear una nueva entrada
    ctx.executionTrace.push({
      name: mw.name,
      type: 'retry',
      status: 'success',
      meta: { retryInfo, retryStats },
      durationMs: result.meta?.durationMs || 0
    });
  }
  
  // Devolver el resultado exitoso con la información de reintentos
  return {
    ctx: result.ctx,
    status: "success",
    meta: {
      ...result.meta,
      retryAttempts: attempt,
      maxAttempts,
      stepType,
      retryStats,
      retryInfo: retryInfo
    }
  };
});
