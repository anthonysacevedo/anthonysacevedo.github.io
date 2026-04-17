const STORAGE_KEY = 'playrole_v5_db';
let currentDorsoBase64 = null;
let currentGroupCards = []; 
let currentPreviewIndex = 0;
let selectedTema = null;

// --- MAPEO DE SELECTORES BASADO EN TU ESTRUCTURA ---
const getElements = () => {
    const inputs = document.querySelectorAll('input');
    const textarea = document.querySelector('textarea');
    const buttons = document.querySelectorAll('button');

    return {
        // Inputs por orden de aparición en tu HTML
        situacion: inputs[0], // Situación (number)
        rol: inputs[1],       // Rol
        tema: inputs[2],      // Tema
        nombreDorso: inputs[3], // Nombre Dorso
        desarrollo: textarea,

        // Contenedores de Preview
        frontContainer: document.querySelector('.card-ratio .border-dashed'),
        backContainer: document.querySelectorAll('.card-ratio')[1], // El segundo es el dorso
        dorsoText: document.querySelector('.card-ratio h3'),
        dorsoImg: document.querySelector('.card-ratio img'),
        carousel: document.querySelector('.overflow-x-auto'),

        // Botones por contenido o posición
        btnSave: Array.from(buttons).find(b => b.innerText.includes('AGREGAR') || b.innerText.includes('CREAR')),
        btnPrint: Array.from(buttons).find(b => b.innerText.includes('EXPORTAR')),
        btnUpload: Array.from(buttons).find(b => b.innerHTML.includes('image')),
        btnNext: document.querySelector('[data-icon="chevron_right"]')?.closest('button'),
        btnPrev: document.querySelector('[data-icon="chevron_left"]')?.closest('button')
    };
};

// --- MOTOR DE RENDERIZADO (Se mantiene igual para precisión A4) ---
function renderCardToElement(data, target) {
    if (!target) return;
    const fontSizeDefault = 9;
    const generateHTML = (size) => `
        <div style="width: 80mm; height: 100mm; position: relative; background: white; font-family: 'Inter', sans-serif; color: black; overflow: hidden; box-sizing: border-box;">
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
    const box = target.querySelector('.content-box');
    const text = target.querySelector('.dynamic-text');
    let currentSize = fontSizeDefault;
    while (text.scrollHeight > (box.offsetHeight - 2) && currentSize > 4.5) {
        currentSize -= 0.5;
        text.style.fontSize = `${currentSize}pt`;
    }
}

// --- LÓGICA DE EXPORTACIÓN ---
async function exportA4() {
    const el = getElements();
    if (!selectedTema || currentGroupCards.length === 0) return alert("Selecciona un grupo primero.");
    
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('l', 'mm', 'a4');

    try {
        const canvasB = await html2canvas(el.backContainer, { scale: 2, backgroundColor: "#ffffff" });
        const imgB = canvasB.toDataURL('image/png');

        for (let i = 0; i < currentGroupCards.length; i++) {
            if (i > 0) doc.addPage('a4', 'l');
            const temp = document.createElement('div');
            temp.style.position = 'fixed'; temp.style.left = '-9999px';
            document.body.appendChild(temp);
            renderCardToElement(currentGroupCards[i], temp);
            await new Promise(r => setTimeout(r, 150));
            const canvasF = await html2canvas(temp.firstChild, { scale: 2 });
            const imgF = canvasF.toDataURL('image/png');
            
            const w = 80, h = 100, y = 55;
            const xF = (297 - (w*2+10))/2;
            doc.addImage(imgF, 'PNG', xF, y, w, h);
            doc.addImage(imgB, 'PNG', xF + w + 10, y, w, h);
            document.body.removeChild(temp);
        }
        doc.save(`PlayRole_${selectedTema}.pdf`);
    } catch (e) { alert("Error al generar PDF"); }
}

// --- INICIALIZACIÓN Y EVENTOS ---
document.addEventListener('DOMContentLoaded', () => {
    const el = getElements();

    // Guardar
    if(el.btnSave) el.btnSave.onclick = () => {
        const db = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        const tema = el.tema.value.trim() || "General";
        if (!db[tema]) db[tema] = [];
        db[tema].push({
            situacion: el.situacion.value,
            rol: el.rol.value,
            tema: tema,
            desarrollo: el.desarrollo.value,
            imgDorso: currentDorsoBase64,
            textoDorso: el.nombreDorso.value
        });
        localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
        selectedTema = tema;
        location.reload(); // Recarga simple para actualizar carrusel
    };

    // Imprimir
    if(el.btnPrint) el.btnPrint.onclick = exportA4;

    // Subir Imagen
    if(el.btnUpload) el.btnUpload.onclick = () => {
        const f = document.createElement('input'); f.type = 'file';
        f.onchange = e => {
            const r = new FileReader();
            r.onload = ev => {
                currentDorsoBase64 = ev.target.result;
                if(el.dorsoImg) { el.dorsoImg.src = currentDorsoBase64; el.dorsoImg.style.display = "block"; }
            };
            r.readAsDataURL(e.target.files[0]);
        };
        f.click();
    };

    // Texto en vivo
    el.nombreDorso.oninput = () => el.dorsoText.innerText = el.nombreDorso.value.toUpperCase() || "PLAYROLE";
    
    // Cargar grupos en carrusel
    const db = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    if(el.carousel) {
        el.carousel.innerHTML = '';
        Object.keys(db).forEach(tema => {
            const div = document.createElement('div');
            div.className = "flex-shrink-0 w-24 card-ratio bg-white border rounded-md flex flex-col items-center justify-center cursor-pointer p-1";
            div.innerHTML = `<span class="text-[8px] font-bold text-primary truncate w-full text-center">${tema}</span>`;
            div.onclick = () => {
                selectedTema = tema;
                currentGroupCards = db[tema];
                currentPreviewIndex = 0;
                renderCardToElement(currentGroupCards[0], el.frontPreview);
                el.dorsoText.innerText = (currentGroupCards[0].textoDorso || "PLAYROLE").toUpperCase();
            };
            el.carousel.appendChild(div);
        });
    }
});
