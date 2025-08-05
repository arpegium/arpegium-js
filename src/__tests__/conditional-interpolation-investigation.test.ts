import { interpolate } from '../utils/interpolate';
import { evaluateCondition } from '../core/evaluators/condition-evaluator';

describe('Conditional Interpolation Investigation', () => {
  test('Investigate how interpolation works in different scenarios', () => {
    const context = {
      modeloResponse: {}
    };

    // Caso 1: Interpolación completa (debería devolver null)
    console.log('=== Interpolación completa ===');
    const fullInterpolation1 = interpolate("{{modeloResponse.score}}", context);
    const fullInterpolation2 = interpolate("{{modeloResponse.decil}}", context);
    console.log('{{modeloResponse.score}}:', fullInterpolation1);
    console.log('{{modeloResponse.decil}}:', fullInterpolation2);

    // Caso 2: Interpolación parcial (el problema actual)
    console.log('\n=== Interpolación parcial ===');
    const partialInterpolation = interpolate("{{modeloResponse.score}} != null && {{modeloResponse.decil}} != null", context);
    console.log('Expression after interpolation:', partialInterpolation);

    // Caso 3: Evaluación de condición
    console.log('\n=== Evaluación de condición ===');
    try {
      const conditionResult = evaluateCondition(partialInterpolation);
      console.log('Condition evaluation result:', conditionResult);
    } catch (error) {
      console.log('Condition evaluation error:', error);
    }

    // Caso 4: Con valores null explícitos
    console.log('\n=== Con valores null explícitos ===');
    const contextWithNulls = {
      modeloResponse: {
        score: null,
        decil: null
      }
    };
    
    const nullInterpolation = interpolate("{{modeloResponse.score}} != null && {{modeloResponse.decil}} != null", contextWithNulls);
    console.log('Expression with nulls:', nullInterpolation);
    
    const nullConditionResult = evaluateCondition(nullInterpolation);
    console.log('Null condition result:', nullConditionResult);

    // Caso 5: Con valores válidos
    console.log('\n=== Con valores válidos ===');
    const contextWithValues = {
      modeloResponse: {
        score: 85,
        decil: 7
      }
    };
    
    const valueInterpolation = interpolate("{{modeloResponse.score}} != null && {{modeloResponse.decil}} != null", contextWithValues);
    console.log('Expression with values:', valueInterpolation);
    
    const valueConditionResult = evaluateCondition(valueInterpolation);
    console.log('Value condition result:', valueConditionResult);
  });
});
