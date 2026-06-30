// js/products.js

let currentEditingProductId = null;

document.addEventListener('DOMContentLoaded', () => {
    // Initial Load
    loadProducts();

    // Filter Logic
    document.querySelectorAll('#products .filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('#products .filter-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            filterProducts(e.target.dataset.filter);
        });
    });

    // Search Logic
    document.getElementById('productSearch')?.addEventListener('input', (e) => {
        searchProducts(e.target.value);
    });

    // Photo Upload Preview
    document.getElementById('prodPhotoInput')?.addEventListener('change', function() {
        if (this.files && this.files[0]) {
            const reader = new FileReader();
            reader.onload = function(e) {
                document.getElementById('prodPhotoPreview').innerHTML = `<img src="${e.target.result}" alt="Product Image">`;
            };
            reader.readAsDataURL(this.files[0]);
        }
    });
});

function removeProdPhoto() {
    document.getElementById('prodPhotoInput').value = '';
    document.getElementById('prodPhotoPreview').innerHTML = '<i class="fa-solid fa-image"></i>';
}

function openProductModal(productId = null) {
    clearProductForm();
    if (productId) {
        currentEditingProductId = productId;
        document.getElementById('productModalTitle').innerText = 'Edit Product';
        populateProductForm(productId);
    } else {
        currentEditingProductId = null;
        document.getElementById('productModalTitle').innerText = 'Add New Product';
        document.getElementById('prodID').value = generateProductID();
    }
    document.getElementById('productModal').classList.add('active');
}

function closeProductModal() {
    document.getElementById('productModal').classList.remove('active');
}

function clearProductForm() {
    document.getElementById('productForm').reset();
    document.getElementById('prodID').value = generateProductID();
    removeProdPhoto();
    currentEditingProductId = null;
}

function generateProductID() {
    const products = JSON.parse(localStorage.getItem('products')) || [];
    if (products.length === 0) return 'PRD000001';
    
    // Find highest ID
    let maxId = 0;
    products.forEach(p => {
        const num = parseInt(p.ProductID.replace('PRD', ''));
        if (num > maxId) maxId = num;
    });
    
    return 'PRD' + String(maxId + 1).padStart(6, '0');
}

function saveProduct() {
    if (!validateProduct()) return;

    const products = JSON.parse(localStorage.getItem('products')) || [];
    
    // Base64 Photo if any
    const photoPreview = document.getElementById('prodPhotoPreview').querySelector('img');
    const photoData = photoPreview ? photoPreview.src : null;

    const productObj = {
        ProductID: document.getElementById('prodID').value,
        ProductName: document.getElementById('prodName').value,
        Brand: document.getElementById('prodBrand').value,
        Category: document.getElementById('prodCategory').value,
        ModelNumber: document.getElementById('prodModel').value,
        SerialNumber: document.getElementById('prodSerial').value,
        Barcode: document.getElementById('prodBarcode').value,
        PurchasePrice: parseFloat(document.getElementById('prodPurchasePrice').value || 0),
        SellingPrice: parseFloat(document.getElementById('prodSellingPrice').value),
        Warranty: document.getElementById('prodWarranty').value,
        Supplier: document.getElementById('prodSupplier').value,
        Image: photoData,
        Status: 'Active',
        CreatedDate: new Date().toISOString(),
        LastUpdated: new Date().toISOString()
    };

    if (currentEditingProductId) {
        // Update existing
        const index = products.findIndex(p => p.ProductID === currentEditingProductId);
        if (index !== -1) {
            productObj.CreatedDate = products[index].CreatedDate;
            productObj.Status = products[index].Status;
            products[index] = productObj;
            showNotification('Product updated successfully!', 'success');
        }
    } else {
        // Add new
        products.push(productObj);
        showNotification('Product added successfully!', 'success');
    }

    localStorage.setItem('products', JSON.stringify(products));
    
    closeProductModal();
    loadProducts();
}

function validateProduct() {
    const name = document.getElementById('prodName').value.trim();
    const sp = parseFloat(document.getElementById('prodSellingPrice').value);
    const pp = parseFloat(document.getElementById('prodPurchasePrice').value || 0);
    const serial = document.getElementById('prodSerial').value.trim();
    const barcode = document.getElementById('prodBarcode').value.trim();

    if (!name) { showNotification('Product Name is required.', 'error'); return false; }
    if (isNaN(sp) || sp <= 0) { showNotification('Selling Price must be greater than zero.', 'error'); return false; }
    if (pp > sp) {
        if (!confirm('Purchase Price is greater than Selling Price. Are you sure?')) return false;
    }

    // Duplicate Check (excluding current editing)
    const products = JSON.parse(localStorage.getItem('products')) || [];
    const others = products.filter(p => p.ProductID !== currentEditingProductId);
    
    if (serial && others.some(p => p.SerialNumber === serial)) {
        showNotification('Duplicate Serial Number detected.', 'error'); return false;
    }
    if (barcode && others.some(p => p.Barcode === barcode)) {
        showNotification('Duplicate Barcode detected.', 'error'); return false;
    }

    return true;
}

