/**
 * PLAYROLE OS - BACKEND V6.2 (FIXED AUTO-SIZE & PRINT)
 */

const STORAGE_KEY = 'playrole_v5_db';
let currentGroupCards = []; 
let currentPreviewIndex = 0;
let selectedTema = null;

// Selectores dinámicos
const getInputs = () => ({
    situacion: document.querySelector('input[type="number"]'),
    rol: document.querySelector('input[placeholder*="Facilitador"]'),
    tema: document.querySelector('input[placeholder*="Resolution"]'),
    desarrollo: document.querySelector('textarea')
});

const getContainers = () => ({
    front: document.querySelector('.card-ratio.bg-white'),
    // Buscamos el dorso que suele ser el segundo .card-ratio o el que tiene "PLAYROLE"
    back: document.querySelectorAll('.card-ratio')[1],
    carousel: document.querySelector('.flex.gap-4.overflow-x-auto'),
    printBtn: document.querySelector('button.signature-gradient.shadow-2xl')
});

/**
 * 1. MOTOR DE RENDERIZADO CON AUTO-AJUSTE (0.2pt)
 */
function renderCardToElement(data, target) {
    if (!target) return;
    const fontSizeBase = 9;

    // Estructura fija para asegurar que el scrollHeight sea calculable
    target.innerHTML = `
        <div class="render-target" style="width: 80mm; height: 100mm; background: #ffffff; font-family: 'Inter', sans-serif; color: #000; padding: 5mm; box-sizing: border-box; display: flex; flex-direction: column; position: relative; overflow: hidden;">
            <div style="display: flex; justify-content: space-between; border-bottom: 0.8pt solid black; padding-bottom: 2mm; font-weight: 800; font-size: 9pt;">
                <span>SITUACIÓN Nº ${data.situacion || '1'}</span>
                <span style="color: #004ac6;">${(data.rol || '').toUpperCase()}</span>
            </div>
            <div class="content-box" style="flex: 1; margin-top: 4mm; overflow: hidden; position: relative;">
                <p style="font-size: 7pt; font-style: italic; color: #434655; margin-bottom: 2mm;">Lee atentamente la situación y acciona.</p>
                <div class="dynamic-text" style="font-size: ${fontSizeBase}pt; line-height: 1.3; word-wrap: break-word;">
                    ${(data.desarrollo || '').replace(/\n/g, '<br>')}
                </div>
            </div>
            <div style="border-top: 0.8pt solid black; padding-top: 2mm; text-align: center; font-weight: 900; font-size: 9pt; letter-spacing: 1px;">
                ${(data.tema || '').toUpperCase()}
            </div>
        </div>`;

    const box = target.querySelector('.content-box');
    const text = target.querySelector('.dynamic-text');
    let size = fontSizeBase;

    // Lógica de ajuste inteligente en pasos de 0.2pt
    if (text && box) {
        text.style.fontSize = `${size}pt`;
        // Mientras el texto sea más alto que el contenedor, reducimos 0.2pt
        while (text.scrollHeight > box.clientHeight && size > 4) {
            size -= 0.2;
            text.style.fontSize = `${size}pt`;
        }
    }
}

/**
 * 2. EXPORTACIÓN PDF (REPARADA)
 */
