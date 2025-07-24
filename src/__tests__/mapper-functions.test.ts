import { Orchestrator } from '../index';
import { mockLogger, clearLoggerMocks } from './__mocks__';

describe('Mapper Functions Tests', () => {
  let orchestrator: Orchestrator;

  beforeEach(() => {
    orchestrator = new Orchestrator();
    clearLoggerMocks();
  });

  test('should handle mapper with functions when functionRegistry is missing', async () => {
    const flow = {
      name: "function-test",
      middlewares: [
        {
          type: "mapper",
          name: "FunctionMapper",
          options: {
            output: true,
            mapping: [
              {
                fn: "mockValue('test-value', 'fallback')",
                to: "result"
              },
              {
                fn: "getCurrentTimestamp()",
                to: "timestamp"
              }
            ]
          }
        }
      ]
    };

    const input = { body: {}, headers: {}, env: {} };
    const tools = { logger: mockLogger }; // No functionRegistry

    const result = await orchestrator.runFlow(flow, input, tools);
    
    // Las funciones deberían fallar y retornar undefined
    expect(result.result).toBeUndefined();
    expect(result.timestamp).toBeUndefined();
  });

  test('should handle mapper with functions when functionRegistry is provided', async () => {
    const flow = {
      name: "function-test",
      middlewares: [
        {
          type: "mapper",
          name: "FunctionMapper",
          options: {
            output: true,
            mapping: [
              {
                fn: "mockValue('test-value', 'fallback')",
                to: "result"
              },
              {
                fn: "getCurrentTimestamp()",
                to: "timestamp"
              }
            ]
          }
        }
      ]
    };

    const input = { body: {}, headers: {}, env: {} };
    
    // Crear un functionRegistry básico
    const functionRegistry = {
      mockValue: (value: any, fallback: any) => {
        return value || fallback;
      },
      getCurrentTimestamp: () => {
        return Date.now();
      }
    };
    
    const tools = { 
      logger: mockLogger, 
      functionRegistry 
    };

    const result = await orchestrator.runFlow(flow, input, tools);
    
    // Ahora las funciones deberían funcionar
    expect(result.result).toBe('test-value');
    expect(Number(result.timestamp)).toBeGreaterThan(0);
    expect(typeof result.timestamp).toBe('string'); // Se convierte a string en el mapping
  });

  test('should handle simple sequential mappers with functions', async () => {
    const functionRegistry = {
      addPrefix: (value: string) => `prefix_${value}`,
      addSuffix: (value: string) => `${value}_suffix`
    };

    const flow = {
      name: "sequential-mappers-test",
      middlewares: [
        {
          type: "mapper",
          name: "FirstMapper",
          options: {
            output: false,
            mapping: [
              {
                fn: "addPrefix({{body.value}})",
                to: "prefixed"
              }
            ]
          }
        },
        {
          type: "mapper",
          name: "SecondMapper",
          options: {
            output: true,
            mapping: [
              {
                fn: "addSuffix({{FirstMapper.prefixed}})",
                to: "final"
              }
            ]
          }
        }
      ]
    };

    const input = {
      body: { value: "test" },
      headers: {},
      env: {}
    };

    const tools = { 
      logger: mockLogger, 
      functionRegistry 
    };

    const result = await orchestrator.runFlow(flow, input, tools);
    
    // El segundo mapper debería ser el output
    expect(result.final).toBe('prefix_test_suffix');
  });

  test('should handle comprehensive function registry example from documentation', async () => {
    // Este test valida el ejemplo completo de la documentación
    const functionRegistry = {
      validateEmail: (email: string) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
      },
      
      formatPhoneNumber: (phone: string) => {
        const phoneStr = String(phone); // Convertir a string de forma segura
        const cleaned = phoneStr.replace(/\D/g, '');
        return cleaned.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3');
      },
      
      calculateDiscount: (amount: number, customerType: string) => {
        const amountNum = Number(amount); // Convertir a number de forma segura
        const discounts: Record<string, number> = { premium: 0.15, standard: 0.05, basic: 0 };
        return amountNum * (discounts[customerType] || 0);
      },
      
      getCurrentTimestamp: () => Date.now(),
      generateId: () => `usr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };

    const userProcessingFlow = {
      name: "user-processing-flow",
      middlewares: [
        {
          type: "mapper",
          name: "DataValidator",
          options: {
            output: false,
            mapping: [
              {
                fn: "validateEmail({{body.email}})",
                to: "isEmailValid"
              },
              {
                fn: "generateId()",
                to: "userId"
              }
            ]
          }
        },
        {
          type: "mapper",
          name: "DataProcessor",
          options: {
            output: true,
            mapping: [
              {
                origin: "globals",
                from: "DataValidator.userId",
                to: "id"
              },
              {
                origin: "body",
                from: "email",
                to: "email"
              },
              {
                fn: "formatPhoneNumber({{body.phone}})",
                to: "formattedPhone"
              },
              {
                fn: "calculateDiscount({{body.orderAmount}}, {{body.customerType}})",
                to: "discount"
              },
              {
                fn: "getCurrentTimestamp()",
                to: "processedAt"
              }
            ]
          }
        }
      ]
    };

    const input = {
      body: {
        email: "user@example.com",
        phone: "1234567890",
        orderAmount: 100,
        customerType: "premium"
      },
      headers: {},
      env: {}
    };

    const tools = { 
      logger: mockLogger, 
      functionRegistry 
    };

    const result = await orchestrator.runFlow(userProcessingFlow, input, tools);
    
    // El segundo mapper tiene output: true, por lo que debe ser el resultado final
    expect(result.id).toBeDefined();
    expect(result.email).toBe("user@example.com");
    expect(result.formattedPhone).toBe("(123) 456-7890");
    expect(result.discount).toBe("15"); // Se convierte a string por el mapper
    expect(Number(result.processedAt)).toBeGreaterThan(0);
  });

  test('should handle missing functions gracefully', async () => {
    const flow = {
      name: "missing-function-test",
      middlewares: [
        {
          type: "mapper",
          name: "TestMapper",
          options: {
            output: true,
            mapping: [
              {
                fn: "nonExistentFunction('test')",
                to: "result"
              },
              {
                value: "fallback-value",
                to: "fallback"
              }
            ]
          }
        }
      ]
    };

    const input = { body: {}, headers: {}, env: {} };
    const tools = { 
      logger: mockLogger, 
      functionRegistry: {} // Empty registry
    };

    const result = await orchestrator.runFlow(flow, input, tools);
    
    // La función faltante debería retornar undefined
    expect(result.result).toBeUndefined();
    // Pero otros valores deberían funcionar
    expect(result.fallback).toBe('fallback-value');
  });
});
