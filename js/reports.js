// js/reports.js

let currentReportView = 'daily';

document.addEventListener('DOMContentLoaded', () => {
    // Set default date to today
    const reportDateInput = document.getElementById('reportDate');
    if (reportDateInput) {
        reportDateInput.valueAsDate = new Date();
    }
});

function loadReportView(view) {
    currentReportView = view;
    document.querySelectorAll('.report-category-buttons .report-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');

    const titleEl = document.getElementById('reportTitle');
    const dateInput = document.getElementById('reportDate');

    if (view === 'daily') {
        titleEl.innerText = 'Daily Collection Report';
        dateInput.style.display = 'block';
    } else if (view === 'weekly') {
        titleEl.innerText = 'Weekly Summary Report';
        dateInput.style.display = 'none'; // Could be changed to week picker
    } else if (view === 'outstanding') {
        titleEl.innerText = 'Outstanding Balances Report';
        dateInput.style.display = 'none';
    } else if (view === 'missed') {
        titleEl.innerText = 'Missed Collections Report';
        dateInput.style.display = 'block';
    }

    generateReport();
}

function generateReport() {
    const thead = document.getElementById('reportTableHeader');
    const tbody = document.getElementById('reportTableBody');
    const tfoot = document.getElementById('reportTableFooter');
    
    if (!thead || !tbody || !tfoot) return;

    thead.innerHTML = '';
    tbody.innerHTML = '';
    tfoot.innerHTML = '';

    if (currentReportView === 'daily') {
        generateDailyReport(thead, tbody, tfoot);
    } else if (currentReportView === 'weekly') {
        generateWeeklyReport(thead, tbody, tfoot);
    } else if (currentReportView === 'outstanding') {
        generateOutstandingReport(thead, tbody, tfoot);
    } else if (currentReportView === 'missed') {
        generateMissedReport(thead, tbody, tfoot);
    }
}

function generateDailyReport(thead, tbody, tfoot) {
    const dateStr = document.getElementById('reportDate').value;
    if (!dateStr) return;

    const collections = JSON.parse(localStorage.getItem('collections')) || [];
    const dailyColls = collections.filter(c => c.PaymentDate === dateStr && c.Status === 'Paid');

    thead.innerHTML = `
        <tr>
            <th>Receipt No</th>
            <th>Customer Name</th>
            <th>Book</th>
            <th>Method</th>
            <th>Time</th>
            <th style="text-align: right;">Amount Collected</th>
        </tr>
    `;

    let total = 0;

    if (dailyColls.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted">No collections recorded on this date.</td></tr>`;
        return;
    }

    dailyColls.forEach(c => {
        total += c.PaymentAmount;
        tbody.innerHTML += `
            <tr>
                <td>${c.ReceiptNumber}</td>
                <td><strong>${c.CustomerName}</strong> (${c.CustomerID})</td>
                <td>${c.CollectionBook}</td>
                <td>${c.PaymentMethod}</td>
                <td>${c.PaymentTime}</td>
                <td style="text-align: right; color: var(--success); font-weight: bold;">${formatCurrency(c.PaymentAmount)}</td>
            </tr>
        `;
    });

    tfoot.innerHTML = `
        <tr style="background-color: rgba(255,255,255,0.05);">
            <th colspan="5" style="text-align: right; font-size: 1.1rem;">Total Collection:</th>
            <th style="text-align: right; font-size: 1.2rem; color: var(--success);">${formatCurrency(total)}</th>
        </tr>
    `;
}

