/**
 * PLAYROLE OS - BACKEND V5.9 (RESTORATION & PRINT FIX)
 */

const STORAGE_KEY = 'playrole_v5_db';
let currentDorsoBase64 = null;
let currentGroupCards = []; 
let currentPreviewIndex = 0;
let selectedTema = null;

// Selectores dinámicos basados en tu HTML
const inputs = {
    situacion: document.querySelector('input[type="number"]'),
    rol: document.querySelector('input[placeholder="Ej: Facilitador"]'),
    tema: document.querySelector('input[placeholder="Conflict Resolution"]'),
    desarrollo: document.querySelector('textarea')
};

const frontContainer = document.querySelector('.card-ratio.bg-white'); 
const backContainer = document.querySelectorAll('.card-ratio')[1]; // Segundo contenedor es el dorso
const carouselContainer = document.querySelector('.flex.gap-4.overflow-x-auto');
const printBtn = document.querySelector('button.signature-gradient.shadow-2xl');

/**
 * 1. MOTOR DE RENDERIZADO (FRENTE)
 */
function renderCardToElement(data, target) {
    if (!target) return;
    const fontSizeDefault = 9;

    const generateHTML = (size) => `
        <div class="render-target" style="width: 80mm; height: 100mm; position: relative; background: #ffffff; font-family: 'Inter', sans-serif; color: #000000; overflow: hidden; box-sizing: border-box; padding: 5mm;">
            <div style="display: flex; justify-content: space-between; border-bottom: 0.5pt solid black; align-items: center; padding-bottom: 2mm;">
                <span style="font-weight: 800; font-size: 9pt;">SITUACIÓN Nº ${data.situacion || '1'}</span>
                <span style="font-weight: 700; font-size: 9pt; color: #004ac6;">${(data.rol || '').toUpperCase()}</span>
            </div>
            <div class="content-box" style="margin-top: 5mm; height: 65mm; overflow: hidden; position: relative;">
                <p style="font-weight: 400; font-size: 7pt; margin-bottom: 2mm; font-style: italic; color: #434655;">
                    Lee atentamente la situación, sin comentarla en voz alta, imagina cómo representarla y acción.
                </p>
                <div class="dynamic-text" style="font-weight: 400; line-height: 1.25; font-size: ${size}pt; text-align: left; word-wrap: break-word;">
                    ${(data.desarrollo || '').replace(/\n/g, '<br>')}
                </div>
            </div>
            <div style="position: absolute; bottom: 5mm; left: 5mm; right: 5mm; border-top: 0.5pt solid black; padding-top: 2mm; text-align: center;">
                <span style="font-weight: 900; font-size: 9pt; letter-spacing: 1px;">${(data.tema || '').toUpperCase()}</span>
            </div>
        </div>`;

    target.innerHTML = generateHTML(fontSizeDefault);
    const box = target.querySelector('.content-box');
    const text = target.querySelector('.dynamic-text');
    let currentSize = fontSizeDefault;

    if (text && box) {
        while (text.scrollHeight > box.offsetHeight && currentSize > 4.5) {
            currentSize -= 0.5;
            text.style.fontSize = `${currentSize}pt`;
        }
    }
}

/**
 * 2. EXPORTACIÓN PDF
 */
async function exportA4() {
    if (!selectedTema || currentGroupCards.length === 0) {
        return alert("Selecciona un grupo haciendo clic en 'Recent Cards'.");
    }
    
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('l', 'mm', 'a4');
    const originalText = printBtn.innerHTML;
    printBtn.innerHTML = 'GENERANDO...';
    printBtn.disabled = true;

    try {
        // Captura del dorso (una sola vez para todo el PDF)
        const canvasB = await html2canvas(backContainer, { scale: 2, backgroundColor: '#ffffff' });
        const imgB = canvasB.toDataURL('image/png');

        for (let i = 0; i < currentGroupCards.length; i++) {
            if (i > 0) doc.addPage('a4', 'l');

            const tempWrapper = document.createElement('div');
            tempWrapper.style.position = 'absolute';
            tempWrapper.style.left = '-9999px';
            document.body.appendChild(tempWrapper);
            
            renderCardToElement(currentGroupCards[i], tempWrapper);
            await new Promise(r => setTimeout(r, 150));
            
            const canvasF = await html2canvas(tempWrapper.querySelector('.render-target'), { scale: 2 });
            const imgF = canvasF.toDataURL('image/png');

            const w = 80, h = 100, y = 55;
            const marginX = (297 - (w * 2 + 10)) / 2;
            const xFront = marginX, xBack = marginX + w + 10;

            doc.addImage(imgF, 'PNG', xFront, y, w, h);
            doc.addImage(imgB, 'PNG', xBack, y, w, h);

            document.body.removeChild(tempWrapper);
        }
        doc.save(`PlayRole_${selectedTema}.pdf`);
    } catch (e) {
        console.error(e);
        alert("Error crítico en impresión.");
    } finally {
        printBtn.innerHTML = originalText;
        printBtn.disabled = false;
    }
}

/**
 * 3. UI Y PERSISTENCIA
 */
function renderRecentGroups() {
    const db = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    carouselContainer.innerHTML = '';
    Object.keys(db).forEach(tema => {
        const div = document.createElement('div');
        const isActive = (tema === selectedTema);
        div.className = `flex-shrink-0 w-24 card-ratio bg-surface-container-highest rounded-md border p-2 flex flex-col items-center justify-between cursor-pointer transition-all ${isActive ? 'border-primary ring-1 ring-primary' : 'border-outline-variant/30 grayscale'}`;
        
        div.innerHTML = `
            <span class="text-[8px] font-bold text-on-surface-variant truncate w-full text-center">${tema}</span>
            <div class="text-center">
                <p class="text-[7px] font-bold text-primary">${db[tema].length} CARDS</p>
                <button onclick="event.stopPropagation(); deleteGroup('${tema}')" class="text-[7px] text-red-500 hover:underline font-black mt-1">ELIMINAR</button>
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
    if(confirm(`¿Borrar grupo "${tema}"?`)) {
        const db = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        delete db[tema];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
        if(selectedTema === tema) selectedTema = null;
        renderRecentGroups();
    }
};

function saveCard() {
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
    selectedTema = tema;
    renderRecentGroups();
    selectGroup(tema);
}

function updateCarouselPreview() {
    if (currentGroupCards.length === 0) return;
    renderCardToElement(currentGroupCards[currentPreviewIndex], frontContainer);
}

// Navegación de carrusel (Flechas)
document.querySelector('button:has([data-icon="chevron_right"])').onclick = () => {
    if(currentPreviewIndex < currentGroupCards.length - 1) {
        currentPreviewIndex++; updateCarouselPreview();
    }
};
document.querySelector('button:has([data-icon="chevron_left"])').onclick = () => {
    if(currentPreviewIndex > 0) {
        currentPreviewIndex--; updateCarouselPreview();
    }
};

// Listeners
document.querySelector('button.bg-on-surface').onclick = (e) => { e.preventDefault(); saveCard(); };
printBtn.onclick = exportA4;

Object.values(inputs).forEach(el => el && el.addEventListener('input', () => {
    renderCardToElement({
        situacion: inputs.situacion.value,
        rol: inputs.rol.value,
        tema: inputs.tema.value,
        desarrollo: inputs.desarrollo.value
    }, frontContainer);
}));

document.addEventListener('DOMContentLoaded', () => {
    renderRecentGroups();
    renderCardToElement({situacion:1, rol:'Facilitador', tema:'Tema', desarrollo:''}, frontContainer);
});
