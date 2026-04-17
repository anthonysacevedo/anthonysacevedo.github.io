/**
 * PLAYROLE OS - BACKEND V5.7 (FIXED)
 * Ajustado para respetar estrictamente el HTML original del usuario.
 */

const STORAGE_KEY = 'playrole_v5_db';
let currentDorsoBase64 = null;
let currentGroupCards = []; 
let currentPreviewIndex = 0;
let selectedTema = null;

// Selectores basados estrictamente en tu HTML
const inputs = {
    situacion: document.querySelector('input[type="number"]'),
    rol: document.querySelector('input[placeholder="Ej: Facilitador"]'),
    tema: document.querySelector('input[placeholder="Conflict Resolution"]'),
    desarrollo: document.querySelector('textarea'),
    nombreDorso: document.querySelector('input[placeholder="Set Alpha 2024"]')
};

// Identificamos los contenedores por su posición y clases originales
const frontContainer = document.querySelector('.card-ratio.bg-white'); 
// El dorso en tu HTML no tiene .bg-primary, usamos el segundo .card-ratio
const backContainer = document.querySelectorAll('.card-ratio')[1];
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
 * 2. EXPORTACIÓN PDF
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
        // Captura del dorso
        const canvasB = await html2canvas(backContainer, { 
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff'
        });
        const imgB = canvasB.toDataURL('image/png');

        for (let i = 0; i < currentGroupCards.length; i++) {
            if (i > 0) doc.addPage('a4', 'l');

            const tempWrapper = document.createElement('div');
            tempWrapper.style.position = 'absolute';
            tempWrapper.style.left = '-9999px';
            document.body.appendChild(tempWrapper);
            
            renderCardToElement(currentGroupCards[i], tempWrapper);
            await new Promise(r => setTimeout(r, 250)); // Tiempo para procesar el render
            
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

            document.body.removeChild(tempWrapper);
        }
        doc.save(`PlayRole_${selectedTema.replace(/\s+/g, '_')}.pdf`);
    } catch (e) {
        console.error("PDF Error:", e);
        alert("Error al generar el PDF.");
    } finally {
        printBtn.innerHTML = originalText;
        printBtn.disabled = false;
    }
}

/**
 * 3. GESTIÓN DE UI
 */
function renderRecentGroups() {
    const db = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    carouselContainer.innerHTML = '';
    Object.keys(db).forEach(tema => {
        const div = document.createElement('div');
        const isActive = (tema === selectedTema);
        div.className = `flex-shrink-0 w-24 card-ratio bg-surface-container-highest rounded-md border border-outline-variant/30 flex flex-col items-center justify-center cursor-pointer ${isActive ? 'ring-2 ring-primary' : ''}`;
        div.innerHTML = `<span class="text-[8px] font-bold text-on-surface-variant truncate w-full px-1 text-center">${tema}</span>`;
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
        desarrollo: inputs.desarrollo.value
    });

    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    selectedTema = tema;
    renderRecentGroups();
    selectGroup(tema);
}

function updateCarouselPreview() {
    if (currentGroupCards.length === 0) return;
    const card = currentGroupCards[currentPreviewIndex];
    renderCardToElement(card, frontContainer);
}

// Event Listeners con tu estructura original
document.querySelector('button.bg-on-surface').onclick = (e) => { e.preventDefault(); saveCard(); };
if(printBtn) printBtn.onclick = exportA4;

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
