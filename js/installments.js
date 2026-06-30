// js/installments.js

let currentEditingInstallmentId = null;

document.addEventListener('DOMContentLoaded', () => {
    loadInstallments();

    // Auto calculate finance and weekly amounts
    document.getElementById('instDownPayment')?.addEventListener('input', calculateFinance);
    document.getElementById('instWeeklyAmt')?.addEventListener('input', calculateProgress);
    

    // Filters
    document.querySelectorAll('#installments .filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('#installments .filter-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            filterInstallments(e.target.dataset.filter);
        });
    });

    // Search
    document.getElementById('installmentSearch')?.addEventListener('input', (e) => {
        searchInstallments(e.target.value);
    });
});

function calculateFinance() {
    const sp = parseFloat(document.getElementById('instSellingPrice').value) || 0;
    const dp = parseFloat(document.getElementById('instDownPayment').value) || 0;
    const finance = sp - dp;
    document.getElementById('instFinanceAmount').value = finance > 0 ? finance : 0;
}

function calculateProgress() {
    // Just a placeholder to ensure real-time updates if needed
}

function generateInstallmentID() {
    const installments = JSON.parse(localStorage.getItem('installments')) || [];
    if (installments.length === 0) return 'INS000001';
    
    let maxId = 0;
    installments.forEach(i => {
        const num = parseInt(i.InstallmentID.replace('INS', ''));
        if (num > maxId) maxId = num;
    });
    
    return 'INS' + String(maxId + 1).padStart(6, '0');
}

function openInstallmentModal(instId = null) {
    clearInstallmentForm();
    populateSelects();

    if (instId) {
        currentEditingInstallmentId = instId;
        document.getElementById('installmentModalTitle').innerText = 'Edit Installment';
        populateInstallmentForm(instId);
    } else {
        currentEditingInstallmentId = null;
        document.getElementById('installmentModalTitle').innerText = 'Create New Installment';
        document.getElementById('instID').value = generateInstallmentID();
        document.getElementById('instInvoice').value = generateInvoiceNumber();
        document.getElementById('instDate').valueAsDate = new Date();
    }
    document.getElementById('installmentModal').classList.add('active');
}

function generateInvoiceNumber() {
    const installments = JSON.parse(localStorage.getItem('installments')) || [];
    let maxId = 0;
    installments.forEach(i => {
        if(i.InvoiceNumber && i.InvoiceNumber.startsWith('INV-')) {
            const num = parseInt(i.InvoiceNumber.replace('INV-', ''));
            if(!isNaN(num) && num > maxId) maxId = num;
        }
    });
    return 'INV-' + String(maxId + 1).padStart(4, '0');
}

function closeInstallmentModal() {
    document.getElementById('installmentModal').classList.remove('active');
}

function clearInstallmentForm() {
    document.getElementById('installmentForm').reset();
    document.getElementById('instID').value = generateInstallmentID();
    document.getElementById('instSummaryCard').style.display = 'none';
    currentEditingInstallmentId = null;
}

function populateSelects() {
    const customers = JSON.parse(localStorage.getItem('customers')) || [];
    const products = JSON.parse(localStorage.getItem('products')) || [];

    const custSelect = document.getElementById('instCustomerSelect');
    custSelect.innerHTML = '<option value="">Select Customer...</option>';
    customers.forEach(c => {
        custSelect.innerHTML += `<option value="${c.CustomerID}">${c.CustomerName} (${c.Phone})</option>`;
    });

    const prodSelect = document.getElementById('instProductSelect');
    prodSelect.innerHTML = '<option value="">Select Product...</option>';
    products.forEach(p => {
        prodSelect.innerHTML += `<option value="${p.ProductID}">${p.ProductName} - ₹${p.SellingPrice}</option>`;
    });
}

function populateCustomerDataForInstallment() {
    const custId = document.getElementById('instCustomerSelect').value;
    if (!custId) {
        document.getElementById('instSummaryCard').style.display = 'none';
        return;
    }
    const customers = JSON.parse(localStorage.getItem('customers')) || [];
    const c = customers.find(x => x.CustomerID === custId);
    if (c) {
        document.getElementById('instSummaryCard').style.display = 'block';
        document.getElementById('instSumCustID').innerText = c.CustomerID;
        document.getElementById('instSumPhone').innerText = c.Phone;
        document.getElementById('instSumBook').innerText = c.CollectionBook;
    }
}

