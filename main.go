package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	_ "github.com/glebarez/go-sqlite"
	"github.com/google/uuid"
)

type Note struct {
	ID        string    `json:"id"`
	Content   string    `json:"content"`
	Type      string    `json:"type"`
	Completed bool      `json:"completed"`
	CreatedAt time.Time `json:"created_at"`
}

var db *sql.DB

func initDB() {
	var err error
	db, err = sql.Open("sqlite", "./notes.db")
	if err != nil {
		log.Fatal("Chyba při otevírání databáze:", err)
	}

	createTableSQL := `CREATE TABLE IF NOT EXISTS notes (
		"id" TEXT PRIMARY KEY,
		"content" TEXT,
		"type" TEXT,
		"completed" BOOLEAN DEFAULT 0,
		"created_at" DATETIME
	);`

	_, err = db.Exec(createTableSQL)
	if err != nil {
		log.Fatal("Chyba při vytváření tabulky:", err)
	}

	fmt.Println("💾 Databáze je připravena!")
}

func getNotesHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	rows, err := db.Query("SELECT id, content, type, completed, created_at FROM notes ORDER BY created_at DESC")
	if err != nil {
		http.Error(w, "Chyba při čtení z databáze", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	notes := []Note{}

	for rows.Next() {
		var n Note
		err := rows.Scan(&n.ID, &n.Content, &n.Type, &n.Completed, &n.CreatedAt)
		if err != nil {
			continue
		}
		notes = append(notes, n)
	}

	json.NewEncoder(w).Encode(notes)
}

func createNoteHandler(w http.ResponseWriter, r *http.Request) {
	var input struct {
		Content string `json:"content"`
		Type    string `json:"type"`
	}

	err := json.NewDecoder(r.Body).Decode(&input)
	if err != nil || input.Content == "" {
		http.Error(w, "Špatný formát dat nebo prázdný obsah", http.StatusBadRequest)
		return
	}

	newNote := Note{
		ID:        uuid.New().String(),
		Content:   input.Content,
		Type:      input.Type,
		Completed: false,
		CreatedAt: time.Now(),
	}

	if newNote.Type == "" {
		newNote.Type = "text"
	}

	stmt, err := db.Prepare("INSERT INTO notes(id, content, type, completed, created_at) VALUES(?, ?, ?, ?, ?)")
	if err != nil {
		http.Error(w, "Chyba při přípravě dotazu", http.StatusInternalServerError)
		return
	}
	defer stmt.Close()

	_, err = stmt.Exec(newNote.ID, newNote.Content, newNote.Type, newNote.Completed, newNote.CreatedAt)
	if err != nil {
		http.Error(w, "Chyba při zápisu do databáze", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(newNote)
}

// Aktualizace existující poznámky / tabulky podle ID
func updateNoteHandler(w http.ResponseWriter, r *http.Request) {
	parts := strings.Split(r.URL.Path, "/")
	if len(parts) < 4 {
		http.Error(w, "Chybějící ID", http.StatusBadRequest)
		return
	}
	id := parts[3]

	var input struct {
		Content string `json:"content"`
	}

	err := json.NewDecoder(r.Body).Decode(&input)
	if err != nil || input.Content == "" {
		http.Error(w, "Špatný formát dat", http.StatusBadRequest)
		return
	}

	_, err = db.Exec("UPDATE notes SET content = ? WHERE id = ?", input.Content, id)
	if err != nil {
		http.Error(w, "Chyba při aktualizaci databáze", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}

func main() {
	initDB()
	defer db.Close()

	fs := http.FileServer(http.Dir("static"))
	http.Handle("/", fs)

	http.HandleFunc("/api/notes", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodGet {
			getNotesHandler(w, r)
		} else if r.Method == http.MethodPost {
			createNoteHandler(w, r)
		} else {
			http.Error(w, "Neznámá metoda", http.StatusMethodNotAllowed)
		}
	})

	// Endpoint pro úpravu stávající poznámky: PUT /api/notes/ID
	http.HandleFunc("/api/notes/", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodPut || r.Method == http.MethodPost {
			updateNoteHandler(w, r)
		} else {
			http.Error(w, "Neznámá metoda", http.StatusMethodNotAllowed)
		}
	})

	fmt.Println("🚀 Server s podporou úprav běží na http://localhost:8080 ...")
	log.Fatal(http.ListenAndServe(":8080", nil))
}
