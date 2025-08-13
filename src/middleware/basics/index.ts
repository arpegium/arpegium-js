import { mapperMiddleware } from "./mapper";
import { httpRequestMiddleware } from "./httpRequest";
import { validatorMiddleware } from "./validator";
import { debugMiddleware } from "./debug";
import { retryMiddleware } from "./retry";

export function createBasicMiddleware() {
  return {
    mapper: mapperMiddleware,
    httpRequest: httpRequestMiddleware,
    validator: validatorMiddleware,
    debug: debugMiddleware,
    retry: retryMiddleware,
    // Add other basic middlewares here
  };
}
