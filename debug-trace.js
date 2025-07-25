const { Orchestrator } = require('./dist/core/orchestrator');

async function debugTrace() {
  const orchestrator = new Orchestrator();
  
  const tools = {
    logger: {
      info: console.log,
      error: console.error,
      warn: console.warn,
      debug: console.debug
    }
  };

  // Test complex nested structures
  const flow = {
    middlewares: [
      {
        sequence: [
          {
            name: "First",
            type: "mapper",
            mapping: { "output.step": "1" }
          },
          {
            parallel: [
              {
                name: "ParallelA",
                type: "mapper",
                mapping: { "output.a": "parallel-a" }
              },
              {
                name: "ParallelB", 
                type: "mapper",
                mapping: { "output.b": "parallel-b" }
              }
            ]
          },
          {
            name: "Last",
            type: "mapper",
            mapping: { "output.final": "done" }
          }
        ]
      }
    ]
  };

  try {
    console.log('🔬 Testing complex nested sequence+parallel...\n');
    
    const result = await orchestrator.runFlow(flow, {}, tools);
    
    console.log('\n🎉 EXECUTION TRACE:');
    console.log(result.executionTrace);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

debugTrace();