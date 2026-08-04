#!/bin/bash

echo "🍓 Spouštím instalaci Pi Smart Notes..."

# 1. Detekce OS a instalace systémových balíčků
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "🍎 Detekován macOS. Kontroluju Homebrew, FFmpeg a Tesseract..."
    if ! command -v brew &> /dev/null; then
        echo "❌ Homebrew není nainstalován. Nainstaluj ho z https://brew.sh a spusť skript znovu."
        exit 1
    fi
    brew install ffmpeg tesseract tesseract-lang
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    echo "🐧 Detekován Linux / Raspberry Pi. Instaluji závislosti..."
    sudo apt update
    sudo apt install -y ffmpeg tesseract-ocr tesseract-ocr-ces build-essential
else
    echo "⚠️ Neznámý operační systém. Nainstaluj ffmpeg a tesseract ručně."
fi

# 2. Stažení českého modelu pro Whisper
MODEL_DIR="./backend/whisper/models"
mkdir -p "$MODEL_DIR"

if [ ! -f "$MODEL_DIR/ggml-medium.bin" ]; then
    echo "📥 Stahuji český model 'medium' (~1.5 GB)..."
    curl -L "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-medium.bin" -o "$MODEL_DIR/ggml-medium.bin"
fi

# 3. Příprava Go závislostí
echo "⚙️ Připravuji Go modul..."
go mod tidy

echo "✅ HOTOVO! Instalace je dokončena."
echo "🚀 Aplikaci spustíš příkazem: go run ./backend/main.go"