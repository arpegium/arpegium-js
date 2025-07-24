export const integrationInputs = {
  complexMapper: {
    body: {
      user: {
        name: "John Doe",
        email: "john@example.com"
      }
    },
    headers: {
      authorization: "Bearer token123"
    },
    env: {}
  },

  validatorSuccess: {
    body: {
      email: "test@example.com",
      age: 25
    },
    headers: {},
    env: {}
  },

  validatorFailure: {
    body: {
      // Missing requiredField
      otherField: "value"
    },
    headers: {},
    env: {}
  },

  debugTest: {
    body: { testData: "debug-test-value" },
    headers: {},
    env: {}
  },

  httpRequestTest: {
    body: {},
    headers: {},
    env: {}
  }
};
