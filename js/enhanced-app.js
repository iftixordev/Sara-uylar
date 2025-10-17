// Sara Uylar - Enhanced Modern Web App

class EnhancedSaraApp {
  constructor() {
    this.tg = window.Telegram?.WebApp;
    this.currentPage = 'home';
    this.listings = [];
    this.favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
    this.settings = JSON.parse(localStorage.getItem('settings') || '{}');
    this.searchHistory = JSON.parse(localStorage.getItem('searchHistory') || '[]');
    this.viewHistory = JSON.parse(localStorage.getItem('viewHistory') || '[]');
    this.init();
  }

  init() {
    this.setupTelegram();
    this.setupTheme();
    this.setupRouter();
    this.setupEventListeners();
    this.setupServiceWorker();
    this.loadPage('home');
    this.preloadData();
  }

  setupTelegram() {
    if (this.tg) {
      this.tg.ready();
      this.tg.expand();
      this.tg.enableClosingConfirmation();
      
      // Enhanced main button
      this.tg.MainButton.setText('➕ E\'lon qo\'shish');
      this.tg.MainButton.color = '#6750A4';
      this.tg.MainButton.textColor = '#FFFFFF';
      this.tg.MainButton.onClick(() => this.showPage('add-listing'));
      this.tg.MainButton.show();
      
      // Back button
      this.tg.BackButton.onClick(() => this.goBack());
      
      // Theme detection
      this.detectTelegramTheme();
      
      // Viewport setup
      this.tg.setHeaderColor('secondary_bg_color');
    }
  }

  detectTelegramTheme() {
    if (this.tg) {
      const isDark = this.tg.colorScheme === 'dark' || 
                    this.tg.themeParams?.bg_color?.startsWith('#1') ||
                    this.tg.themeParams?.bg_color?.startsWith('#0');
      
      if (isDark && !this.settings.manualTheme) {
        this.setTheme('dark');
      }
    }
  }

