// Usamos la librería 'docx' para crear documentos de Word.
const { Document, Packer, Paragraph, TextRun, AlignmentType, BorderStyle } = require('docx');

// Esta función auxiliar no necesita cambios.
function createTextRunsFromHtml(htmlContent) {
    const runs = [];
    const parts = htmlContent.split(/<\/?strong>/);
    parts.forEach((part, index) => {
        const isBold = index % 2 === 1;
        const text = part.replace(/<[^>]+>/g, '').trim();
        if (text) {
            runs.push(new TextRun({ text: text, font: "Calibri", size: 22, bold: isBold }));
            runs.push(new TextRun({ text: " ", size: 22 }));
        }
    });
    if (runs.length > 0 && runs[runs.length - 1].options && runs[runs.length - 1].options.text === " ") {
        runs.pop();
    }
    return runs;
}

// Esta es la función que corregimos.
function htmlToDocxObjects(html) {
    const docxObjects = [];
    
    // --- INICIO DE LA CORRECCIÓN FINAL ---
    // Hemos eliminado 'ul' de la expresión regular.
    // Esto hace que el "traductor" ignore la etiqueta <ul> que agrupa la lista,
    // y en su lugar, lea cada etiqueta <li> individualmente, que es lo que queremos.
    const regex = /<(h3|h4|p|li)[^>]*>([\s\S]*?)<\/\1>/g;
    // --- FIN DE LA CORRECCIÓN FINAL ---

    let match;

    while ((match = regex.exec(html)) !== null) {
        const tag = match[1];
        const content = match[2];

        if (!content.replace(/<[^>]+>/g, '').trim()) continue;

        let paragraph;

        switch (tag) {
            case 'h3':
            case 'h4': // Tratamos h3 y h4 igual para consistencia
                paragraph = new Paragraph({
                    children: [new TextRun({ text: content.replace(/<[^>]+>/g, '').trim(), bold: true, size: 24, font: "Calibri" })],
                    alignment: AlignmentType.LEFT,
                    spacing: { after: 200, before: 200 },
                    border: { bottom: { color: "auto", space: 1, style: BorderStyle.SINGLE, size: 6 } }
                });
                break;
            
            case 'li':
                paragraph = new Paragraph({
                    children: createTextRunsFromHtml(content),
                    bullet: { level: 0 },
                    spacing: { after: 120 },
                    alignment: AlignmentType.JUSTIFIED,
                    indent: { left: 720, hanging: 360 }
                });
                break;

            case 'p':
                 paragraph = new Paragraph({
                    children: createTextRunsFromHtml(content),
                    spacing: { after: 180 },
                    alignment: AlignmentType.JUSTIFIED,
                });
                break;
        }

        if (paragraph) {
            docxObjects.push(paragraph);
        }
    }
    return docxObjects;
}

// La función handler principal no necesita cambios.
exports.handler = async function(event) {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }
    try {
        const { htmlContent, problemTitle } = JSON.parse(event.body);
        const titleParagraph = new Paragraph({
            children: [new TextRun({ text: `HOJA DE RUTA: ${problemTitle.toUpperCase()}`, bold: true, size: 32, font: "Calibri" })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 400, before: 200 },
        });
        const contentObjects = htmlToDocxObjects(htmlContent);
        const doc = new Document({
            creator: "Solucionador Docente Interactivo",
            title: `Hoja de Ruta: ${problemTitle}`,
            styles: {
                paragraphStyles: [{
                    id: "Normal",
                    name: "Normal",
                    run: { font: "Calibri", size: 22 },
                }]
            },
            sections: [{
                properties: {
                    page: { margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } },
                },
                children: [titleParagraph, ...contentObjects],
            }],
        });
        const buffer = await Packer.toBuffer(doc);
        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
            body: buffer.toString('base64'),
            isBase64Encoded: true,
        };
    } catch (error) {
        console.error('Error al generar el documento Word:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'No se pudo generar el documento.' }),
        };
    }
};