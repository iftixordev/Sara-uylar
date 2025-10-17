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
            // Show add listing form
            this.showAddListingForm();
        }
    }

    navigateTo(page) {
        // Update active nav item
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.page === page);
        });

        // Handle navigation
        switch (page) {
            case 'home':
                this.currentFilter = 'all';
                this.setActiveFilter('all');
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
                document.body.removeChild(toast);
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