let allNotes = [];
let activeNoteId = null;
let quillEditor = null;
let activeProjectData = null;
let draggedBlockIndex = null;

// Inicializace fontů a velikostí pro Quill
const Size = Quill.import('attributors/style/size');
Size.whitelist = ['8px', '10px', '12px', '14px', '16px', '18px', '24px', '32px', '48px', '72px'];
Quill.register(Size, true);

const Font = Quill.import('attributors/style/font');
Font.whitelist = ['roboto', 'open-sans', 'montserrat', 'lora', 'georgia', 'courier', 'inter'];
Quill.register(Font, true);

// Přepínání sidebaru
function toggleSidebar() {
    const sidebar = document.getElementById('main-sidebar');
    const openBtn = document.getElementById('btn-open-sidebar');
    if (!sidebar) return;

    sidebar.classList.toggle('-ml-80');
    if (openBtn) openBtn.classList.toggle('hidden');
}

// Načtení dat z API
async function fetchAll() {
    try {
        const res = await fetch('/api/notes');
        allNotes = await res.json();
        renderSidebar();
        lucide.createIcons();
    } catch (err) {
        console.error("Chyba při načítání dat:", err);
    }
}

function extractNoteTitle(content) {
    if (!content) return "Bez názvu";
    const temp = document.createElement('div');
    temp.innerHTML = content;
    const txt = temp.textContent || temp.innerText || "";
    const cleaned = txt.replace("🎙️ Záznam:", "").replace("📷 OCR Skener:", "").trim();
    return cleaned.split('\n')[0].substring(0, 30) || "Bez názvu";
}

// Vykreslení sidebaru
function renderSidebar() {
    const elProjects = document.getElementById('sidebar-projects');
    const elTodos = document.getElementById('sidebar-todos');
    const elNotes = document.getElementById('sidebar-notes');
    const elSketches = document.getElementById('sidebar-sketches');

    if (elProjects) elProjects.innerHTML = '';
    if (elTodos) elTodos.innerHTML = '';
    if (elNotes) elNotes.innerHTML = '';
    if (elSketches) elSketches.innerHTML = '';

    allNotes.forEach(item => {
        const isActive = item.id === activeNoteId ? 'bg-slate-800 text-pink-400 border-l-2 border-pink-500' : 'text-slate-300 hover:bg-slate-800/60';

        if (item.type === 'project_page' && elProjects) {
            // Získání reálného názvu z JSON obsahu nebo z item.title
            let projectTitle = item.title || "A4 Stránka";
            try {
                if (item.content) {
                    const parsed = JSON.parse(item.content);
                    if (parsed.title) projectTitle = parsed.title;
                }
            } catch(e) {}

            elProjects.innerHTML += `
                <div onclick="openItem('${item.id}')" class="p-2 rounded-lg cursor-pointer text-xs font-medium transition truncate flex items-center justify-between group ${isActive}">
                    <span class="truncate">📄 ${projectTitle}</span>
                    <button onclick="event.stopPropagation(); deleteItem('${item.id}')" class="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 p-1 transition"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>
                </div>`;
        } else if (item.type === 'todo_table' && elTodos) {
            let t = "Tabulka bez názvu";
            try { t = JSON.parse(item.content).title || t; } catch(e) {}
            elTodos.innerHTML += `
                <div onclick="openItem('${item.id}')" class="p-2 rounded-lg cursor-pointer text-xs font-medium transition truncate flex items-center justify-between group ${isActive}">
                    <span class="truncate">📊 ${t}</span>
                    <button onclick="event.stopPropagation(); deleteItem('${item.id}')" class="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 p-1 transition"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>
                </div>`;
        } else if (item.type === 'text' && elNotes) {
            let icon = item.content?.includes("🎙️") ? "🎙️" : item.content?.includes("📷") ? "📷" : "📝";
            elNotes.innerHTML += `
                <div onclick="openItem('${item.id}')" class="p-2 rounded-lg cursor-pointer text-xs font-medium transition truncate flex items-center justify-between group ${isActive}">
                    <span class="truncate">${icon} ${item.title || extractNoteTitle(item.content)}</span>
                    <button onclick="event.stopPropagation(); deleteItem('${item.id}')" class="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 p-1 transition"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>
                </div>`;
        } else if (item.type === 'drawing' && elSketches) {
            elSketches.innerHTML += `
                <div onclick="openItem('${item.id}')" class="border border-slate-800 rounded-lg overflow-hidden cursor-pointer hover:border-pink-500/50 transition bg-white/5 h-20 flex items-center justify-center relative group ${isActive}">
                    <img src="${item.content}" class="max-h-full object-contain" />
                    <button onclick="event.stopPropagation(); deleteItem('${item.id}')" class="absolute top-1 right-1 opacity-0 group-hover:opacity-100 bg-slate-900/80 text-slate-400 hover:text-red-400 p-1 rounded transition"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>
                </div>`;
        }
    });
}

