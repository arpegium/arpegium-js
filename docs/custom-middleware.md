# Middleware Personalizado en Arpegium

## Implementación y Registro

Ahora puedes registrar cualquier middleware personalizado en Arpegium sin restricciones de tipo. Esta es una guía sobre cómo hacerlo:

### 1. Crear tu middleware personalizado

```typescript
import { createMiddleware } from 'arpegium';

// Implementa tu middleware personalizado
export const miMiddlewareEspecial = createMiddleware(async (ctx, mw, tools) => {
  // Obtener opciones
  const options = mw.options || {};
  
  // Implementar la lógica específica del middleware
  
  // Devolver el resultado
  return {
    ctx,
    status: 'success'
  };
});
```

### 2. Registrar el middleware en el orquestador

```typescript
import { Orchestrator } from 'arpegium';
import { miMiddlewareEspecial } from './mi-middleware';

const orchestrator = new Orchestrator();

// Registra tu middleware con el tipo que quieras utilizar
orchestrator.registerMiddleware('miTipoEspecial', miMiddlewareEspecial);
```

### 3. Usar el middleware en tu flujo

```typescript
import { FlowDefinition } from 'arpegium';

// Definir un flujo que use tu middleware personalizado
const flujo: FlowDefinition = {
  name: "mi-flujo-personalizado",
  middlewares: [
    {
      // El tipo debe coincidir con el nombre usado al registrar
      type: "miTipoEspecial",
      name: "MiPasoPersonalizado",
      options: {
        // Opciones específicas para tu middleware
        parametro1: "valor",
        parametro2: 123
      }
    }
  ]
};
```

### 4. Usar middleware personalizado dentro de retry

```typescript
const flujoConRetry: FlowDefinition = {
  name: "flujo-con-retry",
  middlewares: [
    {
      type: "retry",
      name: "RetryMiMiddleware",
      options: {
        maxAttempts: 3,
        interval: 1,
        backoffRate: 2,
        step: {
          // Puedes usar tu middleware personalizado dentro de retry
          type: "miTipoEspecial",
          name: "MiPasoARetry",
          options: {
            // Opciones específicas
          }
        }
      }
    }
  ]
};
```

## Ventajas del Enfoque Actual

- **Flexibilidad total**: Puedes registrar y usar cualquier tipo de middleware sin restricciones
- **Sin modificaciones en la biblioteca base**: No necesitas cambiar código en la biblioteca para añadir nuevos tipos
- **Compatible con todas las características**: Funciona con todas las características de Arpegium, incluyendo retry, sequence, parallel, etc.

## Consideraciones

- Es importante que el nombre usado como `type` en el flujo coincida exactamente con el nombre usado al registrar el middleware con `orchestrator.registerMiddleware()`
- Cada middleware personalizado debe implementarse usando la función `createMiddleware` para mantener la consistencia con el resto de middlewares de Arpegium
