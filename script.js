/**
 * PLAYROLE OS - BACKEND V5.8
 * Separación de archivos + Edición dinámica de Dorso
 */

const STORAGE_KEY = 'playrole_v5_db';
let currentDorsoBase64 = null;
let currentGroupCards = []; 
let currentPreviewIndex = 0;
let selectedTema = null;

// Referencias de elementos
const inputs = {
    situacion: document.querySelector('input[type="number"]'),
    rol: document.querySelector('input[placeholder="Ej: Facilitador"]'),
    tema: document.querySelector('input[placeholder="Conflict Resolution"]'),
    desarrollo: document.querySelector('textarea'),
    nombreDorso: document.querySelector('input[placeholder="Set Alpha 2024"]')
};

const frontPreview = document.querySelector('.card-ratio.bg-white .border-dashed');
const backPreview = document.querySelector('.card-ratio.border-black');
const dorsoTextPreview = document.getElementById('dorso-title-preview');
const dorsoImgPreview = document.getElementById('dorso-logo');
const carouselContainer = document.getElementById('recent-groups');
const printBtn = document.querySelector('button.signature-gradient');

/**
 * 1. MOTOR DE RENDERIZADO (FRENTE)
 */
function renderCardToElement(data, target) {
    if (!target) return;
    const fontSizeDefault = 9;

    const generateHTML = (size) => `
        <div class="render-target" style="width: 80mm; height: 100mm; position: relative; background: white; font-family: 'Inter', sans-serif; color: black; overflow: hidden; box-sizing: border-box;">
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
 * 2. EXPORTACIÓN PDF
 */
async function exportA4() {
    if (!selectedTema || currentGroupCards.length === 0) return alert("Selecciona un grupo primero.");
    
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('l', 'mm', 'a4');
    const originalText = printBtn.innerHTML;
    printBtn.innerHTML = 'GENERANDO...';

    try {
        const canvasB = await html2canvas(backPreview, { scale: 2 });
        const imgB = canvasB.toDataURL('image/png');

        for (let i = 0; i < currentGroupCards.length; i++) {
            if (i > 0) doc.addPage('a4', 'l');
            const temp = document.createElement('div');
            temp.style.position = 'absolute'; temp.style.left = '-9999px';
            document.body.appendChild(temp);
            renderCardToElement(currentGroupCards[i], temp);
            
            await new Promise(r => setTimeout(r, 150));
            const canvasF = await html2canvas(temp.firstChild, { scale: 2 });
            const imgF = canvasF.toDataURL('image/png');

            const w = 80, h = 100, y = 55;
            const xFront = (297 - (w * 2 + 10)) / 2;
            const xBack = xFront + w + 10;

            doc.addImage(imgF, 'PNG', xFront, y, w, h);
            doc.addImage(imgB, 'PNG', xBack, y, w, h);
            document.body.removeChild(temp);
        }
        doc.save(`PlayRole_${selectedTema}.pdf`);
    } catch (e) { alert("Error al generar PDF."); }
    finally { printBtn.innerHTML = originalText; }
}

/**
 * 3. LOGICA DE DATOS
 */
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
        imgDorso: currentDorsoBase64,
        textoDorso: inputs.nombreDorso.value
    });

    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    selectedTema = tema;
    renderRecentGroups();
    selectGroup(tema);
}

window.selectGroup = (tema) => {
    selectedTema = tema;
    const db = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    currentGroupCards = db[tema] || [];
    currentPreviewIndex = 0;
    renderRecentGroups();
    updateCarouselPreview();
};

function updateCarouselPreview() {
    if (currentGroupCards.length === 0) return;
    const card = currentGroupCards[currentPreviewIndex];
    renderCardToElement(card, frontPreview);
    
    if (dorsoTextPreview) dorsoTextPreview.innerText = (card.textoDorso || "PLAYROLE").toUpperCase();
    if (dorsoImgPreview) {
        if (card.imgDorso) {
            dorsoImgPreview.src = card.imgDorso;
            dorsoImgPreview.style.display = "block";
        } else {
            dorsoImgPreview.style.display = "none";
        }
    }
}

function renderRecentGroups() {
    const db = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    carouselContainer.innerHTML = '';
    Object.keys(db).forEach(tema => {
        const div = document.createElement('div');
        div.className = `group-item flex-shrink-0 w-32 p-3 bg-white border-2 rounded-lg cursor-pointer transition-all ${tema === selectedTema ? 'border-blue-600 shadow-md' : 'border-gray-200'}`;
        div.innerHTML = `<p class="text-[9px] font-black uppercase truncate">${tema}</p><p class="text-[8px] text-gray-400">${db[tema].length} Tarjetas</p>`;
        div.onclick = () => selectGroup(tema);
        carouselContainer.appendChild(div);
    });
}

// Listeners
inputs.nombreDorso.addEventListener('input', () => {
    dorsoTextPreview.innerText = inputs.nombreDorso.value.toUpperCase() || "PLAYROLE";
});

Object.values(inputs).forEach(el => el && el.addEventListener('input', () => {
    if(el !== inputs.nombreDorso) {
        renderCardToElement({
            situacion: inputs.situacion.value,
            rol: inputs.rol.value,
            tema: inputs.tema.value,
            desarrollo: inputs.desarrollo.value
        }, frontPreview);
    }
}));

const fileInput = document.createElement('input');
fileInput.type = 'file'; fileInput.onchange = (e) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
        currentDorsoBase64 = ev.target.result;
        dorsoImgPreview.src = currentDorsoBase64;
        dorsoImgPreview.style.display = "block";
    };
    reader.readAsDataURL(e.target.files[0]);
};

document.querySelector('button:has([data-icon="image"])').onclick = () => fileInput.click();
document.querySelector('button.bg-gray-900').onclick = saveCard;
printBtn.onclick = exportA4;

// Navegación
document.querySelector('button:has([data-icon="chevron_right"])').onclick = () => {
    if(currentPreviewIndex < currentGroupCards.length - 1) { currentPreviewIndex++; updateCarouselPreview(); }
};
document.querySelector('button:has([data-icon="chevron_left"])').onclick = () => {
    if(currentPreviewIndex > 0) { currentPreviewIndex--; updateCarouselPreview(); }
};

document.addEventListener('DOMContentLoaded', renderRecentGroups);