async function deleteItem(id) {
    if (!confirm("Opravdu smazat?")) return;
    const res = await fetch('/api/notes/' + id, { method: 'DELETE' });
    if (res.ok) {
        if (activeNoteId === id) {
            activeNoteId = null;
            const container = document.getElementById('work-container');
            if (container) {
                container.className = "w-full h-full flex flex-col justify-center items-center";
                container.innerHTML = `<div class="text-center text-slate-600"><p class="text-sm">Položka byla smazána.</p></div>`;
            }
        }
        fetchAll();
    }
}

function openItem(id) {
    if (typeof resetRecordingState === 'function') resetRecordingState();
    quillEditor = null;
    activeNoteId = id;
    renderSidebar();

    const item = allNotes.find(n => n.id === id);
    const container = document.getElementById('work-container');
    if (!item || !container) return;

    if (item.type === 'project_page') {
        renderProjectPage(container, item);
    } else {
        // Obnovíme výchozí zarovnání pro samostatné editory
        container.className = "w-full h-full flex flex-col justify-center items-center";
        
        if (item.type === 'todo_table') {
            try { currentTableData = normalizeTableData(JSON.parse(item.content)); } 
            catch(e) { currentTableData = normalizeTableData(null); }
            renderTableView(container, item.id);
        } else if (item.type === 'drawing') {
            renderCanvasEditor(container, item);
        } else if (item.type === 'text') {
            renderTextEditor(container, item);
        }
    }
    lucide.createIcons();
}

function renderTextEditor(container, item) {
    const title = item.title || extractNoteTitle(item.content);
    container.innerHTML = `
        <div class="w-full h-full flex flex-col space-y-3">
            <div class="flex justify-between items-center border-b border-slate-800 pb-2 gap-4">
                <input type="text" id="note-title-input" value="${title}" placeholder="Název poznámky..." class="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-base font-bold text-slate-100 focus:outline-none focus:border-pink-500 w-full" />
                <div class="flex gap-2">
                    <button onclick="updateExistingNote('${item.id}')" class="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1"><i data-lucide="save" class="w-3.5 h-3.5"></i> Uložit</button>
                    <button onclick="deleteItem('${item.id}')" class="text-slate-500 hover:text-red-400 p-1"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                </div>
            </div>
            <div class="flex-1 paper-editor flex flex-col overflow-hidden shadow-2xl">
                <div id="editor-container" class="flex-1 overflow-y-auto"></div>
            </div>
        </div>`;
    initRichTextEditor('#editor-container', item.content);
}

