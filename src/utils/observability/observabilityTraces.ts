// Implementación básica para el framework - puede ser sobrescrita por implementaciones específicas
export async function traceWithObservability(
  name: string,
  fn: (span?: any) => any,
  parentSpan?: any
) {
  // Implementación básica sin tracing real
  return fn(null);
}
