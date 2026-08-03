package main

import (
	"fmt"
	"log"
	"net/http"

	// Importujeme naše vlastní balíčky z projektu
	"pi-smart-notes/backend/db"
	"pi-smart-notes/backend/handlers"
)

func main() {
	// KROK 1: Inicializace databáze SQLite
	db.InitDB()
	defer db.DB.Close()

	// KROK 2: Nastavení složky se statickým webem (HTML, CSS, JS)
	fs := http.FileServer(http.Dir("static"))
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

	// KROK 4: Spuštění HTTP webového serveru
	fmt.Println("🚀 Webový server běží na http://localhost:8080 ...")
	log.Fatal(http.ListenAndServe(":8080", nil))
}
