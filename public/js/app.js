import { initSidebar } from './ui/sidebar.js';
import { initMessages, addSystemMessage, addMessage } from './ui/messages.js';
import { initUsers, updateUserList } from './ui/users.js';
import { escapeHtml, detectLanguage } from './utils/helpers.js';

// ============================================
// MODAL DE BIENVENIDA GLOCAL CHAT
// ============================================

function initWelcomeModal() {
    const modal = document.getElementById('glocalWelcome');
    const enterBtn = document.getElementById('enterGlocalBtn');
    
    if (!modal || !enterBtn) return;
    
    // Verificar si ya vio la bienvenida en esta sesión
    const hasSeenWelcome = sessionStorage.getItem('glocal_welcome_seen');
    
    if (hasSeenWelcome) {
        modal.style.display = 'none';
        return;
    }
    
    modal.style.display = 'flex';
    modal.classList.remove('hidden');
    
    enterBtn.addEventListener('click', () => {
        modal.classList.add('hidden');
        sessionStorage.setItem('glocal_welcome_seen', 'true');
        
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300);
    });
}

let socket;
let myNickname = '';
let reconnectAttempts = 0;
const maxReconnectAttempts = 10;
const baseDelay = 1000;

const statusLed = document.getElementById('statusLed');
const statusText = document.getElementById('statusText');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const nicknameInput = document.getElementById('nicknameInput');
const changeNickBtn = document.getElementById('changeNickBtn');
const logoutBtn = document.getElementById('logoutBtn');

// Mostrar información del usuario
const user = JSON.parse(localStorage.getItem('user') || '{}');
const usernameDisplay = document.getElementById('usernameDisplay');
const userBadge = document.getElementById('userBadge');

if (usernameDisplay) {
    usernameDisplay.textContent = user.username || 'Usuario';
}
if (userBadge && user.isCreator) {
    userBadge.textContent = '⚡ Creador';
}

// Logout
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/';
    });
}

function connectWebSocket() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/';
        return;
    }
    
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}?token=${token}`;
    
    socket = new WebSocket(wsUrl);
    
    socket.onopen = () => {
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
}

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

document.addEventListener('DOMContentLoaded', () => {
    initSidebar();
    initMessages();
    initUsers();
    
    sendBtn.addEventListener('click', sendMessage);
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });
    
    changeNickBtn.addEventListener('click', changeNickname);
    nicknameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') changeNickname();
    });
    
    connectWebSocket();
    
    addSystemMessage('🌍 Bienvenido a GLOCAL CHAT');
    addSystemMessage('💬 Chat global con usuarios únicos');
    
    // Iniciar modal de bienvenida después de 500ms
    setTimeout(initWelcomeModal, 500);
});