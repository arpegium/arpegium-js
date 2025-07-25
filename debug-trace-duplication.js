const { Orchestrator } = require('./dist/core/orchestrator');

async function debugTraceDuplication() {
  const orchestrator = new Orchestrator();
  
  const tools = {
    logger: {
      info: console.log,
      error: console.error,
      warn: console.warn,
      debug: console.debug
    }
  };

  // Flow que reproduce la duplicación del test
  const flow = {
    middlewares: [
      {
        name: "InputMapper",
        type: "mapper",
        options: {
          mapping: [
            { "value": "test", "to": "output.input" }
          ]
        }
      },
      {
        sequence: [
          {
            parallel: [
              {
                name: "UserValidation",
                type: "mapper",
                options: {
                  mapping: [
                    { "value": "user-valid", "to": "output.user" }
                  ]
                }
              },
              {
                name: "AmountValidation", 
                type: "mapper",
                options: {
                  mapping: [
                    { "value": "amount-valid", "to": "output.amount" }
                  ]
                }
              }
            ]
          },
          {
            name: "DebugAfterParallel",
            type: "mapper",
            options: {
              mapping: [
                { "value": "debug-done", "to": "output.debug" }
              ]
            }
          }
        ]
      },
      {
        name: "FinalResponse",
        type: "mapper",
        options: {
          mapping: [
            { "value": "final", "to": "output.final" }
          ]
        }
      }
    ]
  };

  try {
    console.log('🔬 Testing duplication scenario...\n');
    
    const result = await orchestrator.runFlow(flow, {}, tools);
    
    // Let's also manually inspect the raw trace
    console.log('\n🔍 Raw execution trace entries:');
    const rawTrace = result.globals._executionTrace?.getTrace();
    if (rawTrace) {
      rawTrace.forEach((entry, index) => {
        console.log(`${index}: ${entry.name} (parent: ${entry.parent || 'null'}) - ${entry.type} - started: ${entry.startedAt}`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

debugTraceDuplication();
