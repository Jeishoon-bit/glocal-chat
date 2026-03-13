// ============================================
// GLOCAL APP - INICIALIZACIÓN PRINCIPAL
// ============================================

import { initSidebar } from './ui/sidebar.js';
import { initMessages, addSystemMessage, addMessage } from './ui/messages.js';
import { initUsers, updateUserList } from './ui/users.js';
import { escapeHtml, detectLanguage } from './utils/helpers.js';

// Variables globales
let socket;
let myNickname = '';
let reconnectAttempts = 0;
const maxReconnectAttempts = 10;
const baseDelay = 1000;

// Elementos DOM
const statusLed = document.getElementById('statusLed');
const statusText = document.getElementById('statusText');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const nicknameInput = document.getElementById('nicknameInput');
const changeNickBtn = document.getElementById('changeNickBtn');

// ============================================
// CONEXIÓN WEBSOCKET
// ============================================

function connectWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}`;
    
    console.log('🔌 Conectando a WebSocket:', wsUrl);
    socket = new WebSocket(wsUrl);
    
    socket.onopen = () => {
        console.log('✅ WebSocket conectado');
        statusLed.className = 'status-led connected';
        statusText.textContent = 'Conectado';
        addSystemMessage('✅ Conectado al servidor');
        reconnectAttempts = 0;
    };
    
    socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        if (data.type === 'system') {
            addSystemMessage(data.message);
            if (data.message.includes('Tu nick:')) {
                myNickname = data.message.split('Tu nick: ')[1];
            }
        }
        
        if (data.type === 'message') {
            const isOwn = data.user === myNickname;
            addMessage(data, isOwn);
        }
        
        if (data.type === 'users') {
            updateUserList(data.users);
        }
    };
    
    socket.onclose = (event) => {
        console.log('❌ WebSocket cerrado. Código:', event.code);
        statusLed.className = 'status-led disconnected';
        statusText.textContent = 'Desconectado';
        
        if (event.code === 1000) return;
        
        if (reconnectAttempts < maxReconnectAttempts) {
            const delay = Math.min(baseDelay * Math.pow(2, reconnectAttempts), 30000);
            addSystemMessage(`🔄 Reconectando en ${delay/1000}s...`);
            
            setTimeout(() => {
                reconnectAttempts++;
                connectWebSocket();
            }, delay);
        } else {
            addSystemMessage('❌ No se pudo reconectar. Recarga la página.');
        }
    };
    
    socket.onerror = (error) => {
        console.log('⚠️ Error WebSocket:', error);
        statusLed.className = 'status-led disconnected';
        statusText.textContent = 'Error';
    };
}

// ============================================
// FUNCIONES DE INTERACCIÓN
// ============================================

function sendMessage() {
    const text = messageInput.value.trim();
    if (!text || !socket || socket.readyState !== WebSocket.OPEN) return;
    
    socket.send(JSON.stringify({
        type: 'message',
        text: text
    }));
    
    messageInput.value = '';
}

function changeNickname() {
    const newNick = nicknameInput.value.trim();
    if (!newNick || !socket) return;
    
    socket.send(JSON.stringify({
        type: 'set_nickname',
        nickname: newNick
    }));
    
    myNickname = newNick;
    nicknameInput.value = '';
}

// ============================================
// INICIALIZACIÓN
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Inicializando GLOCAL...');
    
    // Inicializar módulos UI
    initSidebar();
    initMessages();
    initUsers();
    
    // Event listeners
    sendBtn.addEventListener('click', sendMessage);
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });
    
    changeNickBtn.addEventListener('click', changeNickname);
    nicknameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') changeNickname();
    });
    
    // Conectar WebSocket
    connectWebSocket();
    
    // Mensajes de bienvenida
    addSystemMessage('🌍 Bienvenido a GLOCAL');
    addSystemMessage('💬 Chat elegante sin traducción');
});