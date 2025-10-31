// Sara Uylar - Modern Real Estate App
class SaraUylarApp {
    constructor() {
        this.tg = window.Telegram?.WebApp;
        this.currentPage = 'home';
        this.listings = [];
        this.favorites = JSON.parse(localStorage.getItem('sara_favorites') || '[]');
        this.user = null;
        this.init();
    }

    async init() {
        this.initTheme();
        this.setupTelegram();
        this.setupRouter();
        this.setupEventListeners();
        await this.checkAuth();
        this.loadPage('home');
    }

    async checkAuth() {
        // Always show login button initially
        const loginBtn = document.getElementById('loginBtn');
        if (loginBtn) {
            loginBtn.style.display = 'block';
        }
        
        // Check if user is logged in via session
        try {
            const response = await fetch('check_auth.php');
            const data = await response.json();
            
            if (data.logged_in) {
                this.user = data.user;
                // Hide login button for authenticated users
                if (loginBtn) {
                    loginBtn.style.display = 'none';
                }
            }
        } catch (error) {
            console.error('Auth check error:', error);
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
            
            if (e.target.id === 'profileBtn') {
                e.preventDefault();
                this.showPage('profile');
            }
            
            if (e.target.id === 'notificationBtn') {
                e.preventDefault();
                this.showNotifications();
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
        let pullDistance = 0;
        const indicator = document.querySelector('.pull-to-refresh');
        const threshold = 80;

        document.addEventListener('touchstart', (e) => {
            if (window.scrollY === 0) {
                startY = e.touches[0].clientY;
                pulling = true;
            }
        }, { passive: true });

        document.addEventListener('touchmove', (e) => {
            if (pulling) {
                const currentY = e.touches[0].clientY;
                pullDistance = Math.max(0, currentY - startY);
                
                if (pullDistance > 0 && pullDistance < threshold * 2) {
                    e.preventDefault();
                    const progress = Math.min(pullDistance / threshold, 1);
                    
                    indicator.style.transform = `translateY(${pullDistance * 0.5}px) scale(${0.8 + progress * 0.2})`;
                    indicator.style.opacity = progress;
                    
                    // Rotate spinner based on pull distance
                    const spinner = indicator.querySelector('.spinner');
                    if (spinner) {
                        spinner.style.transform = `rotate(${pullDistance * 2}deg)`;
                    }
                    
                    // Change color when ready to refresh
                    if (pullDistance > threshold) {
                        indicator.style.background = 'linear-gradient(135deg, #22c55e, #16a34a)';
                        indicator.style.color = 'white';
                    } else {
                        indicator.style.background = 'rgba(255, 255, 255, 0.95)';
                        indicator.style.color = 'var(--text-primary)';
                    }
                }
            }
        }, { passive: false });

        document.addEventListener('touchend', () => {
            if (pulling && pullDistance > threshold) {
                indicator.style.transform = 'translateY(60px) scale(1)';
                indicator.style.opacity = '1';
                this.refresh();
                
                setTimeout(() => {
                    indicator.style.transform = 'translateY(0)';
                    indicator.style.opacity = '0';
                }, 2000);
            } else {
                indicator.style.transform = 'translateY(0)';
                indicator.style.opacity = '0';
            }
            
            pulling = false;
            pullDistance = 0;
        }, { passive: true });
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

        this.showSkeletonLoading(grid);
        this.showWelcomeBanner();
        
        // Get URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const search = urlParams.get('search') || '';
        const filter = urlParams.get('filter') || 'all';
        const sort = urlParams.get('sort') || 'newest';
        const page = parseInt(urlParams.get('page')) || 1;
        
        // Update search input
        const searchInput = document.getElementById('searchInput');
        if (searchInput) searchInput.value = search;
        
        // Update filter tabs
        document.querySelectorAll('.filter-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.filter === filter);
        });
        
        await this.loadListings(page, search, filter, sort);
        this.renderListings();
        this.renderPagination();
        this.updateWelcomeStats();
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
                <h2>📝 Yangi e'lon qo'shish</h2>
                <p class="form-help">Barcha majburiy maydonlarni to'ldiring va aniq ma'lumotlar kiriting</p>
                
                <form id="addListingForm">
                    <div class="form-group required">
                        <label>Sarlavha</label>
                        <input type="text" name="title" required minlength="3" maxlength="100" 
                               placeholder="Masalan: 3 xonali kvartira Toshkentda">
                        <div class="form-help">Qisqa va aniq sarlavha yozing (3-100 belgi)</div>
                    </div>
                    
                    <div class="form-group">
                        <label>Tavsif</label>
                        <textarea name="description" rows="4" maxlength="1000" 
                                  placeholder="E'lon haqida batafsil ma'lumot..."></textarea>
                        <div class="form-help">E'lon haqida batafsil yozing (maksimal 1000 belgi)</div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group required">
                            <label>E'lon turi</label>
                            <select name="type" required>
                                <option value="">Tanlang</option>
                                <option value="sale">Sotish</option>
                                <option value="rent">Ijara</option>
                            </select>
                        </div>
                        <div class="form-group required">
                            <label>Narx (USD)</label>
                            <input type="number" name="price" required min="1" max="999999999" 
                                   placeholder="0">
                        </div>
                    </div>
                    
                    <div class="form-group required">
                        <label>Mulk turi</label>
                        <select name="property_type" required>
                            <option value="">Tanlang</option>
                            <option value="apartment">🏢 Kvartira</option>
                            <option value="house">🏠 Uy</option>
                            <option value="commercial">🏪 Tijorat</option>
                            <option value="office">🏢 Ofis</option>
                        </select>
                    </div>
                    
                    <div class="form-group required">
                        <label>Joylashuv</label>
                        <input type="text" name="location" required minlength="3" maxlength="100" 
                               placeholder="Shahar, tuman, ko'cha">
                        <div class="form-help">Aniq manzil kiriting</div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label>Xonalar soni</label>
                            <select name="rooms">
                                <option value="1">1 xona</option>
                                <option value="2">2 xona</option>
                                <option value="3">3 xona</option>
                                <option value="4">4 xona</option>
                                <option value="5">5+ xona</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Maydon (m²)</label>
                            <input type="number" name="area" step="0.1" min="1" max="10000" 
                                   placeholder="0">
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label>Telefon raqami</label>
                        <input type="tel" name="phone" pattern="[+]?[0-9\s\-\(\)]{7,15}" 
                               placeholder="+998 90 123 45 67">
                        <div class="form-help">Bog'lanish uchun telefon raqamingiz</div>
                    </div>
                    
                    <div class="form-group">
                        <label>Rasmlar</label>
                        <input type="file" name="images" accept="image/*" multiple>
                        <div class="form-help">Maksimal 10 ta rasm (JPG, PNG)</div>
                    </div>
                    
                    <div class="form-actions">
                        <button type="button" class="btn-secondary" onclick="app.showPage('home')">
                            ❌ Bekor qilish
                        </button>
                        <button type="submit" class="btn-primary">
                            ✅ E'lonni saqlash
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

        const userPhoto = this.user?.photo_url;
        const userName = this.user?.first_name || 'Foydalanuvchi';
        const userInitial = userName.charAt(0).toUpperCase();
        
        grid.innerHTML = `
            <div class="profile-page">
                <div class="profile-header">
                    <div class="profile-avatar" onclick="app.changeProfilePhoto()">
                        ${userPhoto ? 
                            `<img src="${userPhoto}" alt="${userName}" class="profile-photo">` : 
                            `<span class="profile-initial">${userInitial}</span>`
                        }
                        <div class="photo-overlay">
                            <span>📷</span>
                        </div>
                    </div>
                    <h2>${userName} ${this.user?.last_name || ''}</h2>
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

    async loadListings(page = 1, search = '', filter = 'all', sort = 'newest') {
        try {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: '20',
                search,
                filter,
                sort,
                _t: Date.now() // Cache busting
            });
            
            const response = await fetch(`api/listings.php?${params}`, {
                cache: 'no-cache',
                headers: {
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (data.success) {
                this.listings = data.listings || [];
                this.pagination = data.pagination || {};
                
                // Update URL without reload
                const url = new URL(window.location);
                if (search) url.searchParams.set('search', search);
                else url.searchParams.delete('search');
                if (filter !== 'all') url.searchParams.set('filter', filter);
                else url.searchParams.delete('filter');
                if (sort !== 'newest') url.searchParams.set('sort', sort);
                else url.searchParams.delete('sort');
                if (page > 1) url.searchParams.set('page', page.toString());
                else url.searchParams.delete('page');
                
                window.history.replaceState({}, '', url);
            } else {
                throw new Error(data.error || 'Ma\'lumotlar yuklanmadi');
            }
        } catch (error) {
            console.error('Listings load error:', error);
            this.showToast('E\'lonlar yuklanmadi: ' + error.message, 'error');
            this.listings = [];
            this.pagination = {};
        }
    }

    renderListings(listings = this.listings) {
        const grid = document.getElementById('listingsGrid');
        if (!grid) return;

        if (listings.length === 0) {
            grid.innerHTML = `
                <div class="empty-state">
                    <div style="font-size: 5rem; margin-bottom: 1.5rem; animation: bounce 2s infinite;">🏠</div>
                    <h3>E'lonlar topilmadi</h3>
                    <p>Qidiruv shartlaringizni o'zgartiring yoki yangi e'lon qo'shing</p>
                    <button class="btn-primary bounce" onclick="app.showPage('add')" style="margin-top: 2rem; animation-delay: 0.5s;">
                        ✨ Birinchi e'lonni qo'shish
                    </button>
                </div>
            `;
            return;
        }

        const listingsHTML = listings.map((listing, index) => {
            const imageUrl = listing.images && listing.images.length > 0 
                ? listing.images[0] 
                : 'images/default-house.svg';
            
            const typeText = this.getPropertyTypeText(listing.property_type);
            const saleType = listing.type === 'rent' ? '🏠 Ijara' : '💰 Sotish';
            const isNew = this.isNewListing(listing.created_at);
            const isPremium = listing.premium || Math.random() > 0.8; // Demo uchun
            
            return `
                <div class="listing-card ${isPremium ? 'premium' : ''}" 
                     data-listing-id="${listing.id}" 
                     style="animation-delay: ${index * 0.1}s">
                    <div class="listing-image">
                        <img src="${imageUrl}" alt="${listing.title}" loading="lazy" 
                             onerror="this.src='images/default-house.svg'">
                        <div class="listing-badge ${listing.type}">
                            ${saleType}
                            ${isNew ? ' 🆕' : ''}
                        </div>
                        ${isPremium ? '<div class="premium-badge">⭐ Premium</div>' : ''}
                        <button class="favorite-btn ${this.favorites.includes(listing.id) ? 'active' : ''}" 
                                data-listing-id="${listing.id}" title="Sevimlilar">
                            ${this.favorites.includes(listing.id) ? '❤️' : '🤍'}
                        </button>
                    </div>
                    <div class="listing-content">
                        <h3>${this.escapeHtml(listing.title)}</h3>
                        <div class="price">$${Number(listing.price).toLocaleString()}</div>
                        <div class="location">${this.escapeHtml(listing.location)}</div>
                        <div class="features">
                            <span>🏠 ${typeText}</span>
                            <span>🚪 ${listing.rooms} xona</span>
                            ${listing.area ? `<span>📏 ${listing.area}m²</span>` : ''}
                        </div>
                        <div class="listing-meta">
                            <span>👁️ ${listing.views || 0}</span>
                            <span>⏰ ${this.getTimeAgo(listing.created_at)}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
        grid.innerHTML = listingsHTML;
        
        // Add stagger animation
        setTimeout(() => {
            document.querySelectorAll('.listing-card').forEach((card, index) => {
                setTimeout(() => {
                    card.style.opacity = '1';
                    card.style.transform = 'translateY(0)';
                }, index * 100);
            });
        }, 50);
    }

    async filterListings(filter) {
        // Update active tab
        document.querySelectorAll('.filter-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.filter === filter);
        });
        
        // Get current search
        const searchInput = document.getElementById('searchInput');
        const search = searchInput ? searchInput.value.trim() : '';
        
        // Reload with filter
        await this.loadListings(1, search, filter);
        this.renderListings();
        this.renderPagination();
    }

