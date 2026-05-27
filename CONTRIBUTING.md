# Contributing to @sixtdreamnight/companion-engine

Thanks for your interest in contributing!

## Getting Started

```bash
git clone https://github.com/sixtdreanight/companion-engine.git
cd companion-engine
npm install
npm test
```

## Development Workflow

1. Fork the repo and create a branch from `main`
2. Make your changes
3. Run `npx tsc --noEmit` to type-check
4. Run `npx vitest run` to verify all tests pass
5. Add tests for new functionality
6. Commit using [Conventional Commits][conv] format
7. Push and open a pull request

## Commit Convention

```
feat: add Lore Book system
fix: prevent path traversal in summaryPath()
refactor: extract safety patterns into shared module
test: add regression tests for memory module
docs: update API reference
```

Types: `feat` `fix` `refactor` `test` `docs` `chore` `perf` `ci`

## Code Style

- TypeScript strict mode enabled — no `any` without justification
- Prefer immutability: return new objects, don't mutate
- Functions under 50 lines; files under 800 lines
- Use early returns to avoid deep nesting
- Error handling: explicit, no silent failures

## Testing

- Minimum 80% coverage for new code
- Use AAA pattern (Arrange, Act, Assert)
- Descriptive test names: `test('throws when userId contains ..', () => {})`

## Pull Request Checklist

- [ ] TypeScript compiles without errors
- [ ] All tests pass (`npx vitest run`)
- [ ] New tests added for new behavior
- [ ] API changes documented in `API_REFERENCE.md`
- [ ] Breaking changes noted in PR description

## Questions?

Open a [discussion](https://github.com/sixtdreanight/companion-engine/discussions).

[conv]: https://www.conventionalcommits.org/
