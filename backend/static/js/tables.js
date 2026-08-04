let activeEditingTableId = null;
let draggedColIndex = null;

// Výchozí struktura pro novou tabulku
let currentTableData = { 
    title: "Nová tabulka", 
    columns: [
        { id: "col_done", name: "Stav", type: "checkbox", width: 80 },
        { id: "col_title", name: "Úkol / Název", type: "text", width: 250 },
        { id: "col_date", name: "Termín", type: "date", width: 150 },
        { id: "col_tag", name: "Kategorie", type: "text", width: 150 }
    ],
    rows: [
        { id: "row_1", values: { col_done: false, col_title: "", col_date: "", col_tag: "" } }
    ] 
};

// Normalizace starých nebo poškozených dat pro zpětnou kompatibilitu
function normalizeTableData(data) {
    if (!data) {
        return { 
            title: "Nová tabulka", 
            columns: [
                { id: "col_done", name: "Stav", type: "checkbox", width: 80 },
                { id: "col_title", name: "Úkol / Název", type: "text", width: 250 },
                { id: "col_date", name: "Termín", type: "date", width: 150 },
                { id: "col_tag", name: "Kategorie", type: "text", width: 150 }
            ],
            rows: [{ id: "row_" + Date.now(), values: { col_done: false, col_title: "", col_date: "", col_tag: "" } }] 
        };
    }

    if (typeof data === 'string') {
        try { data = JSON.parse(data); } catch(e) { return normalizeTableData(null); }
    }

    if (Array.isArray(data) || !data.columns) {
        const oldRows = Array.isArray(data) ? data : (data.rows || []);
        const title = data.title || "Převzatá tabulka";
        
        const cols = [
            { id: "col_done", name: "Stav", type: "checkbox", width: 80 },
            { id: "col_title", name: "Úkol / Název", type: "text", width: 250 },
            { id: "col_date", name: "Termín", type: "date", width: 150 },
            { id: "col_tag", name: "Kategorie", type: "text", width: 150 }
        ];

        const rows = oldRows.map((r, i) => ({
            id: "row_" + i,
            values: {
                col_done: !!r.done,
                col_title: r.title || "",
                col_date: r.date || "",
                col_tag: r.tag || ""
            }
        }));

        return { title, columns: cols, rows };
    }

    return data;
}

