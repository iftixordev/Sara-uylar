// Sara Uylar - Complete Web App

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
    this.loadTheme();
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

  loadTheme() {
    const theme = localStorage.getItem('theme');
    if (theme) {
      document.documentElement.setAttribute('data-theme', theme);
    }
  }

  setupRouter() {
    window.addEventListener('hashchange', () => {
      const page = location.hash.slice(1) || 'home';
      this.loadPage(page);
    });
  }

  setupEventListeners() {
    document.addEventListener('input', (e) => {
      if (e.target.matches('#search-input')) {
        this.debounce(() => this.search(e.target.value), 300)();
      }
    });

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

    document.addEventListener('submit', (e) => {
      if (e.target.matches('#add-listing-form')) {
        e.preventDefault();
        this.submitListing(new FormData(e.target));
      }
    });

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
        case 'my-listings':
          app.innerHTML = await this.renderMyListings();
          break;
        case 'settings':
          app.innerHTML = await this.renderSettings();
          break;
        case 'about':
          app.innerHTML = await this.renderAbout();
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
          
          <div class="md-list-item" onclick="app.showPage('my-listings')">
            <span style="font-size: 24px;">📋</span>
            <div class="md-list-item-content">
              <div class="md-list-item-title">Mening e'lonlarim</div>
              <div class="md-list-item-subtitle">Barcha e'lonlarim</div>
            </div>
            <span>→</span>
          </div>
          
          <div class="md-list-item" onclick="app.showPage('settings')">
            <span style="font-size: 24px;">⚙️</span>
            <div class="md-list-item-content">
              <div class="md-list-item-title">Sozlamalar</div>
              <div class="md-list-item-subtitle">Ilova sozlamalari</div>
            </div>
            <span>→</span>
          </div>
          
          <div class="md-list-item" onclick="app.showPage('about')">
            <span style="font-size: 24px;">ℹ️</span>
            <div class="md-list-item-content">
              <div class="md-list-item-title">Ilova haqida</div>
              <div class="md-list-item-subtitle">Versiya va ma'lumotlar</div>
            </div>
            <span>→</span>
          </div>
        </div>
      </div>
    `;
  }

  async renderFavorites() {
    const favoriteListings = this.listings.filter(l => this.favorites.includes(l.id));
    
    return `
      <div class="md-top-app-bar">
        <button class="md-icon-button" onclick="history.back()">←</button>
        <h1 class="title-large">❤️ Sevimlilar</h1>
      </div>
      
      <div class="p-16">
        ${favoriteListings.length === 0 ? `
          <div class="text-center p-16">
            <div style="font-size: 64px; margin-bottom: 16px;">💔</div>
            <h2 class="title-medium mb-8">Sevimlilar yo'q</h2>
            <p class="body-medium mb-16">Hali hech qanday e'lonni sevimlilarga qo'shmagansiz</p>
            <button class="md-filled-button" onclick="app.showPage('home')">E'lonlarni ko'rish</button>
          </div>
        ` : favoriteListings.map(listing => `
          <div class="md-card fade-in mb-16">
            <div class="flex justify-between items-center mb-8">
              <h3 class="title-medium">${listing.title}</h3>
              <button class="md-icon-button" data-favorite="${listing.id}">❤️</button>
            </div>
            <div class="body-medium mb-8">
              💰 $${Number(listing.price).toLocaleString()} • 
              📍 ${listing.location} • 
              🚪 ${listing.rooms} xona
            </div>
            <p class="body-small mb-16">${listing.description?.substring(0, 100)}...</p>
            <button class="md-filled-button w-full" onclick="app.showPage('listing-${listing.id}')">
              Ko'rish
            </button>
          </div>
        `).join('')}
      </div>
    `;
  }

  async renderListingDetails(id) {
    const listing = this.listings.find(l => l.id == id);
    if (!listing) {
      return `
        <div class="md-top-app-bar">
          <button class="md-icon-button" onclick="history.back()">←</button>
          <h1 class="title-large">E'lon topilmadi</h1>
        </div>
        <div class="text-center p-16">
          <div style="font-size: 64px; margin-bottom: 16px;">😕</div>
          <h2 class="title-medium">E'lon mavjud emas</h2>
        </div>
      `;
    }

    return `
      <div class="md-top-app-bar">
        <button class="md-icon-button" onclick="history.back()">←</button>
        <h1 class="title-large">E'lon</h1>
        <button class="md-icon-button" onclick="app.shareListing(${listing.id}, '${listing.title}')">📤</button>
      </div>
      
      <div class="p-16">
        <div class="md-card mb-16">
          <div class="flex justify-between items-center mb-16">
            <h1 class="headline-small">${listing.title}</h1>
            <button class="md-icon-button" data-favorite="${listing.id}">
              ${this.favorites.includes(listing.id) ? '❤️' : '🤍'}
            </button>
          </div>
          
          <div class="flex gap-16 mb-16">
            <div class="flex-1">
              <div class="headline-medium" style="color: var(--md-sys-color-primary);">$${Number(listing.price).toLocaleString()}</div>
              <div class="body-small">Narx</div>
            </div>
            <div class="flex-1">
              <div class="title-large">${listing.rooms} xona</div>
              <div class="body-small">${listing.area}m²</div>
            </div>
          </div>
          
          <div class="mb-16">
            <div class="body-large mb-8"><strong>📍 Joylashuv:</strong> ${listing.location}</div>
            <div class="body-large mb-8"><strong>🏠 Turi:</strong> ${listing.property_type}</div>
            <div class="body-large mb-8"><strong>📏 Maydon:</strong> ${listing.area}m²</div>
            <div class="body-large"><strong>👁️ Ko'rishlar:</strong> ${listing.views || 0}</div>
          </div>
          
          <div class="mb-16">
            <h3 class="title-medium mb-8">📝 Tavsif</h3>
            <p class="body-large">${listing.description || 'Tavsif yo\'q'}</p>
          </div>
          
          <button class="md-filled-button w-full" onclick="app.contactOwner(${listing.user_id})">
            💬 Egasi bilan bog'lanish
          </button>
        </div>
      </div>
    `;
  }

  async renderMyListings() {
    const userId = this.tg?.initDataUnsafe?.user?.id || 123456789;
    const myListings = this.listings.filter(l => l.user_id == userId);
    
    return `
      <div class="md-top-app-bar">
        <button class="md-icon-button" onclick="history.back()">←</button>
        <h1 class="title-large">📋 Mening e'lonlarim</h1>
      </div>
      
      <div class="p-16">
        ${myListings.length === 0 ? `
          <div class="text-center p-16">
            <div style="font-size: 64px; margin-bottom: 16px;">📝</div>
            <h2 class="title-medium mb-8">E'lonlar yo'q</h2>
            <p class="body-medium mb-16">Hali hech qanday e'lon qo'shmagansiz</p>
            <button class="md-filled-button" onclick="app.showPage('add-listing')">Birinchi e'lonni qo'shish</button>
          </div>
        ` : myListings.map(listing => `
          <div class="md-card fade-in mb-16">
            <div class="flex justify-between items-center mb-8">
              <h3 class="title-medium">${listing.title}</h3>
              <div class="md-chip">${listing.status === 'approved' ? '✅ Tasdiqlangan' : '⏳ Kutilmoqda'}</div>
            </div>
            <div class="body-medium mb-8">
              💰 $${Number(listing.price).toLocaleString()} • 
              📍 ${listing.location} • 
              👁️ ${listing.views || 0} ko'rilgan
            </div>
            <div class="flex gap-8">
              <button class="md-outlined-button flex-1" onclick="app.showPage('listing-${listing.id}')">Ko'rish</button>
              <button class="md-outlined-button flex-1" onclick="app.editListing(${listing.id})">Tahrirlash</button>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  async renderSettings() {
    return `
      <div class="md-top-app-bar">
        <button class="md-icon-button" onclick="history.back()">←</button>
        <h1 class="title-large">⚙️ Sozlamalar</h1>
      </div>
      
      <div class="p-16">
        <div class="md-list">
          <div class="md-list-item" onclick="app.toggleTheme()">
            <span style="font-size: 24px;">🌙</span>
            <div class="md-list-item-content">
              <div class="md-list-item-title">Tungi rejim</div>
              <div class="md-list-item-subtitle">Qorong'u mavzu</div>
            </div>
            <span>→</span>
          </div>
          
          <div class="md-list-item" onclick="app.clearCache()">
            <span style="font-size: 24px;">🗑️</span>
            <div class="md-list-item-content">
              <div class="md-list-item-title">Keshni tozalash</div>
              <div class="md-list-item-subtitle">Saqlangan ma'lumotlarni o'chirish</div>
            </div>
            <span>→</span>
          </div>
          
          <div class="md-list-item" onclick="app.exportData()">
            <span style="font-size: 24px;">📤</span>
            <div class="md-list-item-content">
              <div class="md-list-item-title">Ma'lumotlarni eksport qilish</div>
              <div class="md-list-item-subtitle">Sevimlilar va sozlamalar</div>
            </div>
            <span>→</span>
          </div>
        </div>
      </div>
    `;
  }

  async renderAbout() {
    return `
      <div class="md-top-app-bar">
        <button class="md-icon-button" onclick="history.back()">←</button>
        <h1 class="title-large">ℹ️ Ilova haqida</h1>
      </div>
      
      <div class="p-16">
        <div class="text-center mb-16">
          <div style="font-size: 80px; margin-bottom: 16px;">🏠</div>
          <h1 class="headline-medium mb-8">Sara Uylar</h1>
          <p class="body-large mb-8">Versiya 1.0.0</p>
          <p class="body-medium">Professional uy-joy e'lonlari platformasi</p>
        </div>
        
        <div class="md-card mb-16">
          <h3 class="title-medium mb-8">Xususiyatlar</h3>
          <div class="body-medium">
            • 🔍 Kengaytirilgan qidiruv<br>
            • ❤️ Sevimlilar tizimi<br>
            • 📱 Telegram integratsiyasi<br>
            • 🌙 Tungi/kunduzgi rejim<br>
            • 📤 Ulashish funksiyasi<br>
            • 🔄 Pull-to-refresh
          </div>
        </div>
        
        <div class="md-card">
          <h3 class="title-medium mb-8">Bog'lanish</h3>
          <div class="body-medium">
            📧 Email: support@sarauylar.uz<br>
            🌐 Website: sarauylar.bigsaver.ru<br>
            📱 Telegram: @SaraUylarbot
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

  async submitListing(formData) {
    try {
      const data = Object.fromEntries(formData);
      
      const response = await fetch('api/listings.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      const result = await response.json();
      
      if (result.success) {
        this.showSnackbar('E\'lon qo\'shildi!', 'success');
        this.showPage('home');
      } else {
        this.showSnackbar('Xatolik yuz berdi', 'error');
      }
    } catch (error) {
      console.error('Submit error:', error);
      this.showSnackbar('Xatolik yuz berdi', 'error');
    }
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

  filterByType(type) {
    const filtered = this.listings.filter(l => l.property_type === type);
    this.renderListings(filtered);
    this.showSnackbar(`${type} e'lonlari ko'rsatildi`, 'info');
  }

  async contactOwner(userId) {
    this.hapticFeedback('medium');
    if (this.tg) {
      this.tg.openTelegramLink(`https://t.me/SaraUylarbot?start=contact_${userId}`);
    } else {
      window.open(`https://t.me/SaraUylarbot?start=contact_${userId}`, '_blank');
    }
  }

  async shareListing(id, title) {
    try {
      if (navigator.share) {
        await navigator.share({
          title: title,
          text: 'Sara Uylar platformasida e\'lon',
          url: `${window.location.origin}#listing-${id}`
        });
      } else {
        const url = `${window.location.origin}#listing-${id}`;
        await navigator.clipboard.writeText(url);
        this.showSnackbar('Havola nusxalandi', 'success');
      }
    } catch (error) {
      console.error('Share error:', error);
    }
  }

  toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const newTheme = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    this.showSnackbar(`${newTheme === 'dark' ? 'Tungi' : 'Kunduzgi'} rejim yoqildi`, 'success');
  }

  clearCache() {
    localStorage.clear();
    this.favorites = [];
    this.showSnackbar('Kesh tozalandi', 'success');
  }

  exportData() {
    const data = {
      favorites: this.favorites,
      settings: { theme: document.documentElement.getAttribute('data-theme') },
      exported_at: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sara-uylar-data.json';
    a.click();
    URL.revokeObjectURL(url);
    
    this.showSnackbar('Ma\'lumotlar eksport qilindi', 'success');
  }

  editListing(id) {
    this.showSnackbar('Tahrirlash funksiyasi tez orada...', 'info');
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