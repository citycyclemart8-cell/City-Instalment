// js/customerHistory.js
let currentCustomerForHistory = null;
let currentCollectionsForHistory = [];
let currentInstallmentForHistory = null;
let currentMissedCollections = [];

function openCustomerHistory(customerId) {
    const modal = document.getElementById('customerHistoryModal');
    if (!modal) return;
    modal.classList.add('active');
    loadCustomerHistory(customerId);
}

function closeCustomerHistory() {
    const modal = document.getElementById('customerHistoryModal');
    if (modal) modal.classList.remove('active');
}

function toggleChView(viewName) {
    document.querySelectorAll('#customerHistoryModal .ch-filters button').forEach(btn => btn.classList.remove('active'));
    document.getElementById('chTableView').style.display = 'none';
    document.getElementById('chTimelineView').style.display = 'none';
    document.getElementById('chMissedView').style.display = 'none';
    document.getElementById('chScheduleView').style.display = 'none';

    if (viewName === 'table') {
        document.getElementById('btnTableView').classList.add('active');
        document.getElementById('chTableView').style.display = 'block';
    } else if (viewName === 'timeline') {
        document.getElementById('btnTimelineView').classList.add('active');
        document.getElementById('chTimelineView').style.display = 'block';
    } else if (viewName === 'missed') {
        document.getElementById('btnMissedView').classList.add('active');
        document.getElementById('chMissedView').style.display = 'block';
    } else if (viewName === 'schedule') {
        document.getElementById('btnScheduleView').classList.add('active');
        document.getElementById('chScheduleView').style.display = 'block';
    }
}

