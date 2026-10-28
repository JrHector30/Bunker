@echo off
title Bunker POS - Servidor de Impresion (Estacion COCINA)
cd /d "%~dp0"
cls
echo ===================================================
echo   BUNKER POS - ESTACION DE IMPRESION COCINA
echo ===================================================

echo [1/3] Verificando entorno Node.js...
where node >nul 2>&1
if %errorlevel% equ 0 goto check_env

if exist "C:\Program Files\nodejs\node.exe" set "PATH=%PATH%;C:\Program Files\nodejs"
where node >nul 2>&1
if %errorlevel% equ 0 goto check_env

echo.
echo [ERROR CRITICO] No se encontro Node.js en este equipo.
echo Por favor asegurate de haber instalado Node.js desde https://nodejs.org
echo.
pause
exit /b 1

:check_env
echo  - Node.js detectado correctamente.
echo [2/3] Verificando configuracion (.env)...

if exist .env goto check_modules
echo  - Creando archivo .env con conexion a Supabase...
echo DATABASE_URL="postgresql://postgres:71367006Hq.2026@db.iyskqnlikuwatulyotcb.supabase.co:5432/postgres" > .env
echo DIRECT_URL="postgresql://postgres:71367006Hq.2026@db.iyskqnlikuwatulyotcb.supabase.co:5432/postgres" >> .env

:check_modules
echo  - Archivo .env verificado.
echo [3/3] Verificando dependencias (node_modules)...

if exist node_modules goto start_server
echo.
echo [ERROR CRITICO] No se encontro la carpeta node_modules.
echo Debes copiar la carpeta printer-server COMPLETA desde tu PC (incluyendo node_modules).
echo.
pause
exit /b 1

:start_server
echo  - Modulos de Node listos.
echo.
echo ===================================================
echo  Conectando con Supabase como estacion: COCINA...
echo  (Manten esta ventana abierta mientras quieras imprimir)
echo ===================================================
echo.

set STATION_ID=Cocina
node server.js Cocina

echo.
echo ===================================================
echo  El servidor de impresion se ha detenido.
echo ===================================================
pause
