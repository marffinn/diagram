@echo off
setlocal

:: Read .env file
for /f "tokens=*" %%a in (.env) do (
    for /f "tokens=1,2 delims==" %%b in ("%%a") do (
        set "%%b=%%c"
    )
)

:: Navigate to your repository directory
cd /d "C:\path\to\your\repository"

:: Add all changes to the staging area
git add .

:: Commit the changes
git commit -m "Automated commit from batch script"

:: Push the changes to the master branch
git push https://%GITHUB_USERNAME%:%GITHUB_TOKEN%@github.com/marffinn/diagram.git master

echo Changes pushed successfully!
pause