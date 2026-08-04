let canvas, ctx, painting = false;
let currentPenColor = '#000000';
let currentPenSize = 5;
let isEraser = false;

function renderCanvasEditor(container, item = null) {
    const isEdit = item !== null;
    container.innerHTML = `
        <div class="w-full h-full flex flex-col space-y-3">
            <div class="flex justify-between items-center border-b border-slate-800 pb-2 gap-4">
                <div class="flex items-center gap-3">
                    <!-- PALETA BAREV S PŘÍMÝM NASTAVENÍM POZADÍ (EXAKTNÍ BARVY Z KÓDU) -->
                    <div class="flex items-center gap-1.5 bg-slate-900 border border-slate-800 p-1 rounded-xl">
                        <button onclick="setPenColor('#000000')" style="background-color: #000000;" class="w-6 h-6 rounded-lg border border-slate-700 hover:scale-110 transition" title="Bílá"></button>
                        <button onclick="setPenColor('#ff0000')" style="background-color: #ff0000;" class="w-6 h-6 rounded-lg hover:scale-110 transition" title="Červená"></button>
                        <button onclick="setPenColor('#fbff00')" style="background-color: #fbff00;" class="w-6 h-6 rounded-lg hover:scale-110 transition" title="Žlutá"></button>
                        <button onclick="setPenColor('#00ff00')" style="background-color: #00ff00;" class="w-6 h-6 rounded-lg hover:scale-110 transition" title="Zelená"></button>
                        <button onclick="setPenColor('#0062ff')" style="background-color: #0062ff;" class="w-6 h-6 rounded-lg hover:scale-110 transition" title="Modrá"></button>
                        <input type="color" onchange="setPenColor(this.value)" class="w-6 h-6 rounded cursor-pointer bg-transparent border-0" title="Vlastní barva">
                    </div>

                    <button id="btn-tool-eraser" onclick="setEraser()" class="bg-slate-800 text-slate-400 hover:text-white px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5" title="Guma">
                        <i data-lucide="eraser" class="w-4 h-4"></i> Guma
                    </button>

                    <div class="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1 rounded-xl">
                        <i data-lucide="circle-dot" class="w-3.5 h-3.5 text-slate-400"></i>
                        <input type="range" min="1" max="50" value="${currentPenSize}" oninput="setPenSize(this.value)" class="w-24 accent-pink-500 cursor-pointer" title="Tloušťka">
                    </div>

                    <button onclick="clearCanvas()" class="text-xs text-slate-500 hover:text-red-400 transition ml-2">Vymazat vše</button>
                </div>

                ${isEdit 
                    ? `<button onclick="updateExistingDrawing('${item.id}')" class="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1"><i data-lucide="save" class="w-3.5 h-3.5"></i> Uložit Změny</button>`
                    : `<button onclick="saveDrawing()" class="bg-pink-600 hover:bg-pink-500 font-semibold px-5 py-1.5 rounded-xl text-xs transition">Uložit Kresbu</button>`
                }
            </div>

            <div class="flex-1 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl relative">
                <canvas id="paint-canvas" class="w-full h-full touch-none cursor-crosshair"></canvas>
            </div>
        </div>`;

    initCanvas();
    if (isEdit) loadDrawingToCanvas(item.content);
    lucide.createIcons();
}

function initCanvas() {
    canvas = document.getElementById('paint-canvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const start = (e) => { painting = true; draw(e); };
    const stop = () => { painting = false; ctx.beginPath(); };

    canvas.addEventListener('mousedown', start);
    canvas.addEventListener('mouseup', stop);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('touchstart', start);
    canvas.addEventListener('touchend', stop);
    canvas.addEventListener('touchmove', draw);
}

function draw(e) {
    if (!painting || !ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || (e.touches && e.touches[0].clientX)) - rect.left;
    const y = (e.clientY || (e.touches && e.touches[0].clientY)) - rect.top;

    ctx.lineWidth = currentPenSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = isEraser ? '#ffffff' : currentPenColor;

    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
}

function setPenColor(color) { isEraser = false; currentPenColor = color; updateDrawingToolsUI(); }
function setEraser() { isEraser = true; updateDrawingToolsUI(); }
function setPenSize(size) { currentPenSize = size; }

function updateDrawingToolsUI() {
    const btn = document.getElementById('btn-tool-eraser');
    if (btn) {
        btn.className = isEraser 
            ? 'bg-pink-600 text-white px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5'
            : 'bg-slate-800 text-slate-400 hover:text-white px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5';
    }
}

function clearCanvas() {
    if (ctx && canvas) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
}

function loadDrawingToCanvas(dataUrl) {
    if (!canvas || !ctx) return;
    const img = new Image();
    img.onload = () => ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    img.src = dataUrl;
}

async function saveDrawing() {
    if (!canvas) return;
    await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Kresba', content: canvas.toDataURL(), type: 'drawing' })
    });
    fetchAll();
}

async function updateExistingDrawing(id) {
    if (!canvas) return;
    const res = await fetch('/api/notes/' + id, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: canvas.toDataURL() })
    });
    if (res.ok) { fetchAll(); alert("Kresba upravena!"); }
}