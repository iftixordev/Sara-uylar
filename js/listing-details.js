// Enhanced listing details render
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

  // Add to view history
  this.addToViewHistory(listing);

  return `
    <div class="md-top-app-bar">
      <button class="md-icon-button" onclick="history.back()">←</button>
      <h1 class="title-large">E'lon</h1>
      <div class="flex gap-8">
        <button class="md-icon-button" data-favorite="${listing.id}">
          ${this.favorites.includes(listing.id) ? '❤️' : '🤍'}
        </button>
        <button class="md-icon-button" onclick="app.shareListing(${listing.id}, '${listing.title}')">📤</button>
      </div>
    </div>
    
    <div class="p-16">
      ${listing.images && listing.images.length > 0 ? `
        <div class="listing-gallery" id="gallery">
          <img src="${listing.images[0]}" alt="${listing.title}" id="galleryImage">
          ${listing.images.length > 1 ? `
            <div class="gallery-counter">
              <span id="currentImage">1</span>/${listing.images.length}
            </div>
            <div class="gallery-nav">
              ${listing.images.map((_, index) => `
                <div class="gallery-dot ${index === 0 ? 'active' : ''}" 
                     onclick="app.showGalleryImage(${index})"></div>
              `).join('')}
            </div>
          ` : ''}
        </div>
      ` : ''}
      
      <div class="md-elevated-card mb-16">
        <div class="flex justify-between items-start mb-16">
          <div class="flex-1">
            <h1 class="headline-small mb-8">${listing.title}</h1>
            <div class="property-type">${listing.property_type}</div>
          </div>
          <div class="price-badge">$${Number(listing.price).toLocaleString()}</div>
        </div>
        
        <div class="stats-grid">
          <div class="stat-item">
            <div class="stat-value">${listing.rooms}</div>
            <div class="stat-label">Xonalar</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${listing.area}</div>
            <div class="stat-label">m² Maydon</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${listing.views || 0}</div>
            <div class="stat-label">Ko'rishlar</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${this.getListingAge(listing.created_at)}</div>
            <div class="stat-label">Kun oldin</div>
          </div>
        </div>
        
        <div class="mb-16">
          <div class="flex items-center gap-8 mb-8">
            <span style="font-size: 20px;">📍</span>
            <span class="body-large"><strong>Joylashuv:</strong> ${listing.location}</span>
          </div>
          ${listing.phone ? `
            <div class="flex items-center gap-8 mb-8">
              <span style="font-size: 20px;">📞</span>
              <span class="body-large"><strong>Telefon:</strong> ${listing.phone}</span>
            </div>
          ` : ''}
        </div>
        
        ${listing.description ? `
          <div class="mb-16">
            <h3 class="title-medium mb-8">📝 Tavsif</h3>
            <p class="body-large" style="line-height: 1.6;">${listing.description}</p>
          </div>
        ` : ''}
        
        <div class="flex gap-8">
          <button class="contact-btn flex-1" onclick="app.contactOwner(${listing.user_id})">
            💬 Egasi bilan bog'lanish
          </button>
          <button class="md-outlined-button" onclick="app.reportListing(${listing.id})">
            🚨 Shikoyat
          </button>
        </div>
      </div>
      
      ${this.getSimilarListings(listing).length > 0 ? `
        <div class="mb-16">
          <h3 class="title-medium mb-16">🔍 O'xshash e'lonlar</h3>
          <div class="flex gap-16" style="overflow-x: auto; padding-bottom: 8px;">
            ${this.getSimilarListings(listing).map(similar => `
              <div class="md-card cursor-pointer" style="min-width: 200px;" 
                   onclick="app.showPage('listing-${similar.id}')">
                ${similar.images && similar.images[0] ? `
                  <img src="${similar.images[0]}" alt="${similar.title}" 
                       style="width: 100%; height: 120px; object-fit: cover; border-radius: 8px; margin-bottom: 8px;">
                ` : ''}
                <h4 class="title-small mb-4">${similar.title}</h4>
                <div class="body-small" style="color: var(--md-sys-color-primary);">
                  $${Number(similar.price).toLocaleString()}
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}
    </div>
  `;
}

// Helper methods for listing details
addToViewHistory(listing) {
  const history = this.viewHistory.filter(h => h.id !== listing.id);
  history.unshift({
    id: listing.id,
    title: listing.title,
    price: listing.price,
    viewedAt: new Date().toISOString()
  });
  this.viewHistory = history.slice(0, 10); // Keep last 10
  localStorage.setItem('viewHistory', JSON.stringify(this.viewHistory));
}

getListingAge(createdAt) {
  const created = new Date(createdAt);
  const now = new Date();
  const diffTime = Math.abs(now - created);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

getSimilarListings(listing) {
  return this.listings
    .filter(l => 
      l.id !== listing.id && 
      (l.property_type === listing.property_type || 
       l.location.includes(listing.location.split(',')[0]))
    )
    .slice(0, 5);
}

showGalleryImage(index) {
  const listing = this.listings.find(l => l.id == this.currentPage.split('-')[1]);
  if (!listing || !listing.images) return;
  
  const img = document.getElementById('galleryImage');
  const counter = document.getElementById('currentImage');
  const dots = document.querySelectorAll('.gallery-dot');
  
  if (img) img.src = listing.images[index];
  if (counter) counter.textContent = index + 1;
  
  dots.forEach((dot, i) => {
    dot.classList.toggle('active', i === index);
  });
}

contactOwner(userId) {
  this.hapticFeedback('medium');
  if (this.tg) {
    this.tg.openTelegramLink(`https://t.me/SaraUylarbot?start=contact_${userId}`);
  } else {
    window.open(`https://t.me/SaraUylarbot?start=contact_${userId}`, '_blank');
  }
}

reportListing(listingId) {
  this.showSnackbar('Shikoyat yuborildi', 'success');
  // Here you would send report to admin
}

async shareListing(id, title) {
  try {
    const url = `${window.location.origin}#listing-${id}`;
    
    if (navigator.share) {
      await navigator.share({
        title: title,
        text: 'Sara Uylar platformasida e\'lon',
        url: url
      });
    } else {
      await navigator.clipboard.writeText(url);
      this.showSnackbar('Havola nusxalandi', 'success');
    }
    this.hapticFeedback('light');
  } catch (error) {
    console.error('Share error:', error);
  }
}