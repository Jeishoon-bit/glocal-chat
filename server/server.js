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

console.log('🚀 Servidor GLOCAL iniciando...');

// Generar ID aleatorio
function generateId() {
  return Math.random().toString(36).substring(2, 8);
}

// Enviar a todos los clientes
function broadcast(data, excludeWs = null) {
  const message = JSON.stringify(data);
  console.log(`📢 Broadcast: ${data.type} a ${clients.size} clientes`);
  
  let sentCount = 0;
  clients.forEach((_, clientWs) => {
    if (clientWs !== excludeWs && clientWs.readyState === 1) {
      try {
        clientWs.send(message);
        sentCount++;
      } catch (err) {
        console.log('❌ Error enviando a cliente:', err);
      }
    }
  });
  console.log(`✅ Mensaje enviado a ${sentCount} clientes`);
}

// Heartbeat interval
const HEARTBEAT_INTERVAL = 25000;

// Manejar nuevas conexiones
wss.on('connection', (ws) => {
  console.log('✅ Nuevo cliente conectado. Total:', clients.size + 1);
  
  ws.isAlive = true;
  
  ws.on('pong', () => {
    console.log('💓 Pong recibido');
    ws.isAlive = true;
  });
  
  // Crear nuevo usuario
  const nickname = `User_${generateId()}`;
  clients.set(ws, { 
    id: generateId(),
    nickname,
    language: 'es'
  });

  console.log(`👤 Nuevo usuario: ${nickname}`);

  // Mensaje de bienvenida al nuevo cliente
  ws.send(JSON.stringify({
    type: 'system',
    message: `Bienvenido al chat. Tu nick: ${nickname}`
  }));

  // Notificar a todos que alguien se unió
  broadcast({
    type: 'system',
    message: `${nickname} se unió al chat`
  }, ws);
  
  // Enviar lista actualizada de usuarios al nuevo cliente
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

  // Manejar mensajes entrantes
  ws.on('message', async (data) => {
    try {
      console.log('📨 Mensaje recibido:', data.toString());
      const message = JSON.parse(data.toString());
      const client = clients.get(ws);
      
      if (!client) return;

      // Mensaje de chat normal
      if (message.type === 'message') {
        console.log(`💬 Mensaje de ${client.nickname}: ${message.text}`);
        
        // Detectar idioma (simplificado)
        const hasSpanish = /[áéíóúñü¿?¡!]/i.test(message.text);
        client.language = hasSpanish ? 'es' : 'en';
        
        // Reenviar a todos
        broadcast({
          type: 'message',
          user: client.nickname,
          text: message.text,
          originalLanguage: client.language
        });
        
        // Actualizar lista de usuarios (por si cambió idioma)
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
      
      // Cambiar nickname
      if (message.type === 'set_nickname') {
        const oldNick = client.nickname;
        client.nickname = message.nickname.substring(0, 20);
        console.log(`✏️ ${oldNick} cambió a ${client.nickname}`);
        
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
      
      // Responder a ping (heartbeat)
      if (message.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong' }));
      }
      
    } catch (error) {
      console.log('❌ Error procesando mensaje:', error);
    }
  });

  // Manejar desconexión
  ws.on('close', () => {
    const client = clients.get(ws);
    if (client) {
      console.log(`❌ Cliente desconectado: ${client.nickname}`);
      
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
  });
});

// Heartbeat para mantener conexiones vivas
const interval = setInterval(() => {
  console.log('💓 Heartbeat: verificando conexiones...');
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

// Iniciar servidor
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Servidor escuchando en puerto ${PORT}`);
  console.log(`🌍 Accede en: https://glocal-chat.onrender.com`);
});