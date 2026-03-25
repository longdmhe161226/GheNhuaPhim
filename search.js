const API_BASE = 'https://ophim1.com/v1/api';
let CDN_IMAGE = '';
document.addEventListener('DOMContentLoaded', () => {
    initCDN();
    initSearchForm();
    initNavSearch();
    initModal();
    const params = new URLSearchParams(window.location.search);
    const keyword = params.get('keyword') || '';
    const page = parseInt(params.get('page')) || 1;

    if (keyword.length >= 2) {
        document.getElementById('search-page-input').value = keyword;
        document.getElementById('nav-search-input').value = keyword;
        document.title = `Tìm kiếm: ${keyword} - GheNhuaPhim`;
        searchMovies(keyword, page);
    }
});
async function initCDN() {
    try {
        const res = await fetch(`${API_BASE}/home`);
        const json = await res.json();
        if (json.data?.APP_DOMAIN_CDN_IMAGE) {
            CDN_IMAGE = json.data.APP_DOMAIN_CDN_IMAGE;
        }
    } catch (e) {
        CDN_IMAGE = 'https://img.ophim.live';
    }
}
function initSearchForm() {
    const form = document.getElementById('search-form');
    const input = document.getElementById('search-page-input');

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const keyword = input.value.trim();
        if (keyword.length >= 2) {
            navigateSearch(keyword, 1);
        }
    });
    document.querySelectorAll('.search-tag').forEach(tag => {
        tag.addEventListener('click', (e) => {
            e.preventDefault();
            const url = new URL(tag.href);
            const keyword = url.searchParams.get('keyword');
            if (keyword) {
                input.value = keyword;
                navigateSearch(keyword, 1);
            }
        });
    });
}
function initNavSearch() {
    const input = document.getElementById('nav-search-input');
    const container = document.getElementById('search-container');

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const keyword = input.value.trim();
            if (keyword.length >= 2) {
                document.getElementById('search-page-input').value = keyword;
                navigateSearch(keyword, 1);
            }
        }
    });

    document.getElementById('search-toggle').addEventListener('click', () => {
        container.classList.toggle('active');
        if (container.classList.contains('active')) input.focus();
    });
}
function navigateSearch(keyword, page) {
    const url = new URL(window.location);
    url.searchParams.set('keyword', keyword);
    url.searchParams.set('page', page);
    window.history.pushState({}, '', url);

    document.title = `Tìm kiếm: ${keyword} - GheNhuaPhim`;
    document.getElementById('search-page-input').value = keyword;
    document.getElementById('nav-search-input').value = keyword;

    searchMovies(keyword, page);
}
window.addEventListener('popstate', () => {
    const params = new URLSearchParams(window.location.search);
    const keyword = params.get('keyword') || '';
    const page = parseInt(params.get('page')) || 1;

    if (keyword.length >= 2) {
        document.getElementById('search-page-input').value = keyword;
        document.getElementById('nav-search-input').value = keyword;
        searchMovies(keyword, page);
    }
});
async function searchMovies(keyword, page = 1) {
    const grid = document.getElementById('results-grid');
    const title = document.getElementById('results-title');
    const pagination = document.getElementById('results-pagination');
    const subtitle = document.getElementById('search-subtitle');
    title.innerHTML = `<span class="title-icon">🔍</span> Đang tìm "${keyword}"...`;
    subtitle.textContent = `Đang tìm kiếm...`;
    grid.innerHTML = `<div class="section-loading" style="grid-column: 1/-1;"><div class="mini-spinner"></div>Đang tìm kiếm...</div>`;
    pagination.innerHTML = '';
    document.getElementById('search-results').scrollIntoView({ behavior: 'smooth', block: 'start' });

    try {
        const res = await fetch(`${API_BASE}/tim-kiem?keyword=${encodeURIComponent(keyword)}&page=${page}&limit=24`);
        const json = await res.json();

        if (json.status !== 'success') throw new Error('Search API error');

        const data = json.data;
        if (data.APP_DOMAIN_CDN_IMAGE) CDN_IMAGE = data.APP_DOMAIN_CDN_IMAGE;

        const items = data.items || [];
        const pag = data.params?.pagination || {};
        const totalItems = pag.totalItems || 0;
        const totalPages = pag.totalPages || 1;
        const currentPage = pag.currentPage || page;
        title.innerHTML = `<span class="title-icon">🔍</span> Kết quả tìm kiếm "${keyword}" <span class="results-count">(${totalItems.toLocaleString()} phim)</span>`;
        subtitle.textContent = `Tìm thấy ${totalItems.toLocaleString()} kết quả cho "${keyword}"`;
        grid.innerHTML = '';
        if (items.length === 0) {
            grid.innerHTML = `
                <div class="search-empty" style="grid-column: 1/-1;">
                    <span class="search-empty-icon">🎬</span>
                    <p class="search-empty-text">Không tìm thấy phim nào cho "${keyword}"</p>
                    <p class="search-empty-hint">Thử tìm kiếm với từ khóa khác hoặc ngắn hơn</p>
                </div>`;
        } else {
            items.forEach(movie => {
                grid.appendChild(createMovieCard(movie));
            });
        }
        if (totalPages > 1) {
            renderPagination(keyword, pagination, currentPage, totalPages, totalItems);
        }

    } catch (err) {
        console.error('Search failed:', err);
        grid.innerHTML = `
            <div class="search-empty" style="grid-column: 1/-1;">
                <span class="search-empty-icon">⚠️</span>
                <p class="search-empty-text">Tìm kiếm thất bại</p>
                <p class="search-empty-hint">
                    <button onclick="searchMovies('${keyword.replace(/'/g, "\\'")}', ${page})" 
                        style="color: var(--blue); background: none; border: none; cursor: pointer; text-decoration: underline; font-family: inherit; font-size: inherit;">
                        Thử lại
                    </button>
                </p>
            </div>`;
        title.innerHTML = `<span class="title-icon">🔍</span> Tìm kiếm "${keyword}"`;
    }
}
function renderPagination(keyword, container, currentPage, totalPages, totalItems) {
    container.innerHTML = '';
    const prevBtn = createPageBtn('‹', currentPage <= 1, () => navigateSearch(keyword, currentPage - 1));
    prevBtn.classList.add('pagination-arrow');
    container.appendChild(prevBtn);
    const pages = getPageRange(currentPage, totalPages);
    pages.forEach(p => {
        if (p === '...') {
            const dots = document.createElement('span');
            dots.className = 'pagination-btn';
            dots.textContent = '...';
            dots.style.cssText = 'cursor:default;background:transparent;border:none;';
            container.appendChild(dots);
        } else {
            const btn = createPageBtn(p, false, () => navigateSearch(keyword, p));
            if (p === currentPage) btn.classList.add('active');
            container.appendChild(btn);
        }
    });
    const nextBtn = createPageBtn('›', currentPage >= totalPages, () => navigateSearch(keyword, currentPage + 1));
    nextBtn.classList.add('pagination-arrow');
    container.appendChild(nextBtn);
    const info = document.createElement('span');
    info.className = 'pagination-info';
    info.textContent = `Trang ${currentPage}/${totalPages} • ${totalItems.toLocaleString()} phim`;
    container.appendChild(info);
}

function createPageBtn(text, disabled, onClick) {
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
function createMovieCard(movie) {
    const card = document.createElement('div');
    card.className = 'movie-card';
    card.setAttribute('data-slug', movie.slug);

    const thumbUrl = getImageUrl(movie.thumb_url);

    card.innerHTML = `
        <img class="card-poster" src="${thumbUrl}" alt="${movie.name}" loading="lazy"
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

    card.addEventListener('click', () => {
        openModal(movie);
    });

    return card;
}
function getImageUrl(path) {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    return `${CDN_IMAGE}/uploads/movies/${path}`;
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
