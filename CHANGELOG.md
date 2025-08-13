# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-08-13

### Added
- **HTTP Request Metadata**: Added comprehensive response metadata access
  - Response metadata stored in `globals[name + "-metadata"]` including:
    - HTTP status code and status text
    - Response headers as key-value pairs
    - Final URL and method used
    - Request timestamp
  - Improves debugging and enables advanced flow logic based on HTTP headers
- **Enhanced Retry Middleware**: Improved error handling and execution tracing 
  - Better visualization of nested steps in execution traces
  - Detailed error propagation including HTTP error details
  - Parent-child relationship tracking for better debugging
- **Custom Middleware Types**: Added support for registering and using custom middleware types
  - Extensible type system for domain-specific middleware
  - TypeScript type safety for custom middleware implementations

### Fixed
- Fixed issue with retry middleware not showing nested execution steps
- Fixed error propagation in HTTP request middleware
- Corrected TypeScript type definitions for middleware extensions

## [0.3.0] - 2025-08-05

### Added
- **Enhanced Error Handling**: Introduced blocking vs non-blocking middleware support
  - Added `blocking` option (default: true) to all middleware configurations
  - Non-blocking middleware errors are collected in `nonBlockingErrors` array in final response
  - Mixed error handling support within the same flow
- **Enhanced HTTP Request Middleware**: 
  - Complete request data included in all error responses (original/interpolated URLs, headers, body, context)
  - Enhanced SSL/TLS configuration options (`rejectUnauthorized`, `allowInsecure`, `ignoreTLSErrors`)
  - Detailed error logging with comprehensive debugging information
- **Improved JSON Schema Validation**:
  - Added `ajv-formats` package for email, date, and other format validation support
  - Enhanced validation error reporting with complete context
- **Comprehensive Test Coverage**:
  - Added blocking/non-blocking middleware test suite (`blocking-middleware.test.ts`)
  - Added HTTP error details validation tests (`http-error-details.test.ts`)
  - Enhanced integration test coverage with 52 total tests across 9 test suites
- **Enhanced Documentation**:
  - Added comprehensive error handling section in README
  - Updated middleware documentation with blocking configuration examples
  - Enhanced HTTP middleware documentation with error reporting details

### Fixed
- Fixed email format validation in JSON schema validator by adding ajv-formats dependency
- Fixed mock configurations in integration tests (corrected "source" to "origin")
- Enhanced output resolver to properly preserve nonBlockingErrors in final response

### Changed
- Updated package version to 0.3.0
- Enhanced error reporting across all middleware types
- Improved debugging capabilities with detailed request/response logging

### Technical Improvements
- Enhanced middleware runner to handle blocking/non-blocking error collection
- Improved error propagation and final response composition
- Added comprehensive error context preservation
- Enhanced HTTP request middleware with complete error reporting

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
