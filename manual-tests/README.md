# Manual Tests

This directory contained manual test scripts used during development and debugging of the Arpegium JS framework.

## Security Notice

Most test files have been removed to prevent exposure of sensitive production data. 

For testing the framework, please use the official test suite:

```bash
npm test
```

## Test Files

The following types of tests were previously available:
- Core functionality tests (nested control structures)
- Mapper functionality tests (wildcard copying, function execution)
- Execution trace tests (tree visualization, debugging)

## Notes

These tests were created during development to validate specific functionality and debug complex scenarios. They complemented the official test suite in the `src/__tests__` directory.

**For current testing, use the official test suite:**

```bash
npm test
```
