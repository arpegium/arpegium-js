export const testInputs = {
  simpleMapper: {
    body: { input: "test-value" },
    headers: {},
    env: {}
  },

  highAmountTransfer: {
    body: {
      amount: 1500
    },
    headers: {},
    env: {}
  },

  highAmountPayment: {
    body: {
      amount: 2000,
      type: "payment"
    },
    headers: {},
    env: {}
  },

  lowAmountTransaction: {
    body: {
      amount: 500
    },
    headers: {},
    env: {}
  },

  emptyInput: {
    body: {},
    headers: {},
    env: {}
  }
};
