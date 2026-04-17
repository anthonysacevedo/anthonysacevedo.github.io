/**
 * PLAYROLE OS - BACKEND V5.7 (PDF ENGINE REBUILT)
 * - Eliminación de errores de captura de Canvas.
 * - Dorso limpio (Blanco/Texto) sin dependencias externas.
 * - Auto-ajuste de texto 0.5pt.
 */

const STORAGE_KEY = 'playrole_v5_db';
let currentDorsoBase64 = null;
let currentGroupCards = []; 
let currentPreviewIndex = 0;
let selectedTema = null;

const inputs = {
    situacion: document.querySelector('input[type="number"]'),
    rol: document.querySelector('input[placeholder="Ej: Facilitador"]'),
    tema: document.querySelector('input[placeholder="Conflict Resolution"]'),
    desarrollo: document.querySelector('textarea'),
    nombreDorso: document.querySelector('input[placeholder="Set Alpha 2024"]')
};

const frontContainer = document.querySelector('.card-ratio.bg-white');
const backContainer = document.querySelector('.card-ratio.bg-primary');
const carouselContainer = document.querySelector('.flex.gap-4.overflow-x-auto');
const printBtn = document.querySelector('button.signature-gradient.shadow-2xl');

if(printBtn) printBtn.innerHTML = '<span class="material-symbols-outlined">print</span> IMPRIMIR GRUPO';

/**
 * 1. MOTOR DE RENDERIZADO (FRENTE)
 */
function renderCardToElement(data, targetId) {
    const fontSizeDefault = 9;
    const target = (typeof targetId === 'string') ? document.querySelector(targetId) : targetId;
    if (!target) return;

    const generateHTML = (size) => `
        <div class="render-target" style="width: 80mm; height: 100mm; position: relative; background: #ffffff; font-family: 'Inter', sans-serif; color: #000000; overflow: hidden; box-sizing: border-box;">
            <div style="position: absolute; top: 3mm; left: 5mm; right: 5mm; height: 8mm; display: flex; justify-content: space-between; border-bottom: 0.5pt solid black; align-items: center;">
                <span style="font-weight: 800; font-size: 9pt;">SITUACIÓN Nº ${data.situacion || '1'}</span>
                <span style="font-weight: 700; font-size: 9pt; color: #004ac6;">${(data.rol || '').toUpperCase()}</span>
            </div>
            <div class="content-box" style="position: absolute; top: 14mm; left: 5mm; right: 5mm; bottom: 14mm; overflow: hidden;">
                <p style="font-weight: 400; font-size: 7pt; margin-bottom: 2mm; font-style: italic; color: #434655;">
                    Lee atentamente la situación, sin comentarla en voz alta, imagina cómo representarla y acción.
                </p>
                <div class="dynamic-text" style="font-weight: 400; line-height: 1.25; font-size: ${size}pt; text-align: left; word-wrap: break-word;">
                    ${(data.desarrollo || '').replace(/\n/g, '<br>')}
                </div>
            </div>
            <div style="position: absolute; bottom: 3mm; left: 5mm; right: 5mm; height: 8mm; border-top: 0.5pt solid black; display: flex; align-items: center; justify-content: center;">
                <span style="font-weight: 900; font-size: 9pt; letter-spacing: 1px;">${(data.tema || '').toUpperCase()}</span>
            </div>
        </div>`;

    target.innerHTML = generateHTML(fontSizeDefault);
    let currentSize = fontSizeDefault;
    const box = target.querySelector('.content-box');
    const text = target.querySelector('.dynamic-text');

    while (text.scrollHeight > (box.offsetHeight - 2) && currentSize > 4.5) {
        currentSize -= 0.5;
        text.style.fontSize = `${currentSize}pt`;
    }
}

/**
 * 2. EXPORTACIÓN PDF (REDISEÑADA PARA ESTABILIDAD)
 */