function loadProducts(productsToLoad = null) {
    const tbody = document.getElementById('productsTableBody');
    if (!tbody) return;

    let products = productsToLoad || JSON.parse(localStorage.getItem('products')) || [];
    
    tbody.innerHTML = '';

    if (products.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted">No products found.</td></tr>`;
        return;
    }

    products.forEach(p => {
        const tr = document.createElement('tr');
        const imgHtml = p.Image 
            ? `<img src="${p.Image}" class="product-thumbnail">`
            : `<div class="product-thumbnail placeholder"><i class="fa-solid fa-box"></i></div>`;

        tr.innerHTML = `
            <td>${imgHtml}</td>
            <td>${p.ProductID}</td>
            <td><strong>${p.ProductName}</strong></td>
            <td><span class="badge" style="background-color: var(--secondary); position: static;">${p.Category || 'Other'}</span></td>
            <td>${p.Brand || '-'}</td>
            <td><strong>${formatCurrency(p.SellingPrice)}</strong></td>
            <td>${p.Warranty || '-'}</td>
            <td>
                <div class="action-btns">
                    <button class="btn-icon btn-view" onclick="viewProductDetails('${p.ProductID}')" title="View"><i class="fa-solid fa-eye"></i></button>
                    <button class="btn-icon btn-edit" onclick="openProductModal('${p.ProductID}')" title="Edit"><i class="fa-solid fa-pen"></i></button>
                    <button class="btn-icon btn-delete" onclick="deleteProduct('${p.ProductID}')" title="Delete"><i class="fa-solid fa-trash"></i></button>
                    <button class="btn btn-outline btn-sm ml-2" onclick="selectProductForInstallment('${p.ProductID}')">Select</button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function populateProductForm(id) {
    const products = JSON.parse(localStorage.getItem('products')) || [];
    const p = products.find(x => x.ProductID === id);
    if (!p) return;

    document.getElementById('prodID').value = p.ProductID;
    document.getElementById('prodName').value = p.ProductName;
    document.getElementById('prodBrand').value = p.Brand || '';
    document.getElementById('prodCategory').value = p.Category || '';
    document.getElementById('prodModel').value = p.ModelNumber || '';
    document.getElementById('prodSerial').value = p.SerialNumber || '';
    document.getElementById('prodBarcode').value = p.Barcode || '';
    document.getElementById('prodPurchasePrice').value = p.PurchasePrice || '';
    document.getElementById('prodSellingPrice').value = p.SellingPrice;
    document.getElementById('prodWarranty').value = p.Warranty || '';
    document.getElementById('prodSupplier').value = p.Supplier || '';

    if (p.Image) {
        document.getElementById('prodPhotoPreview').innerHTML = `<img src="${p.Image}" alt="Product Image">`;
    } else {
        removeProdPhoto();
    }
}

function deleteProduct(id) {
    if(confirm(`Are you sure you want to delete product ${id}?`)) {
        let products = JSON.parse(localStorage.getItem('products')) || [];
        products = products.filter(p => p.ProductID !== id);
        localStorage.setItem('products', JSON.stringify(products));
        showNotification('Product deleted successfully.', 'success');
        loadProducts();
    }
}

function filterProducts(category) {
    const products = JSON.parse(localStorage.getItem('products')) || [];
    if (category === 'All') {
        loadProducts(products);
    } else {
        loadProducts(products.filter(p => p.Category === category));
    }
}

function searchProducts(query) {
    const products = JSON.parse(localStorage.getItem('products')) || [];
    query = query.toLowerCase();
    
    const results = products.filter(p => 
        p.ProductName.toLowerCase().includes(query) ||
        p.ProductID.toLowerCase().includes(query) ||
        (p.Brand && p.Brand.toLowerCase().includes(query)) ||
        (p.Category && p.Category.toLowerCase().includes(query)) ||
        (p.Barcode && p.Barcode.toLowerCase().includes(query))
    );
    
    loadProducts(results);
}

// Placeholders for Export/Import
function exportProducts() { exportCSV('products'); }
function importProducts() { 
    const backupNav = document.querySelector('li[data-target=\'backup\']');
    if(backupNav) backupNav.click(); 
}
function printProducts() { 
    window.print(); 
}

function viewProductDetails(id) {
    const products = JSON.parse(localStorage.getItem('products')) || [];
    const p = products.find(x => x.ProductID === id);
    if(!p) return;
    
    let html = '';
    for(let key in p) {
        if(key !== 'Photo' && key !== 'Notes') {
            html += `<div><strong>${key}:</strong> <br>${p[key]}</div>`;
        }
    }
    if(p.Notes) {
        html += `<div style="grid-column: 1 / -1;"><strong>Notes:</strong> <br>${p.Notes}</div>`;
    }
    
    const body = document.getElementById('viewProductModalBody');
    if(body) {
        body.innerHTML = html;
        document.getElementById('viewProductModal').classList.add('active');
    }
}

function selectProductForInstallment(productId) {
    document.querySelector('li[data-target=\'installments\']').click();
    if(typeof openInstallmentModal === 'function') {
        openInstallmentModal();
        // Since we need to support multiple products, this is handled later.
        setTimeout(() => {
            const select = document.getElementById('instProduct');
            if (select) {
                // If it's a multiple select or single select, try to set it
                const option = Array.from(select.options).find(opt => opt.value === productId || opt.text.includes(productId));
                if (option) {
                    option.selected = true;
                    // Trigger change event if needed
                    select.dispatchEvent(new Event('change'));
                }
            }
        }, 100);
    }
}