function initRichTextEditor(containerId, initialContent = '') {
    quillEditor = new Quill(containerId, {
        theme: 'snow',
        placeholder: 'Začni psát text...',
        modules: {
            toolbar: [
                [{ 'font': ['roboto', 'open-sans', 'montserrat', 'lora', 'georgia', 'courier', 'inter', false] }],
                [{ 'size': ['8px', '10px', '12px', '14px', '16px', '18px', '24px', '32px', '48px', '72px'] }],
                [{ 'header': [1, 2, 3, false] }],
                ['bold', 'italic', 'underline', 'strike'],
                [{ 'color': [] }, { 'background': [] }],
                [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                [{ 'align': [] }],
                ['link', 'clean']
            ]
        }
    });
    if (initialContent) quillEditor.root.innerHTML = initialContent;
}

// ---------------------------------------------------
// VYKRESLENÍ A4 STRÁNKY (S NEOMEZENÝM SCROLLEM A PROTAHOVÁNÍM)
// ---------------------------------------------------

function renderProjectPage(container, projectItem) {
    let projectData = { title: "Nová A4 Stránka", widgetIds: [] };
    try { if (projectItem.content) projectData = JSON.parse(projectItem.content); } catch(e) {}
    if (projectItem.title) projectData.title = projectItem.title;
    activeProjectData = projectData;

    // Přizpůsobíme hl. kontejner pro plný vertikální průchod
    container.className = "w-full h-full flex flex-col overflow-y-auto pr-1";

    let pageBlocksHtml = (projectData.widgetIds || []).map((wId, bIndex) => {
        const child = allNotes.find(n => n.id === wId);
        if (!child) return '';

        let contentHtml = '';
        if (child.type === 'text') {
            contentHtml = `<div class="prose max-w-none text-slate-900 text-sm leading-relaxed p-1">${child.content}</div>`;
        } else if (child.type === 'drawing') {
            contentHtml = `
                <div class="flex justify-center p-2 border border-slate-200 rounded-xl bg-slate-50/50 w-full overflow-hidden">
                    <img src="${child.content}" class="max-h-[450px] w-full object-contain rounded" />
                </div>`;
        } else if (child.type === 'todo_table') {
            let tData = { columns: [], rows: [] };
            try { tData = normalizeTableData(JSON.parse(child.content)); } catch(e){}
            let ths = tData.columns.map(c => `<th class="border border-slate-300 p-2 text-xs font-bold bg-slate-100 text-slate-700">${c.name}</th>`).join('');
            let trs = tData.rows.map(r => {
                let tds = tData.columns.map(c => `<td class="border border-slate-300 p-2 text-xs text-slate-800">${r.values[c.id] || ''}</td>`).join('');
                return `<tr>${tds}</tr>`;
            }).join('');
            contentHtml = `<div class="overflow-x-auto max-w-full my-2 w-full"><table class="w-full border-collapse border border-slate-300"><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table></div>`;
        }

        return `
            <div draggable="true" ondragstart="handleBlockDragStart(event, ${bIndex})" ondragover="handleBlockDragOver(event)" ondrop="handleBlockDrop(event, ${bIndex}, '${projectItem.id}')"
                 class="relative group border-b border-slate-200 pb-5 mb-5 last:border-b-0 hover:bg-slate-50/80 p-2 rounded-xl transition cursor-grab active:cursor-grabbing w-full">
                <div class="flex items-center justify-between mb-2">
                    <span class="text-slate-400 hover:text-slate-600 cursor-grab text-xs font-bold" title="Přetáhnout">⋮⋮</span>
                    <div class="opacity-0 group-hover:opacity-100 transition flex items-center gap-3">
                        <button onclick="openItem('${child.id}')" class="text-xs text-pink-600 hover:underline font-semibold">Upravit zdroj</button>
                        <button onclick="removeWidgetFromProject('${projectItem.id}', '${child.id}')" class="text-slate-400 hover:text-red-500"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>
                    </div>
                </div>
                <div class="w-full text-slate-900">${contentHtml}</div>
            </div>`;
    }).join('');

    container.innerHTML = `
        <!-- HORNÍ LIŠTA -->
        <div class="flex justify-between items-center border-b border-slate-800 pb-3 gap-4 flex-shrink-0 mb-6">
            <input type="text" id="project-title-input" value="${projectData.title}" class="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-base font-bold text-slate-100 focus:outline-none focus:border-pink-500 w-full max-w-md" />
            <div class="flex gap-2">
                <button onclick="openAddWidgetModal('${projectItem.id}')" class="bg-slate-800 text-pink-400 border border-pink-500/20 px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5"><i data-lucide="plus-circle" class="w-4 h-4"></i> Vložit prvek</button>
                <button onclick="saveProjectPage('${projectItem.id}')" class="bg-emerald-600 text-white px-4 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1"><i data-lucide="save" class="w-3.5 h-3.5"></i> Uložit</button>
                <button onclick="deleteItem('${projectItem.id}')" class="text-slate-500 hover:text-red-400 p-1"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
            </div>
        </div>
        
        <!-- BÍLÝ A4 PAPÍR PROTAHOVACÍ BEZ OŘÍZNUTÍ -->
        <div class="w-full flex justify-center pb-20">
            <div class="a4-page">
                <div class="border-b-2 border-slate-900 pb-4 mb-6">
                    <h1 class="text-3xl font-extrabold text-slate-900 tracking-tight">${projectData.title}</h1>
                </div>
                <div class="w-full space-y-2">
                    ${pageBlocksHtml || '<p class="text-center text-slate-400 py-12">Stránka je prázdná. Klikni nahoře na "Vložit prvek".</p>'}
                </div>
            </div>
        </div>`;
    lucide.createIcons();
}

function handleBlockDragStart(e, index) { draggedBlockIndex = index; e.dataTransfer.effectAllowed = 'move'; }
function handleBlockDragOver(e) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }
function handleBlockDrop(e, targetIndex, projectId) {
    e.preventDefault();
    if (draggedBlockIndex === null || draggedBlockIndex === targetIndex) return;
    const moved = activeProjectData.widgetIds.splice(draggedBlockIndex, 1)[0];
    activeProjectData.widgetIds.splice(targetIndex, 0, moved);
    draggedBlockIndex = null;
    saveProjectPage(projectId);
}