    async handleSearch(query) {
        const trimmedQuery = query.trim();
        
        // Update URL
        const url = new URL(window.location);
        if (trimmedQuery) {
            url.searchParams.set('search', trimmedQuery);
        } else {
            url.searchParams.delete('search');
        }
        url.searchParams.delete('page'); // Reset to first page
        window.history.replaceState({}, '', url);
        
        // Reload listings with search
        const filter = document.querySelector('.filter-tab.active')?.dataset.filter || 'all';
        await this.loadListings(1, trimmedQuery, filter);
        this.renderListings();
        this.renderPagination();
    }

    async handleAddListing(form) {
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        
        try {
            submitBtn.disabled = true;
            submitBtn.classList.add('btn-loading');
            submitBtn.innerHTML = '⏳ Saqlanmoqda...';
            
            // Add loading animation to form
            form.style.opacity = '0.7';
            form.style.pointerEvents = 'none';
            
            const formData = new FormData(form);
            const data = {
                title: formData.get('title')?.trim(),
                description: formData.get('description')?.trim(),
                price: parseFloat(formData.get('price')) || 0,
                location: formData.get('location')?.trim(),
                property_type: formData.get('property_type'),
                type: formData.get('type') || 'sale',
                rooms: parseInt(formData.get('rooms')) || 1,
                area: parseFloat(formData.get('area')) || 0,
                phone: formData.get('phone')?.trim(),
                user_id: this.user?.id || Date.now(),
                images: []
            };

            // Client-side validation
            const errors = [];
            if (!data.title || data.title.length < 3) {
                errors.push('Sarlavha kamida 3 ta belgidan iborat bo\'lishi kerak');
            }
            if (!data.location || data.location.length < 3) {
                errors.push('Joylashuv kamida 3 ta belgidan iborat bo\'lishi kerak');
            }
            if (!data.property_type) {
                errors.push('Mulk turini tanlang');
            }
            if (data.price <= 0 || data.price > 999999999) {
                errors.push('Narx noto\'g\'ri');
            }
            if (data.phone && !/^[+]?[0-9\s\-\(\)]{7,15}$/.test(data.phone)) {
                errors.push('Telefon raqami noto\'g\'ri formatda');
            }
            
            if (errors.length > 0) {
                this.showToast(errors.join(', '), 'error');
                return;
            }

            const response = await fetch('api/listings.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            
            if (result.success) {
                // Success animation
                form.style.transform = 'scale(0.95)';
                setTimeout(() => {
                    this.showToast('🎉 E\'lon muvaffaqiyatli qo\'shildi!', 'success');
                    form.reset();
                    this.showPage('home');
                    this.loadListings();
                }, 300);
                
                this.hapticFeedback('heavy');
            } else {
                throw new Error(result.error || 'E\'lon qo\'shilmadi');
            }
        } catch (error) {
            console.error('Add listing error:', error);
            this.showToast('Xatolik: ' + error.message, 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.classList.remove('btn-loading');
            submitBtn.innerHTML = originalText;
            form.style.opacity = '1';
            form.style.pointerEvents = 'auto';
            form.style.transform = 'scale(1)';
        }
    }

    toggleFavorite(listingId) {
        const id = parseInt(listingId);
        const index = this.favorites.indexOf(id);
        const btn = document.querySelector(`[data-listing-id="${id}"].favorite-btn`);
        
        if (index > -1) {
            this.favorites.splice(index, 1);
            this.showToast('💔 Sevimlilardan olib tashlandi', 'info');
            if (btn) {
                btn.style.animation = 'heartBreak 0.6s ease';
            }
        } else {
            this.favorites.push(id);
            this.showToast('💖 Sevimlilarga qo\'shildi!', 'success');
            if (btn) {
                btn.style.animation = 'heartBeat 0.6s ease';
                // Confetti effect
                this.createConfetti(btn);
            }
        }
        
        localStorage.setItem('sara_favorites', JSON.stringify(this.favorites));
        this.updateFavoriteButtons();
        this.hapticFeedback('medium');
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
        
        // Hide welcome banner on other pages
        const banner = document.getElementById('welcomeBanner');
        if (banner && page !== 'home') {
            banner.style.display = 'none';
        } else if (banner && page === 'home') {
            banner.style.display = 'block';
        }
    }

    showPage(page, id = null) {
        const hash = id ? `${page}-${id}` : page;
        location.hash = hash;
    }

    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        // Add transition class
        document.body.style.transition = 'all 0.3s ease';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('sara_theme', newTheme);
        
        const themeBtn = document.getElementById('themeToggle');
        if (themeBtn) {
            themeBtn.style.transform = 'scale(0.8) rotate(180deg)';
            setTimeout(() => {
                themeBtn.textContent = newTheme === 'dark' ? '☀️' : '🌙';
                themeBtn.style.transform = 'scale(1) rotate(0deg)';
            }, 150);
        }
        
        this.showToast(
            newTheme === 'dark' ? '🌙 Tungi rejim yoqildi' : '☀️ Kunduzgi rejim yoqildi', 
            'info', 
            2000
        );
        
        this.hapticFeedback('light');
        
        // Remove transition after animation
        setTimeout(() => {
            document.body.style.transition = '';
        }, 300);
    }
    
    // Initialize theme from localStorage
    initTheme() {
        const savedTheme = localStorage.getItem('sara_theme');
        if (savedTheme) {
            document.documentElement.setAttribute('data-theme', savedTheme);
            const themeBtn = document.getElementById('themeToggle');
            if (themeBtn) {
                themeBtn.textContent = savedTheme === 'dark' ? '☀️' : '🌙';
            }
        }
    }

    async refresh() {
        this.showToast('🔄 Yangilanmoqda...', 'info', 2000);
        
        // Show loading animation
        const grid = document.getElementById('listingsGrid');
        if (grid) {
            grid.style.opacity = '0.7';
            grid.style.transform = 'scale(0.98)';
        }
        
        // Force cache bypass
        const timestamp = Date.now();
        
        await this.loadListings();
        this.renderListings();
        
        // Restore grid
        if (grid) {
            setTimeout(() => {
                grid.style.opacity = '1';
                grid.style.transform = 'scale(1)';
            }, 300);
        }
        
        this.hapticFeedback('medium');
        this.showToast('✨ Yangi ma\'lumotlar yuklandi!', 'success', 2000);
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
            this.showToast('📱 Telegram ochilmoqda...', 'info', 2000);
        } else {
            this.showToast('📞 Telegram orqali bog\'lanish mumkin', 'info');
        }
        this.hapticFeedback('medium');
    }

