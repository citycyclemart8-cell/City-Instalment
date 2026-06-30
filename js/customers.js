// js/customers.js

let currentEditingCustomerId = null;

document.addEventListener('DOMContentLoaded', () => {
    // Initial Load
    loadCustomers();

    // Auto-calculate Finance Amount
    document.getElementById('custSellingPrice')?.addEventListener('input', calculateCustomerFinance);
    document.getElementById('custDownPayment')?.addEventListener('input', calculateCustomerFinance);

    // Filter Logic
    document.querySelectorAll('#customers .filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('#customers .filter-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            filterCustomers(e.target.dataset.filter);
        });
    });

    // Search Logic
    document.getElementById('customerSearch')?.addEventListener('input', (e) => {
        searchCustomers(e.target.value);
    });

    // Photo Upload Preview
    document.getElementById('custPhotoInput')?.addEventListener('change', function() {
        if (this.files && this.files[0]) {
            const reader = new FileReader();
            reader.onload = function(e) {
                document.getElementById('custPhotoPreview').innerHTML = `<img src="${e.target.result}" alt="Customer Photo">`;
            };
            reader.readAsDataURL(this.files[0]);
        }
    });
});

function calculateCustomerFinance() {
    const sp = parseFloat(document.getElementById('custSellingPrice').value) || 0;
    const dp = parseFloat(document.getElementById('custDownPayment').value) || 0;
    const finance = sp - dp;
    document.getElementById('custFinanceAmount').value = finance > 0 ? finance : 0;
}

function removeCustPhoto() {
    document.getElementById('custPhotoInput').value = '';
    document.getElementById('custPhotoPreview').innerHTML = '<i class="fa-solid fa-camera"></i>';
}

function openCustomerModal(customerId = null) {
    clearCustomerForm();
    if (customerId) {
        currentEditingCustomerId = customerId;
        document.getElementById('customerModalTitle').innerText = 'Edit Customer';
        populateCustomerForm(customerId);
    } else {
        currentEditingCustomerId = null;
        document.getElementById('customerModalTitle').innerText = 'Add New Customer';
        document.getElementById('custID').value = generateCustomerID();
    }
    document.getElementById('customerModal').classList.add('active');
}

function closeCustomerModal() {
    document.getElementById('customerModal').classList.remove('active');
}

function clearCustomerForm() {
    document.getElementById('customerForm').reset();
    document.getElementById('custID').value = generateCustomerID();
    removeCustPhoto();
    currentEditingCustomerId = null;
}

function generateCustomerID() {
    const customers = JSON.parse(localStorage.getItem('customers')) || [];
    if (customers.length === 0) return 'CUS000001';
    
    // Find highest ID
    let maxId = 0;
    customers.forEach(c => {
        const num = parseInt(c.CustomerID.replace('CUS', ''));
        if (num > maxId) maxId = num;
    });
    
    return 'CUS' + String(maxId + 1).padStart(6, '0');
}

function saveCustomer() {
    if (!validateCustomer()) return;

    const customers = JSON.parse(localStorage.getItem('customers')) || [];
    
    // Base64 Photo if any
    const photoPreview = document.getElementById('custPhotoPreview').querySelector('img');
    const photoData = photoPreview ? photoPreview.src : null;

    const customerObj = {
        CustomerID: document.getElementById('custID').value,
        CustomerName: document.getElementById('custName').value,
        FatherHusbandName: document.getElementById('custFatherName').value,
        Phone: document.getElementById('custPhone').value,
        AltPhone: document.getElementById('custAltPhone').value,
        Whatsapp: document.getElementById('custWhatsapp').value,
        Address: document.getElementById('custAddress').value,
        City: document.getElementById('custCity').value,
        District: document.getElementById('custDistrict').value,
        State: document.getElementById('custState').value,
        PinCode: document.getElementById('custPin').value,
        Aadhaar: document.getElementById('custAadhaar').value,
        IDType: document.getElementById('custIDType').value,
        IDNumber: document.getElementById('custIDNumber').value,
        Occupation: document.getElementById('custOccupation').value,
        Employer: document.getElementById('custEmployer').value,
        RefPerson: document.getElementById('custRefPerson').value,
        RefPhone: document.getElementById('custRefPhone').value,
        CollectionBook: document.getElementById('custBook').value,
        Product: document.getElementById('custProduct').value,
        SellingPrice: parseFloat(document.getElementById('custSellingPrice').value),
        DownPayment: parseFloat(document.getElementById('custDownPayment').value || 0),
        FinanceAmount: parseFloat(document.getElementById('custFinanceAmount').value),
        WeeklyInstallment: parseFloat(document.getElementById('custWeeklyAmt').value),
        OutstandingBalance: parseFloat(document.getElementById('custFinanceAmount').value),
        Notes: document.getElementById('custNotes').value,
        Photo: photoData,
        Status: 'Active',
        CreatedDate: new Date().toISOString(),
        LastUpdated: new Date().toISOString()
    };

    if (currentEditingCustomerId) {
        // Update existing
        const index = customers.findIndex(c => c.CustomerID === currentEditingCustomerId);
        if (index !== -1) {
            // Keep original CreatedDate and Status
            customerObj.CreatedDate = customers[index].CreatedDate;
            customerObj.Status = customers[index].Status;
            customerObj.OutstandingBalance = customers[index].OutstandingBalance; // Don't reset balance on edit unless intended
            customers[index] = customerObj;
            showNotification('Customer updated successfully!', 'success');
        }
    } else {
        // Add new
        customers.push(customerObj);
        showNotification('Customer added successfully!', 'success');
    }

    localStorage.setItem('customers', JSON.stringify(customers));
    
    // Update Dashboard Stats (if loaded)
    if (typeof loadStatistics === 'function') loadStatistics();
    
    closeCustomerModal();
    clearCustomerForm();
    loadCustomers();
}