async function exportA4() {
    const ui = getContainers();
    
    // Validación de estado previa
    if (!selectedTema || currentGroupCards.length === 0) {
        alert("Error: No hay un grupo seleccionado. Haz clic en una tarjeta de 'Recent Cards'.");
        return;
    }

    if (!ui.back) {
        alert("Error: No se encuentra el diseño del Dorso en el HTML.");
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('l', 'mm', 'a4');
    const originalContent = ui.printBtn.innerHTML;
    
    ui.printBtn.innerHTML = 'GENERANDO...';
    ui.printBtn.disabled = true;

    try {
        // Captura del Dorso
        const canvasB = await html2canvas(ui.back, { scale: 2, useCORS: true });
        const imgB = canvasB.toDataURL('image/png');

        for (let i = 0; i < currentGroupCards.length; i++) {
            if (i > 0) doc.addPage('a4', 'l');

            const tempDiv = document.createElement('div');
            // IMPORTANTE: Debe estar en el DOM pero fuera de vista para que html2canvas lo mida bien
            Object.assign(tempDiv.style, { position: 'absolute', top: '-5000px', left: '-5000px' });
            document.body.appendChild(tempDiv);
            
            renderCardToElement(currentGroupCards[i], tempDiv);
            await new Promise(r => setTimeout(r, 150)); 

            const canvasF = await html2canvas(tempDiv.querySelector('.render-target'), { scale: 2 });
            const imgF = canvasF.toDataURL('image/png');

            const w = 80, h = 100, y = 55;
            const xF = 63.5, xB = 153.5;

            doc.addImage(imgF, 'PNG', xF, y, w, h);
            doc.addImage(imgB, 'PNG', xB, y, w, h);

            document.body.removeChild(tempDiv);
        }
        
        doc.save(`PlayRole_${selectedTema.replace(/\s+/g, '_')}.pdf`);
    } catch (err) {
        console.error("Detalle del error:", err);
        alert("Ocurrió un error técnico al generar el PDF. Revisa la consola (F12).");
    } finally {
        ui.printBtn.innerHTML = originalContent;
        ui.printBtn.disabled = false;
    }
}

/**
 * 3. GESTIÓN DE GRUPOS
 */
function renderRecentGroups() {
    const db = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    const ui = getContainers();
    if (!ui.carousel) return;
    ui.carousel.innerHTML = '';
    
    Object.keys(db).forEach(tema => {
        const isActive = (tema === selectedTema);
        const div = document.createElement('div');
        div.className = `flex-shrink-0 w-24 card-ratio bg-surface-container-highest rounded-md border p-2 flex flex-col items-center justify-between cursor-pointer transition-all ${isActive ? 'border-primary ring-2 ring-primary/30' : 'border-outline-variant/30 grayscale opacity-70'}`;
        
        div.innerHTML = `
            <span class="text-[8px] font-bold text-on-surface-variant truncate w-full text-center">${tema}</span>
            <div class="text-center">
                <p class="text-[9px] font-black text-primary">${db[tema].length} CARDS</p>
                <button onclick="event.stopPropagation(); deleteGroup('${tema}')" class="text-[8px] text-red-500 font-bold hover:underline mt-1">ELIMINAR</button>
            </div>
        `;
        div.onclick = () => selectGroup(tema);
        ui.carousel.appendChild(div);
    });
}

window.selectGroup = (tema) => {
    selectedTema = tema;
    const db = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    currentGroupCards = db[tema] || [];
    currentPreviewIndex = 0;
    renderRecentGroups();
    updateCarouselPreview();
};

window.deleteGroup = (tema) => {
    if(confirm(`¿Eliminar grupo "${tema}"?`)) {
        const db = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        delete db[tema];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
        if(selectedTema === tema) { selectedTema = null; currentGroupCards = []; }
        renderRecentGroups();
    }
};

function updateCarouselPreview() {
    const ui = getContainers();
    if (currentGroupCards.length > 0) {
        renderCardToElement(currentGroupCards[currentPreviewIndex], ui.front);
    }
}

/**
 * 4. NAVEGACIÓN Y EVENTOS
 */
document.addEventListener('DOMContentLoaded', () => {
    renderRecentGroups();
    
    const ui = getContainers();
    const fields = getInputs();

    // Flechas
    const prev = document.querySelector('button:has([data-icon="chevron_left"])');
    const next = document.querySelector('button:has([data-icon="chevron_right"])');

    if(prev) prev.onclick = () => { if (currentPreviewIndex > 0) { currentPreviewIndex--; updateCarouselPreview(); } };
    if(next) next.onclick = () => { if (currentPreviewIndex < currentGroupCards.length - 1) { currentPreviewIndex++; updateCarouselPreview(); } };

    // Botón Guardar
    const saveBtn = document.querySelector('button.bg-on-surface');
    if(saveBtn) saveBtn.onclick = (e) => {
        e.preventDefault();
        const db = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        const tema = fields.tema.value.trim() || "Sin Título";
        if (!db[tema]) db[tema] = [];
        db[tema].push({
            situacion: fields.situacion.value,
            rol: fields.rol.value,
            tema: tema,
            desarrollo: fields.desarrollo.value
        });
        localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
        selectGroup(tema);
    };

    if(ui.printBtn) ui.printBtn.onclick = exportA4;

    // Preview en vivo
    Object.values(fields).forEach(el => {
        if(el) el.addEventListener('input', () => {
            renderCardToElement({
                situacion: fields.situacion.value,
                rol: fields.rol.value,
                tema: fields.tema.value,
                desarrollo: fields.desarrollo.value
            }, ui.front);
        });
    });

    // Render inicial
    renderCardToElement({situacion:1, rol:'Facilitador', tema:'Tema', desarrollo:''}, ui.front);
});
