# Contributing to Radix

First off, thanks for taking the time to contribute!

## Code of Conduct

This project and everyone participating in it is governed by the [Radix Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check the issue tracker to see if the problem has already been reported. When you create a bug report, include as many details as possible:

- A clear and descriptive title
- Steps to reproduce the issue
- Expected behavior vs actual behavior
- Screenshots if applicable
- Environment details (OS, Node version, browser, etc.)

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating one, please:

- Use a clear and descriptive title
- Provide a step-by-step description of the suggested enhancement
- Explain why this enhancement would be useful

### Pull Requests

1. Fork the repository and create your branch from `main`.
2. If you've added code that should be tested, add tests.
3. Ensure your code lints (`npm run lint` in both `backend/` and `frontend/`).
4. Run the TypeScript type checker (`npm run typecheck` in `frontend/`).
5. Issue the pull request.

## Development Setup

See the [README](../README.md) for full setup instructions.

## Styleguides

### Git Commit Messages

- Use the present tense ("add feature" not "added feature")
- Use the imperative mood ("move cursor to..." not "moves cursor to...")
- Limit the first line to 72 characters or less
- Reference issues and pull requests liberally after the first line

### TypeScript Styleguide

- All TypeScript code is formatted with Prettier.
- Use explicit types for function signatures.
- Prefer `interface` over `type` for object shapes.
- Use `const` over `let` where possible.

## License

By contributing, you agree that your contributions will be licensed under the Apache License 2.0.
