// ===============================
// FIX EXPORTAR PDF (SIN ROMPER NADA)
// ===============================

function getPrintButton() {
    // Busca el botón de forma ROBUSTA (no depende de includes frágil)
    return Array.from(document.querySelectorAll('button'))
        .find(btn => btn.textContent.replace(/\s+/g, ' ').trim().toUpperCase() === 'EXPORTAR PDF');
}

// ===============================
// EXPORT FUNCIÓN (NO TOCA TU DISEÑO)
// ===============================
async function exportA4() {

    if (!currentGroupCards || currentGroupCards.length === 0) {
        alert("Seleccioná un grupo primero");
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('l', 'mm', 'a4');

    const backCard = document.querySelectorAll('.card-ratio')[1];

    if (!backCard) {
        alert("No se encontró la tarjeta reverso");
        return;
    }

    try {
        // Render reverso UNA vez
        const canvasBack = await html2canvas(backCard, {
            scale: 3,
            backgroundColor: "#ffffff",
            useCORS: true
        });

        const imgBack = canvasBack.toDataURL('image/png');

        for (let i = 0; i < currentGroupCards.length; i++) {

            if (i > 0) doc.addPage();

            // 🔴 CLAVE: NO modificamos tu tarjeta original
            const frontCard = document.querySelectorAll('.card-ratio')[0];

            if (!frontCard) continue;

            const canvasFront = await html2canvas(frontCard, {
                scale: 3,
                backgroundColor: "#ffffff",
                useCORS: true
            });

            const imgFront = canvasFront.toDataURL('image/png');

            // Posiciones A4 horizontal
            doc.addImage(imgFront, 'PNG', 63.5, 55, 80, 100);
            doc.addImage(imgBack, 'PNG', 153.5, 55, 80, 100);
        }

        doc.save("PlayRole.pdf");

    } catch (err) {
        console.error(err);
        alert("Error al exportar PDF (ver consola)");
    }
}

// ===============================
// INIT SEGURO
// ===============================
document.addEventListener('DOMContentLoaded', () => {

    const btn = getPrintButton();

    if (!btn) {
        console.warn("Botón EXPORTAR PDF no encontrado");
        return;
    }

    // 🔥 elimina eventos anteriores (clave)
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);

    newBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        exportA4();
    });

});