# Extensión de Tipos para Middlewares Personalizados

En Arpegium, puedes extender los tipos disponibles para incluir tus propios middlewares personalizados. Esto proporciona seguridad de tipos, autocompletado y verificación en tiempo de compilación para tus middlewares personalizados.

## Pasos para crear un middleware personalizado con soporte completo de tipos

### 1. Extender los tipos en tu proyecto

Crea un archivo de declaración de tipos (por ejemplo, `src/types/arpegium.d.ts`) en tu proyecto:

```typescript
// src/types/arpegium.d.ts

import { ArpegiumExtensions } from 'arpegium';

declare module 'arpegium' {
  namespace ArpegiumExtensions {
    interface CustomMiddlewareTypes {
      // Define tu middleware personalizado y sus opciones
      'miMiddleware': {
        options: {
          // Define las opciones de tu middleware
          parametro1: string;
          parametro2: number;
          parametroOpcional?: boolean;
        }
      };
      
      // Puedes agregar más tipos de middleware personalizados
      'otroMiddleware': {
        options: {
          // ...más opciones
        }
      }
    }
  }
}
```

### 2. Implementar tu middleware personalizado

```typescript
import { createMiddleware } from 'arpegium';

// Implementa tu middleware personalizado
export const miMiddlewarePersonalizado = createMiddleware(async (ctx, mw, tools) => {
  const options = mw.options || {};
  const parametro1 = options.parametro1;
  const parametro2 = options.parametro2;
  
  // Lógica de tu middleware
  
  return {
    ctx,
    status: 'success'
  };
});
```

### 3. Registrar tu middleware en el orquestador

```typescript
import { Orchestrator } from 'arpegium';
import { miMiddlewarePersonalizado } from './mi-middleware';

const orchestrator = new Orchestrator();

// Registra tu middleware
orchestrator.registerMiddleware('miMiddleware', miMiddlewarePersonalizado);
```

### 4. Usar tu middleware en un flujo

```typescript
import { FlowDefinition } from 'arpegium';

// Ahora tienes verificación de tipos y autocompletado
const flujo: FlowDefinition = {
  name: "mi-flujo",
  middlewares: [
    {
      type: "miMiddleware", // ✓ TypeScript reconoce este tipo
      name: "PasoPersonalizado",
      options: {
        parametro1: "valor", // ✓ TypeScript verifica los tipos
        parametro2: 123,     // ✓ TypeScript verifica los tipos
        // parametroInvalido: true // ✗ TypeScript mostraría un error
      }
    }
  ]
};
```

## Ventajas

- **Seguridad de tipos**: TypeScript verificará que tus flujos usen correctamente los middlewares personalizados
- **Autocompletado**: Obtendrás sugerencias de autocompletado para las opciones de tu middleware
- **Documentación integrada**: La estructura de tipos sirve como documentación para los usuarios de tu middleware
- **Detección temprana de errores**: Los problemas se detectan durante el desarrollo, no en tiempo de ejecución

## Notas importantes

- La extensión de tipos no afecta el comportamiento en tiempo de ejecución, solo proporciona mejor soporte durante el desarrollo
- Asegúrate de que la implementación de tu middleware valide correctamente las opciones recibidas
- Recuerda registrar tu middleware personalizado antes de usarlo en un flujo
