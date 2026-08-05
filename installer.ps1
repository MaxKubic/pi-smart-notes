$Shell = New-Object -ComObject WScript.Shell
$Target = "$PSScriptRoot\start.bat"
$WorkingDir = "$PSScriptRoot"

# 1. Zástupce v nabídce Start
$StartMenu = [System.Environment]::GetFolderPath('StartMenu')
$ShortcutStart = $Shell.CreateShortcut("$StartMenu\Programs\PI Smart Notes.lnk")
$ShortcutStart.TargetPath = $Target
$ShortcutStart.WorkingDirectory = $WorkingDir
$ShortcutStart.Save()

# 2. Zástupce na Ploše
$Desktop = [System.Environment]::GetFolderPath('Desktop')
$ShortcutDesktop = $Shell.CreateShortcut("$Desktop\PI Smart Notes.lnk")
$ShortcutDesktop.TargetPath = $Target
$ShortcutDesktop.WorkingDirectory = $WorkingDir
$ShortcutDesktop.Save()

Write-Host "Instalace dokončena! Zástupci byli vytvořeni." -ForegroundColor Green
Pause
