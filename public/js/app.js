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
// 🎵 NUEVA SECCIÓN DE MÚSICA (PANEL APARTE)
// ============================================

// Elementos del panel de música
const openMusicBtn = document.getElementById('openMusicBtn');
const closeMusicBtn = document.getElementById('closeMusicBtn');
const musicOverlay = document.getElementById('musicOverlay');
const musicIndicator = document.getElementById('musicIndicator');

// Elementos del reproductor (los mismos de antes pero ahora en el panel)
const muteBtn = document.getElementById('personalMuteBtn');
const searchInput = document.getElementById('songSearch');
const searchBtn = document.getElementById('searchBtn');
const searchResults = document.getElementById('searchResults');
const queueList = document.getElementById('queueList');
const queueCount = document.getElementById('queueCount');
const currentSongTitle = document.getElementById('currentSongTitle');
const currentSongArtist = document.getElementById('currentSongArtist');
const songProgress = document.getElementById('songProgress');
const currentTimeSpan = document.getElementById('currentTime');
const totalTimeSpan = document.getElementById('totalTime');

// Estado de la música
let isMusicActive = false;
let isMuted = false;
let currentQueue = [];
let currentProgress = 0;
let musicInterval = null;
let isMusicPanelOpen = false;

// ============================================
// FUNCIONES DEL PANEL DE MÚSICA
// ============================================

// Abrir panel de música
if (openMusicBtn) {
    openMusicBtn.addEventListener('click', () => {
        musicOverlay.classList.add('active');
        isMusicPanelOpen = true;
    });
}

// Cerrar panel de música
if (closeMusicBtn) {
    closeMusicBtn.addEventListener('click', () => {
        musicOverlay.classList.remove('active');
        isMusicPanelOpen = false;
    });
}

// Cerrar con tecla ESC
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && musicOverlay.classList.contains('active')) {
        musicOverlay.classList.remove('active');
        isMusicPanelOpen = false;
    }
});

// Cerrar haciendo clic fuera del panel
if (musicOverlay) {
    musicOverlay.addEventListener('click', (e) => {
        if (e.target === musicOverlay) {
            musicOverlay.classList.remove('active');
            isMusicPanelOpen = false;
        }
    });
}

// ============================================
// FUNCIONES DEL REPRODUCTOR (adaptadas)
// ============================================

// Inicializar música
function initMusic() {
    console.log('🎵 Inicializando sección de música...');

    // Botón de silencio individual
    if (muteBtn) {
        muteBtn.addEventListener('click', () => {
            isMuted = !isMuted;
            const icon = muteBtn.querySelector('.mute-icon');
            const text = muteBtn.querySelector('.mute-text');
            
            if (isMuted) {
                muteBtn.classList.add('muted');
                icon.textContent = '🔇';
                text.textContent = 'Silenciado';
                if (musicInterval) {
                    clearInterval(musicInterval);
                    musicInterval = null;
                }
            } else {
                muteBtn.classList.remove('muted');
                icon.textContent = '🔊';
                text.textContent = 'Escuchando';
                startMusicSimulation();
            }
        });
    }

    // Buscador de canciones
    if (searchBtn && searchInput) {
        searchBtn.addEventListener('click', performSearch);
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') performSearch();
        });
    }

    // Cerrar resultados al hacer click fuera
    document.addEventListener('click', (e) => {
        if (searchResults && 
            !searchResults.contains(e.target) && 
            e.target !== searchBtn && 
            e.target !== searchInput) {
            searchResults.classList.remove('active');
            searchResults.style.display = 'none';
        }
    });

    // Iniciar simulación de música
    startMusicSimulation();
}

// Función de búsqueda
function performSearch() {
    const query = searchInput.value.trim();
    if (!query) return;
    
    // Simular resultados de búsqueda
    const mockResults = [
        { title: 'Mi favorita - Feid', duration: '3:30', artist: 'Feid' },
        { title: 'Luna - Feid', duration: '2:45', artist: 'Feid' },
        { title: 'Provenza - Karol G', duration: '3:20', artist: 'Karol G' },
        { title: 'Monastery - Ryan Castro', duration: '2:50', artist: 'Ryan Castro' },
        { title: 'Ferxxo 100 - Feid', duration: '2:45', artist: 'Feid' },
        { title: 'Classy 101 - Feid', duration: '3:15', artist: 'Feid' }
    ];
    
    // Mostrar resultados
    searchResults.innerHTML = '';
    mockResults.forEach(result => {
        const resultDiv = document.createElement('div');
        resultDiv.className = 'search-result-item';
        resultDiv.innerHTML = `
            <div class="result-info">
                <span class="result-title">${result.title}</span>
                <span class="result-duration">${result.duration}</span>
            </div>
            <button class="add-result-btn" onclick="window.addToQueue('${result.title}', '${result.artist}', '${result.duration}')">➕ Agregar</button>
        `;
        searchResults.appendChild(resultDiv);
    });
    
    searchResults.classList.add('active');
    searchResults.style.display = 'block';
}

