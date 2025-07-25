const { Orchestrator } = require('./dist/index');

const testComplexNestedFlow = {
  "name": "complex-nested-test",
  "middlewares": [
    {
      "parallel": [
        {
          "sequence": [
            {
              "parallel": [
                { "type": "debug", "name": "Debug1", "options": { "message": "Parallel 1.1" }},
                { "type": "debug", "name": "Debug2", "options": { "message": "Parallel 1.2" }}
              ]
            },
            { "type": "debug", "name": "Debug3", "options": { "message": "After nested parallel" }}
          ]
        },
        {
          "conditional": {
            "if": "{{test}} === 'complex nesting'",
            "then": {
              "sequence": [
                { "type": "debug", "name": "Debug4", "options": { "message": "Conditional then sequence 1" }},
                {
                  "parallel": [
                    { "type": "debug", "name": "Debug5", "options": { "message": "Conditional parallel 1" }},
                    { "type": "debug", "name": "Debug6", "options": { "message": "Conditional parallel 2" }}
                  ]
                }
              ]
            }
          }
        }
      ]
    }
  ]
};

async function testNestedSupport() {
  console.log("🧪 Testing nested flow support...");
  
  const orchestrator = new Orchestrator();
  
  try {
    const result = await orchestrator.runFlow(testComplexNestedFlow, {
      test: "complex nesting"
    }, {});
    
    console.log("✅ Complex nested flow executed successfully!");
    console.log("Result keys:", Object.keys(result || {}));
    if (result && result.globals) {
      console.log("Globals keys:", Object.keys(result.globals));
    }
    console.log("Flow executed successfully with all nested levels!");
    
  } catch (error) {
    console.error("❌ Error executing complex nested flow:", error.message);
    console.error(error.stack);
  }
}

testNestedSupport();
