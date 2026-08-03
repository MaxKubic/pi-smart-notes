package main

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"os/exec"
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

func deleteNoteHandler(w http.ResponseWriter, r *http.Request) {
	parts := strings.Split(r.URL.Path, "/")
	if len(parts) < 4 {
		http.Error(w, "Chybějící ID", http.StatusBadRequest)
		return
	}
	id := parts[3]

	_, err := db.Exec("DELETE FROM notes WHERE id = ?", id)
	if err != nil {
		http.Error(w, "Chyba při mazání z databáze", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}

// HANDLER PRO CHUNKOVANÝ STREAM AUDIO PŘEPISU
func uploadAudioChunkHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Metoda není povolená", http.StatusMethodNotAllowed)
		return
	}

	noteID := r.FormValue("note_id")

	file, _, err := r.FormFile("audio")
	if err != nil {
		http.Error(w, "Chyba při čtení zvuku", http.StatusBadRequest)
		return
	}
	defer file.Close()

	// 1. Uložíme dočasný WebM soubor z prohlížeče
	tempWebmPath := fmt.Sprintf("./temp_%d.webm", time.Now().UnixNano())
	out, err := os.Create(tempWebmPath)
	if err != nil {
		http.Error(w, "Chyba při uložení zvuku", http.StatusInternalServerError)
		return
	}
	io.Copy(out, file)
	out.Close()

	// 2. Převod na 16kHz WAV pro Whisper pomocí FFmpeg
	wavAudioPath := fmt.Sprintf("./temp_%d.wav", time.Now().UnixNano())
	ffmpegCmd := exec.Command("ffmpeg", "-i", tempWebmPath, "-ar", "16000", "-ac", "1", "-c:a", "pcm_s16le", wavAudioPath, "-y")
	ffmpegCmd.Run()

	// 3. Spustíme Whisper CLI s NOVOU CESTOU k binárce
	cmd := exec.Command("./whisper/build/bin/whisper-cli", "-m", "./whisper/models/ggml-base.bin", "-f", wavAudioPath, "-l", "cs", "-nt")
	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	transcribedText := ""
	err = cmd.Run()
	if err != nil {
		fmt.Println("Whisper Error:", stderr.String())
		transcribedText = fmt.Sprintf(" [Přednáška cca %s]: (Při přepisu došlo k chybě)", time.Now().Format("15:04:05"))
	} else {
		transcribedText = " " + strings.TrimSpace(stdout.String())
	}

	// Úklid dočasných souborů
	os.Remove(tempWebmPath)
	os.Remove(wavAudioPath)

	// Pokud ještě poznámka neexistuje, vytvoříme ji
	if noteID == "" || noteID == "null" {
		newNote := Note{
			ID:        uuid.New().String(),
			Content:   "🎙️ Záznam přednášky / meetingu:\n" + transcribedText,
			Type:      "text",
			CreatedAt: time.Now(),
		}
		stmt, _ := db.Prepare("INSERT INTO notes(id, content, type, completed, created_at) VALUES(?, ?, ?, ?, ?)")
		stmt.Exec(newNote.ID, newNote.Content, newNote.Type, false, newNote.CreatedAt)
		stmt.Close()

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(newNote)
		return
	}

	// Pokud už poznámka běží, připojíme nový text na konec (APPEND)
	_, err = db.Exec("UPDATE notes SET content = content || ? WHERE id = ?", transcribedText, noteID)
	if err != nil {
		http.Error(w, "Chyba při připojování přepsaného textu", http.StatusInternalServerError)
		return
	}

	// Vrátíme aktualizovaný obsah
	var updatedContent string
	db.QueryRow("SELECT content FROM notes WHERE id = ?", noteID).Scan(&updatedContent)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"id": noteID, "content": updatedContent})
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

	http.HandleFunc("/api/notes/", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodPut {
			updateNoteHandler(w, r)
		} else if r.Method == http.MethodDelete {
			deleteNoteHandler(w, r)
		} else {
			http.Error(w, "Neznámá metoda", http.StatusMethodNotAllowed)
		}
	})

	// Registrace endpointu pro živý přepis po blocích
	http.HandleFunc("/api/upload-audio-chunk", uploadAudioChunkHandler)

	fmt.Println("🚀 Server s živým přepisováním běží na http://localhost:8080 ...")
	log.Fatal(http.ListenAndServe(":8080", nil))
}
