export function interpolate(template: any, context: any): any {
  // Si no es string, devolver tal como está
  if (typeof template !== 'string') {
    return template;
  }

  // If it's a complete object reference (e.g., "{{UserMapper}}")
  const fullObjectMatch = template.match(/^\{\{([^}]+)\}\}$/);
  if (fullObjectMatch) {
    const path = fullObjectMatch[1].trim();
    const keys = path.split('.');
    let value = context;
    
    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        // Si no encuentra el valor, devuelve null en lugar del template original
        return null;
      }
    }
    
    // Si encontramos el valor, lo devolvemos (puede ser objeto, string, etc.)
    return value !== undefined && value !== null ? value : null;
  }

  // Para interpolación parcial en strings (ej: "Bearer {{token}}")
  const result = template.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
    const keys = path.trim().split('.');
    let value = context;
    
    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        // Para consistencia con interpolación completa, devolvemos 'null' en lugar de cadena vacía
        return 'null';
      }
    }
    
    return String(value);
  });
  
  return result;
}