function validateCustomer() {
    const name = document.getElementById('custName').value.trim();
    const phone = document.getElementById('custPhone').value.trim();
    const product = document.getElementById('custProduct').value.trim();
    const book = document.getElementById('custBook').value;
    const weeklyAmt = parseFloat(document.getElementById('custWeeklyAmt').value);
    const sp = parseFloat(document.getElementById('custSellingPrice').value);
    const dp = parseFloat(document.getElementById('custDownPayment').value || 0);

    if (!name) { showNotification('Customer Name is required.', 'error'); return false; }
    if (!phone) { showNotification('Phone Number is required.', 'error'); return false; }
    if (!product) { showNotification('Product Name is required.', 'error'); return false; }
    if (!book) { showNotification('Collection Book is required.', 'error'); return false; }
    if (isNaN(weeklyAmt) || weeklyAmt <= 0) { showNotification('Weekly Installment must be greater than zero.', 'error'); return false; }
    if (isNaN(sp) || sp <= 0) { showNotification('Selling Price is required and must be valid.', 'error'); return false; }
    if (sp < dp) { showNotification('Down Payment cannot be greater than Selling Price.', 'error'); return false; }

    return true;
}

function loadCustomers(customersToLoad = null) {
    const tbody = document.getElementById('customersTableBody');
    if (!tbody) return;

    let customers = customersToLoad || JSON.parse(localStorage.getItem('customers')) || [];
    
    tbody.innerHTML = '';

    if (customers.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" class="text-center text-muted">No customers found.</td></tr>`;
        return;
    }

    customers.forEach(c => {
        let statusClass = 'badge-status ' + c.Status.toLowerCase();
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${c.CustomerID}</td>
            <td>
                <div style="display: flex; align-items: center; gap: 10px;">
                    <div style="width: 30px; height: 30px; border-radius: 50%; overflow: hidden; background: #333;">
                        ${c.Photo ? `<img src="${c.Photo}" style="width:100%;height:100%;object-fit:cover;">` : `<i class="fa-solid fa-user" style="display:flex;justify-content:center;align-items:center;height:100%;color:#777;"></i>`}
                    </div>
                    <strong>${c.CustomerName}</strong>
                </div>
            </td>
            <td>${c.Phone}</td>
            <td>${c.Product}</td>
            <td><span class="badge" style="background-color: var(--${c.CollectionBook.toLowerCase()}-color); position: static;">${c.CollectionBook}</span></td>
            <td>${formatCurrency(c.WeeklyInstallment)}</td>
            <td><strong>${formatCurrency(c.OutstandingBalance)}</strong></td>
            <td><span class="${statusClass}">${c.Status}</span></td>
            <td>
                <div class="action-btns">
                    <button class="btn-icon btn-view" onclick="viewCustomerDetails('${c.CustomerID}')" title="View"><i class="fa-solid fa-eye"></i></button>
                    <button class="btn-icon btn-edit" onclick="openCustomerModal('${c.CustomerID}')" title="Edit"><i class="fa-solid fa-pen"></i></button>
                    <button class="btn-icon btn-delete" onclick="deleteCustomer('${c.CustomerID}')" title="Delete"><i class="fa-solid fa-trash"></i></button>
                    <button class="btn btn-receive" onclick="receiveCustomerPayment('${c.CustomerID}')"><i class="fa-solid fa-money-bill-wave"></i> Receive</button>
                    <button class="btn btn-primary btn-sm" style="margin-left:5px;" onclick="openCustomerHistory('${c.CustomerID}')"><i class="fa-solid fa-clock-rotate-left"></i> View History</button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function populateCustomerForm(id) {
    const customers = JSON.parse(localStorage.getItem('customers')) || [];
    const c = customers.find(x => x.CustomerID === id);
    if (!c) return;

    document.getElementById('custID').value = c.CustomerID;
    document.getElementById('custName').value = c.CustomerName;
    document.getElementById('custFatherName').value = c.FatherHusbandName || '';
    document.getElementById('custPhone').value = c.Phone;
    document.getElementById('custAltPhone').value = c.AltPhone || '';
    document.getElementById('custWhatsapp').value = c.Whatsapp || '';
    document.getElementById('custAddress').value = c.Address || '';
    document.getElementById('custCity').value = c.City || '';
    document.getElementById('custDistrict').value = c.District || '';
    document.getElementById('custState').value = c.State || '';
    document.getElementById('custPin').value = c.PinCode || '';
    document.getElementById('custAadhaar').value = c.Aadhaar || '';
    document.getElementById('custIDType').value = c.IDType || 'Aadhaar';
    document.getElementById('custIDNumber').value = c.IDNumber || '';
    document.getElementById('custOccupation').value = c.Occupation || '';
    document.getElementById('custEmployer').value = c.Employer || '';
    document.getElementById('custRefPerson').value = c.RefPerson || '';
    document.getElementById('custRefPhone').value = c.RefPhone || '';
    document.getElementById('custBook').value = c.CollectionBook;
    document.getElementById('custProduct').value = c.Product;
    document.getElementById('custSellingPrice').value = c.SellingPrice;
    document.getElementById('custDownPayment').value = c.DownPayment;
    document.getElementById('custFinanceAmount').value = c.FinanceAmount;
    document.getElementById('custWeeklyAmt').value = c.WeeklyInstallment;
    document.getElementById('custNotes').value = c.Notes || '';

    if (c.Photo) {
        document.getElementById('custPhotoPreview').innerHTML = `<img src="${c.Photo}" alt="Customer Photo">`;
    } else {
        removeCustPhoto();
    }
}

function deleteCustomer(id) {
    if(confirm(`Are you sure you want to delete customer ${id}? This action cannot be undone.`)) {
        let customers = JSON.parse(localStorage.getItem('customers')) || [];
        customers = customers.filter(c => c.CustomerID !== id);
        localStorage.setItem('customers', JSON.stringify(customers));
        showNotification('Customer deleted successfully.', 'success');
        loadCustomers();
        if (typeof loadStatistics === 'function') loadStatistics();
    }
}

function filterCustomers(filterType) {
    const customers = JSON.parse(localStorage.getItem('customers')) || [];
    if (filterType === 'All') {
        loadCustomers(customers);
    } else if (filterType === 'Active' || filterType === 'Completed' || filterType === 'Cancelled') {
        loadCustomers(customers.filter(c => c.Status === filterType));
    } else {
        // Book Filter
        loadCustomers(customers.filter(c => c.CollectionBook === filterType));
    }
}

function searchCustomers(query) {
    const customers = JSON.parse(localStorage.getItem('customers')) || [];
    query = query.toLowerCase();
    
    const results = customers.filter(c => 
        c.CustomerName.toLowerCase().includes(query) ||
        c.Phone.includes(query) ||
        c.CustomerID.toLowerCase().includes(query) ||
        c.Product.toLowerCase().includes(query) ||
        c.CollectionBook.toLowerCase().includes(query) ||
        (c.Aadhaar && c.Aadhaar.includes(query))
    );
    
    loadCustomers(results);
}

// Placeholders for Export/Import
function exportCustomers() { exportCSV('customers'); }
function importCustomers() { 
    const backupNav = document.querySelector('li[data-target=\'backup\']');
    if(backupNav) backupNav.click(); 
}
function printCustomer() { 
    window.print(); 
}

function viewCustomerDetails(id) {
    const customers = JSON.parse(localStorage.getItem('customers')) || [];
    const c = customers.find(x => x.CustomerID === id);
    if(!c) return;
    
    let html = '';
    for(let key in c) {
        if(key !== 'Photo' && key !== 'Notes') {
            html += `<div><strong>${key}:</strong> <br>${c[key]}</div>`;
        }
    }
    if(c.Notes) {
        html += `<div style="grid-column: 1 / -1;"><strong>Notes:</strong> <br>${c.Notes}</div>`;
    }
    
    const body = document.getElementById('viewCustomerModalBody');
    if(body) {
        body.innerHTML = html;
        document.getElementById('viewCustomerModal').classList.add('active');
    }
}

function receiveCustomerPayment(customerId) {
    const installments = JSON.parse(localStorage.getItem('installments')) || [];
    const inst = installments.find(x => x.CustomerID === customerId && x.Status === 'Active');
    if(inst) {
        document.querySelector('li[data-target=\'collections\']').click();
        if(typeof openCollectionModal === 'function') openCollectionModal(inst.InstallmentID);
    } else {
        showNotification('No active installment found for this customer.', 'warning');
    }
}


