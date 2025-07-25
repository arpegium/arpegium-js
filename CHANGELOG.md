# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2025-07-25

### Added
- **Enhanced Mapper Middleware**
  - Wildcard copying with `"from": "*"` to copy all properties from source objects
  - Function execution with parameter support for dynamic transformations
  - Output precedence handling for complex data mapping scenarios

- **Advanced Execution Tree Visualization**
  - Hierarchical execution tree with visual pipe indentation (`|`)
  - Real-time flow debugging with temporal ordering
  - Support for deeply nested control structures (parallel, sequence, conditional)
  - Execution duration tracking for performance analysis
  - Visual status indicators (✓, ✗, ⏳) for execution state

- **Performance Improvements**
  - Asynchronous execution trace logging to avoid blocking main flow
  - Optimized trace generation with circular reference protection
  - Stack overflow protection for complex nested flows

### Changed
- **Execution Trace Format**
  - Changed from "Middleware Execution Map" to "Middleware Execution Tree"
  - Improved visual hierarchy with pipe symbols for better readability
  - Enhanced temporal ordering to show exact execution sequence

### Fixed
- **Naming Collision Resolution**
  - Added unique counters to parallel and sequence block names
  - Prevents execution trace hierarchy corruption in complex flows
  - Fixed middlewares appearing in wrong parent containers

- **Stack Overflow Protection**
  - Added circular reference detection in trace building
  - Implemented depth limiting for recursive trace processing
  - Enhanced error handling for trace generation failures

### Technical Improvements
- Static imports instead of dynamic imports for better production stability
- Enhanced error logging with detailed debugging information
- Improved TypeScript type safety throughout the codebase

## [0.1.0] - 2025-07-10

### Added
- Initial release of Arpegium JS orchestrator framework
- JSON-defined workflow support
- Middleware-based architecture
- Built-in middlewares: mapper, httpRequest, validator, debug
- Flow control: parallel, sequence, conditional execution
- Variable interpolation support
- Custom function registry
- TypeScript support
- Comprehensive test suite
