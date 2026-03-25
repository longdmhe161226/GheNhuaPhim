const API_BASE = 'https://ophim1.com/v1/api';
let CDN_IMAGE = '';
let allMovies = [];
let heroMovies = [];
let currentHeroIndex = 0;
let heroInterval = null;
const sectionState = {};
const SECTIONS = [
    { slug: 'phim-bo', rowId: 'phim-bo-row', paginationId: 'phim-bo-pagination' },
    { slug: 'phim-le', rowId: 'phim-le-row', paginationId: 'phim-le-pagination' },
    { slug: 'hoat-hinh', rowId: 'hoat-hinh-row', paginationId: 'hoat-hinh-pagination' },
    { slug: 'tv-shows', rowId: 'tv-shows-row', paginationId: 'tv-shows-pagination' },
    { slug: 'phim-bo-dang-chieu', rowId: 'phim-bo-dang-chieu-row', paginationId: 'phim-bo-dang-chieu-pagination' },
    { slug: 'phim-sap-chieu', rowId: 'phim-sap-chieu-row', paginationId: 'phim-sap-chieu-pagination' },
];
document.addEventListener('DOMContentLoaded', () => {
    fetchHomeData();
    initNavbar();
    initSearch();
    initModal();
});
async function fetchHomeData() {
    try {
        const res = await fetch(`${API_BASE}/home`);
        const json = await res.json();

        if (json.status !== 'success') throw new Error('API error');

        const data = json.data;
        CDN_IMAGE = data.APP_DOMAIN_CDN_IMAGE;
        allMovies = data.items || [];
        heroMovies = allMovies.slice(0, 8);
        renderHero();
        renderTrendingRow(allMovies.slice(0, 10));
        initScrollButtons();
        for (const section of SECTIONS) {
            fetchSection(section.slug, 1);
        }

        hideLoading();
    } catch (err) {
        console.error('Failed to fetch data:', err);
        hideLoading();
    }
}
async function fetchSection(slug, page = 1) {
    const section = SECTIONS.find(s => s.slug === slug);
    if (!section) return;

    const row = document.getElementById(section.rowId);
    const paginationEl = document.getElementById(section.paginationId);
    row.innerHTML = `<div class="section-loading"><div class="mini-spinner"></div>Đang tải...</div>`;
    paginationEl.innerHTML = '';

    try {
        const res = await fetch(`${API_BASE}/danh-sach/${slug}?page=${page}&limit=24`);
        const json = await res.json();

        if (json.status !== 'success') throw new Error('API error');

        const data = json.data;
        if (data.APP_DOMAIN_CDN_IMAGE) CDN_IMAGE = data.APP_DOMAIN_CDN_IMAGE;

        const items = data.items || [];
        const pagination = data.params?.pagination || {};
        sectionState[slug] = {
            currentPage: pagination.currentPage || page,
            totalPages: pagination.totalPages || Math.ceil((pagination.totalItems || 0) / (pagination.totalItemsPerPage || 24)),
            totalItems: pagination.totalItems || 0,
        };
        renderMovieRow(section.rowId, items);
        renderPagination(slug, section.paginationId);
        initScrollButtonsForSection(document.getElementById(`section-${slug}`));

    } catch (err) {
        console.error(`Failed to fetch ${slug}:`, err);
        row.innerHTML = `<div class="section-loading" style="color: var(--accent-primary);">Không thể tải dữ liệu. <button onclick="fetchSection('${slug}', ${page})" style="color: var(--blue); background: none; border: none; cursor: pointer; text-decoration: underline; font-family: inherit;">Thử lại</button></div>`;
    }
}
function hideLoading() {
    setTimeout(() => {
        document.getElementById('loading-screen').classList.add('hidden');
    }, 600);
}
function initNavbar() {
    const navbar = document.getElementById('navbar');
    window.addEventListener('scroll', () => {
        navbar.classList.toggle('scrolled', window.scrollY > 50);
    });
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
            link.classList.add('active');

            const section = link.dataset.section;
            if (section === 'home') {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            } else {
                const el = document.getElementById(`section-${section}`);
                if (el) {
                    const offset = navbar.offsetHeight + 10;
                    const top = el.getBoundingClientRect().top + window.scrollY - offset;
                    window.scrollTo({ top, behavior: 'smooth' });
                }
            }
        });
    });
}
let searchDebounceTimer = null;
let currentSearchQuery = '';
let dropdownActiveIndex = -1;

