package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"

	_ "github.com/glebarez/go-sqlite"
	"github.com/google/uuid"
)

// Note definuje strukturu jedné poznámky
type Note struct {
	ID        string    `json:"id"`
	Content   string    `json:"content"`
	Type      string    `json:"type"`
	CreatedAt time.Time `json:"created_at"`
}

var db *sql.DB

// initDB inicializuje SQLite databázi a vytvoří tabulku, pokud neexistuje
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
		"created_at" DATETIME
	);`

	_, err = db.Exec(createTableSQL)
	if err != nil {
		log.Fatal("Chyba při vytváření tabulky:", err)
	}

	fmt.Println("💾 Databáze je připravena!")
}

// getNotesHandler vrátí všechny poznámky seřazené od nejnovější
func getNotesHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	rows, err := db.Query("SELECT id, content, type, created_at FROM notes ORDER BY created_at DESC")
	if err != nil {
		http.Error(w, "Chyba při čtení z databáze", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	notes := []Note{}

	for rows.Next() {
		var n Note
		err := rows.Scan(&n.ID, &n.Content, &n.Type, &n.CreatedAt)
		if err != nil {
			fmt.Println("Chyba při skenování řádku:", err)
			continue
		}
		notes = append(notes, n)
	}

	json.NewEncoder(w).Encode(notes)
}

// createNoteHandler vytvoří novou poznámku s automatickým UUID a časem
func createNoteHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Metoda není povolená", http.StatusMethodNotAllowed)
		return
	}

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
		CreatedAt: time.Now(),
	}

	if newNote.Type == "" {
		newNote.Type = "text"
	}

	stmt, err := db.Prepare("INSERT INTO notes(id, content, type, created_at) VALUES(?, ?, ?, ?)")
	if err != nil {
		http.Error(w, "Chyba při přípravě dotazu", http.StatusInternalServerError)
		return
	}
	defer stmt.Close()

	_, err = stmt.Exec(newNote.ID, newNote.Content, newNote.Type, newNote.CreatedAt)
	if err != nil {
		http.Error(w, "Chyba při zápisu do databáze", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(newNote)
}

func main() {
	initDB()
	defer db.Close()

	http.HandleFunc("/api/notes", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodGet {
			getNotesHandler(w, r)
		} else if r.Method == http.MethodPost {
			createNoteHandler(w, r)
		} else {
			http.Error(w, "Neznámá metoda", http.StatusMethodNotAllowed)
		}
	})

	fmt.Println("🚀 Server běží na http://localhost:8080 ...")
	log.Fatal(http.ListenAndServe(":8080", nil))
}
