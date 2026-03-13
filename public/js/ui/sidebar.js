// ============================================
// SIDEBAR UI (menú móvil)
// ============================================

export function initSidebar() {
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    
    if (!menuToggle || !sidebar || !overlay) return;
    
    function toggleSidebar() {
        sidebar.classList.toggle('open');
        overlay.classList.toggle('hidden');
        menuToggle.textContent = sidebar.classList.contains('open') ? '✕' : '☰';
    }
    
    function closeSidebar() {
        sidebar.classList.remove('open');
        overlay.classList.add('hidden');
        menuToggle.textContent = '☰';
    }
    
    menuToggle.addEventListener('click', toggleSidebar);
    overlay.addEventListener('click', closeSidebar);
    
    // Cerrar al hacer click en elementos del sidebar (móvil)
    sidebar.querySelectorAll('.btn, .user-item').forEach(el => {
        el.addEventListener('click', () => {
            if (window.innerWidth <= 768) {
                setTimeout(closeSidebar, 100);
            }
        });
    });
    
    // Cerrar al redimensionar a desktop
    window.addEventListener('resize', () => {
        if (window.innerWidth > 768) closeSidebar();
    });
    
    return { toggleSidebar, closeSidebar };
}