function initSearch() {
    const container = document.getElementById('search-container');
    const toggle = document.getElementById('search-toggle');
    const input = document.getElementById('search-input');
    const dropdown = document.getElementById('search-dropdown');

    toggle.addEventListener('click', () => {
        container.classList.toggle('active');
        if (container.classList.contains('active')) {
            input.focus();
        } else {
            hideDropdown();
        }
    });
    input.addEventListener('input', () => {
        clearTimeout(searchDebounceTimer);
        dropdownActiveIndex = -1;
        const query = input.value.trim();

        if (query.length >= 2) {
            showDropdownLoading();
            searchDebounceTimer = setTimeout(() => {
                fetchDropdownResults(query);
            }, 400);
        } else {
            hideDropdown();
        }
    });
    input.addEventListener('keydown', (e) => {
        const items = dropdown.querySelectorAll('.search-dropdown-item');

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (dropdown.classList.contains('visible') && items.length > 0) {
                dropdownActiveIndex = Math.min(dropdownActiveIndex + 1, items.length - 1);
                updateDropdownHighlight(items);
            }
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (dropdown.classList.contains('visible') && items.length > 0) {
                dropdownActiveIndex = Math.max(dropdownActiveIndex - 1, -1);
                updateDropdownHighlight(items);
            }
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (dropdownActiveIndex >= 0 && items[dropdownActiveIndex]) {
                items[dropdownActiveIndex].click();
            } else {
                const query = input.value.trim();
                if (query.length >= 2) {
                    hideDropdown();
                    window.location.href = `search.html?keyword=${encodeURIComponent(query)}`;
                }
            }
        } else if (e.key === 'Escape') {
            hideDropdown();
            container.classList.remove('active');
            input.value = '';
        }
    });
    document.addEventListener('click', (e) => {
        if (!container.contains(e.target)) {
            container.classList.remove('active');
            hideDropdown();
        }
    });
}

async function fetchDropdownResults(keyword) {
    currentSearchQuery = keyword;

    try {
        const res = await fetch(`${API_BASE}/tim-kiem?keyword=${encodeURIComponent(keyword)}&limit=8`);
        const json = await res.json();
        if (currentSearchQuery !== keyword) return;

        if (json.status !== 'success') throw new Error('API error');

        const data = json.data;
        if (data.APP_DOMAIN_CDN_IMAGE) CDN_IMAGE = data.APP_DOMAIN_CDN_IMAGE;

        const items = data.items || [];
        const totalItems = data.params?.pagination?.totalItems || 0;

        renderDropdownResults(keyword, items, totalItems);

    } catch (err) {
        console.error('Dropdown search failed:', err);
        const dropdown = document.getElementById('search-dropdown');
        dropdown.innerHTML = `<div class="search-dropdown-empty">
            <span class="search-dropdown-empty-icon">⚠️</span>
            Tìm kiếm thất bại
        </div>`;
        dropdown.classList.add('visible');
    }
}

function renderDropdownResults(keyword, items, totalItems) {
    const dropdown = document.getElementById('search-dropdown');
    dropdown.innerHTML = '';

    if (items.length === 0) {
        dropdown.innerHTML = `
            <div class="search-dropdown-empty">
                <span class="search-dropdown-empty-icon">🔍</span>
                Không tìm thấy phim nào cho "${keyword}"
            </div>`;
        dropdown.classList.add('visible');
        return;
    }
    const header = document.createElement('div');
    header.className = 'search-dropdown-header';
    header.textContent = `Kết quả (${totalItems.toLocaleString()} phim)`;
    dropdown.appendChild(header);
    items.forEach(movie => {
        const item = document.createElement('div');
        item.className = 'search-dropdown-item';
        item.setAttribute('data-slug', movie.slug);

        const thumbUrl = getImageUrl(movie.thumb_url);
        const year = movie.year || '';
        const lang = movie.lang || '';
        const episode = movie.episode_current || '';
        const country = movie.country?.length ? movie.country[0].name : '';

        item.innerHTML = `
            <img class="search-dropdown-thumb" src="${thumbUrl}" alt="${movie.name}" loading="lazy"
                 onerror="this.style.display='none'">
            <div class="search-dropdown-info">
                <div class="search-dropdown-name">${movie.name}</div>
                <div class="search-dropdown-meta">
                    ${year ? `<span>${year}</span>` : ''}
                    ${lang ? `<span>${lang}</span>` : ''}
                    ${country ? `<span>${country}</span>` : ''}
                    ${episode ? `<span>${episode}</span>` : ''}
                </div>
            </div>
            <span class="search-dropdown-badge">${movie.quality || 'HD'}</span>
        `;

        item.addEventListener('click', () => {
            hideDropdown();
            openModal(movie);
        });

        dropdown.appendChild(item);
    });
    if (totalItems > items.length) {
        const footer = document.createElement('div');
        footer.className = 'search-dropdown-footer';
        footer.innerHTML = `Xem tất cả ${totalItems.toLocaleString()} kết quả →`;
        footer.addEventListener('click', () => {
            hideDropdown();
            window.location.href = `search.html?keyword=${encodeURIComponent(keyword)}`;
        });
        dropdown.appendChild(footer);
    }

    dropdown.classList.add('visible');
    dropdownActiveIndex = -1;
}