async function exportA4() {
    if (!selectedTema || currentGroupCards.length === 0) {
        return alert("Selecciona un grupo haciendo clic en él en 'Recent Cards'.");
    }
    
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('l', 'mm', 'a4');
    const originalText = printBtn.innerHTML;
    printBtn.innerHTML = '<span class="material-symbols-outlined animate-spin">sync</span> GENERANDO...';
    printBtn.disabled = true;

    try {
        // Capturamos el dorso una sola vez con parámetros de máxima compatibilidad
        const canvasB = await html2canvas(backContainer, { 
            scale: 2,
            useCORS: false, // Desactivado para evitar errores de protocolo
            logging: false,
            backgroundColor: null
        });
        const imgB = canvasB.toDataURL('image/png');

        for (let i = 0; i < currentGroupCards.length; i++) {
            if (i > 0) doc.addPage('a4', 'l');

            // Crear contenedor temporal limpio para el frente
            const tempWrapper = document.createElement('div');
            tempWrapper.style.position = 'absolute';
            tempWrapper.style.left = '-9999px';
            document.body.appendChild(tempWrapper);
            
            renderCardToElement(currentGroupCards[i], tempWrapper);
            
            // Esperar a que el DOM procese el HTML
            await new Promise(r => setTimeout(r, 200));
            
            const targetElement = tempWrapper.querySelector('.render-target');
            const canvasF = await html2canvas(targetElement, { 
                scale: 2,
                logging: false,
                backgroundColor: '#ffffff'
            });
            const imgF = canvasF.toDataURL('image/png');

            const w = 80, h = 100, y = 55;
            const marginX = (297 - (w * 2 + 10)) / 2;
            const xFront = marginX, xBack = marginX + w + 10;

            doc.addImage(imgF, 'PNG', xFront, y, w, h);
            doc.addImage(imgB, 'PNG', xBack, y, w, h);

            // Marcas de corte
            doc.setDrawColor(200);
            [xFront, xFront+w, xBack, xBack+w].forEach(x => {
                doc.line(x, y-5, x, y-1); doc.line(x, y+h+1, x, y+h+5);
            });

            document.body.removeChild(tempWrapper);
        }
        doc.save(`PlayRole_${selectedTema.replace(/\s+/g, '_')}.pdf`);
    } catch (e) {
        console.error("PDF Error:", e);
        alert("Error crítico al generar el PDF. Intenta crear el grupo de nuevo sin imágenes externas.");
    } finally {
        printBtn.innerHTML = originalText;
        printBtn.disabled = false;
    }
}

/**
 * 3. GESTIÓN DE UI Y PERSISTENCIA
 */
function renderRecentGroups() {
    const db = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    carouselContainer.innerHTML = '';
    Object.keys(db).forEach(tema => {
        const div = document.createElement('div');
        div.setAttribute('data-tema', tema);
        const isActive = (tema === selectedTema);
        div.className = `group-item flex-shrink-0 w-32 p-3 bg-white border-2 rounded-lg cursor-pointer transition-all ${isActive ? 'border-primary shadow-md' : 'border-outline-variant'}`;
        div.innerHTML = `
            <p class="text-[9px] font-black uppercase truncate ${isActive ? 'text-primary' : 'text-on-surface'}">${tema}</p>
            <p class="text-[8px] text-gray-400">${db[tema].length} Tarjetas</p>
            <button onclick="event.stopPropagation(); deleteGroup('${tema}')" class="text-[7px] text-red-500 mt-2 font-bold uppercase hover:underline">Eliminar</button>
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

function saveCard() {
    const db = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    const tema = inputs.tema.value.trim() || "Sin Título";
    if (!db[tema]) db[tema] = [];
    
    db[tema].push({
        id: Date.now(),
        situacion: inputs.situacion.value,
        rol: inputs.rol.value,
        tema: tema,
        desarrollo: inputs.desarrollo.value,
        imgDorso: currentDorsoBase64
    });

    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    selectedTema = tema;
    renderRecentGroups();
    selectGroup(tema);
}

window.deleteGroup = (tema) => {
    if(confirm(`¿Deseas borrar todo el grupo "${tema}"?`)) {
        const db = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        delete db[tema];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
        if(selectedTema === tema) selectedTema = null;
        renderRecentGroups();
    }
};

function updateCarouselPreview() {
    if (currentGroupCards.length === 0) return;
    const card = currentGroupCards[currentPreviewIndex];
    renderCardToElement(card, '.card-ratio.bg-white');
    
    const dorsoImg = document.querySelector('.card-ratio.bg-primary img');
    if (dorsoImg) {
        if (card.imgDorso) {
            dorsoImg.src = card.imgDorso;
            dorsoImg.style.display = "block";
        } else {
            dorsoImg.src = "";
            dorsoImg.style.display = "none";
        }
    }
}

// Navegación
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

// Carga de Imagen Local
const fileInput = document.createElement('input');
fileInput.type = 'file'; fileInput.accept = 'image/*';
fileInput.onchange = (e) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
        currentDorsoBase64 = ev.target.result;
        const imgPreview = document.querySelector('.card-ratio.bg-primary img');
        if(imgPreview) {
            imgPreview.src = currentDorsoBase64;
            imgPreview.style.display = "block";
        }
    };
    reader.readAsDataURL(e.target.files[0]);
};

document.querySelector('button:has([data-icon="image"])').onclick = () => fileInput.click();
document.querySelector('button.bg-on-surface').onclick = (e) => { e.preventDefault(); saveCard(); };
if(printBtn) printBtn.onclick = exportA4;

Object.values(inputs).forEach(el => el && el.addEventListener('input', () => {
    renderCardToElement({
        situacion: inputs.situacion.value,
        rol: inputs.rol.value,
        tema: inputs.tema.value,
        desarrollo: inputs.desarrollo.value
    }, '.card-ratio.bg-white');
}));

document.addEventListener('DOMContentLoaded', () => {
    renderRecentGroups();
    const dImg = document.querySelector('.card-ratio.bg-primary img');
    if(dImg) { dImg.src = ""; dImg.style.display = "none"; }
    renderCardToElement({situacion:1, rol:'Facilitador', tema:'Tema', desarrollo:''}, '.card-ratio.bg-white');
});
