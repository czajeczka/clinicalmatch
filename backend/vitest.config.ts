import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Use an in-memory database in tests so the singleton never touches a real
    // file. Individual tests can still open their own via openDatabase(':memory:').
    env: {
      NODE_ENV: 'test',
      DB_PATH: ':memory:',
    },
  },
})
