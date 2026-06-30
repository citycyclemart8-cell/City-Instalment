// js/collections.js

let currentCollectionBook = 'Monday';
let currentReceivingInstallmentId = null;

document.addEventListener('DOMContentLoaded', () => {
    // Initial Load
    // Wait slightly to ensure installments/customers are loaded if needed
    setTimeout(() => {
        loadCollections(currentCollectionBook);
    }, 100);

    // Book Filter Logic
    document.querySelectorAll('#collectionBookFilters .book-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('#collectionBookFilters .book-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentCollectionBook = e.target.dataset.book;
            loadCollections(currentCollectionBook);
        });
    });

    // Sub-filters (All, Paid Today, Pending, Missed)
    document.querySelectorAll('#collections .filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('#collections .filter-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            filterCollectionsStatus(e.target.dataset.filter);
        });
    });

    // Search Logic
    document.getElementById('collectionSearch')?.addEventListener('input', (e) => {
        searchCollections(e.target.value);
    });
});

function loadCollections(book) {
    const tbody = document.getElementById('collectionsTableBody');
    if (!tbody) return;

    document.getElementById('collCurrentBookTitle').innerText = `${book} Book Collection`;
    
    // Get all active installments for this book
    const installments = JSON.parse(localStorage.getItem('installments')) || [];
    const activeInstallments = installments.filter(i => i.CollectionBook === book && i.Status === 'Active');

    // Get today's collections for this book
    const collections = JSON.parse(localStorage.getItem('collections')) || [];
    const todayStr = new Date().toISOString().split('T')[0];
    
    let totalBookCollectedToday = 0;
    let pendingCustomersCount = 0;

    tbody.innerHTML = '';

    if (activeInstallments.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted">No active customers in ${book} Book.</td></tr>`;
        document.getElementById('collCurrentBookTotal').innerText = formatCurrency(0);
        document.getElementById('collCurrentBookPending').innerText = '0';
        return;
    }

    activeInstallments.forEach(i => {
        // Check if paid today
        const todaysPayment = collections.find(c => c.InstallmentID === i.InstallmentID && c.PaymentDate === todayStr);
        
        let actionHtml = '';
        let rowStyle = '';

        if (todaysPayment) {
            if (todaysPayment.Status === 'Missed') {
                actionHtml = `<span class="badge-status cancelled"><i class="fa-solid fa-xmark"></i> Missed</span>`;
                rowStyle = 'opacity: 0.7;';
            } else {
                actionHtml = `<span class="badge-status completed"><i class="fa-solid fa-check"></i> Paid ${formatCurrency(todaysPayment.PaymentAmount)}</span>`;
                totalBookCollectedToday += todaysPayment.PaymentAmount;
            }
        } else {
            actionHtml = `<button class="btn btn-success btn-sm" onclick="openCollectionModal('${i.InstallmentID}')"><i class="fa-solid fa-money-bill-wave"></i> Receive</button>`;
            pendingCustomersCount++;
        }

        const tr = document.createElement('tr');
        tr.style = rowStyle;
        tr.innerHTML = `
            <td>${i.CustomerID}</td>
            <td><strong>${i.CustomerName}</strong></td>
            <td>${JSON.parse(localStorage.getItem('customers')).find(c=>c.CustomerID === i.CustomerID)?.Phone || '-'}</td>
            <td>${i.ProductName}</td>
            <td>${formatCurrency(i.WeeklyInstallment)}</td>
            <td><strong>${formatCurrency(i.OutstandingBalance)}</strong></td>
            <td>${actionHtml}</td>
        `;
        tbody.appendChild(tr);
    });

    document.getElementById('collCurrentBookTotal').innerText = formatCurrency(totalBookCollectedToday);
    document.getElementById('collCurrentBookPending').innerText = pendingCustomersCount;
}

