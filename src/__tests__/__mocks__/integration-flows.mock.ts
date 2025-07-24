export const integrationFlows = {
  complexMapper: {
    name: "complex-mapper-test",
    middlewares: [
      {
        type: "mapper",
        name: "ComplexMapper",
        options: {
          output: true,
          mapping: [
            {
              origin: "body",
              from: "user.name",
              to: "userName"
            },
            {
              origin: "body",
              from: "user.email",
              to: "userEmail"
            },
            {
              value: "ACTIVE",
              to: "status"
            },
            {
              origin: "headers",
              from: "authorization",
              to: "authToken"
            }
          ]
        }
      }
    ]
  },

  validatorSuccess: {
    name: "validator-success-test",
    middlewares: [
      {
        type: "validator",
        name: "InputValidator",
        options: {
          schema: {
            type: "object",
            properties: {
              email: { type: "string", format: "email" },
              age: { type: "number", minimum: 0 }
            },
            required: ["email", "age"]
          },
          source: "body"
        }
      },
      {
        type: "mapper",
        name: "SuccessMapper",
        options: {
          output: true,
          mapping: [
            {
              value: "VALIDATION_PASSED",
              to: "validationStatus"
            }
          ]
        }
      }
    ]
  },

  validatorFailure: {
    name: "validator-failure-test",
    middlewares: [
      {
        type: "validator",
        name: "StrictValidator",
        options: {
          schema: {
            type: "object",
            properties: {
              requiredField: { type: "string" }
            },
            required: ["requiredField"]
          },
          source: "body"
        }
      }
    ]
  },

  debugFlow: {
    name: "debug-test",
    middlewares: [
      {
        type: "mapper",
        name: "DataPrep",
        options: {
          output: false,
          mapping: [
            {
              origin: "body",
              from: "testData",
              to: "prepared"
            }
          ]
        }
      },
      {
        type: "debug",
        name: "DebugPoint",
        options: {
          message: "Debug checkpoint reached",
          logLevel: "info"
        }
      }
    ]
  },

  httpRequestFlow: {
    name: "http-request-test",
    middlewares: [
      {
        type: "httpRequest",
        name: "ApiCall",
        options: {
          url: "https://jsonplaceholder.typicode.com/posts/1",
          method: "GET",
          headers: {
            "Content-Type": "application/json"
          }
        }
      },
      {
        type: "mapper",
        name: "ResponseMapper",
        options: {
          output: true,
          mapping: [
            {
              origin: "globals",
              from: "ApiCall.body.title",
              to: "postTitle"
            },
            {
              origin: "globals",
              from: "ApiCall.statusCode",
              to: "responseStatus"
            }
          ]
        }
      }
    ]
  }
};
