# Kế Hoạch Chuyển Đổi GheNhuaPhim Sang Angular

## Tổng Quan

Chuyển đổi template web xem phim GheNhuaPhim (HTML/CSS/JS thuần) sang dự án Angular. Dự án gốc gồm 3 trang ([index.html](file:///d:/Deved/GheNhuaPhim/index.html), [movie.html](file:///d:/Deved/GheNhuaPhim/movie.html), [search.html](file:///d:/Deved/GheNhuaPhim/search.html)) sử dụng API từ `https://ophim1.com/v1/api`.

---

## Cấu Trúc Dự Án Angular Đề Xuất

```
src/
├── app/
│   ├── core/                          # Module lõi (singleton)
│   │   ├── services/
│   │   │   ├── movie-api.service.ts
│   │   │   └── image-url.service.ts
│   │   ├── interceptors/
│   │   │   └── api.interceptor.ts
│   │   ├── models/
│   │   │   ├── movie.model.ts
│   │   │   ├── movie-detail.model.ts
│   │   │   ├── episode.model.ts
│   │   │   ├── pagination.model.ts
│   │   │   └── api-response.model.ts
│   │   └── core.module.ts
│   │
│   ├── shared/                        # Module chia sẻ
│   │   ├── components/
│   │   │   ├── navbar/
│   │   │   ├── footer/
│   │   │   ├── movie-card/
│   │   │   ├── movie-modal/
│   │   │   ├── pagination/
│   │   │   ├── loading-screen/
│   │   │   └── search-dropdown/
│   │   ├── pipes/
│   │   │   └── safe-url.pipe.ts
│   │   └── shared.module.ts
│   │
│   ├── features/                      # Feature modules
│   │   ├── home/
│   │   │   ├── components/
│   │   │   │   ├── hero-slider/
│   │   │   │   ├── trending-section/
│   │   │   │   └── movie-section/
│   │   │   ├── home.component.ts|html|css
│   │   │   └── home.module.ts
│   │   │
│   │   ├── movie-detail/
│   │   │   ├── components/
│   │   │   │   ├── video-player/
│   │   │   │   ├── episode-list/
│   │   │   │   ├── movie-info/
│   │   │   │   ├── movie-ratings/
│   │   │   │   └── trailer-section/
│   │   │   ├── movie-detail.component.ts|html|css
│   │   │   └── movie-detail.module.ts
│   │   │
│   │   └── search/
│   │       ├── search.component.ts|html|css
│   │       └── search.module.ts
│   │
│   ├── app.component.ts|html|css
│   ├── app.module.ts
│   └── app-routing.module.ts
│
├── assets/
│   └── styles/
│       ├── _variables.css
│       ├── _base.css
│       └── _animations.css
│
├── environments/
│   ├── environment.ts
│   └── environment.prod.ts
│
└── styles.css
```

---

## Thứ Tự Build Chi Tiết

### Phase 1: Khởi Tạo Dự Án & Nền Tảng

#### Bước 1.1 — Khởi tạo Angular project
- `ng new ghe-nhua-phim --routing --style=css`
- Cài thêm: `@angular/animations` (nếu cần)
- Cấu hình `environment.ts` với `API_BASE` và `CDN_IMAGE_DEFAULT`

#### Bước 1.2 — Tạo `CoreModule`
Chứa các service singleton, models, interceptors — chỉ import vào `AppModule` một lần duy nhất.

---

### Phase 2: Models (Interfaces TypeScript)

> [!IMPORTANT]
> Build models trước vì mọi service và component đều phụ thuộc vào chúng.

#### 2.1 — `movie.model.ts` (Movie list item)
```typescript
interface Movie {
  _id: string;
  name: string;
  slug: string;
  origin_name: string;
  type: 'series' | 'single' | 'hoathinh' | 'tvshows';
  thumb_url: string;
  poster_url: string;
  year: number;
  quality: string;
  lang: string;
  time: string;
  episode_current: string;
  episode_total: string;
  status: 'completed' | 'ongoing' | 'trailer';
  category: { id: string; name: string; slug: string }[];
  country: { id: string; name: string; slug: string }[];
  tmdb?: { vote_average: number; vote_count: number };
  imdb?: { vote_average: number; vote_count: number };
  view?: number;
}
```

#### 2.2 — `movie-detail.model.ts`
Extends [Movie](file:///d:/Deved/GheNhuaPhim/movie.js#50-84) thêm: `content`, `actor[]`, `director[]`, `trailer_url`, `alternative_names[]`, `episodes[]`

#### 2.3 — `episode.model.ts`
```typescript
interface Episode {
  name: string;
  slug: string;
  filename: string;
  link_embed: string;
  link_m3u8: string;
}
interface ServerEpisode {
  server_name: string;
  server_data: Episode[];
}
```

#### 2.4 — `pagination.model.ts` & `api-response.model.ts`
```typescript
interface Pagination {
  totalItems: number;
  totalItemsPerPage: number;
  currentPage: number;
  totalPages: number;
}
interface ApiResponse<T> {
  status: string;
  msg: string;
  data: {
    APP_DOMAIN_CDN_IMAGE: string;
    items: T[];
    params?: { pagination: Pagination };
    item?: T;              // cho API chi tiết phim
  };
}
```

---

### Phase 3: Services

#### 3.1 — `ImageUrlService`
| Method | Mô tả |
|--------|--------|
| `setCdnUrl(url)` | Lưu CDN URL |
| [getImageUrl(path)](file:///d:/Deved/GheNhuaPhim/movie.js#383-388) | Trả về URL đầy đủ (xử lý cả path tuyệt đối lẫn tương đối) |

#### 3.2 — `MovieApiService`
| Method | API Endpoint | Mô tả |
|--------|-------------|--------|
| `getHome()` | `GET /home` | Lấy data trang chủ (trending + CDN URL) |
| `getMovieList(slug, page, limit)` | `GET /danh-sach/{slug}?page=&limit=` | Lấy danh sách phim theo loại |
| `getMovieDetail(slug)` | `GET /phim/{slug}` | Chi tiết phim + episodes |
| [searchMovies(keyword, page, limit)](file:///d:/Deved/GheNhuaPhim/search.js#96-156) | `GET /tim-kiem?keyword=&page=&limit=` | Tìm kiếm phim |

> Tất cả method trả về `Observable<ApiResponse<T>>` sử dụng `HttpClient`.

#### 3.3 — `ApiInterceptor` (optional)
- Tự động thêm base URL
- Xử lý error chung (retry, logging)

---

```
src/
├── app/
│   ├── core/                          # Module lõi (singleton)
│   │   ├── services/
│   │   │   ├── movie-api.service.ts
│   │   │   └── image-url.service.ts
│   │   ├── interceptors/
│   │   │   └── api.interceptor.ts
│   │   ├── models/
│   │   │   ├── movie.model.ts
│   │   │   ├── movie-detail.model.ts
│   │   │   ├── episode.model.ts
│   │   │   ├── pagination.model.ts
│   │   │   └── api-response.model.ts
│   │   └── core.module.ts
│   │
│   ├── shared/                        # Module chia sẻ
│   │   ├── components/
│   │   │   ├── navbar/
│   │   │   ├── footer/
│   │   │   ├── movie-card/
│   │   │   ├── movie-modal/
│   │   │   ├── pagination/
│   │   │   ├── loading-screen/
│   │   │   └── search-dropdown/
│   │   ├── pipes/
│   │   │   └── safe-url.pipe.ts
│   │   └── shared.module.ts
│   │
│   ├── features/                      # Feature modules
│   │   ├── home/
│   │   │   ├── components/
│   │   │   │   ├── hero-slider/
│   │   │   │   ├── trending-section/
│   │   │   │   └── movie-section/
│   │   │   ├── home.component.ts|html|css
│   │   │   └── home.module.ts
│   │   │
│   │   ├── movie-detail/
│   │   │   ├── components/
│   │   │   │   ├── video-player/
│   │   │   │   ├── episode-list/
│   │   │   │   ├── movie-info/
│   │   │   │   ├── movie-ratings/
│   │   │   │   └── trailer-section/
│   │   │   ├── movie-detail.component.ts|html|css
│   │   │   └── movie-detail.module.ts
│   │   │
│   │   └── search/
│   │       ├── search.component.ts|html|css
│   │       └── search.module.ts
│   │
│   ├── app.component.ts|html|css
│   ├── app.module.ts
│   └── app-routing.module.ts
│
├── assets/
│   └── styles/
│       ├── _variables.css
│       ├── _base.css
│       └── _animations.css
│
├── environments/
│   ├── environment.ts
│   └── environment.prod.ts
│
└── styles.css
```
### Phase 4: Shared Module — Các Component Dùng Chung

> Build theo thứ tự dependency: component không phụ thuộc component khác → build trước.

#### 4.1 — `LoadingScreenComponent`
- Input: `isLoading: boolean`
- Hiển thị loader animation + logo

#### 4.2 — `MovieCardComponent`
- Input: `movie: Movie`
- Output: `cardClick: EventEmitter<Movie>`
- Hiển thị poster, badges (quality, episode), hover overlay
- Tái sử dụng ở cả Home, Search

#### 4.3 — `PaginationComponent`
- Input: `currentPage`, `totalPages`, `totalItems`
- Output: `pageChange: EventEmitter<number>`
- Tái sử dụng ở Home sections và Search

#### 4.4 — `MovieModalComponent`
- Input: `movie: Movie | null`, `isOpen: boolean`
- Output: `close: EventEmitter<void>`, `playClick: EventEmitter<string>`
- Hiển thị backdrop, badges, meta, categories, countries
- Đóng bằng click overlay / nút X / ESC

#### 4.5 — `SearchDropdownComponent`
- Input: `results: Movie[]`, `totalItems`, `isLoading`, `keyword`
- Output: `itemClick`, `viewAllClick`
- Hỗ trợ keyboard navigation (ArrowUp/Down/Enter)

#### 4.6 — `NavbarComponent`
- Chứa logo, nav-links, search toggle + `SearchDropdownComponent`
- Input: `activeSection: string`
- Xử lý scroll event để toggle class `scrolled`
- Inject `Router` để navigate

#### 4.7 — `FooterComponent`
- Static component, hiển thị logo + links

#### 4.8 — `SafeUrlPipe`
- Pipe để bypass DomSanitizer cho iframe URLs

---

### Phase 5: Feature Module — Home Page

#### 5.1 — `HeroSliderComponent`
- Input: `movies: Movie[]`
- Logic: auto-rotate mỗi 6s, dots navigation, fade transition
- Buttons: "Xem Ngay" → navigate to `/phim/:slug`, "Chi Tiết" → mở modal

#### 5.2 — `TrendingSectionComponent`
- Input: `movies: Movie[]`
- Hiển thị top 10 phim với số thứ tự lớn (trending number)
- Horizontal scroll buttons

#### 5.3 — `MovieSectionComponent`
- Input: `sectionTitle`, `sectionIcon`, `slug`
- Tự gọi `MovieApiService.getMovieList()` khi init
- Chứa `MovieCardComponent` (horizontal scroll) + `PaginationComponent`
- Scroll buttons trái/phải

#### 5.4 — `HomeComponent`
- Gọi `MovieApiService.getHome()` → truyền data cho HeroSlider, TrendingSection
- Render 6 `MovieSectionComponent` instances với config khác nhau:

| Section | Slug | Icon |
|---------|------|------|
| Phim Bộ Mới | `phim-bo` | 📺 |
| Phim Lẻ Mới | `phim-le` | 🎬 |
| Hoạt Hình | `hoat-hinh` | ✨ |
| TV Shows | `tv-shows` | 📡 |
| Phim Bộ Đang Chiếu | `phim-bo-dang-chieu` | ▶️ |
| Phim Sắp Chiếu | `phim-sap-chieu` | 🎞 |

---

### Phase 6: Feature Module — Movie Detail Page

#### 6.1 — `VideoPlayerComponent`
- Input: `embedUrl: string | null`
- Hiển thị placeholder khi chưa có URL, iframe khi có
- Sử dụng `SafeUrlPipe`

#### 6.2 — `EpisodeListComponent`
- Input: `episodes: ServerEpisode[]`
- Output: `episodeSelect: EventEmitter<{episode, serverIndex}>`
- Server tabs + episode grid buttons
- Highlight tập đang xem

#### 6.3 — `MovieRatingsComponent`
- Input: `movie: MovieDetail`
- Hiển thị TMDB, IMDb ratings + lượt xem

#### 6.4 — `MovieInfoComponent`
- Input: `movie: MovieDetail`
- Hiển thị meta grid (type, status, thời lượng, tập, năm, chất lượng, ngôn ngữ)
- Categories, countries tags
- Actors, directors
- Description (nội dung HTML)

#### 6.5 — `TrailerSectionComponent`
- Input: `trailerUrl: string`
- YouTube thumbnail → click để load iframe
- Link mở YouTube

#### 6.6 — `MovieDetailComponent`
- Route: `/phim/:slug`
- Gọi `MovieApiService.getMovieDetail(slug)`
- Compose các sub-components trên
- Auto-play tập đầu tiên

---

### Phase 7: Feature Module — Search Page

#### 7.1 — `SearchComponent`
- Route: `/tim-kiem?keyword=&page=`
- Search hero section với form input
- Quick tags (từ khóa gợi ý)
- Grid kết quả dùng `MovieCardComponent`
- `PaginationComponent`
- Xử lý `popstate` event (browser back/forward)
- Chứa `MovieModalComponent`

---

### Phase 8: Routing & App Shell

#### 8.1 — `AppRoutingModule`
```typescript
const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'phim/:slug', component: MovieDetailComponent },
  { path: 'tim-kiem', component: SearchComponent },
  { path: '**', redirectTo: '' }
];
```
> Khuyến nghị dùng **Lazy Loading** cho các feature modules.

#### 8.2 — `AppComponent`
- Chứa `<app-navbar>`, `<router-outlet>`, `<app-footer>`

---

### Phase 9: Styling & Polish

#### 9.1 — Migrate CSS
- Chuyển CSS variables từ [style.css](file:///d:/Deved/GheNhuaPhim/style.css) → `src/styles.css` (global)
- [movie.css](file:///d:/Deved/GheNhuaPhim/movie.css) → scope vào `MovieDetailComponent`
- Search page inline styles → scope vào `SearchComponent`
- Component-specific CSS → vào từng component [.css](file:///d:/Deved/GheNhuaPhim/style.css) file

#### 9.2 — Responsive & Animations
- Giữ nguyên media queries
- Chuyển CSS transitions → Angular animations (optional)

---

## Tổng Kết Modules & Services

### Modules

| Module | Loại | Chứa |
|--------|------|------|
| `AppModule` | Root | App shell, routing |
| `CoreModule` | Singleton | Services, models, interceptors |
| `SharedModule` | Shared | Navbar, Footer, MovieCard, Pagination, Modal, Loading, SearchDropdown, Pipes |
| `HomeModule` | Feature (lazy) | HeroSlider, TrendingSection, MovieSection, HomeComponent |
| `MovieDetailModule` | Feature (lazy) | VideoPlayer, EpisodeList, MovieInfo, MovieRatings, Trailer, MovieDetailComponent |
| `SearchModule` | Feature (lazy) | SearchComponent |

### Services

| Service | Module | Mô tả |
|---------|--------|--------|
| `MovieApiService` | Core | Tất cả API calls (home, list, detail, search) |
| `ImageUrlService` | Core | Quản lý CDN URL và resolve image paths |

### Pipes

| Pipe | Module | Mô tả |
|------|--------|--------|
| `SafeUrlPipe` | Shared | Bypass DomSanitizer cho iframe embed URLs |

---

## Verification Plan

### Kiểm tra thủ công (sau khi build)
1. **Trang chủ**: Hero slider auto-rotate, click dot, navigation. Các section hiển thị đúng phim + pagination hoạt động
2. **Trang chi tiết phim**: Navigate qua URL `/phim/:slug`, hiển thị đầy đủ info, chọn tập để xem, chuyển server
3. **Trang tìm kiếm**: Tìm từ khóa → hiện kết quả → phân trang → click vào phim → modal → xem phim
4. **Search dropdown** trên navbar: Gõ ≥ 2 ký tự → hiện dropdown → keyboard navigation → Enter
5. **Responsive**: Test trên mobile/tablet breakpoints