function showDropdownLoading() {
    const dropdown = document.getElementById('search-dropdown');
    dropdown.innerHTML = `<div class="search-dropdown-loading"><div class="mini-spinner"></div>Đang tìm...</div>`;
    dropdown.classList.add('visible');
}

function hideDropdown() {
    const dropdown = document.getElementById('search-dropdown');
    dropdown.classList.remove('visible');
    dropdownActiveIndex = -1;
}

function updateDropdownHighlight(items) {
    items.forEach((item, i) => {
        if (i === dropdownActiveIndex) {
            item.style.background = 'rgba(255, 255, 255, 0.08)';
            item.scrollIntoView({ block: 'nearest' });
        } else {
            item.style.background = '';
        }
    });
}
function renderHero() {
    if (!heroMovies.length) return;

    updateHeroBanner(0);
    renderHeroDots();
    startHeroAutoplay();
}

function updateHeroBanner(index) {
    const movie = heroMovies[index];
    if (!movie) return;

    const backdrop = document.getElementById('hero-backdrop');
    const posterUrl = getImageUrl(movie.poster_url || movie.thumb_url);
    backdrop.style.opacity = '0';
    setTimeout(() => {
        backdrop.style.backgroundImage = `url(${posterUrl})`;
        backdrop.style.opacity = '1';
    }, 300);
    document.getElementById('hero-title').textContent = movie.name;
    document.getElementById('hero-origin').textContent = movie.origin_name;
    document.getElementById('hero-quality').textContent = movie.quality || 'HD';
    document.getElementById('hero-lang').textContent = movie.lang || 'Vietsub';
    document.getElementById('hero-year').textContent = movie.year || '';
    const metaHtml = [];
    if (movie.tmdb?.vote_average) {
        metaHtml.push(`<span class="meta-item rating"><span class="meta-icon">⭐</span> ${movie.tmdb.vote_average.toFixed(1)}</span>`);
    }
    if (movie.time) {
        metaHtml.push(`<span class="meta-item"><span class="meta-icon">⏱</span> ${movie.time}</span>`);
    }
    if (movie.episode_current) {
        metaHtml.push(`<span class="meta-item"><span class="meta-icon">📀</span> ${movie.episode_current}</span>`);
    }
    if (movie.country?.length) {
        metaHtml.push(`<span class="meta-item"><span class="meta-icon">🌍</span> ${movie.country.map(c => c.name).join(', ')}</span>`);
    }
    document.getElementById('hero-meta').innerHTML = metaHtml.join('');
    if (movie.category?.length) {
        document.getElementById('hero-categories').textContent = movie.category.map(c => c.name).join(' • ');
    }
    document.querySelectorAll('.hero-dot').forEach((dot, i) => {
        dot.classList.toggle('active', i === index);
    });
    document.getElementById('hero-play-btn').onclick = () => {
        window.location.href = `movie.html?${movie.slug}`;
    };

    document.getElementById('hero-info-btn').onclick = () => {
        openModal(movie);
    };

    currentHeroIndex = index;
}

function renderHeroDots() {
    const container = document.getElementById('hero-dots');
    container.innerHTML = '';
    heroMovies.forEach((_, i) => {
        const dot = document.createElement('div');
        dot.className = `hero-dot ${i === 0 ? 'active' : ''}`;
        dot.addEventListener('click', () => {
            updateHeroBanner(i);
            resetHeroAutoplay();
        });
        container.appendChild(dot);
    });
}

