// Ejemplo de cómo integrar FlowScript con AWS Lambda
// Este es el equivalente a tu handler.ts actual pero usando el paquete NPM

import { APIGatewayProxyHandler } from "aws-lambda";
import * as path from "path";
import * as fs from "fs";
import { Orchestrator, FlowConfig } from "orchestjs";

export const handler: APIGatewayProxyHandler = async (event) => {
  // Configuración SSL si es necesaria
  if (process.env.ALLOW_INSECURE_SSL === 'true') {
    process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';
  }

  // Crear el orquestador
  const orchestrator = new Orchestrator();

  // Configurar observabilidad si tienes tracing personalizado
  if (yourTracingFunction) {
    orchestrator.setObservabilityTracer(yourTracingFunction);
  }

  // Registrar middlewares personalizados
  orchestrator.registerMiddleware('b2btokenservice', b2bTokenServiceMiddleware);
  orchestrator.registerMiddleware('awsEventBusMessage', awsEventBusMessageMiddleware);

  try {
    const input = {
      body: event.body ? JSON.parse(event.body) : {},
      pathParameters: event.pathParameters || {},
      resource: event.resource || "",
      headers: event.headers || {},
      queryStringParameters: event.queryStringParameters || {},
      env: {
        ...process.env
      }
    };

    // Tools que necesita tu aplicación
    const tools = {
      logger: yourLogger,
      tracer: yourTracer,
      functionRegistry: yourFunctionRegistry
    };

    // Cargar flujo
    const flowName = (event.pathParameters && event.pathParameters.flowname) || "flujo1";
    const flowPath = path.resolve(__dirname, `../flows/${flowName}.json`);

    if (!fs.existsSync(flowPath)) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: `Flow not found: ${flowName}` }),
      };
    }

    const flowJson = fs.readFileSync(flowPath, "utf-8");
    const flow: FlowConfig = JSON.parse(flowJson);

    // Ejecutar flujo
    const result = await orchestrator.runFlow(flow, input, tools);

    // Manejar respuesta
    if (typeof result === "object" && result !== null && 
        ("statusCode" in result || "body" in result || "headers" in result)) {
      return {
        ...result,
        body: typeof result.body !== "string" ? JSON.stringify(result.body) : result.body,
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify(result),
    };

  } catch (err: any) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: err.message || "Unknown error",
      }),
    };
  }
};

// Definiciones de tus middlewares personalizados y herramientas
declare const b2bTokenServiceMiddleware: any;
declare const awsEventBusMessageMiddleware: any;
declare const yourLogger: any;
declare const yourTracer: any;
declare const yourFunctionRegistry: any;
declare const yourTracingFunction: any;
