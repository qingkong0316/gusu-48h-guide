/* 姑苏两日 · 纯排程内核
   不依赖 DOM、localStorage、Leaflet；浏览器和 Node 测试共用。 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.GusuPlanner = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  const WEEKDAYS = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
  const SHANGHAI_OFFSET = 8;

  // 先把分钟归一成整数再拆分，否则 59.6 会被拆成 "00:60"。
  // 非有限值（NaN/Infinity）与负数按 0 处理，避免输出 "--:--" 或负时间。
  const fmt = (m) => {
    const n = Number(m);
    const total = Number.isFinite(n) && n > 0 ? Math.round(n) : 0;
    const h = Math.floor(total / 60);
    const mm = total % 60;
    return `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
  };
  const toMin = (time) => {
    const [h, m] = String(time).split(":").map(Number);
    return (h || 0) * 60 + (m || 0);
  };
  // 手动卡片的开始时间必须是严格的 HH:MM；非法值按 00:00 落块并给出警告。
  const HHMM = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
  const START_TIME_WARNING = "开始时间格式无效（应为 00:00–23:59），已按 00:00 处理。";
  const TRANSIT_EXCLUDED_EARLY = "手动卡片早于到达时间，已从通勤计算中排除。";
  const TRANSIT_EXCLUDED_AFTER_LAST = "手动卡片在当天最后一个固定停留之后，已从通勤计算中排除；请确认是否赶得上返程/夜间安排。";
  const TRANSIT_EXCLUDED_AFTER_DEPARTURE = "手动卡片落在返程预留时间之后，已从通勤计算中排除。";
  function parseStart(value) {
    const raw = typeof value === "string" ? value.trim() : "";
    if (!HHMM.test(raw)) return { minutes: 0, valid: false };
    return { minutes: toMin(raw), valid: true };
  }
  const round5 = (n) => Math.max(5, Math.round(n / 5) * 5);
  const round10 = (n) => Math.max(0, Math.round(n / 10) * 10);
  const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

  function parseISO(iso) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ""));
    if (!m) return null;
    const year = Number(m[1]);
    const month = Number(m[2]);
    const day = Number(m[3]);
    const d = new Date(Date.UTC(year, month - 1, day));
    if (Number.isNaN(d.getTime())) return null;
    // Date.UTC 会把 2026-02-30 归一成 3 月 2 日；要求年月日原样回读才算合法。
    if (d.getUTCFullYear() !== year || d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) return null;
    return d;
  }

  function isoOf(d) {
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
  }

  function dateInfo({ start, end, baseline, now } = {}) {
    const warnings = [];
    let from = parseISO(start);
    let to = parseISO(end);
    if (!from) { from = parseISO("2026-10-27"); warnings.push("出发日期无效，已回退到 2026-10-27。"); }
    if (!to) { to = new Date(from.getTime() + 86400000); warnings.push("返程日期无效，已回退到出发次日。"); }
    if (to < from) {
      warnings.push("返程日期早于出发日期，已互换。");
      const tmp = from; from = to; to = tmp;
    }
    const nights = Math.round((to - from) / 86400000);
    if (nights !== 1) warnings.push("本页按两天一夜编排，当前日期跨度不是 1 晚；行程仍只使用前两天。");
    const days = [];
    for (let i = 0; i < 2; i += 1) {
      const d = new Date(from.getTime() + i * 86400000);
      const iso = isoOf(d);
      days.push({
        iso,
        md: `${String(d.getUTCMonth() + 1).padStart(2, "0")}.${String(d.getUTCDate()).padStart(2, "0")}`,
        weekday: WEEKDAYS[d.getUTCDay()],
        weekdayShort: WEEKDAYS[d.getUTCDay()].replace("周", ""),
        isWeekend: [0, 6].includes(d.getUTCDay()),
        sunset: sunsetFor(iso),
      });
    }
    const fountain = {
      // 金鸡湖在 Day 2；只有第二天是周五/周六才提示喷泉。
      available: ["周五", "周六"].includes(days[1].weekday),
      times: ["19:30"],
    };
    let stale = false;
    if (baseline && now) {
      const base = parseISO(baseline);
      const today = parseISO(now);
      if (base && today && (today - base) / 86400000 > 180) stale = true;
    }
    return {
      start: days[0].iso,
      end: days[1].iso,
      days,
      nights,
      fountain,
      stale,
      warnings,
    };
  }

  function degToRad(d) { return (d * Math.PI) / 180; }
  function radToDeg(r) { return (r * 180) / Math.PI; }
  const sinD = (d) => Math.sin(degToRad(d));
  const cosD = (d) => Math.cos(degToRad(d));
  const tanD = (d) => Math.tan(degToRad(d));
  const acosD = (x) => radToDeg(Math.acos(x));
  const atanD = (x) => radToDeg(Math.atan(x));

  function sunsetFor(iso, lat = 31.3, lng = 120.6) {
    const date = parseISO(iso);
    if (!date) return null;
    const start = Date.UTC(date.getUTCFullYear(), 0, 0);
    const dayOfYear = Math.floor((date - start) / 86400000);
    const lngHour = lng / 15;
    const t = dayOfYear + (18 - lngHour) / 24;
    const M = 0.9856 * t - 3.289;
    let L = M + 1.916 * sinD(M) + 0.02 * sinD(2 * M) + 282.634;
    L = ((L % 360) + 360) % 360;
    let RA = atanD(0.91764 * tanD(L));
    RA = ((RA % 360) + 360) % 360;
    const lQuad = Math.floor(L / 90) * 90;
    const raQuad = Math.floor(RA / 90) * 90;
    RA = (RA + (lQuad - raQuad)) / 15;
    const sinDec = 0.39782 * sinD(L);
    const cosDec = Math.cos(Math.asin(sinDec));
    const cosH = (cosD(90.833) - sinDec * sinD(lat)) / (cosDec * cosD(lat));
    if (cosH < -1 || cosH > 1) return null;
    // 日落取正时角：H = acos(cosH) / 15；360 - acos 得到的是日出。
    const H = acosD(cosH) / 15;
    const T = H + RA - 0.06571 * t - 6.622;
    let UT = T - lngHour;
    UT = ((UT % 24) + 24) % 24;
    const local = (UT + SHANGHAI_OFFSET + 24) % 24;
    let hh = Math.floor(local);
    let mm = Math.round((local - hh) * 60);
    if (mm === 60) { mm = 0; hh = (hh + 1) % 24; }
    return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
  }

  function haversineKm(a, b) {
    const toRad = (d) => (d * Math.PI) / 180;
    const R = 6371;
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
  }

  const hasCoords = (p) => Boolean(p) && Number.isFinite(p.lat) && Number.isFinite(p.lng);

  function travelEstimate(from, to, preferredMode) {
    // 经纬度必须同时是有限数字，少一个 lng 也会让 haversine 算出 NaN。
    if (!hasCoords(from) || !hasCoords(to)) {
      return { mode: preferredMode || "walk", minutes: 5, fare: 0, distance: 0, estimated: true };
    }
    const raw = haversineKm(from, to);
    let mode = preferredMode || (raw > 1.4 ? "taxi" : "walk");
    if (mode === "walk" && raw > 1.8) mode = "taxi";
    const distance = raw * (mode === "taxi" ? 1.25 : 1.3);
    const minutes = mode === "walk"
      ? round5((distance * 1000) / 75)
      : round5(8 + distance / 0.35);
    const fare = mode === "taxi" ? Math.max(10, Math.round((10 + distance * 2.5) / 5) * 5) : 0;
    return { mode, minutes, fare, distance, estimated: true };
  }

  function transitNodeOf(place) {
    return {
      id: place.id,
      name: place.name,
      short: place.short || place.name,
      lat: place.lat,
      lng: place.lng,
      kind: place.kind,
    };
  }

  // 手动卡片冲突：只检测同日、真实重叠与同地点重复；不移动任何块。
  const BLOCK_LABELS = { place: "行程地点", custom: "手动卡片", move: "通勤", note: "休息/备注" };
  function conflictsFor(card, plan, options = {}) {
    if (!card || !plan || !Array.isArray(plan.days)) return [];
    const day = plan.days.find((d) => d.day === Number(card.day));
    if (!day) return [{ type: "missing-day", message: "找不到对应日期。" }];
    const start = parseStart(card.start).minutes;
    const end = start + Math.max(15, Number(card.duration) || 60);
    const excludeId = options && options.excludeId !== undefined ? options.excludeId : card.id;
    const out = [];
    (day.blocks || []).forEach((b) => {
      if (excludeId != null && b.type === "custom" && b.customId === excludeId) return;
      // 关联卡片与内置 place 块同地点也算重复，不只 custom-vs-custom。
      if (card.placeId && b.placeId === card.placeId && (b.type === "custom" || b.type === "place")) {
        out.push({ type: "duplicate-place", message: `同一天已经安排了同一地点（${b.label || b.title || BLOCK_LABELS[b.type] || "行程地点"}）。`, block: b });
      }
      if (start < b.end && end > b.start) {
        out.push({
          type: "overlap",
          message: `与 ${fmt(b.start)}–${fmt(b.end)} 的「${b.label || b.title || BLOCK_LABELS[b.type] || b.type}」重叠 ${Math.min(end, b.end) - Math.max(start, b.start)} 分钟。`,
          block: b,
        });
      }
    });
    return out;
  }

  const HTTP = /^https?:\/\//i;  // 随页面分发的本地资料文件（如 research/xxx.docx）也算合法来源：
  // 只接受无协议、不以 // 开头的相对路径，javascript:/data: 等危险协议仍会被拒绝。
  const LOCAL_DOC = /^(?!\/\/)[\w\u4e00-\u9fff][\w\u4e00-\u9fff .\-/]*\.(?:docx?|pdf|md)$/i;
  const isSafeSource = (url) => HTTP.test(String(url || "")) || LOCAL_DOC.test(String(url || ""));
  const OFFICIAL_HOSTS = ["szmuseum.com"];
  // confidence 为 official 时，预约链接必须落在官方域名（含子域名）。
  function isOfficialUrl(url) {
    const raw = String(url || "").trim();
    if (!raw) return false;
    try {
      if (typeof URL === "function") {
        const parsed = new URL(raw);
        if (!/^https?:$/.test(parsed.protocol)) return false;
        const host = parsed.hostname.toLowerCase().replace(/\.$/, "");
        return OFFICIAL_HOSTS.some((domain) => host === domain || host.endsWith(`.${domain}`));
      }
    } catch (e) {
      return false;
    }
    const match = /^(https?):\/\/([^/?#]+)/i.exec(raw);
    if (!match) return false;
    const host = match[2]
      .toLowerCase()
      .split("@").pop()
      .replace(/:\d+$/, "")
      .replace(/\.$/, "");
    return OFFICIAL_HOSTS.some((domain) => host === domain || host.endsWith(`.${domain}`));
  }
  const KINDS = new Set(["spot", "food", "experience"]);
  const CATEGORIES = new Set(["main", "noodle", "snack", "sweet", "lake", "veg", "cafe", "creative"]);

  function auditData(data) {
    const issues = [];
    if (!data || !Array.isArray(data.spots) || !Array.isArray(data.foods) || !Array.isArray(data.experiences)) {
      return ["数据结构缺少 spots/foods/experiences"];
    }
    const seen = new Set();
    const all = [...data.spots, ...data.foods, ...data.experiences];
    for (const p of all) {
      const label = p && p.id ? p.id : "(无名)";
      if (!p || !p.id) { issues.push(`缺少 id: ${label}`); continue; }
      if (seen.has(p.id)) issues.push(`id 重复: ${p.id}`);
      seen.add(p.id);
      if (!KINDS.has(p.kind)) issues.push(`kind 非法: ${p.id} (${p.kind})`);
      if (!p.name) issues.push(`缺少 name: ${p.id}`);
      if (!Number.isFinite(p.lat) || !Number.isFinite(p.lng) || p.lat < 30.8 || p.lat > 31.6 || p.lng < 120.2 || p.lng > 121.0) {
        issues.push(`坐标越界或缺失: ${p.id}`);
      }
      if (!Number.isFinite(p.price) || p.price < 0) issues.push(`价格非法: ${p.id}`);
      if (p.links) {
        for (const [key, url] of Object.entries(p.links)) {
          if (!HTTP.test(String(url))) issues.push(`链接非法: ${p.id}.${key}`);
        }
      } else {
        issues.push(`缺少 links: ${p.id}`);
      }
      if (p.kind === "food" && p.category && !CATEGORIES.has(p.category)) {
        issues.push(`食单分类非法: ${p.id} (${p.category})`);
      }
      if (p.review && p.review.summary != null && typeof p.review.summary !== "boolean") {
        issues.push(`review.summary 非布尔: ${p.id}`);
      }
      if (p.confidence === "official" && !isOfficialUrl(p.booking && p.booking.url)) {
        issues.push(`official 来源不是官方域名: ${p.id}`);
      }
    }
    // sources 缺失/非数组按空处理；数组里的 null、非对象条目一律视为非法来源。
    const sources = Array.isArray(data.sources) ? data.sources : [];
    sources.forEach((s, i) => {
      if (!s || typeof s !== "object" || !isSafeSource(s.url)) issues.push(`来源链接非法: sources[${i}]`);
    });
    return issues;
  }

  /* =========================================================
     行程引擎 · 常量
     路线文案沿用 assets/app.js；Task 3 起由 planner 负责日期、
     住宿基地、手动卡片、动态通勤与预算。
     ========================================================= */
  const STATIONS = {
    "苏州站": { short: "苏州站", transfer: 30, note: "古城北侧，去平江路约 15 分钟" },
    "苏州园区站": { short: "园区站", transfer: 20, note: "离金鸡湖近，最后一天更顺" },
    "苏州北站": { short: "苏州北站", transfer: 45, note: "离古城较远，需多留 20 分钟" },
  };

  const STATION_NODES = {
    "苏州站": { id: "station", name: "苏州站", short: "苏州站", lat: 31.3294, lng: 120.6048, kind: "station" },
    "苏州园区站": { id: "station", name: "苏州园区站", short: "园区站", lat: 31.3389, lng: 120.7287, kind: "station" },
    "苏州北站": { id: "station", name: "苏州北站", short: "苏州北站", lat: 31.4214, lng: 120.6417, kind: "station" },
  };

  const STATION_NODE = STATION_NODES["苏州站"];

  const AREA_NODES = {
    pingjiang: { id: "base", name: "平江路附近", short: "平江路", label: "平江路", lat: 31.3124, lng: 120.6298, kind: "stay" },
    guanqian: { id: "base", name: "观前街附近", short: "观前街", label: "观前街", lat: 31.3106, lng: 120.6199, kind: "stay" },
    shantang: { id: "base", name: "山塘街附近", short: "山塘街", label: "山塘街", lat: 31.3225, lng: 120.5905, kind: "stay" },
    jinji: { id: "base", name: "金鸡湖附近", short: "金鸡湖", label: "金鸡湖", lat: 31.3187, lng: 120.707, kind: "stay" },
  };

  // 可压缩的停留块及其保留下限（分钟）；园林、博物馆、餐饮不在此列。
  const COMPRESS_MIN = {
    jinji_lake: 50,
    eslite: 30,
    suzhou_center: 30,
    pingjiang: 30,
    shantang: 30,
  };
  const COMPRESS_LABEL = {
    jinji_lake: "湖边停留",
    eslite: "书店停留",
    suzhou_center: "商场停留",
    pingjiang: "平江路停留",
    shantang: "山塘停留",
  };

  // 有坐标的住宿基地只认这四个区域；other / 缺失区域回退平江路并标记估算。
  function resolveBase(stays) {
    const list = Array.isArray(stays) ? stays : [];
    const picked = list.find((s) => s && s.base) || null;
    const area = picked && picked.areaKey ? AREA_NODES[picked.areaKey] : null;
    if (picked && area) {
      return {
        id: picked.id,
        name: picked.name,
        short: picked.name,
        label: area.label,
        lat: area.lat,
        lng: area.lng,
        kind: "stay",
        price: Number(picked.price) || 0,
        estimated: false,
        reason: "area",
        stay: picked,
      };
    }
    return {
      ...AREA_NODES.pingjiang,
      id: "base",
      name: "平江路附近（估算）",
      short: "平江路",
      label: "平江路",
      price: picked ? Number(picked.price) || 0 : 0,
      estimated: true,
      reason: !picked ? "no-stay" : picked.areaKey === "other" ? "area-other" : "area-missing",
      stay: picked || null,
    };
  }

  const CONSTRAINTS = {
    sz_museum: { from: 9 * 60, to: 16 * 60, label: "苏博 16:00 停止入馆" },
    zhuozhengyuan: { from: 7 * 60 + 30, to: 17 * 60 + 30, label: "拙政园 17:30 停止入园" },
    liuyuan: { from: 7 * 60 + 30, to: 17 * 60 + 30, label: "留园 17:30 停止入园" },
    xiyuan: { from: 7 * 60 + 30, to: 17 * 60, label: "西园寺 17:00 关门" },
  };

  const FOOD_STYLES = {
    classic: { lunch1: "wumen", dinner1: "songhelou", lunch2: "rongyanglou", dinner2: "yueshanfu" },
    local: { lunch1: "zhenzhu", dinner1: "xiehe", lunch2: "shuangta", dinner2: "jiangnan_yachu" },
    splurge: { lunch1: "xinjufeng", dinner1: "songhelou", lunch2: "rongyanglou", dinner2: "yueshanfu" },
  };

  const SWAPS = {
    "d1-lunch": ["wumen", "xinjufeng", "zhenzhu", "xiehe"],
    "d1-dinner": ["songhelou", "xiehe", "zhenzhu"],
    "d1-museum": ["sz_museum", "ouyuan", "museum_west"],
    "d1-garden": ["zhuozhengyuan", "lion_grove", "ouyuan"],
    "d2-morning": ["liuyuan", "tiger_hill", "hanshan_temple", "canglang"],
    "d2-lunch": ["rongyanglou", "zhaoyuanzhang", "shuangta"],
    "d2-dinner": ["yueshanfu", "jiangnan_yachu", "suchi_huayang"],
  };

  // 早期 16 家食单没有 category 字段，沿用旧映射补齐。
  const LEGACY_FOOD_CATEGORY = {
    songhelou: "main", xinjufeng: "main", xiehe: "main", zhenzhu: "main", wumen: "main",
    tongdexing: "noodle",
    yaba: "snack", taohuayuanji: "snack", rongyanglou: "snack", zhaoyuanzhang: "snack",
    yuyongsheng: "snack", tangyifang: "snack",
    daniangniang: "sweet",
    xiyuan_noodle: "veg",
    yueshanfu: "lake", jiangnan_yachu: "lake", suchi_huayang: "lake",
  };

  function foodCategory(food) {
    return food.category || LEGACY_FOOD_CATEGORY[food.id] || "main";
  }

  const PRICE_SLOT_POOLS = {
    "d1-lunch": (f) => f.area === "gusu-east" && ["main", "noodle", "snack"].includes(foodCategory(f)) && ["lunch", "snack"].includes(f.meal),
    "d1-dinner": (f) => f.area === "gusu-east" && ["main", "creative", "noodle"].includes(foodCategory(f)) && ["dinner", "lunch"].includes(f.meal),
    "d2-lunch": (f) => ["gusu-east", "gusu-west"].includes(f.area) && ["main", "noodle", "snack", "sweet"].includes(foodCategory(f)) && ["lunch", "snack", "breakfast"].includes(f.meal),
    "d2-dinner": (f) => f.area === "sip" && ["lake", "main", "creative"].includes(foodCategory(f)) && ["dinner", "snack"].includes(f.meal),
  };

  /* =========================================================
     上下文与引擎
     ========================================================= */
  function createContext(rawData, rawPrefs) {
    const data = rawData || {};
    const prefs = Object.assign({}, rawPrefs && typeof rawPrefs === "object" ? rawPrefs : {});
    // 旧 localStorage / 分享链接可能缺字段：补空值，避免构建时抛错。
    if (!Array.isArray(prefs.experiences)) prefs.experiences = [];
    if (!prefs.overrides || typeof prefs.overrides !== "object") prefs.overrides = {};
    const places = [...(data.spots || []), ...(data.foods || []), ...(data.experiences || [])];
    const byId = new Map(places.map((p) => [p.id, p]));
    return {
      data,
      prefs,
      base: null,
      info: null,
      stationNode: STATION_NODES[prefs.station] || STATION_NODE,
      priceFallback: false,
      foodNotes: [],
      placeById: (id) => byId.get(id) || null,
      hasPlace: (id) => byId.has(id),
    };
  }

  // 引擎按调用创建：状态只活在闭包里，planner 可重入、无模块级可变状态。
  function createEngine(ctx) {
    const state = ctx.prefs;

    function getOverride(key, fallback) {
      const id = state.overrides[key];
      return id && ctx.hasPlace(id) ? id : fallback;
    }

    function hasExp(key) { return state.experiences.includes(key); }

    /* =========================================================
       Itinerary builder
       ========================================================= */
    function pushNote(blocks, start, dur, title, detail, variant) {
      const kind = variant || "";
      // wait / night 是弹性缓冲（自由活动、等开场、夜景），压缩时优先牺牲它们。
      blocks.push({
        type: "note",
        start,
        end: start + dur,
        title,
        detail,
        variant: kind,
        flexible: kind === "wait" || kind === "night",
      });
      return start + dur;
    }
    function pushMove(blocks, start, dur, title, detail, mode) {
      blocks.push({ type: "move", start, end: start + dur, title, detail, mode: mode || "walk" });
      return start + dur;
    }
    function pushPlace(blocks, id, start, dur, opts) {
      const p = ctx.placeById(id);
      if (!p) return start;
      const options = opts || {};
      blocks.push({
        type: "place",
        placeId: id,
        label: p.short || p.name,
        start,
        end: start + Math.max(20, dur),
        swapKey: options.swapKey || null,
        note: options.note || "",
        title: options.title || "",
        foodId: options.foodId || null,
        foodIds: options.foodIds || null,
        costOverride: options.costOverride == null ? null : options.costOverride,
        meal: options.meal || null,
        // 仅湖边/书店/商场/街区允许在赶固定场次时压缩；下限由 COMPRESS_MIN 决定。
        compressMin: COMPRESS_MIN[id] == null ? null : COMPRESS_MIN[id],
      });
      return start + Math.max(20, dur);
    }

    // 最后一个真实地点块：回酒店和去车站都从它出发，而不是从住宿基地。
    function lastPlaceNode(blocks) {
      for (let i = blocks.length - 1; i >= 0; i -= 1) {
        const b = blocks[i];
        if (b.type !== "place") continue;
        const p = ctx.placeById(b.placeId);
        return p && hasCoords(p) ? transitNodeOf(p) : null;
      }
      return null;
    }

    /* =========================================================
       关联手动卡片的通勤边界
       卡片仍留在时间线/预算里，只是不再作为通勤节点；
       到达前、当天最后一个固定停留之后、返程预留之后的卡片
       无法与固定行程可靠衔接，排除出通勤并给出明确警告。
       ========================================================= */
    function markTransitExclusions(day) {
      if (!day || !Array.isArray(day.blocks)) return day;
      const placeIndexes = [];
      day.blocks.forEach((b, i) => { if (b.type === "place") placeIndexes.push(i); });
      const lastPlaceIndex = placeIndexes.length ? placeIndexes[placeIndexes.length - 1] : -1;
      const arrival = toMin(state.arrival);
      const departureCutoff = day.day === 2 ? toMin(state.departure) - 40 : null;
      day.blocks.forEach((b, index) => {
        if (b.type !== "custom" || !hasCoords(b)) return;
        b.transitExcluded = false;
        if (day.day === 1 && b.start < arrival) {
          b.warnings.push(TRANSIT_EXCLUDED_EARLY);
          b.transitExcluded = true;
        }
        // 按排序后的位置判断：卡片排在当天最后一个内置地点之后（含与它尾部重叠），
        // 之后没有可回归的固定停留，末段通勤会失去可靠的起终点。
        if (lastPlaceIndex >= 0 && index > lastPlaceIndex) {
          b.warnings.push(TRANSIT_EXCLUDED_AFTER_LAST);
          b.transitExcluded = true;
        }
        if (departureCutoff != null && b.start >= departureCutoff) {
          b.warnings.push(TRANSIT_EXCLUDED_AFTER_DEPARTURE);
          b.transitExcluded = true;
        }
        b.warnings = [...new Set(b.warnings)];
      });
      return day;
    }

    /* =========================================================
       通勤时间校准：每个 move 只有一个时长来源
       ========================================================= */
    function customNode(block) {
      if (!block || block.type !== "custom" || !hasCoords(block)) return null;
      const label = block.label || block.title || "手动卡片";
      return {
        id: `custom-${block.customId}`,
        name: block.title || label,
        short: label,
        lat: block.lat,
        lng: block.lng,
        kind: "custom",
      };
    }

    function nextStopAfter(blocks, index) {
      for (let i = index + 1; i < blocks.length; i += 1) {
        const b = blocks[i];
        if (b.type === "place") {
          const p = ctx.placeById(b.placeId);
          if (p && hasCoords(p)) return transitNodeOf(p);
        } else if (b.type === "custom") {
          if (b.transitExcluded) continue;
          const n = customNode(b);
          if (n) return n;
        }
      }
      return null;
    }

    // 箭头标题（“苏州站 → 平江路”）只看箭头右侧，避免把到达段误判成回车站。
    function moveDestination(block, blocks, index) {
      const title = String(block.title || "");
      const detail = String(block.detail || "");
      const base = ctx.base || resolveBase([]);
      const stationNode = ctx.stationNode || STATION_NODE;
      if (title.includes("→")) {
        const dest = title.split("→").pop().trim();
        if (base && (dest.includes(base.label) || dest.includes(base.short))) return base;
        if (/站/.test(dest)) return { ...stationNode, kind: "station" };
        if (/酒店|住宿|基地/.test(dest)) return base;
      } else {
        const text = `${title} ${detail}`;
        if (/站/.test(text)) return { ...stationNode, kind: "station" };
        if (/酒店|住宿|基地/.test(text)) return base;
      }
      return nextStopAfter(blocks, index);
    }

    // 让 detail 里的分钟/车费与 move 的实际时长保持一致；没有数字时补一句导航说明。
    function syncMoveDetail(detail, minutes, mode, fare) {
      let text = String(detail || "");
      if (mode === "taxi" && !/打车|地铁|出租/.test(text)) {
        text = text.replace(/步行/g, "打车");
      }
      const range = /约?\s*\d+\s*[–—-]\s*\d+\s*分钟/;
      const single = /约?\s*\d+\s*分钟/;
      let hasMinutes = false;
      if (range.test(text)) {
        text = text.replace(range, `约 ${minutes} 分钟`);
        hasMinutes = true;
      } else if (single.test(text)) {
        text = text.replace(single, `约 ${minutes} 分钟`);
        hasMinutes = true;
      }
      if (mode === "taxi" && fare) {
        if (/[¥￥]\s*\d+/.test(text)) text = text.replace(/[¥￥]\s*\d+/g, `¥${fare}`);
        else if (hasMinutes) text = text.replace(/(约\s*\d+\s*分钟)/, `$1（约 ¥${fare}）`);
      } else {
        text = text.replace(/（约\s*[¥￥]\s*\d+）|约\s*[¥￥]\s*\d+/g, "");
      }
      if (!hasMinutes) {
        const clause = `按导航${mode === "taxi" ? "打车" : "步行"}约 ${minutes} 分钟${mode === "taxi" && fare ? `（约 ¥${fare}）` : ""}，实际以导航为准。`;
        const sep = !text || /[。！？；;]$/.test(text) ? "" : "；";
        text = `${text}${sep}${clause}`;
      }
      return text;
    }

    // 先按真实通勤时长拉长 move，再把后面的块整体后移；手动卡片不自动移动。
    function retimeDayMoves(day) {
      if (!day || !Array.isArray(day.blocks)) return day;
      const base = ctx.base || resolveBase([]);
      let current = day.day === 1 ? { ...(ctx.stationNode || STATION_NODE), kind: "station" } : { ...base };
      for (let i = 0; i < day.blocks.length; i += 1) {
        const block = day.blocks[i];
        if (block.type === "move") {
          const to = moveDestination(block, day.blocks, i);
          if (!to) continue;
          if (current && current.id === to.id) {
            current = to;
            continue;
          }
          const est = travelEstimate(current, to, block.mode);
          const minutes = Math.max(0, block.end - block.start);
          block.mode = est.mode;
          if (est.minutes > minutes + 10) {
            const newEnd = block.start + est.minutes;
            const delta = newEnd - block.end;
            block.end = newEnd;
            for (let j = i + 1; j < day.blocks.length; j += 1) {
              const next = day.blocks[j];
              if (next.type === "custom") continue;
              next.start += delta;
              next.end += delta;
            }
          }
          block.detail = syncMoveDetail(block.detail, block.end - block.start, est.mode, est.fare);
          current = to;
          continue;
        }
        if (block.type === "place") {
          const p = ctx.placeById(block.placeId);
          if (p && hasCoords(p)) current = transitNodeOf(p);
          continue;
        }
        if (block.type === "custom") {
          if (block.transitExcluded) continue;
          const n = customNode(block);
          if (n) current = n;
        }
      }
      return day;
    }

    /* =========================================================
       压缩弹性缓冲：先牺牲等待/夜游备注，再压缩可缩短的停留块
       ========================================================= */
    // 固定场次目标：评弹 19:25、网师园首场 18:25、Day 2 进站 = 发车 - 40。
    function compressionTargets(day) {
      const targets = [];
      if (!day || !Array.isArray(day.blocks)) return targets;
      if (day.day === 1) {
        const garden = day.blocks.find((b) => b.type === "place" && b.placeId === "night_garden");
        if (garden) targets.push({ block: garden, time: 18 * 60 + 25, kind: "night_garden" });
        const pingtan = day.blocks.find((b) => b.type === "place" && b.placeId === "pingtan");
        if (pingtan) targets.push({ block: pingtan, time: 19 * 60 + 25, kind: "pingtan" });
      } else if (day.day === 2) {
        const stationNote = [...day.blocks]
          .reverse()
          .find((b) => b.type === "note" && b.variant === "station" && /抵达|苏州站/.test(String(b.title || "")));
        if (stationNote) {
          targets.push({ block: stationNote, time: toMin(state.departure) - 40, kind: "station" });
        }
      }
      return targets.sort((a, b) => a.time - b.time);
    }

    // 手动卡片不自动移动：卡片之后的第一个块不能早于卡片结束，据此限制整体前移量。
    function shiftCapacityAfter(blocks, index) {
      let floor = -Infinity;
      let cap = Infinity;
      for (let j = index + 1; j < blocks.length; j += 1) {
        const b = blocks[j];
        if (b.type === "custom") {
          // 已排除出通勤的卡片不参与压缩约束，避免它把内置末段卡在半路。
          if (!b.transitExcluded) floor = b.end;
          continue;
        }
        if (floor > -Infinity) {
          cap = Math.min(cap, b.start - floor);
          floor = -Infinity;
        }
      }
      return Number.isFinite(cap) ? Math.max(0, cap) : Infinity;
    }

    function shiftBlocksAfter(blocks, index, delta) {
      for (let j = index + 1; j < blocks.length; j += 1) {
        const b = blocks[j];
        if (b.type === "custom") continue;
        b.start += delta;
        b.end += delta;
      }
    }

    function compressionText(kind, waitCut, placeCuts) {
      const parts = [];
      if (waitCut > 0) parts.push(`${waitCut} 分钟自由活动`);
      placeCuts.forEach((p) => parts.push(`${p.cut} 分钟${p.label}`));
      const body = parts.join("、");
      if (kind === "pingtan") return `为赶上 19:25 的评弹，压缩了 ${body}。`;
      if (kind === "night_garden") return `为赶上 18:25 的网师园夜游首场，压缩了 ${body}。`;
      return `为留足进站时间，压缩了 ${body}。`;
    }

    // rationale 保持 2–3 条：把固定场次/返程那条并进压缩说明，而不是无限追加。
    function addCompressionRationale(day, notes) {
      const list = Array.isArray(day.rationale) ? day.rationale.slice() : [];
      const text = notes.join("");
      const anchors = day.day === 1 ? ["评弹/夜游按固定场次倒排"] : ["按返程车次反推"];
      const index = list.findIndex((x) => typeof x === "string" && anchors.some((a) => x.includes(a)));
      if (index >= 0) {
        list[index] = `${list[index].replace(/。$/, "")}；${text}`;
      } else if (list.length < 3) {
        list.push(text);
      } else {
        list[list.length - 1] = text;
      }
      day.rationale = list;
    }

    function compressDay(day, targets) {
      if (!day || !Array.isArray(day.blocks)) return day;
      const list = (Array.isArray(targets) ? targets : [])
        .filter((t) => t && t.block && Number.isFinite(t.time))
        .sort((a, b) => a.time - b.time);
      const notes = [];
      list.forEach((target) => {
        let over = target.block.start - target.time;
        if (over <= 0) return;
        const startOver = over;
        let waitCut = 0;
        const placeCuts = [];

        // 1) 弹性等待（自由活动 / 等开场 / 夜景），从最晚的往前压缩。
        let index = day.blocks.indexOf(target.block);
        if (index < 0) return;
        const waits = day.blocks
          .slice(0, index)
          .filter((b) => b.type === "note" && b.flexible && b.end > b.start);
        for (let i = waits.length - 1; i >= 0 && over > 0; i -= 1) {
          const wait = waits[i];
          const at = day.blocks.indexOf(wait);
          const room = Math.min(wait.end - wait.start, over, shiftCapacityAfter(day.blocks, at));
          if (room <= 0) continue;
          wait.end -= room;
          shiftBlocksAfter(day.blocks, at, -room);
          waitCut += room;
          over = target.block.start - target.time;
        }

        // 2) 弹性停留（湖边/书店/商场/街区），最晚的优先，保留下限。
        index = day.blocks.indexOf(target.block);
        const places = day.blocks
          .slice(0, index)
          .filter((b) => b.type === "place" && b.compressMin && b.end - b.start > b.compressMin);
        for (let i = places.length - 1; i >= 0 && over > 0; i -= 1) {
          const place = places[i];
          const at = day.blocks.indexOf(place);
          const room = Math.min(
            place.end - place.start - place.compressMin,
            over,
            shiftCapacityAfter(day.blocks, at)
          );
          if (room <= 0) continue;
          place.end -= room;
          shiftBlocksAfter(day.blocks, at, -room);
          placeCuts.push({ label: COMPRESS_LABEL[place.placeId] || `${place.label || "停留"}停留`, cut: room });
          over = target.block.start - target.time;
        }

        const totalCut = startOver - Math.max(0, over);
        if (totalCut > 0) notes.push(compressionText(target.kind, waitCut, placeCuts));
        // 仍有 over 时不在这里静默放过：refreshRetimedWarnings 会按压缩后的时间重算警告。
      });
      if (notes.length) addCompressionRationale(day, notes);
      // 被压到 0 分钟的弹性备注直接移除，避免渲染 0 分钟块。
      day.blocks = day.blocks.filter((b) => !(b.type === "note" && b.flexible && b.end <= b.start));
      return day;
    }

    function durationFor(id) {
      if (id === "museum_west") return 100;
      if (id === "zhuozhengyuan") return state.pace === "relaxed" ? 100 : state.pace === "packed" ? 80 : 110;
      if (id === "lion_grove") return 50;
      if (id === "ouyuan") return 55;
      if (id === "liuyuan") return 90;
      if (id === "tiger_hill") return 100;
      if (id === "hanshan_temple") return 90;
      if (id === "canglang") return 55;
      return 75;
    }

    function ticketPrice(p) {
      return state.student && p.studentPrice != null ? p.studentPrice : p.price;
    }

    function day1Specials() {
      return {
        hasNight: hasExp("nightgarden"),
        hasPingtan: hasExp("pingtan") && !hasExp("nightgarden"),
        hasBoat: hasExp("boat") && !state.rainy,
        hasHanfu: hasExp("hanfu") && !state.rainy,
      };
    }

    function buildDay1() {
      const blocks = [];
      const style = FOOD_STYLES[state.food];
      const f = day1Specials();
      const base = ctx.base || resolveBase([]);
      const stationNode = ctx.stationNode || STATION_NODE;
      const arrivalLeg = travelEstimate(stationNode, base, "taxi");
      let t = toMin(state.arrival);

      t = pushNote(blocks, t, 10, `抵达${stationNode.short}`, `出站先确认身份证、预约码都在身上；不急着买地铁票，直接打车去${base.label}。`, "arrival");
      t = pushMove(
        blocks,
        t,
        arrivalLeg.minutes,
        `${stationNode.short} → ${base.label}`,
        base.estimated
          ? `按${base.label}估算约 ${arrivalLeg.minutes} 分钟（约 ¥${arrivalLeg.fare}）；${base.reason === "no-stay" ? "未设住宿基地" : "住宿区域无有效坐标"}，实际以导航为准。`
          : `从${stationNode.short}到${base.label}约 ${arrivalLeg.minutes} 分钟（约 ¥${arrivalLeg.fare}）；实际以导航为准。`,
        "taxi"
      );
      t = pushNote(blocks, t, 18, "寄存行李 / Check-in", "把大件寄存在酒店前台，只带随身包出门；问清楚第二天最晚取行李时间。", "hotel");

      const lunchStart = Math.max(t, 11 * 60 + 30);
      if (lunchStart - t > 8) {
        t = pushNote(blocks, t, lunchStart - t, "在酒店附近走走", `${base.label}周边，等午饭开餐。`, "wait");
      }
      const lunchId = state.overrides["d1-lunch"] || chooseFoodByPrice(style.lunch1, "d1-lunch");
      const lunchPlace = ctx.placeById(lunchId);
      if (lunchPlace) {
        const lunchLabel = lunchPlace.short || lunchPlace.name;
        t = pushMove(
          blocks,
          t,
          1,
          `去${lunchLabel}`,
          `从${base.label}去${lunchLabel}，约 15 分钟；到店先看当日菜单。`,
          "walk"
        );
      }
      t = pushPlace(blocks, lunchId, t, 75, {
        swapKey: "d1-lunch",
        meal: "lunch",
        note: "第一顿不用点太满，留肚子给平江路的小吃。",
      });

      t = pushMove(blocks, t, 10, "步行去苏博", "从平江路北端走到东北街，约 10 分钟。", "walk");
      const museumId = getOverride("d1-museum", "sz_museum");
      t = pushPlace(blocks, museumId, t, durationFor(museumId), {
        swapKey: "d1-museum",
        note: "",
      });

      t = pushMove(blocks, t, 8, "苏博 → 拙政园", "出馆右转，步行 3–5 分钟。", "walk");
      const gardenId = getOverride("d1-garden", "zhuozhengyuan");
      let gardenDur = durationFor(gardenId);
      if (f.hasHanfu && gardenDur > 75) gardenDur = 75;
      t = pushPlace(blocks, gardenId, t, gardenDur, {
        swapKey: "d1-garden",
        note: "逛完从东园出口出，步行去平江路更顺。",
      });

      if (state.pace === "packed" && !f.hasHanfu && gardenId === "zhuozhengyuan") {
        t = pushMove(blocks, t, 5, "步行去狮子林", "拙政园南侧，约 5 分钟。", "walk");
        t = pushPlace(blocks, "lion_grove", t, durationFor("lion_grove"), {
          note: "假山迷宫，穿平底鞋；时间不够就跳过。",
        });
      }

      t = pushMove(blocks, t, 10, "步行去平江路", "从园林路拐进大儒巷，人会少一些。", "walk");

      if (f.hasHanfu) {
        t = pushPlace(blocks, "hanfu", t, 90, {
          note: "妆造 + 换装约 1 小时，留 30 分钟给拍照；雨天改室内。",
        });
        t = pushMove(blocks, t, 5, "走到平江路河边", "妆造店多在平江路支巷，换好衣服再上桥。", "walk");
      }

      const pingjiangDur = f.hasNight ? (f.hasHanfu ? 30 : 45) : f.hasBoat ? 55 : 75;
      t = pushPlace(blocks, "pingjiang", t, pingjiangDur, {
        title: f.hasBoat ? "平江路 + 摇橹船" : "平江路历史街区",
        costOverride: f.hasBoat ? 40 : null,
        note: f.hasBoat
          ? "登船点就在保吉利桥；傍晚光线最柔，亮灯后的平江路留到饭后慢慢走。"
          : state.rainy
            ? "雨大就缩短平江路，直接去评弹馆；带好伞和防滑鞋。"
            : "",
      });

      if (f.hasNight) {
        const dinnerId = chooseFoodByPrice("xiehe", "d1-dinner");
        t = pushMove(blocks, t, 8, "去凤凰街", "从平江路打车/步行到协和菜馆，约 8–10 分钟。", "taxi");
        t = pushPlace(blocks, dinnerId, t, 55, {
          meal: "dinner",
          note: "为赶上夜花园，今晚吃快一点；协和离网师园近，点三菜就好。",
        });
        t = pushMove(blocks, t, 15, "去网师园", "打车约 10 分钟；18:25 开园，尽量赶首场。", "taxi");
        t = pushPlace(blocks, "night_garden", t, 90, {
          note: "首场人最少；跟着导览员走，别急着拍照。",
        });
        const nightStop = lastPlaceNode(blocks) || base;
        const nightLeg = travelEstimate(nightStop, base);
        t = pushMove(
          blocks,
          t,
          nightLeg.minutes,
          "回酒店",
          `${nightLeg.mode === "taxi" ? "打车" : "步行"}回${base.label}约 ${nightLeg.minutes} 分钟${nightLeg.fare ? `（约 ¥${nightLeg.fare}）` : ""}；今晚早点休息，实际以导航为准。`,
          nightLeg.mode
        );
        t = pushNote(blocks, t, 20, "晚安，姑苏", "明天 7:45 退房，行李寄存在前台。", "night");
      } else {
        t = pushNote(blocks, t, 30, "平江路自由活动 / 等灯亮", "买一支海棠糕或一碗桂花糖粥，走到青石桥等灯笼亮起；不赶时间。", "wait");
        const dinnerId = state.overrides["d1-dinner"] || chooseFoodByPrice(style.dinner1, "d1-dinner");
        t = pushMove(blocks, t, 5, "去晚餐", "沿着平江路走到餐厅，或者打车 5 分钟。", "walk");
        t = pushPlace(blocks, dinnerId, t, 75, {
          swapKey: "d1-dinner",
          meal: "dinner",
          note: "",
        });

        if (f.hasPingtan) {
          t = pushMove(blocks, t, 6, "去琵琶语评弹馆", "平江路 189 号，步行几分钟。", "walk");
          const pingtanStart = Math.max(t, 19 * 60 + 25);
          if (pingtanStart - t > 8) {
            t = pushNote(blocks, t, pingtanStart - t, "平江路夜游 / 等开场", "买一杯桂花酸梅汤，慢慢走到评弹馆。", "night");
          }
          t = pushPlace(blocks, "pingtan", t, 65, {
            note: "演出约一小时；提前 10 分钟到，坐内场前排。",
          });
          const pingtanStop = lastPlaceNode(blocks) || base;
          const pingtanLeg = travelEstimate(pingtanStop, base);
          t = pushMove(
            blocks,
            t,
            pingtanLeg.minutes,
            "回酒店",
            `${pingtanLeg.mode === "taxi" ? "打车" : "步行"}回${base.label}约 ${pingtanLeg.minutes} 分钟${pingtanLeg.fare ? `（约 ¥${pingtanLeg.fare}）` : ""}；按导航走，别绕远。`,
            pingtanLeg.mode
          );
          t = pushNote(blocks, t, 20, "晚安，姑苏", "如果还有力气，去河边买一支茉莉手串。", "night");
        } else {
          t = pushNote(blocks, t, 45, "平江路夜游 / 回酒店", "亮灯后的平江路比白天好看；走累了就回酒店，别硬撑。", "night");
          const homeStop = lastPlaceNode(blocks) || base;
          const homeLeg = travelEstimate(homeStop, base);
          t = pushMove(
            blocks,
            t,
            homeLeg.minutes,
            "回酒店",
            `${homeLeg.mode === "taxi" ? "打车" : "步行"}回${base.label}约 ${homeLeg.minutes} 分钟${homeLeg.fare ? `（约 ¥${homeLeg.fare}）` : ""}；走累了就早点休息。`,
            homeLeg.mode
          );
        }
      }

      let title = "初见姑苏 · 园林里的光，水巷里的灯";
      let summary = "从苏博的片石假山走到拙政园的框景，傍晚在平江路坐船、听评弹。";
      if (state.rainy) {
        title = "雨落姑苏 · 一园一茶一评弹";
        summary = "雨天的古城把户外换成博物馆、园林回廊和评弹，反而更有江南味。";
      } else if (f.hasNight) {
        title = "初见姑苏 · 园林与一场夜戏";
        summary = "苏博、拙政园、平江路，晚上把时间交给网师园的一景一戏。";
      } else if (f.hasHanfu) {
        title = "初见姑苏 · 穿汉服走进园林";
        summary = "苏博看光影，拙政园拍框景，傍晚换一身汉服去坐船。";
      }
      const warnings = [];
      if (f.hasHanfu && f.hasNight) warnings.push("汉服妆造 + 夜游网师园会让今天很满；建议二选一，或把汉服改到次日早上。");
      if (toMin(state.arrival) >= 11 * 60 + 15) warnings.push("到达偏晚，今天园林时间已自动压缩；若累了可删掉拙政园，把时间留给平江路。");
      if (f.hasHanfu && toMin(state.arrival) >= 11 * 60 + 15) warnings.push("到达偏晚时汉服妆造可能压到晚饭，建议只做简妆或改期。");

      const rationale = [
        "Day 1 把苏博、拙政园、平江路放在同一片区，减少折返。",
        "评弹/夜游按固定场次倒排，晚饭留出 60–75 分钟。",
      ];
      if (base.estimated) {
        rationale.push(
          base.reason === "no-stay"
            ? "未设住宿基地，通勤按平江路估算。"
            : "住宿区域无有效坐标，通勤按平江路估算。"
        );
      }

      return { day: 1, date: state.startDate, title, summary, warnings, rationale, blocks };
    }

    function buildDay2() {
      const blocks = [];
      const style = FOOD_STYLES[state.food];
      const base = ctx.base || resolveBase([]);
      const wantMarket = hasExp("market") || state.food === "local";
      const wantTiger = hasExp("tiger") && !state.rainy;
      const departure = toMin(state.departure);
      const early = departure < 20 * 60 + 10;
      const sunsetText = ctx.info?.days?.[1]?.sunset || "17:13";
      const sunsetMin = toMin(sunsetText);
      const wantSunset = hasExp("sunset");
      const lakeEnd = early ? 17 * 60 + 10 : 17 * 60 + 45;
      const sunsetFits = !early && wantSunset && sunsetMin + 20 <= lakeEnd;
      let t = 7 * 60 + 45;
      const warnings = [];

      const xiyuanLeg = travelEstimate(base, ctx.placeById("xiyuan"), "taxi");
      const xiyuanMinutes = base.estimated ? 15 : xiyuanLeg.minutes;
      t = pushNote(blocks, t, 10, "退房 / 寄存行李", "7:45 退房，把行李寄存在前台；只带相机和随身包。", "hotel");
      t = pushMove(blocks, t, xiyuanMinutes, "打车去西园寺", `从${base.label}到西园弄约 ${xiyuanMinutes} 分钟${xiyuanLeg.fare ? `（约 ¥${xiyuanLeg.fare}）` : ""}。`, "taxi");
      t = pushPlace(blocks, "xiyuan", t, 75, {
        foodId: "xiyuan_noodle",
        costOverride: 20,
        title: "西园寺 · 素面、猫与后花园",
        note: "先吃面再逛；素面卖完即止，顺序别反。",
      });

      const morningId = getOverride("d2-morning", wantTiger ? "tiger_hill" : "liuyuan");
      const morningMove = {
        liuyuan: ["去留园", "从西园寺步行约 12 分钟，顺路。", "walk"],
        tiger_hill: ["去虎丘", "从西园寺打车约 8–10 分钟（约 ¥15）。", "taxi"],
        hanshan_temple: ["去寒山寺", "从西园寺打车约 10 分钟（约 ¥15）。", "taxi"],
        canglang: ["去沧浪亭", "从西园寺打车约 15 分钟（约 ¥25）。", "taxi"],
      }[morningId] || ["去上午景点", "按导航前往。", "taxi"];
      t = pushMove(blocks, t, morningMove[2] === "taxi" ? 12 : 10, morningMove[0], morningMove[1], morningMove[2]);
      t = pushPlace(blocks, morningId, t, durationFor(morningId), {
        swapKey: "d2-morning",
        note: morningId === "tiger_hill"
          ? "斜塔和剑池是重点；南门进、南门出最顺。"
          : morningId === "hanshan_temple"
            ? "从西园寺打车约 10 分钟；寺外枫桥别错过。"
            : "",
      });

      t = pushMove(blocks, t, 10, "去七里山塘", `从${{ liuyuan: "留园", tiger_hill: "虎丘", hanshan_temple: "寒山寺", canglang: "沧浪亭" }[morningId] || "上午景点"}打车约 10 分钟到山塘街。`, "taxi");
      t = pushPlace(blocks, "shantang", t, 45, {
        title: "七里山塘 · 从新民桥开始",
        note: "",
      });

      let lunchId = null;
      if (wantMarket) {
        t = pushMove(blocks, t, 15, "打车去双塔市集", "从山塘街到石匠弄约 15 分钟。", "taxi");
        t = pushPlace(blocks, "shuangta", t, 55, {
          swapKey: "d2-lunch",
          meal: "lunch",
          foodIds: ["daniangniang", "yuyongsheng", "tangyifang"],
          costOverride: 50,
          title: "双塔市集 · 三摊逛吃",
          note: "大孃孃的芋泥麻薯、裕永盛的双拼生煎、棠艺坊的海棠糕；每样一份，两个人分。",
        });
      } else {
        lunchId = state.overrides["d2-lunch"] || chooseFoodByPrice("rongyanglou", "d2-lunch");
        const marketLunch = ctx.placeById(lunchId);
        if (marketLunch) {
          const marketLunchLabel = marketLunch.short || marketLunch.name;
          t = pushMove(
            blocks,
            t,
            1,
            `走去${marketLunchLabel}`,
            `从七里山塘走到${marketLunchLabel}，沿山塘街往东约 10 分钟；路上可以买瓶水。`,
            "walk"
          );
        }
        t = pushPlace(blocks, lunchId, t, 50, {
          swapKey: "d2-lunch",
          meal: "lunch",
          costOverride: 50,
          note: "荣阳楼买油氽团子，隔壁赵元章肉骨烧再加一份；两个人分着吃刚好。",
        });
      }

      const lunchPlace = ctx.placeById(wantMarket ? "shuangta" : lunchId);
      const lunchLabel = (lunchPlace && (lunchPlace.short || lunchPlace.name)) || "午餐地点";
      const backEst = travelEstimate(lunchPlace ? transitNodeOf(lunchPlace) : null, base, "taxi");
      const hotelBack = base.estimated ? (wantMarket ? 10 : 15) : backEst.minutes;
      const backDetail = base.estimated
        ? (wantMarket ? `从双塔市集步行/打车回${base.label}，约 ${hotelBack} 分钟。` : `从山塘街打车回${base.label}，约 ${hotelBack} 分钟。`)
        : `从${lunchLabel}打车回${base.label}，约 ${hotelBack} 分钟（约 ¥${backEst.fare}）。`;
      t = pushMove(blocks, t, hotelBack, "回酒店取行李", backDetail, "taxi");
      t = pushNote(blocks, t, 15, "取行李 / 检查房间", "别把充电器和身份证落在房间；前台取行李后直接出发。", "hotel");

      if (early) {
        t = pushMove(blocks, t, 20, "去苏州中心", "打车约 20 分钟；返程早，今天不进诚品。", "taxi");
        t = pushPlace(blocks, "suzhou_center", t, 55, {
          title: "苏州中心 · 雨天/早班车的室内备选",
          note: "商场里吹空调、补一杯咖啡；如果天气好，直接走去月光码头。",
        });
        t = pushMove(blocks, t, 10, "走到月光码头", "从苏州中心步行约 10 分钟。", "walk");
      } else {
        t = pushMove(blocks, t, 25, "去诚品书店", "打车约 25 分钟；或地铁 1 号线到时代广场。", "taxi");
        t = pushPlace(blocks, "eslite", t, 60, {
          note: "大台阶拍一张并肩坐；三楼露台看金鸡湖，比楼下咖啡店安静。",
        });
        t = pushMove(blocks, t, 10, "走去月光码头", "沿湖走约 10 分钟，风大就加件外套。", "walk");
      }

      const lakeStart = Math.max(t, early ? 14 * 60 + 55 : 15 * 60);
      if (lakeStart - t > 8) {
        t = pushNote(blocks, t, lakeStart - t, "湖边自由时间", "找一家咖啡店坐一会儿，等光线变软。", "wait");
      }
      let lakeTitle = "金鸡湖 · 湖边散步";
      let lakeNote = "不把日落当成必看项：沿月光码头和金水湾栈桥散步，等灯光亮起即可。";
      if (state.rainy) {
        lakeTitle = "金鸡湖 · 雨天室内看湖";
        lakeNote = "下雨就别去栈桥；在苏州中心或餐厅落地窗前看湖，等灯光亮起。";
      } else if (wantSunset && sunsetFits) {
        lakeTitle = `金鸡湖 · 月光码头与日落（约 ${sunsetText}）`;
        lakeNote = `月光码头大相框 → 金水湾栈桥 → 日落；约 ${sunsetText} 日落，提前 30 分钟找机位，日落后等 15 分钟蓝调。`;
      } else if (wantSunset) {
        lakeTitle = `金鸡湖 · 湖边散步（日落约 ${sunsetText}，赶不上返程）`;
        lakeNote = `按当前返程时间只能湖边散步，${sunsetText} 的日落赶不上返程；想拍日落需要改晚车次。`;
        warnings.push(`所选日期日落约 ${sunsetText}，按当前返程时间无法在湖边看日落；可改晚车次或取消“湖边日落”。`);
      }
      t = pushPlace(blocks, "jinji_lake", lakeStart, Math.max(50, lakeEnd - lakeStart), {
        title: lakeTitle,
        note: lakeNote,
      });

      let dinnerId = null;
      if (early) {
        t = pushMove(blocks, t, 5, "去湖边简餐", "从月光码头走到苏州中心 B1 或湖边轻食，约 5 分钟；返程早，别走远。", "walk");
        const quickStart = Math.max(t, 17 * 60 + 15);
        t = pushNote(blocks, quickStart, 50, "湖边简餐 / 打包", "返程早，别排正餐；苏州中心 B1 或湖边轻食，吃完直接打车。约 ¥50/人。", "quick");
        blocks[blocks.length - 1].cost = 50;
      } else {
        dinnerId = state.overrides["d2-dinner"] || chooseFoodByPrice(style.dinner2, "d2-dinner");
        const dinnerPlace = ctx.placeById(dinnerId);
        if (dinnerPlace) {
          const dinnerLabel = dinnerPlace.short || dinnerPlace.name;
          // 原来的“湖边再走一圈”就是去餐厅的缓冲，直接换成一段通勤。
          t = pushMove(
            blocks,
            t,
            1,
            `去${dinnerLabel}`,
            `从金鸡湖去${dinnerLabel}，约 15 分钟；${sunsetFits ? "到店正好等日落。" : "按返程时间用餐。"}`,
            "walk"
          );
        }
        const dinnerStart = t;
        t = pushPlace(blocks, dinnerId, dinnerStart, 75, {
          swapKey: "d2-dinner",
          meal: "dinner",
          note: dinnerId === "yueshanfu"
            ? "日落前 30 分钟入座；吃完直接打车去车站。"
            : dinnerId === "jiangnan_yachu"
              ? "吃完沿李公堤走一段，留足打车时间。"
              : "吃完在湖边再坐 10 分钟，留足打车时间。",
        });
      }

      if (!early && departure >= 21 * 60 + 30) {
        t = pushNote(blocks, t, 30, "苏州中心夜景", "如果还有力气，去三楼平台看东方之门亮灯；别走远，留足打车时间。", "night");
      }

      const station = STATIONS[state.station] || STATIONS["苏州站"];
      const stationNode = ctx.stationNode || STATION_NODE;
      // 最后一段从当天最后一个真实地点出发，而不是从住宿基地倒推。
      const lastStop = lastPlaceNode(blocks) || base;
      const stationLeg = travelEstimate(lastStop, stationNode, "taxi");
      const stationArrival = departure - 40;
      const leaveTime = stationArrival - stationLeg.minutes;
      if (leaveTime > t + 10) {
        t = pushNote(blocks, t, leaveTime - t, "湖边自由时间", "在湖边再坐一会儿，或者去商场里补一杯水。", "wait");
      }
      // 这里不再提前下“赶不上”的结论：compressDay 会先压缩弹性缓冲，
      // 再由 refreshRetimedWarnings 按压缩后的进站时间重算警告。
      const finalLeave = Math.max(t, leaveTime);
      t = pushMove(
        blocks,
        finalLeave,
        stationLeg.minutes,
        `去${station.short}`,
        `从${lastStop.short || lastStop.name}打车约 ${stationLeg.minutes} 分钟（约 ¥${stationLeg.fare}）；${station.note}。`,
        "taxi"
      );
      const finalStation = Math.max(t, stationArrival);
      t = pushNote(blocks, finalStation, Math.max(20, departure - finalStation), `抵达${station.short}`, `预留 40 分钟取票/安检；发车 ${state.departure}。`, "station");

      const lakeAction = sunsetFits ? "最后去金鸡湖看日落" : "最后去金鸡湖湖边散步";
      const lakeActionShort = sunsetFits ? "最后在湖边看一场日落" : "最后在湖边散步";
      // 标题不能承诺看不成的日落：按 sunsetFits 决定“湖上日落 / 湖边散步”。
      let title = sunsetFits ? "古城醒来 · 从一碗素面到湖上日落" : "古城醒来 · 从一碗素面到湖边散步";
      let summary = wantMarket
        ? `西园寺的素面与猫、留园的冠云峰、双塔市集的烟火，${lakeAction}。`
        : `西园寺的素面与猫、留园的冠云峰、山塘的油氽团子，${lakeAction}。`;
      if (state.rainy) {
        title = "雨落姑苏 · 素面、书店与湖景晚餐";
        summary = "把湖边散步换成苏州中心的室内视角，晚餐照样看湖；雨天也有雨天的松弛。";
      } else if (wantTiger) {
        title = sunsetFits ? "古城醒来 · 从虎丘到湖上日落" : "古城醒来 · 从虎丘到湖边散步";
        summary = `西园寺的素面与猫、虎丘的斜塔、山塘的油氽团子，${lakeAction}。`;
      } else if (early) {
        summary = wantMarket
          ? `西园寺、留园、双塔市集，${lakeActionShort}，简餐后去车站。`
          : `西园寺、留园、山塘，${lakeActionShort}，简餐后去车站。`;
      }
      if (early) warnings.push("返程较早，湖边正餐已改为简餐；如果想吃悦山府，建议改订 20:40 之后的车次。");

      const rationale = [
        "西园寺素面要趁早，之后再进留园/虎丘。",
        "下午沿古城西→湖东单向移动，最后一顿留给湖边。",
        "按返程车次反推，预留 40 分钟进站。",
      ];

      return { day: 2, date: state.endDate, wantSunset, sunsetFits, title, summary, warnings, rationale, blocks };
    }

    function checkDayConstraints(day) {
      (day.blocks || []).forEach((b) => {
        if (b.type !== "place") return;
        const limit = CONSTRAINTS[b.placeId];
        if (limit && (b.start < limit.from || b.end > limit.to)) {
          day.warnings.push(`${limit.label}；当前安排 ${fmt(b.start)}–${fmt(b.end)}。`);
        }
        if (b.meal === "lunch" && (b.start < 11 * 60 || b.end > 14 * 60)) {
          day.warnings.push("午餐不在 11:00–14:00 的舒适窗口。");
        }
        if (b.meal === "dinner" && (b.start < 17 * 60 || b.end > 20 * 60 + 30)) {
          day.warnings.push("晚餐不在 17:00–20:30 的舒适窗口。");
        }
      });
      day.warnings = [...new Set(day.warnings)];
    }

    // 校准后的固定场次/返程检查：只加警告，不改动块。
    function refreshRetimedWarnings(day) {
      const pingtan = day.blocks.find((b) => b.type === "place" && b.placeId === "pingtan");
      if (pingtan && pingtan.start > 19 * 60 + 25) {
        day.warnings.push("评弹可能赶不上 19:25 开场");
      }
      const night = day.blocks.find((b) => b.type === "place" && b.placeId === "night_garden");
      if (night && night.start > 18 * 60 + 25) {
        day.warnings.push("网师园夜游可能赶不上首场");
      }
      if (day.day === 2) {
        const departure = toMin(state.departure);
        const stationNote = [...day.blocks].reverse().find((b) => b.type === "note" && b.variant === "station");
        if (stationNote) {
          if (stationNote.start < departure) stationNote.end = departure;
          const reserve = Math.max(0, departure - stationNote.start);
          stationNote.detail = `预留 ${reserve} 分钟取票/安检；发车 ${state.departure}。`;
          if (reserve < 40) day.warnings.push("返程预留不足");
          if (stationNote.start >= departure) {
            day.warnings.push("按当前节奏可能赶不上返程车；建议删减一个点，或把车次改晚 30 分钟。");
          }
        }
      }
      day.warnings = [...new Set(day.warnings)];
    }

    function buildPlan(customCards) {
      const days = [buildDay1(), buildDay2()];
      const cards = Array.isArray(customCards) ? customCards : [];
      days.forEach((day) => {
        cards
          .filter((c) => Number(c.day) === day.day)
          .forEach((c) => {
            const parsed = parseStart(c.start);
            const start = parsed.minutes;
            const duration = Math.max(15, Number(c.duration) || 60);
            const linked = c.placeId ? ctx.placeById(c.placeId) : null;
            const block = {
              type: "custom",
              customId: c.id,
              title: c.title,
              label: c.title || "手动卡片",
              start,
              end: start + duration,
              kind: c.kind || "other",
              price: Number(c.price) || 0,
              address: c.address || "",
              note: c.note || "",
              placeId: linked ? linked.id : "",
              lat: linked ? linked.lat : null,
              lng: linked ? linked.lng : null,
              transitExcluded: false,
              warnings: [],
            };
            if (c.placeId && !linked) block.warnings.push("关联地点不存在，已按无地点卡片处理。");
            if (!parsed.valid) block.warnings.push(START_TIME_WARNING);
            day.blocks.push(block);
          });
        day.blocks.sort((a, b) => a.start - b.start || a.end - b.end);
        // 先标出无法可靠衔接通勤的关联卡片，再校准 move，避免被排除的卡片影响末段。
        markTransitExclusions(day);
        // 自定义卡片合并完成后先校准通勤，再压缩弹性缓冲，保证所有块与 leg 同源。
        retimeDayMoves(day);
        day.blocks.sort((a, b) => a.start - b.start || a.end - b.end);
        compressDay(day, compressionTargets(day));
        day.blocks.sort((a, b) => a.start - b.start || a.end - b.end);
      });

      // 冲突只标记，不自动移动。编辑已保存卡片时排除自身。
      const planShape = { days };
      days.forEach((day) => {
        day.blocks.forEach((block) => {
          if (block.type !== "custom") return;
          const card = cards.find((c) => c.id === block.customId);
          if (!card) return;
          conflictsFor(card, planShape, { excludeId: block.customId }).forEach((conflict) => {
            block.warnings.push(conflict.message);
          });
          block.warnings = [...new Set(block.warnings)];
        });
        checkDayConstraints(day);
        refreshRetimedWarnings(day);
      });
      return { days };
    }

    /* =========================================================
       通勤
       ========================================================= */
    function buildTransitLegs(day, options = {}) {
      if (!day || !Array.isArray(day.blocks)) return [];
      const base = options.base || ctx.base || resolveBase([]);
      // 坐标取所选车站节点；short/note 等展示字段仍可来自 STATIONS。
      const station = { ...(options.stationNode || ctx.stationNode || STATION_NODE), ...(options.station || {}) };
      const legs = [];
      let current = day.day === 1 ? { ...station } : { ...base };
      let pending = null;
      const addLeg = (to, move) => {
        if (!current || !to || current.id === to.id) { pending = null; return; }
        const est = travelEstimate(current, to, move ? move.mode : undefined);
        if (move) move.mode = est.mode;
        // move 是唯一时长来源；retime 之后不再用更大的估算值覆盖。
        const minutes = move ? Math.max(0, move.end - move.start) : est.minutes;
        legs.push({
          from: current,
          to,
          mode: est.mode,
          minutes,
          fare: est.fare,
          distance: est.distance,
          estimated: true,
          detail: move ? move.detail : "",
          start: move ? move.start : null,
          end: move ? move.end : null,
        });
        current = to;
        pending = null;
      };
      day.blocks.forEach((b) => {
        if (b.type === "move") { pending = b; return; }
        if (b.type === "place") {
          const p = ctx.placeById(b.placeId);
          if (p && p.lat && p.lng) addLeg(transitNodeOf(p), pending);
          return;
        }
        if (b.type === "custom" && b.lat && b.lng) {
          if (b.transitExcluded) return;
          addLeg({ id: `custom-${b.customId}`, name: b.title, short: b.title, lat: b.lat, lng: b.lng, kind: "custom" }, pending);
          return;
        }
        if (b.type === "note") {
          const text = `${b.title || ""} ${b.detail || ""}`;
          if (pending && /酒店|住宿|基地/.test(`${pending.title || ""}${text}`)) addLeg(base, pending);
          else if (pending && /站/.test(`${pending.title || ""}${text}`)) addLeg(station, pending);
        }
      });
      if (pending) {
        if (/站/.test(pending.title || "")) addLeg(station, pending);
        else if (/酒店|住宿|基地/.test(pending.title || "")) addLeg(base, pending);
      }
      return legs;
    }

    /* =========================================================
       Budget
       ========================================================= */
    function computeBudget(plan) {
      const base = (plan.meta && plan.meta.base) || resolveBase([]);
      const rows = { ticket: 0, food: 0, exp: 0, custom: 0, transit: 0, buffer: 30, stay: 0 };
      plan.days.forEach((day) => {
        day.blocks.forEach((b) => {
          if (b.type === "custom") { rows.custom += Number(b.price) || 0; return; }
          if (b.type === "note" && b.cost) rows.food += b.cost;
          if (b.type !== "place") return;
          const p = ctx.placeById(b.placeId);
          if (!p) return;
          if (b.placeId === "xiyuan") {
            rows.ticket += 5;
            rows.food += 15;
            return;
          }
          if (b.placeId === "shuangta") {
            rows.food += b.costOverride == null ? 50 : b.costOverride;
            return;
          }
          if (b.placeId === "pingjiang") {
            rows.exp += b.costOverride || 0;
            return;
          }
          if (p.kind === "food") {
            rows.food += b.costOverride == null ? p.price : b.costOverride;
            return;
          }
          if (p.kind === "experience") {
            rows.exp += b.costOverride == null ? p.price : b.costOverride;
            return;
          }
          rows.ticket += b.costOverride == null ? ticketPrice(p) : b.costOverride;
        });
      });
      const transit = plan.transit || {};
      const taxiFare = [transit[1] || [], transit[2] || []]
        .flat()
        .filter((l) => l.mode === "taxi")
        .reduce((sum, l) => sum + (Number(l.fare) || 0), 0);
      rows.transit = round10(taxiFare / 2 + 20);
      const nights = 1;
      rows.stay = base && base.stay && base.stay.price ? Number(base.stay.price) * nights : 0;
      const perPerson = round10(rows.ticket + rows.food + rows.exp + rows.custom + rows.transit + rows.buffer);
      const total = perPerson * 2;
      return {
        rows,
        perPerson,
        total,
        nights,
        stayMissing: !!(base && base.stay && !base.stay.price),
        perPersonWithStay: Math.round((total + rows.stay) / 2),
        totalWithStay: total + rows.stay,
      };
    }

    function computeDayBudget(day) {
      const out = { ticket: 0, food: 0, exp: 0 };
      day.blocks.forEach((b) => {
        if (b.type !== "place") return;
        const p = ctx.placeById(b.placeId);
        if (!p) return;
        if (b.placeId === "xiyuan") { out.ticket += 5; out.food += 15; return; }
        if (b.placeId === "shuangta") { out.food += b.costOverride == null ? 50 : b.costOverride; return; }
        if (b.placeId === "pingjiang") { out.exp += b.costOverride || 0; return; }
        if (p.kind === "food") out.food += b.costOverride == null ? p.price : b.costOverride;
        else if (p.kind === "experience") out.exp += b.costOverride == null ? p.price : b.costOverride;
        else out.ticket += b.costOverride == null ? ticketPrice(p) : b.costOverride;
      });
      return out;
    }

    /* =========================================================
       价位筛选
       ========================================================= */
    function inPrice(food) {
      if (!food || typeof food.price !== "number") return true;
      if (state.priceMin != null && food.price < state.priceMin) return false;
      if (state.priceMax != null && food.price > state.priceMax) return false;
      return true;
    }

    function chooseFoodByPrice(defaultId, slot) {
      if (state.priceMin == null && state.priceMax == null) return defaultId;
      const def = ctx.placeById(defaultId);
      if (def && inPrice(def)) return defaultId;
      const filter = PRICE_SLOT_POOLS[slot];
      if (!filter) return defaultId;
      const candidates = ctx.data.foods.filter((f) => filter(f) && inPrice(f));
      if (!candidates.length) {
        ctx.priceFallback = true;
        const note = "价位区间内没有合适的餐厅，已回退默认食单；可放宽价格或直接指定。";
        if (!ctx.foodNotes.includes(note)) ctx.foodNotes.push(note);
        return defaultId;
      }
      const styleTags = state.food === "local"
        ? ["小吃", "生煎", "面馆", "市集", "早餐"]
        : state.food === "splurge"
          ? ["湖景", "创意", "黑珍珠", "米其林", "约会"]
          : ["老字号", "苏帮菜", "本地"];
      const mid = state.priceMin != null && state.priceMax != null
        ? (state.priceMin + state.priceMax) / 2
        : state.priceMin != null
          ? state.priceMin + 50
          : Math.max(0, state.priceMax - 50);
      return candidates
        .map((f) => {
          let score = 0;
          if (styleTags.some((t) => (f.tags || []).includes(t))) score += 4;
          if (def && f.area === def.area) score += 1;
          score -= Math.abs(f.price - mid) / 100;
          return { f, score };
        })
        .sort((a, b) => b.score - a.score)[0].f.id;
    }

    return { buildDay1, buildDay2, chooseFoodByPrice, computeBudget, computeDayBudget, buildPlan, buildTransitLegs };
  }

  // UI 读取预先算好的单日预算；未构建过时返回零值，避免 undefined 参与运算。
  function dayBudgetOf(day) {
    return (day && day.dayBudget) || { ticket: 0, food: 0, exp: 0 };
  }

  function build({ data, prefs, customCards, stays } = {}) {
    const ctx = createContext(data, prefs);
    const base = resolveBase(stays);
    ctx.base = base;

    // 先算日期，Day 2 的湖边要按当天真实日落决定标题与提醒。
    const info = dateInfo({
      start: ctx.prefs.startDate,
      end: ctx.prefs.endDate,
      baseline: "2026-10-23",
      now: new Date().toISOString().slice(0, 10),
    });
    ctx.info = info;
    ctx.stationNode = STATION_NODES[ctx.prefs.station] || STATION_NODE;

    const engine = createEngine(ctx);
    const plan = engine.buildPlan(customCards);

    plan.days[0].date = info.days[0].iso;
    plan.days[0].weekday = info.days[0].weekday;
    plan.days[0].sunset = info.days[0].sunset;
    plan.days[1].date = info.days[1].iso;
    plan.days[1].weekday = info.days[1].weekday;
    plan.days[1].sunset = info.days[1].sunset;

    const customWarnings = [
      ...new Set(
        plan.days.flatMap((day) =>
          day.blocks.filter((b) => b.type === "custom").flatMap((b) => b.warnings || [])
        )
      ),
    ];
    const stayWarnings = [];
    if (base.stay) {
      if (base.estimated) {
        stayWarnings.push(
          base.stay.areaKey === "other"
            ? "住宿区域选择「其他」，没有坐标，通勤按平江路估算。"
            : "住宿基地缺少有效区域，通勤按平江路估算。"
        );
      }
      if (!base.stay.price) stayWarnings.push("住宿未填价格，含住宿预算未计入房费。");
    }

    plan.meta = {
      priceFallback: Boolean(ctx.priceFallback),
      foodNotes: ctx.foodNotes.slice(),
      base,
      baseEstimated: base.estimated,
      dates: info,
      fountain: info.fountain,
      sunset: info.days[1].sunset,
      sunsetFits: plan.days[1].sunsetFits,
      wantSunset: plan.days[1].wantSunset,
      customWarnings,
      stayWarnings: [...new Set(stayWarnings)],
      dateWarnings: info.warnings.slice(),
    };

    const station = STATIONS[ctx.prefs.station] || STATIONS["苏州站"];
    plan.transit = {
      1: engine.buildTransitLegs(plan.days[0], { base, station, stationNode: ctx.stationNode }),
      2: engine.buildTransitLegs(plan.days[1], { base, station, stationNode: ctx.stationNode }),
    };

    plan.days.forEach((day) => {
      day.dayBudget = engine.computeDayBudget(day);
    });
    const budget = engine.computeBudget(plan);
    return { plan, budget, transit: plan.transit };
  }

  // 便捷入口：Task 4 可在只有 data/prefs/base 时自行重建通勤。
  function buildTransitLegs(day, options = {}) {
    const ctx = createContext(options.data, options.prefs);
    const base = options.base || resolveBase(options.stays || []);
    ctx.base = base;
    const engine = createEngine(ctx);
    const stationNode = options.stationNode || STATION_NODES[ctx.prefs.station] || STATION_NODE;
    ctx.stationNode = stationNode;
    const station = options.station && typeof options.station === "object"
      ? options.station
      : ctx.prefs.station
        ? STATIONS[ctx.prefs.station]
        : undefined;
    return engine.buildTransitLegs(day, { base, station, stationNode });
  }

  return {
    fmt,
    toMin,
    round10,
    clamp,
    haversineKm,
    travelEstimate,
    dateInfo,
    sunsetFor,
    auditData,
    isOfficialUrl,
    build,
    buildTransitLegs,
    conflictsFor,
    resolveBase,
    computeDayBudget: dayBudgetOf,
    SWAPS,
    FOOD_STYLES,
  };
});
