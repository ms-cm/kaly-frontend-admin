const API_URL = window.location.hostname === 'localhost' ? 'http://localhost:5000' : 'https://kaly-backend.onrender.com/api';

let adminPassword = '';

// Check authentication
function checkAuth() {
    // Utilise la clé exacte enregistrée par index.html
    adminPassword = localStorage.getItem('kaly_admin_pwd');
    if (!adminPassword) {
        window.location.href = 'index.html';
    }
}

// Logout
function logout() {
    if (confirm('Voulez-vous vraiment vous déconnecter ?')) {
        localStorage.removeItem('kaly_admin_pwd');
        window.location.href = 'index.html';
    }
}

// Show section
function showSection(section) {
    // Masquer toutes les sections (classe .sec dans ton dashboard.html)
    document.querySelectorAll('.sec').forEach(s => {
        s.classList.remove('on');
        s.style.display = 'none';
    });
    
    // Retirer l'état actif du menu latéral
    document.querySelectorAll('.nav-items li, .sb-menu li').forEach(item => {
        item.classList.remove('on');
    });
    
    // Correspondance exacte avec les IDs de ton dashboard.html
    const sectionMap = {
        'products': 'sec-prods',
        'add-product': 'sec-add',
        'promo': 'sec-promos',
        'stats': 'sec-dash'
    };
    
    const sectionId = sectionMap[section];
    if (sectionId) {
        const sec = document.getElementById(sectionId);
        if (sec) {
            sec.classList.add('on');
            sec.style.display = 'block';
        }
    }
    
    // Mettre à jour le titre principal (ID plbl)
    const titles = {
        'products': 'Gestion des Produits',
        'add-product': 'Ajouter un Produit',
        'promo': 'Codes Promo',
        'stats': 'Tableau de bord'
    };
    
    const pageTitle = document.getElementById('plbl');
    if (pageTitle) pageTitle.textContent = titles[section];
    
    // Charger les données de la section
    if (section === 'products') loadProducts();
    else if (section === 'stats') loadStats();
    else if (section === 'promo') loadPromos();
}

