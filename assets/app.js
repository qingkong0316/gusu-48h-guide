(function () {
  "use strict";

  const DATA = window.GUSU_DATA;
  const PLANNER = window.GusuPlanner;
  if (!DATA || !PLANNER) return;

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const PLACES = [...DATA.spots, ...DATA.foods, ...DATA.experiences];
  const PLACE_MAP = new Map(PLACES.map((p) => [p.id, p]));
  const MAP_EXPERIENCE_IDS = ["boat_pingjiang", "pingtan", "night_garden", "hanfu", "shantang_boat"];

  const PACE_LABEL = { relaxed: "慢游", balanced: "标准", packed: "紧凑" };
  const FOOD_LABEL = { classic: "老字号", local: "市井烟火", splurge: "仪式感" };
  const MEAL_LABEL = { lunch: "午餐", dinner: "晚餐", breakfast: "早餐", snack: "小吃" };
  const CONFIDENCE_LABEL = {
    official: "官方来源",
    public: "公开评价",
    summary: "口碑摘要",
    none: "暂无来源",
  };
  const STATIONS = {
    "苏州站": { short: "苏州站", transfer: 30, note: "古城北侧，去平江路约 15 分钟" },
    "苏州园区站": { short: "园区站", transfer: 20, note: "离金鸡湖近，最后一天更顺" },
    "苏州北站": { short: "苏州北站", transfer: 45, note: "离古城较远，需多留 20 分钟" },
  };

  const AREA_KEYS = ["pingjiang", "guanqian", "shantang", "jinji", "other"];
  const AREA_LABELS = {
    pingjiang: "平江路",
    guanqian: "观前街",
    shantang: "山塘街",
    jinji: "金鸡湖",
    other: "其他 / 不确定",
  };
  const CARD_KIND_LABELS = { spot: "自定义景点", food: "自定义餐厅", experience: "自定义体验", rest: "休息", other: "其他" };

  const ARRIVALS = ["10:00", "10:30", "11:00", "11:30"];
  const DEPARTURES = ["19:40", "20:10", "20:40", "21:10", "21:40"];

  const EXP_OPTIONS = [
    { key: "boat", label: "摇橹船", note: "¥40" },
    { key: "pingtan", label: "听评弹", note: "¥38–88" },
    { key: "nightgarden", label: "夜游网师园", note: "¥120" },
    { key: "hanfu", label: "汉服妆造", note: "¥60起" },
    { key: "market", label: "双塔市集", note: "逛吃" },
    { key: "sunset", label: "湖边日落", note: "免费" },
    { key: "tiger", label: "加一天虎丘", note: "¥70" },
  ];

  const EXP_TOGGLE = {
    boat_pingjiang: "boat",
    pingtan: "pingtan",
    night_garden: "nightgarden",
    hanfu: "hanfu",
    market_graze: "market",
    jinji_sunset: "sunset",
  };

  const FOOD_FILTERS = [
    ["all", "全部"],
    ["main", "苏帮菜"],
    ["noodle", "面馆"],
    ["snack", "生煎小吃"],
    ["sweet", "糖水糕团"],
    ["lake", "湖景约会"],
    ["veg", "素食"],
    ["cafe", "咖啡甜品"],
    ["creative", "创意融合"],
  ];

  const LEGACY_FOOD_CATEGORY = {
    songhelou: "main", xinjufeng: "main", xiehe: "main", zhenzhu: "main", wumen: "main",
    tongdexing: "noodle",
    yaba: "snack", taohuayuanji: "snack", rongyanglou: "snack", zhaoyuanzhang: "snack",
    yuyongsheng: "snack", tangyifang: "snack",
    daniangniang: "sweet",
    xiyuan_noodle: "veg",
    yueshanfu: "lake", jiangnan_yachu: "lake", suchi_huayang: "lake",
  };

  const PRICE_PRESETS = [
    { id: "any", label: "不限", min: null, max: null },
    { id: "u50", label: "≤¥50", min: 0, max: 50 },
    { id: "50-100", label: "¥50–100", min: 50, max: 100 },
    { id: "100-200", label: "¥100–200", min: 100, max: 200 },
    { id: "200-300", label: "¥200–300", min: 200, max: 300 },
    { id: "300p", label: "¥300+", min: 300, max: null },
  ];

  const FOOD_PAGE_SIZE = 12;

  const XHS_POSTS = {
    zhuozhengyuan: [
      { title: "苏州旅游｜拙政园人少版攻略，狠狠拍了4h", author: "一個大苹果", date: "2026-10-23", url: "https://www.xiaohongshu.com/explore/6adac5d2000000003103a9af" },
      { title: "苏州秋天！拙政园被问爆的18个机位", author: "文森的奇妙生活", date: "2026-10-06", url: "https://www.xiaohongshu.com/explore/6ac4bc22000000001500fc2b" },
      { title: "拙政园｜必拍的15张封神照片（附机位地图）", author: "姑苏园鉴", date: "2026-10-05", url: "https://www.xiaohongshu.com/explore/6ac3b3a200000000140395fc" },
    ],
    sz_museum: [
      { title: "苏州博物馆预约避坑指南", author: "小耳朵Aileen", date: "2026-10-21", url: "https://www.xiaohongshu.com/explore/6ad8237a000000003101df30" },
      { title: "苏博本馆和西馆，别约错地方", author: "冰镇空气ri2", date: "2026-10-20", url: "https://www.xiaohongshu.com/explore/6ad775360000000031002ecb" },
    ],
    pingjiang: [
      { title: "苏州平江路保姆级一日吃逛玩买一篇搞定", author: "我爱喝可乐", date: "2026-10-20", url: "https://www.xiaohongshu.com/explore/6ad7476d0000000027017a17" },
      { title: "平江路9家美食｜正餐+小吃分享", author: "自由瓜瓜", date: "2026-10-07", url: "https://www.xiaohongshu.com/explore/6ac61cf9000000000100b75c" },
      { title: "平江路别再瞎吃了！本地人私藏8家", author: "橘子皮", date: "2026-09-27", url: "https://www.xiaohongshu.com/explore/6ab8d53e000000001303ff1f" },
    ],
    shantang: [
      { title: "山塘街夜游古运河路线", author: "愿使时光逆流", date: "2026-10-23", url: "https://www.xiaohongshu.com/explore/6adb195e000000002c03b6e2" },
      { title: "苏州七里山塘街/蓝调时刻", author: "云间行旅", date: "2026-10-08", url: "https://www.xiaohongshu.com/explore/6ac7735800000000150009f4" },
      { title: "来苏州山塘街会反复去打卡的9家好饭", author: "饼饼有礼", date: "2026-09-28", url: "https://www.xiaohongshu.com/explore/6ab9f7f2000000001a025c8f" },
    ],
    tiger_hill: [
      { title: "苏州景点纯主观评价（一）", author: "英俊哥", date: "2026-10-18", url: "https://www.xiaohongshu.com/explore/6ad4e765000000002600b7e7" },
      { title: "虎丘的秋天美爆了", author: "MelonSeeds", date: "2026-10-14", url: "https://www.xiaohongshu.com/explore/6acf5b4c000000000b005d2e" },
      { title: "苏州虎丘｜来苏州一定别错过的千年古迹", author: "hanhanhj", date: "2026-08-23", url: "https://www.xiaohongshu.com/explore/6a8aac1a00000000170019cb" },
    ],
    jinji_lake: [
      { title: "苏州｜金鸡湖月光码头，环湖步行必打卡日落", author: "YOLO", date: "2026-10-22", url: "https://www.xiaohongshu.com/explore/6ad9e11e000000002403ff3b" },
      { title: "东方之门｜金鸡湖大裤衩必拍机位", author: "Tu兔小婷爱拍照", date: "2026-10-16", url: "https://www.xiaohongshu.com/explore/6ad1ec61000000001c00f2b1" },
      { title: "蓝调时刻｜一框揽尽苏州金鸡湖暮色", author: "W J喜樂", date: "2026-09-24", url: "https://www.xiaohongshu.com/explore/6ab48e9e0000000013018a32" },
    ],
    xiyuan: [
      { title: "在西园寺吃素面看猫猫", author: "白白", date: "2026-10-23", url: "https://www.xiaohongshu.com/explore/6adac2cc000000003300b827" },
      { title: "西园寺的猫猫与素面", author: "月在回廊", date: "2026-10-23", url: "https://www.xiaohongshu.com/explore/6adab5a0000000002a01ef3a" },
      { title: "西园寺的面和咪", author: "有米有闲", date: "2026-10-10", url: "https://www.xiaohongshu.com/explore/6aca45d8000000000a025021" },
    ],
    night_garden: [
      { title: "夜游园林｜苏州网师园·姑苏月色落小园", author: "Blue Planet", date: "2026-10-13", url: "https://www.xiaohongshu.com/explore/6ace2d30000000001b030208" },
      { title: "辣评网师园夜游到底值不值120元", author: "乌龙茶真好喝", date: "2026-10-08", url: "https://www.xiaohongshu.com/explore/6ac739b70000000001009281" },
      { title: "网师园夜花园保姆式攻略", author: "虹羊羊", date: "2026-08-27", url: "https://www.xiaohongshu.com/explore/6a8fac62000000000700429c" },
    ],
    shuangta: [
      { title: "苏州本地人逛吃双塔市集vlog", author: "慕斯陪我做饭呀", date: "2026-10-06", url: "https://www.xiaohongshu.com/explore/6ac4e686000000001500e2fb" },
      { title: "去苏州一定要去双塔市集吃点吖", author: "小桃子fufu", date: "2026-09-15", url: "https://www.xiaohongshu.com/explore/6aa8dec4000000001103ba4f" },
      { title: "双塔市集｜吃了20年的豆腐花，还是那个味道", author: "酥饼兄在苏州", date: "2026-09-02", url: "https://www.xiaohongshu.com/explore/6a978fab000000001001e794" },
    ],
  };

  function postsFor(place) {
    if (!place) return [];
    if (place.posts) return place.posts;
    const experienceMap = {
      boat_pingjiang: "pingjiang",
      night_garden: "night_garden",
      hanfu: "pingjiang",
      xiyuan_slow: "xiyuan",
      shantang_boat: "shantang",
      jinji_sunset: "jinji_lake",
      market_graze: "shuangta",
    };
    const key = experienceMap[place.id] || place.id;
    return XHS_POSTS[key] || [];
  }

  const CHECKLIST = [
    {
      id: "museum",
      title: "苏州博物馆本馆 · 提前 7 天 08:00 抢票",
      note: "周一闭馆；16:00 停止入馆。约不上就改苏博西馆或耦园。",
      due: "提前 7 天 08:00",
      url: "https://www.szmuseum.com/Other/ReservationTip",
    },
    {
      id: "gardens",
      title: "拙政园 / 留园 · 提前 7 天实名预约",
      note: "分时段入园，带身份证原件；10 月属旺季。",
      due: "提前 7 天 00:00",
      url: "https://suzhou.bendibao.com/news/jingdianbao/",
    },
    {
      id: "student",
      title: "带学生证 · 园林学生票",
      note: "拙政园约 ¥45、虎丘约 ¥35、留园约 ¥27；以景区现场为准。",
      due: "出发前",
      url: "https://suzhou.bendibao.com/news/jingdianbao/",
    },
    {
      id: "night",
      title: "网师园夜花园（如选）· 提前 3–7 天",
      note: "官方公众号实名分时预约，¥120/人，园林卡不可用。",
      due: "提前 3–7 天",
      url: "http://m.suzhou.bendibao.com/cyfw/94508.shtm",
    },
    {
      id: "pingtan",
      title: "琵琶语评弹 · 确认吴亮莹场次",
      note: "老师不是每天在；票价约 ¥38–88，以现场为准。",
      due: "提前 1 天",
      url: "https://m.suzhou.bendibao.com/tour/ly129525.shtm",
    },
    {
      id: "dinner",
      title: "松鹤楼 / 悦山府 · 订临河 / 临湖位",
      note: "晚市 17:00 开餐；临水位最少，提前 1–3 天说清楚。",
      due: "提前 1–3 天",
      url: "https://m.ctrip.com/webapp/you/tripshoot/paipai/detail/detail?articleId=69040231",
    },
    {
      id: "apps",
      title: "下载苏 e 行 / 支付宝乘车码 + 高德",
      note: "苏州地铁公交都能刷；再备一个“美味不用等”排号。",
      due: "出发前",
      url: "https://www.amap.com/",
    },
  ];

  const ICONS = {
    clock: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>',
    pin: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s6-5.2 6-11a6 6 0 1 0-12 0c0 5.8 6 11 6 11Z"/><circle cx="12" cy="10" r="2.1"/></svg>',
    heart: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 4.9a5.2 5.2 0 0 0-7.4 0L12 6.3l-1.4-1.4a5.2 5.2 0 0 0-7.4 7.4L12 21l8.8-8.7a5.2 5.2 0 0 0 0-7.4Z"/></svg>',
    info: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M12 11v5M12 7.8v.2"/></svg>',
    ticket: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7.5A2.5 2.5 0 0 0 6.5 10h.2a2 2 0 0 1 0 4h-.2A2.5 2.5 0 0 0 4 16.5V20h16v-3.5a2.5 2.5 0 0 0-2.5-2.5h-.2a2 2 0 0 1 0-4h.2A2.5 2.5 0 0 0 20 7.5V4H4v3.5Z"/><path d="M9 4v16" stroke-dasharray="2 3"/></svg>',
    map: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 6 6-2 6 2 6-2v14l-6 2-6-2-6 2V6Z"/><path d="M9 4v14M15 6v14"/></svg>',
    nav: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m20 4-8.5 16-2-7-7-2L20 4Z"/></svg>',
    swap: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h13l-3-3M20 16H7l3 3"/></svg>',
    link: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 13.5 14 9.5M8.5 16H7a4 4 0 0 1 0-8h3M15.5 8H17a4 4 0 0 1 0 8h-3"/></svg>',
    walk: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="13" cy="5" r="1.8"/><path d="m11 21 1.5-6-3-2 1-5 3 2 3 1M9 21l1-4 3-2"/></svg>',
    taxi: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 16h14M6 16v2.5M18 16v2.5M4 12l2-5h12l2 5v4H4v-4Z"/><circle cx="7.5" cy="13.5" r=".8"/><circle cx="16.5" cy="13.5" r=".8"/></svg>',
    book: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h9a4 4 0 0 1 4 4v12H9a4 4 0 0 0-4 4V4Z"/><path d="M5 20a4 4 0 0 1 4-4h9"/></svg>',
    moon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 15.5A8 8 0 0 1 8.5 4 8.5 8.5 0 1 0 20 15.5Z"/></svg>',
    food: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3v8M5 3v5a2 2 0 0 0 4 0V3M7 11v10M16 3v18M16 3c3 1 4 4 4 7h-4"/></svg>',
  };

  const state = {
    preset: "couple",
    pace: "relaxed",
    food: "classic",
    experiences: ["boat", "pingtan", "sunset"],
    rainy: false,
    arrival: "10:30",
    departure: "20:40",
    station: "苏州站",
    startDate: "2026-10-27",
    endDate: "2026-10-28",
    overrides: {},
    day: 1,
    mapFilter: "day1",
    foodFilter: "all",
    foodLimit: FOOD_PAGE_SIZE,
    priceMin: null,
    priceMax: null,
    priceFallback: false,
    student: false,
    customCards: [],
    stays: [],
    sourceFilter: "全部",
    plan: null,
    budget: null,
    transit: null,
    planMeta: null,
    dateInfo: null,
  };

  // 高德公开瓦片是唯一底图；x/y/z 三个占位符缺一不可。
  const AMAP_URL = "https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}";
  const TILE_NOTICE_LIMIT = 3;
  const TILE_ERROR_LIMIT = 6;
  // 聚合层级点列表时，先放大再等 zoomend 的防抖重画；最多重试 4 次。
  const MARKER_RETRY_LIMIT = 4;
  const MARKER_RETRY_MS = 260;
  let map = null;
  let markerLayer = null;
  let routeLayer = null;
  let tileLayer = null;
  let mapTileErrors = 0;
  let mapFallbackOn = false;
  let mapVisible = false;
  let mapFitting = false;
  let mapZoomTimer = null;
  let mapFitTimer = null;
  const mapMarkers = new Map();
  let toastTimer = null;
  let sourceFoldWasOpen = false;
  let lastModalFocus = null;
  let railTick = false;

  // 尊重系统“减少动态效果”：JS 主动滚动时也不做平滑动画。
  function motionBehavior() {
    try {
      return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth";
    } catch (e) {
      return "smooth";
    }
  }

  const fmt = (m) => {
    const h = Math.floor(m / 60);
    const mm = Math.round(m % 60);
    return `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
  };
  const price = (n) => "¥" + Number(n).toLocaleString("zh-CN");
  const esc = (value) =>
    String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  function confidenceBadge(p) {
    const key = (p && p.confidence) || "none";
    const label = CONFIDENCE_LABEL[key] || CONFIDENCE_LABEL.none;
    return `<span class="confidence confidence--${key}">${label}</span>`;
  }

  function safeGet(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }
  function safeSet(key, value) {
    try { localStorage.setItem(key, value); } catch (e) { /* private mode */ }
  }
  function readJSON(key) {
    try { return JSON.parse(safeGet(key) || "null"); } catch (e) { return null; }
  }
  function numOrNull(value) {
    if (value == null || value === "") return null;
    const n = Number(value);
    return Number.isFinite(n) && n >= 0 ? Math.round(n) : null;
  }
  function normalizePriceRange(min, max) {
    const a = numOrNull(min);
    const b = numOrNull(max);
    if (a != null && b != null && a > b) return [b, a];
    return [a, b];
  }
  function isIsoDate(value) {
    return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ""));
  }
  function addDaysISO(iso, days) {
    const d = new Date(`${iso}T00:00:00Z`);
    if (Number.isNaN(d.getTime())) return "";
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
  }

  // 预订链接只允许 http/https：拒绝 javascript:、data: 等危险协议。
  function safeHttpUrl(value) {
    if (!value) return "";
    try {
      const u = new URL(value);
      return ["http:", "https:"].includes(u.protocol) ? u.href : "";
    } catch (e) {
      return "";
    }
  }

  function deriveAreaKey(text) {
    const raw = String(text || "");
    if (raw.includes("平江")) return "pingjiang";
    if (raw.includes("观前")) return "guanqian";
    if (raw.includes("山塘")) return "shantang";
    if (raw.includes("金鸡")) return "jinji";
    return "other";
  }

  function stayAreaText(stay) {
    const key = stay && AREA_LABELS[stay.areaKey] ? stay.areaKey : "other";
    const label = AREA_LABELS[key];
    const detail = String((stay && (stay.areaDetail || stay.area)) || "").trim();
    if (detail && detail !== label) return detail.includes(label) ? detail : `${label} · ${detail}`;
    return label;
  }

  function showToast(message) {
    const el = $("#toast");
    if (!el) return;
    el.textContent = message;
    el.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("is-visible"), 3200);
  }

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
    }
    return Promise.resolve(fallbackCopy(text));
  }
  function fallbackCopy(text) {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); } catch (e) { /* ignore */ }
    document.body.removeChild(ta);
  }

  function placeById(id) { return PLACE_MAP.get(id) || null; }

  function hasExp(key) { return state.experiences.includes(key); }

  /* =========================================================
     State / preferences
     ========================================================= */
  function validatePrefs(source) {
    if (!source || typeof source !== "object") return null;
    const out = {};
    if (source.preset && (DATA.presets[source.preset] || source.preset === "custom")) out.preset = source.preset;
    if (["relaxed", "balanced", "packed"].includes(source.pace)) out.pace = source.pace;
    if (Object.prototype.hasOwnProperty.call(FOOD_LABEL, source.food)) out.food = source.food;
    if (source.experiences != null) {
      const raw = Array.isArray(source.experiences)
        ? source.experiences
        : String(source.experiences).split(",");
      const valid = raw.filter((k) => EXP_OPTIONS.some((o) => o.key === k));
      out.experiences = Array.from(new Set(valid));
    }
    if (source.rainy != null) out.rainy = String(source.rainy) === "true" || source.rainy === true;
    if (ARRIVALS.includes(source.arrival)) out.arrival = source.arrival;
    if (DEPARTURES.includes(source.departure)) out.departure = source.departure;
    if (Object.prototype.hasOwnProperty.call(STATIONS, source.station)) out.station = source.station;
    if (isIsoDate(source.startDate || source.start)) out.startDate = source.startDate || source.start;
    if (isIsoDate(source.endDate || source.end)) out.endDate = source.endDate || source.end;
    if (source.overrides && typeof source.overrides === "object") {
      const overrides = {};
      Object.keys(PLANNER.SWAPS).forEach((key) => {
        const id = source.overrides[key];
        if (typeof id === "string" && PLACE_MAP.has(id)) overrides[key] = id;
      });
      out.overrides = overrides;
    }
    const [pmin, pmax] = normalizePriceRange(
      source.priceMin != null ? source.priceMin : source.pmin,
      source.priceMax != null ? source.priceMax : source.pmax
    );
    if (pmin != null) out.priceMin = pmin;
    if (pmax != null) out.priceMax = pmax;
    if (source.student === true || source.student === "1" || source.student === "true" || source.stu === "1") out.student = true;
    if (source.day === 1 || source.day === 2) out.day = source.day;
    if (source.mapFilter && ["day1", "day2", "all", "food", "experience"].includes(source.mapFilter)) out.mapFilter = source.mapFilter;
    return out;
  }

  function hydrateState(base, prefs) {
    if (!prefs) return base;
    const next = { ...base };
    if (prefs.preset && DATA.presets[prefs.preset]) {
      const preset = DATA.presets[prefs.preset];
      next.preset = prefs.preset;
      next.pace = preset.pace;
      next.food = preset.food;
      next.experiences = [...preset.experiences];
      next.rainy = !!preset.rainy;
      next.overrides = {};
    } else if (prefs.preset === "custom") {
      next.preset = "custom";
    }
    if (prefs.pace) next.pace = prefs.pace;
    if (prefs.food) next.food = prefs.food;
    if (prefs.experiences) next.experiences = [...prefs.experiences];
    if (prefs.rainy != null) next.rainy = prefs.rainy;
    if (prefs.arrival) next.arrival = prefs.arrival;
    if (prefs.departure) next.departure = prefs.departure;
    if (prefs.station) next.station = prefs.station;
    if (prefs.startDate) next.startDate = prefs.startDate;
    if (prefs.endDate) next.endDate = prefs.endDate;
    if (prefs.overrides) next.overrides = { ...prefs.overrides };
    if (prefs.priceMin != null) next.priceMin = prefs.priceMin;
    if (prefs.priceMax != null) next.priceMax = prefs.priceMax;
    if (prefs.student != null) next.student = !!prefs.student;
    if (prefs.day) next.day = prefs.day;
    if (prefs.mapFilter) next.mapFilter = prefs.mapFilter;
    if (next.experiences.includes("nightgarden")) next.experiences = next.experiences.filter((k) => k !== "pingtan");
    return next;
  }

  function loadInitialState() {
    let next = hydrateState(state, { preset: "couple" });
    const saved = validatePrefs(readJSON("gusu.state.v1"));
    if (saved) next = hydrateState(next, saved);
    const params = new URLSearchParams(location.search);
    if (Array.from(params.keys()).length) {
      const raw = {
        preset: params.get("preset"),
        pace: params.get("pace"),
        food: params.get("food"),
        experiences: params.has("exp") ? params.get("exp") : undefined,
        rainy: params.get("rainy"),
        arrival: params.get("arr"),
        departure: params.get("dep"),
        station: params.get("station"),
        startDate: params.get("start"),
        endDate: params.get("end"),
        pmin: params.get("pmin"),
        pmax: params.get("pmax"),
        stu: params.get("stu"),
      };
      next = hydrateState(next, validatePrefs(raw));
    }
    return next;
  }

  function saveState() {
    safeSet("gusu.state.v1", JSON.stringify({
      preset: state.preset,
      pace: state.pace,
      food: state.food,
      experiences: state.experiences,
      rainy: state.rainy,
      arrival: state.arrival,
      departure: state.departure,
      station: state.station,
      startDate: state.startDate,
      endDate: state.endDate,
      overrides: state.overrides,
      priceMin: state.priceMin,
      priceMax: state.priceMax,
      student: state.student,
      day: state.day,
      mapFilter: state.mapFilter,
    }));
  }

  function shareUrl() {
    const q = new URLSearchParams();
    q.set("preset", state.preset);
    q.set("pace", state.pace);
    q.set("food", state.food);
    q.set("exp", state.experiences.join(","));
    q.set("arr", state.arrival);
    q.set("dep", state.departure);
    q.set("station", state.station);
    q.set("start", state.startDate);
    q.set("end", state.endDate);
    q.set("rainy", String(state.rainy));
    if (state.priceMin != null) q.set("pmin", String(state.priceMin));
    if (state.priceMax != null) q.set("pmax", String(state.priceMax));
    q.set("stu", state.student ? "1" : "0");
    return location.href.split("?")[0] + "?" + q.toString();
  }

  /* =========================================================
     Itinerary rendering helpers
     ========================================================= */
  function blockPriceText(b, p) {
    if (b.placeId === "xiyuan") return "门票 ¥5 + 素面 ¥15";
    if (b.placeId === "shuangta") return `摊位人均约 ¥${b.costOverride == null ? 50 : b.costOverride}`;
    if (b.placeId === "pingjiang" && b.costOverride) return `含船 ¥${b.costOverride}/人`;
    if (b.costOverride != null && p.kind === "food") return `约 ¥${b.costOverride}/人`;
    if (p.studentPrice != null) {
      return state.student
        ? `学生 ¥${p.studentPrice}`
        : `${p.priceLabel} · 学生 ¥${p.studentPrice}`;
    }
    return p.priceLabel;
  }

  /* =========================================================
     Controls
     ========================================================= */
  function renderPresets() {
    $("#presetRow").innerHTML = Object.values(DATA.presets).map((p) => {
      const active = state.preset === p.id ? " is-active" : "";
      return `<button type="button" class="preset${active}" data-preset="${p.id}" aria-pressed="${state.preset === p.id}">
        <em>PRESET</em>
        <b>${esc(p.name)}</b>
        <span>${esc(p.desc)}</span>
      </button>`;
    }).join("");
  }

  function renderExperienceChips() {
    $("#experienceControl").innerHTML = EXP_OPTIONS.map((o) => {
      const active = hasExp(o.key);
      const infeasible = o.key === "sunset" && active && state.planMeta && state.planMeta.sunsetFits === false;
      const note = infeasible ? "本次赶不上" : o.note;
      return `<button type="button" class="chip${active ? " is-active" : ""}${infeasible ? " is-warning" : ""}" data-exp="${o.key}" aria-pressed="${active}" title="${esc(o.label)} ${esc(note)}">
        ${esc(o.label)}<small>${esc(note)}</small>
      </button>`;
    }).join("");
  }

  function fillSelect(el, values, selected) {
    el.innerHTML = values.map((v) => `<option value="${esc(v.value)}">${esc(v.label)}</option>`).join("");
    el.value = selected;
  }

  function renderSelects() {
    fillSelect($("#arrivalSelect"), ARRIVALS.map((v) => ({ value: v, label: `${v} 到苏州站` })), state.arrival);
    fillSelect($("#departureSelect"), DEPARTURES.map((v) => ({ value: v, label: `${v} 发车` })), state.departure);
    fillSelect($("#stationSelect"), Object.keys(STATIONS).map((k) => ({ value: k, label: `${STATIONS[k].short} · ${STATIONS[k].note}` })), state.station);
  }

  function syncControls() {
    renderPresets();
    renderExperienceChips();
    renderPricePresets();
    syncPriceInputs();
    $$("#paceControl button").forEach((b) => {
      const on = b.dataset.pace === state.pace;
      b.classList.toggle("is-active", on);
      b.setAttribute("aria-pressed", String(on));
    });
    $$("#foodControl button").forEach((b) => {
      const on = b.dataset.food === state.food;
      b.classList.toggle("is-active", on);
      b.setAttribute("aria-pressed", String(on));
    });
    $("#arrivalSelect").value = state.arrival;
    $("#departureSelect").value = state.departure;
    $("#stationSelect").value = state.station;
    const studentToggle = $("#studentToggle");
    if (studentToggle) studentToggle.checked = !!state.student;
    const expLabels = state.experiences
      .map((k) => (EXP_OPTIONS.find((o) => o.key === k) || {}).label)
      .filter(Boolean);
    updateGeneratorHint();
  }

  /* =========================================================
     Render itinerary
     ========================================================= */
  function planDay(n) {
    return state.plan.days.find((d) => d.day === n) || state.plan.days[0];
  }

  function renderDayTabs() {
    $("#dayTabs").innerHTML = state.plan.days.map((d) => {
      const active = d.day === state.day;
      const short = d.title.split(" · ")[0];
      const meta = [
        d.date ? d.date.slice(5).replace("-", ".") : "",
        d.weekday || "",
        d.day === 1 ? "古城东" : "古城西 → 湖东",
      ].filter(Boolean).join(" · ");
      return `<button type="button" id="dayTab-${d.day}" class="day-tab${active ? " is-active" : ""}" role="tab" aria-selected="${active}" aria-controls="timeline" tabindex="${active ? "0" : "-1"}" data-day="${d.day}">
        <b>0${d.day}</b>
        <span><strong>${esc(short)}</strong><small>${esc(meta)}</small></span>
      </button>`;
    }).join("");
    // 时间线是当前 tab 的 panel；id 稳定，读屏能对上“第几天”。
    const panel = $("#timeline");
    if (panel) {
      panel.setAttribute("role", "tabpanel");
      panel.setAttribute("aria-labelledby", `dayTab-${state.day}`);
    }
  }

  function renderTimeline() {
    const day = planDay(state.day);
    const html = day.blocks.map((b) => {
      if (b.type === "place") return renderPlaceBlock(b);
      if (b.type === "custom") return renderCustomBlock(b);
      return renderCompactBlock(b);
    }).join("");
    $("#timeline").innerHTML = html || '<p class="tiny">没有可显示的行程。</p>';
    const expandBtn = $("#btnExpandAll");
    if (expandBtn) {
      expandBtn.textContent = "展开全部";
      expandBtn.dataset.open = "false";
    }
  }

  function renderCustomBlock(b) {
    const warnings = b.warnings && b.warnings.length
      ? `<div class="tl-warning">${b.warnings.map((w) => `<p>${esc(w)}</p>`).join("")}</div>`
      : "";
    const place = b.placeId ? placeById(b.placeId) : null;
    const linkLine = b.placeId
      ? `<p class="tl-sub">已关联：${esc((place && place.name) || b.placeId)}</p>`
      : '<p class="tl-sub">未关联地图点位，只进时间线与预算。</p>';
    return `<div class="tl-row tl-row--custom">
      <div class="tl-time">${fmt(b.start)}<small>${fmt(b.end)}</small></div>
      <div class="tl-rail"><span class="tl-dot tl-dot--custom"></span></div>
      <article class="tl-card tl-card--custom" id="custom-${esc(b.customId)}" data-custom-id="${esc(b.customId)}">
        ${warnings}
        <div class="tl-card-head">
          <div>
            <div class="tl-labels"><span class="tag tag--gold">${CARD_KIND_LABELS[b.kind] || "自定义"}</span><span class="tag tag--ink">手动添加</span></div>
            <h3>${esc(b.title)}</h3>
            ${b.address ? `<p class="tl-sub">${esc(b.address)}</p>` : ""}
            ${linkLine}
          </div>
          <div class="tl-head-actions">
            <button type="button" class="swap-btn" data-edit-custom="${esc(b.customId)}">编辑</button>
            <button type="button" class="swap-btn" data-delete-custom="${esc(b.customId)}">删除</button>
          </div>
        </div>
        <div class="tl-meta">
          ${b.price ? `<span>${ICONS.ticket} 约 ¥${b.price}/人</span>` : ""}
          <span>${ICONS.clock} ${b.end - b.start} 分钟</span>
        </div>
        ${b.note ? `<p class="tl-summary">${esc(b.note)}</p>` : ""}
      </article>
    </div>`;
  }

  function renderCompactBlock(b) {
    const isMove = b.type === "move";
    const icon = isMove
      ? (b.mode === "taxi" ? ICONS.taxi : ICONS.walk)
      : b.variant === "night"
        ? ICONS.moon
        : b.variant === "station"
          ? ICONS.book
          : ICONS.clock;
    return `<div class="tl-row tl-row--${isMove ? "move" : "note"}">
      <div class="tl-time">${fmt(b.start)}<small>${fmt(b.end)}</small></div>
      <div class="tl-rail"><span class="tl-dot"></span></div>
      <div class="tl-card tl-card--compact">
        <div class="tl-labels"><span class="tag ${isMove ? "tag--ink" : "tag--gold"}">${isMove ? (b.mode === "taxi" ? "打车" : "步行") : "安排"}</span></div>
        <h3>${icon} ${esc(b.title)}</h3>
        <p>${esc(b.detail)}</p>
      </div>
    </div>`;
  }

  function renderPlaceBlock(b) {
    const p = placeById(b.placeId);
    if (!p) return "";
    const food = b.foodId ? placeById(b.foodId) : p.kind === "food" ? p : null;
    const isFood = !!food || !!b.meal;
    const title = b.title || p.name;
    const duration = b.end - b.start;
    const priceText = blockPriceText(b, p);
    const swap = b.swapKey
      ? `<button type="button" class="swap-btn" data-swap-key="${b.swapKey}" data-current="${p.id}" title="换一个同类型的备选">换一个 ↻</button>`
      : "";
    const tags = [];
    if (b.meal) tags.push(`<span class="tag tag--red">${MEAL_LABEL[b.meal] || "吃"}</span>`);
    if (p.kind === "experience") tags.push('<span class="tag tag--gold">体验</span>');
    if (p.kind === "spot") tags.push('<span class="tag">停留</span>');
    if (p.kind === "food") tags.push('<span class="tag tag--gold">食单</span>');
    p.tags.slice(0, 2).forEach((t) => tags.push(`<span class="tag tag--ink">${esc(t)}</span>`));

    const booking = p.booking
      ? `<span>${ICONS.ticket} 预约：${esc(p.booking.deadline)}</span>`
      : "";
    const quoteTarget = food || (p.kind === "experience" ? p : null) || (b.foodIds ? p : null);
    const quote = quoteTarget && quoteTarget.review
      ? `<div class="tl-quote">${quoteTarget.review.summary ? esc(quoteTarget.review.quote) : `“${esc(quoteTarget.review.quote)}”`}<small>${quoteTarget.review.summary ? "口碑摘要" : "评价"} · ${esc(quoteTarget.review.by)} · <a href="${quoteTarget.review.url}" target="_blank" rel="noopener">${quoteTarget.review.summary ? "平台" : "原文"}</a></small></div>`
      : "";
    const signatures = food && food.signature
      ? `<div class="sig-row">${food.signature.map((s) => `<span class="sig">${esc(s)}</span>`).join("")}</div>`
      : "";
    const posts = postsFor(p);
    const postLinks = posts.length
      ? `<div class="tl-posts"><b>小红书笔记</b><div>${posts.map((post) => `<a href="${post.url}" target="_blank" rel="noopener">${esc(post.title)}<small>${esc(post.author)} · ${esc(post.date)}</small></a>`).join("")}</div></div>`
      : "";

    let stalls = "";
    if (b.foodIds && b.foodIds.length) {
      stalls = `<div class="tl-stalls">${b.foodIds.map((id) => {
        const s = placeById(id);
        return s ? `<span><b>${esc(s.name.replace("（双塔市集店）", ""))}</b>${esc((s.signature || [""])[0])}</span>` : "";
      }).join("")}</div>`;
    }

    const actions = [];
    if (p.kind === "food" || food) {
      actions.push(`<a class="link-btn link-btn--red" href="${(food || p).links.dianping}" target="_blank" rel="noopener">${ICONS.link} 点评搜索</a>`);
      actions.push(`<a class="link-btn" href="${(food || p).links.meituan}" target="_blank" rel="noopener">${ICONS.link} 美团搜索</a>`);
    } else if (p.booking && p.booking.url) {
      const bookingLabel = p.confidence === "official" ? "预约 / 官方" : "预约 / 票务信息";
      actions.push(`<a class="link-btn link-btn--red" href="${p.booking.url}" target="_blank" rel="noopener">${ICONS.ticket} ${bookingLabel}</a>`);
    }
    if (p.kind === "experience" && p.links) {
      actions.push(`<a class="link-btn" href="${p.links.dianping}" target="_blank" rel="noopener">${ICONS.link} 点评搜索</a>`);
    }
    if (b.foodIds) {
      actions.push(`<button type="button" class="link-btn" data-scroll-food="shuangta">${ICONS.food} 去食单看三摊</button>`);
    }
    actions.push(`<button type="button" class="link-btn" data-map-place="${p.id}">${ICONS.map} 地图</button>`);
    actions.push(`<a class="link-btn" href="${p.links.amap}" target="_blank" rel="noopener">${ICONS.nav} 高德导航</a>`);

    return `<div class="tl-row">
      <div class="tl-time">${fmt(b.start)}<small>${fmt(b.end)}</small></div>
      <div class="tl-rail"><span class="tl-dot"></span></div>
      <article class="tl-card tl-card--collapsible" id="tl-place-${p.id}" data-timeline-place="${p.id}">
        <div class="tl-card-head">
          <div>
            <div class="tl-labels">${tags.join("")}${confidenceBadge(p)}</div>
            <h3>${esc(title)}<span class="name-en">${esc(p.label || "")}</span></h3>
            <p class="tl-sub">${esc(p.areaLabel)} · ${esc(p.address)}</p>
          </div>
          <div class="tl-head-actions">
            ${swap}
            <button type="button" class="swap-btn tl-toggle" data-toggle-detail aria-expanded="false">详情 ↓</button>
          </div>
        </div>
        <div class="tl-meta">
          <span>${ICONS.ticket} ${esc(priceText)}</span>
          <span>${ICONS.clock} ${duration} 分钟</span>
          ${booking}
        </div>
        <div class="tl-detail" hidden>
          <p class="tl-summary">${esc(p.summary)}</p>
          ${stalls}
          ${signatures}
          ${quote}
          ${postLinks}
          <div class="tl-note tl-note--warm">${ICONS.heart}<span><b>TA 会喜欢：</b>${esc(p.couple)}</span></div>
          <div class="tl-note">${ICONS.info}<span><b>预约 / 避坑：</b>${esc(p.tip)}${b.note ? " " + esc(b.note) : ""}</span></div>
          <div class="tl-actions">${actions.join("")}</div>
        </div>
      </article>
    </div>`;
  }

  function renderAside() {
    const day = planDay(state.day);
    const placeBlocks = day.blocks.filter((b) => b.type === "place");
    const unique = [];
    const seen = new Set();
    placeBlocks.forEach((b) => {
      if (seen.has(b.placeId)) return;
      seen.add(b.placeId);
      unique.push(b);
    });
    const costs = PLANNER.computeDayBudget(day);
    const hours = unique.reduce((sum, b) => sum + (b.end - b.start), 0) / 60;
    const walk = state.pace === "packed" ? "1.8 万步" : state.pace === "balanced" ? "1.6 万步" : "1.4 万步";
    const booking = day.day === 1
      ? "苏博提前 7 天 08:00；拙政园提前 7 天；评弹/夜花园提前 1–7 天。"
      : "留园/虎丘提前 7 天；湖边晚餐订临湖位；返程票留 40 分钟缓冲。";
    const highlights = unique.slice(0, 4).map((b) => {
      const p = placeById(b.placeId);
      return p ? `<li><b>${fmt(b.start)}</b><span>${esc(p.short || p.name)}</span></li>` : "";
    }).join("");

    $("#dayAside").innerHTML = `
      <div class="aside-day">
        <div><b>0${day.day}</b><span>DAY ${day.day}<br>${esc(day.weekday || "")}</span></div>
        <div class="stamp">${day.day === 1 ? "古城东" : "古城西"}</div>
      </div>
      <h3 class="aside-title">${esc(day.title.split(" · ")[0])}</h3>
      <p class="aside-sub">${esc(day.summary)}</p>
      <ul class="aside-list">${highlights}</ul>
      <div class="aside-stats">
        <div><span>停留点</span><b>${unique.length} 处</b></div>
        <div><span>今日步行</span><b>约 ${walk}</b></div>
        <div><span>门票</span><b>¥${costs.ticket}</b></div>
        <div><span>用餐</span><b>${unique.filter((b) => b.meal || b.foodId || b.placeId === "shuangta").length} 顿</b></div>
      </div>
      <div class="aside-book"><span>今天要订</span><p>${booking}</p></div>
      ${day.warnings && day.warnings.length ? `<div class="aside-warning">${day.warnings.map((w) => `<p>${esc(w)}</p>`).join("")}</div>` : ""}
      <p class="tiny" style="margin-top:14px">时间可前后浮动 20–30 分钟；别为了表格错过一家店。</p>
    `;
  }

  /* =========================================================
     Result / budget
     ========================================================= */
  function renderResult() {
    const hasNight = hasExp("nightgarden");
    const hasPingtan = hasExp("pingtan") && !hasNight;
    const booking = hasNight
      ? "苏博 + 园林 + 夜花园"
      : hasPingtan
        ? "苏博 + 园林 + 评弹"
        : "苏博 + 园林";
    $("#resultRoute").textContent = state.pace === "packed" ? "D1 古城东 + 狮子林 · D2 古城西 → 湖东" : "D1 古城东 · D2 古城西 → 湖东";
    $("#resultWalk").textContent = `约 ${state.pace === "packed" ? "1.8" : state.pace === "balanced" ? "1.6" : "1.4"} 万步 / 天`;
    $("#resultBudget").textContent = `${price(state.budget.perPerson)} / 人`;
    $("#resultBooking").textContent = booking;
    updateGeneratorHint();
    renderResultHero();
  }

  function renderResultHero() {
    if (!state.plan || !state.plan.days || !state.plan.days.length) return;
    const meta = state.planMeta || {};
    const day1 = state.plan.days[0];
    const day2 = state.plan.days[1];
    const budget = state.budget || { rows: {}, perPerson: 0, perPersonWithStay: 0 };
    const budgetRows = budget.rows || {};
    const infoDays = (meta.dates && meta.dates.days) || [];
    const md1 = (infoDays[0] && infoDays[0].md) || (day1.date ? day1.date.slice(5).replace("-", ".") : "");
    const md2 = (infoDays[1] && infoDays[1].md) || (day2.date ? day2.date.slice(5).replace("-", ".") : "");
    const base = meta.base || {};
    const baseLabel = meta.baseEstimated
      ? base.stay
        ? `${base.stay.name} · ${base.label || "平江路"}（估算）`
        : `${base.label || "平江路"}（估算）`
      : `${base.name || "未设住宿"} · ${base.label || "按平江路估算"}`;

    const titleEl = $("#resultTitle");
    if (titleEl) {
      const title1 = String(day1.title || "").split(" · ")[0];
      const title2 = String(day2.title || "").split(" · ")[0];
      titleEl.innerHTML = `${esc(title1)}<em>，${esc(title2)}</em>`;
    }
    const subEl = $("#resultSub");
    if (subEl) {
      subEl.textContent = `${md1} ${day1.weekday || ""} → ${md2} ${day2.weekday || ""} · ${PACE_LABEL[state.pace]} · ${state.student ? "学生票" : "成人票"}`;
    }
    const rationaleEl = $("#resultRationale");
    if (rationaleEl) {
      rationaleEl.innerHTML = [
        "<span>为什么这样排</span>",
        ...(day1.rationale || []).map((r) => `<p>${esc(r)}</p>`),
        ...(day2.rationale || []).map((r) => `<p>${esc(r)}</p>`),
      ].join("");
    }
    const warnings = Array.from(new Set([
      ...(meta.dateWarnings || []),
      ...(meta.customWarnings || []),
      ...(meta.stayWarnings || []),
      ...(day1.warnings || []),
      ...(day2.warnings || []),
    ]));
    const warningBox = $("#resultWarnings");
    if (warningBox) {
      // 先显示再写入，让 aria-live 区域真正收到内容变化。
      if (warnings.length) {
        warningBox.hidden = false;
        warningBox.innerHTML = `<b>需要留意</b>${warnings.map((w) => `<p>${esc(w)}</p>`).join("")}`;
      } else {
        warningBox.innerHTML = "";
        warningBox.hidden = true;
      }
    }
    const tripCard = $("#resultTripCard");
    if (tripCard) {
      tripCard.innerHTML = `
        <div class="tripcard-head"><span>TRIP CARD</span><span class="stamp">两日</span></div>
        <dl>
          <div><dt>日期</dt><dd>${md1} — ${md2}</dd></div>
          <div><dt>星期</dt><dd>${esc(day1.weekday || "")} — ${esc(day2.weekday || "")}</dd></div>
          ${state.experiences.includes("sunset") && meta.sunset ? `<div><dt>日落</dt><dd>${esc(meta.sunset)} · 金鸡湖${meta.sunsetFits === false ? "（赶不上返程）" : ""}</dd></div>` : ""}
          <div><dt>同行</dt><dd>情侣 · 2 人</dd></div>
          <div><dt>到达</dt><dd>${esc(state.arrival)} · ${esc(state.station)}</dd></div>
          <div><dt>返程</dt><dd>${esc(state.departure)} · ${esc(state.station)}</dd></div>
          <div><dt>住宿</dt><dd>${esc(baseLabel)}</dd></div>
          <div><dt>人均</dt><dd>${price(budget.perPerson)}${budgetRows.stay ? ` / 含住宿 ${price(budget.perPersonWithStay)}` : ""}</dd></div>
        </dl>
        <p class="tiny">数据基准 2026-10 · 地图点位为行程示意</p>
      `;
    }
  }

  function renderBudget() {
    const b = state.budget;
    if (!b) return;
    const rows = [
      ["门票", b.rows.ticket, "含寺院香火券"],
      ["餐饮", b.rows.food, "正餐与小食"],
      ["体验", b.rows.exp, "船 / 评弹 / 汉服 / 夜游"],
      ["自定义", b.rows.custom, "手动卡片（按人均）"],
      ["市内交通", b.rows.transit, "打车分摊 + 公交预留"],
      ["小吃预留", b.rows.buffer, "饮料 / 临时加餐"],
      ["住宿", b.rows.stay, b.stayMissing ? "基地住宿未填价格" : "手动填写的基地住宿"],
    ];
    const always = new Set(["门票", "市内交通", "住宿"]);
    $("#budgetRows").innerHTML = rows
      .filter(([label, value]) => always.has(label) || (Number(value) || 0) > 0)
      .map(([label, value, note]) => `
      <div class="budget-row"><span>${label} <small>· ${note}</small></span><b>${price(Number(value) || 0)}</b></div>
    `).join("");
    $("#budgetTotal").textContent = price(b.total);
    $("#budgetNote").textContent = b.rows.stay
      ? `人均 ${price(b.perPerson)}（不含住宿）· 两人不含住宿 ${price(b.total)} · 含住宿合计 ${price(b.totalWithStay)}`
      : `人均 ${price(b.perPerson)}（不含住宿）· 两人不含住宿 ${price(b.total)}；未添加住宿基地价格，住宿未计入。`;
  }

  function updateDateUI() {
    const info = PLANNER.dateInfo({
      start: state.startDate,
      end: state.endDate,
      baseline: "2026-10-23",
      now: new Date().toISOString().slice(0, 10),
    });
    state.dateInfo = info;
    const dayA = info.days[0];
    const dayB = info.days[1];
    const heroDates = $("#heroDates");
    if (heroDates) heroDates.textContent = `${dayA.md} — ${dayB.md}`;
    const railDates = $("#railDates");
    if (railDates) railDates.innerHTML = `${dayA.md} <span>—</span> ${dayB.md}`;
    const heroSub = $("#heroWeekday");
    if (heroSub) heroSub.textContent = `${dayA.weekday}出发 · ${dayB.weekday}夜归 · 2 人`;
    const railSub = $("#railWeekday");
    if (railSub) railSub.textContent = `${dayA.weekday}出发 · ${dayB.weekday}夜归 · 2 人`;
    const dateInput = $("#startDate");
    const endInput = $("#endDate");
    if (dateInput) dateInput.value = info.start;
    if (endInput) endInput.value = info.end;
    const fountainText = info.fountain.available
      ? `返程日（${dayB.weekday}）金鸡湖喷泉 19:30 开放（以现场为准）。`
      : `返程日（${dayB.weekday}）没有金鸡湖音乐喷泉，不要为它卡行程。`;
    const noteText = `${info.start} 是${dayA.weekday}，${info.end} 是${dayB.weekday}。${dayB.sunset ? `日落约 ${dayB.sunset}（金鸡湖）。` : ""}${fountainText}${info.stale ? " 信息基准为 2026-10，请复核票价与预约。" : ""}`;
    const note = $("#dateCheckText");
    // 只在文本真正变化时写入：筛价位/改节奏也会 generate，避免反复触发 live region。
    if (note && note.textContent !== noteText) note.textContent = noteText;
    const sourceNote = $("#dateCheckSource");
    if (sourceNote && sourceNote.textContent !== noteText) sourceNote.textContent = noteText;
  }

  /* =========================================================
     Food / experiences / sources / checklist
     ========================================================= */
  function priceRangeLabel() {
    if (state.priceMin == null && state.priceMax == null) return "不限";
    if (state.priceMin != null && state.priceMax != null) return `¥${state.priceMin}–${state.priceMax}`;
    if (state.priceMax != null) return `≤¥${state.priceMax}`;
    return `≥¥${state.priceMin}`;
  }

  function inPrice(food) {
    if (!food || typeof food.price !== "number") return true;
    if (state.priceMin != null && food.price < state.priceMin) return false;
    if (state.priceMax != null && food.price > state.priceMax) return false;
    return true;
  }

  function foodCategory(food) {
    return food.category || LEGACY_FOOD_CATEGORY[food.id] || "main";
  }

  function filteredFoods() {
    return DATA.foods.filter((f) => (state.foodFilter === "all" || foodCategory(f) === state.foodFilter) && inPrice(f));
  }

  function pricePresetActive(preset) {
    return state.priceMin === preset.min && state.priceMax === preset.max;
  }

  function renderPricePresets() {
    const html = PRICE_PRESETS.map((p) => {
      const active = pricePresetActive(p);
      return `<button type="button" class="chip price-chip${active ? " is-active" : ""}" data-price-preset="${p.id}" aria-pressed="${active}">${p.label}</button>`;
    }).join("");
    ["#pricePresets", "#foodPricePresets"].forEach((sel) => {
      const el = $(sel);
      if (el) el.innerHTML = html;
    });
  }

  function syncPriceInputs() {
    const pairs = [["#priceMin", "#priceMax"], ["#foodPriceMin", "#foodPriceMax"]];
    pairs.forEach(([minSel, maxSel]) => {
      const minEl = $(minSel);
      const maxEl = $(maxSel);
      if (minEl && document.activeElement !== minEl) minEl.value = state.priceMin == null ? "" : state.priceMin;
      if (maxEl && document.activeElement !== maxEl) maxEl.value = state.priceMax == null ? "" : state.priceMax;
    });
  }

  function setPriceRange(min, max, fromInput) {
    const rawMin = numOrNull(min);
    const rawMax = numOrNull(max);
    const swapped = rawMin != null && rawMax != null && rawMin > rawMax;
    const [a, b] = normalizePriceRange(min, max);
    state.priceMin = a;
    state.priceMax = b;
    state.foodLimit = FOOD_PAGE_SIZE;
    renderPricePresets();
    syncPriceInputs();
    renderFoodFilters();
    renderFoodGrid();
    if (state.mapFilter === "food") renderMap();
    updateGeneratorHint();
    renderRail();
    if (fromInput && swapped) showToast("价位已自动按小到大排序。");
  }

  function updateGeneratorHint() {
    const expLabels = state.experiences
      .map((k) => (EXP_OPTIONS.find((o) => o.key === k) || {}).label)
      .filter(Boolean);
    const priceText = state.priceMin == null && state.priceMax == null ? "" : ` · 人均 ${priceRangeLabel()}`;
    const fallback = state.priceFallback ? " · 部分餐位保留默认" : "";
    const student = state.student ? " · 学生票" : "";
    const hint = $("#generatorHint");
    if (hint) hint.textContent = `${PACE_LABEL[state.pace]} · ${FOOD_LABEL[state.food]}${priceText}${student} · ${expLabels.length ? expLabels.join(" + ") : "不额外安排体验"}${fallback}`;
  }

  function renderFoodFilters() {
    const total = DATA.foods.filter(inPrice).length;
    $("#foodFilters").innerHTML = FOOD_FILTERS.map(([key, label]) => {
      const count = key === "all"
        ? total
        : DATA.foods.filter((f) => foodCategory(f) === key && inPrice(f)).length;
      return `<button type="button" class="food-filter${state.foodFilter === key ? " is-active" : ""}" data-food-filter="${key}">${label}<small>${count}</small></button>`;
    }).join("");
  }

  function renderFoodGrid() {
    const list = filteredFoods();
    const visible = list.slice(0, state.foodLimit);
    $("#foodGrid").innerHTML = visible.map((f) => {
      const tags = [];
      if (f.ratingNote) tags.push(`<span class="tag tag--red">${esc(f.ratingNote)}</span>`);
      f.tags.slice(0, 2).forEach((t) => tags.push(`<span class="tag tag--ink">${esc(t)}</span>`));
      const quote = f.review.summary
        ? `<p>${esc(f.review.quote)}</p>`
        : `<p>“${esc(f.review.quote)}”</p>`;
      return `<article class="food-card" id="food-${f.id}" data-food-card="${f.id}">
        <div class="food-top">
          <div>
            <div class="food-kicker">${tags.join("")}${confidenceBadge(f)}</div>
            <h3>${esc(f.name)}<span>${esc(f.label)}</span></h3>
          </div>
          <span class="food-price">${esc(f.priceLabel)}</span>
        </div>
        <p class="food-loc">${ICONS.pin} ${esc(f.areaLabel)} · ${esc(f.address)}</p>
        <p class="food-summary">${esc(f.summary)}</p>
        <div class="sig-row">${f.signature.map((s) => `<span class="sig">${esc(s)}</span>`).join("")}</div>
        <div class="food-quote">
          ${quote}
          <small>${f.review.summary ? "口碑摘要" : "评价"} · ${esc(f.review.by)} · <a href="${f.review.url}" target="_blank" rel="noopener">${f.review.summary ? "平台" : "原文"}</a></small>
        </div>
        <p class="food-tip"><b>点单/避坑：</b>${esc(f.tip)}</p>
        <div class="food-links">
          <a class="link-btn link-btn--red" href="${f.links.dianping}" target="_blank" rel="noopener">${ICONS.link} 点评搜索</a>
          <a class="link-btn" href="${f.links.meituan}" target="_blank" rel="noopener">${ICONS.link} 美团搜索</a>
          <button type="button" class="link-btn" data-map-place="${f.id}">${ICONS.map} 地图</button>
          <button type="button" class="link-btn" data-add-food-card="${f.id}">＋ 加入行程</button>
        </div>
      </article>`;
    }).join("") || '<p class="tiny food-empty">这个分类/价位暂时没有收录，换个价位试试。</p>';
    const more = Math.max(0, list.length - visible.length);
    $("#foodCount").textContent = `共 ${list.length} 家 · 已显示 ${visible.length} 家${state.priceMin != null || state.priceMax != null ? ` · 人均 ${priceRangeLabel()}` : ""}`;
    const load = $("#foodLoadMore");
    load.hidden = more <= 0;
    load.textContent = more > 0 ? `再看 ${Math.min(FOOD_PAGE_SIZE, more)} 家` : "";
  }

  function renderExperiences() {
    $("#experienceGrid").innerHTML = DATA.experiences.map((e, i) => {
      const key = EXP_TOGGLE[e.id];
      const active = key ? hasExp(key) : false;
      const infeasible = key === "sunset" && active && state.planMeta && state.planMeta.sunsetFits === false;
      const fixed = e.id === "xiyuan_slow" || e.id === "shantang_boat";
      const toggle = key
        ? `<button type="button" class="link-btn${active ? " link-btn--red" : ""}" data-exp-toggle="${key}" aria-pressed="${active}">${active ? (infeasible ? "已加入 · 本次赶不上" : "已在行程") : "加入行程"}</button>`
        : `<span class="link-btn is-fixed">${fixed ? "默认 / 现场" : "可选"}</span>`;
      const posts = postsFor(e);
      return `<article class="exp-card" id="exp-${e.id}" data-exp-card="${e.id}">
        <div class="exp-index">0${i + 1}</div>
        <div class="exp-body">
          <h3>${esc(e.name)}</h3>
          <p class="exp-label">${esc(e.label)} · ${esc(e.areaLabel)}</p>
          <p>${esc(e.summary)}</p>
          <div class="exp-meta"><b>${esc(e.priceLabel)}</b><span>${e.durationMin} 分钟</span><span>${esc(e.tags.slice(0, 2).join(" · "))}</span></div>
          <p class="exp-couple">${ICONS.heart} ${esc(e.couple)}</p>
          <p class="tiny" style="margin-top:8px">${esc(e.tip)}</p>
          <div class="exp-links">
            ${toggle}
            <button type="button" class="link-btn" data-map-place="${e.id}">${ICONS.map} 地图</button>
            <a class="link-btn" href="${e.review.url}" target="_blank" rel="noopener">${ICONS.link} 口碑出处</a>
          </div>
          ${posts.length ? `<div class="exp-posts"><b>小红书笔记</b>${posts.slice(0, 2).map((post) => `<a href="${post.url}" target="_blank" rel="noopener">${esc(post.title)}<small>${esc(post.author)} · ${esc(post.date)}</small></a>`).join("")}</div>` : ""}
        </div>
      </article>`;
    }).join("");
  }

  function renderSourceFilters() {
    const groups = ["全部", ...Array.from(new Set(DATA.sources.map((s) => s.group)))];
    $("#sourceTools").innerHTML = groups.map((g) =>
      `<button type="button" class="source-filter${state.sourceFilter === g ? " is-active" : ""}" data-source-filter="${esc(g)}">${esc(g)}</button>`
    ).join("");
  }

  function renderSources() {
    const list = DATA.sources.filter((s) => state.sourceFilter === "全部" || s.group === state.sourceFilter);
    const count = $("#sourceCount");
    if (count) count.textContent = String(list.length);
    const groups = Array.from(new Set(list.map((s) => s.group)));
    $("#sourceGroups").innerHTML = groups.map((group) => {
      const items = list.filter((s) => s.group === group);
      if (!items.length) return "";
      return `<section class="source-group">
        <h3>${esc(group)}<span>${items.length} SOURCES</span></h3>
        ${items.map((s) => `<a class="source-item" href="${s.url}" target="_blank" rel="noopener">
          <b>${esc(s.title)}</b>
          <small>${esc(s.publisher)} · ${esc(s.date)}</small>
        </a>`).join("")}
      </section>`;
    }).join("");
  }

  function checklistState() {
    const raw = readJSON("gusu.checklist.v1");
    return new Set(Array.isArray(raw) ? raw : []);
  }
  function renderChecklist() {
    const checked = checklistState();
    $("#bookingChecklist").innerHTML = CHECKLIST.map((item) => {
      const on = checked.has(item.id);
      return `<div class="check-item">
        <label class="check-main">
          <input type="checkbox" data-check="${item.id}" ${on ? "checked" : ""}>
          <span class="check-box" aria-hidden="true"></span>
          <span class="check-text"><b>${esc(item.title)}</b><small>${esc(item.note)}</small></span>
        </label>
        <a class="check-link" href="${item.url}" target="_blank" rel="noopener">${esc(item.due)} ↗</a>
      </div>`;
    }).join("");
    updateCheckProgress();
  }
  function updateCheckProgress() {
    const checked = checklistState();
    const done = CHECKLIST.filter((i) => checked.has(i.id)).length;
    $("#checkProgressBar").style.width = `${(done / CHECKLIST.length) * 100}%`;
    $("#checkProgressText").textContent = `${done} / ${CHECKLIST.length} 已完成${done === CHECKLIST.length ? " · 可以出发了" : ""}`;
    updateRailProgress();
  }

  /* =========================================================
     Left rail
     ========================================================= */
  function renderRail() {
    if (!$("#sideRail")) return;
    const budget = state.budget;
    const withStay = !!(budget && budget.rows && budget.rows.stay > 0);
    if ($("#railBudget")) {
      $("#railBudget").textContent = budget ? price(withStay ? budget.perPersonWithStay : budget.perPerson) : "—";
    }
    if ($("#railBudgetLabel")) {
      const label = ["人均预算"];
      if (state.student) label.push("学生");
      if (withStay) label.push("含住宿");
      $("#railBudgetLabel").textContent = label.join(" · ");
    }
    const toggler = $("#railStudentToggle");
    if (toggler) toggler.checked = !!state.student;
    const expLabels = state.experiences
      .map((key) => (EXP_OPTIONS.find((o) => o.key === key) || {}).label)
      .filter(Boolean);
    $("#railExp").innerHTML = expLabels.length
      ? expLabels.map((label) => `<span>${esc(label)}</span>`).join("")
      : '<span class="is-empty">不加体验</span>';
    renderRailPrices();
    updateRailProgress();
    updateRailActive();
  }

  function renderRailPrices() {
    const el = $("#railPricePresets");
    if (!el) return;
    el.innerHTML = PRICE_PRESETS.map((p) => {
      const active = state.priceMin === p.min && state.priceMax === p.max;
      return `<button type="button" class="${active ? "is-active" : ""}" data-rail-price="${p.id}" aria-pressed="${active}">${p.label}</button>`;
    }).join("");
  }

  function updateRailProgress() {
    if (!$("#railCheckText")) return;
    const checked = checklistState();
    const done = CHECKLIST.filter((i) => checked.has(i.id)).length;
    $("#railCheckText").textContent = `${done} / ${CHECKLIST.length}`;
    $("#railCheckBar").style.width = `${(done / CHECKLIST.length) * 100}%`;
  }

  function updateRailActive() {
    const links = $$("#railNav a");
    if (!links.length) return;
    let current = "map-transit";
    // anchor jumps land a section at ~168px (scroll-padding 88 + scroll-margin 80),
    // so the "already at top" threshold must sit below that or the rail lags one section.
    ["map-transit", "food", "experiences", "stay", "prep", "sources", "generator", "itinerary"].forEach((id) => {
      const el = document.getElementById(id);
      if (el && el.getBoundingClientRect().top <= 200) current = id;
    });
    links.forEach((a) => {
      const on = a.dataset.rail === current;
      a.classList.toggle("is-current", on);
      if (on) a.setAttribute("aria-current", "true");
      else a.removeAttribute("aria-current");
    });
  }

  function openRail() {
    const rail = $("#sideRail");
    const backdrop = $("#railBackdrop");
    if (!rail || !backdrop) return;
    backdrop.hidden = false;
    requestAnimationFrame(() => {
      rail.classList.add("is-open");
      backdrop.classList.add("is-open");
    });
    document.body.classList.add("rail-open");
    $("#navToggle").setAttribute("aria-expanded", "true");
  }

  function closeRail() {
    const rail = $("#sideRail");
    const backdrop = $("#railBackdrop");
    if (!rail || !backdrop) return;
    rail.classList.remove("is-open");
    backdrop.classList.remove("is-open");
    setTimeout(() => { backdrop.hidden = true; }, 320);
    document.body.classList.remove("rail-open");
    $("#navToggle").setAttribute("aria-expanded", "false");
  }

  function setStudentMode(value) {
    state.student = !!value;
    generate(false);
    saveState();
    showToast(state.student ? "已按学生票计算；记得带学生证。" : "已切换回成人票。");
  }

  /* =========================================================
     Custom itinerary cards & manual stays
     ========================================================= */
  function loadCustomCards() {
    const raw = readJSON("gusu.customCards.v1");
    if (!Array.isArray(raw)) return [];
    return raw.filter((c) => c && c.id && c.title && /^\d{1,2}:\d{2}$/.test(String(c.start || ""))).map((c) => ({
      id: String(c.id),
      title: String(c.title).slice(0, 40),
      day: Number(c.day) === 2 ? 2 : 1,
      start: String(c.start).padStart(5, "0"),
      duration: Math.min(720, Math.max(15, Number(c.duration) || 60)),
      kind: ["spot", "food", "experience", "rest", "other"].includes(c.kind) ? c.kind : "other",
      price: Math.max(0, Number(c.price) || 0),
      address: String(c.address || "").slice(0, 60),
      note: String(c.note || "").slice(0, 160),
      // 保留字符串形式的关联地点；查不到的地点交给 planner 警告，不在这里静默丢弃。
      placeId: typeof c.placeId === "string" ? c.placeId : "",
    }));
  }
  function persistCustomCards() {
    safeSet("gusu.customCards.v1", JSON.stringify(state.customCards));
  }
  function loadStays() {
    const raw = readJSON("gusu.stays.v1");
    if (!Array.isArray(raw)) return [];
    const list = raw.filter((s) => s && s.id && s.name).map((s) => {
      const areaText = String(s.area || "").slice(0, 30);
      const areaKey = AREA_KEYS.includes(s.areaKey) ? s.areaKey : deriveAreaKey(areaText);
      return {
        id: String(s.id),
        name: String(s.name).slice(0, 40),
        areaKey,
        areaDetail: String(s.areaDetail || s.area || "").slice(0, 30),
        area: String(s.area || s.areaDetail || AREA_LABELS[areaKey] || "").slice(0, 30),
        checkin: String(s.checkin || ""),
        checkout: String(s.checkout || ""),
        price: Math.max(0, Number(s.price) || 0),
        link: safeHttpUrl(String(s.link || "")),
        note: String(s.note || "").slice(0, 80),
        base: !!s.base,
      };
    });
    // 旧数据可能同时标记多个基地：只保留第一处，避免通勤起点不确定。
    let baseSeen = false;
    list.forEach((s) => {
      if (!s.base) return;
      if (baseSeen) s.base = false;
      else baseSeen = true;
    });
    return list;
  }
  function persistStays() {
    safeSet("gusu.stays.v1", JSON.stringify(state.stays));
  }
  function renderStays() {
    if (!state.stays.length) {
      $("#stayList").innerHTML = '<p class="stay-empty">还没有添加住宿。把你们订好的酒店或民宿写进来，出发前就不用翻聊天记录了。</p>';
      return;
    }
    $("#stayList").innerHTML = state.stays.map((s) => `<article class="stay-card${s.base ? " is-base" : ""}">
      <div class="stay-card-main">
        <div class="stay-card-top">
          <h3>${esc(s.name)}</h3>
          ${s.base ? '<span class="tag tag--red">本次基地</span>' : ""}
          ${s.price ? `<b>¥${s.price}/晚</b>` : '<b class="stay-no-price">未填价格</b>'}
        </div>
        <p>${esc(stayAreaText(s))} · ${esc(s.checkin || "未填入住")} 至 ${esc(s.checkout || "未填退房")}</p>
        ${s.note ? `<small>${esc(s.note)}</small>` : ""}
      </div>
      <div class="stay-card-actions">
        ${s.link ? `<a href="${esc(s.link)}" target="_blank" rel="noopener">预订链接 ↗</a>` : ""}
        <button type="button" data-base-stay="${esc(s.id)}">${s.base ? "取消基地" : "设为基地"}</button>
        <button type="button" data-delete-stay="${esc(s.id)}">删除</button>
      </div>
    </article>`).join("");
  }

  function cardPlaceOptionsHtml(selected) {
    const groups = [
      ["景点", DATA.spots],
      ["食单", DATA.foods],
      ["体验", DATA.experiences],
    ];
    const options = ['<option value="">不关联地图</option>'];
    // 旧数据里的未知地点保留下来交给 planner 警告，不静默清空。
    if (selected && !PLACE_MAP.has(selected)) {
      options.push(`<option value="${esc(selected)}">关联地点未知（保留原值）</option>`);
    }
    groups.forEach(([label, list]) => {
      options.push(`<optgroup label="${esc(label)}">${list.map((p) =>
        `<option value="${esc(p.id)}">${esc(p.name)} · ${esc(p.areaLabel)}</option>`
      ).join("")}</optgroup>`);
    });
    return options.join("");
  }

  function syncCardPlaceSelect(selected) {
    const sel = $("#cardPlace");
    if (!sel) return;
    sel.innerHTML = cardPlaceOptionsHtml(selected);
    const known = Array.from(sel.options).some((o) => o.value === selected);
    sel.value = selected && known ? selected : "";
  }

  function applyLinkedPlace(placeId) {
    const p = placeById(placeId);
    if (!p) return;
    if (!$("#cardTitle").value.trim()) $("#cardTitle").value = String(p.name || "").slice(0, 40);
    $("#cardAddress").value = String(p.address || "").slice(0, 60);
    if (["spot", "food", "experience"].includes(p.kind)) $("#cardKind").value = p.kind;
  }

  function onCardPlaceChange() {
    const placeId = $("#cardPlace").value;
    if (placeId) applyLinkedPlace(placeId);
    updateCardConflictPreview();
  }

  function cardDraftFromForm() {
    const editingId = $("#cardEditId").value;
    return {
      id: editingId || "__draft__",
      day: Number($("#cardDay").value) || 1,
      start: $("#cardStart").value || "15:00",
      duration: Number($("#cardDuration").value) || 60,
      placeId: $("#cardPlace").value || "",
    };
  }

  function updateCardConflictPreview() {
    const el = $("#cardConflict");
    if (!el || !state.plan) return;
    const draft = cardDraftFromForm();
    // 新卡片没有可排除的自身块；显式传 null，避免 "__draft__" 误跳过真实卡片。
    const excludeId = $("#cardEditId").value || null;
    const conflicts = PLANNER.conflictsFor(draft, state.plan, { excludeId });
    if (conflicts.length) {
      el.hidden = false;
      el.textContent = conflicts.map((c) => c.message).join(" ");
    } else {
      el.textContent = "";
      el.hidden = true;
    }
  }

  function updateCardDayOptions() {
    const sel = $("#cardDay");
    if (!sel) return;
    const mdOf = (iso) => {
      const m = /^\d{4}-(\d{2})-(\d{2})$/.exec(String(iso || ""));
      return m ? `${m[1]}.${m[2]}` : "";
    };
    const dates = [mdOf(state.startDate), mdOf(state.endDate)];
    Array.from(sel.options).forEach((opt) => {
      const day = Number(opt.value) === 2 ? 2 : 1;
      const md = dates[day - 1];
      if (md) opt.textContent = `${md} · Day ${day}`;
    });
  }

  // 弹窗打开时让背景不可聚焦/不可点；inert 不被支持时只依赖 Tab 陷阱。
  function setBackgroundInert(on) {
    const supported = typeof HTMLElement !== "undefined" && "inert" in HTMLElement.prototype;
    if (!supported) return;
    $$(".app-shell, .mobile-dock").forEach((el) => { el.inert = on; });
  }

  function modalFocusables() {
    return $$("#cardModal button, #cardModal input, #cardModal select, #cardModal textarea, #cardModal a[href], #cardModal [tabindex]:not([tabindex='-1'])")
      .filter((el) => !el.disabled && el.offsetParent !== null);
  }

  function openCardModal(card) {
    const editing = !!card;
    lastModalFocus = document.activeElement;
    updateCardDayOptions();
    $("#cardModalTitle").textContent = editing ? "编辑卡片" : "手动加一站";
    $("#cardEditId").value = editing ? card.id : "";
    $("#cardTitle").value = editing ? card.title : "";
    $("#cardDay").value = editing ? String(card.day) : String(state.day);
    $("#cardStart").value = editing ? card.start : "15:00";
    $("#cardDuration").value = editing ? String(card.duration) : "60";
    $("#cardKind").value = editing ? card.kind : "other";
    $("#cardPrice").value = editing && card.price ? String(card.price) : "";
    $("#cardAddress").value = editing ? card.address : "";
    $("#cardNote").value = editing ? card.note : "";
    syncCardPlaceSelect(editing ? card.placeId || "" : "");
    $("#cardModal").hidden = false;
    document.body.classList.add("modal-open");
    setBackgroundInert(true);
    updateCardConflictPreview();
    setTimeout(() => {
      if (!$("#cardModal").hidden) $("#cardTitle").focus();
    }, 60);
  }
  function closeCardModal() {
    const modal = $("#cardModal");
    if (!modal || modal.hidden) return;
    modal.hidden = true;
    document.body.classList.remove("modal-open");
    setBackgroundInert(false);
    const target = lastModalFocus;
    lastModalFocus = null;
    if (target && target.isConnected && typeof target.focus === "function"
      && !(target.closest && target.closest("#cardModal"))) {
      target.focus();
    }
  }
  function openFoodCard(foodId) {
    const food = placeById(foodId);
    if (!food) return;
    const start = food.meal === "dinner" ? "18:30" : food.meal === "breakfast" ? "08:30" : "12:00";
    openCardModal({
      id: "",
      title: food.name,
      day: food.day || state.day,
      start,
      duration: 60,
      kind: "food",
      price: food.price,
      address: food.address,
      note: `${food.signature.join(" / ")}。${food.tip}`,
      placeId: foodId,
    });
    $("#cardEditId").value = "";
    $("#cardModalTitle").textContent = "把这家店加进行程";
  }
  function saveCardForm(e) {
    e.preventDefault();
    const title = $("#cardTitle").value.trim();
    if (!title) { showToast("先写一个卡片标题。"); return; }
    const start = $("#cardStart").value;
    if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(start)) {
      showToast("开始时间请用 HH:MM（00:00–23:59）。");
      return;
    }
    const editingId = $("#cardEditId").value;
    const card = {
      id: editingId || `custom-${Date.now()}`,
      title: title.slice(0, 40),
      day: Number($("#cardDay").value) === 2 ? 2 : 1,
      start,
      duration: Math.min(720, Math.max(15, Number($("#cardDuration").value) || 60)),
      kind: $("#cardKind").value,
      price: Math.max(0, Number($("#cardPrice").value) || 0),
      address: $("#cardAddress").value.trim().slice(0, 60),
      note: $("#cardNote").value.trim().slice(0, 160),
      placeId: $("#cardPlace").value || "",
    };
    const conflicts = PLANNER.conflictsFor(card, state.plan, { excludeId: editingId || card.id });
    const idx = state.customCards.findIndex((c) => c.id === card.id);
    if (idx > -1) state.customCards[idx] = card;
    else state.customCards.push(card);
    persistCustomCards();
    closeCardModal();
    state.day = card.day;
    generate(false);
    showToast(conflicts.length
      ? `${idx > -1 ? "卡片已更新" : "已加入行程"}，但有 ${conflicts.length} 处时间冲突，请看红色提示。`
      : idx > -1 ? "卡片已更新。" : "已加入行程，可在时间线里编辑或删除。");
    setTimeout(() => {
      const el = document.getElementById(`custom-${card.id}`);
      if (el) {
        el.scrollIntoView({ behavior: motionBehavior(), block: "center" });
        el.classList.add("is-focused");
        // 保存后弹窗把焦点还给旧触发按钮，但 generate 已重建结果区；
        // 把焦点落到新卡片的“编辑”，避免 activeElement 掉到 BODY。
        const edit = el.querySelector("[data-edit-custom]");
        if (edit) edit.focus({ preventScroll: true });
        setTimeout(() => el.classList.remove("is-focused"), 2200);
      }
    }, 220);
  }
  function editCustomCard(id) {
    const card = state.customCards.find((c) => c.id === id);
    if (card) openCardModal(card);
  }
  function deleteCustomCard(id) {
    const card = state.customCards.find((c) => c.id === id);
    if (!card) return;
    if (!window.confirm(`删除手动卡片「${card.title}」？`)) return;
    state.customCards = state.customCards.filter((c) => c.id !== id);
    persistCustomCards();
    generate(false);
    showToast("手动卡片已删除。");
  }
  function saveStayForm(e) {
    e.preventDefault();
    const name = $("#stayName").value.trim();
    if (!name) { showToast("先填住宿名称。"); return; }
    const linkRaw = $("#stayLink").value.trim();
    const link = safeHttpUrl(linkRaw);
    if (linkRaw && !link) {
      showToast("预订链接只支持 http/https。");
      return;
    }
    const areaKey = AREA_KEYS.includes($("#stayAreaKey").value) ? $("#stayAreaKey").value : "other";
    const areaDetail = $("#stayAreaDetail").value.trim().slice(0, 30);
    const stay = {
      id: `stay-${Date.now()}`,
      name: name.slice(0, 40),
      areaKey,
      areaDetail,
      area: areaDetail || AREA_LABELS[areaKey],
      checkin: $("#stayCheckin").value,
      checkout: $("#stayCheckout").value,
      price: Math.max(0, Number($("#stayPrice").value) || 0),
      link,
      note: $("#stayNote").value.trim().slice(0, 80),
      base: $("#stayBase").checked,
    };
    if (stay.base) state.stays.forEach((s) => { s.base = false; });
    state.stays.push(stay);
    persistStays();
    renderStays();
    generate(false);
    e.target.reset();
    $("#stayCheckin").value = state.startDate;
    $("#stayCheckout").value = state.endDate;
    showToast(stay.base ? "住宿已收进清单，并设为本次住宿基地。" : "住宿已收进清单。");
  }
  function setStayBase(id, value) {
    const target = state.stays.find((s) => s.id === id);
    if (!target) return;
    state.stays.forEach((s) => { s.base = !!value && s.id === id; });
    persistStays();
    renderStays();
    generate(false);
    showToast(value ? "已设为本次住宿基地，通勤与预算已重算。" : "已取消住宿基地，通勤按平江路估算。");
  }
  function deleteStay(id) {
    const stay = state.stays.find((s) => s.id === id);
    if (!stay) return;
    if (!window.confirm(`删除住宿「${stay.name}」？`)) return;
    const wasBase = !!stay.base;
    state.stays = state.stays.filter((s) => s.id !== id);
    if (wasBase) state.stays.forEach((s) => { s.base = false; });
    persistStays();
    renderStays();
    generate(false);
    showToast(wasBase ? "住宿已删除，住宿基地已取消，通勤按平江路估算。" : "住宿已删除。");
  }

  /* =========================================================
     Map
     ========================================================= */
  function wgsToGcj(lat, lng) {
    if (outOfChina(lat, lng)) return [lat, lng];
    const a = 6378245.0;
    const ee = 0.00669342162296594323;
    let dLat = transformLat(lng - 105, lat - 35);
    let dLng = transformLng(lng - 105, lat - 35);
    const radLat = (lat / 180) * Math.PI;
    let magic = Math.sin(radLat);
    magic = 1 - ee * magic * magic;
    const sqrtMagic = Math.sqrt(magic);
    dLat = (dLat * 180) / (((a * (1 - ee)) / (magic * sqrtMagic)) * Math.PI);
    dLng = (dLng * 180) / ((a / sqrtMagic) * Math.cos(radLat) * Math.PI);
    return [lat + dLat, lng + dLng];
  }
  function outOfChina(lat, lng) {
    return lng < 72.004 || lng > 137.8347 || lat < 0.8293 || lat > 55.8271;
  }
  function transformLat(x, y) {
    let ret = -100 + 2 * x + 3 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x));
    ret += ((20 * Math.sin(6 * x * Math.PI) + 20 * Math.sin(2 * x * Math.PI)) * 2) / 3;
    ret += ((20 * Math.sin(y * Math.PI) + 40 * Math.sin((y / 3) * Math.PI)) * 2) / 3;
    ret += ((160 * Math.sin((y / 12) * Math.PI) + 320 * Math.sin((y * Math.PI) / 30)) * 2) / 3;
    return ret;
  }
  function transformLng(x, y) {
    let ret = 300 + x + 2 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x));
    ret += ((20 * Math.sin(6 * x * Math.PI) + 20 * Math.sin(2 * x * Math.PI)) * 2) / 3;
    ret += ((20 * Math.sin(x * Math.PI) + 40 * Math.sin((x / 3) * Math.PI)) * 2) / 3;
    ret += ((150 * Math.sin((x / 12) * Math.PI) + 300 * Math.sin((x / 30) * Math.PI)) * 2) / 3;
    return ret;
  }
  function latLng(place) {
    const gcj = wgsToGcj(place.lat, place.lng);
    return [gcj[0], gcj[1]];
  }

  function ensureMap() {
    if (map || !window.L) return;
    if (!document.getElementById("map")) return;
    map = window.L.map("map", {
      zoomControl: false,
      scrollWheelZoom: false,
      attributionControl: true,
    });
    window.L.control.zoom({ position: "bottomright" }).addTo(map);
    window.L.control.scale({ imperial: false, position: "bottomleft" }).addTo(map);
    tileLayer = window.L.tileLayer(AMAP_URL, {
      subdomains: ["1", "2", "3", "4"],
      maxZoom: 18,
      minZoom: 10,
      attribution: '底图 © <a href="https://www.amap.com/" target="_blank" rel="noopener">高德地图</a>',
    }).addTo(map);
    tileLayer.on("tileerror", () => {
      mapTileErrors += 1;
      if (mapFallbackOn) return;
      const notice = $("#mapNotice");
      if (notice && mapTileErrors >= TILE_NOTICE_LIMIT && notice.hidden) {
        notice.hidden = false;
        announceStatus(notice);
      }
      if (mapTileErrors >= TILE_ERROR_LIMIT) showMapFallback();
    });
    tileLayer.on("tileload", () => {
      if (mapTileErrors > 0) mapTileErrors -= 1;
      // 只收起轻量提示；用户看得到的降级层要手动重试，不能偷偷恢复。
      if (mapTileErrors <= 1 && !mapFallbackOn) {
        const notice = $("#mapNotice");
        if (notice) notice.hidden = true;
      }
    });
    markerLayer = window.L.layerGroup().addTo(map);
    routeLayer = window.L.layerGroup().addTo(map);
    const center = wgsToGcj(31.315, 120.63);
    map.setView(center, 13);
    map.on("zoomend", onMapZoomEnd);
    setTimeout(() => { if (map && !mapFallbackOn) map.invalidateSize(); }, 250);
  }

  function onMapZoomEnd() {
    if (!map) return;
    clearTimeout(mapZoomTimer);
    mapZoomTimer = setTimeout(() => {
      // fitBounds 期间不重画，避免“重画 -> 再 fit”的循环。
      if (!map || mapFitting || mapFallbackOn) return;
      renderMapMarkers(mapItems(), state.mapFilter === "day1" || state.mapFilter === "day2", false);
    }, 220);
  }

  function fitMap(points, planMode) {
    if (!map || !points.length) return;
    mapFitting = true;
    // moveend 后立刻解除 fit 锁，避免 220ms 的 zoomend 防抖重画被 450ms 的兜底计时器挡住。
    map.once("moveend", () => { mapFitting = false; });
    map.fitBounds(window.L.latLngBounds(points), { padding: [34, 34], maxZoom: planMode ? 15 : 13 });
    clearTimeout(mapFitTimer);
    mapFitTimer = setTimeout(() => { mapFitting = false; }, 450);
  }

  function watchMaps() {
    if (!("IntersectionObserver" in window)) {
      mapVisible = true;
      renderMap();
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        mapVisible = true;
        ensureMap();
        renderMap();
        io.unobserve(entry.target);
      });
    }, { rootMargin: "200px" });
    const mapEl = document.getElementById("map");
    if (mapEl) io.observe(mapEl);
  }

  // 降级提示在 hidden 时就有静态文字；显示后重写一次，live region 才会播报。
  function announceStatus(el) {
    if (!el) return;
    const target = el.querySelector(".map-fallback-head span") || el;
    const text = target.textContent;
    if (text) target.textContent = text;
  }

  function showMapFallback() {
    mapFallbackOn = true;
    const box = $("#mapFallback");
    if (box && box.hidden) {
      box.hidden = false;
      announceStatus(box);
    }
    const notice = $("#mapNotice");
    if (notice) notice.hidden = true;
    // 旧 marker 不能再被点开（底图已不可见）；重试时由 ensureMap 重新建层。
    clearTimeout(mapZoomTimer);
    clearTimeout(mapFitTimer);
    mapFitting = false;
    mapMarkers.clear();
    markerLayer = null;
    routeLayer = null;
    const legs = state.plan ? (state.transit?.[state.day] || []) : [];
    renderSchematic($("#mapSchematic"), mapItems(), legs, "map");
    const container = document.getElementById("map");
    if (container) container.classList.add("is-dimmed");
  }

  function schematicPoints(items, legs) {
    const points = [];
    const seen = new Set();
    const push = (node) => {
      if (!node || !Number.isFinite(Number(node.lat)) || !Number.isFinite(Number(node.lng))) return;
      const id = node.id || `${node.lat},${node.lng}`;
      if (seen.has(id)) return;
      seen.add(id);
      points.push({
        name: String(node.short || node.name || "点位"),
        lat: Number(node.lat),
        lng: Number(node.lng),
      });
    };
    (items || []).forEach((item) => push(item && item.place ? item.place : item));
    (legs || []).forEach((leg) => {
      if (!leg) return;
      push(leg.from);
      push(leg.to);
    });
    return points;
  }

  // 底图不可用时的本地示意图：只做经纬度线性投影，不依赖任何外部瓦片。
  function renderSchematic(container, items, legs, kind) {
    if (!container) return;
    const pts = schematicPoints(items, legs);
    if (!pts.length) {
      container.innerHTML = '<p class="tiny">当前筛选没有点位。</p>';
      return;
    }
    const W = 720;
    const H = 360;
    const pad = 36;
    const lats = pts.map((p) => p.lat);
    const lngs = pts.map((p) => p.lng);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const x = (lng) => pad + ((lng - minLng) / (maxLng - minLng || 1)) * (W - pad * 2);
    const y = (lat) => H - pad - ((lat - minLat) / (maxLat - minLat || 1)) * (H - pad * 2);
    const line = pts.map((p) => `${x(p.lng).toFixed(1)},${y(p.lat).toFixed(1)}`).join(" ");
    const tone = kind === "transit" ? "#3f675b" : "#a6402f";
    const label = kind === "transit" ? "通勤路线示意图" : "行程点位示意图";
    container.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${label} · 底图不可用" preserveAspectRatio="xMidYMid meet">
      <rect width="${W}" height="${H}" rx="18" fill="#f4efe4"></rect>
      <path d="M0 ${H * 0.62} C ${W * 0.22} ${H * 0.48}, ${W * 0.38} ${H * 0.78}, ${W} ${H * 0.55}" fill="none" stroke="#cfdcd5" stroke-width="18" opacity=".8"></path>
      <polyline points="${line}" fill="none" stroke="${tone}" stroke-width="2.5" stroke-dasharray="6 6" opacity=".85"></polyline>
      ${pts.map((p, i) => {
        const name = p.name.length > 12 ? `${p.name.slice(0, 11)}…` : p.name;
        const cx = x(p.lng);
        const cy = y(p.lat);
        const anchor = cx < 110 ? "start" : cx > W - 110 ? "end" : "middle";
        const labelX = anchor === "start" ? cx - 8 : anchor === "end" ? cx + 8 : cx;
        return `<g>
          <circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="12" fill="${tone}"></circle>
          <text x="${cx.toFixed(1)}" y="${(cy + 4).toFixed(1)}" text-anchor="middle" font-size="10" fill="#fff">${i + 1}</text>
          <text x="${labelX.toFixed(1)}" y="${(cy - 18).toFixed(1)}" text-anchor="${anchor}" font-size="11" fill="#1e2a26">${esc(name)}</text>
        </g>`;
      }).join("")}
    </svg>
    <p class="tiny">示意图 · 底图不可用 · 按经纬度投影，仅表示相对位置，不是导航底图。</p>`;
  }

  function mapItems(filter = state.mapFilter) {
    if (filter === "food") {
      return filteredFoods().map((p) => ({ place: p, kind: "food" }));
    }
    if (filter === "experience") {
      return MAP_EXPERIENCE_IDS.map((id) => PLACE_MAP.get(id)).filter(Boolean).map((p) => ({ place: p, kind: "experience" }));
    }
    if (filter === "all") {
      return [...DATA.spots, ...DATA.foods, ...MAP_EXPERIENCE_IDS.map((id) => PLACE_MAP.get(id)).filter(Boolean)]
        .map((p) => ({ place: p, kind: p.kind }));
    }
    const dayNum = filter === "day2" ? 2 : 1;
    const day = planDay(dayNum);
    const seen = new Set();
    const items = [];
    day.blocks.forEach((b) => {
      if (b.type === "custom") {
        if (!b.placeId || !Number.isFinite(b.lat) || !Number.isFinite(b.lng)) return;
        const id = `custom-${b.customId}`;
        if (seen.has(id)) return;
        seen.add(id);
        items.push({
          place: {
            id,
            customId: b.customId,
            name: b.title,
            short: b.title,
            kind: "custom",
            lat: b.lat,
            lng: b.lng,
            day: dayNum,
            areaLabel: "手动卡片",
            priceLabel: "手动",
            address: b.address || "",
          },
          kind: "custom",
          time: fmt(b.start),
          seq: items.length + 1,
        });
        return;
      }
      if (b.type !== "place" || seen.has(b.placeId)) return;
      const p = placeById(b.placeId);
      if (!p) return;
      seen.add(b.placeId);
      items.push({ place: p, kind: p.kind, time: fmt(b.start), seq: items.length + 1 });
    });
    return items;
  }

  function markerHtml(item, planMode) {
    const p = item.place;
    if (item.cluster && item.cluster.length > 1) {
      return `<div class="pin pin--cluster"><span>${item.cluster.length}</span></div>`;
    }
    const pinClass = planMode
      ? (p.day === 2 ? "pin--day2" : "")
      : item.kind === "food"
        ? "pin--food"
        : item.kind === "experience"
          ? "pin--experience"
          : p.day === 2
            ? "pin--day2"
            : "";
    const letter = planMode ? item.seq : item.kind === "food" ? "食" : item.kind === "experience" ? "玩" : "景";
    return `<div class="pin-label">${planMode ? esc(p.short || p.name) : ""}</div>
      <div class="pin ${pinClass}"><span>${letter}</span></div>`;
  }

  function clusterMapItems(items) {
    const zoom = map ? map.getZoom() : 13;
    const allowed = state.mapFilter === "all" || state.mapFilter === "food";
    if (!allowed || zoom >= 15) return items.map((item) => ({ ...item, cluster: null }));
    const size = zoom >= 13 ? 0.006 : 0.015;
    const groups = new Map();
    const singles = [];
    items.forEach((item) => {
      const p = item.place;
      if (!p || !Number.isFinite(Number(p.lat)) || !Number.isFinite(Number(p.lng))) {
        singles.push({ ...item, cluster: null });
        return;
      }
      const key = `${Math.round(Number(p.lat) / size)}:${Math.round(Number(p.lng) / size)}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(item);
    });
    const grouped = Array.from(groups.values()).map((group) => {
      if (group.length === 1) return { ...group[0], cluster: null };
      const lat = group.reduce((sum, item) => sum + Number(item.place.lat), 0) / group.length;
      const lng = group.reduce((sum, item) => sum + Number(item.place.lng), 0) / group.length;
      return {
        place: {
          id: `cluster-${lat.toFixed(4)}-${lng.toFixed(4)}`,
          name: `${group.length} 个点`,
          short: `${group.length} 个点`,
          lat,
          lng,
          day: 1,
          kind: "cluster",
        },
        kind: "cluster",
        cluster: group,
        planMode: false,
      };
    });
    return singles.concat(grouped);
  }

  function amapNavUrl(from, to, mode) {
    if (!from || !to) return "";
    const coords = [from.lat, from.lng, to.lat, to.lng].map(Number);
    if (!coords.every((n) => Number.isFinite(n))) return "";
    const a = wgsToGcj(coords[0], coords[1]);
    const b = wgsToGcj(coords[2], coords[3]);
    const m = mode === "taxi" ? "car" : "walk";
    const name = (node) => encodeURIComponent(node.short || node.name || "");
    return `https://uri.amap.com/navigation?from=${a[1]},${a[0]},${name(from)}&to=${b[1]},${b[0]},${name(to)}&mode=${m}&coordinate=gaode&callnative=0&src=suzhou-guide`;
  }

  function renderTransitBaseNote() {
    const note = $("#transitBaseNote");
    if (!note) return;
    const meta = state.planMeta || {};
    const base = meta.base || {};
    if (meta.baseEstimated) {
      note.textContent = base.stay
        ? "住宿区域无坐标，通勤按平江路估算。"
        : "未设住宿基地，通勤按平江路估算。";
    } else {
      note.textContent = `通勤按${base.stay ? base.stay.name : base.name}（${base.label}）估算。`;
    }
  }

  function renderTransit() {
    if (!state.plan) return;
    const day = planDay(state.day);
    const rawLegs = (state.transit && state.transit[day.day]) || [];
    // 不改 planner 的 leg 数据，只在展示层派生高德导航链接。
    const legs = rawLegs.map((leg) => ({ ...leg, amapUrl: amapNavUrl(leg.from, leg.to, leg.mode) }));
    const title = $("#transitPaneTitle");
    if (title) title.textContent = day.day === 1 ? "Day 1 · 通勤段" : "Day 2 · 通勤段";
    const count = $("#transitCount");
    if (count) count.textContent = `${legs.length} 段`;
    renderTransitBaseNote();
    const walk = legs.filter((l) => l.mode === "walk").reduce((sum, l) => sum + l.minutes, 0);
    const taxi = legs.filter((l) => l.mode === "taxi").reduce((sum, l) => sum + l.fare, 0);
    $("#transitSummary").innerHTML = legs.length
      ? `<div><span>DAY ${day.day} 通勤</span><b>${legs.length} 段</b></div><div><span>步行</span><b>${walk} 分钟</b></div><div><span>打车</span><b>约 ¥${taxi}</b></div>`
      : '<p class="tiny">今天没有需要单独计算的通勤段。</p>';
    $("#legList").innerHTML = legs.map((leg, i) => {
      const modeLabel = leg.mode === "taxi" ? "打车" : "步行";
      const time = leg.start != null ? `${fmt(leg.start)}–${fmt(leg.end)}` : "建议";
      const fromLabel = leg.from.short || leg.from.name;
      const toLabel = leg.to.short || leg.to.name;
      return `<li class="leg-item">
        <span class="leg-index">${String(i + 1).padStart(2, "0")}</span>
        <div class="leg-body">
          <div class="leg-route"><b>${esc(fromLabel)}</b><i>→</i><b>${esc(toLabel)}</b></div>
          <p>${esc(leg.detail || "按地图距离估算；实际以导航为准。")}</p>
        </div>
        <div class="leg-meta"><span class="mode-tag mode-${leg.mode}">${modeLabel}</span><b>${leg.minutes} 分钟</b><small>${leg.fare ? "约 ¥" + leg.fare : "¥0"}</small><em>${time}</em>${leg.amapUrl ? `<a class="leg-nav" href="${esc(leg.amapUrl)}" target="_blank" rel="noopener" aria-label="在高德中导航：${esc(fromLabel)} 到 ${esc(toLabel)}">高德</a>` : ""}</div>
      </li>`;
    }).join("") || '<li class="leg-empty">当前方案没有可展示的通勤段。</li>';
  }

  function renderMap() {
    const items = mapItems();
    const planMode = state.mapFilter === "day1" || state.mapFilter === "day2";
    // 列表和筛选不依赖 Leaflet，先渲染，保证未初始化/失败时仍可用。
    renderMapList(items, planMode);
    renderMapFilters();
    if (!mapVisible) {
      if (!window.L) showMapFallback();
      return;
    }
    if (!window.L) {
      showMapFallback();
      return;
    }
    ensureMap();
    if (!map) {
      showMapFallback();
      return;
    }
    if (mapFallbackOn) {
      showMapFallback();
      return;
    }
    renderMapMarkers(items, planMode, true);
  }

  function routeDaysForMap() {
    if (!state.plan) return [];
    if (state.mapFilter === "all") return [1, 2];
    if (state.mapFilter === "day1" || state.mapFilter === "day2") return [state.day];
    // 食单/体验视图也保留当天路线作背景，避免点位看起来是一盘散沙。
    return [state.day];
  }

  function drawRouteLayer(planMode) {
    const bounds = [];
    if (!window.L) return bounds;
    const seenNodes = new Set();
    const days = routeDaysForMap();
    days.forEach((dayNum) => {
      const legs = state.transit?.[dayNum] || [];
      const ordered = [];
      legs.forEach((leg) => {
        if (!leg.from || !leg.to || !Number.isFinite(leg.from.lat) || !Number.isFinite(leg.from.lng) ||
            !Number.isFinite(leg.to.lat) || !Number.isFinite(leg.to.lng)) return;
        const from = latLng(leg.from);
        const to = latLng(leg.to);
        if (!ordered.length) ordered.push(from);
        ordered.push(to);
      });
      if (!ordered.length) return;
      bounds.push(...ordered);
      const dayColor = dayNum === 2 ? "#3f675b" : "#a6402f";
      const faded = !planMode && state.mapFilter !== "all";

      if (planMode) {
        // 金色柔光垫底，让路线在浅色底图上真正“跳出来”。
        window.L.polyline(ordered, { color: "#b08a4f", weight: 15, opacity: 0.24 }).addTo(routeLayer);
      }
      window.L.polyline(ordered, { color: "#fffdf8", weight: planMode ? 12 : 10, opacity: 0.94 }).addTo(routeLayer);
      const baseLine = window.L.polyline(ordered, {
        color: dayColor,
        weight: planMode ? 7 : 6,
        opacity: faded ? 0.38 : 0.96,
        dashArray: null,
      }).addTo(routeLayer);
      baseLine.bindTooltip(`Day ${dayNum} · 当天路线`, { sticky: true });

      if (planMode) {
        // 在连续路线之上再叠交通方式：绿色虚线步行、红色实线打车。
        legs.forEach((leg) => {
          if (!leg.from || !leg.to || !Number.isFinite(leg.from.lat) || !Number.isFinite(leg.to.lat)) return;
          const from = latLng(leg.from);
          const to = latLng(leg.to);
          const modeColor = leg.mode === "taxi" ? "#a6402f" : "#2f6b58";
          const modeLine = window.L.polyline([from, to], {
            color: modeColor,
            weight: 6,
            opacity: 1,
            dashArray: leg.mode === "walk" ? "9 8" : null,
          }).addTo(routeLayer);
          const modeLabel = leg.mode === "taxi" ? "打车" : "步行";
          modeLine.bindTooltip(`${modeLabel} ${leg.minutes} 分钟`, { sticky: true });
          const nav = amapNavUrl(leg.from, leg.to, leg.mode);
          modeLine.bindPopup(`<div class="gusu-popup">
            <div class="pp-kicker">${modeLabel} · ${leg.minutes} 分钟</div>
            <h4>${esc(leg.from.short || leg.from.name)} → ${esc(leg.to.short || leg.to.name)}</h4>
            <p>${leg.fare ? `参考车费约 ¥${leg.fare}` : "步行可达"} · 实际以导航为准</p>
            ${nav ? `<div class="pp-actions"><a href="${esc(nav)}" target="_blank" rel="noopener">高德导航</a></div>` : ""}
          </div>`);
        });
      }

      legs.forEach((leg) => {
        [leg.from, leg.to].forEach((node) => {
          if (!node || !Number.isFinite(node.lat) || seenNodes.has(node.id)) return;
          if (node.kind !== "station" && node.kind !== "stay") return;
          seenNodes.add(node.id);
          const label = node.kind === "station" ? (node.short || "车站") : "住宿";
          const icon = window.L.divIcon({
            className: `gusu-route-node ${node.kind === "station" ? "is-station" : "is-stay"}`,
            html: `<span>${esc(label)}</span>`,
            iconSize: [86, 22],
            iconAnchor: [43, 11],
          });
          window.L.marker(latLng(node), { icon, title: node.short || label, alt: node.short || label })
            .addTo(routeLayer)
            .bindTooltip(esc(node.short || label), { direction: "top", offset: [0, -8] });
        });
      });
    });
    return bounds;
  }

  function renderMapMarkers(items, planMode, doFit) {
    if (!map || !markerLayer || !routeLayer) return;
    markerLayer.clearLayers();
    routeLayer.clearLayers();
    mapMarkers.clear();
    const bounds = drawRouteLayer(planMode);
    clusterMapItems(items).forEach((item) => {
      const p = item.place;
      if (!p || !Number.isFinite(Number(p.lat)) || !Number.isFinite(Number(p.lng))) return;
      const point = latLng(p);
      const isCluster = !!(item.cluster && item.cluster.length > 1);
      const icon = window.L.divIcon({
        className: "gusu-pin",
        html: markerHtml(item, planMode),
        iconSize: isCluster ? [38, 38] : [26, 26],
        iconAnchor: isCluster ? [19, 38] : [13, 26],
        popupAnchor: [0, -24],
      });
      const marker = window.L.marker(point, {
        icon,
        title: isCluster ? `${item.cluster.length} 个点，点击放大` : p.name,
        alt: isCluster ? `${item.cluster.length} 个点` : p.name,
      });
      if (isCluster) {
        marker.on("click", () => {
          if (!map) return;
          map.setView(point, Math.min(map.getZoom() + 2, 16));
          revealMapList();
        });
      } else if (p.kind === "custom") {
        marker.bindPopup(`<div class="gusu-popup">
          <div class="pp-kicker">手动卡片</div>
          <h4>${esc(p.name)}</h4>
          <p>${esc(p.address || "未填地址")}</p>
          <div class="pp-actions"><a href="#custom-${esc(p.customId)}" data-custom-day="${Number(p.day) === 2 ? 2 : 1}">在时间线中查看</a></div>
        </div>`);
      } else {
        const kicker = planMode ? `DAY ${p.day} · ${item.time}` : p.areaLabel;
        const popupPrice = p.studentPrice != null && state.student ? `学生 ¥${p.studentPrice}` : (p.priceLabel || "");
        const amapLink = p.links && p.links.amap
          ? `<a href="${esc(p.links.amap)}" target="_blank" rel="noopener">高德导航</a>`
          : "";
        marker.bindPopup(`<div class="gusu-popup">
          <div class="pp-kicker">${esc(kicker)}</div>
          <h4>${esc(p.name)}</h4>
          <p>${esc(popupPrice)} · ${esc(p.areaLabel || "")}</p>
          <div class="pp-actions">
            <button type="button" data-focus-place="${esc(p.id)}" aria-label="查看 ${esc(p.name)} 详情">看详情</button>
            ${amapLink}
          </div>
        </div>`);
      }
      marker.addTo(markerLayer);
      if (!isCluster) mapMarkers.set(p.id, marker);
      bounds.push(point);
    });
    if (doFit && bounds.length) fitMap(bounds, planMode);
  }

  function revealMapList() {
    const panel = $(".map-panel");
    if (!panel) return;
    panel.classList.add("is-focused");
    clearTimeout(panel._focusTimer);
    panel._focusTimer = setTimeout(() => panel.classList.remove("is-focused"), 1600);
  }

  function renderMapList(items, planMode) {
    const labels = {
      day1: ["TODAY", "Day 1 · 古城东"],
      day2: ["TOMORROW", "Day 2 · 古城西 → 湖东"],
      all: ["ALL PINS", "全部点位"],
      food: ["FOOD", "食单点位"],
      experience: ["EXPERIENCE", "体验点位"],
    };
    const [kicker, title] = labels[state.mapFilter] || labels.all;
    $("#mapListKicker").textContent = kicker;
    $("#mapListTitle").textContent = title;
    $("#mapCount").textContent = `${items.length} 个点`;
    $("#mapList").innerHTML = items.map((item) => {
      const p = item.place;
      const seq = item.seq || (item.kind === "food" ? "食" : item.kind === "experience" ? "玩" : "景");
      const meta = planMode ? `${item.time} · ${p.areaLabel}` : (p.areaLabel || "");
      return `<button type="button" class="map-item" data-map-id="${esc(p.id)}" data-day="${Number(p.day) || 1}" aria-label="查看 ${esc(p.name)} 详情">
        <span class="num">${seq}</span>
        <span class="map-item-body"><b>${esc(p.name)}</b><small>${esc(meta)}</small></span>
        <em>${esc(p.priceLabel || "")}</em>
      </button>`;
    }).join("") || '<p class="tiny">当前筛选没有点位。</p>';
    $("#mapOpenAmap").href = "https://uri.amap.com/search?keyword=" + encodeURIComponent("苏州") + "&city=" + encodeURIComponent("苏州");
  }

  function renderMapFilters() {
    const filters = [
      ["day1", "D1 古城东", "D1"],
      ["day2", "D2 古城西 → 湖东", "D2"],
      ["all", "全部点位", "全部"],
      ["food", "食单", "食单"],
      ["experience", "体验", "体验"],
    ];
    $("#mapFilters").innerHTML = filters.map(([key, label, short]) =>
      `<button type="button" class="map-filter${state.mapFilter === key ? " is-active" : ""}" data-map-filter="${key}"><span class="map-filter-long">${label}</span><span class="map-filter-short">${short}</span></button>`
    ).join("");
    $$("#mapDayToggle button").forEach((b) => {
      b.classList.toggle("is-active", state.mapFilter === `day${b.dataset.day}`);
    });
  }

  function isPlanMapFilter() {
    return state.mapFilter === "day1" || state.mapFilter === "day2";
  }

  // 地图目标既可能是 PLACE_MAP 里的景点/食单，也可能是手动卡片（custom-…）。
  function mapPlaceById(id) {
    if (!id) return null;
    const known = PLACE_MAP.get(id);
    if (known) return known;
    const hit = mapItems().find((item) => item.place && item.place.id === id);
    if (hit) return hit.place;
    // 当前筛选项里没有时，再按两天行程找一遍（手动卡片只属于某一天）。
    const dayHit = mapItems("day1").find((item) => item.place && item.place.id === id)
      || mapItems("day2").find((item) => item.place && item.place.id === id);
    return dayHit ? dayHit.place : null;
  }

  function customDayForId(id) {
    if (!state.plan || typeof id !== "string" || !id.startsWith("custom-")) return 0;
    const customId = id.slice("custom-".length);
    const day = state.plan.days.find((d) => d.blocks.some((b) => b.type === "custom" && b.customId === customId));
    return day ? day.day : 0;
  }

  // 某个点位若在行程里，返回它所在的天；否则 0。
  function planDayOfPlace(id) {
    if (!state.plan || !id) return 0;
    const day = state.plan.days.find((d) => d.blocks.some((b) => b.type === "place" && b.placeId === id));
    return day ? day.day : 0;
  }

  function fallbackDetailEl(id) {
    return document.getElementById(`tl-place-${id}`)
      || document.getElementById(`food-${id}`)
      || document.getElementById(`exp-${id}`);
  }

  // 底图降级时列表项不碰隐藏的地图：景点走详情（外部高德链接在那里），手动卡片走时间线。
  // all / food 列表里有点位不在时间线或食单首屏，先补出卡片；补不出来就交给高德。
  function openMapFallbackTarget(id, place) {
    if (place && place.kind !== "custom") {
      const day = planDayOfPlace(place.id);
      if (day && state.day !== day) setDay(day);
      if (place.kind === "food") {
        // 食单只渲染前 foodLimit 家；把目标抬进列表，后续筛选会自然复位。
        const index = DATA.foods.findIndex((f) => f.id === place.id);
        state.foodFilter = "all";
        if (index >= 0) state.foodLimit = Math.max(state.foodLimit, index + 1);
        renderFoodFilters();
        renderFoodGrid();
      }
      if (fallbackDetailEl(place.id)) {
        focusPlace(place.id);
        showToast("底图不可用，已打开详情；点“高德导航”继续。");
        return;
      }
      const amap = place.links && place.links.amap;
      if (amap) {
        window.open(amap, "_blank", "noopener");
        showToast(`底图不可用，已在高德打开「${place.name}」。`);
        return;
      }
      showToast("底图不可用，请使用外部地图。");
      return;
    }
    const day = place && place.kind === "custom"
      ? (Number(place.day) === 2 ? 2 : 1)
      : customDayForId(id);
    if (day && state.day !== day) setDay(day);
    // 列表 id 与时间线卡片 id 同为 custom-<customId>。
    const card = day ? document.getElementById(id) : null;
    if (card) {
      card.scrollIntoView({ behavior: motionBehavior(), block: "center" });
      card.classList.add("is-focused");
      clearTimeout(card._focusTimer);
      card._focusTimer = setTimeout(() => card.classList.remove("is-focused"), 2200);
      showToast("底图不可用，已打开时间线卡片。");
      return;
    }
    if (place && place.kind === "custom") {
      showToast("底图不可用，这张卡片当前不在时间线里。");
      return;
    }
    showToast("底图不可用，请使用外部地图。");
  }

  function showOnMap(id) {
    const alias = { xiyuan_slow: "xiyuan", jinji_sunset: "jinji_lake", market_graze: "shuangta" };
    const targetId = alias[id] || id;
    const p = placeById(targetId);
    if (!p) return;
    let filter = "all";
    const planDayObj = state.plan && state.plan.days.find((d) => d.blocks.some((b) => b.type === "place" && b.placeId === targetId));
    if (planDayObj) filter = `day${planDayObj.day}`;
    else if (p.kind === "food") filter = "food";
    else if (p.kind === "experience") filter = "experience";
    state.mapFilter = filter;
    // 这是用户明确“去地图看”的操作，直接初始化，避免滚动动画期间抢跑。
    mapVisible = true;
    renderMap();
    ensureMap();
    const target = document.getElementById("map-section");
    if (target) target.scrollIntoView({ behavior: motionBehavior(), block: "center" });
    setTimeout(() => openMapMarker(targetId), 420);
  }

  // 已有 marker：等缩放/平移结束后按当前层级重画，再打开弹窗。
  function focusMapMarker(id) {
    const marker = mapMarkers.get(id);
    if (!marker || !map) return false;
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      clearTimeout(mapFitTimer);
      clearTimeout(mapZoomTimer);
      mapFitting = false;
      if (!map || mapFallbackOn) return;
      renderMapMarkers(mapItems(), isPlanMapFilter(), false);
      const refreshed = mapMarkers.get(id);
      if (refreshed) refreshed.openPopup();
    };
    mapFitting = true;
    map.once("moveend", finish);
    // >=15 时关闭聚合，重画后一定有独立 marker。
    map.setView(marker.getLatLng(), Math.max(map.getZoom(), 15), { animate: true });
    mapFitTimer = setTimeout(finish, 650);
    if (window.innerWidth <= 900) {
      const el = document.getElementById("map-section");
      if (el) el.scrollIntoView({ behavior: motionBehavior(), block: "start" });
    }
    return true;
  }

  function openMapMarker(id, attempt = 0) {
    if (!mapVisible) {
      mapVisible = true;
      renderMap();
    }
    const place = mapPlaceById(id);
    // 底图不可用：走详情/时间线，绝不操作隐藏地图或旧 marker。
    if (mapFallbackOn) {
      openMapFallbackTarget(id, place);
      return;
    }
    if (!map) {
      ensureMap();
      if (map) renderMapMarkers(mapItems(), isPlanMapFilter(), false);
    }
    if (!map) {
      openMapFallbackTarget(id, place);
      return;
    }
    if (mapMarkers.get(id)) {
      focusMapMarker(id);
      return;
    }
    if (!place) {
      showToast("没有找到这个点位，可在行程或食单中查看。");
      revealMapList();
      return;
    }
    // 点位存在但没有独立 marker：多半是被聚合了，放大地图后等重画再试。
    if (attempt < MARKER_RETRY_LIMIT) {
      clearTimeout(mapZoomTimer);
      clearTimeout(mapFitTimer);
      mapFitting = false;
      if (attempt === 0) {
        map.setView(latLng(place), Math.max(map.getZoom(), 15), { animate: true });
      }
      setTimeout(() => {
        if (mapFallbackOn) {
          openMapFallbackTarget(id, mapPlaceById(id));
          return;
        }
        // zoomend 的防抖重画可能还没跑；按当前层级兜底重画一次（>=15 已无聚合）。
        if (map && !mapMarkers.get(id)) {
          clearTimeout(mapZoomTimer);
          mapFitting = false;
          renderMapMarkers(mapItems(), isPlanMapFilter(), false);
        }
        openMapMarker(id, attempt + 1);
      }, MARKER_RETRY_MS);
      return;
    }
    showToast("地图还在聚合，请再点一次或放大地图。");
    revealMapList();
  }

  /* =========================================================
     Day / tabs / focus
     ========================================================= */
  function setDay(day) {
    if (!state.plan) return;
    // renderDayTabs 会重建按钮；如果焦点正在 tabs 上（键盘或点击），重建后归还给新的当前项。
    const focusWasInTabs = !!(document.activeElement && document.activeElement.closest
      && document.activeElement.closest("#dayTabs"));
    state.day = day;
    if (state.mapFilter === "day1" || state.mapFilter === "day2") state.mapFilter = `day${day}`;
    renderDayTabs();
    renderTimeline();
    renderAside();
    renderMap();
    renderTransit();
    if (focusWasInTabs) {
      const activeTab = document.getElementById(`dayTab-${day}`);
      if (activeTab) activeTab.focus();
    }
  }

  function focusPlace(id) {
    const p = placeById(id);
    if (!p) return;
    if (p.kind === "food") {
      const wasPriceFiltered = state.priceMin != null || state.priceMax != null;
      // setPriceRange 会把分页重置到 12；先清价位，再把目标抬进列表。
      if (wasPriceFiltered) setPriceRange(null, null, false);
      const index = DATA.foods.findIndex((f) => f.id === id);
      state.foodFilter = "all";
      state.foodLimit = Math.max(FOOD_PAGE_SIZE, index + 1);
      renderFoodFilters();
      renderFoodGrid();
      // 价位筛选会影响时间线/预算；清掉后重排一次，避免界面口径不一致。
      if (wasPriceFiltered) generate(false);
    }
    const day = state.plan ? state.plan.days.find((d) => d.blocks.some((b) => b.type === "place" && b.placeId === id)) : null;
    if (day && state.day !== day.day) {
      setDay(day.day);
    }
    const el = document.getElementById(`tl-place-${id}`) || document.getElementById(`food-${id}`) || document.getElementById(`exp-${id}`);
    if (!el) {
      showToast("这个点位在当前方案之外，可以在食单或体验区查看。");
      return;
    }
    const detail = el.querySelector(".tl-detail");
    if (detail && detail.hidden) {
      detail.hidden = false;
      const toggle = el.querySelector(".tl-toggle");
      if (toggle) {
        toggle.textContent = "收起 ↑";
        toggle.setAttribute("aria-expanded", "true");
      }
    }
    el.scrollIntoView({ behavior: motionBehavior(), block: "center" });
    el.classList.add("is-focused");
    clearTimeout(el._focusTimer);
    el._focusTimer = setTimeout(() => el.classList.remove("is-focused"), 2200);
  }

  function swapBlock(button) {
    const key = button.dataset.swapKey;
    const current = button.dataset.current;
    const group = PLANNER.SWAPS[key];
    if (!group || !group.length) return;
    const idx = group.indexOf(current);
    const next = group[(idx + 1) % group.length];
    if (!next || next === current) return;
    state.overrides[key] = next;
    state.preset = "custom";
    generate(false);
    const p = placeById(next);
    showToast(`已换成 ${p ? p.name : next}`);
  }

  /* =========================================================
     Text / share / print
     ========================================================= */
  function itineraryText() {
    const lines = [];
    lines.push("【姑苏两日 · 与君慢行】");
    lines.push(`${state.plan.days[0].date} — ${state.plan.days[1].date} · 2天1夜 · 情侣漫游`);
    lines.push(`当前方案：${PACE_LABEL[state.pace]} / ${FOOD_LABEL[state.food]} / ${state.experiences.map((k) => (EXP_OPTIONS.find((o) => o.key === k) || {}).label).filter(Boolean).join(" + ") || "不额外安排体验"}`);
    lines.push("");
    state.plan.days.forEach((day) => {
      lines.push(`══ DAY ${day.day} · ${day.title} ══`);
      lines.push(day.summary);
      day.blocks.forEach((b) => {
        if (b.type === "custom") {
          lines.push(`${fmt(b.start)}–${fmt(b.end)}  ${b.title}（手动卡片${b.price ? "，约 ¥" + b.price + "/人" : ""}）`);
          if (b.note) lines.push(`  ${b.note}`);
          return;
        }
        if (b.type !== "place") {
          lines.push(`${fmt(b.start)}–${fmt(b.end)}  ${b.title}：${b.detail}`);
          return;
        }
        const p = placeById(b.placeId);
        if (!p) return;
        lines.push(`${fmt(b.start)}–${fmt(b.end)}  ${b.title || p.name}（${blockPriceText(b, p)}）`);
        lines.push(`  ${p.summary}`);
        if (b.placeId === "pingjiang") lines.push(`  摇橹船：¥40/人，约 35 分钟；官方码头购票。`);
        if (p.kind === "food") lines.push(`  点评摘录：${p.review.quote}`);
        if (p.kind === "food" || b.foodId) {
          const f = b.foodId ? placeById(b.foodId) : p;
          if (f) lines.push(`  点评搜索：${f.links.dianping}`);
        }
        lines.push(`  地址：${p.address}`);
        if (b.note) lines.push(`  备注：${b.note}`);
      });
      lines.push("");
    });
    lines.push("【预约提醒】");
    lines.push("苏博本馆：提前 7 天 08:00 在“苏州博物馆全预约”小程序抢票，周一闭馆。");
    lines.push("拙政园 / 留园 / 虎丘：提前 7 天实名分时预约，带身份证原件。");
    lines.push("网师园夜花园：¥120/人，官方公众号实名预约；琵琶语评弹提前确认吴亮莹场次。");
    lines.push("");
    lines.push(`【预算】人均约 ${price(state.budget.perPerson)}（不含住宿），两人不含住宿约 ${price(state.budget.total)}${state.budget.rows.stay ? `；含住宿约 ${price(state.budget.totalWithStay)}` : ""}。`);
    lines.push("【说明】点评摘录与票价来自公开资料，出发前请以平台实时信息为准。");
    return lines.join("\n");
  }

  async function copyItinerary() {
    try {
      await copyText(itineraryText());
      showToast("完整行程已复制，可直接发给同行者。");
    } catch (e) {
      showToast("复制失败，请手动选择文本。");
    }
  }

  async function sharePlanLink() {
    if (location.protocol === "file:") {
      await copyItinerary();
      showToast("本地文件无法分享链接，已复制行程文本。");
      return;
    }
    try {
      await copyText(`${shareUrl()}\n\n${itineraryText()}`);
      showToast("分享链接 + 行程已复制，发给 TA 即可。");
    } catch (e) {
      showToast("分享失败，请检查浏览器剪贴板权限。");
    }
  }

  /* =========================================================
     Generate / presets
     ========================================================= */
  function generate(scrollTo) {
    const result = PLANNER.build({
      data: DATA,
      prefs: state,
      customCards: state.customCards,
      stays: state.stays,
    });
    state.plan = result.plan;
    state.budget = result.budget;
    state.transit = result.transit;
    state.planMeta = result.plan.meta;
    state.priceFallback = !!result.plan.meta.priceFallback;
    const planDates = result.plan.meta && result.plan.meta.dates;
    if (planDates) {
      state.startDate = planDates.start;
      state.endDate = planDates.end;
    }
    // 只在用户主动生成或状态区域为空时播报，避免筛选/换价位时反复打断读屏。
    const generateStatus = $("#generateStatus");
    if (generateStatus && (scrollTo || !generateStatus.textContent)) {
      generateStatus.textContent = `已生成 ${result.plan.days[0].date} 至 ${result.plan.days[1].date} 行程，人均 ${price(state.budget.perPerson)}。`;
    }
    if (!state.plan.days.some((d) => d.day === state.day)) state.day = 1;
    state.mapFilter = `day${state.day}`;
    renderDayTabs();
    renderTimeline();
    renderAside();
    renderBudget();
    renderResult();
    renderExperiences();
    renderMap();
    renderTransit();
    syncControls();
    renderRail();
    updateDateUI();
    saveState();
    if (scrollTo) {
      setTimeout(() => {
        const target = document.getElementById("itinerary");
        if (target) target.scrollIntoView({ behavior: motionBehavior(), block: "start" });
      }, 80);
    }
  }

  function applyPreset(id) {
    const preset = DATA.presets[id];
    if (!preset) return;
    state.preset = id;
    state.pace = preset.pace;
    state.food = preset.food;
    state.experiences = [...preset.experiences];
    state.rainy = !!preset.rainy;
    state.student = false;
    state.priceMin = null;
    state.priceMax = null;
    state.priceFallback = false;
    state.overrides = {};
    state.day = 1;
    state.mapFilter = "day1";
    generate(false);
    const name = preset.name;
    showToast(`已切换到「${name}」；点“生成”可再次应用。`);
  }

  function nextPreset() {
    const ids = Object.keys(DATA.presets);
    const idx = ids.indexOf(state.preset);
    applyPreset(ids[(idx + 1) % ids.length]);
  }

  function toggleExperience(key) {
    if (!key) return;
    const exists = hasExp(key);
    if (!exists) {
      if (key === "nightgarden") state.experiences = state.experiences.filter((k) => k !== "pingtan");
      if (key === "pingtan") state.experiences = state.experiences.filter((k) => k !== "nightgarden");
      state.experiences.push(key);
    } else {
      state.experiences = state.experiences.filter((k) => k !== key);
    }
    state.rainy = false;
    state.preset = "custom";
    state.overrides = {};
    generate(false);
    const label = (EXP_OPTIONS.find((o) => o.key === key) || {}).label || key;
    if (key === "nightgarden" && !exists && !state.experiences.includes("pingtan")) {
      showToast("已加入夜游网师园；为了不赶场，已取消同一晚的评弹。");
    } else {
      showToast(`${exists ? "已移出" : "已加入"}：${label}`);
    }
  }

  /* =========================================================
     Events
     ========================================================= */
  function updateHeader() {
    const header = $("#siteHeader");
    if (!header) return;
    header.classList.toggle("is-stuck", window.scrollY > 24);
  }

  function bindEvents() {
    $("#presetRow").addEventListener("click", (e) => {
      const btn = e.target.closest("[data-preset]");
      if (btn) applyPreset(btn.dataset.preset);
    });
    $("#paceControl").addEventListener("click", (e) => {
      const btn = e.target.closest("[data-pace]");
      if (!btn || btn.dataset.pace === state.pace) return;
      state.pace = btn.dataset.pace;
      state.preset = "custom";
      state.overrides = {};
      generate(false);
    });
    $("#foodControl").addEventListener("click", (e) => {
      const btn = e.target.closest("[data-food]");
      if (!btn || btn.dataset.food === state.food) return;
      state.food = btn.dataset.food;
      state.preset = "custom";
      state.overrides = {};
      generate(false);
    });
    $("#experienceControl").addEventListener("click", (e) => {
      const btn = e.target.closest("[data-exp]");
      if (btn) toggleExperience(btn.dataset.exp);
    });
    $("#arrivalSelect").addEventListener("change", (e) => {
      state.arrival = e.target.value;
      state.preset = "custom";
      generate(false);
    });
    $("#departureSelect").addEventListener("change", (e) => {
      state.departure = e.target.value;
      state.preset = "custom";
      generate(false);
    });
    $("#stationSelect").addEventListener("change", (e) => {
      state.station = e.target.value;
      state.preset = "custom";
      generate(false);
    });
    const startDateInput = $("#startDate");
    if (startDateInput) {
      startDateInput.addEventListener("change", (e) => {
        const value = e.target.value;
        if (!isIsoDate(value)) {
          generate(false);
          e.target.value = state.startDate;
          return;
        }
        const previousEnd = state.endDate;
        state.startDate = value;
        const nextEnd = addDaysISO(value, 1);
        if (nextEnd) state.endDate = nextEnd;
        e.target.value = state.startDate;
        const endEl = $("#endDate");
        if (endEl) endEl.value = state.endDate;
        if (nextEnd && previousEnd !== nextEnd) showToast("本页固定两天一夜，返程已同步到出发次日。");
        generate(false);
      });
    }
    const endDateInput = $("#endDate");
    if (endDateInput) {
      endDateInput.addEventListener("change", (e) => {
        const value = e.target.value;
        if (!isIsoDate(value)) {
          generate(false);
          e.target.value = state.endDate;
          return;
        }
        const normalizedEnd = addDaysISO(state.startDate, 1);
        if (normalizedEnd && value !== normalizedEnd) {
          state.endDate = normalizedEnd;
          e.target.value = normalizedEnd;
          showToast(`本页固定两天一夜，返程已回到 ${normalizedEnd}。`);
        } else {
          state.endDate = value;
        }
        generate(false);
      });
    }
    $("#btnGenerate").addEventListener("click", () => generate(true));
    $("#btnGenerateInline").addEventListener("click", () => generate(true));
    $("#btnGenerateTop").addEventListener("click", () => generate(true));
    $("#heroGenerate").addEventListener("click", () => generate(true));
    $("#dockGenerate").addEventListener("click", () => generate(true));
    $("#btnRandom").addEventListener("click", nextPreset);
    $("#studentToggle").addEventListener("change", (e) => setStudentMode(e.target.checked));
    $("#btnStudentPlan").addEventListener("click", () => {
      state.student = true;
      state.food = "local";
      state.pace = "balanced";
      state.experiences = ["boat", "sunset"];
      state.priceMin = 0;
      state.priceMax = 100;
      state.preset = "custom";
      state.overrides = { "d2-morning": "hanshan_temple" };
      generate(false);
      saveState();
      showToast("已切到学生省钱版：学生票 + 人均≤100 + 摇橹船 + 寒山寺。");
    });

    $("#dayTabs").addEventListener("click", (e) => {
      const tab = e.target.closest("[data-day]");
      if (!tab) return;
      // 有些浏览器点击按钮不给焦点；显式聚焦，setDay 重建后再归还。
      if (document.activeElement !== tab) tab.focus();
      setDay(Number(tab.dataset.day));
    });

    // 真正的 tab 键盘模式：左右方向键循环，Home/End 到首尾。
    $("#dayTabs").addEventListener("keydown", (e) => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
      const tabs = $$("#dayTabs [role='tab']");
      const idx = tabs.indexOf(document.activeElement);
      if (idx < 0) return;
      let next = null;
      if (e.key === "ArrowRight") next = tabs[(idx + 1) % tabs.length];
      else if (e.key === "ArrowLeft") next = tabs[(idx - 1 + tabs.length) % tabs.length];
      else if (e.key === "Home") next = tabs[0];
      else next = tabs[tabs.length - 1];
      if (!next) return;
      e.preventDefault();
      const day = Number(next.dataset.day);
      next.focus();
      if (day && day !== state.day) setDay(day);
    });

    $("#timeline").addEventListener("click", (e) => {
      const editCustom = e.target.closest("[data-edit-custom]");
      if (editCustom) { editCustomCard(editCustom.dataset.editCustom); return; }
      const deleteCustom = e.target.closest("[data-delete-custom]");
      if (deleteCustom) { deleteCustomCard(deleteCustom.dataset.deleteCustom); return; }
      const toggle = e.target.closest("[data-toggle-detail]");
      if (toggle) {
        const card = toggle.closest(".tl-card");
        const detail = card && card.querySelector(".tl-detail");
        if (detail) {
          const open = detail.hidden;
          detail.hidden = !open;
          toggle.setAttribute("aria-expanded", String(open));
          toggle.textContent = open ? "收起 ↑" : "详情 ↓";
        }
        return;
      }
      const swap = e.target.closest("[data-swap-key]");
      if (swap) { swapBlock(swap); return; }
      const mapBtn = e.target.closest("[data-map-place]");
      if (mapBtn) { showOnMap(mapBtn.dataset.mapPlace); return; }
      const foodBtn = e.target.closest("[data-scroll-food]");
      if (foodBtn) {
        state.foodFilter = "all";
        renderFoodFilters();
        renderFoodGrid();
        document.getElementById("food").scrollIntoView({ behavior: motionBehavior(), block: "start" });
        setTimeout(() => {
          const cards = $$("#foodGrid .food-card").filter((card) => ["daniangniang", "yuyongsheng", "tangyifang"].includes(card.dataset.foodCard));
          if (cards[0]) cards[0].scrollIntoView({ behavior: motionBehavior(), block: "center" });
        }, 350);
      }
    });

    $("#foodFilters").addEventListener("click", (e) => {
      const btn = e.target.closest("[data-food-filter]");
      if (!btn) return;
      state.foodFilter = btn.dataset.foodFilter;
      state.foodLimit = FOOD_PAGE_SIZE;
      renderFoodFilters();
      renderFoodGrid();
    });

    $("#foodLoadMore").addEventListener("click", () => {
      state.foodLimit += FOOD_PAGE_SIZE;
      renderFoodGrid();
    });

    ["#pricePresets", "#foodPricePresets"].forEach((sel) => {
      const el = $(sel);
      if (!el) return;
      el.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-price-preset]");
        if (!btn) return;
        const preset = PRICE_PRESETS.find((p) => p.id === btn.dataset.pricePreset);
        if (preset) setPriceRange(preset.min, preset.max, false);
      });
    });

    const pricePairs = [["#priceMin", "#priceMax"], ["#foodPriceMin", "#foodPriceMax"]];
    pricePairs.forEach(([minSel, maxSel]) => {
      [minSel, maxSel].forEach((sel) => {
        const el = $(sel);
        if (!el) return;
        el.addEventListener("input", () => {
          setPriceRange(numOrNull($(minSel).value), numOrNull($(maxSel).value), true);
        });
      });
    });
    ["#priceClear", "#foodPriceClear"].forEach((sel) => {
      const el = $(sel);
      if (el) el.addEventListener("click", () => setPriceRange(null, null, false));
    });

    $("#foodGrid").addEventListener("click", (e) => {
      const addBtn = e.target.closest("[data-add-food-card]");
      if (addBtn) { openFoodCard(addBtn.dataset.addFoodCard); return; }
      const btn = e.target.closest("[data-map-place]");
      if (btn) showOnMap(btn.dataset.mapPlace);
    });

    $("#experienceGrid").addEventListener("click", (e) => {
      const mapBtn = e.target.closest("[data-map-place]");
      if (mapBtn) { showOnMap(mapBtn.dataset.mapPlace); return; }
      const expBtn = e.target.closest("[data-exp-toggle]");
      if (expBtn) toggleExperience(expBtn.dataset.expToggle);
    });

    $("#mapFilters").addEventListener("click", (e) => {
      const btn = e.target.closest("[data-map-filter]");
      if (!btn) return;
      const filter = btn.dataset.mapFilter;
      state.mapFilter = filter;
      if (filter === "day1" || filter === "day2") {
        // 地图切到某一日时，时间线也要跟着走，否则手动卡片的锚点无法命中。
        setDay(filter === "day2" ? 2 : 1);
        return;
      }
      renderMap();
    });
    $("#mapDayToggle").addEventListener("click", (e) => {
      const btn = e.target.closest("[data-day]");
      if (!btn) return;
      state.mapFilter = `day${btn.dataset.day}`;
      const day = Number(btn.dataset.day);
      if (day !== state.day) {
        state.day = day;
        renderDayTabs();
        renderTimeline();
        renderAside();
        renderTransit();
      }
      renderMap();
    });
    $("#mapList").addEventListener("click", (e) => {
      const item = e.target.closest("[data-map-id]");
      if (item) openMapMarker(item.dataset.mapId);
    });
    $("#mapPanelTabs").addEventListener("click", (e) => {
      const btn = e.target.closest("[data-map-pane]");
      if (!btn) return;
      const pane = btn.dataset.mapPane;
      $$("#mapPanelTabs [data-map-pane]").forEach((tab) => {
        const on = tab === btn;
        tab.classList.toggle("is-active", on);
        tab.setAttribute("aria-selected", String(on));
      });
      const points = $("#mapPointsPane");
      const transit = $("#mapTransitPane");
      if (points) points.hidden = pane !== "points";
      if (transit) transit.hidden = pane !== "transit";
    });
    // 地图弹窗统一走事件委托：看详情（原内联处理器）与手动卡片跳转共用。
    $("#map").addEventListener("click", (e) => {
      const focusBtn = e.target.closest("[data-focus-place]");
      if (focusBtn) {
        focusPlace(focusBtn.dataset.focusPlace);
        return;
      }
      const link = e.target.closest("a[data-custom-day]");
      if (!link) return;
      e.preventDefault();
      const day = Number(link.dataset.customDay) === 2 ? 2 : 1;
      if (day !== state.day) setDay(day);
      const id = String(link.getAttribute("href") || "").replace(/^#/, "");
      const target = id ? document.getElementById(id) : null;
      if (!target) {
        showToast("这张卡片当前不在时间线里，可能已被删除。");
        return;
      }
      target.scrollIntoView({ behavior: motionBehavior(), block: "center" });
      target.classList.add("is-focused");
      clearTimeout(target._focusTimer);
      target._focusTimer = setTimeout(() => target.classList.remove("is-focused"), 2200);
    });
    const mapRetry = $("#mapRetry");
    if (mapRetry) {
      mapRetry.addEventListener("click", () => {
        const box = $("#mapFallback");
        if (box) box.hidden = true;
        mapFallbackOn = false;
        mapTileErrors = 0;
        mapVisible = true;
        const notice = $("#mapNotice");
        if (notice) notice.hidden = true;
        // 重建地图前清干净：防抖计时器、fit 锁、旧 marker/路线/瓦片层。
        clearTimeout(mapZoomTimer);
        clearTimeout(mapFitTimer);
        mapZoomTimer = null;
        mapFitTimer = null;
        mapFitting = false;
        mapMarkers.clear();
        markerLayer = null;
        routeLayer = null;
        tileLayer = null;
        const container = document.getElementById("map");
        if (container) container.classList.remove("is-dimmed");
        if (map) {
          map.off();
          map.remove();
          map = null;
        }
        ensureMap();
        renderMap();
        showToast("正在重试底图…");
      });
    }

    $("#bookingChecklist").addEventListener("change", (e) => {
      const input = e.target.closest("[data-check]");
      if (!input) return;
      const checked = checklistState();
      if (input.checked) checked.add(input.dataset.check);
      else checked.delete(input.dataset.check);
      safeSet("gusu.checklist.v1", JSON.stringify(Array.from(checked)));
      updateCheckProgress();
      if (input.checked) showToast("已勾选，出发前记得再核对一次。");
    });

    $("#sourceTools").addEventListener("click", (e) => {
      const btn = e.target.closest("[data-source-filter]");
      if (!btn) return;
      state.sourceFilter = btn.dataset.sourceFilter;
      renderSourceFilters();
      renderSources();
    });

    $("#btnCopy").addEventListener("click", copyItinerary);
    $("#btnShareTop").addEventListener("click", sharePlanLink);
    $("#btnAddCard").addEventListener("click", () => openCardModal());
    $("#cardForm").addEventListener("submit", saveCardForm);
    $("#cardPlace").addEventListener("change", onCardPlaceChange);
    $("#cardForm").addEventListener("input", updateCardConflictPreview);
    $("#cardForm").addEventListener("change", updateCardConflictPreview);
    $$("[data-close-modal]").forEach((el) => el.addEventListener("click", closeCardModal));
    document.addEventListener("keydown", (e) => {
      const modal = $("#cardModal");
      if (!modal || modal.hidden) return;
      if (e.key === "Escape") { closeCardModal(); return; }
      if (e.key !== "Tab") return;
      const focusables = modalFocusables();
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (!modal.contains(document.activeElement)) {
        e.preventDefault();
        first.focus();
        return;
      }
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    });
    $("#stayForm").addEventListener("submit", saveStayForm);
    $("#stayList").addEventListener("click", (e) => {
      const baseBtn = e.target.closest("[data-base-stay]");
      if (baseBtn) {
        const id = baseBtn.dataset.baseStay;
        const isBase = state.stays.some((s) => s.id === id && s.base);
        setStayBase(id, !isBase);
        return;
      }
      const btn = e.target.closest("[data-delete-stay]");
      if (btn) deleteStay(btn.dataset.deleteStay);
    });
    $("#btnExpandAll").addEventListener("click", (e) => {
      const open = e.currentTarget.dataset.open !== "true";
      e.currentTarget.dataset.open = String(open);
      $$("#timeline .tl-detail").forEach((detail) => { detail.hidden = !open; });
      $$("#timeline .tl-toggle").forEach((toggle) => {
        toggle.textContent = open ? "收起 ↑" : "详情 ↓";
        toggle.setAttribute("aria-expanded", String(open));
      });
      e.currentTarget.textContent = open ? "收起全部" : "展开全部";
    });
    $("#btnPrint").addEventListener("click", () => {
      showToast(`准备打印 Day ${state.day}；两天都打印请先切换另一天。`);
      setTimeout(() => window.print(), 180);
    });

    const readDateBtn = $("#btnReadDate");
    if (readDateBtn) {
      readDateBtn.addEventListener("click", () => {
        const note = $("#dateNote");
        if (note) note.classList.add("is-hidden");
        safeSet("gusu.dateNoteHidden", "1");
      });
    }

    $("#navToggle").addEventListener("click", () => {
      if ($("#sideRail").classList.contains("is-open")) closeRail();
      else openRail();
    });
    $("#railClose").addEventListener("click", closeRail);
    $("#railBackdrop").addEventListener("click", closeRail);
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && $("#sideRail").classList.contains("is-open")) closeRail();
    });
    $$("#railNav a").forEach((a) => a.addEventListener("click", () => {
      if (window.matchMedia("(max-width: 900px)").matches) closeRail();
    }));
    $("#railStudentToggle").addEventListener("change", (e) => setStudentMode(e.target.checked));
    $("#railPricePresets").addEventListener("click", (e) => {
      const btn = e.target.closest("[data-rail-price]");
      if (!btn) return;
      const p = PRICE_PRESETS.find((preset) => preset.id === btn.dataset.railPrice);
      if (!p) return;
      setPriceRange(p.min, p.max, false);
      generate(false);
      showToast(`已按「${p.label}」筛选并重排。`);
    });
    $("#railShare").addEventListener("click", sharePlanLink);
    $("#railCopy").addEventListener("click", copyItinerary);
    $("#railPrint").addEventListener("click", () => {
      showToast(`准备打印 Day ${state.day}；两天都打印请先切换另一天。`);
      setTimeout(() => window.print(), 180);
    });

    window.addEventListener("beforeprint", () => {
      const fold = document.querySelector("#sourceFold");
      if (!fold) return;
      sourceFoldWasOpen = fold.open;
      fold.open = true;
    });
    window.addEventListener("afterprint", () => {
      const fold = document.querySelector("#sourceFold");
      if (fold) fold.open = sourceFoldWasOpen;
    });

    window.addEventListener("scroll", () => {
      updateHeader();
      if (railTick) return;
      railTick = true;
      requestAnimationFrame(() => {
        railTick = false;
        updateRailActive();
      });
    }, { passive: true });
    window.addEventListener("resize", () => {
      clearTimeout(window._mapResize);
      window._mapResize = setTimeout(() => {
        if (map && !mapFallbackOn) map.invalidateSize();
      }, 180);
    });
  }

  function initReveal() {
    const items = $$(".reveal");
    if (!("IntersectionObserver" in window)) {
      items.forEach((el) => el.classList.add("is-in"));
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-in");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    items.forEach((el) => observer.observe(el));
  }

  function wireReportDownload() {
    if (!window.GUSU_REPORT_BASE64) return;
    const href = `data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,${window.GUSU_REPORT_BASE64}`;
    $$("[data-report-download]").forEach((a) => {
      a.href = href;
      a.setAttribute("download", "苏州两天一夜学生情侣调研_2026.docx");
    });
  }

  function init() {
    wireReportDownload();
    Object.assign(state, loadInitialState());
    state.customCards = loadCustomCards();
    state.stays = loadStays();
    if (safeGet("gusu.dateNoteHidden") === "1") $("#dateNote").classList.add("is-hidden");
    $("#stayCheckin").value = state.startDate;
    $("#stayCheckout").value = state.endDate;
    renderPresets();
    renderExperienceChips();
    renderSelects();
    renderPricePresets();
    syncPriceInputs();
    renderFoodFilters();
    renderFoodGrid();
    renderExperiences();
    renderSourceFilters();
    renderSources();
    renderChecklist();
    renderStays();
    generate(false);
    bindEvents();
    watchMaps();
    initReveal();
    updateHeader();
    window.GusuApp = {
      focusPlace,
      showOnMap,
      generate,
      openMapMarker,
    };
    setTimeout(() => {
      if (map && !mapFallbackOn) map.invalidateSize();
    }, 500);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
