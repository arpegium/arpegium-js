export function createContext() {
  return {
    input: {},
    output: {},
    globals: {} as Record<string, any>,
  };
}