function loadCustomerHistory(customerId) {
    const customers = JSON.parse(localStorage.getItem('customers')) || [];
    const installments = JSON.parse(localStorage.getItem('installments')) || [];
    const allCollections = JSON.parse(localStorage.getItem('collections')) || [];
    const products = JSON.parse(localStorage.getItem('products')) || [];

    const customer = customers.find(c => c.CustomerID === customerId);
    if (!customer) return;

    currentCustomerForHistory = customer;

    // Find active or latest installment
    const custInsts = installments.filter(i => i.CustomerID === customerId);
    let installment = custInsts.find(i => i.Status === 'Active');
    if (!installment && custInsts.length > 0) {
        installment = custInsts[custInsts.length - 1]; // Fallback to last
    }

    currentInstallmentForHistory = installment;

    // Extract product info
    let productDetails = { name: '-', brand: '-', model: '-', serial: '-' };
    if (installment && installment.ProductID) {
        const prod = products.find(p => p.ProductID === installment.ProductID);
        if (prod) {
            productDetails.name = prod.ProductName;
            productDetails.brand = prod.Brand || '-';
            productDetails.model = prod.Model || '-';
            productDetails.serial = prod.Serial || '-';
        } else {
            productDetails.name = installment.ProductName || '-';
        }
    } else if (installment) {
        productDetails.name = installment.ProductName || '-';
    }

    // Filter collections
    const collections = allCollections.filter(c => c.CustomerID === customerId && (!installment || c.InstallmentID === installment.InstallmentID));
    
    // Sort collections chronologically (oldest first for calculations)
    collections.sort((a, b) => new Date(a.PaymentDate + 'T' + (a.PaymentTime || '00:00')) - new Date(b.PaymentDate + 'T' + (b.PaymentTime || '00:00')));
    
    currentCollectionsForHistory = collections.filter(c => c.Status !== 'Missed');
    currentMissedCollections = collections.filter(c => c.Status === 'Missed');

    // Populate SECTION 1: CUSTOMER DETAILS
    document.getElementById('chID').innerText = customer.CustomerID;
    document.getElementById('chName').innerText = customer.CustomerName;
    document.getElementById('chPhone').innerText = customer.Phone || '-';
    document.getElementById('chWhatsApp').innerText = customer.WhatsApp || '-';
    document.getElementById('chAddress').innerText = customer.Address || '-';
    document.getElementById('chSince').innerText = customer.JoinDate || '-';
    document.getElementById('chStatusBadge').innerText = installment ? installment.Status : 'Inactive';
    document.getElementById('chBook').innerText = installment ? installment.CollectionBook : '-';

    if (!installment) {
        // Clear out things if no installment exists
        return;
    }

    // Calculations
    const financeAmt = installment.FinanceAmount || 0;
    const weeklyAmt = installment.WeeklyInstallment || 0;
    const totalWeeks = installment.NumberOfWeeks || 0;
    let totalPaid = 0;
    let weeksPaid = 0;
    let outBal = financeAmt;
    let lastDate = '-';

    currentCollectionsForHistory.forEach(c => {
        if(c.Status === 'Paid' || c.Status === 'Advance' || c.Status === 'Partial') {
            totalPaid += c.PaymentAmount;
            outBal -= c.PaymentAmount;
            lastDate = c.PaymentDate;
            if(weeklyAmt > 0) {
                weeksPaid = Math.floor(totalPaid / weeklyAmt);
            }
        }
    });

    const weeksRem = Math.max(0, totalWeeks - weeksPaid);
    const collectionPercent = financeAmt > 0 ? Math.round((totalPaid / financeAmt) * 100) : 0;
    
    // Expected Completion Date Logic (Simple projection based on remaining weeks * 7 days)
    let expectedDateStr = '-';
    if(weeksRem > 0) {
        const lastD = lastDate !== '-' ? new Date(lastDate) : new Date(installment.PurchaseDate);
        if(!isNaN(lastD.getTime())) {
            lastD.setDate(lastD.getDate() + (weeksRem * 7));
            expectedDateStr = lastD.toISOString().split('T')[0];
        }
    } else {
        expectedDateStr = lastDate;
    }

    // Populate SECTION 2: INSTALLMENT DETAILS
    document.getElementById('idInstID').innerText = installment.InstallmentID;
    document.getElementById('idInvoice').innerText = installment.InvoiceNo || '-';
    document.getElementById('idProduct').innerText = productDetails.name;
    document.getElementById('idBrand').innerText = productDetails.brand;
    document.getElementById('idModel').innerText = productDetails.model;
    document.getElementById('idSerial').innerText = productDetails.serial;
    document.getElementById('idPurchaseDate').innerText = installment.PurchaseDate || '-';
    document.getElementById('idSellingPrice').innerText = formatCurrency(installment.SellingPrice || 0);
    document.getElementById('idDownPayment').innerText = formatCurrency(installment.DownPayment || 0);
    document.getElementById('idFinanceAmt').innerText = formatCurrency(financeAmt);
    document.getElementById('idWeeklyAmt').innerText = formatCurrency(weeklyAmt);
    document.getElementById('idNumWeeks').innerText = totalWeeks;
    document.getElementById('idWeeksPaid').innerText = weeksPaid;
    document.getElementById('idWeeksRem').innerText = weeksRem;
    document.getElementById('idOutBal').innerText = formatCurrency(outBal);
    document.getElementById('idCollDay').innerText = installment.CollectionDay || '-';
    document.getElementById('idCollBook').innerText = installment.CollectionBook || '-';
    document.getElementById('idFirstDate').innerText = currentCollectionsForHistory.length > 0 ? currentCollectionsForHistory[0].PaymentDate : '-';
    document.getElementById('idLastDate').innerText = lastDate;
    
    let nextDate = '-';
    if(installment.Status === 'Active' && lastDate !== '-') {
        const nd = new Date(lastDate);
        nd.setDate(nd.getDate() + 7);
        nextDate = nd.toISOString().split('T')[0];
    } else if (installment.Status === 'Active') {
        nextDate = installment.PurchaseDate;
    }
    document.getElementById('idNextDate').innerText = nextDate;
    document.getElementById('idExpectedDate').innerText = expectedDateStr;
    document.getElementById('idInstStatus').innerText = installment.Status;

    // Populate SECTION 3: SUMMARY CARDS
    document.getElementById('chCardFinance').innerText = formatCurrency(financeAmt);
    document.getElementById('chCardPaid').innerText = formatCurrency(totalPaid);
    document.getElementById('chCardBalance').innerText = formatCurrency(outBal);
    document.getElementById('chCardCollections').innerText = currentCollectionsForHistory.length;
    document.getElementById('chCardRemWeeks').innerText = weeksRem;
    document.getElementById('chCardMissed').innerText = currentMissedCollections.length;
    document.getElementById('chCardLastDate').innerText = lastDate;
    document.getElementById('chCardNextDate').innerText = nextDate;

    // Populate SECTION 8: CALCULATIONS
    const avgWeekly = weeksPaid > 0 ? (totalPaid / weeksPaid) : 0;
    document.getElementById('calcAvgWeekly').innerText = formatCurrency(avgWeekly);
    document.getElementById('calcPercentage').innerText = collectionPercent + '%';
    document.getElementById('calcRemAmt').innerText = formatCurrency(outBal);
    document.getElementById('calcTotalWeeks').innerText = totalWeeks;

    // Populate SECTION 4: PROGRESS BAR
    document.getElementById('chProgressWeeksText').innerText = `(` + weeksPaid + ` of ` + totalWeeks + ` Weeks Completed)`;
    document.getElementById('chProgressText').innerText = collectionPercent + '%';
    document.getElementById('chProgressBar').style.width = collectionPercent + '%';

    // Populate SECTION 5: PAYMENT HISTORY TABLE
    renderPaymentHistoryTable();
    
    // Populate SECTION 6: MISSED TABLE
    renderMissedTable();
    
    // Populate SECTION 7: TIMELINE
    renderTimeline(customer, installment, collections);

    // Populate SECTION 8: SCHEDULE
    renderScheduleTable(installment, collections);
}

