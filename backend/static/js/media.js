let mediaRecorder, audioChunks = [], recordingStream = null;

function renderAudioView(container) {
    container.innerHTML = `
        <div class="w-full h-full flex flex-col space-y-4">
            <div class="flex justify-between items-center border-b border-slate-800 pb-3">
                <h2 class="text-lg font-bold text-slate-200 flex items-center gap-2">
                    <span id="recording-dot" class="w-3 h-3 bg-red-500 rounded-full animate-pulse hidden"></span>
                    Hlasový Záznam (Přepis přes Whisper AI)
                </h2>
                <div class="flex gap-2">
                    <button id="btn-start-record" onclick="startRecording()" class="bg-red-600 hover:bg-red-500 text-white px-4 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2"><i data-lucide="mic" class="w-4 h-4"></i> Spustit</button>
                    <button id="btn-stop-record" onclick="stopRecording()" class="bg-slate-700 hover:bg-slate-600 text-white px-4 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 hidden"><i data-lucide="square" class="w-4 h-4"></i> Ukončit</button>
                </div>
            </div>
            <div class="flex-1 bg-slate-900 border border-slate-800 rounded-2xl p-6 text-slate-200 text-lg flex items-center justify-center" id="live-transcript-box">
                <p class="text-slate-600">Klikni na <strong>Spustit záznam</strong>.</p>
            </div>
        </div>`;
    lucide.createIcons();
}

function renderOCRView(container) {
    container.innerHTML = `
        <div class="w-full h-full flex flex-col space-y-4">
            <h2 class="text-lg font-bold text-slate-200 flex items-center gap-2"><i data-lucide="camera" class="w-5 h-5 text-pink-500"></i> OCR Skener</h2>
            <div class="flex-1 bg-slate-900 border border-slate-800 rounded-2xl p-8 flex flex-col items-center justify-center border-dashed border-2 border-slate-700 cursor-pointer" onclick="document.getElementById('ocr-file-input').click()">
                <i data-lucide="upload-cloud" class="w-16 h-16 text-slate-500 mb-4"></i>
                <p class="text-base font-semibold text-slate-200">Vyber fotku pro přepis textu</p>
                <input type="file" id="ocr-file-input" accept="image/*" class="hidden" onchange="uploadImageForOCR(this)" />
            </div>
            <div id="ocr-status" class="hidden text-center text-pink-400 animate-pulse font-medium">Probíhá OCR přepis...</div>
        </div>`;
    lucide.createIcons();
}

async function startRecording() {
    try {
        recordingStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioChunks = [];
        document.getElementById('recording-dot')?.classList.remove('hidden');
        document.getElementById('btn-start-record')?.classList.add('hidden');
        document.getElementById('btn-stop-record')?.classList.remove('hidden');

        mediaRecorder = new MediaRecorder(recordingStream, { mimeType: 'audio/webm' });
        mediaRecorder.ondataavailable = e => { if (e.data.size > 0) audioChunks.push(e.data); };
        mediaRecorder.start();
    } catch (err) { alert("Mikrofon nepřipojen."); }
}

async function stopRecording() {
    document.getElementById('recording-dot')?.classList.add('hidden');
    if (mediaRecorder && mediaRecorder.state !== "inactive") mediaRecorder.stop();
    if (recordingStream) recordingStream.getTracks().forEach(track => track.stop());

    setTimeout(async () => {
        const formData = new FormData();
        formData.append('audio', new Blob(audioChunks, { type: 'audio/webm' }), 'recording.webm');
        const res = await fetch('/api/upload-audio-chunk', { method: 'POST', body: formData });
        if (res.ok) fetchAll();
    }, 500);
}

function resetRecordingState() {
    if (mediaRecorder && mediaRecorder.state !== "inactive") mediaRecorder.stop();
    if (recordingStream) recordingStream.getTracks().forEach(track => track.stop());
}

async function uploadImageForOCR(input) {
    if (!input.files || !input.files[0]) return;
    document.getElementById('ocr-status')?.classList.remove('hidden');
    const formData = new FormData();
    formData.append('image', input.files[0]);

    const res = await fetch('/api/upload-image', { method: 'POST', body: formData });
    if (res.ok) { const data = await res.json(); fetchAll().then(() => openItem(data.id)); }
}