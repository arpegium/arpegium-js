import { interpolate } from '../utils/interpolate';

describe('Interpolation Debug', () => {
  test('Check interpolation behavior with missing properties', () => {
    const context = {
      modeloResponse: {}
    };

    const template1 = "{{modeloResponse.score}}";
    const template2 = "{{modeloResponse.decil}}";
    const fullExpression = "{{modeloResponse.score}} != null && {{modeloResponse.decil}} != null";

    console.log('template1 result:', interpolate(template1, context));
    console.log('template2 result:', interpolate(template2, context));
    console.log('fullExpression result:', interpolate(fullExpression, context));

    // Test with explicit nulls
    const contextWithNulls = {
      modeloResponse: {
        score: null,
        decil: null
      }
    };

    console.log('With nulls - template1:', interpolate(template1, contextWithNulls));
    console.log('With nulls - template2:', interpolate(template2, contextWithNulls));
    console.log('With nulls - fullExpression:', interpolate(fullExpression, contextWithNulls));
  });
});
