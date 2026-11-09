@echo off
rem Oyun Arastirmasi sitesini bu bilgisayarda acar (internet ve kurulum gerekmez).
title Oyun Arastirmasi - bu pencereyi kapatmayin
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0sunucu.ps1"
if errorlevel 1 pause
