// Sara Uylar - Modern Real Estate App
class SaraUylarApp {
    constructor() {
        this.tg = window.Telegram?.WebApp;
        this.currentPage = 'home';
        this.listings = [];
        this.favorites = JSON.parse(localStorage.getItem('sara_favorites') || '[]');
        this.user = null;
        this.checkAuth();
        this.init();
    }

    init() {
        this.setupTelegram();
        this.setupRouter();
        this.setupEventListeners();
        this.loadPage('home');
    }

    async checkAuth() {
        // Check if user is logged in via session
        try {
            const response = await fetch('check_auth.php');
            const data = await response.json();
            
            if (data.logged_in) {
                this.user = data.user;
                // Hide login button, show user info
                const loginBtn = document.getElementById('loginBtn');
                if (loginBtn) {
                    loginBtn.style.display = 'none';
                }
            } else if (!this.tg) {
                // If not Telegram WebApp and not logged in, redirect to login
                window.location.href = 'login.html';
                return;
            }
        } catch (error) {
            console.error('Auth check error:', error);
            if (!this.tg) {
                window.location.href = 'login.html';
            }
        }
    }

    setupTelegram() {
        if (this.tg) {
            this.tg.ready();
            this.tg.expand();
            this.tg.enableClosingConfirmation();
            
            this.user = this.tg.initDataUnsafe?.user || {
                id: Date.now(),
                first_name: 'Test User'
            };
            
            // Theme
            if (this.tg.colorScheme === 'dark') {
                document.documentElement.setAttribute('data-theme', 'dark');
            }
            
            // Main button
            this.tg.MainButton.setText('E\'lon qo\'shish');
            this.tg.MainButton.onClick(() => this.showPage('add'));
            this.tg.MainButton.show();
        }
    }

    setupRouter() {
        window.addEventListener('hashchange', () => {
            const hash = location.hash.slice(1);
            const [page, id] = hash.split('-');
            this.loadPage(page || 'home', id);
        });
    }

