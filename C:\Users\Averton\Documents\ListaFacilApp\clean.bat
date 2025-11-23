@echo off
echo.
echo =================================================================
echo   Limpador de Cache para Bubblewrap e Gradle
echo =================================================================
echo.
echo Parando todos os processos do Gradle...
call .\gradlew --stop > nul 2>&1
echo.
echo Procurando e removendo a pasta .bubblewrap...
set BUBBLEWRAP_CACHE=%USERPROFILE%\.bubblewrap
if exist "%BUBBLEWRAP_CACHE%" (
    echo    Pasta encontrada em: %BUBBLEWRAP_CACHE%
    rmdir /s /q "%BUBBLEWRAP_CACHE%"
    echo    Pasta .bubblewrap removida com sucesso!
) else (
    echo    Pasta .bubblewrap nao encontrada. Nenhum arquivo para remover.
)
echo.
echo Limpeza concluida.
echo Por favor, tente executar "bubblewrap build" em um novo terminal.
echo.
pause
