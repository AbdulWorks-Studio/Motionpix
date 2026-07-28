// ================= Setup =================
const searchInput = document.querySelector('.search-bar input');
const filterChips = document.querySelectorAll('.filter-chip');
const grid = document.querySelector('.grid-container');
const noResults = document.querySelector('.no-results');
const backToTop = document.querySelector('.back-to-top');

const navToggle = document.getElementById('navToggle');
const navLinks = document.getElementById('navLinks');
const sortButtons = document.querySelectorAll('.nav-btn[data-sort]');
const collectionsBtn = document.querySelector('.nav-btn[data-action="collections"]');
const filterBar = document.querySelector('.filter-bar');
const favoritesBtn = document.getElementById('favoritesBtn');

const FAVORITES_KEY = 'motionpix-favorites';

let activeCategory = 'all';
let showingFavoritesOnly = false;

// ================= Build cards from wallpapers.js =================
function createCardElement(w) {
    const card = document.createElement('div');
    card.className = 'card';
    card.dataset.category = w.category;
    card.dataset.id = w.id;
    card.dataset.type = w.type;
    card.dataset.date = w.date;
    card.dataset.downloads = w.downloads;
    card.dataset.full = w.full;
    card.dataset.zip = w.zip;

    const mediaHTML = w.type === 'image'
        ? `<img src="${w.full}" class="card-media" alt="${w.title} wallpaper preview">`
        : `<video muted loop playsinline preload="metadata" class="card-media" aria-label="${w.title} live wallpaper preview">
               <source src="${w.full}" type="video/mp4">
           </video>`;

    card.innerHTML = `
        ${mediaHTML}
        <button class="preview-btn" aria-label="Preview ${w.title} wallpaper"><i class="fas fa-expand"></i></button>
        <button class="heart-btn" aria-label="Save ${w.title} to favorites"><i class="fas fa-heart"></i></button>
        <a href="${w.zip}" download aria-label="Download ${w.title} wallpaper" class="download-btn">
            <i class="fas fa-download"></i>
        </a>
        <p>${w.title}</p>
    `;
    return card;
}

function renderWallpapers() {
    grid.innerHTML = '';
    wallpapersData.forEach(w => grid.appendChild(createCardElement(w)));
}

renderWallpapers();
sortCards('recent'); // matches the "Recent" nav button being active by default

function cards() {
    // Re-query each time since Random/Recent/Popular reorder the DOM
    return Array.from(document.querySelectorAll('.card'));
}

// ================= Favorites (persisted in localStorage) =================
function getFavorites() {
    try {
        return JSON.parse(localStorage.getItem(FAVORITES_KEY)) || [];
    } catch {
        return [];
    }
}

function toggleFavorite(id) {
    let favs = getFavorites();
    if (favs.includes(id)) {
        favs = favs.filter(f => f !== id);
    } else {
        favs.push(id);
    }
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favs));
    return favs;
}

function paintFavoriteHearts() {
    const favs = getFavorites();
    cards().forEach(card => {
        const heart = card.querySelector('.heart-btn');
        if (!heart) return;
        heart.classList.toggle('is-favorited', favs.includes(card.dataset.id));
    });
}

document.addEventListener('click', (e) => {
    const heartBtn = e.target.closest('.heart-btn');
    if (!heartBtn) return;
    const card = heartBtn.closest('.card');
    toggleFavorite(card.dataset.id);
    paintFavoriteHearts();
    if (showingFavoritesOnly) applyFilters();
});

// ================= Combined filter: search + category + favorites =================
function applyFilters() {
    const query = searchInput.value.trim().toLowerCase();
    const favs = getFavorites();
    let visibleCount = 0;

    cards().forEach(card => {
        const title = card.querySelector('p').innerText.toLowerCase();
        const category = card.dataset.category || 'all';

        const matchesSearch = title.includes(query);
        const matchesCategory = activeCategory === 'all' || category === activeCategory;
        const matchesFavorites = !showingFavoritesOnly || favs.includes(card.dataset.id);
        const show = matchesSearch && matchesCategory && matchesFavorites;

        card.style.display = show ? '' : 'none';
        if (show) visibleCount++;
    });

    noResults.classList.toggle('show', visibleCount === 0);
    noResults.textContent = showingFavoritesOnly && visibleCount === 0
        ? "You haven't saved any favorites yet — tap the heart on a wallpaper to save it here."
        : 'No wallpapers match your search. Try a different keyword or category.';
}

function debounce(fn, delay = 150) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
    };
}

searchInput.addEventListener('keyup', debounce(applyFilters, 150));

// ================= Category chips =================
filterChips.forEach(chip => {
    chip.addEventListener('click', () => {
        filterChips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        activeCategory = chip.dataset.filter;
        applyFilters();
    });
});

// ================= Mobile hamburger menu =================
navToggle.addEventListener('click', () => {
    const isOpen = navLinks.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', isOpen);
});

// ================= Recent / Popular / Random sorting =================
function sortCards(mode) {
    const list = cards();

    if (mode === 'recent') {
        list.sort((a, b) => new Date(b.dataset.date) - new Date(a.dataset.date));
    } else if (mode === 'popular') {
        list.sort((a, b) => Number(b.dataset.downloads || 0) - Number(a.dataset.downloads || 0));
    } else if (mode === 'random') {
        for (let i = list.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [list[i], list[j]] = [list[j], list[i]];
        }
    }

    list.forEach(card => grid.appendChild(card));
}

sortButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        sortButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        sortCards(btn.dataset.sort);
    });
});

