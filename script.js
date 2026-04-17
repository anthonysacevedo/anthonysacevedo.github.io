/**
 * PLAYROLE OS - BACKEND V6.0 (STABLE PRINT)
 */

const STORAGE_KEY = 'playrole_v5_db';
let currentGroupCards = []; 
let currentPreviewIndex = 0;
let selectedTema = null;

// Selectores
const inputs = {
    situacion: document.querySelector('input[type="number"]'),
    rol: document.querySelector('input[placeholder="Ej: Facilitador"]'),
    tema: document.querySelector('input[placeholder="Conflict Resolution"]'),
    desarrollo: document.querySelector('textarea')
};

const frontContainer = document.querySelector('.lg\:col-span-7 .grid > div:first-child'); 
const backContainer = document.querySelector('.lg\:col-span-7 .grid > div:last-child');
const carouselContainer = document.querySelector('.flex.gap-4.overflow-x-auto');
const printBtn = document.querySelector('button.signature-gradient.shadow-2xl');

/**
 * MOTOR DE RENDERIZADO
 */
function renderCardToElement(data, target) {
    if (!target) return;
    const fontSizeDefault = 9;

    target.innerHTML = `
        <div class="render-target" style="width: 80mm; height: 100mm; background: #ffffff; font-family: 'Inter', sans-serif; color: #000; padding: 5mm; box-sizing: border-box; display: flex; flex-direction: column; position: relative;">
            <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #000; padding-bottom: 2mm; font-weight: 800; font-size: 9pt;">
                <span>SITUACIÓN Nº ${data.situacion || '1'}</span>
                <span style="color: #004ac6;">${(data.rol || '').toUpperCase()}</span>
            </div>
            <div class="content-box" style="flex: 1; margin-top: 4mm; overflow: hidden;">
                <p style="font-size: 7pt; font-style: italic; color: #666; margin-bottom: 2mm;">Lee atentamente la situación y acciona.</p>
                <div class="dynamic-text" style="font-size: ${fontSizeDefault}pt; line-height: 1.3;">
                    ${(data.desarrollo || '').replace(/\n/g, '<br>')}
                </div>
            </div>
            <div style="border-top: 1px solid #000; padding-top: 2mm; text-align: center; font-weight: 900; font-size: 9pt;">
                ${(data.tema || '').toUpperCase()}
            </div>
        </div>`;

    const box = target.querySelector('.content-box');
    const text = target.querySelector('.dynamic-text');
    let size = fontSizeDefault;

    if (text && box) {
        while (text.scrollHeight > box.offsetHeight && size > 5) {
            size -= 0.5;
            text.style.fontSize = `${size}pt`;
        }
    }
}

/**
 * EXPORTACIÓN REPARADA
 */
async function exportA4() {
    if (!selectedTema || currentGroupCards.length === 0) {
        return alert("Primero selecciona un grupo en 'Recent Cards'.");
    }
    
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('l', 'mm', 'a4');
    const originalContent = printBtn.innerHTML;
    
    printBtn.innerHTML = "PROCESANDO...";
    printBtn.disabled = true;

    try {
        // Capturamos el Dorso una sola vez
        const canvasB = await html2canvas(backContainer, { scale: 2, useCORS: true });
        const imgB = canvasB.toDataURL('image/png');

        for (let i = 0; i < currentGroupCards.length; i++) {
            if (i > 0) doc.addPage('a4', 'l');

            // Crear contenedor temporal para el renderizado real
            const tempDiv = document.createElement('div');
            tempDiv.style.position = 'fixed';
            tempDiv.style.top = '0';
            tempDiv.style.left = '-1000mm'; // Fuera de vista
            document.body.appendChild(tempDiv);
            
            renderCardToElement(currentGroupCards[i], tempDiv);
            
            // Espera crítica para asegurar que las fuentes/estilos carguen
            await new Promise(r => setTimeout(r, 300));

            const canvasF = await html2canvas(tempDiv.querySelector('.render-target'), { 
                scale: 2,
                logging: false 
            });
            const imgF = canvasF.toDataURL('image/png');

            // Posicionamiento en A4
            const w = 80, h = 100, y = 55;
            const xF = 63.5, xB = 153.5; // Centrado manual aproximado para dos tarjetas

            doc.addImage(imgF, 'PNG', xF, y, w, h);
            doc.addImage(imgB, 'PNG', xB, y, w, h);

            document.body.removeChild(tempDiv);
        }
        
        doc.save(`PlayRole_${selectedTema.replace(/\s+/g, '_')}.pdf`);
    } catch (err) {
        console.error("Error en PDF:", err);
        alert("Error crítico en impresión. Revisa la consola (F12).");
    } finally {
        printBtn.innerHTML = originalContent;
        printBtn.disabled = false;
    }
}

/**
 * GESTIÓN DE GRUPOS Y NAVEGACIÓN
 */
function renderRecentGroups() {
    const db = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    carouselContainer.innerHTML = '';
    
    Object.keys(db).forEach(tema => {
        const div = document.createElement('div');
        const count = db[tema].length;
        const isActive = (tema === selectedTema);
        
        div.className = `flex-shrink-0 w-24 card-ratio bg-surface-container-highest rounded-md border p-2 flex flex-col items-center justify-between cursor-pointer transition-all ${isActive ? 'border-primary ring-2 ring-primary/30' : 'border-outline-variant/30 grayscale'}`;
        
        div.innerHTML = `
            <span class="text-[8px] font-bold text-on-surface-variant truncate w-full text-center">${tema}</span>
            <div class="text-center">
                <p class="text-[9px] font-black text-primary">${count} CARDS</p>
                <button onclick="event.stopPropagation(); deleteGroup('${tema}')" class="text-[8px] text-red-500 font-bold hover:underline">BORRAR</button>
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
    if(confirm(`¿Eliminar el grupo "${tema}" permanentemente?`)) {
        const db = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        delete db[tema];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
        if(selectedTema === tema) {
            selectedTema = null;
            currentGroupCards = [];
        }
        renderRecentGroups();
    }
};

function updateCarouselPreview() {
    if (currentGroupCards.length > 0) {
        renderCardToElement(currentGroupCards[currentPreviewIndex], frontContainer);
    }
}

// Navegación entre tarjetas del grupo (Flechas)
document.querySelector('[data-icon="chevron_left"]').parentElement.onclick = () => {
    if (currentPreviewIndex > 0) {
        currentPreviewIndex--;
        updateCarouselPreview();
    }
};

document.querySelector('[data-icon="chevron_right"]').parentElement.onclick = () => {
    if (currentPreviewIndex < currentGroupCards.length - 1) {
        currentPreviewIndex++;
        updateCarouselPreview();
    }
};

// Guardado
document.querySelector('button.bg-on-surface').onclick = (e) => {
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

printBtn.onclick = exportA4;

// Renderizado en tiempo real mientras escribes
Object.values(inputs).forEach(input => {
    input.addEventListener('input', () => {
        renderCardToElement({
            situacion: inputs.situacion.value,
            rol: inputs.rol.value,
            tema: inputs.tema.value,
            desarrollo: inputs.desarrollo.value
        }, frontContainer);
    });
});

document.addEventListener('DOMContentLoaded', renderRecentGroups);
