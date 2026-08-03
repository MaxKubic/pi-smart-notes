#!/bin/bash

echo "🍓 Spouštím instalaci Pi Smart Notes..."

# 1. Detekce OS a instalace systémových balíčků
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "🍎 Detekován macOS. Kontroluju Homebrew, FFmpeg a CMake..."
    if ! command -v brew &> /dev/null; then
        echo "❌ Homebrew není nainstalován. Nainstaluj ho prosím z https://brew.sh a spusť skript znovu."
        exit 1
    fi
    brew install ffmpeg cmake
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    echo "🐧 Detekován Linux (Raspberry Pi / Debian / Ubuntu). Instaluji závislosti..."
    sudo apt update
    sudo apt install -y ffmpeg cmake build-essential git
else
    echo "⚠️ Neznámý operační systém. Nainstaluj ffmpeg a cmake ručně."
fi

# 2. Stažení a kompilace Whisper.cpp
if [ ! -d "whisper" ]; then
    echo "📥 Stahuji Whisper.cpp..."
    git clone https://github.com/ggerganov/whisper.cpp.git whisper
fi

echo "⚙️ Kompiluji Whisper.cpp..."
cd whisper
make -j4

# 3. Stažení českého modelu
if [ ! -f "models/ggml-medium.bin" ]; then
    echo "📥 Stahuji český model 'medium'..."
    bash ../models/download-ggml-model.sh medium
fi

cd ..

echo "✅ HOTOVO! Instalace je dokončena."
echo "🚀 Aplikaci spustíš příkazem: go run main.go"