    shareListing(listingId) {
        const listing = this.listings.find(l => l.id == listingId);
        if (!listing) return;

        const shareText = `🏠 ${listing.title}\n💰 $${Number(listing.price).toLocaleString()}\n📍 ${listing.location}\n\n🔗 ${window.location.origin}/#listing-${listingId}`;
        
        if (navigator.share) {
            navigator.share({
                title: `🏠 ${listing.title}`,
                text: shareText,
                url: `${window.location.origin}/#listing-${listingId}`
            }).then(() => {
                this.showToast('📤 Muvaffaqiyatli ulashildi!', 'success');
            }).catch(() => {
                this.fallbackShare(shareText);
            });
        } else if (this.tg) {
            this.tg.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(window.location.origin + '/#listing-' + listingId)}&text=${encodeURIComponent(shareText)}`);
            this.showToast('📱 Telegram ochilmoqda...', 'info', 2000);
        } else {
            this.fallbackShare(shareText);
        }
        
        this.hapticFeedback('medium');
    }
    
    fallbackShare(text) {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text).then(() => {
                this.showToast('📋 Havolasi nusxalandi!', 'success');
            }).catch(() => {
                this.showToast('❌ Nusxalashda xatolik', 'error');
            });
        } else {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            try {
                document.execCommand('copy');
                this.showToast('📋 Havolasi nusxalandi!', 'success');
            } catch (err) {
                this.showToast('❌ Nusxalashda xatolik', 'error');
            }
            document.body.removeChild(textArea);
        }
    }

    showToast(message, type = 'info', duration = 3000) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        // Add icon based on type
        const icons = {
            success: '🎉',
            error: '😞',
            warning: '⚠️',
            info: '💡'
        };
        
        toast.innerHTML = `${icons[type] || icons.info} ${message}`;
        
        const container = document.getElementById('toastContainer');
        if (container) {
            container.appendChild(toast);
            
            // Add entrance animation
            setTimeout(() => {
                toast.classList.add('show');
                this.hapticFeedback('light');
            }, 100);
            
            // Auto dismiss
            setTimeout(() => {
                toast.classList.remove('show');
                setTimeout(() => {
                    if (toast.parentNode) {
                        toast.remove();
                    }
                }, 500);
            }, duration);
            
            // Click to dismiss with animation
            toast.addEventListener('click', () => {
                toast.style.transform = 'scale(0.8) translateX(-50%)';
                toast.style.opacity = '0';
                setTimeout(() => {
                    if (toast.parentNode) {
                        toast.remove();
                    }
                }, 300);
            });
            
            // Swipe to dismiss
            let startX = 0;
            toast.addEventListener('touchstart', (e) => {
                startX = e.touches[0].clientX;
            });
            
            toast.addEventListener('touchmove', (e) => {
                const currentX = e.touches[0].clientX;
                const diff = currentX - startX;
                toast.style.transform = `translateX(calc(-50% + ${diff}px))`;
            });
            
            toast.addEventListener('touchend', (e) => {
                const currentX = e.changedTouches[0].clientX;
                const diff = Math.abs(currentX - startX);
                
                if (diff > 100) {
                    toast.style.transform = `translateX(${currentX > startX ? '100%' : '-100%'})`;
                    toast.style.opacity = '0';
                    setTimeout(() => {
                        if (toast.parentNode) {
                            toast.remove();
                        }
                    }, 300);
                } else {
                    toast.style.transform = 'translateX(-50%)';
                }
            });
        }
    }

    hapticFeedback(type = 'light') {
        if (this.tg?.HapticFeedback) {
            this.tg.HapticFeedback.impactOccurred(type);
        } else if (navigator.vibrate) {
            // Fallback vibration for non-Telegram browsers
            const patterns = {
                light: [10],
                medium: [20],
                heavy: [30, 10, 30]
            };
            navigator.vibrate(patterns[type] || patterns.light);
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
        const minutes = Math.floor(diff / (1000 * 60));
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        
        if (minutes < 1) return '🆕 Hozir';
        if (minutes < 60) return `⏰ ${minutes} daqiqa oldin`;
        if (hours < 24) return `🕐 ${hours} soat oldin`;
        if (days === 0) return '📅 Bugun';
        if (days === 1) return '🌙 Kecha';
        if (days < 7) return `📆 ${days} kun oldin`;
        if (days < 30) return `🗓️ ${Math.floor(days / 7)} hafta oldin`;
        return `📅 ${Math.floor(days / 30)} oy oldin`;
    }
    
    isNewListing(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now - date;
        const hours = Math.floor(diff / (1000 * 60 * 60));
        return hours < 24; // 24 soat ichida yangi
    }
    
    createConfetti(element) {
        const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7', '#dda0dd'];
        const rect = element.getBoundingClientRect();
        
        for (let i = 0; i < 15; i++) {
            const confetti = document.createElement('div');
            confetti.style.position = 'fixed';
            confetti.style.left = rect.left + rect.width / 2 + 'px';
            confetti.style.top = rect.top + rect.height / 2 + 'px';
            confetti.style.width = '6px';
            confetti.style.height = '6px';
            confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.borderRadius = '50%';
            confetti.style.pointerEvents = 'none';
            confetti.style.zIndex = '9999';
            
            document.body.appendChild(confetti);
            
            const angle = (Math.PI * 2 * i) / 15;
            const velocity = 100 + Math.random() * 50;
            const vx = Math.cos(angle) * velocity;
            const vy = Math.sin(angle) * velocity;
            
            confetti.animate([
                {
                    transform: 'translate(0, 0) scale(1)',
                    opacity: 1
                },
                {
                    transform: `translate(${vx}px, ${vy}px) scale(0)`,
                    opacity: 0
                }
            ], {
                duration: 1000,
                easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
            }).onfinish = () => {
                confetti.remove();
            };
        }
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    renderPagination() {
        if (!this.pagination || this.pagination.pages <= 1) return;
        
        const grid = document.getElementById('listingsGrid');
        if (!grid) return;
        
        const paginationHTML = `
            <div class="pagination" style="grid-column: 1 / -1; text-align: center; margin-top: 2rem;">
                ${this.pagination.page > 1 ? 
                    `<button class="btn-secondary" onclick="app.loadPage('home', null, ${this.pagination.page - 1})">
                        ← Oldingi
                    </button>` : ''}
                <span style="margin: 0 1rem;">
                    ${this.pagination.page} / ${this.pagination.pages}
                </span>
                ${this.pagination.page < this.pagination.pages ? 
                    `<button class="btn-secondary" onclick="app.loadPage('home', null, ${this.pagination.page + 1})">
                        Keyingi →
                    </button>` : ''}
            </div>
        `;
        
        grid.insertAdjacentHTML('beforeend', paginationHTML);
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
    
    // Profile photo change
    changeProfilePhoto() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (file) {
                try {
                    const formData = new FormData();
                    formData.append('image', file);
                    
                    const response = await fetch('api/upload-image.php', {
                        method: 'POST',
                        body: formData
                    });
                    
                    const result = await response.json();
                    
                    if (result.success) {
                        if (this.user) {
                            this.user.photo_url = result.url;
                        }
                        this.renderProfilePage();
                        this.showToast('Rasm yangilandi', 'success');
                    } else {
                        throw new Error(result.error);
                    }
                } catch (error) {
                    this.showToast('Rasm yuklanmadi: ' + error.message, 'error');
                }
            }
        };
        input.click();
    }
    
    showSkeletonLoading(container) {
        const skeletonCount = window.innerWidth > 768 ? 6 : 3;
        const skeletons = Array.from({ length: skeletonCount }, (_, i) => `
            <div class="skeleton-card" style="animation-delay: ${i * 0.1}s">
                <div class="skeleton skeleton-image"></div>
                <div class="skeleton skeleton-text"></div>
                <div class="skeleton skeleton-text short"></div>
                <div class="skeleton skeleton-text" style="width: 40%;"></div>
            </div>
        `).join('');
        
        container.innerHTML = skeletons;
    }

    // Additional methods for profile menu
    showMyListings() {
        const userListings = this.listings.filter(l => l.user_id == this.user?.id);
        this.renderListings(userListings);
    }

    showSettings() {
        const grid = document.getElementById('listingsGrid');
        if (!grid) return;

        const currentTheme = document.documentElement.getAttribute('data-theme');
        const notificationsEnabled = localStorage.getItem('sara_notifications') !== 'false';
        const version = localStorage.getItem('sara_version') || '2.1.0';

        grid.innerHTML = `
            <div class="settings-page">
                <h2>⚙️ Sozlamalar</h2>
                <div class="setting-item">
                    <span>🌙 Tungi rejim</span>
                    <button onclick="app.toggleTheme()">${currentTheme === 'dark' ? '☀️ Kunduzgi' : '🌙 Tungi'} rejim</button>
                </div>
                <div class="setting-item">
                    <span>🔔 Bildirishnomalar</span>
                    <button onclick="app.toggleNotifications()">${notificationsEnabled ? '🔕 O\'chirish' : '🔔 Yoqish'}</button>
                </div>
                <div class="setting-item">
                    <span>🌐 Til</span>
                    <span>🇺🇿 O'zbek tili</span>
                </div>
                <div class="setting-item">
                    <span>🔄 Ma'lumotlarni yangilash</span>
                    <button onclick="app.refresh()">🔄 Yangilash</button>
                </div>
                <div class="setting-item">
                    <span>🧹 Cache tozalash</span>
                    <button onclick="app.clearCache()">🗑️ To'liq tozalash</button>
                </div>
                <div class="setting-item">
                    <span>📱 Versiya</span>
                    <span>v${version}</span>
                </div>
                <div style="text-align: center; margin-top: 2rem; padding: 1rem; background: var(--bg-secondary); border-radius: 12px;">
                    <p style="color: var(--text-secondary); font-size: 0.9rem;">🏠 Sara Uylar Professional Platform</p>
                    <p style="color: var(--text-secondary); font-size: 0.8rem;">© 2024 Sara Uylar Team</p>
                </div>
            </div>
        `;
    }
    
    toggleNotifications() {
        const current = localStorage.getItem('sara_notifications') !== 'false';
        localStorage.setItem('sara_notifications', (!current).toString());
        this.showToast(current ? 'Bildirishnomalar o\'chirildi' : 'Bildirishnomalar yoqildi', 'info');
        this.showSettings(); // Refresh settings page
    }
    
    clearCache() {
        // LocalStorage tozalash
        localStorage.removeItem('sara_favorites');
        localStorage.removeItem('sara_theme');
        localStorage.removeItem('sara_notifications');
        localStorage.removeItem('sara_version');
        
        // Service Worker cache tozalash
        if ('caches' in window) {
            caches.keys().then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => caches.delete(cacheName))
                );
            });
        }
        
        // Service Worker yangilash
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistrations().then(registrations => {
                registrations.forEach(registration => {
                    registration.update();
                });
            });
        }
        
        this.favorites = [];
        this.showToast('🧹 Cache to\'liq tozalandi!', 'success');
        
        setTimeout(() => {
            window.location.reload(true);
        }, 1500);
    }
    
    showWelcomeBanner() {
        const banner = document.getElementById('welcomeBanner');
        const isFirstVisit = !localStorage.getItem('sara_visited');
        
        if (banner && (isFirstVisit || this.currentPage === 'home')) {
            banner.style.display = 'block';
            banner.style.opacity = '0';
            banner.style.transform = 'translateY(-20px)';
            
            setTimeout(() => {
                banner.style.transition = 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
                banner.style.opacity = '1';
                banner.style.transform = 'translateY(0)';
            }, 300);
            
            if (isFirstVisit) {
                localStorage.setItem('sara_visited', 'true');
                setTimeout(() => {
                    this.showToast('🎉 Sara Uylar platformasiga xush kelibsiz!', 'success', 4000);
                }, 1000);
            }
        }
    }
    
    updateWelcomeStats() {
        const totalElement = document.getElementById('totalListings');
        const todayElement = document.getElementById('todayListings');
        const favoritesElement = document.getElementById('userFavorites');
        
        if (totalElement) {
            this.animateNumber(totalElement, this.listings.length);
        }
        
        if (todayElement) {
            const today = new Date().toDateString();
            const todayCount = this.listings.filter(l => 
                new Date(l.created_at).toDateString() === today).length;
            this.animateNumber(todayElement, todayCount);
        }
        
        if (favoritesElement) {
            this.animateNumber(favoritesElement, this.favorites.length);
        }
    }
    
    animateNumber(element, target) {
        const start = parseInt(element.textContent) || 0;
        const duration = 1000;
        const startTime = performance.now();
        
        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            const easeOutQuart = 1 - Math.pow(1 - progress, 4);
            const current = Math.round(start + (target - start) * easeOutQuart);
            
            element.textContent = current;
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        requestAnimationFrame(animate);
    }
    
    showNotifications() {
        const notifications = [
            {
                icon: '🏠',
                title: 'Yangi e\'lon',
                text: 'Toshkentda yangi kvartira e\'loni qo\'shildi',
                time: '5 daqiqa oldin'
            },
            {
                icon: '❤️',
                title: 'Sevimli e\'lon',
                text: 'Sizning sevimli e\'loningiz yangilandi',
                time: '1 soat oldin'
            },
            {
                icon: '💰',
                title: 'Narx pasaydi',
                text: 'Kuzatayotgan e\'lon narxi 5% pasaydi',
                time: '2 soat oldin'
            }
        ];
        
        const grid = document.getElementById('listingsGrid');
        if (!grid) return;
        
        grid.innerHTML = `
            <div class="notifications-page">
                <h2>🔔 Bildirishnomalar</h2>
                <div class="notifications-list">
                    ${notifications.map(notif => `
                        <div class="notification-item">
                            <div class="notification-icon">${notif.icon}</div>
                            <div class="notification-content">
                                <div class="notification-title">${notif.title}</div>
                                <div class="notification-text">${notif.text}</div>
                                <div class="notification-time">${notif.time}</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
                <div style="text-align: center; margin-top: 2rem;">
                    <button class="btn-secondary" onclick="app.showPage('home')">
                        🏠 Bosh sahifaga qaytish
                    </button>
                </div>
            </div>
        `;
    }
    
    applyAdvancedSearch() {
        const minPrice = document.getElementById('minPrice')?.value;
        const maxPrice = document.getElementById('maxPrice')?.value;
        const minArea = document.getElementById('minArea')?.value;
        const maxArea = document.getElementById('maxArea')?.value;
        const rooms = document.getElementById('roomsFilter')?.value;
        
        let filtered = this.listings;
        
        if (minPrice) filtered = filtered.filter(l => l.price >= parseFloat(minPrice));
        if (maxPrice) filtered = filtered.filter(l => l.price <= parseFloat(maxPrice));
        if (minArea) filtered = filtered.filter(l => l.area >= parseFloat(minArea));
        if (maxArea) filtered = filtered.filter(l => l.area <= parseFloat(maxArea));
        if (rooms && rooms !== '4+') filtered = filtered.filter(l => l.rooms == parseInt(rooms));
        if (rooms === '4+') filtered = filtered.filter(l => l.rooms >= 4);
        
        const resultsContainer = document.getElementById('searchResults');
        if (resultsContainer) {
            if (filtered.length === 0) {
                resultsContainer.innerHTML = '<div class="empty-state"><h3>Natija topilmadi</h3><p>Qidiruv shartlarini o\'zgartiring</p></div>';
            } else {
                resultsContainer.innerHTML = filtered.map(listing => `
                    <div class="listing-card" data-listing-id="${listing.id}" onclick="app.showPage('listing', ${listing.id})">
                        <div class="listing-content">
                            <h3>${listing.title}</h3>
                            <div class="price">$${Number(listing.price).toLocaleString()}</div>
                            <div class="location">📍 ${listing.location}</div>
                        </div>
                    </div>
                `).join('');
            }
        }
        
        this.showToast(`${filtered.length} ta natija topildi`, 'info');
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
    // Add loading screen
    const loadingScreen = document.createElement('div');
    loadingScreen.innerHTML = `
        <div style="
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            z-index: 9999;
            color: white;
        ">
            <div style="font-size: 4rem; margin-bottom: 1rem; animation: bounce 1s infinite;">🏠</div>
            <h2 style="margin-bottom: 0.5rem; font-weight: 700;">Sara Uylar</h2>
            <p style="opacity: 0.8; margin-bottom: 2rem;">Ko'chmas mulk platformasi v2.1.0</p>
            <div class="spinner" style="border-color: rgba(255,255,255,0.3); border-top-color: white;"></div>
        </div>
    `;
    
    document.body.appendChild(loadingScreen);
    
    // Initialize app
    setTimeout(() => {
        window.app = new SaraUylarApp();
        
        // Remove loading screen with animation
        setTimeout(() => {
            loadingScreen.style.opacity = '0';
            loadingScreen.style.transform = 'scale(1.1)';
            setTimeout(() => {
                loadingScreen.remove();
            }, 500);
        }, 1000);
    }, 500);
});

// Register service worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('🔧 Service Worker registered successfully');
                
                // Show update notification if available
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            if (window.app) {
                                window.app.showToast('🆕 Yangilanish mavjud! Sahifani yangilang', 'info', 5000);
                            }
                        }
                    });
                });
            })
            .catch(registrationError => {
                console.log('❌ Service Worker registration failed:', registrationError);
            });
    });
}