function populateProductDataForInstallment() {
    const select = document.getElementById('instProductSelect');
    const selectedOptions = Array.from(select.selectedOptions);
    if (selectedOptions.length === 0) {
        document.getElementById('instSellingPrice').value = '';
        document.getElementById('instSumPrice').innerText = '-';
        calculateFinance();
        return;
    }
    const products = JSON.parse(localStorage.getItem('products')) || [];
    let totalPrice = 0;
    selectedOptions.forEach(opt => {
        const p = products.find(x => x.ProductID === opt.value);
        if (p) totalPrice += p.SellingPrice;
    });
    
    document.getElementById('instSellingPrice').value = totalPrice;
    document.getElementById('instSumPrice').innerText = formatCurrency(totalPrice);
    calculateFinance();
}

function saveInstallment() {
    if (!validateInstallment()) return;

    const installments = JSON.parse(localStorage.getItem('installments')) || [];
    const customers = JSON.parse(localStorage.getItem('customers')) || [];
    const products = JSON.parse(localStorage.getItem('products')) || [];

    const custId = document.getElementById('instCustomerSelect').value;
    const select = document.getElementById('instProductSelect');
    const selectedOptions = Array.from(select.selectedOptions);
    const prodIds = selectedOptions.map(opt => opt.value);
    
    const c = customers.find(x => x.CustomerID === custId);
    const prodNames = prodIds.map(id => {
        const p = products.find(x => x.ProductID === id);
        return p ? p.ProductName : id;
    }).join(', ');

    const instObj = {
        InstallmentID: document.getElementById('instID').value,
        CustomerID: custId,
        CustomerName: c.CustomerName,
        ProductID: prodIds.length === 1 ? prodIds[0] : prodIds,
        ProductName: prodNames,
        SellingPrice: parseFloat(document.getElementById('instSellingPrice').value),
        DownPayment: parseFloat(document.getElementById('instDownPayment').value || 0),
        FinanceAmount: parseFloat(document.getElementById('instFinanceAmount').value),
        WeeklyInstallment: parseFloat(document.getElementById('instWeeklyAmt').value),
        NumberOfWeeks: 0,
        WeeksPaid: 0,
        OutstandingBalance: parseFloat(document.getElementById('instFinanceAmount').value),
        CollectionBook: c.CollectionBook,
        CollectionDay: c.CollectionBook.replace(' Book', ''),
        PurchaseDate: document.getElementById('instDate').value,
        FirstCollectionDate: document.getElementById('instFirstCollDate').value,
        InvoiceNumber: document.getElementById('instInvoice').value,
        Status: 'Active',
        CreatedDate: new Date().toISOString(),
        UpdatedDate: new Date().toISOString()
    };

    if (currentEditingInstallmentId) {
        const index = installments.findIndex(i => i.InstallmentID === currentEditingInstallmentId);
        if (index !== -1) {
            instObj.CreatedDate = installments[index].CreatedDate;
            instObj.WeeksPaid = installments[index].WeeksPaid;
            instObj.OutstandingBalance = installments[index].OutstandingBalance;
            instObj.Status = installments[index].Status;
            installments[index] = instObj;
            showNotification('Installment updated successfully!', 'success');
        }
    } else {
        installments.push(instObj);
        showNotification('Installment created successfully!', 'success');
        
        // Also update the customer's outstanding balance if creating new
        if (c) {
            c.OutstandingBalance = instObj.OutstandingBalance;
            c.FinanceAmount = instObj.FinanceAmount;
            localStorage.setItem('customers', JSON.stringify(customers));
        }
    }

    localStorage.setItem('installments', JSON.stringify(installments));
    
    closeInstallmentModal();
    loadInstallments();
    if (typeof loadStatistics === 'function') loadStatistics();
}

function validateInstallment() {
    const custId = document.getElementById('instCustomerSelect').value;
    const select = document.getElementById('instProductSelect');
    const sp = parseFloat(document.getElementById('instSellingPrice').value);
    const dp = parseFloat(document.getElementById('instDownPayment').value || 0);
    const weeklyAmt = parseFloat(document.getElementById('instWeeklyAmt').value);

    if (!custId) { showNotification('Customer is required.', 'error'); return false; }
    if (select.selectedOptions.length === 0) { showNotification('Product is required.', 'error'); return false; }
    if (dp > sp) { showNotification('Down Payment cannot exceed Selling Price.', 'error'); return false; }
    if (isNaN(weeklyAmt) || weeklyAmt <= 0) { showNotification('Weekly Installment must be greater than zero.', 'error'); return false; }

    return true;
}