function openAddWidgetModal(projectId) {
    const listEl = document.getElementById('widget-select-list');
    if (!listEl) return;
    listEl.innerHTML = '';

    const createTextBtn = document.getElementById('btn-create-inline-text');
    if (createTextBtn) createTextBtn.onclick = () => { closeAddWidgetModal(); createInlineTextWidget(projectId); };

    const createTableBtn = document.getElementById('btn-create-inline-table');
    if (createTableBtn) createTableBtn.onclick = () => { closeAddWidgetModal(); createInlineTableWidget(projectId); };

    const createDrawingBtn = document.getElementById('btn-create-inline-drawing');
    if (createDrawingBtn) createDrawingBtn.onclick = () => { closeAddWidgetModal(); createInlineDrawingWidget(projectId); };

    const availableItems = allNotes.filter(n => n.id !== projectId && n.type !== 'project_page');
    availableItems.forEach(item => {
        let name = item.title || extractNoteTitle(item.content);
        listEl.innerHTML += `
            <div onclick="addWidgetToProject('${projectId}', '${item.id}')" class="p-2.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-pink-500/50 cursor-pointer flex items-center justify-between group">
                <span class="text-xs font-semibold text-slate-200 group-hover:text-pink-400">${name}</span>
                <span class="text-[10px] text-pink-500 font-bold uppercase">+ Vložit</span>
            </div>`;
    });

    document.getElementById('modal-add-widget').classList.remove('hidden');
}

function closeAddWidgetModal() { document.getElementById('modal-add-widget').classList.add('hidden'); }

async function createInlineTextWidget(projectId) {
    try {
        const res = await fetch('/api/notes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title: "Textový blok",
                content: "<p>Napiš sem svojí poznámku...</p>",
                type: 'text'
            })
        });
        if (res.ok) {
            const newNote = await res.json();
            addWidgetToProject(projectId, newNote.id);
        }
    } catch(err) { console.error("Chyba:", err); }
}

async function createInlineTableWidget(projectId) {
    try {
        const defaultTable = typeof normalizeTableData === 'function' ? normalizeTableData(null) : {
            title: "Nová tabulka",
            columns: [
                { id: "col_done", name: "Stav", type: "checkbox", width: 80 },
                { id: "col_title", name: "Položka", type: "text", width: 200 }
            ],
            rows: [{ id: "row_1", values: { col_done: false, col_title: "" } }]
        };

        const res = await fetch('/api/notes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title: "Nová Tabulka",
                content: JSON.stringify(defaultTable),
                type: 'todo_table'
            })
        });

        if (res.ok) {
            const newNote = await res.json();
            addWidgetToProject(projectId, newNote.id);
        }
    } catch(err) { console.error("Chyba:", err); }
}

