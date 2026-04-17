/**
 * PLAYROLE OS - BACKEND V5.8 (FIXED)
 */

const STORAGE_KEY = 'playrole_v5_db';
let currentDorsoBase64 = null;
let currentGroupCards = []; 
let currentPreviewIndex = 0;
let selectedTema = null;

const inputs = {
    situacion: document.getElementById('input-situacion'),
    rol: document.getElementById('input-rol'),
    tema: document.getElementById('input-tema'),
    desarrollo: document.getElementById('input-desarrollo')
};

const frontContainer = document.getElementById('card-front');
const backContainer = document.getElementById('card-back');
const carouselContainer = document.getElementById('carousel-container');
const printBtn = document.getElementById('btn-export-pdf');

/**
 * 1. MOTOR DE RENDERIZADO
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
            <div class="content-box" style="margin-top: 5mm; height: 65mm; overflow: hidden;">
                <p style="font-weight: 400; font-size: 7pt; margin-bottom: 2mm; font-style: italic; color: #434655;">
                    Lee atentamente la situación y prepárate.
                </p>
                <div class="dynamic-text" style="font-weight: 400; line-height: 1.25; font-size: ${size}pt; text-align: left;">
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

    if (text) {
        while (text.scrollHeight > box.offsetHeight && currentSize > 5) {
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
        return alert("Por favor, crea o selecciona un grupo en 'Recent Cards' primero.");
    }
    
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('l', 'mm', 'a4');
    const originalText = printBtn.innerHTML;
    printBtn.innerHTML = 'GENERANDO...';
    printBtn.disabled = true;

    try {
        const canvasB = await html2canvas(backContainer, { scale: 2 });
        const imgB = canvasB.toDataURL('image/png');

        for (let i = 0; i < currentGroupCards.length; i++) {
            if (i > 0) doc.addPage('a4', 'l');

            const tempWrapper = document.createElement('div');
            tempWrapper.style.position = 'absolute';
            tempWrapper.style.left = '-9999px';
            document.body.appendChild(tempWrapper);
            
            renderCardToElement(currentGroupCards[i], tempWrapper);
            await new Promise(r => setTimeout(r, 100));
            
            const canvasF = await html2canvas(tempWrapper.firstChild, { scale: 2 });
            const imgF = canvasF.toDataURL('image/png');

            const w = 80, h = 100, y = 50;
            const xFront = 60, xBack = 150;

            doc.addImage(imgF, 'PNG', xFront, y, w, h);
            doc.addImage(imgB, 'PNG', xBack, y, w, h);

            document.body.removeChild(tempWrapper);
        }
        doc.save(`PlayRole_${selectedTema}.pdf`);
    } catch (e) {
        console.error(e);
        alert("Error al generar PDF.");
    } finally {
        printBtn.innerHTML = originalText;
        printBtn.disabled = false;
    }
}

/**
 * 3. GESTIÓN DE UI
 */
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

function renderRecentGroups() {
    const db = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    carouselContainer.innerHTML = '';
    Object.keys(db).forEach(tema => {
        const div = document.createElement('div');
        div.className = "flex-shrink-0 w-24 card-ratio bg-surface-container-highest rounded-md border p-2 cursor-pointer text-center";
        div.innerHTML = `<span class="text-[8px] font-bold">${tema}</span>`;
        div.onclick = () => selectGroup(tema);
        carouselContainer.appendChild(div);
    });
}

window.selectGroup = (tema) => {
    selectedTema = tema;
    const db = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    currentGroupCards = db[tema] || [];
    if(currentGroupCards.length > 0) renderCardToElement(currentGroupCards[0], frontContainer);
};

// Listeners
document.getElementById('btn-crear').onclick = saveCard;
printBtn.onclick = exportA4;

Object.values(inputs).forEach(el => {
    el.addEventListener('input', () => {
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
    renderCardToElement({situacion:1, rol:'ROL', tema:'TEMA', desarrollo:''}, frontContainer);
});
