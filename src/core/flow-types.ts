
/**
 * Formas de uso del array de mapping en el middleware mapper.
 * - origin: copiar un valor desde un origen a un destino.
 * - fn: aplicar una función sobre uno o más valores y guardar el resultado.
 * - value: setear un valor fijo en el destino.
 * - dataType: opcional, para castear el valor.
 * - Ejemplo:
 *   { origin: 'body', from: 'user_id', to: 'merchantId' }
 *   { fn: 'concat({{a}},{{b}})', to: 'result' }
 *   { value: 1, to: 'priority' }
 */
export type MapperMapping =
    | {
        /**
         * - Set "origin" to assign origin of mapping object (ex: body, globals, env, pathParameters)
         * - Set "from" to assign path in origin (ex: for body.name set "name")
         * - Set "to" to assing path in mapped object 
         */
        origin: "globals" | "body" | string;
        from: string;
        to: string;
        dataType?: string;
    }
    | {
        /**
         * - Set "fn" to assign function registry execution, you can use interpolation here
         *  - ex: concat({{name}}) 
         * - Set "to" to assing path in mapped object
         *  - result of function execution will be saved in "to" path 
        */
        fn: string;
        to: string;
        dataType?: string;
    }
    | {
        /**
         * - Set "value" to set a fixed value for the output of mapping
         * - Set "to" to assing path in mapped object 
         * - Mostly used to mock values
         */
        value: any;
        to: string;
        dataType?: string;
    };

/**
 * JSON Schema para validación de datos.
 * - "type": tipo de dato principal (object, string, number, etc)
 * - "properties": definición de campos si es un objeto
 * - "items": definición de tipo si es un array
 * - "required": lista de campos obligatorios
 * - Se pueden agregar otros campos según la especificación JSON Schema
 * Ejemplo:
 * {
 *   type: "object",
 *   properties: {
 *     name: { type: "string" },
 *     age: { type: "number" }
 *   },
 *   required: ["name"]
 * }
 */
export type JsonSchema = {
    type: string;
    properties?: Record<string, JsonSchema>;
    items?: JsonSchema;
    required?: string[];
    [key: string]: any;
};

// Tipos para definir flujos y middlewares en arpegium

export type FlowMiddlewareType =
    | 'validator'
    | 'httpRequest'
    | 'mapper'
    | 'debug'
    | 'retry'
    | 'custom'
    | string;

/**
 * Opciones para el middleware validator.
 * - "origin": origen de los datos a validar (input, output, body, headers, etc)
 * - "schema": JSON Schema para validar la estructura
 * - "onError": objeto para personalizar el error devuelto
 * Ejemplo:
 * {
 *   origin: "body",
 *   schema: { type: "object", properties: { ... }, required: [ ... ] },
 *   onError: { type: "ValidationError", code: 422 }
 * }
 */
export interface ValidatorOptions {
    origin:
    | 'input'
    | 'output'
    | 'globals'
    | 'body'
    | 'headers'
    | 'pathParameters'
    | 'queryStringParameters';
    schema: JsonSchema;
    onError?: object;
}
export interface ValidatorMiddleware {
    type: 'validator';
    name: string;
    options: ValidatorOptions;
}

/**
 * Opciones para el middleware httpRequest.
 * - "url": destino de la request (debe ser una URL válida)
 * - "method": método HTTP
 * - "headers": headers HTTP
 * - "body": cuerpo de la request
 * - "output": si se guarda el resultado en el contexto
 * - "blocking": si la request es bloqueante
 * - "timeout": tiempo máximo en milisegundos (default: 30000)
 * Ejemplo:
 * {
 *   url: "https://api.example.com/data",
 *   method: "POST",
 *   headers: { "Authorization": "Bearer ..." },
 *   body: { ... },
 *   output: true,
 *   blocking: false,
 *   timeout: 5000
 * }
 */
export interface HttpRequestOptions {
    url: string;
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS';
    headers?: Record<string, string>;
    body?: any;
    output?: boolean;
    blocking?: boolean;
    /**
     * Tiempo máximo de espera en milisegundos para la request HTTP.
     * Si la petición excede este tiempo, se considerará fallida.
     * Por defecto es 30000 (30 segundos).
     * Un valor de 0 indica sin timeout (espera infinita).
     */
    timeout?: number;
}
export interface HttpRequestMiddleware {
    type: 'httpRequest';
    name: string;
    options: HttpRequestOptions;
}

/**
 * Opciones para el middleware mapper.
 * - "output": si se guarda el resultado en el contexto
 * - "blocking": si el mapeo es bloqueante
 * - "mapping": array de mapeos para transformar datos
 * Ejemplo:
 * {
 *   output: true,
 *   mapping: [
 *     { origin: "body", from: "user_id", to: "merchantId" },
 *     { fn: "concat({{a}},{{b}})", to: "result" },
 *     { value: 1, to: "priority" }
 *   ]
 * }
 */
export interface MapperOptions {
    output?: boolean;
    blocking?: boolean;
    mapping: Array<MapperMapping>;
}
export interface MapperMiddleware {
    type: 'mapper';
    name: string;
    options: MapperOptions;
}

export interface CustomMiddleware {
    type: 'custom';
    name: string;
    options?: Record<string, any>;
}

import { UserDefinedMiddleware } from './extensible-types';

export type Middleware =
    ValidatorMiddleware
    | HttpRequestMiddleware
    | MapperMiddleware
    | DebugMiddleware
    | RetryMiddleware
    | CustomMiddleware
    | UserDefinedMiddleware
    | {
      type: string;
      name: string;
      options?: Record<string, any>;
    };
/**
 * Opciones para el middleware debug.
 * - "message": mensaje a mostrar en logs/debug
 * - "data": datos extra para debug
 * Ejemplo:
 * {
 *   message: "Entrando al paso X",
 *   data: { foo: "bar" }
 * }
 */
export interface DebugOptions {
    message?: string;
    data?: any;
}
export interface DebugMiddleware {
    type: 'debug';
    name: string;
    options?: DebugOptions;
}

export type FlowControl =
    | { sequence: Array<FlowStep> }
    | { parallel: Array<FlowStep> }
    | { conditional: ConditionalStep };

export type FlowStep = Middleware | FlowControl;

export interface ConditionalStep {
    if: string;
    then: FlowStep;
    else?: FlowStep;
}

export interface FlowDefinition {
    name: string;
    middlewares: Array<FlowStep>;
}

// Ejemplo de uso:
// import { FlowDefinition } from 'arpegium/flow-types';
// const myFlow: FlowDefinition = { ... };


/**
 * Opciones para el middleware retry.
 * - "step": paso a reintentar
 * - "maxAttempts": número máximo de intentos (incluido el primero)
 * - "interval": intervalo base entre intentos en segundos (default: 1)
 * - "backoffRate": factor de multiplicación para backoff exponencial (default: 2)
 * - "errors": tipos de errores que activan el reintento (opcional, si no se especifica, reintenta cualquier error)
 * - "jitter": valor entre 0 y 1 para añadir variación aleatoria al intervalo (default: 0)
 * Ejemplo:
 * {
 *   step: { type: "httpRequest", name: "callAPI", options: { ... } },
 *   maxAttempts: 3,
 *   interval: 2,
 *   backoffRate: 2,
 *   errors: ["ServiceUnavailable", "ThrottlingException"]
 * }
 */
export interface RetryOptions {
    step: FlowStep;
    maxAttempts: number;
    interval?: number;
    backoffRate?: number;
    errors?: string[];
    jitter?: number;
}

export interface RetryMiddleware {
    type: 'retry';
    name: string;
    options: RetryOptions;
}