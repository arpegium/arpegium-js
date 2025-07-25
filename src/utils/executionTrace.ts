type TraceNode = {
  name: string;
  type: string;
  status: string;
  parent: string | null;
  isControl: boolean;
  blocking?: boolean;
  durationMs?: number;
  startedAt?: number;
  endedAt?: number;
  asyncSend?: boolean;
};

export function addTrace(ctx: any, node: TraceNode) {
  if (!ctx.executionTrace) ctx.executionTrace = [];
  ctx.executionTrace.push(node);
}

export function buildExecutionTraceString(trace: any[], totalDuration?: number): string {
  let lines: string[] = [];
  lines.push('--- Middleware Execution Tree ---');
  
  // Si es el nuevo formato ExecutionTraceEntry
  if (trace.length > 0 && trace[0].name && trace[0].type) {
    
    // Función helper para formatear una entrada
    const formatEntry = (entry: any, level: number): string => {
      // Crear indentación con pipes para niveles anidados
      let indent = '';
      for (let i = 0; i < level; i++) {
        indent += '|  ';
      }
      
      const statusIcon = entry.status === 'success' ? '✓' : entry.status === 'failed' ? '✗' : '⏳';
      const duration = entry.durationMs || entry.duration || 0;
      
      if (entry.type === 'middleware') {
        return `${indent}${entry.name} [${entry.type}] (${statusIcon}) (${duration}ms)`;
      } else if (entry.type === 'parallel') {
        return `${indent}|| parallel (${duration}ms)`;
      } else if (entry.type === 'sequence') {
        return `${indent}>> sequence (${duration}ms)`;
      } else if (entry.type === 'conditional') {
        return `${indent}?? conditional (${duration}ms)`;
      } else {
        return `${indent}${entry.name} [${entry.type}] (${statusIcon}) (${duration}ms)`;
      }
    };
    
    // Función recursiva simplificada que procesa un nodo y sus hijos
    const processNode = (entry: any, level: number = 0, visited: Set<string> = new Set()) => {
      // Protección contra referencias circulares
      if (visited.has(entry.name)) {
        return;
      }
      visited.add(entry.name);
      
      // Protección contra profundidad excesiva
      if (level > 10) {
        return;
      }
      
      // Agregar esta entrada
      lines.push(formatEntry(entry, level));
      
      // Buscar y procesar sus hijos en orden temporal
      const children = trace
        .filter(child => child.parent === entry.name)
        .sort((a, b) => (a.startedAt || 0) - (b.startedAt || 0));
      
      children.forEach(child => processNode(child, level + 1, visited));
    };
    
    // Función para determinar si una entrada es root (no tiene padre)
    const isRootEntry = (entry: any): boolean => {
      return !entry.parent || entry.parent === null;
    };
    
    // Obtener elementos root y procesarlos en orden temporal
    const rootElements = trace
      .filter(isRootEntry)
      .sort((a, b) => (a.startedAt || 0) - (b.startedAt || 0));
    
    rootElements.forEach(rootElement => processNode(rootElement));
    
  } else {
    // Formato anterior (legacy)
    for (const item of trace) {
      const indent = '  '.repeat(item.level || 0);
      if (item.type === 'middleware') {
        lines.push(
          `${indent}${item.name} [${item.mwType}] (${item.status === 'success' ? '✓' : '✗'}) (${item.duration}ms)`
        );
      } else if (item.type === 'parallel') {
        lines.push(`${indent}|| (${item.duration}ms)`);
      } else if (item.type === 'sequence') {
        // Opcional: puedes imprimir secuencia si quieres
        // lines.push(`${indent}>> sequence (${item.duration}ms)`);
      } else if (item.type === 'switch') {
        lines.push(`${indent}?? (${item.duration}ms)`);
      }
    }
  }
  
  if (totalDuration !== undefined) {
    lines.push(`\nTotal flow duration: ${totalDuration}ms`);
  }
  lines.push('-------------------------------\n');
  return lines.join('\n');
}

export function printExecutionTrace(trace: any[], totalDuration?: number, logger?: any) {
  const traceMessage = buildExecutionTraceString(trace, totalDuration);
  if (logger?.info) {
    logger.info({
      message: "Execution Trace",
      executionTrace: traceMessage
    });
  }
}

export interface ExecutionTraceEntry {
  name: string;
  type: string;
  status: 'success' | 'failed' | 'running';
  parent: string | null;
  isControl: boolean;
  durationMs: number;
  startedAt: number;
  endedAt: number;
  asyncSend: boolean;
  error?: string;
}

export class ExecutionTrace {
  private trace: ExecutionTraceEntry[] = [];

  addEntry(
    entry: Partial<ExecutionTraceEntry> & { name: string; type: string }
  ): ExecutionTraceEntry {
    const traceEntry: ExecutionTraceEntry = {
      status: 'running',
      parent: null,
      isControl: false,
      durationMs: 0,
      startedAt: Date.now(),
      endedAt: 0,
      asyncSend: false,
      ...entry,
    };

    this.trace.push(traceEntry);
    return traceEntry;
  }

  updateEntry(name: string, updates: Partial<ExecutionTraceEntry>): void {
    const entry = this.trace.find((e) => e.name === name);
    if (entry) {
      Object.assign(entry, updates);
      if (updates.endedAt && entry.startedAt) {
        entry.durationMs = updates.endedAt - entry.startedAt;
      }
    }
  }

  getTrace(): ExecutionTraceEntry[] {
    return [...this.trace];
  }

  clear(): void {
    this.trace = [];
  }
}