// Función para agregar a la cola
window.addToQueue = function(title, artist, duration) {
    if (!queueList) return;
    
    const emptyMsg = queueList.querySelector('.queue-empty');
    if (emptyMsg) {
        emptyMsg.remove();
    }
    
    // Crear elemento de la cola
    const queueItem = document.createElement('div');
    queueItem.className = 'queue-item';
    queueItem.innerHTML = `
        <span class="song-name">${title}</span>
        <span class="song-duration">${duration}</span>
    `;
    
    queueList.appendChild(queueItem);
    
    // Actualizar contador
    currentQueue.push({ title, artist, duration });
    if (queueCount) {
        queueCount.textContent = currentQueue.length;
    }
    
    // Actualizar indicador de música
    updateMusicIndicator();
    
    // Si es la primera canción, empezar a reproducir
    if (currentQueue.length === 1 && !isMusicActive) {
        playNextSong();
    }
    
    // Cerrar resultados
    searchResults.classList.remove('active');
    searchResults.style.display = 'none';
    searchInput.value = '';
};

// Función para reproducir siguiente canción
function playNextSong() {
    if (currentQueue.length === 0) {
        if (currentSongTitle) {
            currentSongTitle.textContent = 'Ninguna canción';
        }
        if (currentSongArtist) {
            currentSongArtist.textContent = '';
        }
        isMusicActive = false;
        updateMusicIndicator();
        return;
    }
    
    const nextSong = currentQueue[0];
    if (currentSongTitle) {
        currentSongTitle.textContent = nextSong.title;
    }
    if (currentSongArtist) {
        currentSongArtist.textContent = nextSong.artist;
    }
    
    isMusicActive = true;
    currentProgress = 0;
    updateMusicIndicator();
    
    // Simular duración total
    if (totalTimeSpan) {
        totalTimeSpan.textContent = nextSong.duration;
    }
}

// Simular progreso de la música
function startMusicSimulation() {
    if (musicInterval) {
        clearInterval(musicInterval);
    }
    
    musicInterval = setInterval(() => {
        if (isMusicActive && !isMuted && currentQueue.length > 0) {
            // Avanzar progreso
            currentProgress = (currentProgress + 1) % 100;
            
            if (songProgress) {
                songProgress.style.width = currentProgress + '%';
            }
            
            // Calcular tiempo actual
            if (currentQueue.length > 0 && currentTimeSpan) {
                const currentSong = currentQueue[0];
                const durationParts = currentSong.duration.split(':');
                const totalSeconds = parseInt(durationParts[0]) * 60 + parseInt(durationParts[1]);
                const currentSeconds = Math.floor((currentProgress / 100) * totalSeconds);
                const minutes = Math.floor(currentSeconds / 60);
                const seconds = currentSeconds % 60;
                currentTimeSpan.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            }
            
            // Si llegó al final, pasar a la siguiente
            if (currentProgress >= 99) {
                // Eliminar la canción actual de la cola
                currentQueue.shift();
                
                // Actualizar la cola visual
                if (queueList) {
                    const firstItem = queueList.querySelector('.queue-item');
                    if (firstItem) {
                        firstItem.remove();
                    }
                }
                
                if (queueCount) {
                    queueCount.textContent = currentQueue.length;
                }
                
                // Actualizar indicador
                updateMusicIndicator();
                
                // Reproducir siguiente
                if (currentQueue.length > 0) {
                    playNextSong();
                } else {
                    isMusicActive = false;
                    if (currentSongTitle) {
                        currentSongTitle.textContent = 'Ninguna canción';
                    }
                    if (currentSongArtist) {
                        currentSongArtist.textContent = '';
                    }
                    if (songProgress) {
                        songProgress.style.width = '0%';
                    }
                    if (currentTimeSpan) {
                        currentTimeSpan.textContent = '0:00';
                    }
                }
            }
        }
    }, 300);
}

// Actualizar indicador de música en el sidebar
function updateMusicIndicator() {
    if (musicIndicator) {
        if (currentQueue.length > 0) {
            musicIndicator.style.background = '#4cd964';
            musicIndicator.style.animation = 'pulse 2s infinite';
        } else {
            musicIndicator.style.background = '#ff3b30';
            musicIndicator.style.animation = 'none';
        }
    }
}

// ============================================
// INICIALIZACIÓN (MODIFICADA)
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
    addSystemMessage('🎵 Nueva sala de música disponible');
    
    // Inicializar música
    initMusic();
    
    // Actualizar indicador al inicio
    updateMusicIndicator();
});