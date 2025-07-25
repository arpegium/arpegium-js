const { Orchestrator } = require('./dist/index.js');

async function testMapperCopyOverwrite() {
  console.log('🧪 Testing mapper copy and overwrite functionality...\n');

  const orchestrator = new Orchestrator();

  // Simular función maskPan
  const tools = {
    logger: console,
    functionRegistry: {
      maskPan: (pan) => {
        if (!pan) return 'XXXX-XXXX-XXXX-XXXX';
        return pan.substring(0, 4) + '-XXXX-XXXX-' + pan.substring(pan.length - 4);
      }
    }
  };

  const testFlow = {
    name: "test-mapper-copy-overwrite",
    middlewares: [
      {
        type: "mapper",
        name: "maskedPanRequest",
        options: {
          output: true,
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
      }
    ]
  };

  const testInput = {
    body: {
      userId: "user123",
      amount: 1000,
      payment_method: {
        type: "card",
        pan: "1234567890123456",
        expiry: "12/25"
      },
      merchant_id: "merchant_456"
    }
  };

  try {
    const result = await orchestrator.runFlow(testFlow, testInput, tools);
    
    console.log('📋 Input:');
    console.log(JSON.stringify(testInput, null, 2));
    
    console.log('\n📦 Result:');
    console.log(JSON.stringify(result, null, 2));
    
    // Verificaciones
    console.log('\n✅ Verification:');
    console.log('1. Full copy worked:', !!result.request);
    console.log('2. userId copied:', result.request.userId === 'user123');
    console.log('3. amount copied:', result.request.amount === 1000);
    console.log('4. payment_method copied:', !!result.request.payment_method);
    console.log('5. PAN masked:', result.request.payment_method.pan !== '1234567890123456');
    console.log('6. PAN format correct:', result.request.payment_method.pan.includes('XXXX'));
    console.log('7. Other fields preserved:', result.request.payment_method.expiry === '12/25');
    console.log('8. Merchant ID preserved:', result.request.merchant_id === 'merchant_456');
    
    const allTestsPassed = 
      !!result.request &&
      result.request.userId === 'user123' &&
      result.request.amount === 1000 &&
      !!result.request.payment_method &&
      result.request.payment_method.pan !== '1234567890123456' &&
      result.request.payment_method.pan.includes('XXXX') &&
      result.request.payment_method.expiry === '12/25' &&
      result.request.merchant_id === 'merchant_456';
    
    console.log('\n🎯 Overall result:', allTestsPassed ? '✅ SUCCESS' : '❌ FAILED');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testMapperCopyOverwrite();
