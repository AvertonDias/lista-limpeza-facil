@echo off
echo =======================================================
echo     Limpando todos os arquivos gerados pelo Bubblewrap...
echo =======================================================
echo.

REM Para o processo do Gradle, se estiver ativo
call :try_stop_gradle

REM Apaga pastas
call :delete_folder "app"
call :delete_folder "gradle"
call :delete_folder "build"

REM Apaga arquivos da raiz
call :delete_file "gradlew"
call :delete_file "gradlew.bat"
call :delete_file "settings.gradle"
call :delete_file "build.gradle"
call :delete_file "twa-manifest.json"
call :delete_file "app-release.aab"
call :delete_file "app-release.apk"
call :delete_file "android.keystore"
call :delete_file "google-play-install.sh"
call :delete_file "gradle.properties"
call :delete_file "clean.bat"
call :delete_file "limpeza-total.bat"

echo.
echo Limpeza concluida!
echo Seu projeto foi resetado. Voce pode iniciar o processo do Bubblewrap novamente.
echo.
pause
goto :eof

:try_stop_gradle
if exist "gradlew.bat" (
    echo Tentando parar o daemon do Gradle...
    call gradlew.bat --stop >nul 2>&1
)
goto :eof

:delete_folder
if exist "%~1" (
    echo Removendo pasta: %~1
    rmdir /s /q "%~1"
)
goto :eof

:delete_file
if exist "%~1" (
    echo Removendo arquivo: %~1
    del /f /q "%~1"
)
goto :eof
