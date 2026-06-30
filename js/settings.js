// js/settings.js

document.addEventListener('DOMContentLoaded', () => {
    loadSettings();
});

function switchSettingsTab(tabId, btn) {
    // Nav buttons
    document.querySelectorAll('.settings-nav button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    // Sections
    document.querySelectorAll('.settings-section').forEach(s => s.classList.remove('active'));
    document.getElementById(`settings-${tabId}`).classList.add('active');
}

function loadSettings() {
    const settings = JSON.parse(localStorage.getItem('settings')) || {
        companyName: 'CITY Installment Collection',
        currency: '₹',
        defaultBook: 'Monday'
    };

    document.getElementById('setCompanyName').value = settings.companyName;
    document.getElementById('setCurrency').value = settings.currency;
    document.getElementById('setDefaultBook').value = settings.defaultBook;
    
    // Set global variables if needed
    window.appCurrency = settings.currency;
}

function saveSettings() {
    const settings = {
        companyName: document.getElementById('setCompanyName').value,
        currency: document.getElementById('setCurrency').value,
        defaultBook: document.getElementById('setDefaultBook').value
    };

    localStorage.setItem('settings', JSON.stringify(settings));
    window.appCurrency = settings.currency;
    
    showNotification('Settings saved successfully!', 'success');
    
    // Update logo text if any
    const logoText = document.querySelector('.logo h2');
    if (logoText) logoText.innerText = settings.companyName;
}
