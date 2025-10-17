// Sara Uylar - Modern Web App

class SaraApp {
  constructor() {
    this.tg = window.Telegram?.WebApp;
    this.currentPage = 'home';
    this.listings = [];
    this.favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
    this.init();
  }

  init() {
    this.setupTelegram();
    this.setupRouter();
    this.loadPage('home');
    this.setupEventListeners();
  }

  setupTelegram() {
    if (this.tg) {
      this.tg.ready();
      this.tg.expand();
      this.tg.MainButton.setText('E\'lon qo\'shish');
      this.tg.MainButton.onClick(() => this.showPage('add-listing'));
      this.tg.MainButton.show();
      
      if (this.tg.colorScheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
      }
    }
  }

  setupRouter() {
    window.addEventListener('hashchange', () => {
      const page = location.hash.slice(1) || 'home';
      this.loadPage(page);
    });
  }

  setupEventListeners() {
    // Search
    document.addEventListener('input', (e) => {
      if (e.target.matches('#search-input')) {
        this.debounce(() => this.search(e.target.value), 300)();
      }
    });

    // Navigation
    document.addEventListener('click', (e) => {
      if (e.target.matches('[data-page]')) {
        e.preventDefault();
        this.showPage(e.target.dataset.page);
      }
      
      if (e.target.matches('[data-listing-id]')) {
        this.showListing(e.target.dataset.listingId);
      }
      
      if (e.target.matches('[data-favorite]')) {
        this.toggleFavorite(e.target.dataset.favorite);
      }
    });

    // Pull to refresh
    let startY = 0;
    let pulling = false;
    
    document.addEventListener('touchstart', (e) => {
      if (window.scrollY === 0) {
        startY = e.touches[0].clientY;
        pulling = true;
      }
    });
    
    document.addEventListener('touchmove', (e) => {
      if (pulling && e.touches[0].clientY - startY > 100) {
        this.refresh();
        pulling = false;
      }
    });
  }

  async loadPage(page) {
    this.currentPage = page;
    const app = document.getElementById('app');
    
    try {
      switch (page) {
        case 'home':
          app.innerHTML = await this.renderHome();
          await this.loadListings();
          break;
        case 'search':
          app.innerHTML = await this.renderSearch();
          break;
        case 'add-listing':
          app.innerHTML = await this.renderAddListing();
          break;
        case 'profile':
          app.innerHTML = await this.renderProfile();
          break;
        case 'favorites':
          app.innerHTML = await this.renderFavorites();
          break;
        default:
          if (page.startsWith('listing-')) {
            const id = page.split('-')[1];
            app.innerHTML = await this.renderListingDetails(id);
          }
      }
    } catch (error) {
      console.error('Page load error:', error);
      this.showSnackbar('Sahifa yuklanmadi', 'error');
    }
  }

  showPage(page) {
    location.hash = page;
  }

  async renderHome() {
    return `
      <div class="md-top-app-bar">
        <button class="md-icon-button" onclick="app.showPage('profile')">👤</button>
        <h1 class="title-large">🏠 Sara Uylar</h1>
        <button class="md-icon-button" onclick="app.showPage('favorites')">❤️</button>
      </div>
      
      <div class="p-16">
        <div class="md-text-field">
          <input type="text" id="search-input" placeholder=" ">
          <label>🔍 Qidiruv...</label>
        </div>
        
        <div class="flex gap-8 mb-16">
          <div class="md-chip" onclick="app.filterByType('kvartira')">🏠 Kvartira</div>
          <div class="md-chip" onclick="app.filterByType('uy')">🏡 Uy</div>
          <div class="md-chip" onclick="app.filterByType('ofis')">🏢 Ofis</div>
        </div>
        
        <div id="listings-container">
          <div class="text-center p-16">
            <div class="loading">Yuklanmoqda...</div>
          </div>
        </div>
      </div>
      
      <button class="md-fab" onclick="app.showPage('add-listing')">➕</button>
    `;
  }

