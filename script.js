/**
 * PLAYROLE OS - BACKEND V6.5
 * - Renderizado Vectorial (Texto real en PDF)
 * - Ajuste de tipografía inteligente (pasos de 0.2pt)
 * - Limpieza de lógica de gradientes
 */

const STORAGE_KEY = 'playrole_v5_db';
let currentGroupCards = []; 
let currentPreviewIndex = 0;
let selectedTema = null;

// Selectores de interfaz
const getFields = () => ({
    situacion: document.querySelector('input[type="number"]'),
    rol: document.querySelector('input[placeholder*="Facilitador"]'),
    tema: document.querySelector('input[placeholder*="Resolution"]'),
    desarrollo: document.querySelector('textarea')
});

const getUI = () => ({
    front: document.querySelector('.card-ratio.bg-white'),
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

    // Estructura limpia sin gradientes
    target.innerHTML = `
        <div class="render-target" style="width: 80mm; height: 100mm; background: #ffffff; font-family: 'Inter', sans-serif; color: #000; padding: 6mm; box-sizing: border-box; display: flex; flex-direction: column; border: 0.1pt solid #eee;">
            <div style="display: flex; justify-content: space-between; border-bottom: 0.8pt solid black; padding-bottom: 2mm; font-weight: 800; font-size: 9pt;">
                <span>SITUACIÓN Nº ${data.situacion || '1'}</span>
                <span style="color: #004ac6;">${(data.rol || '').toUpperCase()}</span>
            </div>
            <div class="content-box" style="flex: 1; margin-top: 5mm; overflow: hidden; position: relative;">
                <p style="font-size: 7pt; font-style: italic; color: #434655; margin-bottom: 2mm;">Lee atentamente la situación y acciona.</p>
                <div class="dynamic-text" style="font-size: ${fontSizeBase}pt; line-height: 1.3; word-wrap: break-word; white-space: pre-wrap;">${data.desarrollo || ''}</div>
            </div>
            <div style="border-top: 0.8pt solid black; padding-top: 2mm; text-align: center; font-weight: 900; font-size: 9pt; letter-spacing: 1px;">
                ${(data.tema || '').toUpperCase()}
            </div>
        </div>`;

    const box = target.querySelector('.content-box');
    const text = target.querySelector('.dynamic-text');
    let size = fontSizeBase;

    if (text && box) {
        // Reducción inteligente en pasos de 0.2pt
        while (text.scrollHeight > box.clientHeight && size > 4) {
            size -= 0.2;
            text.style.fontSize = `${size.toFixed(1)}pt`;
        }
    }
}

/**
 * 2. EXPORTACIÓN VECTORIAL
 */
async function exportA4() {
    const ui = getUI();
    if (!selectedTema || currentGroupCards.length === 0) {
        return alert("Selecciona un grupo en 'Recent Cards' primero.");
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
        orientation: 'l',
        unit: 'mm',
        format: 'a4'
    });

    const btnLabel = ui.printBtn.innerHTML;
    ui.printBtn.innerHTML = 'GENERANDO PDF...';
    ui.printBtn.disabled = true;

    try {
        for (let i = 0; i < currentGroupCards.length; i++) {
            if (i > 0) doc.addPage('a4', 'l');

            // Contenedor temporal para renderizar el frente
            const tempF = document.createElement('div');
            Object.assign(tempF.style, { position: 'absolute', top: '-10000px', width: '80mm' });
            document.body.appendChild(tempF);
            renderCardToElement(currentGroupCards[i], tempF);

            // Clonamos el dorso actual de tu UI
            const tempB = ui.back.cloneNode(true);
            Object.assign(tempB.style, { position: 'absolute', top: '-10000px', left: '-5000px', width: '80mm', height: '100mm' });
            document.body.appendChild(tempB);

            // Renderizado de objetos al PDF (Frente)
            await doc.html(tempF, {
                x: 63.5,
                y: 55,
                width: 80,
                windowWidth: 302 // Ajuste de escala para 80mm
            });

            // Renderizado de objetos al PDF (Dorso)
            await doc.html(tempB, {
                x: 153.5,
                y: 55,
                width: 80,
                windowWidth: 302
            });

            document.body.removeChild(tempF);
            document.body.removeChild(tempB);
        }

        doc.save(`PlayRole_${selectedTema}.pdf`);
    } catch (err) {
        console.error("Error en exportación:", err);
        alert("Error al generar el PDF vectorial.");
    } finally {
        ui.printBtn.innerHTML = btnLabel;
        ui.printBtn.disabled = false;
    }
}

/**
 * 3. LÓGICA DE GRUPOS Y UI
 */
function renderRecentGroups() {
    const db = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    const ui = getUI();
    if (!ui.carousel) return;
    ui.carousel.innerHTML = '';
    
    Object.keys(db).forEach(tema => {
        const isActive = (tema === selectedTema);
        const div = document.createElement('div');
        div.className = `flex-shrink-0 w-24 card-ratio bg-white rounded-md border p-2 flex flex-col items-center justify-between cursor-pointer transition-all ${isActive ? 'border-primary ring-2 ring-primary/20' : 'border-slate-200 opacity-60'}`;
        
        div.innerHTML = `
            <span class="text-[8px] font-bold truncate w-full text-center">${tema}</span>
            <div class="text-center">
                <p class="text-[10px] font-black text-primary">${db[tema].length} CARDS</p>
                <button onclick="event.stopPropagation(); deleteGroup('${tema}')" class="text-[8px] text-red-500 font-bold hover:underline">BORRAR</button>
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
    updatePreview();
};

window.deleteGroup = (tema) => {
    if(confirm(`¿Borrar grupo "${tema}"?`)) {
        const db = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        delete db[tema];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
        if(selectedTema === tema) { selectedTema = null; currentGroupCards = []; }
        renderRecentGroups();
    }
};

function updatePreview() {
    const ui = getUI();
    if (currentGroupCards.length > 0) {
        renderCardToElement(currentGroupCards[currentPreviewIndex], ui.front);
    }
}

/**
 * 4. LISTENERS
 */
document.addEventListener('DOMContentLoaded', () => {
    renderRecentGroups();
    const ui = getUI();
    const fields = getFields();

    // Navegación
    const prev = document.querySelector('button:has([data-icon="chevron_left"])');
    const next = document.querySelector('button:has([data-icon="chevron_right"])');

    if(prev) prev.onclick = () => { if(currentPreviewIndex > 0) { currentPreviewIndex--; updatePreview(); } };
    if(next) next.onclick = () => { if(currentPreviewIndex < currentGroupCards.length - 1) { currentPreviewIndex++; updatePreview(); } };

    // Guardar tarjeta
    const saveBtn = document.querySelector('button.bg-on-surface');
    if(saveBtn) saveBtn.onclick = (e) => {
        e.preventDefault();
        const db = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        const t = fields.tema.value.trim() || "Sin Título";
        if (!db[t]) db[t] = [];
        db[t].push({
            situacion: fields.situacion.value,
            rol: fields.rol.value,
            tema: t,
            desarrollo: fields.desarrollo.value
        });
        localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
        selectGroup(t);
    };

    if(ui.printBtn) ui.printBtn.onclick = exportA4;

    // Live Preview
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

    renderCardToElement({situacion:1, rol:'Facilitador', tema:'Tema', desarrollo:''}, ui.front);
});
