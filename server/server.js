import { WebSocketServer } from 'ws';
import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const server = http.createServer(app);

// Servir archivos estáticos
app.use(express.static(path.join(__dirname, '../public')));

// Mapa de códigos de idioma válidos
const languageMap = {
    'es': 'es',
    'en': 'en',
    'fr': 'fr',
    'de': 'de',
    'it': 'it',
    'pt': 'pt',
    'ja': 'ja',
    'ko': 'ko',
    'zh': 'zh',
    'ru': 'ru'
};

// Proxy para traducción
app.use(express.json());
app.post('/translate', async (req, res) => {
    const { q, source, target } = req.body;
    
    // Usar el idioma seleccionado o inglés por defecto
    const sourceLang = languageMap[source] || 'en';
    const targetLang = languageMap[target] || 'en';
    
    console.log(`🌐 Traduciendo: "${q.substring(0, 30)}..." de ${sourceLang} a ${targetLang}`);
    
    // Lista de servicios gratuitos
    const services = [
        {
            name: 'LibreTranslate',
            url: 'https://libretranslate.de/translate',
            body: { q, source: sourceLang, target: targetLang, format: 'text' }
        },
        {
            name: 'MyMemory',
            url: `https://api.mymemory.translated.net/get?q=${encodeURIComponent(q)}&langpair=${sourceLang}|${targetLang}`,
            isGet: true
        }
    ];
    
    // Intentar cada servicio
    for (const service of services) {
        try {
            console.log(`🔄 Intentando con: ${service.name}`);
            
            let response;
            if (service.isGet) {
                response = await fetch(service.url);
                const data = await response.json();
                
                if (data.responseData?.translatedText) {
                    console.log(`✅ Traducción exitosa con: ${service.name}`);
                    return res.json({ translatedText: data.responseData.translatedText });
                }
            } else {
                response = await fetch(service.url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(service.body)
                });
                
                const data = await response.json();
                if (data.translatedText) {
                    console.log(`✅ Traducción exitosa con: ${service.name}`);
                    return res.json({ translatedText: data.translatedText });
                }
            }
        } catch (error) {
            console.log(`❌ Falló ${service.name}:`, error.message);
        }
    }
    
    // Si todo falla, devolver original
    console.log('⚠️ Usando texto original sin traducción');
    res.json({ translatedText: q });
});

// WebSocket server
const wss = new WebSocketServer({ server });
const clients = new Map();

console.log('🚀 Servidor GLOCAL iniciando...');

function generateId() {
    return Math.random().toString(36).substring(2, 8);
}

function broadcast(data, excludeWs = null) {
    const message = JSON.stringify(data);
    clients.forEach((_, clientWs) => {
        if (clientWs !== excludeWs && clientWs.readyState === 1) {
            try {
                clientWs.send(message);
            } catch (err) {
                console.log('❌ Error enviando a cliente:', err);
            }
        }
    });
}

const HEARTBEAT_INTERVAL = 25000;

wss.on('connection', (ws) => {
    console.log('✅ Nuevo cliente conectado. Total:', clients.size + 1);
    
    ws.isAlive = true;
    
    ws.on('pong', () => {
        ws.isAlive = true;
    });
    
    const nickname = `User_${generateId()}`;
    clients.set(ws, { 
        id: generateId(),
        nickname,
        language: 'es'
    });

    ws.send(JSON.stringify({
        type: 'system',
        message: `Bienvenido al chat. Tu nick: ${nickname}`
    }));

    broadcast({
        type: 'system',
        message: `${nickname} se unió al chat`
    }, ws);
    
    const userList = [];
    clients.forEach((client) => {
        userList.push({
            nickname: client.nickname,
            language: client.language
        });
    });
    
    ws.send(JSON.stringify({
        type: 'users',
        users: userList
    }));

    ws.on('message', async (data) => {
        try {
            const message = JSON.parse(data.toString());
            const client = clients.get(ws);
            
            if (!client) return;

            if (message.type === 'message') {
                // Detectar si el mensaje contiene español
                const hasSpanish = /[áéíóúñü¿?¡!]/i.test(message.text);
                client.language = hasSpanish ? 'es' : 'en';
                
                broadcast({
                    type: 'message',
                    user: client.nickname,
                    text: message.text,
                    originalLanguage: client.language
                });
                
                const updatedList = [];
                clients.forEach(c => {
                    updatedList.push({
                        nickname: c.nickname,
                        language: c.language
                    });
                });
                
                broadcast({
                    type: 'users',
                    users: updatedList
                });
            }
            
            if (message.type === 'set_nickname') {
                const oldNick = client.nickname;
                client.nickname = message.nickname.substring(0, 20);
                
                broadcast({
                    type: 'system',
                    message: `${oldNick} ahora se llama ${client.nickname}`
                });
                
                const updatedList = [];
                clients.forEach(c => {
                    updatedList.push({
                        nickname: c.nickname,
                        language: c.language
                    });
                });
                
                broadcast({
                    type: 'users',
                    users: updatedList
                });
            }
            
            if (message.type === 'ping') {
                ws.send(JSON.stringify({ type: 'pong' }));
            }
            
        } catch (error) {
            console.log('❌ Error procesando mensaje:', error);
        }
    });

    ws.on('close', () => {
        const client = clients.get(ws);
        if (client) {
            console.log(`❌ Cliente desconectado: ${client.nickname}`);
            broadcast({
                type: 'system',
                message: `${client.nickname} salió del chat`
            });
            clients.delete(ws);
            
            const updatedList = [];
            clients.forEach(c => {
                updatedList.push({
                    nickname: c.nickname,
                    language: c.language
                });
            });
            
            broadcast({
                type: 'users',
                users: updatedList
            });
        }
    });
});

const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
        if (ws.isAlive === false) {
            console.log('⚠️ Terminando conexión inactiva');
            return ws.terminate();
        }
        
        ws.isAlive = false;
        ws.ping();
    });
}, HEARTBEAT_INTERVAL);

wss.on('close', () => {
    clearInterval(interval);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Servidor escuchando en puerto ${PORT}`);
    console.log(`🌍 Traducción con múltiples servicios gratuitos`);
});