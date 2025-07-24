# Changelog

All notable changes to the "VSCode Bridge Connector" extension will be documented in this file.

## [0.0.2] - 2025-07-24

### Added
- **Health Check Endpoint**: New `GET /health` endpoint for monitoring bridge status (no authentication required)
- **VSCode API Handlers**: Direct support for `vscode.window.showInformationMessage`, `showWarningMessage`, `showErrorMessage`, and `showOpenDialog`
- **Enhanced Request Validation**: Content-length validation with 10KB limit for security
- **CORS Support**: Cross-origin request handling for web applications
- **Comprehensive Error Responses**: All errors now return JSON with timestamps and detailed messages
- **Enhanced Example Script**: Complete rewrite with comprehensive testing, error handling, and dotenv integration

### Fixed
- **Critical Authentication Bug**: Fixed health endpoint requiring authentication when it should be public
- **Command Execution Order**: Proper handling of VSCode API calls vs regular commands
- **Request Routing**: Authentication check now happens after health endpoint check for proper access control
- **Environment Variable Loading**: Example script now uses `dotenv` for secure API key management

### Enhanced
- **Improved Logging**: Better request logging with user agent, timestamps, and detailed debugging information
- **Security**: Enhanced unauthorized access handling with proper JSON error responses and detailed logging
- **Example Script**: Completely rewritten with comprehensive examples including:
  - Health check testing (no authentication required)
  - VSCode API message dialogs
  - File operations and dialog handling
  - Error handling and validation tests
  - Proper environment variable usage with dotenv
- **Documentation**: Updated README with new API endpoints, enhanced examples, and improved troubleshooting

### Technical Improvements
- **Error Handling**: Server-level error handling for port conflicts, permission issues, and request timeouts
- **Response Format**: Consistent JSON responses across all endpoints with timestamps
- **Request Timeout**: Added timeout handling for long-running requests
- **Input Validation**: Better validation for empty requests, malformed JSON, and oversized payloads
- **API Architecture**: Separated VSCode API calls from command execution for better reliability

### Dependencies
- Added dotenv for environment variable loading in examples
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
