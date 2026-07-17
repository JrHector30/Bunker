@echo off
title Bunker POS Tray
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "%~dp0BunkerTray.ps1"
