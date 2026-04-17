// ===============================
// ESTADO GLOBAL
// ===============================
const STORAGE_KEY = 'playrole_v5_db';

let currentGroupCards = [];
let currentPreviewIndex = 0;
let selectedTema = null;

// ===============================
// HELPERS SEGUROS
// ===============================
function qs(sel) { return document.querySelector(sel); }
function qsa(sel) { return document.querySelectorAll(sel); }

// ===============================
// UI
// ===============================
function getUI() {
    const cards = qsa('.card-ratio');

    return {
        front: cards[0] || null,
        back: cards[1] || null,
        carousel: qs('.flex.gap-4.overflow-x-auto'),
        buttons: qsa('button')
    };
}

function getFields() {
    const inputs = qsa('input');
    const textarea = qs('textarea');

    return {
        situacion: inputs[0] || null,
        rol: inputs[1] || null,
        tema: inputs[2] || null,
        desarrollo: textarea || null
    };
}

// ===============================
// PREVIEW (NO TOCA DISEÑO)
// ===============================
function updatePreview() {
    const ui = getUI();
    if (!ui.front) return;

    const card = currentGroupCards[currentPreviewIndex];
    if (!card) return;

    // Solo actualiza contenido básico sin romper tu layout
    ui.front.innerText = card.desarrollo || '';
}

// ===============================
// STORAGE
// ===============================
function renderRecentGroups() {
    const db = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    const ui = getUI();

    if (!ui.carousel) return;

    ui.carousel.innerHTML = '';

    Object.keys(db).forEach(tema => {
        const div = document.createElement('div');
        div.textContent = tema;
        div.style.cursor = 'pointer';

        div.onclick = () => selectGroup(tema);

        ui.carousel.appendChild(div);
    });
}

function selectGroup(tema) {
    selectedTema = tema;

    const db = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    currentGroupCards = db[tema] || [];

    currentPreviewIndex = 0;
    updatePreview();
}

// ===============================
// EXPORTAR PDF (FIX REAL)
// ===============================
async function exportA4() {

    if (!currentGroupCards || currentGroupCards.length === 0) {
        alert("Seleccioná un grupo primero");
        return;
    }

    if (!window.html2canvas || !window.jspdf) {
        alert("Faltan librerías");
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('l', 'mm', 'a4');

    const uiCards = document.querySelectorAll('.card-ratio');
    const backCard = uiCards[1];

    if (!backCard) {
        alert("No se encontró el dorso");
        return;
    }

    // Render del dorso UNA sola vez
    const canvasBack = await html2canvas(backCard, {
        scale: 3,
        backgroundColor: "#ffffff",
        useCORS: true
    });

    const imgBack = canvasBack.toDataURL('image/png');

    for (let i = 0; i < currentGroupCards.length; i++) {

        if (i > 0) doc.addPage();

        const data = currentGroupCards[i];

        // 🔥 Creamos una tarjeta TEMPORAL (NO TOCA TU UI)
        const temp = document.createElement('div');

        temp.style.position = 'fixed';
        temp.style.left = '-9999px';
        temp.style.top = '0';
        temp.style.width = '80mm';
        temp.style.height = '100mm';

        document.body.appendChild(temp);

        // ⚠️ USA TU FUNCIÓN ORIGINAL (clave para no romper diseño)
        if (typeof renderCardToElement === "function") {
            renderCardToElement(data, temp);
        } else {
            // fallback mínimo si no existe
            temp.innerText = data.desarrollo || '';
        }

        // Espera a que renderice bien
        await new Promise(r => setTimeout(r, 80));

        const canvasFront = await html2canvas(temp.firstElementChild || temp, {
            scale: 3,
            backgroundColor: "#ffffff",
            useCORS: true
        });

        const imgFront = canvasFront.toDataURL('image/png');

        // POSICIÓN IMPRIMIBLE
        doc.addImage(imgFront, 'PNG', 63.5, 55, 80, 100);
        doc.addImage(imgBack, 'PNG', 153.5, 55, 80, 100);

        document.body.removeChild(temp);
    }

    doc.save(`PlayRole_${selectedTema || 'cards'}.pdf`);
}


// ===============================
// INIT
// ===============================
document.addEventListener('DOMContentLoaded', () => {

    const ui = getUI();
    const fields = getFields();

    renderRecentGroups();

    // ---------------------------
    // GUARDAR
    // ---------------------------
    const saveBtn = Array.from(ui.buttons).find(b =>
        b.textContent.toUpperCase().includes("GUARDAR")
    );

    if (saveBtn) {
        saveBtn.addEventListener('click', () => {

            const db = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
            const tema = fields.tema?.value || "Sin título";

            if (!db[tema]) db[tema] = [];

            db[tema].push({
                situacion: fields.situacion?.value,
                rol: fields.rol?.value,
                tema: tema,
                desarrollo: fields.desarrollo?.value
            });

            localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
            selectGroup(tema);
        });
    }

    // ---------------------------
    // EXPORTAR (FIX)
    // ---------------------------
    const exportBtn = Array.from(ui.buttons).find(b =>
        b.textContent.toUpperCase().includes("EXPORTAR")
    );

    if (exportBtn) {
        exportBtn.addEventListener('click', exportA4);
    }

    // ---------------------------
    // LIVE PREVIEW INPUTS
    // ---------------------------
    Object.values(fields).forEach(el => {
        if (!el) return;

        el.addEventListener('input', () => {
            const ui = getUI();

            if (ui.front) {
                ui.front.innerText = fields.desarrollo?.value || '';
            }
        });
    });

});