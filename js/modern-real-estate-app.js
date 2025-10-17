class ModernRealEstateApp {
    constructor() {
        this.listings = [];
        this.favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
        this.currentFilter = 'all';
        this.searchQuery = '';
        this.currentPage = 1;
        this.isLoading = false;
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadListings();
        this.setupPullToRefresh();
        this.initTelegramWebApp();
    }

    setupEventListeners() {
        // Search
        const searchInput = document.getElementById('searchInput');
        const searchBtn = document.getElementById('searchBtn');
        
        searchInput?.addEventListener('input', (e) => {
            this.searchQuery = e.target.value;
            this.debounce(() => this.filterListings(), 300)();
        });
        
        searchBtn?.addEventListener('click', () => this.filterListings());

        // Filter tabs
        document.querySelectorAll('.filter-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.setActiveFilter(e.target.dataset.filter);
            });
        });

        // FAB
        document.getElementById('addListingFab')?.addEventListener('click', () => {
            this.openAddListing();
        });

        // Bottom navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                this.navigateTo(e.currentTarget.dataset.page);
            });
        });

        // Theme toggle
        document.getElementById('themeToggle')?.addEventListener('click', () => {
            this.toggleTheme();
        });

        // Menu button
        document.getElementById('menuBtn')?.addEventListener('click', () => {
            this.showMenu();
        });

        // Notification button
        document.getElementById('notificationBtn')?.addEventListener('click', () => {
            this.showNotifications();
        });
    }

    async loadListings() {
        this.showLoading();
        
        try {
            const response = await fetch('/sara/api/enhanced-listings.php');
            const data = await response.json();
            
            if (data.success) {
                this.listings = data.listings || [];
                this.renderListings();
            } else {
                // Fallback to sample data if API fails
                this.listings = this.getSampleListings();
                this.renderListings();
            }
        } catch (error) {
            console.error('Error loading listings:', error);
            // Show sample data instead of error
            this.listings = this.getSampleListings();
            this.renderListings();
        } finally {
            this.hideLoading();
        }
    }

    renderListings() {
        const container = document.getElementById('listingsGrid');
        if (!container) return;

        const filteredListings = this.getFilteredListings();
        
        if (filteredListings.length === 0) {
            container.innerHTML = this.getEmptyState();
            return;
        }

        container.innerHTML = filteredListings.map(listing => this.createListingCard(listing)).join('');
        
        // Add event listeners to cards
        this.attachCardListeners();
    }

    createListingCard(listing) {
        const isFavorited = this.favorites.includes(listing.id);
        const badgeClass = listing.type === 'sale' ? 'badge-sale' : 'badge-rent';
        const badgeText = listing.type === 'sale' ? 'Sotish' : 'Ijara';
        
        return `
            <div class="property-card" data-id="${listing.id}">
                <div class="property-image">
                    <img src="${listing.image || '/sara/images/default-house.svg'}" alt="${listing.title}" loading="lazy">
                    <div class="property-badge ${badgeClass}">${badgeText}</div>
                    <div class="property-actions">
                        <button class="action-btn favorite-btn ${isFavorited ? 'favorited' : ''}" data-id="${listing.id}">
                            ${isFavorited ? '❤️' : '🤍'}
                        </button>
                        <button class="action-btn share-btn" data-id="${listing.id}">📤</button>
                    </div>
                </div>
                <div class="property-content">
                    <div class="property-price">${this.formatPrice(listing.price)}</div>
                    <div class="property-title">${listing.title}</div>
                    <div class="property-location">${listing.location}</div>
                    <div class="property-features">
                        ${listing.rooms ? `<div class="feature">🛏️ ${listing.rooms} xona</div>` : ''}
                        ${listing.area ? `<div class="feature">📐 ${listing.area} m²</div>` : ''}
                        ${listing.floor ? `<div class="feature">🏢 ${listing.floor}-qavat</div>` : ''}
                    </div>
                    <div class="property-footer">
                        <div class="property-date">${this.formatDate(listing.created_at)}</div>
                        <button class="contact-btn" data-phone="${listing.phone}">📞 Bog'lanish</button>
                    </div>
                </div>
            </div>
        `;
    }

    attachCardListeners() {
        // Card clicks
        document.querySelectorAll('.property-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (!e.target.closest('.action-btn') && !e.target.closest('.contact-btn')) {
                    this.openListingDetails(card.dataset.id);
                }
            });
        });

        // Favorite buttons
        document.querySelectorAll('.favorite-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleFavorite(btn.dataset.id);
            });
        });

        // Share buttons
        document.querySelectorAll('.share-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.shareListing(btn.dataset.id);
            });
        });

        // Contact buttons
        document.querySelectorAll('.contact-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.contactOwner(btn.dataset.phone);
            });
        });
    }

    getFilteredListings() {
        let filtered = this.listings;

        // Filter by type
        if (this.currentFilter !== 'all') {
            filtered = filtered.filter(listing => listing.type === this.currentFilter);
        }

        // Filter by search query
        if (this.searchQuery) {
            const query = this.searchQuery.toLowerCase();
            filtered = filtered.filter(listing => 
                listing.title.toLowerCase().includes(query) ||
                listing.location.toLowerCase().includes(query) ||
                listing.description?.toLowerCase().includes(query)
            );
        }

        return filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }

    setActiveFilter(filter) {
        this.currentFilter = filter;
        
        // Update UI
        document.querySelectorAll('.filter-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.filter === filter);
        });
        
        this.renderListings();
    }

    toggleFavorite(listingId) {
        const index = this.favorites.indexOf(listingId);
        
        if (index > -1) {
            this.favorites.splice(index, 1);
        } else {
            this.favorites.push(listingId);
        }
        
        localStorage.setItem('favorites', JSON.stringify(this.favorites));
        this.renderListings();
        
        // Haptic feedback
        if (window.Telegram?.WebApp) {
            window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
        }
    }

    async shareListing(listingId) {
        const listing = this.listings.find(l => l.id === listingId);
        if (!listing) return;

        const shareData = {
            title: listing.title,
            text: `${listing.title} - ${this.formatPrice(listing.price)}`,
            url: `${window.location.origin}/sara/?listing=${listingId}`
        };

        try {
            if (navigator.share) {
                await navigator.share(shareData);
            } else if (window.Telegram?.WebApp) {
                window.Telegram.WebApp.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(shareData.url)}&text=${encodeURIComponent(shareData.text)}`);
            } else {
                // Fallback: copy to clipboard
                await navigator.clipboard.writeText(`${shareData.text}\n${shareData.url}`);
                this.showToast('Havola nusxalandi!');
            }
        } catch (error) {
            console.error('Share failed:', error);
        }
    }

    contactOwner(phone) {
        if (window.Telegram?.WebApp) {
            window.Telegram.WebApp.openTelegramLink(`https://t.me/${phone}`);
        } else {
            window.open(`tel:${phone}`, '_blank');
        }
    }

    openListingDetails(listingId) {
        const listing = this.listings.find(l => l.id === listingId);
        if (!listing) return;

        // Create modal or navigate to details page
        this.showListingModal(listing);
    }

    showListingModal(listing) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>${listing.title}</h2>
                    <button class="modal-close">✕</button>
                </div>
                <div class="modal-body">
                    <img src="${listing.image || '/sara/images/default-house.svg'}" alt="${listing.title}">
                    <div class="listing-details">
                        <div class="price">${this.formatPrice(listing.price)}</div>
                        <div class="location">📍 ${listing.location}</div>
                        <div class="description">${listing.description || ''}</div>
                        <div class="features">
                            ${listing.rooms ? `<span>🛏️ ${listing.rooms} xona</span>` : ''}
                            ${listing.area ? `<span>📐 ${listing.area} m²</span>` : ''}
                            ${listing.floor ? `<span>🏢 ${listing.floor}-qavat</span>` : ''}
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-primary" onclick="app.contactOwner('${listing.phone}')">📞 Bog'lanish</button>
                    <button class="btn-secondary" onclick="app.shareListing('${listing.id}')">📤 Ulashish</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        
        // Close modal
        modal.querySelector('.modal-close').addEventListener('click', () => {
            document.body.removeChild(modal);
        });
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });
    }

    openAddListing() {
        if (window.Telegram?.WebApp) {
            window.Telegram.WebApp.showPopup({
                title: 'E\'lon qo\'shish',
                message: 'Yangi e\'lon qo\'shish uchun botga o\'ting',
                buttons: [
                    {type: 'ok', text: 'Botga o\'tish'},
                    {type: 'cancel', text: 'Bekor qilish'}
                ]
            }, (buttonId) => {
                if (buttonId === 'ok') {
                    window.Telegram.WebApp.close();
                }
            });
        } else {
            this.showAddListingForm();
        }
    }

    showAddListingForm() {
        const container = document.getElementById('listingsGrid');
        container.innerHTML = `
            <div class="add-listing-form">
                <h3>Yangi e'lon qo'shish</h3>
                
                <div class="form-group">
                    <label>Sarlavha *</label>
                    <input type="text" id="listingTitle" placeholder="Masalan: 3-xonali kvartira">
                </div>
                
                <div class="form-group">
                    <label>Tavsif</label>
                    <textarea id="listingDescription" placeholder="E'lon haqida batafsil ma'lumot"></textarea>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label>Turi *</label>
                        <select id="listingType">
                            <option value="sale">Sotish</option>
                            <option value="rent">Ijara</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Kategoriya *</label>
                        <select id="listingCategory">
                            <option value="apartment">Kvartira</option>
                            <option value="house">Uy</option>
                            <option value="commercial">Tijorat</option>
                        </select>
                    </div>
                </div>
                
                <div class="form-group">
                    <label>Narx (so'm) *</label>
                    <input type="number" id="listingPrice" placeholder="0">
                </div>
                
                <div class="form-group">
                    <label>Joylashuv *</label>
                    <input type="text" id="listingLocation" placeholder="Tuman, shahar">
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label>Xonalar</label>
                        <input type="number" id="listingRooms" placeholder="0">
                    </div>
                    <div class="form-group">
                        <label>Maydon (m²)</label>
                        <input type="number" id="listingArea" placeholder="0">
                    </div>
                </div>
                
                <div class="form-group">
                    <label>Telefon *</label>
                    <input type="tel" id="listingPhone" placeholder="+998901234567">
                </div>
                
                <div class="form-actions">
                    <button class="btn-secondary" onclick="app.navigateTo('home')">Bekor qilish</button>
                    <button class="btn-primary" onclick="app.submitListing()">E'lon qo'shish</button>
                </div>
            </div>
        `;
    }

    async submitListing() {
        const title = document.getElementById('listingTitle')?.value;
        const description = document.getElementById('listingDescription')?.value;
        const type = document.getElementById('listingType')?.value;
        const category = document.getElementById('listingCategory')?.value;
        const price = document.getElementById('listingPrice')?.value;
        const location = document.getElementById('listingLocation')?.value;
        const rooms = document.getElementById('listingRooms')?.value;
        const area = document.getElementById('listingArea')?.value;
        const phone = document.getElementById('listingPhone')?.value;
        
        if (!title || !price || !location || !phone) {
            this.showToast('Majburiy maydonlarni to\'ldiring', 'error');
            return;
        }
        
        const newListing = {
            id: Date.now().toString(),
            title,
            description,
            type,
            category,
            price: parseInt(price),
            location,
            rooms: parseInt(rooms) || 0,
            area: parseInt(area) || 0,
            phone,
            image: '/sara/images/default-house.svg',
            created_at: new Date().toISOString(),
            owner_id: 'user1'
        };
        
        this.listings.unshift(newListing);
        this.showToast('E\'lon muvaffaqiyatli qo\'shildi!');
        this.navigateTo('home');
    }

    navigateTo(page) {
        // Update active nav item
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.page === page);
        });

        const container = document.getElementById('listingsGrid');
        
        // Handle navigation
        switch (page) {
            case 'home':
                this.currentFilter = 'all';
                this.setActiveFilter('all');
                this.renderListings();
                break;
            case 'search':
                this.showSearchPage();
                break;
            case 'favorites':
                this.showFavorites();
                break;
            case 'profile':
                this.showProfile();
                break;
            case 'add':
                this.openAddListing();
                break;
        }
    }

    showSearchPage() {
        const container = document.getElementById('listingsGrid');
        container.innerHTML = `
            <div class="search-page">
                <div class="search-filters">
                    <h3>Kengaytirilgan qidiruv</h3>
                    <div class="filter-group">
                        <label>Narx oralig'i (so'm)</label>
                        <div class="price-range">
                            <input type="number" id="minPrice" placeholder="Minimum">
                            <input type="number" id="maxPrice" placeholder="Maksimum">
                        </div>
                    </div>
                    <div class="filter-group">
                        <label>Xonalar soni</label>
                        <select id="roomsFilter">
                            <option value="">Barcha</option>
                            <option value="1">1 xona</option>
                            <option value="2">2 xona</option>
                            <option value="3">3 xona</option>
                            <option value="4">4+ xona</option>
                        </select>
                    </div>
                    <div class="filter-group">
                        <label>Maydon (m²)</label>
                        <div class="area-range">
                            <input type="number" id="minArea" placeholder="Min">
                            <input type="number" id="maxArea" placeholder="Max">
                        </div>
                    </div>
                    <button class="btn-primary" onclick="app.applyAdvancedSearch()">Qidiruv</button>
                </div>
            </div>
        `;
    }

    applyAdvancedSearch() {
        const minPrice = document.getElementById('minPrice')?.value;
        const maxPrice = document.getElementById('maxPrice')?.value;
        const rooms = document.getElementById('roomsFilter')?.value;
        const minArea = document.getElementById('minArea')?.value;
        const maxArea = document.getElementById('maxArea')?.value;
        
        let filtered = this.listings;
        
        if (minPrice) filtered = filtered.filter(l => l.price >= parseInt(minPrice));
        if (maxPrice) filtered = filtered.filter(l => l.price <= parseInt(maxPrice));
        if (rooms) filtered = filtered.filter(l => l.rooms >= parseInt(rooms));
        if (minArea) filtered = filtered.filter(l => l.area >= parseInt(minArea));
        if (maxArea) filtered = filtered.filter(l => l.area <= parseInt(maxArea));
        
        const container = document.getElementById('listingsGrid');
        if (filtered.length === 0) {
            container.innerHTML = this.getEmptyState();
        } else {
            container.innerHTML = filtered.map(listing => this.createListingCard(listing)).join('');
            this.attachCardListeners();
        }
        
        this.showToast(`${filtered.length} ta e'lon topildi`);
    }

    showFavorites() {
        const favoriteListings = this.listings.filter(l => this.favorites.includes(l.id));
        const container = document.getElementById('listingsGrid');
        
        if (favoriteListings.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">💔</div>
                    <h3>Sevimli e'lonlar yo'q</h3>
                    <p>Yoqgan e'lonlarni sevimlilar ro'yxatiga qo'shing</p>
                </div>
            `;
        } else {
            container.innerHTML = favoriteListings.map(listing => this.createListingCard(listing)).join('');
            this.attachCardListeners();
        }
    }

    showProfile() {
        const container = document.getElementById('listingsGrid');
        const userListings = this.listings.filter(l => l.owner_id === 'user1'); // Current user
        
        container.innerHTML = `
            <div class="profile-page">
                <div class="profile-header">
                    <div class="profile-avatar">👤</div>
                    <h2>Foydalanuvchi profili</h2>
                    <p>Telegram: @username</p>
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
                
                <div class="profile-actions">
                    <button class="btn-primary" onclick="app.showMyListings()">Mening e'lonlarim</button>
                    <button class="btn-secondary" onclick="app.showSettings()">Sozlamalar</button>
                </div>
            </div>
        `;
    }

    showMyListings() {
        const userListings = this.listings.filter(l => l.owner_id === 'user1');
        const container = document.getElementById('listingsGrid');
        
        if (userListings.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📝</div>
                    <h3>Sizda e'lonlar yo'q</h3>
                    <p>Birinchi e'loningizni qo'shing</p>
                    <button class="btn-primary" onclick="app.openAddListing()">E'lon qo'shish</button>
                </div>
            `;
        } else {
            container.innerHTML = userListings.map(listing => this.createListingCard(listing)).join('');
            this.attachCardListeners();
        }
    }

    showSettings() {
        const container = document.getElementById('listingsGrid');
        container.innerHTML = `
            <div class="settings-page">
                <h3>Sozlamalar</h3>
                
                <div class="setting-item">
                    <label>Rejim</label>
                    <button class="btn-secondary" onclick="app.toggleTheme()">🌙 Tungi/Kunduzgi</button>
                </div>
                
                <div class="setting-item">
                    <label>Bildirishnomalar</label>
                    <button class="btn-secondary" onclick="app.toggleNotifications()">🔔 Yoqish/O'chirish</button>
                </div>
                
                <div class="setting-item">
                    <label>Til</label>
                    <select class="form-select">
                        <option value="uz">O'zbek tili</option>
                        <option value="ru">Русский</option>
                    </select>
                </div>
                
                <div class="setting-item">
                    <label>Ma'lumotlar</label>
                    <button class="btn-secondary" onclick="app.clearData()">🗑️ Tozalash</button>
                </div>
            </div>
        `;
    }

    toggleNotifications() {
        const enabled = localStorage.getItem('notifications') !== 'false';
        localStorage.setItem('notifications', !enabled);
        this.showToast(enabled ? 'Bildirishnomalar o\'chirildi' : 'Bildirishnomalar yoqildi');
    }

    clearData() {
        if (confirm('Barcha ma\'lumotlarni o\'chirmoqchimisiz?')) {
            localStorage.clear();
            this.favorites = [];
            this.showToast('Ma\'lumotlar tozalandi');
            this.navigateTo('home');
        }
    }

    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        
        // Update theme toggle icon
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.textContent = newTheme === 'dark' ? '☀️' : '🌙';
        }
    }

    setupPullToRefresh() {
        let startY = 0;
        let currentY = 0;
        let isPulling = false;

        document.addEventListener('touchstart', (e) => {
            if (window.scrollY === 0) {
                startY = e.touches[0].clientY;
                isPulling = true;
            }
        });

        document.addEventListener('touchmove', (e) => {
            if (!isPulling) return;
            
            currentY = e.touches[0].clientY;
            const pullDistance = currentY - startY;
            
            if (pullDistance > 100) {
                this.showPullToRefresh();
            }
        });

        document.addEventListener('touchend', () => {
            if (isPulling && currentY - startY > 100) {
                this.refresh();
            }
            isPulling = false;
            this.hidePullToRefresh();
        });
    }

    showPullToRefresh() {
        const indicator = document.querySelector('.pull-to-refresh');
        if (indicator) {
            indicator.classList.add('visible');
        }
    }

    hidePullToRefresh() {
        const indicator = document.querySelector('.pull-to-refresh');
        if (indicator) {
            indicator.classList.remove('visible');
        }
    }

    async refresh() {
        await this.loadListings();
        this.showToast('E\'lonlar yangilandi!');
    }

    initTelegramWebApp() {
        if (window.Telegram?.WebApp) {
            const tg = window.Telegram.WebApp;
            tg.ready();
            tg.expand();
            
            // Set theme
            const theme = tg.colorScheme === 'dark' ? 'dark' : 'light';
            document.documentElement.setAttribute('data-theme', theme);
        }
    }

    // Utility functions
    formatPrice(price) {
        return new Intl.NumberFormat('uz-UZ').format(price) + ' so\'m';
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) return 'Bugun';
        if (diffDays === 2) return 'Kecha';
        if (diffDays <= 7) return `${diffDays} kun oldin`;
        
        return date.toLocaleDateString('uz-UZ');
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

    showLoading() {
        this.isLoading = true;
        const container = document.getElementById('listingsGrid');
        if (container) {
            container.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
        }
    }

    hideLoading() {
        this.isLoading = false;
    }

    showError(message) {
        this.showToast(message, 'error');
    }

    showMenu() {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Menyu</h2>
                    <button class="modal-close">✕</button>
                </div>
                <div class="modal-body">
                    <div class="menu-items">
                        <button class="menu-item" onclick="app.navigateTo('home'); app.closeModal()">
                            🏠 Bosh sahifa
                        </button>
                        <button class="menu-item" onclick="app.showStats(); app.closeModal()">
                            📊 Statistika
                        </button>
                        <button class="menu-item" onclick="app.showAbout(); app.closeModal()">
                            ℹ️ Dastur haqida
                        </button>
                        <button class="menu-item" onclick="app.showHelp(); app.closeModal()">
                            ❓ Yordam
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        this.currentModal = modal;
        
        modal.querySelector('.modal-close').addEventListener('click', () => this.closeModal());
        modal.addEventListener('click', (e) => {
            if (e.target === modal) this.closeModal();
        });
    }

    showNotifications() {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Bildirishnomalar</h2>
                    <button class="modal-close">✕</button>
                </div>
                <div class="modal-body">
                    <div class="notification-item">
                        <div class="notification-icon">✅</div>
                        <div class="notification-content">
                            <div class="notification-title">E'lon tasdiqlandi</div>
                            <div class="notification-text">Sizning "3-xonali kvartira" e'loningiz tasdiqlandi</div>
                            <div class="notification-time">2 soat oldin</div>
                        </div>
                    </div>
                    <div class="notification-item">
                        <div class="notification-icon">👀</div>
                        <div class="notification-content">
                            <div class="notification-title">Yangi ko'rish</div>
                            <div class="notification-text">E'loningizni 5 kishi ko'rdi</div>
                            <div class="notification-time">1 kun oldin</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        this.currentModal = modal;
        
        modal.querySelector('.modal-close').addEventListener('click', () => this.closeModal());
        modal.addEventListener('click', (e) => {
            if (e.target === modal) this.closeModal();
        });
    }

    showStats() {
        const container = document.getElementById('listingsGrid');
        const totalListings = this.listings.length;
        const saleListings = this.listings.filter(l => l.type === 'sale').length;
        const rentListings = this.listings.filter(l => l.type === 'rent').length;
        const totalViews = this.listings.reduce((sum, l) => sum + (l.views || 0), 0);
        
        container.innerHTML = `
            <div class="stats-page">
                <h3>Platform statistikasi</h3>
                
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-icon">🏠</div>
                        <div class="stat-number">${totalListings}</div>
                        <div class="stat-label">Jami e'lonlar</div>
                    </div>
                    
                    <div class="stat-card">
                        <div class="stat-icon">💰</div>
                        <div class="stat-number">${saleListings}</div>
                        <div class="stat-label">Sotish</div>
                    </div>
                    
                    <div class="stat-card">
                        <div class="stat-icon">🏡</div>
                        <div class="stat-number">${rentListings}</div>
                        <div class="stat-label">Ijara</div>
                    </div>
                    
                    <div class="stat-card">
                        <div class="stat-icon">👀</div>
                        <div class="stat-number">${totalViews}</div>
                        <div class="stat-label">Ko'rishlar</div>
                    </div>
                </div>
                
                <div class="chart-container">
                    <h4>Oxirgi 7 kun</h4>
                    <div class="simple-chart">
                        <div class="chart-bar" style="height: 60%">Dush</div>
                        <div class="chart-bar" style="height: 80%">Sesh</div>
                        <div class="chart-bar" style="height: 40%">Chor</div>
                        <div class="chart-bar" style="height: 90%">Pay</div>
                        <div class="chart-bar" style="height: 70%">Jum</div>
                        <div class="chart-bar" style="height: 50%">Shan</div>
                        <div class="chart-bar" style="height: 30%">Yak</div>
                    </div>
                </div>
            </div>
        `;
    }

    showAbout() {
        const container = document.getElementById('listingsGrid');
        container.innerHTML = `
            <div class="about-page">
                <div class="about-header">
                    <div class="about-logo">🏠</div>
                    <h2>Sara Uylar</h2>
                    <p>Versiya 1.0.0</p>
                </div>
                
                <div class="about-content">
                    <h3>Dastur haqida</h3>
                    <p>Sara Uylar - O'zbekistondagi eng yaxshi ko'chmas mulk platformasi. Uy, kvartira va tijorat binolarini oson topish va sotish uchun yaratilgan.</p>
                    
                    <h3>Xususiyatlar</h3>
                    <ul>
                        <li>✅ Tezkor qidiruv</li>
                        <li>✅ Sevimlilar tizimi</li>
                        <li>✅ Telegram integratsiyasi</li>
                        <li>✅ Zamonaviy dizayn</li>
                        <li>✅ Mobil qurilmalar uchun</li>
                    </ul>
                    
                    <h3>Bog'lanish</h3>
                    <p>Telegram: @SaraUylarBot</p>
                    <p>Sayt: sarauylar.bigsaver.ru</p>
                </div>
            </div>
        `;
    }

    showHelp() {
        const container = document.getElementById('listingsGrid');
        container.innerHTML = `
            <div class="help-page">
                <h3>Yordam</h3>
                
                <div class="help-section">
                    <h4>🔍 Qidiruv</h4>
                    <p>E'lonlarni nom, joylashuv yoki tavsif bo'yicha qidiring. Kengaytirilgan qidiruv uchun "Qidiruv" bo'limiga o'ting.</p>
                </div>
                
                <div class="help-section">
                    <h4>❤️ Sevimlilar</h4>
                    <p>Yoqgan e'lonlarni sevimlilar ro'yxatiga qo'shish uchun yurak belgisini bosing.</p>
                </div>
                
                <div class="help-section">
                    <h4>➕ E'lon qo'shish</h4>
                    <p>Yangi e'lon qo'shish uchun "+" tugmasini bosing yoki Telegram botdan foydalaning.</p>
                </div>
                
                <div class="help-section">
                    <h4>📞 Bog'lanish</h4>
                    <p>E'lon egasi bilan bog'lanish uchun "Bog'lanish" tugmasini bosing.</p>
                </div>
                
                <div class="help-section">
                    <h4>📤 Ulashish</h4>
                    <p>E'lonni do'stlaringiz bilan ulashish uchun ulashish tugmasini bosing.</p>
                </div>
            </div>
        `;
    }

    closeModal() {
        if (this.currentModal) {
            document.body.removeChild(this.currentModal);
            this.currentModal = null;
        }
    }

    showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.classList.add('show');
        }, 100);
        
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                if (document.body.contains(toast)) {
                    document.body.removeChild(toast);
                }
            }, 300);
        }, 3000);
    }

    getSampleListings() {
        return [
            {
                id: '1',
                title: '3-xonali kvartira Chilonzorda',
                description: 'Yangi qurilgan binoda, barcha qulayliklar bilan',
                price: 85000000,
                type: 'sale',
                category: 'apartment',
                location: 'Chilonzor tumani, Toshkent',
                rooms: 3,
                area: 75,
                floor: 5,
                phone: '+998901234567',
                image: 'images/apartment1.jpg',
                created_at: new Date().toISOString()
            },
            {
                id: '2',
                title: 'Hovli uy Sergeli tumani',
                description: 'Katta hovli, meva daraxtlari bilan',
                price: 2500000,
                type: 'rent',
                category: 'house',
                location: 'Sergeli tumani, Toshkent',
                rooms: 4,
                area: 120,
                phone: '+998901234568',
                image: 'images/house1.jpg',
                created_at: new Date(Date.now() - 86400000).toISOString()
            },
            {
                id: '3',
                title: 'Tijorat binosi Amir Temur ko\'chasi',
                description: 'Shahar markazida joylashgan ofis binosi',
                price: 150000000,
                type: 'sale',
                category: 'commercial',
                location: 'Amir Temur ko\'chasi, Toshkent',
                area: 200,
                floor: 2,
                phone: '+998901234569',
                image: 'images/commercial1.jpg',
                created_at: new Date(Date.now() - 172800000).toISOString()
            }
        ];
    }

    getEmptyState() {
        return `
            <div class="empty-state">
                <div class="empty-state-icon">🏠</div>
                <h3>E'lonlar topilmadi</h3>
                <p>Qidiruv shartlaringizni o'zgartiring yoki yangi e'lon qo'shing</p>
            </div>
        `;
    }
}

// Initialize app
const app = new ModernRealEstateApp();