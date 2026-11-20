@echo off
cd /d "%~dp0"
title Diagnostico Bunker POS - Cocina
echo =======================================================
echo   DIAGNOSTICO DE SERVIDOR DE IMPRESION - COCINA
echo =======================================================
echo.
echo 1. Comprobando Node.js:
where node
if errorlevel 1 (
    echo [ERROR] No se encuentra Node.js instalado o en el PATH.
    echo Por favor instala Node.js (version LTS) desde https://nodejs.org
    goto fin
)
node -v
echo.
echo 2. Comprobando modulos:
if not exist "node_modules" (
    echo [ERROR] Falta la carpeta node_modules en printer-server.
    goto fin
)
echo Carpeta node_modules encontrada OK.
echo.
echo 3. Iniciando servidor para Cocina...
echo.
node server.js Cocina

:fin
echo.
echo =======================================================
echo Presiona una tecla para salir...
pause