function loadInstallments(installmentsToLoad = null) {
    const tbody = document.getElementById('installmentsTableBody');
    if (!tbody) return;

    let installments = installmentsToLoad || JSON.parse(localStorage.getItem('installments')) || [];
    tbody.innerHTML = '';

    if (installments.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" class="text-center text-muted">No installments found.</td></tr>`;
        return;
    }

    installments.forEach(i => {
        let statusClass = 'badge-status ' + i.Status.toLowerCase();
        let totalVal = i.SellingPrice || i.FinanceAmount;
        let progressPct = (totalVal > 0) ? ((totalVal - i.OutstandingBalance) / totalVal) * 100 : 0;
        if (progressPct < 0) progressPct = 0;
        if (progressPct > 100) progressPct = 100;

        let barClass = '';
        if (progressPct < 30) barClass = 'danger';
        else if (progressPct < 70) barClass = 'warning';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${i.InstallmentID}</td>
            <td><strong>${i.CustomerName}</strong></td>
            <td>${i.ProductName}</td>
            <td><span class="badge" style="background-color: var(--${i.CollectionBook.toLowerCase()}-color); position: static;">${i.CollectionBook}</span></td>
            <td>${formatCurrency(i.WeeklyInstallment)}</td>
            <td><strong>${formatCurrency(i.OutstandingBalance)}</strong></td>
            <td>
                <div class="progress-bar-container">
                    <div class="progress-bar ${barClass}" style="width: ${progressPct}%"></div>
                </div>
                <div class="progress-text">
                    <span>${i.WeeksPaid} payments</span>
                    <span>${Math.round(progressPct)}%</span>
                </div>
            </td>
            <td><span class="${statusClass}">${i.Status}</span></td>
            <td>
                <div class="action-btns">
                    <button class="btn-icon btn-view" onclick="viewInstallmentDetails('${i.InstallmentID}')" title="View"><i class="fa-solid fa-eye"></i></button>
                    <button class="btn-icon btn-edit" onclick="openInstallmentModal('${i.InstallmentID}')" title="Edit"><i class="fa-solid fa-pen"></i></button>
                    <button class="btn-icon btn-delete" onclick="deleteInstallment('${i.InstallmentID}')" title="Delete"><i class="fa-solid fa-trash"></i></button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function populateInstallmentForm(id) {
    const installments = JSON.parse(localStorage.getItem('installments')) || [];
    const i = installments.find(x => x.InstallmentID === id);
    if (!i) return;

    document.getElementById('instID').value = i.InstallmentID;
    document.getElementById('instCustomerSelect').value = i.CustomerID;
    document.getElementById('instProductSelect').value = i.ProductID;
    document.getElementById('instSellingPrice').value = i.SellingPrice;
    document.getElementById('instDownPayment').value = i.DownPayment;
    document.getElementById('instFinanceAmount').value = i.FinanceAmount;
    document.getElementById('instWeeklyAmt').value = i.WeeklyInstallment;
    document.getElementById('instTotalWeeks').value = i.NumberOfWeeks;
    document.getElementById('instDate').value = i.PurchaseDate;
    document.getElementById('instFirstCollDate').value = i.FirstCollectionDate;
    document.getElementById('instInvoice').value = i.InvoiceNumber || '';

    populateCustomerDataForInstallment();
    document.getElementById('instSumPrice').innerText = formatCurrency(i.SellingPrice);
}

function deleteInstallment(id) {
    if(confirm(`Are you sure you want to delete installment ${id}?`)) {
        let installments = JSON.parse(localStorage.getItem('installments')) || [];
        installments = installments.filter(i => i.InstallmentID !== id);
        localStorage.setItem('installments', JSON.stringify(installments));
        showNotification('Installment deleted successfully.', 'success');
        loadInstallments();
        if (typeof loadStatistics === 'function') loadStatistics();
    }
}

function filterInstallments(filterType) {
    const installments = JSON.parse(localStorage.getItem('installments')) || [];
    if (filterType === 'All') {
        loadInstallments(installments);
    } else if (['Active', 'Completed', 'Overdue'].includes(filterType)) {
        loadInstallments(installments.filter(i => i.Status === filterType));
    } else {
        loadInstallments(installments.filter(i => i.CollectionBook === filterType));
    }
}

function searchInstallments(query) {
    const installments = JSON.parse(localStorage.getItem('installments')) || [];
    query = query.toLowerCase();
    
    const results = installments.filter(i => 
        i.CustomerName.toLowerCase().includes(query) ||
        i.InstallmentID.toLowerCase().includes(query) ||
        i.ProductName.toLowerCase().includes(query) ||
        (i.InvoiceNumber && i.InvoiceNumber.toLowerCase().includes(query))
    );
    
    loadInstallments(results);
}

function exportInstallments() { showFeatureAlert('Export JSON'); }
function importInstallments() { showFeatureAlert('Import JSON'); }
function printInstallments() { showFeatureAlert('Print Installments List'); }

