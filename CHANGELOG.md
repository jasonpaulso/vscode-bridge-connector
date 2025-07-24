# Changelog

All notable changes to the "VSCode Bridge Connector" extension will be documented in this file.

## [0.0.2] - 2025-07-24

### Fixed
- Fixed CommonJS compatibility issues in example usage script
- Resolved Node.js module type warnings for better performance
- Updated example script to use proper `require()` syntax

### Enhanced
- Improved example-usage.js with better error handling
- Added test-client-package.json for easier testing setup
- Cleaner project structure with unnecessary files removed
- Better documentation for testing and setup

### Dependencies
- Added node-fetch@2.7.0 and dotenv for example scripts (not extension runtime)
- Extension itself remains dependency-free for optimal performance

## [0.0.1] - 2025-07-23

### Added
- Initial release of VSCode Bridge Connector
- Secure HTTP bridge for external VSCode communication
- Local `.env` file authentication
- Smart popup menu with start/stop, status, and settings
- Configurable port settings
- Status bar integration
- Command execution API endpoint

### Security
- Localhost-only connections (127.0.0.1)
- API key authentication required
- No system environment variable dependencies