  setupTheme() {
    const savedTheme = this.settings.theme || 'light';
    this.setTheme(savedTheme);
    
    // System theme detection
    if (!this.settings.manualTheme) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      mediaQuery.addListener((e) => {
        if (!this.settings.manualTheme) {
          this.setTheme(e.matches ? 'dark' : 'light');
        }
      });
    }
  }

  setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    this.settings.theme = theme;
    this.saveSettings();
    
    // Update Telegram theme
    if (this.tg) {
      this.tg.setHeaderColor(theme === 'dark' ? '#10090D' : '#FFFBFE');
    }
  }

  setupRouter() {
    window.addEventListener('hashchange', () => {
      const page = location.hash.slice(1) || 'home';
      this.loadPage(page);
    });
    
    // Handle browser back button
    window.addEventListener('popstate', (e) => {
      if (e.state && e.state.page) {
        this.loadPage(e.state.page, false);
      }
    });
  }

  setupEventListeners() {
    // Enhanced search with debouncing
    document.addEventListener('input', (e) => {
      if (e.target.matches('#search-input')) {
        this.debounce(() => this.search(e.target.value), 300)();
      }
    });

    // Navigation with history
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
      
      if (e.target.matches('[data-share]')) {
        this.shareListing(e.target.dataset.share, e.target.dataset.title);
      }
    });

    // Form submissions
    document.addEventListener('submit', (e) => {
      if (e.target.matches('#add-listing-form')) {
        e.preventDefault();
        this.submitListing(new FormData(e.target));
      }
      
      if (e.target.matches('#search-form')) {
        e.preventDefault();
        this.performAdvancedSearch(new FormData(e.target));
      }
    });

    // Enhanced pull-to-refresh
    this.setupPullToRefresh();
    
    // Keyboard shortcuts
    this.setupKeyboardShortcuts();
    
    // Intersection Observer for lazy loading
    this.setupIntersectionObserver();
  }

  setupPullToRefresh() {
    let startY = 0;
    let currentY = 0;
    let pulling = false;
    let pullDistance = 0;
    
    const pullIndicator = document.createElement('div');
    pullIndicator.className = 'pull-indicator';
    pullIndicator.innerHTML = '🔄';
    pullIndicator.style.cssText = `
      position: fixed;
      top: -50px;
      left: 50%;
      transform: translateX(-50%);
      font-size: 24px;
      transition: all 0.3s ease;
      z-index: 1001;
    `;
    document.body.appendChild(pullIndicator);
    
    document.addEventListener('touchstart', (e) => {
      if (window.scrollY === 0) {
        startY = e.touches[0].clientY;
        pulling = true;
      }
    });
    
    document.addEventListener('touchmove', (e) => {
      if (pulling) {
        currentY = e.touches[0].clientY;
        pullDistance = Math.max(0, currentY - startY);
        
        if (pullDistance > 0) {
          e.preventDefault();
          pullIndicator.style.top = Math.min(pullDistance - 50, 20) + 'px';
          pullIndicator.style.transform = `translateX(-50%) rotate(${pullDistance * 2}deg)`;
        }
        
        if (pullDistance > 100) {
          this.hapticFeedback('medium');
          this.refresh();
          pulling = false;
          pullIndicator.style.top = '-50px';
          pullIndicator.style.transform = 'translateX(-50%)';
        }
      }
    });
    
    document.addEventListener('touchend', () => {
      pulling = false;
      pullDistance = 0;
      pullIndicator.style.top = '-50px';
      pullIndicator.style.transform = 'translateX(-50%)';
    });
  }

  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'k':
            e.preventDefault();
            this.focusSearch();
            break;
          case 'n':
            e.preventDefault();
            this.showPage('add-listing');
            break;
          case 'h':
            e.preventDefault();
            this.showPage('home');
            break;
        }
      }
      
      if (e.key === 'Escape') {
        this.goBack();
      }
    });
  }

  setupIntersectionObserver() {
    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('fade-in');
          this.observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });
  }

  setupServiceWorker() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sara/sw-enhanced.js')
        .then(registration => {
          console.log('SW registered:', registration);
          
          // Check for updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                this.showSnackbar('Yangilanish mavjud', 'info', {
                  text: 'Yangilash',
                  callback: () => {
                    newWorker.postMessage({ type: 'SKIP_WAITING' });
                    window.location.reload();
                  }
                });
              }
            });
          });
        })
        .catch(error => {
          console.log('SW registration failed:', error);
        });
    }
  }

  async preloadData() {
    // Preload critical data
    try {
      await this.loadListings();
      this.preloadImages();
    } catch (error) {
      console.error('Preload error:', error);
    }
  }

  preloadImages() {
    // Preload first few listing images
    this.listings.slice(0, 5).forEach(listing => {
      if (listing.images && listing.images[0]) {
        const img = new Image();
        img.src = listing.images[0];
      }
    });
  }

  async loadPage(page, addToHistory = true) {
    this.currentPage = page;
    const app = document.getElementById('app');
    
    // Show loading state
    if (app.children.length > 0) {
      app.style.opacity = '0.7';
    }
    
    try {
      let content = '';
      
      switch (page) {
        case 'home':
          content = await this.renderHome();
          break;
        case 'search':
          content = await this.renderSearch();
          break;
        case 'add-listing':
          content = await this.renderAddListing();
          break;
        case 'profile':
          content = await this.renderProfile();
          break;
        case 'favorites':
          content = await this.renderFavorites();
          break;
        case 'my-listings':
          content = await this.renderMyListings();
          break;
        case 'settings':
          content = await this.renderSettings();
          break;
        case 'about':
          content = await this.renderAbout();
          break;
        case 'history':
          content = await this.renderHistory();
          break;
        default:
          if (page.startsWith('listing-')) {
            const id = page.split('-')[1];
            content = await this.renderListingDetails(id);
          } else {
            content = await this.render404();
          }
      }
      
      app.innerHTML = content;
      app.style.opacity = '1';
      
      // Add to browser history
      if (addToHistory && page !== 'home') {
        history.pushState({ page }, '', `#${page}`);
      }
      
      // Update Telegram back button
      if (this.tg) {
        if (page === 'home') {
          this.tg.BackButton.hide();
        } else {
          this.tg.BackButton.show();
        }
      }
      
      // Setup page-specific functionality
      this.setupPageFunctionality(page);
      
    } catch (error) {
      console.error('Page load error:', error);
      this.showSnackbar('Sahifa yuklanmadi', 'error');
      app.style.opacity = '1';
    }
  }

  setupPageFunctionality(page) {
    switch (page) {
      case 'home':
        this.loadListings();
        this.setupInfiniteScroll();
        break;
      case 'search':
        this.focusSearch();
        break;
      case 'add-listing':
        this.setupFormValidation();
        break;
    }
  }

  setupInfiniteScroll() {
    const sentinel = document.createElement('div');
    sentinel.className = 'scroll-sentinel';
    document.getElementById('listings-container')?.appendChild(sentinel);
    
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        this.loadMoreListings();
      }
    });
    
    observer.observe(sentinel);
  }

  setupFormValidation() {
    const form = document.getElementById('add-listing-form');
    if (!form) return;
    
    const inputs = form.querySelectorAll('input[required], textarea[required], select[required]');
    inputs.forEach(input => {
      input.addEventListener('blur', () => this.validateField(input));
      input.addEventListener('input', () => this.clearFieldError(input));
    });
  }

  validateField(field) {
    const value = field.value.trim();
    let isValid = true;
    let message = '';
    
    if (field.hasAttribute('required') && !value) {
      isValid = false;
      message = 'Bu maydon majburiy';
    } else if (field.type === 'email' && value && !this.isValidEmail(value)) {
      isValid = false;
      message = 'Email manzil noto\'g\'ri';
    } else if (field.type === 'tel' && value && !this.isValidPhone(value)) {
      isValid = false;
      message = 'Telefon raqam noto\'g\'ri';
    } else if (field.type === 'number' && value && isNaN(value)) {
      isValid = false;
      message = 'Faqat raqam kiriting';
    }
    
    this.showFieldError(field, isValid ? '' : message);
    return isValid;
  }

  showFieldError(field, message) {
    let errorEl = field.parentNode.querySelector('.field-error');
    
    if (message) {
      if (!errorEl) {
        errorEl = document.createElement('div');
        errorEl.className = 'field-error body-small';
        errorEl.style.color = 'var(--md-sys-color-error)';
        errorEl.style.marginTop = '4px';
        field.parentNode.appendChild(errorEl);
      }
      errorEl.textContent = message;
      field.style.borderColor = 'var(--md-sys-color-error)';
    } else {
      if (errorEl) errorEl.remove();
      field.style.borderColor = '';
    }
  }

  clearFieldError(field) {
    const errorEl = field.parentNode.querySelector('.field-error');
    if (errorEl) errorEl.remove();
    field.style.borderColor = '';
  }

  isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  isValidPhone(phone) {
    return /^\+?[\d\s\-\(\)]{10,}$/.test(phone);
  }

  showPage(page) {
    location.hash = page;
  }

  goBack() {
    if (history.length > 1) {
      history.back();
    } else {
      this.showPage('home');
    }
  }

  focusSearch() {
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
      searchInput.focus();
      searchInput.select();
    }
  }

  // Enhanced rendering methods with better UX
  async renderHome() {
    return `
      <div class="md-top-app-bar">
        <button class="md-icon-button" onclick="app.showPage('profile')">👤</button>
        <h1 class="title-large">🏠 Sara Uylar</h1>
        <div class="flex gap-8">
          <button class="md-icon-button" onclick="app.showPage('favorites')">❤️</button>
          <button class="md-icon-button" onclick="app.toggleTheme()">
            ${document.documentElement.getAttribute('data-theme') === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>
      </div>
      
      <div class="p-16">
        <div class="md-text-field">
          <input type="text" id="search-input" placeholder=" " autocomplete="off">
          <label>🔍 Qidiruv... (Ctrl+K)</label>
        </div>
        
        <div class="flex gap-8 mb-16" style="overflow-x: auto; padding: 8px 0;">
          <div class="md-chip" onclick="app.filterByType('')">🏠 Barchasi</div>
          <div class="md-chip" onclick="app.filterByType('kvartira')">🏠 Kvartira</div>
          <div class="md-chip" onclick="app.filterByType('uy')">🏡 Uy</div>
          <div class="md-chip" onclick="app.filterByType('ofis')">🏢 Ofis</div>
          <div class="md-chip" onclick="app.filterByType('dokon')">🏪 Do'kon</div>
        </div>
        
        <div class="flex justify-between items-center mb-16">
          <h2 class="title-medium">E'lonlar</h2>
          <button class="md-outlined-button" onclick="app.showPage('search')">
            🔍 Kengaytirilgan qidiruv
          </button>
        </div>
        
        <div id="listings-container">
          <div class="text-center p-16">
            <div class="loading-shimmer" style="height: 200px; border-radius: 16px; margin-bottom: 16px;"></div>
            <div class="loading-shimmer" style="height: 200px; border-radius: 16px; margin-bottom: 16px;"></div>
            <div class="loading-shimmer" style="height: 200px; border-radius: 16px;"></div>
          </div>
        </div>
      </div>
      
      <button class="md-fab" onclick="app.showPage('add-listing')" title="E'lon qo'shish (Ctrl+N)">
        ➕
      </button>
    `;
  }

  async renderSearch() {
    return `
      <div class="md-top-app-bar">
        <button class="md-icon-button" onclick="history.back()">←</button>
        <h1 class="title-large">🔍 Kengaytirilgan qidiruv</h1>
      </div>
      
      <div class="p-16">
        <form id="search-form" class="space-y-16">
          <div class="md-text-field">
            <input type="text" name="query" id="search-input" placeholder=" " autofocus>
            <label>Qidiruv so'zi</label>
          </div>
          
          <div class="md-elevated-card">
            <h3 class="title-medium mb-16">📍 Joylashuv</h3>
            <div class="md-text-field">
              <input type="text" name="location" placeholder=" ">
              <label>Shahar yoki tuman</label>
            </div>
          </div>
          
          <div class="md-elevated-card">
            <h3 class="title-medium mb-16">💰 Narx oralig'i</h3>
            <div class="flex gap-16">
              <div class="md-text-field flex-1">
                <input type="number" name="min_price" placeholder=" " min="0">
                <label>Min narx ($)</label>
              </div>
              <div class="md-text-field flex-1">
                <input type="number" name="max_price" placeholder=" " min="0">
                <label>Max narx ($)</label>
              </div>
            </div>
          </div>
          
          <div class="md-elevated-card">
            <h3 class="title-medium mb-16">🏠 Mulk turi</h3>
            <div class="flex gap-8" style="flex-wrap: wrap;">
              <label class="md-chip cursor-pointer">
                <input type="radio" name="property_type" value="" checked style="display: none;">
                Barchasi
              </label>
              <label class="md-chip cursor-pointer">
                <input type="radio" name="property_type" value="kvartira" style="display: none;">
                Kvartira
              </label>
              <label class="md-chip cursor-pointer">
                <input type="radio" name="property_type" value="uy" style="display: none;">
                Uy
              </label>
              <label class="md-chip cursor-pointer">
                <input type="radio" name="property_type" value="ofis" style="display: none;">
                Ofis
              </label>
            </div>
          </div>
          
          <div class="md-elevated-card">
            <h3 class="title-medium mb-16">🚪 Xonalar soni</h3>
            <div class="flex gap-8">
              <label class="md-chip cursor-pointer">
                <input type="radio" name="rooms" value="" checked style="display: none;">
                Farqi yo'q
              </label>
              <label class="md-chip cursor-pointer">
                <input type="radio" name="rooms" value="1" style="display: none;">
                1
              </label>
              <label class="md-chip cursor-pointer">
                <input type="radio" name="rooms" value="2" style="display: none;">
                2
              </label>
              <label class="md-chip cursor-pointer">
                <input type="radio" name="rooms" value="3" style="display: none;">
                3
              </label>
              <label class="md-chip cursor-pointer">
                <input type="radio" name="rooms" value="4+" style="display: none;">
                4+
              </label>
            </div>
          </div>
          
          <button type="submit" class="md-filled-button w-full">
            🔍 Qidirish
          </button>
        </form>
        
        ${this.searchHistory.length > 0 ? `
          <div class="mt-24">
            <h3 class="title-medium mb-16">📚 Qidiruv tarixi</h3>
            <div class="flex gap-8" style="flex-wrap: wrap;">
              ${this.searchHistory.slice(0, 5).map(term => `
                <div class="md-chip cursor-pointer" onclick="app.quickSearch('${term}')">
                  ${term}
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}
        
        <div id="search-results" class="mt-24"></div>
      </div>
    `;
  }

  // Continue with other enhanced render methods...
  async renderSettings() {
    return `
      <div class="md-top-app-bar">
        <button class="md-icon-button" onclick="history.back()">←</button>
        <h1 class="title-large">⚙️ Sozlamalar</h1>
      </div>
      
      <div class="p-16">
        <div class="md-elevated-card mb-16">
          <h3 class="title-medium mb-16">🎨 Ko'rinish</h3>
          <div class="md-list">
            <div class="md-list-item" onclick="app.toggleThemeMode()">
              <span style="font-size: 24px;">🌙</span>
              <div class="md-list-item-content">
                <div class="md-list-item-title">Tungi rejim</div>
                <div class="md-list-item-subtitle">
                  ${this.settings.theme === 'dark' ? 'Yoqilgan' : 'O\'chirilgan'}
                </div>
              </div>
              <div class="theme-toggle" onclick="event.stopPropagation(); app.toggleTheme();"></div>
            </div>
            
            <div class="md-list-item" onclick="app.toggleAutoTheme()">
              <span style="font-size: 24px;">🔄</span>
              <div class="md-list-item-content">
                <div class="md-list-item-title">Avtomatik mavzu</div>
                <div class="md-list-item-subtitle">Tizim sozlamalariga mos</div>
              </div>
              <span>${this.settings.manualTheme ? '○' : '●'}</span>
            </div>
          </div>
        </div>
        
        <div class="md-elevated-card mb-16">
          <h3 class="title-medium mb-16">💾 Ma'lumotlar</h3>
          <div class="md-list">
            <div class="md-list-item" onclick="app.clearCache()">
              <span style="font-size: 24px;">🗑️</span>
              <div class="md-list-item-content">
                <div class="md-list-item-title">Keshni tozalash</div>
                <div class="md-list-item-subtitle">Saqlangan ma'lumotlar</div>
              </div>
              <span>→</span>
            </div>
            
            <div class="md-list-item" onclick="app.exportData()">
              <span style="font-size: 24px;">📤</span>
              <div class="md-list-item-content">
                <div class="md-list-item-title">Ma'lumotlarni eksport</div>
                <div class="md-list-item-subtitle">Sevimlilar va sozlamalar</div>
              </div>
              <span>→</span>
            </div>
            
            <div class="md-list-item" onclick="app.importData()">
              <span style="font-size: 24px;">📥</span>
              <div class="md-list-item-content">
                <div class="md-list-item-title">Ma'lumotlarni import</div>
                <div class="md-list-item-subtitle">Zaxira fayldan tiklash</div>
              </div>
              <span>→</span>
            </div>
          </div>
        </div>
        
        <div class="md-elevated-card">
          <h3 class="title-medium mb-16">🔔 Bildirishnomalar</h3>
          <div class="md-list">
            <div class="md-list-item" onclick="app.toggleNotifications()">
              <span style="font-size: 24px;">🔔</span>
              <div class="md-list-item-content">
                <div class="md-list-item-title">Push bildirishnomalar</div>
                <div class="md-list-item-subtitle">Yangi e'lonlar haqida</div>
              </div>
              <span>${this.settings.notifications ? '●' : '○'}</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // Enhanced functionality methods
  toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    this.setTheme(newTheme);
    this.settings.manualTheme = true;
    this.saveSettings();
    this.showSnackbar(`${newTheme === 'dark' ? 'Tungi' : 'Kunduzgi'} rejim yoqildi`, 'success');
    this.hapticFeedback('light');
  }

  toggleAutoTheme() {
    this.settings.manualTheme = !this.settings.manualTheme;
    this.saveSettings();
    
    if (!this.settings.manualTheme) {
      // Apply system theme
      const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      this.setTheme(systemDark ? 'dark' : 'light');
      this.showSnackbar('Avtomatik mavzu yoqildi', 'success');
    } else {
      this.showSnackbar('Qo\'lda boshqaruv yoqildi', 'success');
    }
  }

  saveSettings() {
    localStorage.setItem('settings', JSON.stringify(this.settings));
  }

  // Enhanced snackbar with actions
  showSnackbar(message, type = 'info', action = null) {
    const snackbar = document.createElement('div');
    snackbar.className = `snackbar snackbar-${type}`;
    
    const content = document.createElement('div');
    content.style.cssText = 'display: flex; align-items: center; justify-content: space-between; width: 100%;';
    
    const text = document.createElement('span');
    text.textContent = message;
    content.appendChild(text);
    
    if (action) {
      const actionBtn = document.createElement('button');
      actionBtn.textContent = action.text;
      actionBtn.style.cssText = 'background: none; border: none; color: var(--md-sys-color-primary); font-weight: 500; cursor: pointer; margin-left: 16px;';
      actionBtn.onclick = action.callback;
      content.appendChild(actionBtn);
    }
    
    snackbar.appendChild(content);
    snackbar.style.cssText = `
      position: fixed;
      bottom: 24px;
      left: 16px;
      right: 16px;
      background: var(--md-sys-color-inverse-surface);
      color: var(--md-sys-color-inverse-on-surface);
      padding: 16px 24px;
      border-radius: 8px;
      z-index: 1000;
      transform: translateY(100px);
      transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 3px 5px rgba(0,0,0,0.2), 0 6px 10px rgba(0,0,0,0.14), 0 1px 18px rgba(0,0,0,0.12);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
    `;
    
    document.body.appendChild(snackbar);
    
    setTimeout(() => snackbar.style.transform = 'translateY(0)', 100);
    setTimeout(() => {
      snackbar.style.transform = 'translateY(100px)';
      setTimeout(() => snackbar.remove(), 300);
    }, action ? 5000 : 3000);
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

  // Placeholder methods for remaining functionality
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
          <div style="font-size: 64px; margin-bottom: 16px;">🏠</div>
          <h2 class="title-medium mb-8">E'lonlar topilmadi</h2>
          <p class="body-medium">Qidiruv shartlarini o'zgartiring</p>
        </div>
      `;
      return;
    }
    
    container.innerHTML = listings.map((listing, index) => `
      <div class="md-elevated-card fade-in cursor-pointer" 
           style="animation-delay: ${index * 0.1}s"
           onclick="app.showPage('listing-${listing.id}')">
        <div class="flex justify-between items-start mb-8">
          <h3 class="title-medium flex-1">${listing.title}</h3>
          <button class="md-icon-button" data-favorite="${listing.id}" onclick="event.stopPropagation();">
            ${this.favorites.includes(listing.id) ? '❤️' : '🤍'}
          </button>
        </div>
        
        <div class="body-medium mb-8" style="color: var(--md-sys-color-on-surface-variant);">
          💰 $${Number(listing.price).toLocaleString()} • 
          📍 ${listing.location} • 
          🚪 ${listing.rooms} xona
        </div>
        
        <p class="body-small mb-16" style="color: var(--md-sys-color-on-surface-variant);">
          ${listing.description?.substring(0, 100)}...
        </p>
        
        <div class="flex justify-between items-center">
          <span class="label-small" style="color: var(--md-sys-color-on-surface-variant);">
            👁️ ${listing.views || 0} ko'rilgan
          </span>
          <div class="flex gap-8">
            <button class="md-icon-button" data-share="${listing.id}" data-title="${listing.title}" onclick="event.stopPropagation();">
              📤
            </button>
            <button class="md-filled-button" onclick="event.stopPropagation(); app.showPage('listing-${listing.id}');">
              Ko'rish
            </button>
          </div>
        </div>
      </div>
    `).join('');
    
    // Setup intersection observer for new elements
    container.querySelectorAll('.fade-in').forEach(el => {
      this.observer?.observe(el);
    });
  }

  // Additional methods would continue here...
  refresh() {
    this.hapticFeedback('medium');
    this.showSnackbar('Yangilanmoqda...', 'info');
    this.loadListings();
  }
}

// Initialize enhanced app
document.addEventListener('DOMContentLoaded', () => {
  window.app = new EnhancedSaraApp();
});