// js/backup.js

document.addEventListener('DOMContentLoaded', () => {
    loadAutoBackupPref();
});

// JSON Export Full Backup
function exportDataBackup() {
    const backup = {
        customers: JSON.parse(localStorage.getItem('customers')) || [],
        products: JSON.parse(localStorage.getItem('products')) || [],
        installments: JSON.parse(localStorage.getItem('installments')) || [],
        collections: JSON.parse(localStorage.getItem('collections')) || [],
        settings: JSON.parse(localStorage.getItem('settings')) || {}
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backup, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `CITY_Backup_${new Date().toLocaleDateString('en-CA')}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    
    showNotification('Full system backup downloaded successfully.', 'success');
}

// JSON Import
function handleImportBackup(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            if (data.customers && data.products && data.installments && data.collections) {
                if(confirm('Warning: This will overwrite ALL current data with the backup data. Are you sure?')) {
                    localStorage.setItem('customers', JSON.stringify(data.customers));
                    localStorage.setItem('products', JSON.stringify(data.products));
                    localStorage.setItem('installments', JSON.stringify(data.installments));
                    localStorage.setItem('collections', JSON.stringify(data.collections));
                    if(data.settings) localStorage.setItem('settings', JSON.stringify(data.settings));
                    
                    showNotification('Backup restored successfully! Reloading application...', 'success');
                    setTimeout(() => window.location.reload(), 1500);
                }
            } else {
                showNotification('Invalid backup file format.', 'error');
            }
        } catch (error) {
            showNotification('Error reading backup file.', 'error');
        }
    };
    reader.readAsText(file);
    event.target.value = ''; // reset input
}

// CSV Export
function exportCSV(tableName) {
    const data = JSON.parse(localStorage.getItem(tableName)) || [];
    if (data.length === 0) {
        showNotification(`No data found for ${tableName} to export.`, 'warning');
        return;
    }

    // Extract headers
    const headers = Object.keys(data[0]);
    
    // Convert array of objects to CSV string
    const csvRows = [];
    csvRows.push(headers.join(',')); // Add header row

    for (const row of data) {
        const values = headers.map(header => {
            const val = row[header] !== null && row[header] !== undefined ? row[header] : '';
            const escaped = ('' + val).replace(/"/g, '""'); // Escape double quotes
            return `"${escaped}"`;
        });
        csvRows.push(values.join(','));
    }

    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", url);
    downloadAnchorNode.setAttribute("download", `CITY_${tableName}_${new Date().toLocaleDateString('en-CA')}.csv`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    
    showNotification(`${tableName} exported to CSV successfully.`, 'success');
}

// Auto Backup Preferences
function saveAutoBackupPref() {
    const pref = document.getElementById('autoBackupPref').value;
    localStorage.setItem('autoBackupPref', pref);
    showNotification(`Auto backup preference set to: ${pref}`, 'success');
}

function loadAutoBackupPref() {
    const pref = localStorage.getItem('autoBackupPref') || 'none';
    const select = document.getElementById('autoBackupPref');
    if (select) {
        select.value = pref;
    }
}

// Factory Reset
function factoryReset() {
    if (confirm('CRITICAL WARNING: This will DELETE ALL DATA (Customers, Products, Installments, Collections) and reset the system to factory defaults. This action CANNOT be undone. Type "RESET" to confirm.')) {
        const userInput = prompt('Type "RESET" to confirm deletion of all data:');
        if (userInput === 'RESET') {
            localStorage.clear();
            showNotification('System has been reset. Reloading...', 'success');
            setTimeout(() => window.location.reload(), 1500);
        } else {
            showNotification('Factory reset cancelled.', 'warning');
        }
    }
}