// Vykreslení pohledu tabulky
function renderTableView(container, tableId = null) {
    activeEditingTableId = tableId;
    const isEditing = tableId !== null;

    let thsHtml = currentTableData.columns.map((col, index) => {
        const defaultWidth = col.type === 'checkbox' ? 90 : 180;
        const widthVal = col.width ? col.width : defaultWidth;
        const colStyle = `style="width: ${widthVal}px; min-width: ${widthVal}px;"`;

        return `
            <th ${colStyle} 
                draggable="true"
                ondragstart="handleDragStart(event, ${index})"
                ondragover="handleDragOver(event)"
                ondrop="handleDrop(event, ${index}, ${isEditing ? `'${tableId}'` : 'null'})"
                class="p-3 text-slate-400 text-xs font-semibold uppercase group border-r border-slate-800/50 last:border-r-0 relative select-none cursor-grab active:cursor-grabbing hover:bg-slate-800/40 transition-colors">
                
                <div class="flex items-center justify-between gap-1.5 mr-2">
                    <span class="text-slate-600 group-hover:text-pink-500/70 transition-colors cursor-grab flex-shrink-0">⋮⋮</span>
                    <input type="text" 
                           value="${col.name}" 
                           data-col-title-id="${col.id}" 
                           class="col-title-input bg-transparent text-slate-200 font-semibold focus:outline-none focus:border-b focus:border-pink-500 w-full truncate" 
                           placeholder="Název..." />
                    ${currentTableData.columns.length > 1 ? `
                        <button onclick="deleteColumn('${col.id}', ${isEditing ? `'${tableId}'` : 'null'})" class="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition flex-shrink-0" title="Smazat sloupec">
                            <i data-lucide="x" class="w-3.5 h-3.5"></i>
                        </button>
                    ` : ''}
                </div>
                <div onmousedown="initColumnResize(event, '${col.id}')" class="absolute top-0 right-0 bottom-0 w-2 hover:bg-pink-500/50 cursor-col-resize transition-colors z-10"></div>
            </th>
        `;
    }).join('');

    let rowsHtml = currentTableData.rows.map((row, rIdx) => {
        let cellsHtml = currentTableData.columns.map(col => {
            const val = row.values[col.id] !== undefined ? row.values[col.id] : '';
            let inputHtml = '';

            if (col.type === 'checkbox') {
                inputHtml = `<div class="flex justify-center"><input type="checkbox" ${val ? 'checked' : ''} data-row="${rIdx}" data-col="${col.id}" class="cell-input w-4 h-4 accent-pink-500 rounded cursor-pointer" /></div>`;
            } else if (col.type === 'date') {
                inputHtml = `<input type="date" value="${val}" data-row="${rIdx}" data-col="${col.id}" class="cell-input w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-300 focus:outline-none focus:border-pink-500" />`;
            } else if (col.type === 'number') {
                inputHtml = `<input type="number" value="${val}" placeholder="0" data-row="${rIdx}" data-col="${col.id}" class="cell-input w-full bg-transparent text-sm text-slate-200 focus:outline-none focus:border-b focus:border-pink-500" />`;
            } else {
                inputHtml = `<input type="text" value="${val}" placeholder="..." data-row="${rIdx}" data-col="${col.id}" class="cell-input w-full bg-transparent text-sm text-slate-200 focus:outline-none focus:border-b focus:border-pink-500" />`;
            }

            return `<td class="p-3 border-r border-slate-800/30 last:border-r-0">${inputHtml}</td>`;
        }).join('');

        return `
            <tr class="table-row-item border-b border-slate-800 hover:bg-slate-900/50">
                ${cellsHtml}
                <td class="p-3 text-center w-10">
                    <button onclick="removeRow(${rIdx}, ${isEditing ? `'${tableId}'` : 'null'})" class="text-slate-600 hover:text-red-400 p-1"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                </td>
            </tr>`;
    }).join('');

    container.innerHTML = `
        <div class="w-full h-full flex flex-col space-y-4">
            <div class="flex justify-between items-center border-b border-slate-800 pb-3 flex-shrink-0">
                <div class="flex items-center gap-2 flex-1 max-w-md">
                    <i data-lucide="table" class="text-pink-500 w-5 h-5 flex-shrink-0"></i>
                    <input type="text" id="table-title-input" value="${currentTableData.title || ''}" placeholder="Pojmenuj tabulku..." class="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-base font-bold text-slate-100 focus:outline-none focus:border-pink-500 w-full" />
                </div>
                <div class="flex gap-2">
                    <button onclick="openAddColumnModal()" class="bg-slate-800 hover:bg-slate-700 text-pink-400 border border-pink-500/20 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition"><i data-lucide="columns-3" class="w-3.5 h-3.5"></i> Přidat sloupec</button>
                    <button onclick="addRow(${isEditing ? `'${tableId}'` : 'null'})" class="bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition"><i data-lucide="plus" class="w-3.5 h-3.5"></i> Přidat řádek</button>
                    ${!isEditing 
                        ? `<button onclick="saveNewTable()" class="bg-pink-600 hover:bg-pink-500 text-white px-4 py-1.5 rounded-lg text-xs font-semibold transition">Uložit Novou Tabulku</button>` 
                        : `<button onclick="updateExistingTable('${tableId}')" class="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1"><i data-lucide="save" class="w-3.5 h-3.5"></i> Uložit Změny</button>`
                    }
                </div>
            </div>
            <div class="flex-1 overflow-auto border border-slate-800 rounded-2xl bg-slate-900/40 w-full">
                <table class="table-fixed min-w-full text-left border-collapse" style="width: max-content;">
                    <thead>
                        <tr class="border-b border-slate-800 bg-slate-900">
                            ${thsHtml}
                            <th class="p-3 w-12 flex-shrink-0"></th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHtml.length > 0 ? rowsHtml : `<tr><td colspan="${currentTableData.columns.length + 1}" class="p-8 text-center text-slate-600 text-sm">Žádná data. Klikni na "Přidat řádek".</td></tr>`}
                    </tbody>
                </table>
            </div>
        </div>`;
    lucide.createIcons();
}

// Sběr dat z DOM
function collectTableDataFromDOM() {
    const titleInput = document.getElementById('table-title-input');
    if (titleInput && titleInput.value.trim()) currentTableData.title = titleInput.value.trim();

    const colTitleInputs = document.querySelectorAll('.col-title-input');
    colTitleInputs.forEach(input => {
        const colId = input.getAttribute('data-col-title-id');
        const col = currentTableData.columns.find(c => c.id === colId);
        if (col && input.value.trim()) {
            col.name = input.value.trim();
        }
    });

    const cellInputs = document.querySelectorAll('.cell-input');
    cellInputs.forEach(input => {
        const rIdx = input.getAttribute('data-row');
        const colId = input.getAttribute('data-col');
        let value;

        if (input.type === 'checkbox') {
            value = input.checked;
        } else {
            value = input.value;
        }

        if (currentTableData.rows[rIdx]) {
            currentTableData.rows[rIdx].values[colId] = value;
        }
    });
}

