const { Orchestrator } = require('./dist/index.js');

async function testSimpleNesting() {
  const orchestrator = new Orchestrator();

  const tools = {
    logger: {
      info: console.log,
      error: console.error,
      warn: console.warn,
      debug: console.debug
    }
  };

  // Test simple 2-level nesting
  const flow = {
    middlewares: [
      {
        name: "Start",
        type: "mapper",
        mapping: {
          "globals.step": "start"
        }
      },
      {
        sequence: [
          {
            name: "InSeq1",
            type: "mapper",
            mapping: {
              "globals.in_seq1": "executed"
            }
          },
          {
            parallel: [
              {
                name: "InParallel1",
                type: "mapper",
                mapping: {
                  "globals.in_parallel1": "executed"
                }
              },
              {
                name: "InParallel2",
                type: "mapper",
                mapping: {
                  "globals.in_parallel2": "executed"
                }
              }
            ]
          },
          {
            name: "InSeq2",
            type: "mapper",
            mapping: {
              "globals.in_seq2": "executed"
            }
          }
        ]
      },
      {
        name: "End",
        type: "mapper",
        mapping: {
          "output.result": "completed"
        }
      }
    ]
  };

  try {
    console.log('🔍 Testing SIMPLE nesting to debug trace hierarchy...\n');
    
    const result = await orchestrator.runFlow(flow, {}, tools);
    
    console.log('\n=== SIMPLE NESTING RESULT ===');
    console.log('Expected hierarchy:');
    console.log('Start');
    console.log('>> sequence');
    console.log('  InSeq1');
    console.log('  || parallel');
    console.log('    InParallel1'); 
    console.log('    InParallel2');
    console.log('  InSeq2');
    console.log('End');
    console.log('\nResult:', result);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testSimpleNesting();