function renderPaymentHistoryTable() {
    const tbody = document.getElementById('chTableBody');
    tbody.innerHTML = '';
    
    let runningBal = currentInstallmentForHistory.FinanceAmount || 0;
    const rows = [];
    
    currentCollectionsForHistory.forEach((c, idx) => {
        runningBal -= c.PaymentAmount;
        let statClass = 'completed';
        if(c.Status === 'Advance') statClass = 'advance';
        if(c.Status === 'Partial') statClass = 'partial';
        
        rows.unshift(`
            <tr>
                <td>${c.ReceiptNo}</td>
                <td>${c.PaymentDate}</td>
                <td>${c.PaymentTime || '-'}</td>
                <td>${idx + 1}</td>
                <td>${currentInstallmentForHistory.InstallmentID}</td>
                <td><span class="badge" style="background-color: var(--${c.CollectionBook.toLowerCase().replace(' book','')}-color); position:static;">${c.CollectionBook}</span></td>
                <td><strong>${formatCurrency(c.PaymentAmount)}</strong></td>
                <td>${c.PaymentMethod || 'Cash'}</td>
                <td>${c.CollectedBy || 'Admin'}</td>
                <td>${formatCurrency(runningBal)}</td>
                <td><span class="badge-status ${statClass}">${c.Status}</span></td>
                <td>${c.Remarks || '-'}</td>
            </tr>
        `);
    });

    if(rows.length === 0) {
        tbody.innerHTML = `<tr><td colspan="12" class="text-center text-muted">No payments found.</td></tr>`;
    } else {
        tbody.innerHTML = rows.join('');
    }
}

