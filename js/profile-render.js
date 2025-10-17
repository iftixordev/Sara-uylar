// Profile render method
async renderProfile() {
  const user = this.tg?.initDataUnsafe?.user || { first_name: 'User', id: 123456789 };
  
  return `
    <div class="md-top-app-bar">
      <button class="md-icon-button" onclick="history.back()">←</button>
      <h1 class="title-large">👤 Profil</h1>
    </div>
    
    <div class="p-16">
      <div class="md-card text-center mb-16">
        <div class="user-avatar-large" id="profileAvatar">
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