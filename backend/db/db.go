package db

import (
	"database/sql"
	"fmt"
	"log"
	"time"

	_ "github.com/glebarez/go-sqlite"
	"github.com/google/uuid"
)

// Struktura reprezentující jednu poznámku v databázi i na webu
type Note struct {
	ID        string    `json:"id"`
	Content   string    `json:"content"`
	Type      string    `json:"type"`
	Completed bool      `json:"completed"`
	CreatedAt time.Time `json:"created_at"`
}

// Globální proměnná pro připojení k databázi
var DB *sql.DB

// InitDB otevírá databázový soubor a vytváří tabulku, pokud ještě neexistuje
func InitDB() {
	var err error
	// Otevřeme (nebo vytvoříme) lokální soubor databáze
	DB, err = sql.Open("sqlite", "./notes.db")
	if err != nil {
		log.Fatal("❌ Chyba při otevírání databáze:", err)
	}

	// SQL příkaz pro vytvoření tabulky pro naše poznámky
	createTableSQL := `CREATE TABLE IF NOT EXISTS notes (
		"id" TEXT PRIMARY KEY,
		"content" TEXT,
		"type" TEXT,
		"completed" BOOLEAN DEFAULT 0,
		"created_at" DATETIME
	);`

	_, err = DB.Exec(createTableSQL)
	if err != nil {
		log.Fatal("❌ Chyba při vytváření tabulky:", err)
	}

	fmt.Println("💾 Databáze SQLite je připravena a propojena!")
}

// GetAllNotes načte všechny poznámky z databáze od nejnovějších
func GetAllNotes() ([]Note, error) {
	rows, err := DB.Query("SELECT id, content, type, completed, created_at FROM notes ORDER BY created_at DESC")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	notes := []Note{}
	for rows.Next() {
		var n Note
		if err := rows.Scan(&n.ID, &n.Content, &n.Type, &n.Completed, &n.CreatedAt); err != nil {
			return nil, err
		}
		notes = append(notes, n)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return notes, nil
}

// SaveNote uloží novou textovou/zvukovou poznámku nebo tabulku
func SaveNote(content, noteType string) (Note, error) {
	if noteType == "" {
		noteType = "text"
	}

	// Vygenerujeme unikátní ID pro novou poznámku
	newNote := Note{
		ID:        uuid.New().String(),
		Content:   content,
		Type:      noteType,
		Completed: false,
		CreatedAt: time.Now(),
	}

	stmt, err := DB.Prepare("INSERT INTO notes(id, content, type, completed, created_at) VALUES(?, ?, ?, ?, ?)")
	if err != nil {
		return newNote, err
	}
	defer stmt.Close()

	_, err = stmt.Exec(newNote.ID, newNote.Content, newNote.Type, newNote.Completed, newNote.CreatedAt)
	return newNote, err
}

// UpdateNote upraví obsah již existující poznámky
func UpdateNote(id, content string) error {
	_, err := DB.Exec("UPDATE notes SET content = ? WHERE id = ?", content, id)
	return err
}

// DeleteNote smaže poznámku podle jejího ID
func DeleteNote(id string) error {
	_, err := DB.Exec("DELETE FROM notes WHERE id = ?", id)
	return err
}
