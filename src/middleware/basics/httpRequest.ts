import { createMiddleware } from "../base";
import { interpolate } from "../../utils/interpolate";
import fetch from "node-fetch"; // <-- Import estático
import https from "https";      // <-- Import estático

/**
 * HTTP Request Middleware
 * 
 * Makes HTTP requests to external services and stores the response data.
 * 
 * Key features:
 * - Interpolates URL, headers, and body with context values
 * - Configurable timeout and SSL settings
 * - Stores response in globals[name]
 * - Stores response metadata in globals[name + "-metadata"] including:
 *   - status: HTTP status code
 *   - statusText: HTTP status text
 *   - headers: Response headers
 *   - url: Final URL used for the request
 *   - method: HTTP method used
 *   - requestTimestamp: When the request was made
 */

export const httpRequestMiddleware = createMiddleware(async (ctx, mw, tools, span) => {
  const options = mw.options || {};
  if (!options.url) {
    if (tools?.logger) {
      tools.logger.error({
        message: "HTTP request middleware requires a URL in options",
        request: { options },
        event: { headers: ctx.input.headers || {} }
      });
    }
    return {
      ctx,
      status: "failed",
      error: {
        message: "HTTP request middleware requires a URL in options",
        requestData: {
          options: options,
          providedUrl: options.url,
          availableOptions: Object.keys(options)
        }
      }
    };
  }

  // Enhanced interpolation - ensure context includes env and globals
  const interpolationContext = {
    ...ctx.globals, // First globals (middleware outputs)
    ...ctx.input,   // Then input (includes body, pathParameters, etc.)
    env: ctx.input?.env || process.env,
    // Add specific body properties for easy access
    ...(ctx.input?.body || {}),
    // Add pathParameters for direct access
    ...(ctx.input?.pathParameters || {})
  };

  // Interpola todos los valores usando el contexto completo
  let interpolatedBody = options.body ? interpolate(options.body, interpolationContext) : undefined;
  
  // Debug del body antes de procesarlo
  if (tools?.logger && interpolatedBody !== undefined) {
    tools.logger.debug({
      message: "Body interpolation debug",
      request: {
        originalBody: options.body,
        interpolatedBody: interpolatedBody,
        interpolatedBodyType: typeof interpolatedBody,
        isString: typeof interpolatedBody === 'string',
        isObject: typeof interpolatedBody === 'object',
        bodyStringified: typeof interpolatedBody === 'object' ? JSON.stringify(interpolatedBody) : interpolatedBody
      }
    });
  }

  // Mejora la interpolación de headers - interpola cada header individualmente
  const interpolatedHeaders: Record<string, string> = {};
  if (options.headers && typeof options.headers === 'object') {
    for (const [key, value] of Object.entries(options.headers)) {
      interpolatedHeaders[key] = typeof value === 'string' ? interpolate(value, interpolationContext) : value;
    }
  }
  
  let interpolatedUrl = interpolate(options.url, interpolationContext);

  // Debug: loguea si algún header no se interpoló correctamente
  if (tools?.logger) {
    const uninterpolatedHeaders = Object.entries(interpolatedHeaders).filter(([key, value]) => 
      typeof value === 'string' && value.includes('{{')
    );
    
    if (uninterpolatedHeaders.length > 0) {
      tools.logger.error({
        message: "Header interpolation failed - variables not resolved",
        request: {
          originalHeaders: options.headers,
          interpolatedHeaders: interpolatedHeaders,
          uninterpolatedHeaders: uninterpolatedHeaders,
          availableContext: Object.keys(interpolationContext),
          url: interpolatedUrl,
          method: options.method || 'GET',
          body: interpolatedBody
        },
        event: { headers: ctx.input.headers || {} }
      });
    }
  }

  // Valida que la URL sea absoluta después de la interpolación
  if (!interpolatedUrl.startsWith('http://') && !interpolatedUrl.startsWith('https://')) {
    if (tools?.logger) {
      tools.logger.error({
        message: "HTTP request URL must be absolute after interpolation",
        request: { 
          originalUrl: options.url, 
          interpolatedUrl: interpolatedUrl,
          context: {
            hasEnv: !!ctx.input?.env,
            envKeys: ctx.input?.env ? Object.keys(ctx.input.env) : []
          }
        },
        event: { headers: ctx.input.headers || {} }
      });
    }
    return {
      ctx,
      status: "failed",
      error: {
        message: `HTTP request URL must be absolute. Got: ${interpolatedUrl} from ${options.url}`,
        requestData: {
          originalUrl: options.url,
          interpolatedUrl: interpolatedUrl,
          method: options.method || 'GET',
          headers: interpolatedHeaders,
          body: interpolatedBody,
          context: {
            hasEnv: !!ctx.input?.env,
            envKeys: ctx.input?.env ? Object.keys(ctx.input.env) : [],
            availableContext: Object.keys(interpolationContext)
          }
        }
      }
    };
  }

  const fetchOptions: any = {
    method: options.method || 'GET',
    headers: interpolatedHeaders,
    body: interpolatedBody ? JSON.stringify(interpolatedBody) : undefined,
  };

  // Configuración SSL
  if (options.rejectUnauthorized === false || options.allowInsecure === true || options.ignoreTLSErrors === true) {
    fetchOptions.agent = new https.Agent({
      rejectUnauthorized: false,
      secureOptions: require('constants').SSL_OP_LEGACY_SERVER_CONNECT,
      ciphers: 'ALL:!aNULL:!eNULL:!EXPORT:!DES:!RC4:!MD5:!PSK:!SRP:!CAMELLIA',
      checkServerIdentity: () => undefined,
    });
    
    if (options.ignoreTLSErrors === true) {
      process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';
    }
  }

  // Configuración de timeout (valor por defecto: 30 segundos, 0 significa sin timeout)
  const timeoutMs = typeof options.timeout === 'number' ? options.timeout : 30000;
  
  let response: any;
  try {
    // Si timeout es 0, no aplicamos timeout (infinito)
    if (timeoutMs === 0) {
      response = await fetch(interpolatedUrl, fetchOptions);
    } else {
      // Implementamos el timeout usando Promise.race
      const timeoutPromise = new Promise((_, reject) => {
        const timeoutError = new Error(`Request timeout after ${timeoutMs}ms`);
        timeoutError.name = 'TimeoutError';
        setTimeout(() => reject(timeoutError), timeoutMs);
      });
      
      response = await Promise.race([
        fetch(interpolatedUrl, fetchOptions),
        timeoutPromise
      ]);
    }
  } catch (err: any) {
    // Mensaje personalizado para timeouts
    const isTimeout = err?.name === 'TimeoutError';
    const errorMessage = isTimeout 
      ? `HTTP request timeout after ${timeoutMs}ms` 
      : `HTTP request failed: ${(err as Error)?.message || String(err)}`;
    
    if (tools?.logger) {
      tools.logger.error({
        message: errorMessage,
        request: { 
          url: interpolatedUrl, 
          method: options.method, 
          headers: interpolatedHeaders, 
          body: interpolatedBody,
          timeout: timeoutMs,
          isTimeout
        },
        event: { headers: ctx.input.headers || {} }
      });
    }
    
    return {
      ctx,
      status: "failed",
      error: {
        message: errorMessage,
        requestData: {
          url: interpolatedUrl,
          originalUrl: options.url,
          method: options.method || 'GET',
          headers: interpolatedHeaders,
          timeout: timeoutMs,
          isTimeout,
          originalHeaders: options.headers,
          body: interpolatedBody,
          originalBody: options.body,
          interpolationContext: Object.keys(interpolationContext)
        },
        networkError: (err as Error)?.message || String(err)
      }
    };
  } finally {
    if (options.ignoreTLSErrors === true) {
      delete process.env['NODE_TLS_REJECT_UNAUTHORIZED'];
    }
  }

  let data: any = null;
  try {
    data = await response.json();
  } catch {
    // ignore parse error, data remains null
  }

  if (span && typeof span.setTag === "function") {
    span.setTag("http.url", interpolatedUrl);
    span.setTag("http.method", options.method || 'GET');
    span.setTag("http.status_code", response.status);
  }

  if (response.status !== 200) {
    if (tools?.logger) {
      tools.logger.error({
        message: `HTTP request failed with status ${response.status}: ${response.statusText}`,
        request: { url: interpolatedUrl, method: options.method, headers: interpolatedHeaders, body: interpolatedBody },
        response: { status: response.status, statusText: response.statusText, body: data },
        event: { headers: ctx.input.headers || {} }
      });
    }
    return {
      ctx,
      status: "failed",
      error: {
        message: `HTTP request failed with status ${response.status}: ${response.statusText}`,
        requestData: {
          url: interpolatedUrl,
          originalUrl: options.url,
          method: options.method || 'GET',
          headers: interpolatedHeaders,
          originalHeaders: options.headers,
          body: interpolatedBody,
          originalBody: options.body,
          interpolationContext: Object.keys(interpolationContext)
        },
        response: {
          status: response.status,
          statusText: response.statusText,
          body: data
        }
      }
    };
  }

  const shouldOutput = options.output !== false;
  if (shouldOutput) {
    ctx.output = { body: data };
  }

  if (mw.name) {
    ctx.globals = ctx.globals || {};
    ctx.globals[mw.name] = data;
    
    // Guardar la metadata de la respuesta HTTP en una variable global separada
    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value: string, key: string) => {
      responseHeaders[key] = value;
    });
    
    ctx.globals[mw.name + "-metadata"] = {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
      url: interpolatedUrl,
      method: options.method || 'GET',
      requestTimestamp: new Date().toISOString()
    };
  }

  if (tools?.logger) {
    tools.logger.info({
      message: `HTTP request success for ${mw.name}`,
      request: { url: interpolatedUrl, method: options.method, headers: interpolatedHeaders, body: interpolatedBody },
      response: { status: response.status, statusText: response.statusText, body: data },
      event: { headers: ctx.input.headers || {} }
    });
  }

  return { ctx, status: "success" };
});
