/**
 * Extensible Types Module
 * 
 * Este módulo permite extender los tipos de middleware disponibles en la biblioteca.
 * Los usuarios pueden declarar sus propios tipos de middleware personalizados
 * mediante la extensión del namespace ArpegiumExtensions.
 */

export namespace ArpegiumExtensions {
  /**
   * Interfaz para extender los tipos de middleware.
   * Los usuarios pueden extender este tipo para agregar sus propios middleware types.
   */
  export interface CustomMiddlewareTypes {
    // Por defecto está vacío, los usuarios extienden esto
  }
}

/**
 * Representa los tipos de middleware personalizados definidos por el usuario.
 * Esta utilidad extrae los tipos de middleware de la interfaz CustomMiddlewareTypes.
 */
export type UserDefinedMiddlewareType = keyof ArpegiumExtensions.CustomMiddlewareTypes;

/**
 * String literal para tipos de middleware.
 * Esto permite que cualquier string pueda ser un tipo válido de middleware.
 */
export type AnyMiddlewareType = string;

/**
 * Interfaz para middleware personalizados.
 * Establece la estructura básica que debe seguir un middleware personalizado.
 */
export interface CustomMiddlewareBase<T extends string = string> {
  type: T;
  name: string;
  options?: Record<string, any>;
}

/**
 * Tipo que representa cualquier middleware personalizado.
 * Permite cualquier string como tipo de middleware.
 */
export type AnyCustomMiddleware = CustomMiddlewareBase<AnyMiddlewareType>;

/**
 * Tipo que representa la estructura de un middleware personalizado
 * definido por el usuario a través de la extensión de tipos.
 */
export type UserDefinedMiddleware = {
  [K in UserDefinedMiddlewareType]: CustomMiddlewareBase<K> & ArpegiumExtensions.CustomMiddlewareTypes[K]
}[UserDefinedMiddlewareType];