function renderMissedTable() {
    const tbody = document.getElementById('chMissedBody');
    tbody.innerHTML = '';
    if(currentMissedCollections.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted">No missed collections.</td></tr>`;
        return;
    }
    const rows = [];
    currentMissedCollections.reverse().forEach((c, idx) => {
        rows.push(`
            <tr>
                <td>${c.PaymentDate}</td>
                <td>Missed Week ${currentMissedCollections.length - idx}</td>
                <td>${c.Remarks || 'Customer Unreachable'}</td>
                <td>${c.CollectionBook}</td>
                <td><span class="badge-status ch-missed">Missed</span></td>
                <td>-</td>
            </tr>
        `);
    });
    tbody.innerHTML = rows.join('');
}

function renderTimeline(customer, installment, collections) {
    const tl = document.getElementById('chTimelineBody');
    tl.innerHTML = '';
    
    // Reverse collections for descending timeline
    const revColl = [...collections].reverse();
    
    let html = '';
    
    revColl.forEach((c, i) => {
        if(c.Status === 'Missed') {
            html += `
            <div class="ch-timeline-item">
                <div class="ch-timeline-icon" style="background-color: var(--danger);"><i class="fa-solid fa-xmark"></i></div>
                <div class="ch-timeline-content">
                    <h4>Missed Collection</h4>
                    <p style="color:var(--text-muted); font-size:0.85rem;">${c.PaymentDate}</p>
                    <p>${c.Remarks || 'Customer not available.'}</p>
                </div>
            </div>`;
        } else {
            let statClass = c.Status === 'Advance' ? 'var(--info)' : (c.Status === 'Partial' ? 'var(--warning)' : 'var(--success)');
            html += `
            <div class="ch-timeline-item">
                <div class="ch-timeline-icon" style="background-color: ${statClass};"><i class="fa-solid fa-check"></i></div>
                <div class="ch-timeline-content">
                    <h4>Payment Received - ${formatCurrency(c.PaymentAmount)}</h4>
                    <p style="color:var(--text-muted); font-size:0.85rem;">${c.PaymentDate} ${c.PaymentTime||''} - Receipt: ${c.ReceiptNo}</p>
                    <p>${c.Remarks || 'Collection successful.'}</p>
                </div>
            </div>`;
        }
    });

    // Installment Created
    html += `
    <div class="ch-timeline-item">
        <div class="ch-timeline-icon" style="background-color: var(--primary);"><i class="fa-solid fa-file-signature"></i></div>
        <div class="ch-timeline-content">
            <h4>Installment Created</h4>
            <p style="color:var(--text-muted); font-size:0.85rem;">${installment.PurchaseDate}</p>
            <p>Product: ${installment.ProductName||'-'} | Finance: ${formatCurrency(installment.FinanceAmount)}</p>
        </div>
    </div>`;
    
    // Customer Registered
    html += `
    <div class="ch-timeline-item">
        <div class="ch-timeline-icon" style="background-color: var(--panel-border);"><i class="fa-solid fa-user-plus"></i></div>
        <div class="ch-timeline-content">
            <h4>Customer Registered</h4>
            <p style="color:var(--text-muted); font-size:0.85rem;">${customer.JoinDate || 'N/A'}</p>
            <p>Customer ID: ${customer.CustomerID}</p>
        </div>
    </div>`;

    tl.innerHTML = html;
}