// Load stats
async function loadStats() {
    try {
        // Route exacte présente dans ton server.js
        const response = await fetch(`${API_URL}/admin/stats`, {
            headers: { 'password': adminPassword }
        });
        
        if (response.status === 401 || response.status === 403) {
            localStorage.removeItem('kaly_admin_pwd');
            window.location.href = 'index.html';
            return;
        }
        
        const stats = await response.json();
        
        // Mise à jour des compteurs (IDs: sp, su, spr, sf)
        if (document.getElementById('sp')) document.getElementById('sp').textContent = stats.totalProducts || 0;
        if (document.getElementById('su')) document.getElementById('su').textContent = stats.totalUsers || 0;
        if (document.getElementById('spr')) document.getElementById('spr').textContent = stats.totalPromos || 0;
        if (document.getElementById('sf')) document.getElementById('sf').textContent = stats.featured || 0;
        
        // Tableau Stock Faible (ID: tb-low)
        const lowStockBody = document.getElementById('tb-low');
        if (lowStockBody) {
            lowStockBody.innerHTML = '';
            // Si ton serveur renvoie un nombre ou si la liste est vide
            if (!stats.lowStockList || stats.lowStockList.length === 0) {
                lowStockBody.innerHTML = `<tr><td colspan="3" style="text-align:center; padding:15px; color:var(--muted);">Aucun produit (ou stock faible général : ${stats.lowStock || 0})</td></tr>`;
            } else {
                stats.lowStockList.forEach(p => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td>${p.name}</td>
                        <td>${p.category || 'Général'}</td>
                        <td style="color:var(--rose); font-weight:600;">${p.stock} restant(s)</td>
                    `;
                    lowStockBody.appendChild(tr);
                });
            }
        }

        // Tableau Catégories (ID: tb-cat)
        const catBody = document.getElementById('tb-cat');
        if (catBody) {
            catBody.innerHTML = '';
            const categoriesData = stats.categories || [];
            if (categoriesData.length === 0) {
                catBody.innerHTML = '<tr><td colspan="2" style="text-align:center; padding:15px; color:var(--muted);">Aucune catégorie</td></tr>';
            } else {
                categoriesData.forEach(c => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td>${c._id || 'Non classé'}</td>
                        <td><strong>${c.count}</strong></td>
                    `;
                    catBody.appendChild(tr);
                });
            }
        }
        
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// Load products
async function loadProducts() {
    const tbody = document.getElementById('tb-prods');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:20px; color:var(--muted);">Chargement...</td></tr>';
    
    try {
        const response = await fetch(`${API_URL}/products`);
        const products = await response.json();
        
        tbody.innerHTML = '';
        
        if (!products || products.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:20px; color:var(--muted);">Aucun produit trouvé</td></tr>';
            return;
        }
        
        products.forEach(p => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><img src="${p.image}" alt="${p.name}" style="width:40px; height:40px; object-fit:cover; border-radius:6px;"></td>
                <td><strong>${p.name}</strong></td>
                <td><span class="tag">${p.category}</span></td>
                <td>${p.price.toLocaleString()} XOF</td>
                <td>${p.stock}</td>
                <td>
                    <button class="btn" onclick="deleteProduct('${p._id}')" style="background:#ff4d4d; color:white; padding:5px 10px; font-size:12px; border-radius:6px; border:none; cursor:pointer;">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (error) {
        console.error('Error loading products:', error);
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:20px; color:red;">Erreur de chargement</td></tr>';
    }
}

// Delete product
async function deleteProduct(id) {
    if (!confirm('Voulez-vous vraiment supprimer ce produit ?')) return;
    
    try {
        const response = await fetch(`${API_URL}/products/${id}`, {
            method: 'DELETE',
            headers: { 'password': adminPassword }
        });
        
        if (response.ok) {
            loadProducts();
        } else {
            alert('Erreur lors de la suppression');
        }
    } catch (error) {
        console.error('Error deleting product:', error);
    }
}

// Load promos
async function loadPromos() {
    const tbody = document.getElementById('tb-promos');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px; color:var(--muted);">Chargement...</td></tr>';
    
    try {
        const response = await fetch(`${API_URL}/promos`, {
            headers: { 'password': adminPassword }
        });
        const promos = await response.json();
        
        tbody.innerHTML = '';
        
        if (!promos || promos.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px; color:var(--muted);">Aucun code promo actif</td></tr>';
            return;
        }
        
        promos.forEach(p => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${p.code}</strong></td>
                <td>${p.discount}%</td>
                <td><span style="color:green; font-weight:600;">Actif</span></td>
                <td>
                    <button class="btn" onclick="deletePromo('${p._id}')" style="background:#ff4d4d; color:white; padding:5px 10px; font-size:12px; border-radius:6px; border:none; cursor:pointer;">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (error) {
        console.error('Error loading promos:', error);
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px; color:red;">Erreur de chargement</td></tr>';
    }
}

// Delete promo
async function deletePromo(id) {
    if (!confirm('Supprimer ce code promo ?')) return;
    
    try {
        const response = await fetch(`${API_URL}/promos/${id}`, {
            method: 'DELETE',
            headers: { 'password': adminPassword }
        });
        
        if (response.ok) {
            loadPromos();
        }
    } catch (error) {
        console.error('Error deleting promo:', error);
    }
}

// Initialisation au chargement du DOM
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    
    // Branchement des boutons du menu latéral (dashboard.html)
    document.getElementById('n-dash')?.addEventListener('click', () => showSection('stats'));
    document.getElementById('n-prods')?.addEventListener('click', () => showSection('products'));
    document.getElementById('n-add')?.addEventListener('click', () => showSection('add-product'));
    document.getElementById('n-promos')?.addEventListener('click', () => showSection('promo'));
    
    // Bouton de rafraîchissement
    document.getElementById('btn-refresh')?.addEventListener('click', () => loadStats());
    
    // Raccourcis internes
    document.getElementById('btn-go-add')?.addEventListener('click', () => showSection('add-product'));
    document.getElementById('btn-back-prods')?.addEventListener('click', () => showSection('products'));
    
    // Actions de déconnexion
    document.getElementById('lout-btn')?.addEventListener('click', logout);
    document.getElementById('sb-lout')?.addEventListener('click', logout);
    
    // Premier chargement de l'accueil
    loadStats();
});
        
