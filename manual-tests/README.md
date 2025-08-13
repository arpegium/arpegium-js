# Manual Tests

This directory contains manual test scripts used during development and debugging of the Arpegium JS framework.

## Available Tests

### Retry Middleware Demo

The `retry-trace-demo.ts` script demonstrates the retry middleware with execution trace visualization:

```bash
# Compile the TypeScript code
npm run build

# Run the demo script
node dist/manual-tests/retry-trace-demo.js
```

This will show a simulation of a flaky service that fails initially but succeeds after a few retries, along with the execution trace that shows the retry attempts.

## Test Files

The following types of tests are available:
- Core functionality tests (nested control structures)
- Mapper functionality tests (wildcard copying, function execution)
- Execution trace tests (tree visualization, debugging)
- Retry middleware tests (backoff, jitter, error handling)

## Notes

These tests were created during development to validate specific functionality and debug complex scenarios. They complemented the official test suite in the `src/__tests__` directory.

**For current testing, use the official test suite:**

```bash
npm test
```
