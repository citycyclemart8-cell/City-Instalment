// js/dashboard.js

document.addEventListener('DOMContentLoaded', () => {
    // Initial load
    loadDashboard();
});

function loadDashboard() {
    loadStatistics();
    loadRecentCollections();
    loadBookSummaries();
    loadDueCustomers();
    updateBackupStatus();
    renderCharts();
}

function loadStatistics() {
    const customers = JSON.parse(localStorage.getItem('customers')) || [];
    const installments = JSON.parse(localStorage.getItem('installments')) || [];
    const collections = JSON.parse(localStorage.getItem('collections')) || [];
    const todayStr = new Date().toISOString().split('T')[0];
    
    // Total Customers
    const elTC = document.getElementById('dashTotalCustomers'); if(elTC) elTC.innerText = customers.length;

    // Active Installments
    const activeInstallments = installments.filter(i => i.Status === 'Active');
    const elAI = document.getElementById('dashActiveInstallments'); if(elAI) elAI.innerText = activeInstallments.length;

    // Outstanding Balance (Total Market Pending)
    let totalOutstanding = 0;
    activeInstallments.forEach(i => totalOutstanding += i.OutstandingBalance);
    const elOB = document.getElementById('dashOutstandingBalance'); if(elOB) elOB.innerText = formatCurrency(totalOutstanding);

    // Collections metrics
    let todayTotal = 0;
    let weeklyTotal = 0;
    let monthlyTotal = 0;
    
    const now = new Date();
    const currentMonthStr = todayStr.substring(0, 7); // YYYY-MM
    
    // For weekly, let's just sum the past 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];

    collections.forEach(c => {
        if (c.Status === 'Paid' && c.PaymentDate) {
            // Today
            if (c.PaymentDate === todayStr) {
                todayTotal += c.PaymentAmount;
            }
            // Weekly (last 7 days)
            if (c.PaymentDate >= sevenDaysAgoStr && c.PaymentDate <= todayStr) {
                weeklyTotal += c.PaymentAmount;
            }
            // Monthly
            if (c.PaymentDate.startsWith(currentMonthStr)) {
                monthlyTotal += c.PaymentAmount;
            }
        }
    });

    const elTT = document.getElementById('dashTodayTotal'); if(elTT) elTT.innerText = formatCurrency(todayTotal);
    const elWC = document.getElementById('dashWeeklyCollection'); if(elWC) elWC.innerText = formatCurrency(weeklyTotal);
    const elMC = document.getElementById('dashMonthlyCollection'); if(elMC) elMC.innerText = formatCurrency(monthlyTotal);

    // Overdue Customers & Pending Today
    let overdueCount = 0;
    let pendingTodayCount = 0;

    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const todayDayName = days[now.getDay()];

    activeInstallments.forEach(i => {
        // If they missed a payment ever, or outstanding is very old. 
        // For simplicity, let's say they are overdue if they missed a collection today or in the past
        const misses = collections.filter(c => c.InstallmentID === i.InstallmentID && c.Status === 'Missed');
        if (misses.length > 0) overdueCount++;

        // Pending today: they belong to today's book, and haven't paid or missed today yet
        if (i.CollectionBook.includes(todayDayName) || i.CollectionBook.includes('Common')) {
            const actedToday = collections.find(c => c.InstallmentID === i.InstallmentID && c.PaymentDate === todayStr);
            if (!actedToday) pendingTodayCount++;
        }
    });

    // Handle distinct overdue customers
    const elOC = document.getElementById('dashOverdueCustomers'); if(elOC) elOC.innerText = overdueCount; // could be activeInstallments.filter...
    const elPC = document.getElementById('dashPendingCollectionsToday'); if(elPC) elPC.innerText = pendingTodayCount;
}
function loadRecentCollections() {
    const collections = JSON.parse(localStorage.getItem('collections')) || [];
    const installments = JSON.parse(localStorage.getItem('installments')) || [];
    const tbody = document.getElementById('dashRecentCollectionsList');
    if (!tbody) return;

    tbody.innerHTML = '';

    // Get last 5 paid collections
    const paidCollections = collections.filter(c => c.Status === 'Paid').reverse().slice(0, 5);

    if (paidCollections.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted">No recent collections found.</td></tr>`;
        return;
    }

    paidCollections.forEach(c => {
        const inst = installments.find(i => i.InstallmentID === c.InstallmentID) || {};
        const remaining = inst.OutstandingBalance !== undefined ? formatCurrency(inst.OutstandingBalance) : '-';
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${c.CustomerName}</td>
            <td>${c.ProductName || '-'}</td>
            <td><span class="badge" style="background-color: var(--${c.CollectionBook.toLowerCase().replace(' book', '')}-color); position: static;">${c.CollectionBook}</span></td>
            <td><strong>${formatCurrency(c.PaymentAmount)}</strong></td>
            <td>${c.PaymentTime || '-'}</td>
            <td>${remaining}</td>
            <td><span class="badge-status completed">Paid</span></td>
        `;
        tbody.appendChild(tr);
    });
}function loadBookSummaries() {
    const installments = JSON.parse(localStorage.getItem('installments')) || [];
    const collections = JSON.parse(localStorage.getItem('collections')) || [];
    const activeInsts = installments.filter(i => i.Status === 'Active');
    const todayStr = new Date().toISOString().split('T')[0];

    const books = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Common'];

    books.forEach(book => {
        const bookInsts = activeInsts.filter(i => i.CollectionBook === book + ' Book' || i.CollectionBook === book);
        const customersCount = bookInsts.length;

        // Today's collection for this book
        const bookCollsToday = collections.filter(c => 
            c.PaymentDate === todayStr && 
            c.Status === 'Paid' && 
            (c.CollectionBook === book + ' Book' || c.CollectionBook === book)
        );
        const collectedToday = bookCollsToday.reduce((sum, c) => sum + c.PaymentAmount, 0);

        // Pending today for this book
        let pendingToday = 0;
        bookInsts.forEach(i => {
            const acted = collections.find(c => c.InstallmentID === i.InstallmentID && c.PaymentDate === todayStr);
            if (!acted) pendingToday++;
        });

        // Weekly collection (last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];

        const bookCollsWeekly = collections.filter(c => 
            c.PaymentDate >= sevenDaysAgoStr && 
            c.PaymentDate <= todayStr && 
            c.Status === 'Paid' && 
            (c.CollectionBook === book + ' Book' || c.CollectionBook === book)
        );
        const collectedWeekly = bookCollsWeekly.reduce((sum, c) => sum + c.PaymentAmount, 0);

        // Update DOM
        const elCust = document.getElementById(`dash${book}Cust`);
        const elColl = document.getElementById(`dash${book}Coll`);
        const elPend = document.getElementById(`dash${book}Pend`);
        const elWeekly = document.getElementById(`weekly${book}`);

        if (elCust) elCust.innerText = customersCount;
        if (elColl) elColl.innerText = formatCurrency(collectedToday);
        if (elPend) elPend.innerText = pendingToday;
        if (elWeekly) elWeekly.innerText = formatCurrency(collectedWeekly);
    });
}
// Format Currency Utility globally attached if not present
window.formatCurrency = function(amount) {
    const currency = window.appCurrency || '₹';
    return currency + parseFloat(amount).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
};




function loadDueCustomers() {
    const installments = JSON.parse(localStorage.getItem('installments')) || [];
    const collections = JSON.parse(localStorage.getItem('collections')) || [];
    const tbody = document.getElementById('dashDueCustomersList');
    if (!tbody) return;

    tbody.innerHTML = '';

    const activeInsts = installments.filter(i => i.Status === 'Active');
    let dueCustomers = [];

    activeInsts.forEach(i => {
        const misses = collections.filter(c => c.InstallmentID === i.InstallmentID && c.Status === 'Missed');
        if (misses.length > 0) {
            dueCustomers.push({
                CustomerName: i.CustomerName,
                Phone: i.Phone || '-',
                CollectionBook: i.CollectionBook,
                OutstandingBalance: i.OutstandingBalance,
                MissedCount: misses.length
            });
        }
    });

    if (dueCustomers.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">No due customers found.</td></tr>`;
        return;
    }

    dueCustomers.slice(0, 5).forEach(c => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${c.CustomerName}</td>
            <td>${c.Phone}</td>
            <td><span class="badge" style="background-color: var(--${c.CollectionBook.toLowerCase().replace(' book', '')}-color); position: static;">${c.CollectionBook}</span></td>
            <td><strong>${formatCurrency(c.OutstandingBalance)}</strong></td>
            <td><span class="badge-status ch-missed">${c.MissedCount} Missed</span></td>
        `;
        tbody.appendChild(tr);
    });
}

function updateBackupStatus() {
    const elLast = document.getElementById('dashLastBackup');
    const elStatus = document.getElementById('dashDbStatus');
    if (elLast) {
        const last = localStorage.getItem('lastBackupDate');
        elLast.innerText = last ? new Date(last).toLocaleString() : 'Not Configured';
    }
    if (elStatus) {
        elStatus.innerText = 'Healthy';
        elStatus.className = 'text-success';
    }
}


