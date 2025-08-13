# Implementación de Retry Nested Steps

Este archivo define una mejora para el middleware de retry, permitiendo mostrar detalles de los pasos anidados en el árbol de ejecución.

## Problema

Actualmente, cuando un middleware retry ejecuta un paso interno (especialmente una secuencia o estructura compleja), el árbol de ejecución no muestra adecuadamente la jerarquía entre el retry y los pasos que ejecuta, lo que dificulta el seguimiento y depuración.

## Solución

La solución implica:

1. Modificar el middleware retry para incluir una referencia explícita a los pasos que ejecuta
2. Establecer la relación padre-hijo correctamente en el execution trace
3. Actualizar el formateador del árbol de ejecución para mostrar esta jerarquía

## Implementación

Para esto necesitamos modificar:

1. `src/middleware/basics/retry.ts`: Para establecer el parentesco correcto
2. `src/core/flow-runners/execute-step.ts`: Para propagar la relación padre-hijo
3. `src/utils/executionTrace.ts`: Para visualizar correctamente la jerarquía

## Ejemplo de visualización esperada

```
RetryPaymentGateway [retry] (✓) (398ms)
|  [Retry: 1/3 attempts] Step type: sequence
|  ✓ Attempt 1: success 398ms
|  |  counters [httpRequest] (✓) (397ms)
|  Total duration: 398ms, Avg attempt: 398ms
```

Este formato permitirá una visualización clara de la ejecución interna del retry, facilitando la depuración de flujos complejos.


## Ejemplo de definición de paso Retry anidado

```json
{
    "type": "retry",
    "name": "RetryCountersCall",
    "options": {
        "maxAttempts": 3,
        "interval": 2,
        "backoffRate": 3,
        "step": {
            "sequence": [
                {
                    "type": "httpRequest",
                    "name": "counters",
                    "options": {
                        "output": false,
                        "blocking": false,
                        "url": "{{env.COUNTERS_URL}}",
                        "method": "POST",
                        "body": "{{CountersMapper}}",
                        "headers": {
                            "Content-Type": "application/json",
                            "Authorization": "Bearer {{CountersToken}}"
                        }
                    }
                }
            ]
        }
    }
}
```