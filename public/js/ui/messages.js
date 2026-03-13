// ============================================
// MANEJO DE MENSAJES EN LA UI
// ============================================

import { escapeHtml, getCurrentTime, scrollToBottom } from '../utils/helpers.js';

let messagesContainer;

export function initMessages() {
    messagesContainer = document.getElementById('messages');
    if (!messagesContainer) return;
}

export function addMessage(data, isOwn = false) {
    if (!messagesContainer) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isOwn ? 'own' : 'other'}`;
    
    const time = getCurrentTime();
    
    messageDiv.innerHTML = `
        <div class="message-header">
            <span class="message-user">${escapeHtml(data.user)}</span>
            <span class="message-time">${time}</span>
        </div>
        <div class="message-text">${escapeHtml(data.text)}</div>
    `;
    
    messagesContainer.appendChild(messageDiv);
    scrollToBottom(messagesContainer);
}

export function addSystemMessage(text) {
    if (!messagesContainer) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message system';
    messageDiv.textContent = text;
    messagesContainer.appendChild(messageDiv);
    scrollToBottom(messagesContainer);
}

export function clearMessages() {
    if (messagesContainer) {
        messagesContainer.innerHTML = '';
    }
}