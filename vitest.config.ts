import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // .worktrees — это git-воркдеревья (копии проекта); их тесты гонять не нужно
    exclude: ['**/node_modules/**', '**/dist/**', '.worktrees/**'],
  },
});
