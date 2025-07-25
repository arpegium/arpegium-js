const { Orchestrator } = require('./dist/core/orchestrator');

async function debugNaranjaStructure() {
  const orchestrator = new Orchestrator();
  
  const tools = {
    logger: {
      info: console.log,
      error: console.error,
      warn: console.warn,
      debug: console.debug
    }
  };

  // Simplified version of naranja-emision structure
  const flow = {
    middlewares: [
      {
        name: "DirectMiddleware1",
        type: "mapper",
        options: {
          mapping: [
            { "value": "1", "to": "output.step" }
          ]
        }
      },
      {
        parallel: [
          {
            name: "ParallelA",
            type: "mapper",
            options: {
              mapping: [
                { "value": "parallel-a", "to": "output.a" }
              ]
            }
          },
          {
            name: "ParallelB", 
            type: "mapper",
            options: {
              mapping: [
                { "value": "parallel-b", "to": "output.b" }
              ]
            }
          }
        ]
      },
      {
        sequence: [
          {
            name: "SequenceA",
            type: "mapper",
            options: {
              mapping: [
                { "value": "sequence-a", "to": "output.seqA" }
              ]
            }
          },
          {
            name: "SequenceB",
            type: "mapper",
            options: {
              mapping: [
                { "value": "sequence-b", "to": "output.seqB" }
              ]
            }
          }
        ]
      },
      {
        name: "DirectMiddleware2",
        type: "mapper",
        options: {
          mapping: [
            { "value": "done", "to": "output.final" }
          ]
        }
      }
    ]
  };

  try {
    console.log('🔬 Testing naranja-like structure...\n');
    
    const result = await orchestrator.runFlow(flow, {}, tools);
    
    console.log('\n📊 Expected order:');
    console.log('1. DirectMiddleware1 [mapper]');
    console.log('2. || parallel');
    console.log('  - ParallelA [mapper]');
    console.log('  - ParallelB [mapper]');
    console.log('3. >> sequence');
    console.log('  - SequenceA [mapper]');
    console.log('  - SequenceB [mapper]');
    console.log('4. DirectMiddleware2 [mapper]');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

debugNaranjaStructure();