function filterCollectionsStatus(status) {
    // Basic frontend filtering for demonstration
    const rows = document.querySelectorAll('#collectionsTableBody tr');
    rows.forEach(row => {
        if (row.cells.length === 1) return; // No data row
        
        const actionCellHtml = row.cells[6].innerHTML;
        const isPaid = actionCellHtml.includes('Paid');
        const isMissed = actionCellHtml.includes('Missed');
        const isPending = actionCellHtml.includes('Receive');

        if (status === 'All') {
            row.style.display = '';
        } else if (status === 'Pending Today' && isPending) {
            row.style.display = '';
        } else if (status === 'Paid Today' && isPaid) {
            row.style.display = '';
        } else if (status === 'Missed Today' && isMissed) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

function searchCollections(query) {
    query = query.toLowerCase();
    const rows = document.querySelectorAll('#collectionsTableBody tr');
    rows.forEach(row => {
        if (row.cells.length === 1) return;
        const custId = row.cells[0].innerText.toLowerCase();
        const custName = row.cells[1].innerText.toLowerCase();
        const phone = row.cells[2].innerText.toLowerCase();
        const prod = row.cells[3].innerText.toLowerCase();

        if (custId.includes(query) || custName.includes(query) || phone.includes(query) || prod.includes(query)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

function openCollectionModal(installmentId) {
    const installments = JSON.parse(localStorage.getItem('installments')) || [];
    const i = installments.find(x => x.InstallmentID === installmentId);
    if (!i) return;

    currentReceivingInstallmentId = installmentId;
    document.getElementById('collectionForm').reset();
    
    document.getElementById('collCustName').style.display = 'block';
    const select = document.getElementById('collGenericSelect');
    if(select) select.style.display = 'none';
    document.getElementById('collCustName').innerText = i.CustomerName;
    document.getElementById('collProduct').innerText = i.ProductName;
    document.getElementById('collWeeklyAmt').innerText = formatCurrency(i.WeeklyInstallment);
    document.getElementById('collBalance').innerText = formatCurrency(i.OutstandingBalance);
    document.getElementById('collAmount').value = i.WeeklyInstallment;

    document.getElementById('collectionModal').classList.add('active');
}

function closeCollectionModal() {
    document.getElementById('collectionModal').classList.remove('active');
    currentReceivingInstallmentId = null;
}

function saveCollection() {
    processCollection('Paid');
}

function markMissedCollection() {
    if(confirm('Are you sure you want to mark this collection as missed?')) {
        processCollection('Missed');
    }
}

function processCollection(status) {
    const installments = JSON.parse(localStorage.getItem('installments')) || [];
    const customers = JSON.parse(localStorage.getItem('customers')) || [];
    let collections = JSON.parse(localStorage.getItem('collections')) || [];

    const instIndex = installments.findIndex(i => i.InstallmentID === currentReceivingInstallmentId);
    if (instIndex === -1) return;
    const inst = installments[instIndex];

    const custIndex = customers.findIndex(c => c.CustomerID === inst.CustomerID);

    let amount = parseFloat(document.getElementById('collAmount').value) || 0;
    
    if (status === 'Missed') {
        amount = 0;
    } else {
        if (amount <= 0) {
            showNotification('Payment amount must be greater than zero.', 'error');
            return;
        }
        if (amount > inst.OutstandingBalance) {
            showNotification('Payment amount cannot exceed Outstanding Balance.', 'error');
            return;
        }
    }

    const todayDate = new Date();
    const todayStr = todayDate.toISOString().split('T')[0];
    
    // Generate Receipt Number
    let maxReceipt = 0;
    collections.forEach(c => {
        if(c.ReceiptNumber && c.ReceiptNumber.startsWith('RCP')) {
            const num = parseInt(c.ReceiptNumber.replace('RCP', ''));
            if (num > maxReceipt) maxReceipt = num;
        }
    });
    const receiptNo = 'RCP' + String(maxReceipt + 1).padStart(6, '0');

    // Create Collection Record
    const collRecord = {
        ReceiptNumber: receiptNo,
        CustomerID: inst.CustomerID,
        CustomerName: inst.CustomerName,
        InstallmentID: inst.InstallmentID,
        CollectionBook: inst.CollectionBook,
        ProductName: inst.ProductName,
        PaymentDate: todayStr,
        PaymentTime: todayDate.toLocaleTimeString(),
        PaymentAmount: amount,
        PaymentMethod: status === 'Missed' ? 'None' : document.getElementById('collMethod').value,
        ReferenceNumber: document.getElementById('collReference').value,
        CollectedBy: document.getElementById('collAgent').value,
        RemainingBalance: inst.OutstandingBalance - amount,
        Status: status,
        Remarks: document.getElementById('collRemarks').value
    };

    collections.push(collRecord);
    localStorage.setItem('collections', JSON.stringify(collections));

    if (status === 'Paid') {
        // Update Installment
        inst.OutstandingBalance -= amount;
        
        // Calculate weeks paid approx
        // This is simplified. In a real app, logic might differ for partial payments
        if (amount >= inst.WeeklyInstallment) {
            inst.WeeksPaid += Math.floor(amount / inst.WeeklyInstallment);
        } else if (inst.WeeksPaid === 0) {
             // even if partial, if it's the first payment we might count it or use decimals
        }

        if (inst.OutstandingBalance <= 0) {
            inst.Status = 'Completed';
            inst.OutstandingBalance = 0;
        }
        installments[instIndex] = inst;
        localStorage.setItem('installments', JSON.stringify(installments));

        // Update Customer Balance
        if (custIndex !== -1) {
            customers[custIndex].OutstandingBalance = inst.OutstandingBalance;
            if (inst.Status === 'Completed') {
                customers[custIndex].Status = 'Completed';
            }
            localStorage.setItem('customers', JSON.stringify(customers));
        }
        
        showNotification(`Collection of ${formatCurrency(amount)} saved successfully. Receipt: ${receiptNo}`, 'success');
    } else {
        showNotification('Collection marked as missed.', 'warning');
    }

    closeCollectionModal();
    loadCollections(currentCollectionBook);
    
    if (typeof loadDashboard === 'function') {
        // Refresh dashboard stats if it's the active tab or just in background
        loadDashboard(); 
    }
}

function generateDailySummary() {
    const collections = JSON.parse(localStorage.getItem('collections')) || [];
    const today = new Date().toISOString().split('T')[0];
    
    const todayCollections = collections.filter(c => c.PaymentDate && c.PaymentDate.startsWith(today));
    
    let totalCash = 0;
    let totalUPI = 0;
    let totalReceived = 0;
    let bookSummaries = {};

    todayCollections.forEach(c => {
        if (c.Status === 'Paid') {
            totalReceived += c.Amount;
            if (c.PaymentMode === 'Cash') totalCash += c.Amount;
            if (c.PaymentMode === 'UPI') totalUPI += c.Amount;
            
            const book = c.CollectionBook || 'Unknown';
            if (!bookSummaries[book]) bookSummaries[book] = 0;
            bookSummaries[book] += c.Amount;
        }
    });

    let html = `
        <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #ddd; padding-bottom: 10px; margin-bottom: 10px;">
            <h4>Total Received Today:</h4>
            <h4 style="color: var(--success-color);">${formatCurrency(totalReceived)}</h4>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
            <span>Cash:</span>
            <span>${formatCurrency(totalCash)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
            <span>UPI:</span>
            <span>${formatCurrency(totalUPI)}</span>
        </div>
        <h5>Breakdown by Book:</h5>
        <ul style="list-style: none; padding: 0;">
    `;
    
    for(let book in bookSummaries) {
        html += `<li style="display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px dashed #eee;">
            <span>${book}</span>
            <span>${formatCurrency(bookSummaries[book])}</span>
        </li>`;
    }
    
    if (Object.keys(bookSummaries).length === 0) {
        html += `<li>No collections received today.</li>`;
    }
    
    html += `</ul>`;
    
    document.getElementById('dailySummaryModalTitle').innerText = 'Daily Summary - ' + new Date().toLocaleDateString();
    document.getElementById('dailySummaryModalBody').innerHTML = html;
    document.getElementById('dailySummaryModal').classList.add('active');
}

function openGenericCollectionModal() {
    currentReceivingInstallmentId = null;
    document.getElementById('collectionForm').reset();
    
    // Hide standard customer text, show select
    document.getElementById('collCustName').style.display = 'none';
    const select = document.getElementById('collGenericSelect');
    select.style.display = 'block';
    
    // Clear other fields
    document.getElementById('collProduct').innerText = '-';
    document.getElementById('collWeeklyAmt').innerText = '-';
    document.getElementById('collBalance').innerText = '-';
    document.getElementById('collAmount').value = '';
    
    // Populate select
    const installments = JSON.parse(localStorage.getItem('installments')) || [];
    const activeInst = installments.filter(i => i.Status === 'Active');
    
    select.innerHTML = '<option value="">Select Customer/Installment...</option>';
    activeInst.forEach(i => {
        select.innerHTML += `<option value="${i.InstallmentID}">${i.CustomerName} - ${i.ProductName} (${i.CollectionBook})</option>`;
    });
    
    document.getElementById('collectionModal').classList.add('active');
}

function collGenericSelectChanged() {
    const instId = document.getElementById('collGenericSelect').value;
    if (!instId) return;
    
    const installments = JSON.parse(localStorage.getItem('installments')) || [];
    const i = installments.find(x => x.InstallmentID === instId);
    if (!i) return;
    
    currentReceivingInstallmentId = instId;
    document.getElementById('collProduct').innerText = i.ProductName;
    document.getElementById('collWeeklyAmt').innerText = formatCurrency(i.WeeklyInstallment);
    document.getElementById('collBalance').innerText = formatCurrency(i.OutstandingBalance);
    document.getElementById('collAmount').value = i.WeeklyInstallment;
}



