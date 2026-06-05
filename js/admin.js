// IMPORTANT: Remplacez par votre URL backend Render
const API_URL = 'https://kaly-backend.onrender.com/api';

let adminPassword = '';
let editingProductId = null;
let uploadedImageUrls = [];

// Check authentication
function checkAuth() {
    adminPassword = localStorage.getItem('kaly_admin_password');
    if (!adminPassword) {
        window.location.href = 'index.html';
    }
}

// Logout
function logout() {
    if (confirm('Voulez-vous vraiment vous déconnecter?')) {
        localStorage.removeItem('kaly_admin_password');
        window.location.href = 'index.html';
    }
}

// Show section
function showSection(section) {
    // Hide all sections
    document.querySelectorAll('.content-section').forEach(s => {
        s.style.display = 'none';
    });
    
    // Remove active class from nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Show selected section
    const sectionMap = {
        'products': 'products-section',
        'add-product': 'add-product-section',
        'promo': 'promo-section',
        'stats': 'stats-section'
    };
    
    const sectionId = sectionMap[section];
    if (sectionId) {
        document.getElementById(sectionId).style.display = 'block';
    }
    
    // Update page title
    const titles = {
        'products': 'Gestion des Produits',
        'add-product': 'Ajouter un Produit',
        'promo': 'Codes Promo',
        'stats': 'Statistiques'
    };
    
    document.getElementById('page-title').textContent = titles[section];
    
    // Load data for section
    if (section === 'products') {
        loadProducts();
    } else if (section === 'stats') {
        loadStats();
    }
}

