@echo off
cd /d C:\Users\82106\Desktop\nplatform
node node_modules\vitest\vitest.mjs run __tests__/lib/api-error.test.ts __tests__/lib/auth-guard.test.ts
