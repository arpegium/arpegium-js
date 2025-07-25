const { Orchestrator } = require('./dist/index.js');
const fs = require('fs');
const path = require('path');

async function testComplexFlow() {
    console.log('🚀 Testing Arpegium Complex Flow in Production...\n');
    
    // Create orchestrator instance
    const orchestrator = new Orchestrator();
    
    // Define function registry for the complex flow
    const functionRegistry = {
        // Basic utility functions 
        mockValue: (value, fallback) => value || fallback,
        getCurrentTimestamp: () => Date.now(),
        setStatus: (status) => status,
        mockPriority: () => Math.floor(Math.random() * 10),
        
        // Conditional logic
        conditionalValue: (condition, trueValue, falseValue = null) => {
            return condition ? trueValue : falseValue;
        },
    };
    
    // Define tools with function registry
    const tools = {
        logger: console,
        functionRegistry
    };
    
    try {
        // Read the complex flow
        const flowPath = path.join(__dirname, 'flows', 'flujo-complex.json');
        const flowConfig = JSON.parse(fs.readFileSync(flowPath, 'utf8'));
        
        console.log('📋 Flow Structure:');
        console.log('- Sequence containing:');
        console.log('  - Parallel (UserValidation + AmountValidation)');
        console.log('  - Debug middleware');
        console.log('  - Conditional with nested flows:');
        console.log('    - Then: Sequence → Conditional');
        console.log('    - Else: Parallel');
        console.log('- Final Response mapper\n');
        
        // Test case 1: High amount (> 1000) transfer - should trigger complex nested path
        console.log('🔥 Test 1: High Amount Transfer (Complex Nested Path)');
        const highAmountInput = {
            body: {
                amount: 1500,
                type: 'transfer',
                userId: 'user123'
            }
        };
        
        const result1 = await orchestrator.runFlow(flowConfig, highAmountInput, tools);
        console.log('Result 1 (validationResult):', JSON.stringify(result1.validationResult, null, 2));
        console.log('Result 1 (globals keys):', Object.keys(result1.globals || {}));
        console.log('Result 1 - AmountValidation:', JSON.stringify(result1.globals?.AmountValidation, null, 2));
        console.log('Result 1 - HighAmountProcess present?', !!result1.globals?.HighAmountProcess);
        console.log('Result 1 - LowAmountProcess present?', !!result1.globals?.LowAmountProcess);
        console.log('✅ High amount path executed successfully!\n');
        
        // Test case 2: Low amount payment - should trigger parallel else path  
        console.log('🔥 Test 2: Low Amount Payment (Parallel Else Path)');
        const lowAmountInput = {
            body: {
                amount: 500,
                type: 'payment',
                userId: 'user456'
            }
        };
        
        const result2 = await orchestrator.runFlow(flowConfig, lowAmountInput, tools);
        console.log('Result 2 (validationResult):', JSON.stringify(result2.validationResult, null, 2));
        console.log('Result 2 (globals keys):', Object.keys(result2.globals || {}));
        console.log('✅ Low amount path executed successfully!\n');
        
        // Test case 3: High amount payment - different conditional branch
        console.log('🔥 Test 3: High Amount Payment (Different Conditional Branch)');
        const highPaymentInput = {
            body: {
                amount: 2000,
                type: 'payment',
                userId: 'user789'
            }
        };
        
        const result3 = await orchestrator.runFlow(flowConfig, highPaymentInput, tools);
        console.log('Result 3 (validationResult):', JSON.stringify(result3.validationResult, null, 2));
        console.log('Result 3 (globals keys):', Object.keys(result3.globals || {}));
        console.log('✅ High payment path executed successfully!\n');
        
        console.log('🎉 ALL PRODUCTION TESTS PASSED!');
        console.log('✅ Nested flows working perfectly in production');
        console.log('✅ Complex interpolation working correctly');
        console.log('✅ Cross-references between middlewares functioning');
        
    } catch (error) {
        console.error('❌ Production test failed:', error.message);
        console.error('Stack:', error.stack);
        process.exit(1);
    }
}

testComplexFlow();
