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
  lines.push('--- Middleware Execution Map ---');
  
  // Si es el nuevo formato ExecutionTraceEntry
  if (trace.length > 0 && trace[0].name && trace[0].type) {
    const buildTreeLevel = (entries: any[], parentName: string | null, level: number = 0) => {
      const children = entries.filter(entry => entry.parent === parentName);
      
      for (const entry of children) {
        const indent = '  '.repeat(level);
        const statusIcon = entry.status === 'success' ? '✓' : entry.status === 'failed' ? '✗' : '⏳';
        const duration = entry.durationMs || 0;
        
        if (entry.type === 'middleware') {
          lines.push(`${indent}${entry.name} [${entry.type}] (${statusIcon}) (${duration}ms)`);
        } else if (entry.type === 'parallel') {
          lines.push(`${indent}|| parallel (${duration}ms)`);
        } else if (entry.type === 'sequence') {
          lines.push(`${indent}>> sequence (${duration}ms)`);
        } else if (entry.type === 'conditional') {
          lines.push(`${indent}?? conditional (${duration}ms)`);
        } else {
          lines.push(`${indent}${entry.name} [${entry.type}] (${statusIcon}) (${duration}ms)`);
        }
        
        // Recursivamente procesar hijos
        buildTreeLevel(entries, entry.name, level + 1);
      }
    };
    
    // Empezar con elementos que no tienen parent (root level)
    buildTreeLevel(trace, null, 0);
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

export function printExecutionTrace(trace: any[], totalDuration?: number) {
  console.log(buildExecutionTraceString(trace, totalDuration));
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
