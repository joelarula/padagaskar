# Curator VS Code Extension

This is the initial scaffold for the Curator extension, which will expose your wiki as a virtual filesystem in VS Code.

## Features (planned)
- Browse and edit wiki pages as files
- Virtual filesystem backed by your GraphQL API
- Single-user API token configuration

## Getting Started
1. Install dependencies:
   npm install
2. Build the extension:
   npm run compile
3. Launch the extension in the Extension Development Host

## Configuration
- `curator.apiToken`: API token for authenticating with the wiki backend
- `curator.apiUrl`: GraphQL API endpoint

---

Further implementation will add the virtual filesystem and API integration.
