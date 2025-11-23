
@echo off
echo ===============================================================
echo  Limpando o ambiente de build do Gradle e Bubblewrap...
echo ===============================================================

echo.
echo Tentando parar qualquer processo do Gradle em execucao...
call gradlew --stop

echo.
echo Removendo a pasta de cache do Gradle (%USERPROFILE%\.gradle)...
rd /s /q "%USERPROFILE%\.gradle"
if exist "%USERPROFILE%\.gradle" (
    echo AVISO: Nao foi possivel remover a pasta .gradle. Ela pode estar em uso.
) else (
    echo Pasta .gradle removida com sucesso.
)

echo.
echo Removendo a pasta de ferramentas do Bubblewrap (%USERPROFILE%\.bubblewrap)...
rd /s /q "%USERPROFILE%\.bubblewrap"
if exist "%USERPROFILE%\.bubblewrap" (
    echo AVISO: Nao foi possivel remover a pasta .bubblewrap. Ela pode estar em uso.
) else (
    echo Pasta .bubblewrap removida com sucesso.
)

echo.
echo ===============================================================
echo  Limpeza concluida!
echo ===============================================================
echo.
echo Por favor, feche esta janela, abra um NOVO terminal e tente
echo rodar "bubblewrap build" novamente.
echo.
pause