async function createInlineDrawingWidget(projectId) {
    try {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = 800;
        tempCanvas.height = 400;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.fillStyle = "#ffffff";
        tempCtx.fillRect(0, 0, 800, 400);

        const res = await fetch('/api/notes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title: "Nákres",
                content: tempCanvas.toDataURL(),
                type: 'drawing'
            })
        });

        if (res.ok) {
            const newNote = await res.json();
            addWidgetToProject(projectId, newNote.id);
        }
    } catch(err) { console.error("Chyba:", err); }
}

function addWidgetToProject(projectId, childId) {
    if (!activeProjectData.widgetIds) activeProjectData.widgetIds = [];
    if (!activeProjectData.widgetIds.includes(childId)) {
        activeProjectData.widgetIds.push(childId);
    }
    closeAddWidgetModal();
    saveProjectPage(projectId);
}

function removeWidgetFromProject(projectId, childId) {
    activeProjectData.widgetIds = activeProjectData.widgetIds.filter(id => id !== childId);
    saveProjectPage(projectId);
}

async function saveProjectPage(projectId) {
    const titleInput = document.getElementById('project-title-input');
    let updatedTitle = "Nová A4 Stránka";
    if (titleInput && titleInput.value.trim()) {
        updatedTitle = titleInput.value.trim();
    }
    activeProjectData.title = updatedTitle;

    const res = await fetch('/api/notes/' + projectId, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            title: updatedTitle, 
            content: JSON.stringify(activeProjectData) 
        })
    });
    if (res.ok) { 
        await fetchAll(); 
        openItem(projectId); 
    }
}

function createNew(type) {
    if (typeof resetRecordingState === 'function') resetRecordingState();
    quillEditor = null;
    activeNoteId = null;
    renderSidebar();

    const container = document.getElementById('work-container');
    if (!container) return;

    if (type === 'project_page') {
        fetch('/api/notes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: "Nová A4 Stránka", content: JSON.stringify({ title: "Nová A4 Stránka", widgetIds: [] }), type: 'project_page' })
        }).then(r => r.json()).then(n => { fetchAll().then(() => openItem(n.id)); });
    } else {
        container.className = "w-full h-full flex flex-col justify-center items-center";
        
        if (type === 'text') {
            container.innerHTML = `
                <div class="w-full h-full flex flex-col space-y-3">
                    <div class="flex justify-between items-center border-b border-slate-800 pb-2 gap-4">
                        <input type="text" id="note-title-input" value="" placeholder="Pojmenuj dokument..." class="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-base font-bold text-slate-100 focus:outline-none focus:border-pink-500 w-full max-w-md" />
                        <button onclick="saveNote('text')" class="bg-pink-600 font-semibold px-5 py-1.5 rounded-xl text-xs">Uložit Dokument</button>
                    </div>
                    <div class="flex-1 paper-editor flex flex-col overflow-hidden shadow-2xl"><div id="editor-container" class="flex-1 overflow-y-auto"></div></div>
                </div>`;
            initRichTextEditor('#editor-container');
        } else if (type === 'drawing') {
            renderCanvasEditor(container);
        } else if (type === 'todo_table') {
            currentTableData = normalizeTableData(null);
            renderTableView(container, null);
        } else if (type === 'audio' && typeof renderAudioView === 'function') {
            renderAudioView(container);
        } else if (type === 'ocr' && typeof renderOCRView === 'function') {
            renderOCRView(container);
        }
    }
    lucide.createIcons();
}

async function saveNote(type) {
    if (!quillEditor) return;
    const content = quillEditor.root.innerHTML;
    if (!content.trim() || content === '<p><br></p>') return;

    const title = document.getElementById('note-title-input')?.value.trim() || 'Nová poznámka';
    const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content, type })
    });
    if (res.ok) { const note = await res.json(); fetchAll().then(() => openItem(note.id)); }
}

async function updateExistingNote(noteId) {
    if (!quillEditor) return;
    const content = quillEditor.root.innerHTML;
    const title = document.getElementById('note-title-input')?.value.trim() || 'Bez názvu';

    const res = await fetch('/api/notes/' + noteId, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content })
    });
    if (res.ok) { fetchAll(); alert("Uloženo!"); }
}

fetchAll();