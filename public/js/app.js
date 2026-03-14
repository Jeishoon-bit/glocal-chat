import { initSidebar } from './ui/sidebar.js';
import { initMessages, addSystemMessage, addMessage } from './ui/messages.js';
import { initUsers, updateUserList } from './ui/users.js';
import { escapeHtml, detectLanguage } from './utils/helpers.js';

// ============================================
// MODAL DE BIENVENIDA (VERSIÓN SEGURA)
// ============================================

function initWelcomeModal() {
    console.log('🎯 Iniciando modal de bienvenida...');
    
    const modal = document.getElementById('glocalWelcome');
    const enterBtn = document.getElementById('enterGlocalBtn');
    
    // Si no encuentra los elementos, salir sin error
    if (!modal || !enterBtn) {
        console.log('⚠️ Modal no encontrado, continuando sin él');
        return;
    }
    
    // Verificar si ya se vio
    const hasSeenWelcome = sessionStorage.getItem('glocal_welcome_seen');
    if (hasSeenWelcome) {
        modal.style.display = 'none';
        return;
    }
    
    // Mostrar modal
    modal.style.display = 'flex';
    modal.classList.remove('hidden');
    
    // Evento del botón (una sola vez)
    enterBtn.addEventListener('click', function() {
        modal.classList.add('hidden');
        sessionStorage.setItem('glocal_welcome_seen', 'true');
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300);
    }, { once: true });
}

// ============================================
// VARIABLES GLOBALES
// ============================================

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
const logoutBtn = document.getElementById('logoutBtn');

// ============================================
// INFORMACIÓN DEL USUARIO
// ============================================

let user = { username: 'Usuario' };
try {
    user = JSON.parse(localStorage.getItem('user') || '{}');
} catch (e) {
    console.log('Error parsing user');
}

const usernameDisplay = document.getElementById('usernameDisplay');
const userBadge = document.getElementById('userBadge');

if (usernameDisplay) {
    usernameDisplay.textContent = user.username || 'Usuario';
}
if (userBadge && user.isCreator) {
    userBadge.textContent = '⚡ Creador';
}

// ============================================
// LOGOUT
// ============================================

if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/';
    });
}

// ============================================
// WEBSOCKET
// ============================================

function connectWebSocket() {
    const token = localStorage.getItem('token');
    
    if (!token) {
        console.log('No hay token, redirigiendo a login...');
        window.location.href = '/';
        return;
    }
    
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}?token=${token}`;
    
    console.log('Conectando a:', wsUrl);
    socket = new WebSocket(wsUrl);
    
    socket.onopen = () => {
        console.log('✅ WebSocket conectado');
        statusLed.className = 'status-led connected';
        statusText.textContent = 'Conectado';
        addSystemMessage('✅ Conectado al servidor');
        reconnectAttempts = 0;
    };
    
    socket.onmessage = (event) => {
        try {
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
        } catch (e) {
            console.log('Error procesando mensaje:', e);
        }
    };
    
    socket.onclose = (event) => {
        console.log('WebSocket cerrado:', event.code);
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
            addSystemMessage('❌ No se pudo reconectar');
        }
    };
    
    socket.onerror = (error) => {
        console.log('Error WebSocket:', error);
    };
}

// ============================================
// FUNCIONES DE ENVÍO
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
    console.log('🚀 Iniciando GLOCAL CHAT...');
    
    // Inicializar módulos
    initSidebar();
    initMessages();
    initUsers();
    
    // Event listeners
    if (sendBtn) sendBtn.addEventListener('click', sendMessage);
    if (messageInput) {
        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendMessage();
        });
    }
    
    if (changeNickBtn) changeNickBtn.addEventListener('click', changeNickname);
    if (nicknameInput) {
        nicknameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') changeNickname();
        });
    }
    
    // Conectar WebSocket
    connectWebSocket();
    
    // Mensajes de bienvenida
    addSystemMessage('🌍 Bienvenido a GLOCAL CHAT');
    addSystemMessage('💬 Chat global con usuarios únicos');
    
    // Iniciar modal de bienvenida (con seguro)
    setTimeout(initWelcomeModal, 500);
});