const { Orchestrator } = require('./dist/index.js');

async function testBasicParallel() {
  const orchestrator = new Orchestrator();

  const tools = {
    logger: {
      info: console.log,
      error: console.error,
      warn: console.warn,
      debug: console.debug
    }
  };

  // Test JUST a basic parallel at root level
  const flow = {
    middlewares: [
      {
        parallel: [
          {
            name: "Simple1",
            type: "mapper",
            mapping: {
              "output.simple1": "executed"
            }
          },
          {
            name: "Simple2",
            type: "mapper",
            mapping: {
              "output.simple2": "executed"
            }
          }
        ]
      }
    ]
  };

  try {
    console.log('🧪 Testing BASIC parallel at root level...\n');
    
    const result = await orchestrator.runFlow(flow, {}, tools);
    
    console.log('\n=== BASIC PARALLEL RESULT ===');
    console.log('Expected: || parallel with Simple1 and Simple2');
    console.log('Result:', result);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testBasicParallel();
