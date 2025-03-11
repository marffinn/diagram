@echo off
setlocal

:: Read .env file
for /f "tokens=*" %%a in (.env) do (
    for /f "tokens=1,2 delims==" %%b in ("%%a") do (
        set "%%b=%%c"
    )
)

:: Navigate to your repository directory
cd /d "C:\xampp\htdocs\crm-app"

:: Add all changes to the staging area
git add .

:: Commit the changes
git commit -m "Automated commit from batch script"

:: Push the changes to the master branch using the personal access token
git push https://%GITHUB_USERNAME%:%GITHUB_TOKEN%@github.com/marffinn/diagram.git master

if %errorlevel% equ 0 (
    echo Changes pushed successfully!
) else (
    echo Authentication failed or other error occurred.
)

pause