import { WebSocketServer } from 'ws';
import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const server = http.createServer(app);

// Servir archivos estáticos
app.use(express.static(path.join(__dirname, '../public')));

// WebSocket server
const wss = new WebSocketServer({ server });

// Guardar clientes conectados
const clients = new Map();

// Generar ID aleatorio
function generateId() {
  return Math.random().toString(36).substring(2, 8);
}

// Enviar a todos
function broadcast(data, excludeWs = null) {
  const message = JSON.stringify(data);
  
  clients.forEach((_, clientWs) => {
    if (clientWs !== excludeWs && clientWs.readyState === 1) {
      clientWs.send(message);
    }
  });
}

// Heartbeat para mantener conexiones vivas
const HEARTBEAT_INTERVAL = 25000;

wss.on('connection', (ws) => {
  console.log('✅ Nuevo cliente conectado');
  
  ws.isAlive = true;
  
  ws.on('pong', () => {
    ws.isAlive = true;
  });
  
  // Crear usuario
  const nickname = `User_${generateId()}`;
  
  clients.set(ws, { 
    id: generateId(),
    nickname,
    language: 'es'
  });

  // Mensaje de bienvenida
  ws.send(JSON.stringify({
    type: 'system',
    message: `Bienvenido al chat. Tu nick: ${nickname}`
  }));

  // Avisar a todos
  broadcast({
    type: 'system',
    message: `${nickname} se unió al chat`
  }, ws);
  
  // Enviar lista actualizada de usuarios
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

  // Escuchar mensajes
  ws.on('message', async (data) => {
    try {
      const message = JSON.parse(data.toString());
      const client = clients.get(ws);
      
      if (!client) return;

      if (message.type === 'message') {
        // Guardar idioma del mensaje (simplificado, solo detecta español vs otros)
        const hasSpanish = /[áéíóúñü¿?¡!]/i.test(message.text);
        client.language = hasSpanish ? 'es' : 'en';
        
        // Enviar a todos
        broadcast({
          type: 'message',
          user: client.nickname,
          text: message.text,
          originalLanguage: client.language
        });
        
        // Actualizar lista de usuarios
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
        
        // Actualizar lista
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
      
      // Responder a pings del cliente
      if (message.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong' }));
      }
      
    } catch (error) {
      console.log('Error procesando mensaje:', error);
    }
  });

  // Cuando se desconecta
  ws.on('close', () => {
    const client = clients.get(ws);
    if (client) {
      broadcast({
        type: 'system',
        message: `${client.nickname} salió del chat`
      });
      clients.delete(ws);
      
      // Actualizar lista
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
    console.log('❌ Cliente desconectado');
  });
});

// Heartbeat interval
const interval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) {
      console.log('Terminando conexión inactiva');
      return ws.terminate();
    }
    
    ws.isAlive = false;
    ws.ping();
  });
}, HEARTBEAT_INTERVAL);

wss.on('close', () => {
  clearInterval(interval);
});

// Iniciar servidor
const PORT = 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor GLOCAL corriendo en http://localhost:${PORT}`);
  console.log(`📡 WebSocket en ws://localhost:${PORT}`);
  console.log('🌍 Traducción con LibreTranslate (sin API key)');
});