# 元新儀器 KEN YUAN HSIN — 設計系統 v1.0

依 `V2_allpage` 現行網站（2026-09-18）萃取。給 WordPress 開發使用：顏色、字級、間距、圓角都以這裡為準。

## 檔案

| 檔案 | 用途 |
|---|---|
| `yuan-tokens.css` | 設計變數（`--yh-*`），只有變數、不產生樣式。**一定要先載入** |
| `yuan-components.css` | 元件樣式（`.yh-*`）：按鈕、卡片、標籤、Hero、表單、導覽、頁尾 |
| `theme.json` | WordPress 區塊編輯器設定：色票、字級、間距、陰影、預設元素樣式 |
| `style-guide.html` | 視覺化規範頁，瀏覽器直接打開即可看到所有元件 |

## 安裝到 WordPress

### 1. 放檔案

```
wp-content/themes/yuan/
├── theme.json                     ← 本資料夾的 theme.json
├── functions.php
└── assets/css/
    ├── yuan-tokens.css
    └── yuan-components.css
```

### 2. 載入字型與 CSS（`functions.php`）

```php
add_action( 'wp_enqueue_scripts', 'yuan_enqueue_design_system' );
add_action( 'enqueue_block_editor_assets', 'yuan_enqueue_design_system' ); // 讓編輯器預覽也一致

function yuan_enqueue_design_system() {
	$ver = '1.0.0';
	wp_enqueue_style(
		'yuan-fonts',
		'https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Noto+Sans+TC:wght@400;500;700;900&display=swap',
		array(),
		null
	);
	wp_enqueue_style( 'yuan-tokens', get_theme_file_uri( 'assets/css/yuan-tokens.css' ), array( 'yuan-fonts' ), $ver );
	wp_enqueue_style( 'yuan-components', get_theme_file_uri( 'assets/css/yuan-components.css' ), array( 'yuan-tokens' ), $ver );
}

// 讓 .yh-body 的字體、內文顏色套到整站
add_filter( 'body_class', function ( $classes ) {
	$classes[] = 'yh-body';
	return $classes;
} );
```

### 3. 在區塊編輯器使用元件

在區塊右側「進階 → 額外的 CSS class」填入 class 即可，例如：

- 按鈕區塊：`yh-btn yh-btn--outline`
- 群組區塊（整段區塊）：`yh-section yh-section--alt`
- 圖片區塊（獨立配圖）：`yh-media yh-media--shadow`

需要固定 HTML 結構的元件（卡片、Hero、關鍵數據、頁尾），建議做成 **區塊樣板（Block Pattern）**，結構照 `style-guide.html` 的範例。

### 4. 不要做的事

- 不要在頁面寫死色碼，一律用變數，例如 `var(--yh-color-primary)`，或 `theme.json` 的 `var(--wp--preset--color--primary)`
- 不要加 `!important`。要覆寫就提高選擇器權重
- 不要自己新增圓角值。只能用 10／16／24／999

## 設計規則速查

### 顏色（語意層，優先使用）

| 變數 | 色碼 | 用在 |
|---|---|---|
| `--yh-color-primary` | `#143A82` | 主按鈕、區塊大標、導覽連結 |
| `--yh-color-accent` | `#1F5BB5` | 英文眉標、數據數字、卡片分類 |
| `--yh-color-interactive` | `#2E72D6` | hover、焦點框 |
| `--yh-color-title` | `#1C2533` | 卡片標題、h4 |
| `--yh-color-text` | `#5A6473` | 內文 |
| `--yh-color-text-muted` | `#8893A8` | 日期、輔助說明 |
| `--yh-color-border` | `#E5E8EC` | 卡片框線 |
| `--yh-color-border-control` | `#DCE1E8` | 按鈕、tab、chip 框線 |
| `--yh-color-bg-alt` | `#F4F6F9` | 淺灰區塊底 |
| `--yh-color-bg-dark` | `#0E1C3D` | 深色區塊 |
| 頁尾底色 `--yh-ink-950` | `#091428` | 頁尾、頂部資訊列 |

### 字級

| 變數 | 桌機 | ≤900px | ≤640px | 用在 |
|---|---|---|---|---|
| `--yh-fs-display` | 46 | 46 | 34 | 關鍵數據 |
| `--yh-fs-h1` | 40 | 34 | 28 | 內頁 Hero 標題 |
| `--yh-fs-h2` | 34 | 30 | 26 | 區塊大標 |
| `--yh-fs-h3` | 26 | 26 | 22 | 次區塊標題 |
| `--yh-fs-h4` | 22 | 22 | 20 | 卡片大標 |
| `--yh-fs-h5` | 18 | 18 | 18 | 小卡標題 |
| `--yh-fs-lead` | 16 | | | 導言 |
| `--yh-fs-body` | 15 | | | 內文 |
| `--yh-fs-body-sm` | 14 | | | 表單、次要內文 |
| `--yh-fs-sm` | 13.5 | | | 按鈕、標籤、tab |
| `--yh-fs-eyebrow` | 13 | | | 英文眉標（字距 .16em、全大寫） |
| `--yh-fs-caption` | 12 | | | 版權、註記 |