function generateWeeklyReport(thead, tbody, tfoot) {
    // Simplified summary of all active installments grouped by book
    const installments = JSON.parse(localStorage.getItem('installments')) || [];
    const active = installments.filter(i => i.Status === 'Active');

    thead.innerHTML = `
        <tr>
            <th>Collection Book</th>
            <th>Active Customers</th>
            <th style="text-align: right;">Expected Weekly Collection</th>
        </tr>
    `;

    const books = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Common'];
    let grandTotal = 0;
    let totalCustomers = 0;

    books.forEach(book => {
        const bookInsts = active.filter(i => i.CollectionBook === book + ' Book' || i.CollectionBook === book); // Handle both strings
        const custCount = bookInsts.length;
        const expected = bookInsts.reduce((sum, i) => sum + i.WeeklyInstallment, 0);

        grandTotal += expected;
        totalCustomers += custCount;

        tbody.innerHTML += `
            <tr>
                <td><strong>${book} Book</strong></td>
                <td>${custCount}</td>
                <td style="text-align: right;">${formatCurrency(expected)}</td>
            </tr>
        `;
    });

    tfoot.innerHTML = `
        <tr style="background-color: rgba(255,255,255,0.05);">
            <th>Total:</th>
            <th>${totalCustomers} Customers</th>
            <th style="text-align: right; font-size: 1.2rem; color: var(--primary);">${formatCurrency(grandTotal)} / week</th>
        </tr>
    `;
}

function generateOutstandingReport(thead, tbody, tfoot) {
    const customers = JSON.parse(localStorage.getItem('customers')) || [];
    const activeCusts = customers.filter(c => c.OutstandingBalance > 0);
    
    // Sort by highest balance
    activeCusts.sort((a, b) => b.OutstandingBalance - a.OutstandingBalance);

    thead.innerHTML = `
        <tr>
            <th>Customer ID</th>
            <th>Name & Phone</th>
            <th>Book</th>
            <th style="text-align: right;">Outstanding Balance</th>
        </tr>
    `;

    let totalOut = 0;

    if (activeCusts.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-center text-muted">No outstanding balances.</td></tr>`;
        return;
    }

    activeCusts.forEach(c => {
        totalOut += c.OutstandingBalance;
        tbody.innerHTML += `
            <tr>
                <td>${c.CustomerID}</td>
                <td><strong>${c.CustomerName}</strong><br><small>${c.Phone}</small></td>
                <td>${c.CollectionBook}</td>
                <td style="text-align: right; color: var(--warning); font-weight: bold;">${formatCurrency(c.OutstandingBalance)}</td>
            </tr>
        `;
    });

    tfoot.innerHTML = `
        <tr style="background-color: rgba(255,255,255,0.05);">
            <th colspan="3" style="text-align: right; font-size: 1.1rem;">Total Outstanding in Market:</th>
            <th style="text-align: right; font-size: 1.2rem; color: var(--warning);">${formatCurrency(totalOut)}</th>
        </tr>
    `;
}

function generateMissedReport(thead, tbody, tfoot) {
    const dateStr = document.getElementById('reportDate').value;
    if (!dateStr) return;

    const collections = JSON.parse(localStorage.getItem('collections')) || [];
    const missedColls = collections.filter(c => c.PaymentDate === dateStr && c.Status === 'Missed');

    thead.innerHTML = `
        <tr>
            <th>Customer Name</th>
            <th>Book</th>
            <th>Remarks</th>
            <th style="text-align: right;">Missed Amount</th>
        </tr>
    `;

    let total = 0;

    if (missedColls.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-center text-muted">No missed collections recorded on this date.</td></tr>`;
        return;
    }

    missedColls.forEach(c => {
        // Find installment to get the weekly amount that was missed
        const installments = JSON.parse(localStorage.getItem('installments')) || [];
        const inst = installments.find(i => i.InstallmentID === c.InstallmentID);
        const missedAmount = inst ? inst.WeeklyInstallment : 0;
        
        total += missedAmount;
        tbody.innerHTML += `
            <tr>
                <td><strong>${c.CustomerName}</strong> (${c.CustomerID})</td>
                <td>${c.CollectionBook}</td>
                <td>${c.Remarks || '-'}</td>
                <td style="text-align: right; color: var(--danger); font-weight: bold;">${formatCurrency(missedAmount)}</td>
            </tr>
        `;
    });

    tfoot.innerHTML = `
        <tr style="background-color: rgba(255,255,255,0.05);">
            <th colspan="3" style="text-align: right; font-size: 1.1rem;">Total Value Missed:</th>
            <th style="text-align: right; font-size: 1.2rem; color: var(--danger);">${formatCurrency(total)}</th>
        </tr>
    `;
}

function printReport() {
    window.print();
}
