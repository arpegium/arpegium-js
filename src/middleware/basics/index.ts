import { mapperMiddleware } from "./mapper";
import { httpRequestMiddleware } from "./httpRequest";
import { validatorMiddleware } from "./validator";
import { debugMiddleware } from "./debug";

export function createBasicMiddleware() {
  return {
    mapper: mapperMiddleware,
    httpRequest: httpRequestMiddleware,
    validator: validatorMiddleware,
    debug: debugMiddleware,
    // Add other basic middlewares here
  };
}