function startHeroAutoplay() {
    heroInterval = setInterval(() => {
        const next = (currentHeroIndex + 1) % heroMovies.length;
        updateHeroBanner(next);
    }, 6000);
}

function resetHeroAutoplay() {
    clearInterval(heroInterval);
    startHeroAutoplay();
}
function renderTrendingRow(movies) {
    const row = document.getElementById('trending-row');
    row.innerHTML = '';

    movies.forEach((movie, i) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'trending-card';

        const number = document.createElement('span');
        number.className = 'trending-number';
        number.textContent = i + 1;

        const card = createMovieCard(movie);

        wrapper.appendChild(number);
        wrapper.appendChild(card);
        row.appendChild(wrapper);
    });
}

function renderMovieRow(rowId, movies) {
    const row = document.getElementById(rowId);
    row.innerHTML = '';

    if (!movies.length) {
        row.innerHTML = `<div class="section-loading">Chưa có phim nào.</div>`;
        return;
    }

    movies.forEach(movie => {
        row.appendChild(createMovieCard(movie));
    });
}
function renderPagination(slug, paginationId) {
    const state = sectionState[slug];
    if (!state || state.totalPages <= 1) return;

    const container = document.getElementById(paginationId);
    container.innerHTML = '';

    const { currentPage, totalPages, totalItems } = state;
    const prevBtn = createPaginationBtn('‹', currentPage <= 1, () => {
        fetchSection(slug, currentPage - 1);
        scrollToSection(slug);
    });
    prevBtn.classList.add('pagination-arrow');
    container.appendChild(prevBtn);
    const pages = getPageRange(currentPage, totalPages);
    pages.forEach(p => {
        if (p === '...') {
            const dots = document.createElement('span');
            dots.className = 'pagination-btn';
            dots.textContent = '...';
            dots.style.cursor = 'default';
            dots.style.background = 'transparent';
            dots.style.border = 'none';
            container.appendChild(dots);
        } else {
            const btn = createPaginationBtn(p, false, () => {
                fetchSection(slug, p);
                scrollToSection(slug);
            });
            if (p === currentPage) btn.classList.add('active');
            container.appendChild(btn);
        }
    });
    const nextBtn = createPaginationBtn('›', currentPage >= totalPages, () => {
        fetchSection(slug, currentPage + 1);
        scrollToSection(slug);
    });
    nextBtn.classList.add('pagination-arrow');
    container.appendChild(nextBtn);
    const info = document.createElement('span');
    info.className = 'pagination-info';
    info.textContent = `Trang ${currentPage}/${totalPages} • ${totalItems.toLocaleString()} phim`;
    container.appendChild(info);
}

function createPaginationBtn(text, disabled, onClick) {
    const btn = document.createElement('button');
    btn.className = 'pagination-btn';
    btn.textContent = text;
    btn.disabled = disabled;
    if (!disabled) btn.addEventListener('click', onClick);
    return btn;
}

function getPageRange(current, total) {
    const pages = [];
    const delta = 2;

    if (total <= 7) {
        for (let i = 1; i <= total; i++) pages.push(i);
        return pages;
    }

    pages.push(1);

    const start = Math.max(2, current - delta);
    const end = Math.min(total - 1, current + delta);

    if (start > 2) pages.push('...');
    for (let i = start; i <= end; i++) pages.push(i);
    if (end < total - 1) pages.push('...');

    pages.push(total);
    return pages;
}