中文用 **Noto Sans TC**。英文眉標、數字、型號用 **Manrope**（加上 class `yh-en`）。

### 圓角

| 值 | 變數 | 用在 |
|---|---|---|
| 24px | `--yh-radius-lg` | 獨立配圖（不在卡片內的圖） |
| 16px | `--yh-radius-md` | 卡片、關鍵數據框 |
| 10px | `--yh-radius-sm` | 小縮圖、輸入框 |
| 999px | `--yh-radius-pill` | 按鈕、標籤、chip、tab |
| 90 → 64 → 36 → 28px | `--yh-radius-hero` | Hero 只圓左上＋右下，隨斷點縮小 |

### 間距與版面

- 間距以 4px 為基準：`--yh-space-1`（4）～ `--yh-space-11`（88）
- 內容最大寬 `1200px`，左右邊距 32 → 24（≤1024）→ 20（≤640）→ 16（≤400）
- 區塊上下留白 88 → 64（≤900）→ 40（≤640）
- 內頁 Hero 高度：桌機 420px，手機統一 286px。首頁 Hero：桌機 700px，手機 50dvh

### 斷點

`1024px` 平板橫向 ／ `900px` 平板直向 ／ `640px` 手機 ／ `400px` 小手機（都用 `max-width`）

## 現行網站 class 對照

搬到 WordPress 時，舊 class 請換成新的：

| 現行 V2_allpage | 設計系統 | 備註 |
|---|---|---|
| `yb-sec` | `yh-section` + `yh-container` | 外層區塊與內容寬分開 |
| `ypill ypill-solid`（深底白鈕） | `yh-btn yh-btn--light` | |
| `ypill ypill-out` | `yh-btn yh-btn--ghost-light`（深底）／`yh-btn--outline`（淺底） | |
| `ybtn-solid` | `yh-btn yh-btn--primary` | |
| `yacad` | `yh-btn yh-btn--secondary` | |
| `yb-linkbtn` | `yh-btn yh-btn--light yh-btn--sm` | |
| 「立即報名 →」外框 span | `yh-btn yh-btn--outline` | 原本是 inline，已修正下緣被吃掉的問題 |
| `ychip` | `yh-chip`（`.is-active`） | |
| `ytab` | `yh-tab`（`.is-active`） | 外層包 `yh-tabs` |
| 日期梯次 span | `yh-tag` | |
| `ycard ynews`、`yart-card`、`yc-card` | `yh-card yh-card--link` | 圖放 `yh-card__media`，文字放 `yh-card__body` |
| `yb-course` | `yh-card yh-card--horizontal yh-card--link` | |
| `yi-card` + `yi-cardhead` | `yh-card` + `yh-card-head` | |
| `yinfocard` | `yh-card` | |
| 洞察小卡（縮圖＋標題） | `yh-list-card` + `yh-thumb` | |
| `yb-ms-pic`、`yi-hero-img`、`yp-organ` | `yh-media` | |
| `yb-hero` | `yh-hero`（首頁加 `yh-hero--home`） | 有照片時加 `yh-hero--image` 自動加暗色遮罩 |
| `yb-hero-sub` | `yh-hero` | 手機 286px 已內建 |
| `yb-statgrid` / `ystat-cell` | `yh-stats` / `yh-stat` | |
| `yinput` | `yh-input` / `yh-select` / `yh-textarea` | 手機自動改 16px，避免 iOS 放大 |
| `yb-navrow` / `ynav` | `yh-nav` / `yh-nav__link` | |
| `yb-foot*` | `yh-footer*` | 手機三欄並排已內建，不需要 JS 收合 |
| `ylink` | `yh-link` | |

## 這次整理時統一掉的差異

現行網站有些值很接近但不一致，設計系統已經合併：

- 輸入框框線 `#D7DCE3` 和控制項框線 `#DCE1E8`：token 以 `#DCE1E8` 為準，`yh-input` 暫時保留 `#D7DCE3`
- 字級 13／13.5／14 混用：按鈕、tab 統一 13.5，眉標 13，表單 14
- 區塊上下留白 80／84／88 混用：統一 88
- `.ytab` 在兩頁有兩種尺寸：統一為 9px 20px、13.5px
- 首頁「服務與產品」兩張卡仍是 40px 圓角，WordPress 版請用 `--yh-radius-md`（16px）
