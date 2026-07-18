import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // Один конфиг Vitest на весь monorepo (tech/architecture.md, «Тесты»).
    // .worktrees / .claude/worktrees — git-воркдеревья (копии проекта); их
    // тесты гонять не нужно.
    exclude: ['**/node_modules/**', '**/dist/**', '.worktrees/**', '.claude/worktrees/**'],
  },
});
