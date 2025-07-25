# Manual Tests

This directory contains manual test scripts used during development and debugging of the Arpegium JS framework.

## Test Files

### Core Functionality Tests
- `test-simple-nesting.js` - Tests basic nested control structures
- `test-basic-parallel.js` - Tests simple parallel execution
- `test-nested-flows.js` - Tests complex nested flow scenarios
- `test-production.js` - Production-like complex flow testing

### Mapper Functionality Tests
- `test-mapper-copy-overwrite.js` - Tests wildcard copying and function execution
- `test-mapper-output-precedence.js` - Tests output precedence handling

### Execution Trace Tests
- `test-execution-trace.js` - Tests execution tree visualization
- `debug-trace.js` - Debug execution trace functionality
- `debug-trace-duplication.js` - Debug trace duplication issues
- `debug-naranja-structure.js` - Tests naranja-like flow structure

## Running Tests

To run any test:

```bash
# From the root directory
node manual-tests/test-simple-nesting.js
node manual-tests/test-production.js
# etc.
```

## Notes

These tests were created during development to validate specific functionality and debug complex scenarios. They complement the official test suite in the `src/__tests__` directory.

The tests use the compiled output in `dist/` so make sure to run `npm run build` before testing.
