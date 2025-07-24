export const testFlows = {
  simpleMapper: {
    name: "test-flow",
    middlewares: [
      {
        type: "mapper",
        name: "TestMapper",
        options: {
          mapping: [
            {
              origin: "body",
              from: "input",
              to: "output"
            }
          ]
        }
      }
    ]
  },

  highAmountTransfer: {
    name: "high-amount-transfer-flow",
    middlewares: [
      {
        type: "mapper",
        name: "InputMapper",
        options: {
          output: false,
          mapping: [
            {
              origin: "body",
              from: "amount",
              to: "transactionAmount"
            }
          ]
        }
      },
      {
        type: "mapper",
        name: "TestMapper",
        options: {
          output: true,
          mapping: [
            {
              origin: "globals",
              from: "InputMapper.transactionAmount",
              to: "amount"
            },
            {
              value: "test-passed",
              to: "status"
            }
          ]
        }
      }
    ]
  },

  conditionalPayment: {
    name: "conditional-test-flow",
    middlewares: [
      {
        type: "mapper",
        name: "PaymentProcessor",
        options: {
          output: true,
          mapping: [
            {
              origin: "body",
              from: "type",
              to: "transactionType"
            },
            {
              value: "PAYMENT_PROCESSED",
              to: "status"
            }
          ]
        }
      }
    ]
  },

  lowAmountTransaction: {
    name: "low-amount-flow",
    middlewares: [
      {
        type: "mapper",
        name: "InputMapper",
        options: {
          output: false,
          mapping: [
            {
              origin: "body",
              from: "amount",
              to: "transactionAmount"
            }
          ]
        }
      },
      {
        conditional: {
          condition: "{{InputMapper.transactionAmount}} > 1000",
          then: [
            {
              type: "mapper",
              name: "HighAmountProcess",
              options: {
                output: false,
                mapping: [
                  {
                    value: "BLOCKED",
                    to: "riskStatus"
                  }
                ]
              }
            }
          ],
          else: [
            {
              type: "mapper",
              name: "LowAmountProcess",
              options: {
                output: false,
                mapping: [
                  {
                    value: "ACCEPTED",
                    to: "riskStatus"
                  }
                ]
              }
            },
            {
              type: "mapper",
              name: "FastTrackProcess",
              options: {
                output: false,
                mapping: [
                  {
                    value: "FAST_TRACK",
                    to: "processType"
                  }
                ]
              }
            }
          ]
        }
      },
      {
        type: "mapper",
        name: "FinalResponse",
        options: {
          output: true,
          mapping: [
            {
              origin: "globals",
              from: "LowAmountProcess.riskStatus",
              to: "riskStatus"
            },
            {
              origin: "globals",
              from: "FastTrackProcess.processType",
              to: "processType"
            }
          ]
        }
      }
    ]
  },

  parallelExecution: {
    name: "parallel-test-flow",
    middlewares: [
      {
        parallel: [
          {
            type: "mapper",
            name: "Process1",
            options: {
              output: false,
              mapping: [
                {
                  value: "result1",
                  to: "result1"
                }
              ]
            }
          },
          {
            type: "mapper",
            name: "Process2",
            options: {
              output: false,
              mapping: [
                {
                  value: "result2",
                  to: "result2"
                }
              ]
            }
          },
          {
            type: "mapper",
            name: "Process3",
            options: {
              output: false,
              mapping: [
                {
                  value: "result3",
                  to: "result3"
                }
              ]
            }
          }
        ]
      },
      {
        type: "mapper",
        name: "FinalMapper",
        options: {
          output: true,
          mapping: [
            {
              origin: "globals",
              from: "Process1.result1",
              to: "process1Result"
            },
            {
              origin: "globals",
              from: "Process2.result2",
              to: "process2Result"
            },
            {
              origin: "globals",
              from: "Process3.result3",
              to: "process3Result"
            }
          ]
        }
      }
    ]
  },

  sequenceExecution: {
    name: "sequence-test-flow",
    middlewares: [
      {
        sequence: [
          {
            type: "mapper",
            name: "Step1",
            options: {
              output: false,
              mapping: [
                {
                  value: "step1-done",
                  to: "step1Status"
                }
              ]
            }
          },
          {
            type: "mapper",
            name: "Step2",
            options: {
              output: false,
              mapping: [
                {
                  origin: "globals",
                  from: "Step1.step1Status",
                  to: "previousStep"
                },
                {
                  value: "step2-done",
                  to: "step2Status"
                }
              ]
            }
          }
        ]
      },
      {
        type: "mapper",
        name: "FinalMapper",
        options: {
          output: true,
          mapping: [
            {
              origin: "globals",
              from: "Step2.previousStep",
              to: "step1Result"
            },
            {
              origin: "globals",
              from: "Step2.step2Status",
              to: "step2Result"
            }
          ]
        }
      }
    ]
  }
};
