/**
 * Marvel Cinematic Universe Movies Hub - Core Application Logic
 */

(function () {
  'use strict';

  // --- LOCAL STORAGE KEYS ---
  const STORAGE_KEYS = {
    TEMPLATE: 'mcu_streaming_template',
    CUSTOM_LINKS: 'mcu_custom_links',
    WATCHED: 'mcu_watched_movies',
    SORT_PREF: 'mcu_sort_pref'
  };

  // Default fallback streaming URL (CineHD direct movie URL)
  const DEFAULT_TEMPLATE = 'https://cinehd.vc/movie/{tmdb_id}';

  // State
  let currentPhase = 'all';
  let searchQuery = '';
  let currentSort = 'release-asc';
  let activeEditingMovieId = null;

  // Auto-heal on startup: clear any legacy or broken template saved in browser storage
  (function sanitizeStorage() {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.TEMPLATE);
      if (saved && (saved.includes('cinehd.vc/home') || saved.includes('disneyplus.com') || saved.includes('/home/search') || !saved.includes('{tmdb_id}'))) {
        localStorage.setItem(STORAGE_KEYS.TEMPLATE, DEFAULT_TEMPLATE);
      }
    } catch (e) {
      // Storage unavailable
    }
  })();

  // Retrieve storage state
  function getStreamingTemplate() {
    let saved = localStorage.getItem(STORAGE_KEYS.TEMPLATE);
    if (saved && (saved.includes('cinehd.vc/home') || saved.includes('/home/search') || saved.includes('disneyplus.com'))) {
      saved = DEFAULT_TEMPLATE;
      localStorage.setItem(STORAGE_KEYS.TEMPLATE, DEFAULT_TEMPLATE);
    }
    return saved || DEFAULT_TEMPLATE;
  }

  function setStreamingTemplate(tpl) {
    let clean = (tpl || '').trim();
    if (clean.includes('cinehd.vc/home') || clean.includes('/home/search')) {
      clean = DEFAULT_TEMPLATE;
    }
    localStorage.setItem(STORAGE_KEYS.TEMPLATE, clean);
  }

  function getCustomLinks() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.CUSTOM_LINKS) || '{}');
    } catch {
      return {};
    }
  }

  function setCustomLink(movieId, url) {
    const links = getCustomLinks();
    if (url && url.trim()) {
      links[movieId] = url.trim();
    } else {
      delete links[movieId];
    }
    localStorage.setItem(STORAGE_KEYS.CUSTOM_LINKS, JSON.stringify(links));
  }

  function getWatchedMovies() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.WATCHED) || '[]');
    } catch {
      return [];
    }
  }

  function toggleWatched(movieId) {
    const watched = getWatchedMovies();
    const index = watched.indexOf(movieId);
    let isNowWatched = false;
    if (index > -1) {
      watched.splice(index, 1);
      isNowWatched = false;
    } else {
      watched.push(movieId);
      isNowWatched = true;
    }
    localStorage.setItem(STORAGE_KEYS.WATCHED, JSON.stringify(watched));
    render();
    updateStats();
    showToast(isNowWatched ? 'Marked as watched!' : 'Removed from watched list');
  }

  // Generate the actual watch link for a movie
  function resolveWatchUrl(movie) {
    const customLinks = getCustomLinks();
    if (customLinks[movie.id]) {
      return { url: customLinks[movie.id], isCustom: true };
    }

    const template = getStreamingTemplate();
    const encodedTitle = encodeURIComponent(movie.title);
    const cleanTitle = movie.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const tmdbId = movie.tmdbId ? String(movie.tmdbId) : '';

    let finalUrl = template
      .replace(/{tmdb_id}/g, tmdbId)
      .replace(/{id}/g, tmdbId)
      .replace(/{title}/g, encodedTitle)
      .replace(/{year}/g, movie.releaseYear)
      .replace(/{clean_title}/g, cleanTitle);

    // Auto-fix any invalid CineHD URL structure
    if (finalUrl.includes('cinehd.vc/home/search') || finalUrl.includes('cinehd.vc/home')) {
      finalUrl = tmdbId ? `https://cinehd.vc/movie/${tmdbId}` : `https://cinehd.vc/search?query=${encodedTitle}`;
    } else if (template.includes('{tmdb_id}') && !tmdbId) {
      finalUrl = `https://cinehd.vc/search?query=${encodedTitle}`;
    }

    return { url: finalUrl, isCustom: false };
  }

  // Format date nicely (e.g. May 2, 2008)
  function formatDate(dateStr) {
    if (!dateStr) return 'TBA';
    const [year, month, day] = dateStr.split('-');
    if (!month || !day) return year;
    const date = new Date(year, parseInt(month, 10) - 1, day);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  // Toast notification
  function showToast(message) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => {
      toast.classList.remove('show');
    }, 3000);
  }

  // Render Stats & Progress
  function updateStats() {
    const watched = getWatchedMovies();
    const total = MCU_MOVIES.length;
    const count = watched.length;
    const percent = Math.round((count / total) * 100);

    const totalMoviesCountEl = document.getElementById('total-movies-count');
    const watchedCountEl = document.getElementById('watched-count');
    const progressFillEl = document.getElementById('progress-fill');
    const progressPercentEl = document.getElementById('progress-percent');

    if (totalMoviesCountEl) totalMoviesCountEl.textContent = total;
    if (watchedCountEl) watchedCountEl.textContent = `${count} / ${total}`;
    if (progressFillEl) progressFillEl.style.width = `${percent}%`;
    if (progressPercentEl) progressPercentEl.textContent = `${percent}%`;
  }

  // Filter & Sort Movies
  function getFilteredAndSortedMovies() {
    return MCU_MOVIES.filter(movie => {
      // Phase Filter
      if (currentPhase !== 'all' && movie.phase !== parseInt(currentPhase, 10)) {
        return false;
      }
      // Search Query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchTitle = movie.title.toLowerCase().includes(query);
        const matchDirector = movie.director.toLowerCase().includes(query);
        const matchOverview = movie.overview.toLowerCase().includes(query);
        const matchYear = String(movie.releaseYear).includes(query);
        return matchTitle || matchDirector || matchOverview || matchYear;
      }
      return true;
    }).sort((a, b) => {
      if (currentSort === 'release-asc') return a.order - b.order;
      if (currentSort === 'release-desc') return b.order - a.order;
      if (currentSort === 'title-asc') return a.title.localeCompare(b.title);
      return 0;
    });
  }

  // Render Movie Cards Grid
  function render() {
    const grid = document.getElementById('movie-grid');
    if (!grid) return;

    const movies = getFilteredAndSortedMovies();
    const watched = getWatchedMovies();

    if (movies.length === 0) {
      grid.innerHTML = `
        <div class="empty-state">
          <h3>No Marvel movies found</h3>
          <p>Try adjusting your search query or phase filter.</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = movies.map(movie => {
      const isWatched = watched.includes(movie.id);
      const { url: watchUrl, isCustom } = resolveWatchUrl(movie);
      const displayDate = formatDate(movie.releaseDate);

              const badgeLabel = isCustom ? 'Custom Link' : (watchUrl.includes('cinehd.vc') ? 'CineHD Direct' : 'Auto Search');
              const badgeClass = isCustom ? 'custom' : (watchUrl.includes('cinehd.vc') ? 'cinehd' : '');
              return `
        <article class="movie-card ${isWatched ? 'watched' : ''}" data-id="${movie.id}">
          <div class="poster-wrap" onclick="window.open('${watchUrl}', '_blank')" title="Watch ${movie.title} on CineHD">
            <img 
              class="poster-img" 
              src="${movie.poster}" 
              alt="${movie.title} poster"
              loading="lazy"
              onerror="this.onerror=null; this.src='marvel.png';"
            />
            <span class="order-badge">#${movie.order}</span>
            <span class="phase-pill">Phase ${movie.phase}</span>
            <div class="poster-overlay">
              <span class="play-action-hint">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z"/>
                </svg>
                Watch on CineHD
              </span>
            </div>
          </div>

          <div class="card-content">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 0.5rem;">
              <a 
                href="${watchUrl}" 
                target="_blank" 
                rel="noopener noreferrer" 
                class="movie-title" 
                title="Click to open ${movie.title} on CineHD"
              >
                ${movie.title}
              </a>
              <span class="link-status-badge ${badgeClass}" title="${isCustom ? 'Custom direct URL active' : (watchUrl.includes('cinehd.vc') ? 'Direct CineHD link' : 'Global search URL')}">
                ${badgeLabel}
              </span>
            </div>

            <div class="meta-row">
              <span class="meta-item">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
                ${displayDate}
              </span>
              <span>•</span>
              <span class="meta-item">${movie.duration}</span>
              <span>•</span>
              <span class="meta-item">${movie.director}</span>
            </div>

            <p class="overview-text">${movie.overview}</p>

            <div class="card-actions">
              <a 
                href="${watchUrl}" 
                target="_blank" 
                rel="noopener noreferrer" 
                class="btn-watch"
                title="Watch ${movie.title} on your streaming website"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z"/>
                </svg>
                Watch Now
              </a>

              <button 
                class="btn-icon edit-link-btn" 
                data-id="${movie.id}" 
                title="Edit custom watch link for ${movie.title}"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 20h9"></path>
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                </svg>
              </button>

              <button 
                class="btn-icon toggle-watched-btn ${isWatched ? 'active-check' : ''}" 
                data-id="${movie.id}" 
                title="${isWatched ? 'Mark as unwatched' : 'Mark as watched'}"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </button>
            </div>
          </div>
        </article>
      `;
    }).join('');

    // Attach event listeners to card action buttons
    grid.querySelectorAll('.toggle-watched-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleWatched(btn.dataset.id);
      });
    });

    grid.querySelectorAll('.edit-link-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        openEditLinkModal(btn.dataset.id);
      });
    });
  }

  // --- MODAL CONTROLS ---
  function openSettingsModal() {
    const modal = document.getElementById('settings-modal');
    const input = document.getElementById('template-url-input');
    if (modal && input) {
      input.value = getStreamingTemplate();
      updateTemplatePreview();
      modal.classList.add('open');
    }
  }

  function closeSettingsModal() {
    const modal = document.getElementById('settings-modal');
    if (modal) modal.classList.remove('open');
  }

  function updateTemplatePreview() {
    const input = document.getElementById('template-url-input');
    const preview = document.getElementById('template-preview');
    if (!input || !preview) return;
    const val = input.value.trim() || DEFAULT_TEMPLATE;
    const sample = val
      .replace(/{tmdb_id}/g, '1726')
      .replace(/{id}/g, '1726')
      .replace(/{title}/g, encodeURIComponent('Iron Man'))
      .replace(/{year}/g, '2008');
    preview.textContent = sample;
  }

  function openEditLinkModal(movieId) {
    const movie = MCU_MOVIES.find(m => m.id === movieId);
    if (!movie) return;

    activeEditingMovieId = movieId;
    const modal = document.getElementById('edit-link-modal');
    const movieTitleEl = document.getElementById('edit-movie-title');
    const input = document.getElementById('movie-custom-url-input');
    const defaultPreviewEl = document.getElementById('edit-default-preview');

    if (modal && input) {
      movieTitleEl.textContent = `Set Custom URL: ${movie.title}`;
      const customLinks = getCustomLinks();
      input.value = customLinks[movieId] || '';

      const { url: autoUrl } = resolveWatchUrl({ ...movie, customUrl: '' });
      if (defaultPreviewEl) {
        defaultPreviewEl.textContent = customLinks[movieId] ? 'Overrides auto-search URL' : `Default Auto-Search: ${autoUrl}`;
      }
      modal.classList.add('open');
      input.focus();
    }
  }

  function closeEditLinkModal() {
    const modal = document.getElementById('edit-link-modal');
    if (modal) modal.classList.remove('open');
    activeEditingMovieId = null;
  }

  // --- INITIALIZATION ---
  function init() {
    // Phase tabs
    const phaseTabs = document.querySelectorAll('.phase-tab');
    phaseTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        phaseTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        currentPhase = tab.dataset.phase;
        render();
      });
    });

    // Search input
    const searchInput = document.getElementById('search-input');
    const clearSearchBtn = document.getElementById('clear-search-btn');

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        if (clearSearchBtn) {
          clearSearchBtn.classList.toggle('active', searchQuery.length > 0);
        }
        render();
      });
    }

    if (clearSearchBtn) {
      clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        searchQuery = '';
        clearSearchBtn.classList.remove('active');
        searchInput.focus();
        render();
      });
    }

    // Sort control
    const sortSelect = document.getElementById('sort-select');
    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        currentSort = e.target.value;
        render();
      });
    }

    // Settings Modal triggers
    const settingsBtn = document.getElementById('open-settings-btn');
    const closeSettingsBtn = document.getElementById('close-settings-btn');
    const saveSettingsBtn = document.getElementById('save-settings-btn');
    const settingsModal = document.getElementById('settings-modal');
    const templateInput = document.getElementById('template-url-input');

    if (settingsBtn) settingsBtn.addEventListener('click', openSettingsModal);
    if (closeSettingsBtn) closeSettingsBtn.addEventListener('click', closeSettingsModal);
    if (settingsModal) {
      settingsModal.addEventListener('click', (e) => {
        if (e.target === settingsModal) closeSettingsModal();
      });
    }

    if (templateInput) {
      templateInput.addEventListener('input', updateTemplatePreview);
    }

    // Streaming service presets
    document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const pattern = btn.dataset.pattern;
        if (templateInput && pattern) {
          templateInput.value = pattern;
          updateTemplatePreview();
        }
      });
    });

    if (saveSettingsBtn) {
      saveSettingsBtn.addEventListener('click', () => {
        if (templateInput) {
          setStreamingTemplate(templateInput.value);
          render();
          closeSettingsModal();
          showToast('Streaming service template updated!');
        }
      });
    }

    // Test URL button
    const testTemplateBtn = document.getElementById('test-template-btn');
    if (testTemplateBtn) {
      testTemplateBtn.addEventListener('click', () => {
        const val = templateInput ? templateInput.value.trim() : DEFAULT_TEMPLATE;
        const testUrl = val
          .replace(/{tmdb_id}/g, '1726')
          .replace(/{id}/g, '1726')
          .replace(/{title}/g, encodeURIComponent('Iron Man'))
          .replace(/{year}/g, '2008');
        window.open(testUrl, '_blank');
      });
    }

    // Edit Custom Link Modal triggers
    const closeEditModalBtn = document.getElementById('close-edit-modal-btn');
    const saveEditLinkBtn = document.getElementById('save-edit-link-btn');
    const clearEditLinkBtn = document.getElementById('clear-edit-link-btn');
    const editModal = document.getElementById('edit-link-modal');
    const customUrlInput = document.getElementById('movie-custom-url-input');

    if (closeEditModalBtn) closeEditModalBtn.addEventListener('click', closeEditLinkModal);
    if (editModal) {
      editModal.addEventListener('click', (e) => {
        if (e.target === editModal) closeEditLinkModal();
      });
    }

    if (saveEditLinkBtn) {
      saveEditLinkBtn.addEventListener('click', () => {
        if (activeEditingMovieId && customUrlInput) {
          setCustomLink(activeEditingMovieId, customUrlInput.value);
          render();
          closeEditLinkModal();
          showToast('Custom movie link saved!');
        }
      });
    }

    if (clearEditLinkBtn) {
      clearEditLinkBtn.addEventListener('click', () => {
        if (activeEditingMovieId) {
          setCustomLink(activeEditingMovieId, '');
          render();
          closeEditLinkModal();
          showToast('Reverted to default search link.');
        }
      });
    }

    // Restore CineHD Defaults button in Settings
    const resetToCinehdBtn = document.getElementById('reset-to-cinehd-btn');
    if (resetToCinehdBtn) {
      resetToCinehdBtn.addEventListener('click', () => {
        setStreamingTemplate(DEFAULT_TEMPLATE);
        if (templateInput) {
          templateInput.value = DEFAULT_TEMPLATE;
          updateTemplatePreview();
        }
        render();
        closeSettingsModal();
        showToast('Restored official CineHD direct links!');
      });
    }

    // Reset All Custom Links button in Settings
    const resetCustomLinksBtn = document.getElementById('reset-all-custom-links-btn');
    if (resetCustomLinksBtn) {
      resetCustomLinksBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to remove all custom links and revert to the auto-search template?')) {
          localStorage.removeItem(STORAGE_KEYS.CUSTOM_LINKS);
          render();
          closeSettingsModal();
          showToast('All custom links cleared.');
        }
      });
    }

    // Reset Watched History button in Settings
    const resetWatchedBtn = document.getElementById('reset-watched-btn');
    if (resetWatchedBtn) {
      resetWatchedBtn.addEventListener('click', () => {
        if (confirm('Reset your watched movies tracker?')) {
          localStorage.removeItem(STORAGE_KEYS.WATCHED);
          render();
          updateStats();
          closeSettingsModal();
          showToast('Watched tracker reset.');
        }
      });
    }

    // Keyboard ESC to close modals
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeSettingsModal();
        closeEditLinkModal();
      }
    });

    // Initial render
    updateStats();
    render();
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
