/**
 * PLAYROLE OS - BACKEND V6.1 (STABLE SEPARATE SCRIPT)
 */

const STORAGE_KEY = 'playrole_v5_db';
let currentGroupCards = []; 
let currentPreviewIndex = 0;
let selectedTema = null;

// Selectores basados en tu HTML original
const inputs = {
    situacion: document.querySelector('input[type="number"]'),
    rol: document.querySelector('input[placeholder="Ej: Facilitador"]'),
    tema: document.querySelector('input[placeholder="Conflict Resolution"]'),
    desarrollo: document.querySelector('textarea')
};

// Contenedores de Preview (Frente es el 1º, Dorso es el 2º)
const frontContainer = document.querySelector('.lg\\:col-span-7 .grid > div:first-child .card-ratio') || document.querySelector('.card-ratio.bg-white');
const backContainer = document.querySelectorAll('.card-ratio')[1]; 
const carouselContainer = document.querySelector('.flex.gap-4.overflow-x-auto');
const printBtn = document.querySelector('button.signature-gradient.shadow-2xl');

/**
 * 1. MOTOR DE RENDERIZADO
 * Genera el HTML exacto para la tarjeta física 80x100mm
 */
function renderCardToElement(data, target) {
    if (!target) return;
    const fontSizeDefault = 9;

    target.innerHTML = `
        <div class="render-target" style="width: 80mm; height: 100mm; background: #ffffff; font-family: 'Inter', sans-serif; color: #000; padding: 5mm; box-sizing: border-box; display: flex; flex-direction: column; position: relative;">
            <div style="display: flex; justify-content: space-between; border-bottom: 0.5pt solid black; padding-bottom: 2mm; font-weight: 800; font-size: 9pt;">
                <span>SITUACIÓN Nº ${data.situacion || '1'}</span>
                <span style="color: #004ac6;">${(data.rol || '').toUpperCase()}</span>
            </div>
            <div class="content-box" style="flex: 1; margin-top: 5mm; overflow: hidden; position: relative;">
                <p style="font-size: 7pt; font-style: italic; color: #434655; margin-bottom: 2mm;">Lee atentamente la situación y acciona.</p>
                <div class="dynamic-text" style="font-size: ${fontSizeDefault}pt; line-height: 1.3;">
                    ${(data.desarrollo || '').replace(/\n/g, '<br>')}
                </div>
            </div>
            <div style="border-top: 0.5pt solid black; padding-top: 2mm; text-align: center; font-weight: 900; font-size: 9pt; letter-spacing: 1px;">
                ${(data.tema || '').toUpperCase()}
            </div>
        </div>`;

    const box = target.querySelector('.content-box');
    const text = target.querySelector('.dynamic-text');
    let size = fontSizeDefault;

    if (text && box) {
        while (text.scrollHeight > box.offsetHeight && size > 4.5) {
            size -= 0.5;
            text.style.fontSize = `${size}pt`;
        }
    }
}

/**
 * 2. EXPORTACIÓN PDF (REPARADA)
 */
async function exportA4() {
    if (!selectedTema || currentGroupCards.length === 0) {
        return alert("Selecciona un grupo en 'Recent Cards' antes de imprimir.");
    }
    
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('l', 'mm', 'a4');
    const originalContent = printBtn.innerHTML;
    
    printBtn.innerHTML = '<span class="material-symbols-outlined animate-spin">sync</span> GENERANDO...';
    printBtn.disabled = true;

    try {
        // Capturamos el Dorso una sola vez del diseño del usuario
        const canvasB = await html2canvas(backContainer, { scale: 2, useCORS: true });
        const imgB = canvasB.toDataURL('image/png');

        for (let i = 0; i < currentGroupCards.length; i++) {
            if (i > 0) doc.addPage('a4', 'l');

            // Crear render temporal para la captura
            const tempDiv = document.createElement('div');
            Object.assign(tempDiv.style, { position: 'fixed', top: '0', left: '-2000px' });
            document.body.appendChild(tempDiv);
            
            renderCardToElement(currentGroupCards[i], tempDiv);
            await new Promise(r => setTimeout(r, 200)); // Delay para estabilidad

            const canvasF = await html2canvas(tempDiv.querySelector('.render-target'), { scale: 2 });
            const imgF = canvasF.toDataURL('image/png');

            // Posicionamiento centrado en A4
            const w = 80, h = 100, y = 55;
            const xF = 63.5, xB = 153.5;

            doc.addImage(imgF, 'PNG', xF, y, w, h);
            doc.addImage(imgB, 'PNG', xB, y, w, h);

            document.body.removeChild(tempDiv);
        }
        
        doc.save(`PlayRole_${selectedTema.replace(/\s+/g, '_')}.pdf`);
    } catch (err) {
        console.error("Error PDF:", err);
        alert("Error crítico en impresión. Asegúrate de haber seleccionado un grupo.");
    } finally {
        printBtn.innerHTML = originalContent;
        printBtn.disabled = false;
    }
}

