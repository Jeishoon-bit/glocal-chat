// ============================================
// LISTA DE USUARIOS
// ============================================

import { escapeHtml } from '../utils/helpers.js';

let userListEl;
let onlineCountEl;

export function initUsers() {
    userListEl = document.getElementById('userList');
    onlineCountEl = document.getElementById('onlineCount');
}

export function updateUserList(users) {
    if (!userListEl || !onlineCountEl) return;
    
    userListEl.innerHTML = '';
    onlineCountEl.textContent = `${users.length} ${users.length === 1 ? 'conectado' : 'conectados'}`;
    
    users.forEach(user => {
        const userDiv = document.createElement('div');
        userDiv.className = 'user-item';
        
        const flag = user.language === 'es' ? '🇪🇸' : '🇬🇧';
        
        userDiv.innerHTML = `
            <span class="user-nick">${escapeHtml(user.nickname)}</span>
            <span class="user-lang">${flag}</span>
        `;
        
        userListEl.appendChild(userDiv);
    });
}