function renderScheduleTable(installment, collections) {
    const tbody = document.getElementById('chScheduleBody');
    tbody.innerHTML = '';
    
    if (!installment || !installment.NumberOfWeeks) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-center text-muted">No schedule available.</td></tr>`;
        return;
    }
    
    const totalWeeks = installment.NumberOfWeeks;
    const weeklyAmt = installment.WeeklyInstallment;
    
    // Determine start date
    let startDate = null;
    if (installment.FirstCollectionDate) {
        startDate = new Date(installment.FirstCollectionDate);
    } else if (installment.PurchaseDate) {
        startDate = new Date(installment.PurchaseDate);
        startDate.setDate(startDate.getDate() + 7);
    } else {
        startDate = new Date(); // fallback
    }
    
    let rows = '';
    let collIndex = 0;
    
    for (let i = 1; i <= totalWeeks; i++) {
        let dueDate = new Date(startDate);
        dueDate.setDate(dueDate.getDate() + (i - 1) * 7);
        
        let dueDateStr = dueDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
        
        let status = '⏳ Pending';
        let amount = formatCurrency(weeklyAmt);
        
        // Match chronologically with collections
        if (collIndex < collections.length) {
            let c = collections[collIndex];
            if (c.Status === 'Paid' || c.Status === 'Advance') {
                status = '✅ Paid';
            } else if (c.Status === 'Missed') {
                status = '❌ Missed';
            } else if (c.Status === 'Partial') {
                status = '🟡 Partial';
            }
            collIndex++;
        }
        
        rows += `
            <tr>
                <td>Week ${i}</td>
                <td>${dueDateStr}</td>
                <td>${amount}</td>
                <td>${status}</td>
            </tr>
        `;
    }
    
    tbody.innerHTML = rows;
}

function searchCustomerHistory() {
    const q = document.getElementById('chSearch').value.toLowerCase();
    
    // Search main table
    document.querySelectorAll('#chTableBody tr').forEach(tr => {
        if(tr.innerText.toLowerCase().includes(q)) tr.style.display = '';
        else tr.style.display = 'none';
    });
}

function populatePassbookData() {
    // Populate passbook html elements
    document.getElementById('pbCustName').innerText = document.getElementById('chName').innerText;
    document.getElementById('pbCustID').innerText = document.getElementById('chID').innerText;
    document.getElementById('pbCustPhone').innerText = document.getElementById('chPhone').innerText;
    document.getElementById('pbCustAddress').innerText = document.getElementById('chAddress').innerText;
    
    document.getElementById('pbProduct').innerText = document.getElementById('idProduct').innerText;
    document.getElementById('pbBrand').innerText = document.getElementById('idBrand').innerText;
    document.getElementById('pbModel').innerText = document.getElementById('idModel').innerText;
    document.getElementById('pbSerial').innerText = document.getElementById('idSerial').innerText;
    
    document.getElementById('pbFinance').innerText = document.getElementById('idFinanceAmt').innerText;
    document.getElementById('pbWeekly').innerText = document.getElementById('idWeeklyAmt').innerText;
    document.getElementById('pbTotalWeeks').innerText = document.getElementById('idNumWeeks').innerText;
    document.getElementById('pbPurchaseDate').innerText = document.getElementById('idPurchaseDate').innerText;
    document.getElementById('pbBook').innerText = document.getElementById('idCollBook').innerText;
    document.getElementById('pbStatus').innerText = document.getElementById('idInstStatus').innerText;
    
    document.getElementById('pbTotalPaid').innerText = document.getElementById('chCardPaid').innerText;
    document.getElementById('pbOutBal').innerText = document.getElementById('chCardBalance').innerText;
    document.getElementById('pbProgressText').innerText = document.getElementById('chProgressText').innerText;

    // clone history rows (strip action column if any, just copy text)
    const hTbody = document.getElementById('pbHistoryBody');
    hTbody.innerHTML = '';
    currentCollectionsForHistory.forEach((c, idx) => {
        hTbody.innerHTML += `<tr>
            <td style="border:1px solid #ddd; padding:5px;">${c.PaymentDate}</td>
            <td style="border:1px solid #ddd; padding:5px;">${c.ReceiptNo}</td>
            <td style="border:1px solid #ddd; padding:5px;">${idx+1}</td>
            <td style="border:1px solid #ddd; padding:5px;">${formatCurrency(c.PaymentAmount)}</td>
            <td style="border:1px solid #ddd; padding:5px;">${c.Status}</td>
        </tr>`;
    });
    
    const mTbody = document.getElementById('pbMissedBody');
    mTbody.innerHTML = '';
    currentMissedCollections.forEach(c => {
        mTbody.innerHTML += `<tr>
            <td style="border:1px solid #ddd; padding:5px;">${c.PaymentDate}</td>
            <td style="border:1px solid #ddd; padding:5px;">Missed</td>
            <td style="border:1px solid #ddd; padding:5px;">${c.Remarks||'-'}</td>
        </tr>`;
    });

    document.getElementById('pbPrintDate').innerText = 'Printed on: ' + new Date().toLocaleString();
}

