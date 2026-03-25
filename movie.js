const API_BASE = 'https://ophim1.com/v1/api';
let CDN_IMAGE = '';
let movieData = null;
let currentServer = 0;
let currentEpisode = null;
document.addEventListener('DOMContentLoaded', () => {
    const slug = window.location.search.substring(1);

    if (!slug) {
        showError();
        return;
    }

    fetchMovieDetail(slug);
    initNavSearch();
});
async function fetchMovieDetail(slug) {
    try {
        const res = await fetch(`${API_BASE}/phim/${slug}`);
        const json = await res.json();

        if (json.status !== 'success' || !json.data?.item) {
            showError();
            return;
        }

        movieData = json.data.item;
        if (json.data.APP_DOMAIN_CDN_IMAGE) {
            CDN_IMAGE = json.data.APP_DOMAIN_CDN_IMAGE;
        } else {
            try {
                const homeRes = await fetch(`${API_BASE}/home`);
                const homeJson = await homeRes.json();
                CDN_IMAGE = homeJson.data?.APP_DOMAIN_CDN_IMAGE || 'https://img.ophim.live';
            } catch {
                CDN_IMAGE = 'https://img.ophim.live';
            }
        }

        renderMovie();

    } catch (err) {
        console.error('Failed to fetch movie:', err);
        showError();
    }
}
function renderMovie() {
    const movie = movieData;
    document.title = `${movie.name} - GheNhuaPhim`;
    const posterUrl = getImageUrl(movie.poster_url || movie.thumb_url);
    document.getElementById('movie-backdrop').style.backgroundImage = `url(${posterUrl})`;
    const thumbUrl = getImageUrl(movie.thumb_url || movie.poster_url);
    const posterImg = document.getElementById('movie-poster');
    posterImg.src = thumbUrl;
    posterImg.alt = movie.name;
    renderPosterBadges(movie);
    document.getElementById('movie-title').textContent = movie.name;
    const originNames = [];
    if (movie.origin_name) originNames.push(movie.origin_name);
    if (movie.alternative_names?.length) {
        movie.alternative_names.forEach(n => {
            if (n && n !== movie.origin_name && n !== movie.name) originNames.push(n);
        });
    }
    document.getElementById('movie-origin-name').textContent = originNames.join(' / ');
    renderRatings(movie);
    renderMetaGrid(movie);
    renderCategories(movie);
    renderCountries(movie);
    renderPeople('movie-actors', 'Diễn viên', movie.actor);
    renderPeople('movie-directors', 'Đạo diễn', movie.director);
    renderDescription(movie);
    renderTrailer(movie);
    renderEpisodes(movie);
    document.getElementById('movie-loading').style.display = 'none';
    document.getElementById('movie-content').style.display = 'block';
    if (movie.episodes.length > 0) {
        autoPlayFirst();
    }
}
function renderPosterBadges(movie) {
    const container = document.getElementById('movie-poster-badges');
    let html = '';

    if (movie.quality) {
        html += `<span class="badge badge-quality">${movie.quality}</span>`;
    }
    if (movie.lang) {
        html += `<span class="badge badge-lang">${movie.lang}</span>`;
    }
    if (movie.episode_current) {
        html += `<span class="badge badge-lang">${movie.episode_current}</span>`;
    }
    if (movie.year) {
        html += `<span class="badge badge-year">${movie.year}</span>`;
    }

    container.innerHTML = html;
}
function renderRatings(movie) {
    const container = document.getElementById('movie-ratings');
    let html = '';

    if (movie.tmdb?.vote_average) {
        html += `
            <div class="rating-card">
                <div>
                    <div class="rating-source">TMDB</div>
                    <div class="rating-score">⭐ ${movie.tmdb.vote_average.toFixed(1)}</div>
                    ${movie.tmdb.vote_count ? `<div class="rating-votes">${movie.tmdb.vote_count.toLocaleString()} votes</div>` : ''}
                </div>
            </div>`;
    }

    if (movie.imdb?.vote_average) {
        html += `
            <div class="rating-card">
                <div>
                    <div class="rating-source">IMDb</div>
                    <div class="rating-score">⭐ ${movie.imdb.vote_average}</div>
                    ${movie.imdb.vote_count ? `<div class="rating-votes">${movie.imdb.vote_count.toLocaleString()} votes</div>` : ''}
                </div>
            </div>`;
    }

    if (movie.view) {
        html += `
            <div class="rating-card">
                <div>
                    <div class="rating-source">Lượt xem</div>
                    <div class="rating-score" style="color: var(--blue);">${movie.view.toLocaleString()}</div>
                </div>
            </div>`;
    }

    container.innerHTML = html;
}
function renderMetaGrid(movie) {
    const container = document.getElementById('movie-meta-grid');
    const items = [];

    const statusLabels = {
        'completed': 'Hoàn thành',
        'ongoing': 'Đang chiếu',
        'trailer': 'Trailer'
    };

    const typeLabels = {
        'series': 'Phim Bộ',
        'single': 'Phim Lẻ',
        'hoathinh': 'Hoạt Hình',
        'tvshows': 'TV Shows'
    };

    if (movie.type) {
        items.push({ icon: '🎞', label: 'Thể loại', value: typeLabels[movie.type] || movie.type });
    }
    if (movie.status) {
        items.push({ icon: '📋', label: 'Trạng thái', value: statusLabels[movie.status] || movie.status });
    }
    if (movie.time) {
        items.push({ icon: '⏱', label: 'Thời lượng', value: movie.time });
    }
    if (movie.episode_current) {
        items.push({ icon: '📀', label: 'Tập hiện tại', value: movie.episode_current });
    }
    if (movie.episode_total) {
        items.push({ icon: '📚', label: 'Tổng số tập', value: movie.episode_total });
    }
    if (movie.year) {
        items.push({ icon: '📅', label: 'Năm', value: movie.year });
    }
    if (movie.quality) {
        items.push({ icon: '🎬', label: 'Chất lượng', value: movie.quality });
    }
    if (movie.lang) {
        items.push({ icon: '🌐', label: 'Ngôn ngữ', value: movie.lang });
    }

    container.innerHTML = items.map(item => `
        <div class="meta-card">
            <span class="meta-card-icon">${item.icon}</span>
            <div class="meta-card-content">
                <div class="meta-card-label">${item.label}</div>
                <div class="meta-card-value">${item.value}</div>
            </div>
        </div>
    `).join('');
}
function renderCategories(movie) {
    const container = document.getElementById('movie-categories');
    if (!movie.category?.length) {
        container.innerHTML = '';
        return;
    }
    container.innerHTML = movie.category.map(c =>
        `<span class="tag tag-category">${c.name}</span>`
    ).join('');
}
function renderCountries(movie) {
    const container = document.getElementById('movie-countries');
    if (!movie.country?.length) {
        container.innerHTML = '';
        return;
    }
    container.innerHTML = movie.country.map(c =>
        `<span class="tag tag-country">${c.name}</span>`
    ).join('');
}
function renderPeople(containerId, label, people) {
    const container = document.getElementById(containerId);
    if (!people?.length || (people.length === 1 && !people[0])) {
        container.innerHTML = '';
        return;
    }

    container.innerHTML = `
        <div class="movie-people-label">${label}</div>
        <div class="movie-people-list">
            ${people.filter(p => p).map(p => `<span class="person-tag">${p}</span>`).join('')}
        </div>
    `;
}
function renderDescription(movie) {
    const container = document.getElementById('movie-description');
    if (!movie.content) {
        container.innerHTML = '';
        return;
    }

    container.innerHTML = `
        <div class="movie-description-label">Nội dung phim</div>
        <div class="movie-description-text">${movie.content}</div>
    `;
}
function renderTrailer(movie) {
    const container = document.getElementById('movie-trailer');
    if (!movie.trailer_url) {
        container.innerHTML = '';
        return;
    }

    const videoId = extractYouTubeId(movie.trailer_url);

    if (videoId) {
        container.innerHTML = `
            <div class="trailer-label">🎥 Trailer</div>
            <div class="trailer-player" id="trailer-player">
                <div class="trailer-thumbnail" id="trailer-thumbnail" style="background-image: url('https://img.youtube.com/vi/${videoId}/hqdefault.jpg')">
                    <div class="trailer-play-overlay">
                        <div class="trailer-play-btn">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                        </div>
                        <span class="trailer-play-text">Xem Trailer</span>
                    </div>
                </div>
                <iframe id="trailer-iframe" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                    allowfullscreen
                    style="display:none;"></iframe>
            </div>
            <a class="trailer-link" href="${movie.trailer_url}" target="_blank" rel="noopener">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                    <polyline points="15 3 21 3 21 9"></polyline>
                    <line x1="10" y1="14" x2="21" y2="3"></line>
                </svg>
                Mở trên YouTube
            </a>
        `;
        document.getElementById('trailer-thumbnail').addEventListener('click', () => {
            const iframe = document.getElementById('trailer-iframe');
            const thumbnail = document.getElementById('trailer-thumbnail');
            iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`;
            iframe.style.display = 'block';
            thumbnail.style.display = 'none';
        });
    } else {
        container.innerHTML = `
            <div class="trailer-label">🎥 Trailer</div>
            <a class="trailer-link" href="${movie.trailer_url}" target="_blank" rel="noopener">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                Xem Trailer
            </a>
        `;
    }
}

function extractYouTubeId(url) {
    if (!url) return null;
    let match = url.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
    if (match) return match[1];
    match = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
    if (match) return match[1];
    match = url.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/);
    if (match) return match[1];
    return null;
}
function renderEpisodes(movie) {
    const episodes = movie.episodes;
    if (!episodes?.length) {
        document.getElementById('episodes-section').style.display = 'none';
        return;
    }
    const tabsContainer = document.getElementById('server-tabs');
    tabsContainer.innerHTML = '';

    episodes.forEach((server, index) => {
        const tab = document.createElement('button');
        tab.className = `server-tab ${index === 0 ? 'active' : ''}`;
        tab.textContent = server.server_name || `Server ${index + 1}`;
        tab.addEventListener('click', () => {
            switchServer(index);
        });
        tabsContainer.appendChild(tab);
    });
    renderEpisodeGrid(0);
}

function switchServer(index) {
    currentServer = index;
    document.querySelectorAll('.server-tab').forEach((tab, i) => {
        tab.classList.toggle('active', i === index);
    });

    renderEpisodeGrid(index);
}

function renderEpisodeGrid(serverIndex) {
    const grid = document.getElementById('episode-grid');
    const serverData = movieData.episodes[serverIndex]?.server_data;

    if (!serverData?.length) {
        grid.innerHTML = '<p style="color: var(--text-muted); padding: 16px;">Không có tập nào.</p>';
        return;
    }

    grid.innerHTML = '';

    serverData.forEach(ep => {
        const btn = document.createElement('button');
        btn.className = `episode-btn ${currentEpisode?.slug === ep.slug ? 'active' : ''}`;
        btn.textContent = ep.name;
        btn.title = ep.filename || ep.name;

        btn.addEventListener('click', () => {
            playEpisode(ep, serverIndex);
            grid.querySelectorAll('.episode-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });

        grid.appendChild(btn);
    });
}

function playEpisode(episode, serverIndex) {
    currentEpisode = episode;

    const iframe = document.getElementById('player-iframe');
    const placeholder = document.getElementById('player-placeholder');

    if (episode.link_embed) {
        iframe.src = episode.link_embed;
        iframe.style.display = 'block';
        placeholder.style.display = 'none';
        document.getElementById('player-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

function autoPlayFirst() {
    const firstServer = movieData.episodes?.[0];
    if (firstServer?.server_data?.length) {
        const firstEp = firstServer.server_data[0];
        playEpisode(firstEp, 0);
        const grid = document.getElementById('episode-grid');
        const firstBtn = grid.querySelector('.episode-btn');
        if (firstBtn) firstBtn.classList.add('active');
    }
}
function getImageUrl(path) {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    return `${CDN_IMAGE}/uploads/movies/${path}`;
}
function initNavSearch() {
    const container = document.getElementById('search-container');
    const toggle = document.getElementById('search-toggle');
    const input = document.getElementById('search-input');

    toggle.addEventListener('click', () => {
        container.classList.toggle('active');
        if (container.classList.contains('active')) input.focus();
    });

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const query = input.value.trim();
            if (query.length >= 2) {
                window.location.href = `search.html?keyword=${encodeURIComponent(query)}`;
            }
        }
        if (e.key === 'Escape') {
            container.classList.remove('active');
            input.value = '';
        }
    });

    document.addEventListener('click', (e) => {
        if (!container.contains(e.target)) {
            container.classList.remove('active');
        }
    });
}
function showError() {
    document.getElementById('movie-loading').style.display = 'none';
    document.getElementById('movie-error').style.display = 'flex';
}