/**
 * 3. GESTIÓN DE UI (Recuperando contador y delete)
 */
function renderRecentGroups() {
    const db = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    if (!carouselContainer) return;
    carouselContainer.innerHTML = '';
    
    Object.keys(db).forEach(tema => {
        const isActive = (tema === selectedTema);
        const cardCount = db[tema].length;
        
        const div = document.createElement('div');
        div.className = `flex-shrink-0 w-24 card-ratio bg-surface-container-highest rounded-md border p-2 flex flex-col items-center justify-between cursor-pointer transition-all ${isActive ? 'border-primary ring-1 ring-primary' : 'border-outline-variant/30 grayscale'}`;
        
        div.innerHTML = `
            <span class="text-[8px] font-bold text-on-surface-variant truncate w-full text-center">${tema}</span>
            <div class="text-center">
                <p class="text-[9px] font-black text-primary">${cardCount} CARDS</p>
                <button onclick="event.stopPropagation(); deleteGroup('${tema}')" class="text-[8px] text-red-500 font-bold hover:underline mt-1">ELIMINAR</button>
            </div>
        `;
        div.onclick = () => selectGroup(tema);
        carouselContainer.appendChild(div);
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
    if(confirm(`¿Eliminar el grupo "${tema}"?`)) {
        const db = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        delete db[tema];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
        if(selectedTema === tema) selectedTema = null;
        renderRecentGroups();
    }
};

function updateCarouselPreview() {
    if (currentGroupCards.length > 0) {
        renderCardToElement(currentGroupCards[currentPreviewIndex], frontContainer);
    }
}

/**
 * 4. EVENTOS Y NAVEGACIÓN
 */

// Navegación con chevrons (Flechas del preview)
const prevBtn = document.querySelector('button:has([data-icon="chevron_left"])');
const nextBtn = document.querySelector('button:has([data-icon="chevron_right"])');

if(prevBtn) prevBtn.onclick = () => {
    if (currentPreviewIndex > 0) {
        currentPreviewIndex--;
        updateCarouselPreview();
    }
};

if(nextBtn) nextBtn.onclick = () => {
    if (currentPreviewIndex < currentGroupCards.length - 1) {
        currentPreviewIndex++;
        updateCarouselPreview();
    }
};

// Guardado
const saveBtn = document.querySelector('button.bg-on-surface');
if(saveBtn) saveBtn.onclick = (e) => {
    e.preventDefault();
    const db = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    const tema = inputs.tema.value.trim() || "Sin Título";
    
    if (!db[tema]) db[tema] = [];
    db[tema].push({
        situacion: inputs.situacion.value,
        rol: inputs.rol.value,
        tema: tema,
        desarrollo: inputs.desarrollo.value
    });

    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    selectGroup(tema);
};

if(printBtn) printBtn.onclick = exportA4;

// Escucha de inputs para preview en tiempo real
Object.values(inputs).forEach(el => {
    if(el) el.addEventListener('input', () => {
        renderCardToElement({
            situacion: inputs.situacion.value,
            rol: inputs.rol.value,
            tema: inputs.tema.value,
            desarrollo: inputs.desarrollo.value
        }, frontContainer);
    });
});

document.addEventListener('DOMContentLoaded', () => {
    renderRecentGroups();
    renderCardToElement({situacion:1, rol:'Facilitador', tema:'Tema', desarrollo:''}, frontContainer);
});
