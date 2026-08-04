package main

import (
	"fmt"
	"log"
	"net/http"
	"os"

	// Importujeme naše vlastní balíčky z projektu
	"pi-smart-notes/backend/db"
	"pi-smart-notes/backend/handlers"
)

// Pomocná funkčka pro nalezení složky static, ať už se spouští odkudkoliv
func getStaticDir() string {
	paths := []string{"./backend/static", "./static", "../static"}
	for _, p := range paths {
		if info, err := os.Stat(p); err == nil && info.IsDir() {
			return p
		}
	}
	return "./static" // fallback
}

func main() {
	// KROK 1: Inicializace databáze SQLite
	db.InitDB()
	defer db.DB.Close()

	// KROK 2: Nastavení složky se statickým webem (HTML, CSS, JS)
	staticDir := getStaticDir()
	fs := http.FileServer(http.Dir(staticDir))
	http.Handle("/", fs)

	// KROK 3: Mapování REST API tras pro komunikaci s frontendem
	// Seznam a vytváření poznámek
	http.HandleFunc("/api/notes", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodGet {
			handlers.GetNotesHandler(w, r)
		} else if r.Method == http.MethodPost {
			handlers.CreateNoteHandler(w, r)
		} else {
			http.Error(w, "Neznámá metoda", http.StatusMethodNotAllowed)
		}
	})

	// Úprava a mazání konkrétní poznámky podle ID
	http.HandleFunc("/api/notes/", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodPut {
			handlers.UpdateNoteHandler(w, r)
		} else if r.Method == http.MethodDelete {
			handlers.DeleteNoteHandler(w, r)
		} else {
			http.Error(w, "Neznámá metoda", http.StatusMethodNotAllowed)
		}
	})

	// Endpoint pro nahrání zvuku z mikrofonu a jeho AI přepis
	http.HandleFunc("/api/upload-audio-chunk", handlers.UploadAudioHandler)

	// Endpoint pro nahrání fotky a OCR skenování (MUSÍ BÝT PŘED SPŮŠTĚNÍM SERVERU)
	http.HandleFunc("/api/upload-image", handlers.UploadImageHandler)

	// KROK 4: Spuštění HTTP webového serveru
	fmt.Println("🚀 Webový server běží na http://localhost:8080 ...")
	log.Fatal(http.ListenAndServe(":8080", nil))
}
