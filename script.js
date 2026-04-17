const STORAGE_KEY = 'playrole_v5_db';

let currentGroupCards = [];
let currentPreviewIndex = 0;
let selectedTema = null;

// ===============================
// SELECTORES SEGUROS
// ===============================
function getUI() {
    const ratios = document.querySelectorAll('.card-ratio');

    return {
        front: ratios[0] || null,
        back: ratios[1] || null,
        carousel: document.querySelector('.flex.gap-4.overflow-x-auto') || null,
        buttons: document.querySelectorAll('button')
    };
}

function getFields() {
    const inputs = document.querySelectorAll('input');
    const textarea = document.querySelector('textarea');

    return {
        situacion: inputs[0] || null,
        rol: inputs[1] || null,
        tema: inputs[2] || null,
        desarrollo: textarea || null
    };
}

// ===============================
// EXPORTAR PDF (FIX REAL)
// ===============================
async function exportA4() {

    if (!currentGroupCards.length) {
        alert("Seleccioná un grupo");
        return;
    }

    const ui = getUI();

    if (!ui.front || !ui.back) {
        alert("No se encontraron las tarjetas");
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('l', 'mm', 'a4');

    try {
        const canvasBack = await html2canvas(ui.back, {
            scale: 3,
            backgroundColor: "#fff"
        });

        const imgBack = canvasBack.toDataURL('image/png');

        for (let i = 0; i < currentGroupCards.length; i++) {

            if (i > 0) doc.addPage();

            const canvasFront = await html2canvas(ui.front, {
                scale: 3,
                backgroundColor: "#fff"
            });

            const imgFront = canvasFront.toDataURL('image/png');

            doc.addImage(imgFront, 'PNG', 63.5, 55, 80, 100);
            doc.addImage(imgBack, 'PNG', 153.5, 55, 80, 100);
        }

        doc.save("PlayRole.pdf");

    } catch (e) {
        console.error(e);
        alert("Error generando PDF");
    }
}

// ===============================
// GRUPOS (SIN TOCAR DISEÑO)
// ===============================
function renderRecentGroups() {
    const db = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    const ui = getUI();

    if (!ui.carousel) return;

    ui.carousel.innerHTML = '';

    Object.keys(db).forEach(tema => {
        const div = document.createElement('div');

        div.textContent = tema;
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

function updatePreview() {
    const ui = getUI();
    if (!ui.front) return;

    const card = currentGroupCards[currentPreviewIndex];
    if (!card) return;

    ui.front.innerText = card.desarrollo || '';
}

// ===============================
// INIT (NO ROMPE NADA)
// ===============================
document.addEventListener('DOMContentLoaded', () => {

    const ui = getUI();
    const fields = getFields();

    renderRecentGroups();

    // GUARDAR
    const saveBtn = Array.from(ui.buttons).find(b =>
        b.textContent.toUpperCase().includes("GUARDAR")
    );

    if (saveBtn) {
        saveBtn.onclick = () => {

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
        };
    }

    // EXPORTAR (FIX)
    const exportBtn = Array.from(ui.buttons).find(b =>
        b.textContent.toUpperCase().includes("EXPORTAR")
    );

    if (exportBtn) {
        exportBtn.onclick = exportA4;
    }

});