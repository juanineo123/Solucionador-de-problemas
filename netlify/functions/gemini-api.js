// Importamos 'node-fetch' para poder hacer llamadas a APIs desde el servidor
const fetch = require('node-fetch');

// Esta es la función principal que Netlify ejecutará
exports.handler = async function(event, context) {
    // Verificamos que la solicitud sea de tipo POST
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        // Obtenemos el "prompt" que envió el usuario desde el frontend
        const { prompt } = JSON.parse(event.body);

        // Obtenemos la clave de API desde las variables de entorno de Netlify (¡Esto es seguro!)
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            throw new Error('La clave de API de Gemini no está configurada en el servidor.');
        }

        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

        // El payload para la API de Gemini
        const payload = {
            contents: [{
                role: "user",
                parts: [{ text: prompt }]
            }],
            generationConfig: {
                temperature: 0.4,
                topP: 1,
                topK: 32,
                maxOutputTokens: 4096,
            }
        };

        // Hacemos la llamada a la API de Gemini desde el servidor
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error('Error de la API de Gemini:', errorBody);
            return {
                statusCode: response.status,
                body: JSON.stringify({ error: `Error en la API de Gemini: ${response.statusText}` })
            };
        }

        const result = await response.json();

        // Devolvemos la respuesta exitosa al frontend
        return {
            statusCode: 200,
            body: JSON.stringify(result)
        };

    } catch (error) {
        console.error('Error en la función serverless:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};
