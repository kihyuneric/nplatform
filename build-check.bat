@echo off
cd /d C:\Users\82106\Desktop\nplatform
set NEXT_TELEMETRY_DISABLED=1
node node_modules\next\dist\bin\next build 2>&1
