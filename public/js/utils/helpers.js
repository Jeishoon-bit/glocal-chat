// ============================================
// FUNCIONES AUXILIARES
// ============================================

export function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

export function getCurrentTime() {
    return new Date().toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
}

export function scrollToBottom(element) {
    element.scrollTo({
        top: element.scrollHeight,
        behavior: 'smooth'
    });
}

export function detectLanguage(text) {
    const hasSpanish = /[áéíóúñü¿?¡!]/i.test(text);
    return hasSpanish ? 'es' : 'en';
}