// ULOŽENÍ NOVÉ TABULKY DO API
async function saveNewTable() {
    collectTableDataFromDOM();
    try {
        const res = await fetch('/api/notes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title: currentTableData.title,
                content: JSON.stringify(currentTableData),
                type: 'todo_table'
            })
        });
        if (res.ok) {
            const newTable = await res.json();
            await fetchAll();
            openItem(newTable.id);
        }
    } catch(err) {
        console.error("Chyba při ukládání tabulky:", err);
    }
}

// ULOŽENÍ ZMĚN STÁVAJÍCÍ TABULKY
async function updateExistingTable(tableId) {
    collectTableDataFromDOM();
    try {
        const res = await fetch('/api/notes/' + tableId, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title: currentTableData.title,
                content: JSON.stringify(currentTableData)
            })
        });
        if (res.ok) {
            await fetchAll();
            alert("Tabulka byla úspěšně uložena!");
        }
    } catch(err) {
        console.error("Chyba při uložení tabulky:", err);
    }
}

// DRAG & DROP
function handleDragStart(e, index) {
    draggedColIndex = index;
    e.dataTransfer.effectAllowed = 'move';
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
}

function handleDrop(e, targetIndex, tableId = null) {
    e.preventDefault();
    if (draggedColIndex === null || draggedColIndex === targetIndex) return;

    collectTableDataFromDOM();
    const movedCol = currentTableData.columns.splice(draggedColIndex, 1)[0];
    currentTableData.columns.splice(targetIndex, 0, movedCol);

    draggedColIndex = null;
    renderTableView(document.getElementById('work-container'), tableId);
}

// ŘÁDKY & SLOUPCE
function addRow(tableId = null) { 
    collectTableDataFromDOM(); 
    const newRowValues = {};
    currentTableData.columns.forEach(c => {
        newRowValues[c.id] = c.type === 'checkbox' ? false : '';
    });
    currentTableData.rows.push({ id: "row_" + Date.now(), values: newRowValues }); 
    renderTableView(document.getElementById('work-container'), tableId); 
}

function removeRow(idx, tableId = null) { 
    collectTableDataFromDOM(); 
    currentTableData.rows.splice(idx, 1); 
    renderTableView(document.getElementById('work-container'), tableId); 
}

function openAddColumnModal() {
    document.getElementById('modal-add-column').classList.remove('hidden');
    document.getElementById('new-col-name').value = '';
    document.getElementById('new-col-name').focus();
}

function closeAddColumnModal() {
    document.getElementById('modal-add-column').classList.add('hidden');
}

function confirmAddColumn() {
    const name = document.getElementById('new-col-name').value.trim();
    const type = document.getElementById('new-col-type').value;

    if (!name) {
        alert("Zadej prosím název sloupce.");
        return;
    }

    collectTableDataFromDOM();
    const newColId = "col_" + Date.now();
    currentTableData.columns.push({ id: newColId, name: name, type: type, width: 180 });

    currentTableData.rows.forEach(r => {
        r.values[newColId] = type === 'checkbox' ? false : '';
    });

    closeAddColumnModal();
    renderTableView(document.getElementById('work-container'), activeEditingTableId);
}

function deleteColumn(colId, tableId = null) {
    if (currentTableData.columns.length <= 1) {
        alert("Tabulka musí mít alespoň jeden sloupec!");
        return;
    }
    if (!confirm("Opravdu chceš smazat tento sloupec včetně jeho dat?")) return;

    collectTableDataFromDOM();
    currentTableData.columns = currentTableData.columns.filter(c => c.id !== colId);
    currentTableData.rows.forEach(r => { delete r.values[colId]; });
    renderTableView(document.getElementById('work-container'), tableId);
}

// ROZTAHOVÁNÍ SLOUPCŮ
function initColumnResize(e, colId) {
    e.preventDefault();
    e.stopPropagation();

    const th = e.target.parentElement;
    const startX = e.clientX;
    const startWidth = th.offsetWidth;

    const onMouseMove = (moveEvent) => {
        const newWidth = Math.max(80, startWidth + (moveEvent.clientX - startX));
        th.style.width = newWidth + 'px';
        th.style.minWidth = newWidth + 'px';
        
        const col = currentTableData.columns.find(c => c.id === colId);
        if (col) col.width = newWidth;
    };

    const onMouseUp = () => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
}