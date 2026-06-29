
cd /d %~dp0
start chrome --new-window --allow-file-access-from-files "file:///%cd%/index.html" --user-data-dir="C:\chrome-dev-profile"