function printPassbook() {
    populatePassbookData();

    
    const printContent = document.getElementById('passbookPrintArea').innerHTML;
    const originalContent = document.body.innerHTML;
    
    document.body.innerHTML = printContent;
    window.print();
    document.body.innerHTML = originalContent;
    
    // re-attach event listeners by reloading page
    window.location.reload(); 
}

function printLedger() {
    const printContent = document.getElementById('chPrintArea').innerHTML;
    const originalContent = document.body.innerHTML;
    
    // Hide UI elements not needed in print
    document.body.innerHTML = printContent;
    document.querySelectorAll('[data-html2canvas-ignore="true"]').forEach(el => el.style.display = 'none');
    
    window.print();
    document.body.innerHTML = originalContent;
    window.location.reload(); 
}

function exportPDF() {
    populatePassbookData();
    const originalElement = document.getElementById('passbookPrintArea');
    const element = originalElement.cloneNode(true);
    
    // Ensure passbook is visible for html2pdf to render it properly
    element.style.display = 'block';

    const opt = {
        margin:       0.5,
        filename:     'Customer_Passbook_' + (currentCustomerForHistory ? currentCustomerForHistory.CustomerID : 'export') + '.pdf',
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2 },
        jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(element).save();
}

function exportExcel() {
    alert("Excel Export Feature logic triggered!");
}

function exportCSV() {
    alert("CSV Export Feature logic triggered!");
}

function exportJSON() {
    alert("JSON Export Feature logic triggered!");
}

// Payment History Page functions
function loadPhCustomers() {
    const customers = JSON.parse(localStorage.getItem('customers')) || [];
    const installments = JSON.parse(localStorage.getItem('installments')) || [];
    const tbody = document.getElementById('phTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';
    
    if (customers.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">No customers found.</td></tr>`;
        return;
    }

    customers.forEach(c => {
        const custInsts = installments.filter(i => i.CustomerID === c.CustomerID);
        let book = 'None';
        if(custInsts.length > 0) {
            const active = custInsts.find(i => i.Status === 'Active') || custInsts[0];
            book = active.CollectionBook;
        }

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${c.CustomerID}</td>
            <td><strong>${c.CustomerName}</strong></td>
            <td>${c.Phone || '-'}</td>
            <td><span class="badge" style="background-color: var(--${book.toLowerCase().replace(' book', '')}-color); position: static;">${book}</span></td>
            <td>
                <button class="btn btn-primary btn-sm" onclick="openCustomerHistory('${c.CustomerID}')"><i class="fa-solid fa-clock-rotate-left"></i> View Ledger</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function filterPhCustomers() {
    const q = document.getElementById('phSearchInput').value.toLowerCase();
    const trs = document.querySelectorAll('#phTableBody tr');
    trs.forEach(tr => {
        if(tr.innerText.toLowerCase().includes(q)) {
            tr.style.display = '';
        } else {
            tr.style.display = 'none';
        }
    });
}

const origSwitchPage = window.switchPage;
if (origSwitchPage) {
    window.switchPage = function(pageId) {
        origSwitchPage(pageId);
        if (pageId === 'paymentHistory') {
            loadPhCustomers();
        }
    };
} else {
    document.addEventListener('DOMContentLoaded', () => {
        const oldSwitch = window.switchPage;
        window.switchPage = function(pageId) {
            if(oldSwitch) oldSwitch(pageId);
            if (pageId === 'paymentHistory') {
                loadPhCustomers();
            }
        };
    });
}
