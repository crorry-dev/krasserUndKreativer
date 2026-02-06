# Contributing to Infinite Canvas

Thank you for your interest in contributing! This document provides guidelines and instructions for contributing.

## 🚀 Getting Started

1. **Fork** the repository
2. **Clone** your fork locally
3. **Set up** development environment (see [README.md](README.md))
4. **Create** a feature branch

## 📝 Development Workflow

### Branch Naming

- `feature/` – New features (e.g., `feature/multi-select`)
- `fix/` – Bug fixes (e.g., `fix/eraser-crash`)
- `docs/` – Documentation updates
- `refactor/` – Code refactoring

### Commit Messages

Use clear, descriptive commit messages:

```
feat: add multi-select for objects
fix: prevent eraser from deleting entire strokes
docs: update API documentation
refactor: extract canvas utils into separate module
```

### Pull Requests

1. Ensure all tests pass
2. Update documentation if needed
3. Add a clear description of changes
4. Reference related issues

## 🧪 Testing

### Backend

```bash
cd apps/api
source .venv/bin/activate
pytest
pytest --cov=src  # with coverage
```

### Frontend

```bash
cd apps/web
pnpm lint
pnpm build  # ensure build succeeds
```

## 🎨 Code Style

### TypeScript/React

- Strict TypeScript – no `any`
- Functional components with hooks
- Named exports preferred
- Use existing patterns from codebase

### Python

- Type hints on all functions
- Docstrings for public APIs
- Follow Ruff rules
- Use async/await patterns

## 📋 Checklist Before PR

- [ ] Code follows project style
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] No console.log or print statements
- [ ] No hardcoded secrets
- [ ] Linting passes

## ❓ Questions?

Open an issue or start a discussion. We're happy to help!