  async renderSearch() {
    return `
      <div class="md-top-app-bar">
        <button class="md-icon-button" onclick="history.back()">←</button>
        <h1 class="title-large">🔍 Qidiruv</h1>
      </div>
      
      <div class="p-16">
        <div class="md-text-field">
          <input type="text" id="search-input" placeholder=" " autofocus>
          <label>Qidiruv so'zi...</label>
        </div>
        
        <div class="md-card">
          <h3 class="title-medium mb-16">Filtrlash</h3>
          <div class="flex gap-8 mb-16">
            <div class="md-text-field flex-1">
              <input type="number" id="min-price" placeholder=" ">
              <label>Min narx ($)</label>
            </div>
            <div class="md-text-field flex-1">
              <input type="number" id="max-price" placeholder=" ">
              <label>Max narx ($)</label>
            </div>
          </div>
          <button class="md-filled-button w-full" onclick="app.applyFilters()">Filtrlash</button>
        </div>
        
        <div id="search-results"></div>
      </div>
    `;
  }

  async renderAddListing() {
    const userId = this.tg?.initDataUnsafe?.user?.id || 123456789;
    
    return `
      <div class="md-top-app-bar">
        <button class="md-icon-button" onclick="history.back()">←</button>
        <h1 class="title-large">➕ E'lon qo'shish</h1>
      </div>
      
      <div class="p-16">
        <form id="add-listing-form" class="space-y-16">
          <div class="md-text-field">
            <input type="text" name="title" required placeholder=" ">
            <label>📝 Sarlavha *</label>
          </div>
          
          <div class="md-text-field">
            <textarea name="description" rows="4" placeholder=" "></textarea>
            <label>📄 Tavsif</label>
          </div>
          
          <div class="md-text-field">
            <input type="number" name="price" required placeholder=" ">
            <label>💰 Narx (USD) *</label>
          </div>
          
          <div class="md-text-field">
            <input type="text" name="location" required placeholder=" ">
            <label>📍 Joylashuv *</label>
          </div>
          
          <div class="md-text-field">
            <select name="property_type" required>
              <option value="">Tanlang</option>
              <option value="kvartira">Kvartira</option>
              <option value="uy">Uy</option>
              <option value="ofis">Ofis</option>
              <option value="dokon">Do'kon</option>
            </select>
            <label>🏠 Mulk turi *</label>
          </div>
          
          <div class="flex gap-8">
            <div class="md-text-field flex-1">
              <input type="number" name="rooms" min="1" value="1" placeholder=" ">
              <label>🚪 Xonalar</label>
            </div>
            <div class="md-text-field flex-1">
              <input type="number" name="area" step="0.1" placeholder=" ">
              <label>📏 Maydon (m²)</label>
            </div>
          </div>
          
          <div class="md-text-field">
            <input type="tel" name="phone" placeholder=" ">
            <label>📞 Telefon</label>
          </div>
          
          <div class="md-text-field">
            <input type="file" name="images" accept="image/*" multiple>
            <label>📷 Rasmlar</label>
          </div>
          
          <input type="hidden" name="user_id" value="${userId}">
          
          <button type="submit" class="md-filled-button w-full">
            ✅ E'lonni saqlash
          </button>
        </form>
      </div>
    `;
  }

  async renderProfile() {
    const user = this.tg?.initDataUnsafe?.user || { first_name: 'User', id: 123456789 };
    
    return `
      <div class="md-top-app-bar">
        <button class="md-icon-button" onclick="history.back()">←</button>
        <h1 class="title-large">👤 Profil</h1>
      </div>
      
      <div class="p-16">
        <div class="md-card text-center mb-16">
          <div style="width: 80px; height: 80px; border-radius: 40px; background: var(--md-sys-color-primary); color: var(--md-sys-color-on-primary); display: flex; align-items: center; justify-content: center; font-size: 32px; margin: 0 auto 16px;">
            ${user.first_name?.charAt(0) || 'U'}
          </div>
          <h2 class="title-large">${user.first_name} ${user.last_name || ''}</h2>
          ${user.username ? `<p class="body-medium">@${user.username}</p>` : ''}
        </div>
        
        <div class="md-list">
          <div class="md-list-item" onclick="app.showPage('favorites')">
            <span style="font-size: 24px;">❤️</span>
            <div class="md-list-item-content">
              <div class="md-list-item-title">Sevimlilar</div>
              <div class="md-list-item-subtitle">${this.favorites.length} ta e'lon</div>
            </div>
            <span>→</span>
          </div>
          
          <div class="md-list-item" onclick="app.showMyListings()">
            <span style="font-size: 24px;">📋</span>
            <div class="md-list-item-content">
              <div class="md-list-item-title">Mening e'lonlarim</div>
              <div class="md-list-item-subtitle">Barcha e'lonlarim</div>
            </div>
            <span>→</span>
          </div>
          
          <div class="md-list-item" onclick="app.showSettings()">
            <span style="font-size: 24px;">⚙️</span>
            <div class="md-list-item-content">
              <div class="md-list-item-title">Sozlamalar</div>
              <div class="md-list-item-subtitle">Ilova sozlamalari</div>
            </div>
            <span>→</span>
          </div>
        </div>
      </div>
    `;
  }

