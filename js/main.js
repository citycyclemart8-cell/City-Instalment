// js/main.js
document.addEventListener('DOMContentLoaded', () => {
    // Initialize LocalStorage Structure
    initLocalStorage();
    
    // Live Clock & Date
    updateClock();
    setInterval(updateClock, 1000);
    
    // Sidebar Toggle
    const sidebarToggleBtn = document.getElementById('sidebarToggleBtn');
    const sidebar = document.getElementById('sidebar');
    if (sidebarToggleBtn && sidebar) {
        sidebarToggleBtn.addEventListener('click', () => {
            sidebar.classList.toggle('collapsed');
        });
    }

    // SPA Routing
    setupRouting();

    // Notifications toggle
    const notificationBtn = document.getElementById('notificationBtn');
    const notificationDropdown = document.getElementById('notificationDropdown');
    if (notificationBtn && notificationDropdown) {
        notificationBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            notificationDropdown.classList.toggle('hidden');
        });
        document.addEventListener('click', (e) => {
            if (!notificationBtn.contains(e.target) && !notificationDropdown.contains(e.target)) {
                notificationDropdown.classList.add('hidden');
            }
        });
    }
});

// Setup SPA Routing
function setupRouting() {
    const navItems = document.querySelectorAll('#navMenu li');
    const pages = document.querySelectorAll('.page');
    const placeholderPage = document.getElementById('placeholder');

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const target = item.getAttribute('data-target');
            
            // Remove active class from all nav items
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');

            // Hide all pages
            pages.forEach(page => page.classList.remove('active'));

            // Show target page or placeholder
            const targetPage = document.getElementById(target);
            if (targetPage && target === 'dashboard') {
                targetPage.classList.add('active');
                if (typeof loadDashboard === 'function') loadDashboard();
            } else if (targetPage && target === 'paymentHistory') {
                targetPage.classList.add('active');
                if (typeof loadPhCustomers === 'function') loadPhCustomers();
            } else if (targetPage) {
                targetPage.classList.add('active');
            } else {
                placeholderPage.classList.add('active');
                placeholderPage.classList.remove('hidden');
            }
        });
    });
}

// Live Clock
function updateClock() {
    const now = new Date();
    
    const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('currentDate').textContent = now.toLocaleDateString('en-IN', dateOptions);
    
    let hours = now.getHours();
    let minutes = now.getMinutes();
    let seconds = now.getSeconds();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    
    hours = hours % 12;
    hours = hours ? hours : 12; 
    minutes = minutes < 10 ? '0' + minutes : minutes;
    seconds = seconds < 10 ? '0' + seconds : seconds;
    
    document.getElementById('liveClock').textContent = `${hours}:${minutes}:${seconds} ${ampm}`;
}

// Global Toast Notification System
function showNotification(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = 'fa-info-circle';
    if (type === 'success') icon = 'fa-check-circle';
    if (type === 'error') icon = 'fa-times-circle';
    if (type === 'warning') icon = 'fa-exclamation-triangle';
    
    toast.innerHTML = `
        <i class="fa-solid ${icon}"></i>
        <span>${message}</span>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// Global Alert for Feature not available
function showFeatureAlert(featureName) {
    showNotification(`${featureName} will be available in the next module.`, 'warning');
}

// Initialize LocalStorage Data Structure
function initLocalStorage() {
    const keys = ['customers', 'products', 'installments', 'collections', 'reports', 'settings', 'backup'];
    keys.forEach(key => {
        if (!localStorage.getItem(key)) {
            if (key === 'settings') {
                localStorage.setItem(key, JSON.stringify({}));
            } else {
                localStorage.setItem(key, JSON.stringify([]));
            }
        }
    });
}

// Format Currency
function formatCurrency(amount) {
    return '₹' + parseFloat(amount).toLocaleString('en-IN', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    });
}

// Global Enter Key Navigation
document.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
        const target = e.target;
        if (target.tagName === 'INPUT' || target.tagName === 'SELECT') {
            e.preventDefault();
            if (target.id === 'globalSearch') {
                // Handle global search
                const searchTerm = target.value;
                const custNav = document.querySelector('li[data-target="customers"]');
                if (custNav) custNav.click(); // Switch to customers page
                const custSearch = document.getElementById('customerSearch');
                if (custSearch) {
                    custSearch.value = searchTerm;
                    if(typeof searchCustomers === 'function') searchCustomers(searchTerm);
                }
            } else {
                // Focus next input element in the form
                const form = target.closest('form') || target.closest('.modal-content') || document;
                const focusable = Array.from(form.querySelectorAll('input:not([type="hidden"]), select, textarea, button[type="submit"], button[onclick*="save"]'))
                                     .filter(el => !el.disabled && el.offsetParent !== null);
                const index = focusable.indexOf(target);
                if (index > -1 && index + 1 < focusable.length) {
                    focusable[index + 1].focus();
                }
            }
        }
    }
});

// Trigger search when search icon is clicked
document.addEventListener('DOMContentLoaded', () => {
    const searchIcon = document.querySelector('.search-box .fa-magnifying-glass');
    if(searchIcon) {
        searchIcon.style.cursor = 'pointer';
        searchIcon.addEventListener('click', () => {
            const input = document.getElementById('globalSearch');
            input.focus();
            const e = new KeyboardEvent('keydown', { key: 'Enter' });
            input.dispatchEvent(e);
        });
    }
});

