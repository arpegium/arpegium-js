const { Orchestrator } = require('./dist/index.js');

async function testMapperOutputPrecedence() {
  console.log('🧪 Testing mapper output precedence...\n');

  const orchestrator = new Orchestrator();

  // Simular función maskPan
  const tools = {
    logger: console,
    functionRegistry: {
      maskPan: (pan) => {
        if (!pan) return 'XXXX-XXXX-XXXX-XXXX';
        return pan.substring(0, 6) + '******' + pan.substring(pan.length - 4);
      },
      mockValue: (value, fallback) => {
        return value || fallback;
      }
    }
  };

  const testFlow = {
    name: "test-mapper-output-precedence",
    middlewares: [
      {
        type: "mapper",
        name: "maskedPanRequest",
        options: {
          output: true,  // Este debería ser el output final
          mapping: [
            {
              origin: "body",
              from: "*",
              to: "request"
            },
            {
              fn: "maskPan({{payment_method.pan}})",
              to: "request.payment_method.pan"
            }
          ]
        }
      },
      {
        type: "mapper",
        name: "eventBusMessageMapper",
        options: {
          // NO tiene output: true, por lo que no debería modificar el output
          mapping: [
            {
              value: "",
              to: "application_id"
            },
            {
              value: "",
              to: "company_id"
            },
            {
              origin: "body",
              from: "transactions.id",
              to: "payment_id"
            },
            {
              fn: "mockValue({{type}},'card_payment')",
              to: "event_id"
            }
          ]
        }
      }
    ]
  };

  const input = {
    body: {
      type: "card_payment",
      payment_method: {
        pan: "2200000018797422",
        name: "NARANJA"
      },
      transactions: {
        id: "43167825071014462616298589"
      }
    }
  };

  try {
    const result = await orchestrator.runFlow(testFlow, input, tools);
    
    console.log('📋 Input:');
    console.log(JSON.stringify(input, null, 2));
    console.log('\n📦 Final Result:');
    console.log(JSON.stringify(result, null, 2));
    
    // Verificaciones
    const isRequestShape = result && result.request && !result.application_id;
    
    console.log('\n✅ Verification:');
    console.log('1. Output is request shape (not eventBus shape):', isRequestShape);
    console.log('2. Has masked PAN:', result?.request?.payment_method?.pan?.includes('******'));
    console.log('3. No eventBus fields in output:', !result.hasOwnProperty('application_id'));
    
    if (isRequestShape && result?.request?.payment_method?.pan?.includes('******')) {
      console.log('\n🎯 Overall result: ✅ SUCCESS - Output mapper precedence works!');
    } else {
      console.log('\n🎯 Overall result: ❌ FAILED - Output is still being overwritten');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testMapperOutputPrecedence();