// ================= Collections: jump to the category chips =================
collectionsBtn.addEventListener('click', () => {
    filterBar.scrollIntoView({ behavior: 'smooth', block: 'center' });
    filterBar.classList.add('pulse');
    setTimeout(() => filterBar.classList.remove('pulse'), 900);
});

// ================= Favorites toggle in the nav =================
favoritesBtn.addEventListener('click', () => {
    showingFavoritesOnly = !showingFavoritesOnly;
    favoritesBtn.classList.toggle('favorites-on', showingFavoritesOnly);
    applyFilters();
});

// ================= Hover play/pause (desktop) + visible-card autoplay (mobile) =================
const isTouchDevice = window.matchMedia('(hover: none)').matches;

function wireVideoPlayback() {
    document.querySelectorAll('.card-media').forEach(video => {
        const card = video.closest('.card');
        if (card.dataset.wired) return; // avoid double-binding after reorders
        card.dataset.wired = 'true';

        if (!isTouchDevice) {
            card.addEventListener('mouseenter', () => video.play());
            card.addEventListener('mouseleave', () => {
                video.pause();
                video.currentTime = 0;
            });
        }
    });
}
wireVideoPlayback();

if (isTouchDevice) {
    const playObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const video = entry.target.querySelector('.card-media');
            if (!video) return;
            if (entry.isIntersecting) {
                video.play().catch(() => {});
            } else {
                video.pause();
            }
        });
    }, { threshold: 0.6 });

    cards().forEach(card => playObserver.observe(card));
}

// ================= Reveal cards on scroll (staggered) =================
const revealObserver = new IntersectionObserver((entries, obs) => {
    entries.forEach((entry, i) => {
        if (entry.isIntersecting) {
            entry.target.style.animationDelay = `${(i % 6) * 60}ms`;
            entry.target.classList.add('in-view');
            obs.unobserve(entry.target);
        }
    });
}, { threshold: 0.1 });

cards().forEach(card => revealObserver.observe(card));

// ================= Back to top =================
window.addEventListener('scroll', () => {
    backToTop.classList.toggle('show', window.scrollY > 500);
});

backToTop.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
});

// ================= Preview Modal + Related Wallpapers =================
const previewModal = document.getElementById('previewModal');
const previewVideo = document.getElementById('previewVideo');
const previewImage = document.getElementById('previewImage');
const previewTitle = document.getElementById('previewTitle');
const previewDownload = document.getElementById('previewDownload');
const relatedGrid = document.getElementById('relatedGrid');

let lastFocusedEl = null;

function getCardData(card) {
    return {
        id: card.dataset.id,
        title: card.querySelector('p').innerText,
        category: card.dataset.category,
        type: card.dataset.type || 'video',
        full: card.dataset.full,
        zip: card.dataset.zip
    };
}

function buildRelated(currentId, category) {
    relatedGrid.innerHTML = '';
    const related = cards().filter(c => c.dataset.category === category && c.dataset.id !== currentId);

    if (related.length === 0) {
        relatedGrid.innerHTML = '<p class="related-empty">No other wallpapers in this collection yet.</p>';
        return;
    }

    related.forEach(card => {
        const data = getCardData(card);
        const item = document.createElement('div');
        item.className = 'related-item';
        item.innerHTML = data.type === 'image'
            ? `<img src="${data.full}" alt="${data.title}"><span>${data.title}</span>`
            : `<video src="${data.full}" muted loop playsinline preload="metadata"></video><span>${data.title}</span>`;

        item.addEventListener('mouseenter', () => {
            const v = item.querySelector('video');
            if (v) v.play();
        });
        item.addEventListener('mouseleave', () => {
            const v = item.querySelector('video');
            if (v) { v.pause(); v.currentTime = 0; }
        });
        item.addEventListener('click', () => openPreview(data.id));

        relatedGrid.appendChild(item);
    });
}

function openPreview(id) {
    const card = cards().find(c => c.dataset.id === id);
    if (!card) return;
    const data = getCardData(card);

    previewTitle.textContent = data.title;
    previewDownload.href = data.zip;

    if (data.type === 'image') {
        previewVideo.pause();
        previewVideo.style.display = 'none';
        previewImage.style.display = 'block';
        previewImage.src = data.full;
        previewImage.alt = data.title;
    } else {
        previewImage.style.display = 'none';
        previewVideo.style.display = 'block';
        previewVideo.src = data.full;
        previewVideo.play().catch(() => {});
    }

    buildRelated(data.id, data.category);

    if (!previewModal.classList.contains('open')) {
        lastFocusedEl = document.activeElement;
        previewModal.classList.add('open');
        previewModal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
        document.querySelector('.preview-close').focus();
    } else {
        // Switching to a related wallpaper: just scroll the panel back to the top
        document.querySelector('.preview-content').scrollTo({ top: 0, behavior: 'smooth' });
    }
}

function closePreview() {
    previewModal.classList.remove('open');
    previewModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    previewVideo.pause();
    previewVideo.removeAttribute('src');
    if (lastFocusedEl) lastFocusedEl.focus();
}

document.addEventListener('click', (e) => {
    const trigger = e.target.closest('.preview-btn');
    if (trigger) {
        const card = trigger.closest('.card');
        openPreview(card.dataset.id);
        return;
    }
    if (e.target.closest('[data-close]')) closePreview();
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && previewModal.classList.contains('open')) closePreview();
});

// ================= Init =================
paintFavoriteHearts();
