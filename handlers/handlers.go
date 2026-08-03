package handlers

import (
	"encoding/json"
	"net/http"
	"strings"

	"pi-smart-notes/backend/db"
	"pi-smart-notes/backend/whisper"
)

// GetNotesHandler vrátí seznam všech poznámek v JSONu pro frontend
func GetNotesHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	notes, err := db.GetAllNotes()
	if err != nil {
		http.Error(w, "Chyba při čtení z databáze", http.StatusInternalServerError)
		return
	}
	json.NewEncoder(w).Encode(notes)
}

// CreateNoteHandler vytvoří novou textovou poznámku nebo To-Do tabulku
func CreateNoteHandler(w http.ResponseWriter, r *http.Request) {
	var input struct {
		Content string `json:"content"`
		Type    string `json:"type"`
	}

	if err := json.NewDecoder(r.Body).Decode(&input); err != nil || input.Content == "" {
		http.Error(w, "Špatný formát dat z frontendu", http.StatusBadRequest)
		return
	}

	newNote, err := db.SaveNote(input.Content, input.Type)
	if err != nil {
		http.Error(w, "Chyba při ukládání do DB", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(newNote)
}

// UpdateNoteHandler aktualizuje text v již uložené poznámce
func UpdateNoteHandler(w http.ResponseWriter, r *http.Request) {
	parts := strings.Split(r.URL.Path, "/")
	if len(parts) < 4 {
		http.Error(w, "Chybějící ID v adrese", http.StatusBadRequest)
		return
	}
	id := parts[3]

	var input struct {
		Content string `json:"content"`
	}

	if err := json.NewDecoder(r.Body).Decode(&input); err != nil || input.Content == "" {
		http.Error(w, "Špatný formát dat", http.StatusBadRequest)
		return
	}

	if err := db.UpdateNote(id, input.Content); err != nil {
		http.Error(w, "Chyba při aktualizaci DB", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}

// DeleteNoteHandler smaže zvolenou poznámku
func DeleteNoteHandler(w http.ResponseWriter, r *http.Request) {
	parts := strings.Split(r.URL.Path, "/")
	if len(parts) < 4 {
		http.Error(w, "Chybějící ID v adrese", http.StatusBadRequest)
		return
	}
	id := parts[3]

	if err := db.DeleteNote(id); err != nil {
		http.Error(w, "Chyba při mazání z DB", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}

// UploadAudioHandler přijme nahraný zvuk z microfonu, pošle ho do Whisperu a uloží výsledek
func UploadAudioHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Tato metoda není povolená", http.StatusMethodNotAllowed)
		return
	}

	// Načteme zvukový soubor přicházející z frontendu
	file, _, err := r.FormFile("audio")
	if err != nil {
		http.Error(w, "Chyba při čtení zvuku z prohlížeče", http.StatusBadRequest)
		return
	}
	defer file.Close()

	// 1. Zpřevodujeme zvuk na text přes AI modul Whisper
	transcribedText, _ := whisper.TranscribeAudio(file)

	// 2. Výsledný text uložíme jako novou poznámku v databázi
	fullContent := "🎙️ Záznam:\n" + transcribedText
	newNote, err := db.SaveNote(fullContent, "text")
	if err != nil {
		http.Error(w, "Chyba při zápisu poznámky do DB", http.StatusInternalServerError)
		return
	}

	// 3. Pošleme hotovou novou poznámku zpět do prohlížeče
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(newNote)
}
