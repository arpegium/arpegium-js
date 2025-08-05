import { createMiddleware } from "../base";
import Ajv from "ajv";
import addFormats from "ajv-formats";

// Configure AJV to show all errors, not just the first one
const ajv = new Ajv({ allErrors: true });
addFormats(ajv);

export const validatorMiddleware = createMiddleware(async (ctx, mw) => {
  const options = mw.options || {};
  const origin = options.origin || "input";
  const schema = options.schema;
  
  if (!schema) {
    return {
      ctx,
      status: "failed",
      error: "Validator middleware requires a schema in options"
    };
  }

  let dataToValidate;
  switch (origin) {
    case "input":
      dataToValidate = ctx.input;
      break;
    case "output":
      dataToValidate = ctx.output;
      break;
    case "globals":
      dataToValidate = ctx.globals;
      break;
    case "body":
      dataToValidate = ctx.input?.body;
      break;
    case "headers":
      dataToValidate = ctx.input?.headers;
      break;
    case "pathParameters":
      dataToValidate = ctx.input?.pathParameters;
      break;
    case "queryStringParameters":
      dataToValidate = ctx.input?.queryStringParameters;
      break;
    case "custom":
      // Para datos custom, usa options.data
      dataToValidate = options.data;
      break;
    default:
      dataToValidate = ctx.input;
  }

  const validate = ajv.compile(schema);
  const valid = validate(dataToValidate);

  if (!valid) {
    const error = {
      type: options.onError?.type || "ValidationError",
      message: options.onError?.message || "Validation failed",
      code: options.onError?.code || 422, // Use 422 for validation errors by default
      details: validate.errors || options.onError?.details,
      validationErrors: validate.errors
    };
    
    return {
      ctx,
      status: "failed",
      error
    };
  }

  const shouldOutput = options.output !== false;
  if (shouldOutput) {
    ctx.output = dataToValidate;
  }

  return { ctx, status: "success" };
});
