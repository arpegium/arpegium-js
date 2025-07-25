const { Orchestrator } = require('./dist/index.js');

async function testExecutionTrace() {
  const orchestrator = new Orchestrator();

  // Add tools with logger to enable execution trace logging
  const tools = {
    logger: {
      info: console.log,
      error: console.error,
      warn: console.warn,
      debug: console.debug
    }
  };

  // Complex test flow with deep nested control structures
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
            name: "SeqLevel1_Start",
            type: "mapper",
            mapping: {
              "globals.seq1_start": "executed"
            }
          },
          {
            parallel: [
              {
                name: "ParallelA",
                type: "mapper",
                mapping: {
                  "globals.parallelA": "executed"
                }
              },
              {
                sequence: [
                  {
                    name: "NestedSeq_Start",
                    type: "mapper",
                    mapping: {
                      "globals.nested_seq_start": "executed"
                    }
                  },
                  {
                    parallel: [
                      {
                        name: "DeepParallel1",
                        type: "mapper",
                        mapping: {
                          "globals.deep_parallel1": "executed"
                        }
                      },
                      {
                        name: "DeepParallel2",
                        type: "mapper",
                        mapping: {
                          "globals.deep_parallel2": "executed"
                        }
                      }
                    ]
                  },
                  {
                    name: "NestedSeq_End",
                    type: "mapper",
                    mapping: {
                      "globals.nested_seq_end": "executed"
                    }
                  }
                ]
              },
              {
                name: "ParallelC",
                type: "mapper", 
                mapping: {
                  "globals.parallelC": "executed"
                }
              }
            ]
          },
          {
            name: "SeqLevel1_Middle",
            type: "mapper",
            mapping: {
              "globals.seq1_middle": "executed"
            }
          },
          {
            conditional: {
              if: "true",
              then: {
                sequence: [
                  {
                    name: "ConditionalSeq_Start",
                    type: "mapper",
                    mapping: {
                      "globals.cond_seq_start": "executed"
                    }
                  },
                  {
                    parallel: [
                      {
                        name: "ConditionalParallel1",
                        type: "mapper",
                        mapping: {
                          "globals.cond_parallel1": "executed"
                        }
                      },
                      {
                        sequence: [
                          {
                            name: "VeryDeepSeq1",
                            type: "mapper",
                            mapping: {
                              "globals.very_deep_seq1": "executed"
                            }
                          },
                          {
                            name: "VeryDeepSeq2",
                            type: "mapper",
                            mapping: {
                              "globals.very_deep_seq2": "executed"
                            }
                          }
                        ]
                      }
                    ]
                  },
                  {
                    name: "ConditionalSeq_End",
                    type: "mapper",
                    mapping: {
                      "globals.cond_seq_end": "executed"
                    }
                  }
                ]
              }
            }
          },
          {
            name: "SeqLevel1_End",
            type: "mapper",
            mapping: {
              "globals.seq1_end": "executed"
            }
          }
        ]
      },
      {
        name: "End",
        type: "mapper",
        mapping: {
          "output.result": "completed",
          "output.total_middlewares": "17"
        }
      }
    ]
  };

  try {
    console.log('🚀 Testing execution trace with DEEP NESTED control structures...\n');
    console.log('📋 Flow structure:');
    console.log('   Start');
    console.log('   └─ sequence');
    console.log('      ├─ SeqLevel1_Start');
    console.log('      ├─ parallel');
    console.log('      │  ├─ ParallelA');
    console.log('      │  ├─ sequence (nested)');
    console.log('      │  │  ├─ NestedSeq_Start');
    console.log('      │  │  ├─ parallel (deep)');
    console.log('      │  │  │  ├─ DeepParallel1');
    console.log('      │  │  │  └─ DeepParallel2');
    console.log('      │  │  └─ NestedSeq_End');
    console.log('      │  └─ ParallelC');
    console.log('      ├─ SeqLevel1_Middle');
    console.log('      ├─ conditional');
    console.log('      │  └─ sequence (in conditional)');
    console.log('      │     ├─ ConditionalSeq_Start');
    console.log('      │     ├─ parallel (in conditional)');
    console.log('      │     │  ├─ ConditionalParallel1');
    console.log('      │     │  └─ sequence (very deep)');
    console.log('      │     │     ├─ VeryDeepSeq1');
    console.log('      │     │     └─ VeryDeepSeq2');
    console.log('      │     └─ ConditionalSeq_End');
    console.log('      └─ SeqLevel1_End');
    console.log('   End');
    console.log('\n⏳ Executing flow...\n');
    
    const result = await orchestrator.runFlow(flow, {}, tools);
    
    console.log('\n=== 🎯 DEEP NESTED EXECUTION TRACE RESULT ===');
    console.log('✅ This shows ALL middlewares including those in deeply nested control structures:');
    console.log('   📊 Sequence blocks (>>) - up to 4 levels deep');
    console.log('   🔀 Parallel blocks (||) - with nested sequences inside'); 
    console.log('   ❓ Conditional blocks (??) - with complex nesting inside');
    console.log('\n📈 Expected: 17 middlewares total in hierarchical structure');
    console.log('📋 Result:', result);
    
  } catch (error) {
    console.error('❌ Error running deep nested flow:', error);
  }
}

testExecutionTrace();
