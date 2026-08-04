# Instalační skript pro Windows (Pi Smart Notes)
# Spouštějte v PowerShellu jako Správce (Administrator)

Write-Host "🍓 Nastavuji Pi Smart Notes pro Windows..." -ForegroundColor Pink

# 1. Kontrola / Instalace Chocolatey (Windows správce balíčků)
if (-not (Get-Command choco -ErrorAction SilentlyContinue)) {
    Write-Host "📦 Instaluji Chocolatey (správce balíčků)..." -ForegroundColor Yellow
    Set-ExecutionPolicy Bypass -Scope Process -Force
    [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
    Invoke-Expression ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
}

# 2. Instalace FFmpeg, Tesseract a Tesseract Czech
Write-Host "⚙️ Instaluji FFmpeg a Tesseract OCR (včetně češtiny)..." -ForegroundColor Yellow
choco install ffmpeg tesseract tesseract-lang-ces -y

# 3. Stažení modelu Whisper medium (pokud neexistuje)
$modelPath = ".\whisper\models\ggml-medium.bin"
if (-not (Test-Path $modelPath)) {
    Write-Host "🧠 Stahuji AI model Whisper medium (~1.5 GB)..." -ForegroundColor Yellow
    New-Item -ItemType Directory -Force -Path ".\whisper\models" | Out-Null
    $url = "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-medium.bin"
    Invoke-WebRequest -Uri $url -OutFile $modelPath
    Write-Host "✅ Model úspěšně stažen!" -ForegroundColor Green
} else {
    Write-Host "✅ Model Whisper medium již existuje." -ForegroundColor Green
}

Write-Host "🎉 Instalace dokončena! Nyní přejděte do složky 'backend' a spusťte 'go run main.go'." -ForegroundColor Green