function scrollToSection(slug) {
    const el = document.getElementById(`section-${slug}`);
    if (el) {
        const offset = document.getElementById('navbar').offsetHeight + 10;
        const top = el.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top, behavior: 'smooth' });
    }
}
function createMovieCard(movie) {
    const card = document.createElement('div');
    card.className = 'movie-card';
    card.setAttribute('data-slug', movie.slug);

    const thumbUrl = getImageUrl(movie.thumb_url);

    card.innerHTML = `
        <img class="card-poster" src="${thumbUrl}" 
        alt="${movie.name}" loading="lazy"
             onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 200 300%22><rect fill=%22%2316161f%22 width=%22200%22 height=%22300%22/><text x=%2250%25%22 y=%2250%25%22 fill=%22%236b6b80%22 text-anchor=%22middle%22 dy=%22.3em%22 font-family=%22Inter%22 font-size=%2214%22>No Image</text></svg>'">
        <div class="card-badges">
            <span class="card-badge card-badge-quality">${movie.quality || 'HD'}</span>
            ${movie.episode_current ? `<span class="card-badge card-badge-episode">${movie.episode_current}</span>` : ''}
        </div>
        <div class="card-overlay"></div>
        <div class="card-play" title="Xem phim">
            <svg viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
        </div>
        <div class="card-info">
            <div class="card-title">${movie.name}</div>
            <div class="card-meta">
                <span class="card-meta-item">${movie.year || ''}</span>
                ${movie.lang ? `<span class="card-meta-item">${movie.lang}</span>` : ''}
                ${movie.country?.length ? `<span class="card-meta-item">${movie.country[0].name}</span>` : ''}
            </div>
        </div>
        <div class="card-bottom">
            <div class="card-bottom-title">${movie.name}</div>
            <div class="card-bottom-sub">${movie.origin_name || ''}</div>
        </div>
    `;
    card.addEventListener('click', (e) => {
        openModal(movie);
    });

    return card;
}
function getImageUrl(path) {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    return `${CDN_IMAGE}/uploads/movies/${path}`;
}
function initScrollButtons() {
    document.querySelectorAll('.movie-section').forEach(section => {
        initScrollButtonsForSection(section);
    });
}

function initScrollButtonsForSection(section) {
    if (!section) return;
    const row = section.querySelector('.movie-row');
    const leftBtn = section.querySelector('.scroll-left');
    const rightBtn = section.querySelector('.scroll-right');

    if (!row || !leftBtn || !rightBtn) return;

    const scrollAmount = 600;
    const newLeft = leftBtn.cloneNode(true);
    const newRight = rightBtn.cloneNode(true);
    leftBtn.parentNode.replaceChild(newLeft, leftBtn);
    rightBtn.parentNode.replaceChild(newRight, rightBtn);

    newLeft.addEventListener('click', () => {
        row.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    });

    newRight.addEventListener('click', () => {
        row.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    });
}
function initModal() {
    const overlay = document.getElementById('modal-overlay');
    const closeBtn = document.getElementById('modal-close');

    closeBtn.addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeModal();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeModal();
    });
}

function openModal(movie) {
    const overlay = document.getElementById('modal-overlay');
    const posterUrl = getImageUrl(movie.poster_url || movie.thumb_url);
    document.getElementById('modal-backdrop').style.backgroundImage = `url(${posterUrl})`;
    document.getElementById('modal-badges').innerHTML = `
        <span class="badge badge-quality">${movie.quality || 'HD'}</span>
        <span class="badge badge-lang">${movie.lang || 'Vietsub'}</span>
        <span class="badge badge-year">${movie.year || ''}</span>
        ${movie.episode_current ? `<span class="badge badge-lang">${movie.episode_current}</span>` : ''}
    `;
    document.getElementById('modal-title').textContent = movie.name;
    document.getElementById('modal-origin').textContent = movie.origin_name || '';
    const metaHtml = [];
    if (movie.tmdb?.vote_average) {
        metaHtml.push(`<span class="meta-item rating"><span class="meta-icon">⭐</span> ${movie.tmdb.vote_average.toFixed(1)}</span>`);
    }
    if (movie.time) {
        metaHtml.push(`<span class="meta-item"><span class="meta-icon">⏱</span> ${movie.time}</span>`);
    }
    if (movie.type) {
        const typeLabel = { series: 'Phim Bộ', single: 'Phim Lẻ', hoathinh: 'Hoạt Hình' };
        metaHtml.push(`<span class="meta-item"><span class="meta-icon">🎞</span> ${typeLabel[movie.type] || movie.type}</span>`);
    }
    document.getElementById('modal-meta').innerHTML = metaHtml.join('');
    if (movie.category?.length) {
        document.getElementById('modal-categories').innerHTML = movie.category.map(c =>
            `<span class="tag tag-category">${c.name}</span>`
        ).join('');
    } else {
        document.getElementById('modal-categories').innerHTML = '';
    }
    if (movie.country?.length) {
        document.getElementById('modal-countries').innerHTML = movie.country.map(c =>
            `<span class="tag tag-country">${c.name}</span>`
        ).join('');
    } else {
        document.getElementById('modal-countries').innerHTML = '';
    }
    document.getElementById('modal-play-btn').onclick = () => {
        window.location.href = `movie.html?${movie.slug}`;
    };
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    document.getElementById('modal-overlay').classList.remove('active');
    document.body.style.overflow = '';
}