// Load products
async function loadProducts() {
    try {
        const response = await fetch(`${API_URL}/products`, {
            headers: { 'password': adminPassword }
        });
        
        const products = await response.json();
        const tbody = document.getElementById('products-list');
        
        if (products.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:2rem;">Aucun produit. Ajoutez-en un!</td></tr>';
            return;
        }
        
        tbody.innerHTML = products.map(product => `
            <tr>
                <td>
                    <img src="${product.images && product.images[0] ? product.images[0] : 'https://via.placeholder.com/60'}" 
                         class="product-image-thumb" alt="${product.name}">
                </td>
                <td>${product.name}</td>
                <td>${product.category}</td>
                <td>${product.price.toLocaleString()} FCFA</td>
                <td>${product.stock}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-sm btn-primary" onclick="editProduct('${product._id}')">
                            <i class="fas fa-edit"></i> Modifier
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="deleteProduct('${product._id}')">
                            <i class="fas fa-trash"></i> Supprimer
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error loading products:', error);
        document.getElementById('products-list').innerHTML = '<tr><td colspan="6" style="text-align:center; color:red;">Erreur de chargement</td></tr>';
    }
}

// Preview images before upload
function previewImages() {
    const files = document.getElementById('product-images').files;
    const preview = document.getElementById('image-preview');
    preview.innerHTML = '';
    
    if (files.length === 0) return;
    
    Array.from(files).forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const div = document.createElement('div');
            div.className = 'preview-item';
            div.innerHTML = `<img src="${e.target.result}" alt="Preview ${index + 1}">`;
            preview.appendChild(div);
        };
        reader.readAsDataURL(file);
    });
}

// Upload image to Cloudinary
async function uploadImage(file) {
    const formData = new FormData();
    formData.append('image', file);
    
    try {
        const response = await fetch(`${API_URL}/upload`, {
            method: 'POST',
            headers: { 'password': adminPassword },
            body: formData
        });
        
        if (!response.ok) {
            throw new Error('Upload failed');
        }
        
        const data = await response.json();
        return data.url;
    } catch (error) {
        console.error('Upload error:', error);
        throw error;
    }
}

// Product form submit
document.getElementById('product-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const messageDiv = document.getElementById('form-message');
    messageDiv.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enregistrement en cours...';
    messageDiv.className = 'form-message';
    
    try {
        // Upload new images if any
        const imageFiles = document.getElementById('product-images').files;
        const newImageUrls = [];
        
        if (imageFiles.length > 0) {
            messageDiv.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Upload des images...';
            
            for (let file of imageFiles) {
                const url = await uploadImage(file);
                newImageUrls.push(url);
            }
        }
        
        // Combine with existing images if editing
        const allImages = [...uploadedImageUrls, ...newImageUrls];
        
        if (allImages.length === 0) {
            throw new Error('Veuillez ajouter au moins une image');
        }
        
        // Prepare product data
        const productData = {
            name: document.getElementById('product-name').value,
            price: parseFloat(document.getElementById('product-price').value),
            category: document.getElementById('product-category').value,
            stock: parseInt(document.getElementById('product-stock').value),
            description: document.getElementById('product-description').value,
            images: allImages,
            featured: document.getElementById('product-featured').checked,
            sizes: document.getElementById('product-sizes').value
                .split(',')
                .map(s => s.trim())
                .filter(s => s),
            colors: document.getElementById('product-colors').value
                .split(',')
                .map(c => c.trim())
                .filter(c => c)
        };
        
        // Create or update product
        const url = editingProductId 
            ? `${API_URL}/products/${editingProductId}`
            : `${API_URL}/products`;
        
        const method = editingProductId ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'password': adminPassword
            },
            body: JSON.stringify(productData)
        });
        
        if (!response.ok) throw new Error('Failed to save product');
        
        showMessage('form-message', '✓ Produit enregistré avec succès!', 'success');
        
        setTimeout(() => {
            resetForm();
            showSection('products');
        }, 2000);
        
    } catch (error) {
        console.error('Error:', error);
        showMessage('form-message', '❌ Erreur: ' + error.message, 'error');
    }
});

// Edit product
async function editProduct(id) {
    editingProductId = id;
    
    try {
        const response = await fetch(`${API_URL}/products/${id}`, {
            headers: { 'password': adminPassword }
        });
        
        const product = await response.json();
        
        // Fill form
        document.getElementById('product-id').value = product._id;
        document.getElementById('product-name').value = product.name;
        document.getElementById('product-price').value = product.price;
        document.getElementById('product-category').value = product.category;
        document.getElementById('product-stock').value = product.stock;
        document.getElementById('product-description').value = product.description || '';
        document.getElementById('product-sizes').value = product.sizes ? product.sizes.join(', ') : '';
        document.getElementById('product-colors').value = product.colors ? product.colors.join(', ') : '';
        document.getElementById('product-featured').checked = product.featured || false;
        
        // Store existing images
        uploadedImageUrls = product.images || [];
        
        // Display existing images
        const uploadedDiv = document.getElementById('uploaded-images');
        uploadedDiv.innerHTML = uploadedImageUrls.map((url, index) => `
            <div class="uploaded-item">
                <img src="${url}" alt="Image ${index + 1}">
            </div>
        `).join('');
        
        // Update form title
        document.getElementById('form-title').textContent = 'Modifier le Produit';
        
        // Show form
        showSection('add-product');
        
    } catch (error) {
        console.error('Error:', error);
        alert('❌ Erreur lors du chargement du produit');
    }
}

// Delete product
async function deleteProduct(id) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce produit?')) return;
    
    try {
        const response = await fetch(`${API_URL}/products/${id}`, {
            method: 'DELETE',
            headers: { 'password': adminPassword }
        });
        
        if (!response.ok) throw new Error('Delete failed');
        
        alert('✓ Produit supprimé avec succès');
        loadProducts();
        
    } catch (error) {
        console.error('Error:', error);
        alert('❌ Erreur lors de la suppression');
    }
}

// Cancel edit
function cancelEdit() {
    resetForm();
    showSection('products');
}

// Reset form
function resetForm() {
    document.getElementById('product-form').reset();
    document.getElementById('product-id').value = '';
    document.getElementById('image-preview').innerHTML = '';
    document.getElementById('uploaded-images').innerHTML = '';
    document.getElementById('form-message').innerHTML = '';
    document.getElementById('form-title').textContent = 'Ajouter un Produit';
    editingProductId = null;
    uploadedImageUrls = [];
}

// Promo form
document.getElementById('promo-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const promoData = {
        code: document.getElementById('promo-code').value.toUpperCase(),
        discount: parseInt(document.getElementById('promo-discount').value),
        expiresAt: document.getElementById('promo-expires').value || null
    };
    
    try {
        const response = await fetch(`${API_URL}/promo`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'password': adminPassword
            },
            body: JSON.stringify(promoData)
        });
        
        if (!response.ok) throw new Error('Failed to create promo');
        
        showMessage('promo-message', '✓ Code promo créé avec succès!', 'success');
        document.getElementById('promo-form').reset();
        
    } catch (error) {
        console.error('Error:', error);
        showMessage('promo-message', '❌ Erreur lors de la création du code promo', 'error');
    }
});

// Load stats
async function loadStats() {
    try {
        const response = await fetch(`${API_URL}/products`, {
            headers: { 'password': adminPassword }
        });
        
        const products = await response.json();
        
        document.getElementById('total-products').textContent = products.length;
        document.getElementById('in-stock').textContent = products.filter(p => p.stock > 0).length;
        document.getElementById('out-stock').textContent = products.filter(p => p.stock === 0).length;
        document.getElementById('featured-count').textContent = products.filter(p => p.featured).length;
        
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// Show message
function showMessage(elementId, message, type) {
    const element = document.getElementById(elementId);
    element.textContent = message;
    element.className = `form-message ${type}`;
}

// Initialize
checkAuth();
loadProducts();