  async loadListings() {
    try {
      const response = await fetch('api/listings.php');
      const data = await response.json();
      this.listings = data.listings || [];
      this.renderListings();
    } catch (error) {
      console.error('Listings load error:', error);
      this.showSnackbar('E\'lonlar yuklanmadi', 'error');
    }
  }

  renderListings(listings = this.listings) {
    const container = document.getElementById('listings-container');
    if (!container) return;
    
    if (listings.length === 0) {
      container.innerHTML = `
        <div class="text-center p-16">
          <p class="body-large">E'lonlar topilmadi</p>
        </div>
      `;
      return;
    }
    
    container.innerHTML = listings.map(listing => `
      <div class="md-card fade-in" data-listing-id="${listing.id}">
        <div class="flex justify-between items-center mb-8">
          <h3 class="title-medium">${listing.title}</h3>
          <button class="md-icon-button" data-favorite="${listing.id}">
            ${this.favorites.includes(listing.id) ? '❤️' : '🤍'}
          </button>
        </div>
        
        <div class="body-medium mb-8">
          💰 $${Number(listing.price).toLocaleString()} • 
          📍 ${listing.location} • 
          🚪 ${listing.rooms} xona
        </div>
        
        <p class="body-small mb-16">${listing.description?.substring(0, 100)}...</p>
        
        <div class="flex justify-between items-center">
          <span class="label-small">👁️ ${listing.views || 0} ko'rilgan</span>
          <button class="md-filled-button" onclick="app.showPage('listing-${listing.id}')">
            Ko'rish
          </button>
        </div>
      </div>
    `).join('');
  }

  async search(query) {
    if (!query.trim()) {
      this.renderListings();
      return;
    }
    
    const filtered = this.listings.filter(listing => 
      listing.title.toLowerCase().includes(query.toLowerCase()) ||
      listing.location.toLowerCase().includes(query.toLowerCase()) ||
      listing.description?.toLowerCase().includes(query.toLowerCase())
    );
    
    this.renderListings(filtered);
  }

  toggleFavorite(listingId) {
    const id = parseInt(listingId);
    const index = this.favorites.indexOf(id);
    
    if (index > -1) {
      this.favorites.splice(index, 1);
      this.showSnackbar('Sevimlilardan olib tashlandi', 'info');
    } else {
      this.favorites.push(id);
      this.showSnackbar('Sevimlilarga qo\'shildi', 'success');
    }
    
    localStorage.setItem('favorites', JSON.stringify(this.favorites));
    this.updateFavoriteButtons();
    this.hapticFeedback();
  }

  updateFavoriteButtons() {
    document.querySelectorAll('[data-favorite]').forEach(btn => {
      const id = parseInt(btn.dataset.favorite);
      btn.textContent = this.favorites.includes(id) ? '❤️' : '🤍';
    });
  }

  showSnackbar(message, type = 'info') {
    const snackbar = document.createElement('div');
    snackbar.className = `snackbar snackbar-${type}`;
    snackbar.textContent = message;
    snackbar.style.cssText = `
      position: fixed;
      bottom: 80px;
      left: 16px;
      right: 16px;
      background: var(--md-sys-color-inverse-surface);
      color: var(--md-sys-color-inverse-on-surface);
      padding: 16px;
      border-radius: 8px;
      z-index: 1000;
      transform: translateY(100px);
      transition: transform 0.3s ease;
    `;
    
    document.body.appendChild(snackbar);
    
    setTimeout(() => snackbar.style.transform = 'translateY(0)', 100);
    setTimeout(() => {
      snackbar.style.transform = 'translateY(100px)';
      setTimeout(() => snackbar.remove(), 300);
    }, 3000);
  }

  hapticFeedback(type = 'light') {
    if (this.tg?.HapticFeedback) {
      this.tg.HapticFeedback.impactOccurred(type);
    }
  }

  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  refresh() {
    this.hapticFeedback('medium');
    this.showSnackbar('Yangilanmoqda...', 'info');
    this.loadListings();
  }
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
  window.app = new SaraApp();
});

// Service Worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sara/sw.js').catch(console.error);
}