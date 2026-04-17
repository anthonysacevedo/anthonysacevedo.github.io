/**
 * PLAYROLE OS - SCRIPT ADAPTATIVO (SIN IDS)
 */

const STORAGE_KEY = 'playrole_v5_db';
let currentDorsoBase64 = null;
let currentGroupCards = []; 
let currentPreviewIndex = 0;
let selectedTema = null;

// --- FUNCIÓN PARA ENCONTRAR ELEMENTOS POR EL TEXTO DE SU LABEL ---
const findByLabel = (text) => {
    const labels = Array.from(document.querySelectorAll('label, span, h3, h4'));
    const target = labels.find(l => l.innerText.toUpperCase().includes(text.toUpperCase()));
    return target ? (target.nextElementSibling?.tagName === 'INPUT' || target.nextElementSibling?.tagName === 'TEXTAREA' ? target.nextElementSibling : target.parentElement.querySelector('input, textarea')) : null;
};

// --- MAPEO DINÁMICO ---
const getUI = () => {
    const cards = document.querySelectorAll('.card-ratio');
    const buttons = document.querySelectorAll('button');
    
    return {
        situacion: findByLabel('SITUACIÓN'),
        rol: findByLabel('ROL'),
        tema: findByLabel('TEMA'),
        desarrollo: document.querySelector('textarea'),
        nombreDorso: findByLabel('NOMBRE DORSO'),
        
        // El frente es la primera tarjeta que tiene un borde punteado/dashed
        frontPreview: document.querySelector('.card-ratio .border-dashed'),
        // El dorso es la tarjeta que contiene el texto "PLAYROLE"
        backPreview: Array.from(cards).find(c => c.innerText.includes('PLAYROLE')) || cards[1],
        
        dorsoText: Array.from(document.querySelectorAll('.card-ratio span, .card-ratio h3')).find(el => el.innerText.includes('PLAYROLE')),
        
        carousel: document.querySelector('.overflow-x-auto'),
        
        btnSave: Array.from(buttons).find(b => b.innerText.toUpperCase().includes('AGREGAR') || b.innerText.toUpperCase().includes('CREAR')),
        btnPrint: Array.from(buttons).find(b => b.innerText.toUpperCase().includes('EXPORTAR')),
        btnUpload: Array.from(buttons).find(b => b.innerText.toUpperCase().includes('IMAGEN DORSO')),
        
        btnNext: document.querySelector('[data-icon="chevron_right"]')?.closest('button'),
        btnPrev: document.querySelector('[data-icon="chevron_left"]')?.closest('button')
    };
};

// --- MOTOR DE RENDERIZADO (Precisión 80x100mm) ---
function renderCard(data, target) {
    if (!target) return;
    const sizeDefault = 9;
    const html = `
        <div style="width: 80mm; height: 100mm; position: relative; background: white; font-family: 'Inter', sans-serif; color: black; overflow: hidden; padding: 5mm; box-sizing: border-box; border: 1px solid #eee;">
            <div style="display: flex; justify-content: space-between; border-bottom: 0.5pt solid black; padding-bottom: 2mm; margin-bottom: 4mm;">
                <span style="font-weight: 800; font-size: 9pt;">SITUACIÓN Nº ${data.situacion || '1'}</span>
                <span style="font-weight: 700; font-size: 9pt; color: #004ac6;">${(data.rol || '').toUpperCase()}</span>
            </div>
            <div class="box" style="height: 65mm; overflow: hidden;">
                <p style="font-size: 7pt; font-style: italic; color: #666; margin-bottom: 3mm;">Lee atentamente y representa la acción.</p>
                <div class="txt" style="font-size: ${sizeDefault}pt; line-height: 1.3;">${(data.desarrollo || '').replace(/\n/g, '<br>')}</div>
            </div>
            <div style="position: absolute; bottom: 5mm; left: 5mm; right: 5mm; border-top: 0.5pt solid black; padding-top: 2mm; text-align: center;">
                <span style="font-weight: 900; font-size: 9pt;">${(data.tema || '').toUpperCase()}</span>
            </div>
        </div>`;
    target.innerHTML = html;
}

// --- LOGICA DE PDF ---
async function handleExport() {
    const ui = getUI();
    if (!selectedTema || currentGroupCards.length === 0) return alert("Guarda o selecciona un grupo primero.");
    
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('l', 'mm', 'a4');

    try {
        const canvasB = await html2canvas(ui.backPreview, { scale: 2 });
        const imgB = canvasB.toDataURL('image/png');

        for (let i = 0; i < currentGroupCards.length; i++) {
            if (i > 0) doc.addPage('a4', 'l');
            const tmp = document.createElement('div');
            tmp.style.position = 'fixed'; tmp.style.left = '-9999px';
            document.body.appendChild(tmp);
            renderCard(currentGroupCards[i], tmp);
            await new Promise(r => setTimeout(r, 100));
            const canvasF = await html2canvas(tmp.firstChild, { scale: 2 });
            doc.addImage(canvasF.toDataURL('image/png'), 'PNG', 60, 55, 80, 100);
            doc.addImage(imgB, 'PNG', 150, 55, 80, 100);
            document.body.removeChild(tmp);
        }
        doc.save(`PlayRole_${selectedTema}.pdf`);
    } catch (e) { alert("Error al exportar"); }
}

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', () => {
    const ui = getUI();

    // Guardar Tarjeta
    if (ui.btnSave) ui.btnSave.onclick = () => {
        const db = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        const tema = ui.tema.value || "General";
        if (!db[tema]) db[tema] = [];
        db[tema].push({
            situacion: ui.situacion.value,
            rol: ui.rol.value,
            tema: tema,
            desarrollo: ui.desarrollo.value,
            textoDorso: ui.nombreDorso.value
        });
        localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
        alert("Tarjeta guardada en el grupo: " + tema);
        location.reload(); 
    };

    // Exportar
    if (ui.btnPrint) ui.btnPrint.onclick = handleExport;

    // Actualizar previsualización en vivo
    const updateLive = () => {
        renderCard({
            situacion: ui.situacion.value,
            rol: ui.rol.value,
            tema: ui.tema.value,
            desarrollo: ui.desarrollo.value
        }, ui.frontPreview);
        if (ui.dorsoText) ui.dorsoText.innerText = ui.nombreDorso.value.toUpperCase() || "PLAYROLE";
    };

    [ui.situacion, ui.rol, ui.tema, ui.desarrollo, ui.nombreDorso].forEach(input => {
        if (input) input.oninput = updateLive;
    });

    // Cargar Carrusel
    const db = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    if (ui.carousel) {
        ui.carousel.innerHTML = '';
        Object.keys(db).forEach(tema => {
            const div = document.createElement('div');
            div.className = "flex-shrink-0 w-24 p-2 bg-white border border-blue-200 rounded text-center cursor-pointer";
            div.innerHTML = `<span style="font-size: 10px; font-weight: bold;">${tema}</span>`;
            div.onclick = () => {
                selectedTema = tema;
                currentGroupCards = db[tema];
                updateLive();
                alert("Grupo seleccionado: " + tema);
            };
            ui.carousel.appendChild(div);
        });
    }
});
