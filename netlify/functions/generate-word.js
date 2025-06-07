const { Document, Packer, Paragraph, TextRun, AlignmentType } = require('docx');

/**
 * Crea una serie de 'TextRun' para un párrafo, manejando etiquetas <strong> para negritas.
 * @param {string} htmlContent El contenido HTML interno de una etiqueta (ej: <p> o <li>).
 * @returns {TextRun[]} Un array de objetos TextRun para la librería docx.
 */
function createTextRunsFromHtml(htmlContent) {
    const runs = [];
    // Divide el contenido por las etiquetas <strong> y </strong> para alternar negritas.
    const parts = htmlContent.split(/<\/?strong>/);
    
    parts.forEach((part, index) => {
        // El texto dentro de <strong> estará en índices impares.
        const isBold = index % 2 === 1;
        // Limpia cualquier otra etiqueta HTML simple que pudiera quedar (ej. <br>)
        const text = part.replace(/<[^>]+>/g, '').trim();
        
        if (text) {
            runs.push(new TextRun({ 
                text: text, 
                size: 22, // 11pt
                bold: isBold 
            }));
            // Añade un espacio después de cada fragmento para que no se peguen las palabras.
            runs.push(new TextRun({ text: " ", size: 22 }));
        }
    });

    // Quita el último espacio extra que se haya añadido.
    if (runs.length > 0) {
        runs.pop();
    }
    
    return runs;
}

/**
 * Convierte un string de HTML simple (con h4, p, li) a un array de objetos de la librería docx.
 * @param {string} html El string HTML a convertir.
 * @returns {Paragraph[]} Un array de párrafos para la librería docx.
 */
function htmlToDocxObjects(html) {
    const objects = [];
    // Expresión regular para encontrar etiquetas h4, p, y li y capturar su contenido.
    // Es más robusta que hacer split en el string.
    // NO busca <h3> porque el título principal se añade por separado.
    const regex = /<(h4|p|li)[^>]*>([\s\S]*?)<\/\1>/g;
    let match;

    while ((match = regex.exec(html)) !== null) {
        const tag = match[1];      // La etiqueta (h4, p, li)
        const content = match[2];  // El contenido dentro de la etiqueta

        // Si después de limpiar todo el contenido está vacío, lo saltamos.
        if (!content.replace(/<[^>]+>/g, '').trim()) continue;

        let paragraph;

        switch (tag) {
            case 'h4':
                paragraph = new Paragraph({
                    children: [new TextRun({
                        text: content.replace(/<[^>]+>/g, '').trim(), // Limpiamos el contenido para el subtítulo
                        bold: true,
                        size: 26, // 13pt
                    })],
                    alignment: AlignmentType.LEFT,
                    spacing: { after: 240, before: 200 },
                    border: { bottom: { color: "auto", space: 1, value: "single", size: 6 } }
                });
                break;
            
            case 'li':
                paragraph = new Paragraph({
                    children: createTextRunsFromHtml(content), // Usa la función para manejar <strong> anidado
                    bullet: { level: 0 },
                    spacing: { after: 120 },
                    alignment: AlignmentType.JUSTIFIED,
                    indent: { left: 720, hanging: 360 }
                });
                break;

            case 'p':
                 paragraph = new Paragraph({
                    children: createTextRunsFromHtml(content), // Usa la función para manejar <strong> anidado
                    spacing: { after: 180 },
                    alignment: AlignmentType.JUSTIFIED,
                });
                break;
        }

        if (paragraph) {
            objects.push(paragraph);
        }
    }
    return objects;
}


exports.handler = async function(event) {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { htmlContent, problemTitle } = JSON.parse(event.body);

        // 1. Crear el párrafo del título principal a partir del `problemTitle`
        const titleParagraph = new Paragraph({
            children: [new TextRun({
                text: `HOJA DE RUTA: ${problemTitle.toUpperCase()}`,
                bold: true,
                size: 32, // 16pt
            })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 400, before: 200 },
        });

        // 2. Convertir el resto del contenido HTML
        const contentObjects = htmlToDocxObjects(htmlContent);

        // 3. Unir el título y el contenido
        const finalDocObjects = [titleParagraph, ...contentObjects];

        const doc = new Document({
            sections: [{
                properties: {
                    page: {
                        margin: {
                            top: 1440, right: 1440, bottom: 1440, left: 1440,
                        },
                    },
                },
                children: finalDocObjects,
            }],
        });

        const buffer = await Packer.toBuffer(doc);

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            },
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
