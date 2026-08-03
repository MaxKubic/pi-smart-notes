package ocr

import (
	"bytes"
	"fmt"
	"io"
	"mime/multipart"
	"os"
	"os/exec"
	"strings"
	"time"
)

// ProcessImageToText přijme obrázek z webu, zoptimalizuje ho a přečte přes Tesseract
func ProcessImageToText(file multipart.File) (string, error) {
	// KROK 1: Dočasně uložíme nahraný obrázek
	tempImgPath := fmt.Sprintf("./temp_img_%d.png", time.Now().UnixNano())
	out, err := os.Create(tempImgPath)
	if err != nil {
		return "", fmt.Errorf("chyba při uložení obrázku: %v", err)
	}
	io.Copy(out, file)
	out.Close()
	defer os.Remove(tempImgPath) // Úklid po dokončení

	// KROK 2: Zmenšení obrázku přes FFmpeg (pro bleskové zpracování Tesseractem)
	optimizedImgPath := fmt.Sprintf("./temp_opt_%d.png", time.Now().UnixNano())
	defer os.Remove(optimizedImgPath)

	ffmpegCmd := exec.Command("ffmpeg", "-i", tempImgPath, "-vf", "scale='min(1920,iw)':-1", optimizedImgPath, "-y")
	_ = ffmpegCmd.Run() // Pokud FFmpeg neprojde, použijeme původní obrázek

	inputPath := optimizedImgPath
	if _, err := os.Stat(optimizedImgPath); os.IsNotExist(err) {
		inputPath = tempImgPath
	}

	// KROK 3: Spuštění Tesseract OCR s českým jazykem
	cmd := exec.Command("tesseract", inputPath, "stdout", "-l", "ces")

	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	if err := cmd.Run(); err != nil {
		fmt.Println("Tesseract Error Log:", stderr.String())
		return "", fmt.Errorf("tesseract chyba: %s", stderr.String())
	}

	extractedText := strings.TrimSpace(stdout.String())
	if extractedText == "" {
		extractedText = "(Na obrázku nebyl rozpoznán žádný souvislý text)"
	}

	return extractedText, nil
}