    setupEventListeners() {
        // Search
        document.addEventListener('input', (e) => {
            if (e.target.id === 'searchInput') {
                this.debounce(() => this.handleSearch(e.target.value), 300)();
            }
        });

        // Navigation
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-page]')) {
                e.preventDefault();
                this.showPage(e.target.dataset.page);
            }
            
            if (e.target.matches('.listing-card')) {
                const id = e.target.dataset.listingId;
                if (id) this.showPage('listing', id);
            }
            
            if (e.target.matches('.favorite-btn')) {
                e.stopPropagation();
                this.toggleFavorite(e.target.dataset.listingId);
            }
        });

        // Filter tabs
        document.addEventListener('click', (e) => {
            if (e.target.matches('.filter-tab')) {
                document.querySelectorAll('.filter-tab').forEach(tab => 
                    tab.classList.remove('active'));
                e.target.classList.add('active');
                this.filterListings(e.target.dataset.filter);
            }
        });

        // Form submissions
        document.addEventListener('submit', (e) => {
            if (e.target.id === 'addListingForm') {
                e.preventDefault();
                this.handleAddListing(e.target);
            }
        });

        // Pull to refresh
        this.setupPullToRefresh();
        
        // Theme toggle
        document.addEventListener('click', (e) => {
            if (e.target.id === 'themeToggle') {
                this.toggleTheme();
            }
        });
    }

    setupPullToRefresh() {
        let startY = 0;
        let pulling = false;
        const indicator = document.querySelector('.pull-to-refresh');

        document.addEventListener('touchstart', (e) => {
            if (window.scrollY === 0) {
                startY = e.touches[0].clientY;
                pulling = true;
            }
        });

        document.addEventListener('touchmove', (e) => {
            if (pulling) {
                const currentY = e.touches[0].clientY;
                const diff = currentY - startY;
                
                if (diff > 0 && diff < 100) {
                    indicator.style.transform = `translateY(${diff}px)`;
                    indicator.style.opacity = diff / 100;
                }
                
                if (diff > 100) {
                    this.refresh();
                    pulling = false;
                    indicator.style.transform = 'translateY(0)';
                    indicator.style.opacity = '0';
                }
            }
        });

        document.addEventListener('touchend', () => {
            pulling = false;
            indicator.style.transform = 'translateY(0)';
            indicator.style.opacity = '0';
        });
    }

    async loadPage(page, id = null) {
        this.currentPage = page;
        this.updateNavigation(page);
        
        const mainContent = document.querySelector('.main-content');
        if (!mainContent) return;

        try {
            switch (page) {
                case 'home':
                    await this.renderHomePage();
                    break;
                case 'search':
                    await this.renderSearchPage();
                    break;
                case 'add':
                    await this.renderAddListingPage();
                    break;
                case 'favorites':
                    await this.renderFavoritesPage();
                    break;
                case 'profile':
                    await this.renderProfilePage();
                    break;
                case 'listing':
                    if (id) await this.renderListingDetails(id);
                    break;
                default:
                    await this.renderHomePage();
            }
        } catch (error) {
            console.error('Page load error:', error);
            this.showToast('Sahifa yuklanmadi', 'error');
        }
    }

    async renderHomePage() {
        const grid = document.getElementById('listingsGrid');
        if (!grid) return;

        grid.innerHTML = '<div class="loading">Yuklanmoqda...</div>';
        
        await this.loadListings();
        this.renderListings();
    }

    async renderSearchPage() {
        const grid = document.getElementById('listingsGrid');
        if (!grid) return;

        grid.innerHTML = `
            <div class="search-page">
                <div class="advanced-search">
                    <h3>Kengaytirilgan qidiruv</h3>
                    <div class="form-group">
                        <label>Narx oralig'i ($)</label>
                        <div class="price-range">
                            <input type="number" id="minPrice" placeholder="Min">
                            <input type="number" id="maxPrice" placeholder="Max">
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Maydon (m²)</label>
                        <div class="area-range">
                            <input type="number" id="minArea" placeholder="Min">
                            <input type="number" id="maxArea" placeholder="Max">
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Xonalar soni</label>
                        <select id="roomsFilter">
                            <option value="">Barcha</option>
                            <option value="1">1 xona</option>
                            <option value="2">2 xona</option>
                            <option value="3">3 xona</option>
                            <option value="4+">4+ xona</option>
                        </select>
                    </div>
                    <button class="btn-primary" onclick="app.applyAdvancedSearch()">
                        Qidiruv
                    </button>
                </div>
                <div id="searchResults"></div>
            </div>
        `;
    }

    async renderAddListingPage() {
        const grid = document.getElementById('listingsGrid');
        if (!grid) return;

        grid.innerHTML = `
            <div class="add-listing-form">
                <h2>Yangi e'lon qo'shish</h2>
                <form id="addListingForm">
                    <div class="form-group">
                        <label>Sarlavha *</label>
                        <input type="text" name="title" required>
                    </div>
                    
                    <div class="form-group">
                        <label>Tavsif</label>
                        <textarea name="description" rows="4"></textarea>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label>Narx (USD) *</label>
                            <input type="number" name="price" required>
                        </div>
                        <div class="form-group">
                            <label>Mulk turi *</label>
                            <select name="property_type" required>
                                <option value="">Tanlang</option>
                                <option value="apartment">Kvartira</option>
                                <option value="house">Uy</option>
                                <option value="commercial">Tijorat</option>
                                <option value="office">Ofis</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label>Joylashuv *</label>
                        <input type="text" name="location" required>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label>Xonalar</label>
                            <input type="number" name="rooms" min="1" value="1">
                        </div>
                        <div class="form-group">
                            <label>Maydon (m²)</label>
                            <input type="number" name="area" step="0.1">
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label>Telefon</label>
                        <input type="tel" name="phone">
                    </div>
                    
                    <div class="form-group">
                        <label>Rasmlar</label>
                        <input type="file" name="images" accept="image/*" multiple>
                    </div>
                    
                    <div class="form-actions">
                        <button type="button" class="btn-secondary" onclick="app.showPage('home')">
                            Bekor qilish
                        </button>
                        <button type="submit" class="btn-primary">
                            E'lonni saqlash
                        </button>
                    </div>
                </form>
            </div>
        `;
    }

    async renderFavoritesPage() {
        const grid = document.getElementById('listingsGrid');
        if (!grid) return;

        const favoriteListings = this.listings.filter(listing => 
            this.favorites.includes(listing.id));

        if (favoriteListings.length === 0) {
            grid.innerHTML = `
                <div class="empty-state">
                    <div style="font-size: 4rem; margin-bottom: 1rem;">❤️</div>
                    <h3>Sevimlilar bo'sh</h3>
                    <p>Yoqgan e'lonlarni sevimlilar ro'yxatiga qo'shing</p>
                    <button class="btn-primary" onclick="app.showPage('home')">
                        E'lonlarni ko'rish
                    </button>
                </div>
            `;
            return;
        }

        this.renderListings(favoriteListings);
    }

    async renderProfilePage() {
        const grid = document.getElementById('listingsGrid');
        if (!grid) return;

        const userListings = this.listings.filter(listing => 
            listing.user_id == this.user?.id);

        grid.innerHTML = `
            <div class="profile-page">
                <div class="profile-header">
                    <div class="profile-avatar">
                        ${this.user?.first_name?.charAt(0) || 'U'}
                    </div>
                    <h2>${this.user?.first_name || 'Foydalanuvchi'} ${this.user?.last_name || ''}</h2>
                    ${this.user?.username ? `<p>@${this.user.username}</p>` : ''}
                </div>
                
                <div class="profile-stats">
                    <div class="stat-item">
                        <div class="stat-number">${userListings.length}</div>
                        <div class="stat-label">E'lonlarim</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-number">${this.favorites.length}</div>
                        <div class="stat-label">Sevimlilar</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-number">${userListings.reduce((sum, l) => sum + (l.views || 0), 0)}</div>
                        <div class="stat-label">Ko'rishlar</div>
                    </div>
                </div>
                
                <div class="menu-items">
                    <button class="menu-item" onclick="app.showMyListings()">
                        📋 Mening e'lonlarim
                    </button>
                    <button class="menu-item" onclick="app.showPage('favorites')">
                        ❤️ Sevimlilar
                    </button>
                    <button class="menu-item" onclick="app.showSettings()">
                        ⚙️ Sozlamalar
                    </button>
                    <button class="menu-item" onclick="app.showStats()">
                        📊 Statistika
                    </button>
                    <button class="menu-item" onclick="app.showHelp()">
                        ❓ Yordam
                    </button>
                    <button class="menu-item" onclick="app.showAbout()">
                        ℹ️ Ilova haqida
                    </button>
                    <button class="menu-item" onclick="app.logout()" style="color: #dc2626;">
                        🚪 Chiqish
                    </button>
                </div>
            </div>
        `;
    }

    async renderListingDetails(id) {
        const listing = this.listings.find(l => l.id == id);
        if (!listing) {
            this.showToast('E\'lon topilmadi', 'error');
            this.showPage('home');
            return;
        }

        // Increment views
        await this.incrementViews(id);

        const grid = document.getElementById('listingsGrid');
        if (!grid) return;

        const isFavorite = this.favorites.includes(listing.id);
        
        grid.innerHTML = `
            <div class="listing-details">
                <div class="listing-image">
                    <img src="${listing.image || 'images/default-house.svg'}" alt="${listing.title}">
                    <button class="favorite-btn ${isFavorite ? 'active' : ''}" 
                            data-listing-id="${listing.id}">
                        ${isFavorite ? '❤️' : '🤍'}
                    </button>
                </div>
                
                <div class="listing-info">
                    <h1>${listing.title}</h1>
                    <div class="price">$${Number(listing.price).toLocaleString()}</div>
                    <div class="location">📍 ${listing.location}</div>
                    
                    <div class="features">
                        <span>🏠 ${this.getPropertyTypeText(listing.property_type)}</span>
                        <span>🚪 ${listing.rooms} xona</span>
                        ${listing.area ? `<span>📏 ${listing.area}m²</span>` : ''}
                        <span>👁️ ${listing.views || 0} ko'rilgan</span>
                    </div>
                    
                    ${listing.description ? `<div class="description">${listing.description}</div>` : ''}
                    
                    <div class="contact-info">
                        ${listing.phone ? `<p>📞 ${listing.phone}</p>` : ''}
                        <p>📅 ${new Date(listing.created_at).toLocaleDateString('uz-UZ')}</p>
                    </div>
                </div>
                
                <div class="listing-actions">
                    <button class="btn-primary" onclick="app.contactOwner('${listing.user_id}')">
                        💬 Bog'lanish
                    </button>
                    <button class="btn-secondary" onclick="app.shareListing(${listing.id})">
                        📤 Ulashish
                    </button>
                </div>
            </div>
        `;
    }

    async loadListings() {
        try {
            const response = await fetch('api/listings.php');
            const data = await response.json();
            
            if (data.success) {
                this.listings = data.listings || [];
            } else {
                throw new Error(data.error || 'Ma\'lumotlar yuklanmadi');
            }
        } catch (error) {
            console.error('Listings load error:', error);
            this.showToast('E\'lonlar yuklanmadi', 'error');
            this.listings = [];
        }
    }

    renderListings(listings = this.listings) {
        const grid = document.getElementById('listingsGrid');
        if (!grid) return;

        if (listings.length === 0) {
            grid.innerHTML = `
                <div class="empty-state">
                    <div style="font-size: 4rem; margin-bottom: 1rem;">🏠</div>
                    <h3>E'lonlar topilmadi</h3>
                    <p>Hozircha bu kategoriyada e'lonlar yo'q</p>
                </div>
            `;
            return;
        }

        grid.innerHTML = listings.map(listing => `
            <div class="listing-card" data-listing-id="${listing.id}">
                <div class="listing-image">
                    <img src="${listing.image || 'images/default-house.svg'}" alt="${listing.title}">
                    <button class="favorite-btn ${this.favorites.includes(listing.id) ? 'active' : ''}" 
                            data-listing-id="${listing.id}">
                        ${this.favorites.includes(listing.id) ? '❤️' : '🤍'}
                    </button>
                </div>
                <div class="listing-content">
                    <h3>${listing.title}</h3>
                    <div class="price">$${Number(listing.price).toLocaleString()}</div>
                    <div class="location">📍 ${listing.location}</div>
                    <div class="features">
                        🏠 ${this.getPropertyTypeText(listing.property_type)} • 
                        🚪 ${listing.rooms} xona
                        ${listing.area ? ` • 📏 ${listing.area}m²` : ''}
                    </div>
                    <div class="listing-meta">
                        <span>👁️ ${listing.views || 0}</span>
                        <span>${this.getTimeAgo(listing.created_at)}</span>
                    </div>
                </div>
            </div>
        `).join('');
    }

    filterListings(filter) {
        let filtered = this.listings;
        
        switch (filter) {
            case 'sale':
                filtered = this.listings.filter(l => l.type === 'sale');
                break;
            case 'rent':
                filtered = this.listings.filter(l => l.type === 'rent');
                break;
            case 'apartment':
                filtered = this.listings.filter(l => l.property_type === 'apartment');
                break;
            case 'house':
                filtered = this.listings.filter(l => l.property_type === 'house');
                break;
            case 'commercial':
                filtered = this.listings.filter(l => l.property_type === 'commercial');
                break;
            default:
                filtered = this.listings;
        }
        
        this.renderListings(filtered);
    }

    handleSearch(query) {
        if (!query.trim()) {
            this.renderListings();
            return;
        }

        const filtered = this.listings.filter(listing =>
            listing.title.toLowerCase().includes(query.toLowerCase()) ||
            listing.location.toLowerCase().includes(query.toLowerCase()) ||
            (listing.description || '').toLowerCase().includes(query.toLowerCase())
        );

        this.renderListings(filtered);
    }

    async handleAddListing(form) {
        const formData = new FormData(form);
        const data = {
            title: formData.get('title'),
            description: formData.get('description'),
            price: parseFloat(formData.get('price')) || 0,
            location: formData.get('location'),
            property_type: formData.get('property_type'),
            rooms: parseInt(formData.get('rooms')) || 1,
            area: parseFloat(formData.get('area')) || 0,
            phone: formData.get('phone'),
            user_id: this.user?.id || Date.now(),
            images: []
        };

        // Validation
        if (!data.title || !data.location || !data.property_type || data.price <= 0) {
            this.showToast('Barcha majburiy maydonlarni to\'ldiring', 'error');
            return;
        }

        try {
            const response = await fetch('api/listings.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();
            
            if (result.success) {
                this.showToast('E\'lon muvaffaqiyatli qo\'shildi!', 'success');
                this.showPage('home');
                await this.loadListings();
            } else {
                throw new Error(result.error || 'E\'lon qo\'shilmadi');
            }
        } catch (error) {
            console.error('Add listing error:', error);
            this.showToast('E\'lon qo\'shishda xatolik: ' + error.message, 'error');
        }
    }

    toggleFavorite(listingId) {
        const id = parseInt(listingId);
        const index = this.favorites.indexOf(id);
        
        if (index > -1) {
            this.favorites.splice(index, 1);
            this.showToast('Sevimlilardan olib tashlandi', 'info');
        } else {
            this.favorites.push(id);
            this.showToast('Sevimlilarga qo\'shildi', 'success');
        }
        
        localStorage.setItem('sara_favorites', JSON.stringify(this.favorites));
        this.updateFavoriteButtons();
        this.hapticFeedback();
    }

    updateFavoriteButtons() {
        document.querySelectorAll('.favorite-btn').forEach(btn => {
            const id = parseInt(btn.dataset.listingId);
            const isFavorite = this.favorites.includes(id);
            btn.textContent = isFavorite ? '❤️' : '🤍';
            btn.classList.toggle('active', isFavorite);
        });
    }

    updateNavigation(page) {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.page === page);
        });
    }

    showPage(page, id = null) {
        const hash = id ? `${page}-${id}` : page;
        location.hash = hash;
    }

    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('sara_theme', newTheme);
        
        const themeBtn = document.getElementById('themeToggle');
        if (themeBtn) {
            themeBtn.textContent = newTheme === 'dark' ? '☀️' : '🌙';
        }
    }

    async refresh() {
        this.showToast('Yangilanmoqda...', 'info');
        await this.loadListings();
        this.renderListings();
        this.hapticFeedback('medium');
    }

    async incrementViews(listingId) {
        try {
            await fetch(`api/listing.php?id=${listingId}`);
        } catch (error) {
            console.error('Views increment error:', error);
        }
    }

    contactOwner(userId) {
        if (this.tg) {
            this.tg.openTelegramLink(`https://t.me/user?id=${userId}`);
        } else {
            this.showToast('Telegram orqali bog\'lanish mumkin', 'info');
        }
    }

    shareListing(listingId) {
        const listing = this.listings.find(l => l.id == listingId);
        if (!listing) return;

        const shareText = `🏠 ${listing.title}\n💰 $${Number(listing.price).toLocaleString()}\n📍 ${listing.location}\n\n${window.location.origin}/#listing-${listingId}`;
        
        if (navigator.share) {
            navigator.share({
                title: listing.title,
                text: shareText,
                url: `${window.location.origin}/#listing-${listingId}`
            });
        } else if (this.tg) {
            this.tg.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(window.location.origin + '/#listing-' + listingId)}&text=${encodeURIComponent(shareText)}`);
        } else {
            navigator.clipboard.writeText(shareText);
            this.showToast('Havolasi nusxalandi', 'success');
        }
    }

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        
        const container = document.getElementById('toastContainer');
        if (container) {
            container.appendChild(toast);
            
            setTimeout(() => toast.classList.add('show'), 100);
            setTimeout(() => {
                toast.classList.remove('show');
                setTimeout(() => toast.remove(), 300);
            }, 3000);
        }
    }

    hapticFeedback(type = 'light') {
        if (this.tg?.HapticFeedback) {
            this.tg.HapticFeedback.impactOccurred(type);
        }
    }

    getPropertyTypeText(type) {
        const types = {
            apartment: 'Kvartira',
            house: 'Uy',
            commercial: 'Tijorat',
            office: 'Ofis'
        };
        return types[type] || type;
    }

    getTimeAgo(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now - date;
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        
        if (days === 0) return 'Bugun';
        if (days === 1) return 'Kecha';
        if (days < 7) return `${days} kun oldin`;
        if (days < 30) return `${Math.floor(days / 7)} hafta oldin`;
        return `${Math.floor(days / 30)} oy oldin`;
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

    // Additional methods for profile menu
    showMyListings() {
        const userListings = this.listings.filter(l => l.user_id == this.user?.id);
        this.renderListings(userListings);
    }

    showSettings() {
        const grid = document.getElementById('listingsGrid');
        if (!grid) return;

        grid.innerHTML = `
            <div class="settings-page">
                <h2>Sozlamalar</h2>
                <div class="setting-item">
                    <span>Tungi rejim</span>
                    <button onclick="app.toggleTheme()">O'zgartirish</button>
                </div>
                <div class="setting-item">
                    <span>Bildirishnomalar</span>
                    <button onclick="app.toggleNotifications()">Yoqish/O'chirish</button>
                </div>
                <div class="setting-item">
                    <span>Til</span>
                    <span>O'zbek tili</span>
                </div>
            </div>
        `;
    }

    showStats() {
        const grid = document.getElementById('listingsGrid');
        if (!grid) return;

        const totalListings = this.listings.length;
        const todayListings = this.listings.filter(l => 
            new Date(l.created_at).toDateString() === new Date().toDateString()).length;

        grid.innerHTML = `
            <div class="stats-page">
                <h2>Statistika</h2>
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-icon">🏠</div>
                        <div class="stat-number">${totalListings}</div>
                        <div class="stat-label">Jami e'lonlar</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon">📅</div>
                        <div class="stat-number">${todayListings}</div>
                        <div class="stat-label">Bugungi e'lonlar</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon">❤️</div>
                        <div class="stat-number">${this.favorites.length}</div>
                        <div class="stat-label">Sevimlilar</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon">👥</div>
                        <div class="stat-number">${new Set(this.listings.map(l => l.user_id)).size}</div>
                        <div class="stat-label">Foydalanuvchilar</div>
                    </div>
                </div>
            </div>
        `;
    }

    showHelp() {
        const grid = document.getElementById('listingsGrid');
        if (!grid) return;

        grid.innerHTML = `
            <div class="help-page">
                <h2>Yordam</h2>
                <div class="help-section">
                    <h4>Qanday foydalanish?</h4>
                    <p>1. E'lonlarni ko'rish uchun bosh sahifani ishlating</p>
                    <p>2. Qidiruv uchun yuqoridagi qidiruv maydonini ishlating</p>
                    <p>3. Yangi e'lon qo'shish uchun "+" tugmasini bosing</p>
                </div>
                <div class="help-section">
                    <h4>Sevimlilar</h4>
                    <p>Yoqgan e'lonlarni sevimlilar ro'yxatiga qo'shish uchun yurak belgisini bosing</p>
                </div>
                <div class="help-section">
                    <h4>Bog'lanish</h4>
                    <p>E'lon egasi bilan bog'lanish uchun "Bog'lanish" tugmasini bosing</p>
                </div>
            </div>
        `;
    }

    showAbout() {
        const grid = document.getElementById('listingsGrid');
        if (!grid) return;

        grid.innerHTML = `
            <div class="about-page">
                <div class="about-header">
                    <div class="about-logo">🏠</div>
                    <h2>Sara Uylar</h2>
                    <p>Professional ko'chmas mulk platformasi</p>
                </div>
                <div class="about-content">
                    <h3>Xususiyatlar</h3>
                    <ul>
                        <li>🔍 Kengaytirilgan qidiruv</li>
                        <li>❤️ Sevimlilar tizimi</li>
                        <li>📱 Zamonaviy interfeys</li>
                        <li>🌙 Tungi/kunduzgi rejim</li>
                        <li>📤 Ulashish imkoniyati</li>
                    </ul>
                    <h3>Versiya</h3>
                    <p>1.0.0</p>
                    <h3>Ishlab chiquvchi</h3>
                    <p>Sara Uylar jamoasi</p>
                </div>
            </div>
        `;
    }

    async logout() {
        try {
            const response = await fetch('auth.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'logout' })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showToast('Tizimdan chiqdingiz', 'success');
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 1000);
            }
        } catch (error) {
            console.error('Logout error:', error);
            this.showToast('Chiqishda xatolik', 'error');
        }
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new SaraUylarApp();
});

// Register service worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('SW registered: ', registration);
            })
            .catch(registrationError => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}