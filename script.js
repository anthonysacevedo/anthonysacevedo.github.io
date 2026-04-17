/**
 * PLAYROLE OS - SCRIPT ENGINE V6.0
 * - Diseño de dorso dinámico (Blanco + Borde Negro).
 * - Exportación PDF optimizada sin dependencia de imágenes externas.
 * - Edición de texto en tiempo real.
 */

const STORAGE_KEY = 'playrole_v5_db';
let currentDorsoBase64 = null;
let currentGroupCards = []; 
let currentPreviewIndex = 0;
let selectedTema = null;

// Elementos del DOM (Asegurando coincidencia con IDs del HTML)
const el = {
    situacion: document.getElementById('input-situacion'),
    rol: document.getElementById('input-rol'),
    tema: document.getElementById('input-tema'),
    desarrollo: document.getElementById('input-desarrollo'),
    nombreDorso: document.getElementById('input-nombre-dorso'),
    frontPreview: document.querySelector('#card-front .border-dashed'),
    backPreview: document.getElementById('card-back'),
    dorsoText: document.getElementById('dorso-text-preview'),
    dorsoImg: document.getElementById('dorso-logo-preview'),
    carousel: document.getElementById('carousel-grupos'),
    btnPrint: document.getElementById('btn-print'),
    btnSave: document.getElementById('btn-save'),
    btnUpload: document.getElementById('btn-upload-img'),
    btnNext: document.getElementById('btn-next'),
    btnPrev: document.getElementById('btn-prev')
};

/**
 * 1. MOTOR DE RENDERIZADO (TARJETA FRONTAL)
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

    // Ajuste dinámico de texto para que no desborde
    while (text.scrollHeight > (box.offsetHeight - 2) && currentSize > 4.5) {
        currentSize -= 0.5;
        text.style.fontSize = `${currentSize}pt`;
    }
}

/**
 * 2. LÓGICA DE PERSISTENCIA Y DATOS
 */
function saveCard() {
    const db = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    const tema = el.tema.value.trim() || "Sin Título";
    if (!db[tema]) db[tema] = [];
    
    db[tema].push({
        id: Date.now(),
        situacion: el.situacion.value,
        rol: el.rol.value,
        tema: tema,
        desarrollo: el.desarrollo.value,
        imgDorso: currentDorsoBase64,
        textoDorso: el.nombreDorso.value
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
    
    // Frente
    renderCardToElement(card, el.frontPreview);
    
    // Dorso
    el.dorsoText.innerText = (card.textoDorso || "PLAYROLE").toUpperCase();
    if (card.imgDorso) {
        el.dorsoImg.src = card.imgDorso;
        el.dorsoImg.style.display = "block";
    } else {
        el.dorsoImg.style.display = "none";
    }
}

function renderRecentGroups() {
    const db = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    if(!el.carousel) return;
    el.carousel.innerHTML = '';
    Object.keys(db).forEach(tema => {
        const div = document.createElement('div');
        const active = (tema === selectedTema);
        div.className = `flex-shrink-0 w-32 p-3 bg-white border-2 rounded-lg cursor-pointer transition-all ${active ? 'border-blue-600 shadow-md' : 'border-gray-200'}`;
        div.innerHTML = `
            <p class="text-[9px] font-black uppercase truncate ${active ? 'text-blue-600' : 'text-gray-700'}">${tema}</p>
            <p class="text-[8px] text-gray-400">${db[tema].length} Tarjetas</p>
        `;
        div.onclick = () => selectGroup(tema);
        el.carousel.appendChild(div);
    });
}

/**
 * 3. EXPORTACIÓN PDF (BLINDADA)
 */
async function exportA4() {
    if (!selectedTema || currentGroupCards.length === 0) return alert("Selecciona un grupo para imprimir.");
    
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('l', 'mm', 'a4');
    const originalText = el.btnPrint.innerHTML;
    
    el.btnPrint.innerHTML = '<span class="material-symbols-outlined animate-spin">sync</span> GENERANDO...';
    el.btnPrint.disabled = true;

    try {
        // Capturar el dorso una vez (Borde negro, fondo blanco)
        const canvasB = await html2canvas(el.backPreview, { 
            scale: 2, 
            backgroundColor: "#ffffff",
            useCORS: false,
            logging: false 
        });
        const imgB = canvasB.toDataURL('image/png');

        for (let i = 0; i < currentGroupCards.length; i++) {
            if (i > 0) doc.addPage('a4', 'l');

            const temp = document.createElement('div');
            temp.style.position = 'fixed'; temp.style.left = '-9999px';
            document.body.appendChild(temp);
            
            renderCardToElement(currentGroupCards[i], temp);
            await new Promise(r => setTimeout(r, 150));
            
            const canvasF = await html2canvas(temp.firstChild, { scale: 2, backgroundColor: "#ffffff" });
            const imgF = canvasF.toDataURL('image/png');

            const w = 80, h = 100, y = 55;
            const xFront = (297 - (w * 2 + 10)) / 2;
            const xBack = xFront + w + 10;

            doc.addImage(imgF, 'PNG', xFront, y, w, h);
            doc.addImage(imgB, 'PNG', xBack, y, w, h);

            // Marcas de corte discretas
            doc.setDrawColor(220);
            [xFront, xFront+w, xBack, xBack+w].forEach(x => {
                doc.line(x, y-5, x, y-1); doc.line(x, y+h+1, x, y+h+5);
            });

            document.body.removeChild(temp);
        }
        doc.save(`PlayRole_${selectedTema.replace(/\s+/g, '_')}.pdf`);
    } catch (e) {
        console.error(e);
        alert("Error al generar el PDF. Asegúrate de no usar imágenes rotas.");
    } finally {
        el.btnPrint.innerHTML = originalText;
        el.btnPrint.disabled = false;
    }
}

/**
 * 4. EVENT LISTENERS
 */

// Actualizar nombre del dorso en tiempo real
el.nombreDorso.addEventListener('input', () => {
    el.dorsoText.innerText = el.nombreDorso.value.toUpperCase() || "PLAYROLE";
});

// Previsualización en tiempo real del frente
[el.situacion, el.rol, el.tema, el.desarrollo].forEach(input => {
    input.addEventListener('input', () => {
        renderCardToElement({
            situacion: el.situacion.value,
            rol: el.rol.value,
            tema: el.tema.value,
            desarrollo: el.desarrollo.value
        }, el.frontPreview);
    });
});

// Carga de Imagen Local
el.btnUpload.onclick = () => {
    const f = document.createElement('input'); f.type = 'file'; f.accept = 'image/*';
    f.onchange = e => {
        const r = new FileReader();
        r.onload = ev => {
            currentDorsoBase64 = ev.target.result;
            el.dorsoImg.src = currentDorsoBase64;
            el.dorsoImg.style.display = "block";
        };
        r.readAsDataURL(e.target.files[0]);
    };
    f.click();
};

el.btnSave.onclick = saveCard;
el.btnPrint.onclick = exportA4;

el.btnNext.onclick = () => {
    if(currentPreviewIndex < currentGroupCards.length - 1) {
        currentPreviewIndex++; updateCarouselPreview();
    }
};
el.btnPrev.onclick = () => {
    if(currentPreviewIndex > 0) {
        currentPreviewIndex--; updateCarouselPreview();
    }
};

// Inicio
document.addEventListener('DOMContentLoaded', () => {
    renderRecentGroups();
    // Previsualización inicial vacía
    renderCardToElement({situacion:1, rol:'Facilitador', tema:'Tema', desarrollo:''}, el.frontPreview);
});
