// Archivo corregido: netlify/functions/gemini-api.js

const fetch = require('node-fetch');

exports.handler = async function(event, context) {
    
    // --- INICIO DE LA CORRECCIÓN ---
    // Manejo de la solicitud de "permiso" (preflight) de CORS que envía el navegador
    // antes de la solicitud POST principal.
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200, // 200 OK
            headers: {
                'Access-Control-Allow-Origin': '*', // Permite solicitudes desde cualquier origen
                'Access-control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'POST, OPTIONS'
            },
            body: '' // El cuerpo puede estar vacío
        };
    }
    // --- FIN DE LA CORRECCIÓN ---

    // Ahora, el resto de la lógica solo se ejecuta si el método NO es OPTIONS
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { prompt } = JSON.parse(event.body);

        if (!prompt) {
            return { statusCode: 400, body: 'Bad Request: No se ha proporcionado un prompt.' };
        }

        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            throw new Error('La clave de API de Gemini (GEMINI_API_KEY) no está configurada en el servidor.');
        }
        
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;

        const payload = {
            contents: [{
                role: "user",
                parts: [{ text: prompt }]
            }],
            generationConfig: {
                temperature: 0.5,
                topP: 1,
                topK: 32,
                maxOutputTokens: 8192,
            }
        };

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

        return {
            statusCode: 200,
            body: JSON.stringify(result)
        };

    } catch (error) {
        console.error('Error en la función serverless (gemini-api):', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};