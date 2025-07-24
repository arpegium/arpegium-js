import { createMiddleware } from "../base";
import { interpolate } from "../../utils/interpolate";
import fetch from "node-fetch"; // <-- Import estático
import https from "https";      // <-- Import estático

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
      error: "HTTP request middleware requires a URL in options"
    };
  }

  // Mejora la interpolación - asegúrate de que el contexto incluya env y globals
  const interpolationContext = {
    ...ctx.globals, // Primero los globals (aquí están los tokens como CreditCardCoreToken)
    ...ctx.input,   // Luego el input (que incluye body, pathParameters, etc.)
    env: ctx.input?.env || process.env,
    // Agrega propiedades específicas del body para fácil acceso
    ...(ctx.input?.body || {}),
    // Agrega pathParameters para acceso directo
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
          availableTokens: {
            CreditCardCoreToken: !!interpolationContext.CreditCardCoreToken,
            AccountsToken: !!interpolationContext.AccountsToken,
            B2BCacheListToken: !!interpolationContext.B2BCacheListToken,
            NrulesApiToken: !!interpolationContext.NrulesApiToken,
            CountersToken: !!interpolationContext.CountersToken
          }
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
      error: `HTTP request URL must be absolute. Got: ${interpolatedUrl} from ${options.url}`
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

  let response: any;
  try {
    response = await fetch(interpolatedUrl, fetchOptions);
  } catch (err: any) {
    if (tools?.logger) {
      tools.logger.error({
        message: `HTTP request failed: ${(err as Error)?.message || String(err)}`,
        request: { url: interpolatedUrl, method: options.method, headers: interpolatedHeaders, body: interpolatedBody },
        event: { headers: ctx.input.headers || {} }
      });
    }
    return {
      ctx,
      status: "failed",
      error: `HTTP request failed: ${(err as Error)?.message || String(err)}`
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
        body: data,
        status: response.status,
        statusText: response.statusText
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
