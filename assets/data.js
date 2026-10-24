/* 姑苏两日 · 数据层
   价格为 2026 年 10 月公开信息；评分/营业信息请以平台实时为准。 */
(function () {
  const enc = encodeURIComponent;
  const dp = (q) => `https://www.dianping.com/search/keyword/6/0_${enc(q)}`;
  const mt = (q) => `https://suzhou.meituan.com/s/${enc(q)}/`;
  const amap = (q) =>
    `https://uri.amap.com/search?keyword=${enc(q)}&city=${enc("苏州")}&src=suzhou-guide&coordinate=gaode&callnative=0`;

  // 只有真正属于官方域名的预约链接才算官方来源；第三方票务/攻略站一律不算。
  const OFFICIAL_HOSTS = ["szmuseum.com"];
  const isOfficialUrl = (url) => {
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
    // 无 URL 构造器的环境（如 Node vm 测试沙箱）用同样的 host 规则解析。
    const match = /^(https?):\/\/([^/?#]+)/i.exec(raw);
    if (!match) return false;
    const host = match[2]
      .toLowerCase()
      .split("@").pop()
      .replace(/:\d+$/, "")
      .replace(/\.$/, "");
    return OFFICIAL_HOSTS.some((domain) => host === domain || host.endsWith(`.${domain}`));
  };

  const withLinks = (p) => {
    const confidence =
      p.review && p.review.summary === true
        ? "summary"
        : isOfficialUrl(p.booking && p.booking.url)
          ? "official"
          : p.review
            ? "public"
            : "none";
    const next = {
      ...p,
      confidence,
      links: {
        dianping: dp(p.query || p.name),
        meituan: mt(p.query || p.name),
        amap: amap(p.query || p.name),
      },
    };
    if (next.review && !next.review.url) next.review.url = next.links.dianping;
    return next;
  };

  const meta = {
    title: "姑苏两日 · 与君慢行",
    dates: "10.27 — 10.28",
    rhythm: "周二上午出发 · 周三晚上返程",
    travellers: "情侣漫游 · 2 人",
    version: "2026.10 调研版",
    dateCheck:
      "2026 年 10 月 27 日是周二、10 月 28 日是周三，正好对应你的行程。苏博提前 7 天 08:00 放票，园林提前 7 天预约；现在就可以抢 10/27 下午场，餐厅也建议提前 1–3 天订位。",
  };

  const spots = [
    {
      id: "sz_museum",
      kind: "spot",
      name: "苏州博物馆 · 本馆",
      short: "苏博本馆",
      label: "贝聿铭的封山之作",
      area: "gusu-east",
      areaLabel: "东北街 · 拙政园旁",
      address: "姑苏区东北街 204 号",
      lat: 31.32472,
      lng: 120.62611,
      day: 1,
      price: 0,
      priceLabel: "免费 · 需预约",
      durationMin: 90,
      tags: ["建筑", "人文", "室内", "免费"],
      summary:
        "贝聿铭把江南的粉墙黛瓦压成几何线条，片石假山借景拙政园。馆不大，但光影极好，适合把脚步放慢。",
      couple:
        "主庭院的白墙前拍剪影，文创店挑一枚“文衡山手植藤”书签；出口右转就是拙政园，不用打车。",
      tip:
        "本馆提前 7 天、每天 8:00 在“苏州博物馆全预约”小程序放票；周一闭馆，16:00 停止入馆。抢不到就改去苏博西馆（免预约）或耦园。",
      booking: {
        channel: "苏州博物馆全预约小程序",
        deadline: "提前 7 天 08:00",
        url: "https://www.szmuseum.com/Other/ReservationTip",
      },
      review: {
        quote:
          "馆藏从吴地青铜到明清书画都有，建筑本身就是展品；逛 1.5 小时刚好，不会像大馆一样走到腿软。",
        by: "综合苏州博物馆官方与 2026 年游客攻略",
        url: "https://www.szmuseum.com/Other/ReservationTip",
      },
      sources: [
        {
          label: "苏州博物馆官方预约须知",
          url: "https://www.szmuseum.com/Other/ReservationTip",
        },
        {
          label: "苏州本地宝 · 2026 景点预约信息",
          url: "https://suzhou.bendibao.com/news/jingdianbao/",
        },
      ],
      accent: "celadon",
    },
    {
      id: "zhuozhengyuan",
      kind: "spot",
      name: "拙政园",
      short: "拙政园",
      label: "中国四大名园之首",
      area: "gusu-east",
      areaLabel: "东北街 · 苏博旁",
      address: "姑苏区东北街 178 号",
      lat: 31.32417,
      lng: 120.62917,
      day: 1,
      price: 80,
      priceLabel: "旺季 ¥80",
      studentPrice: 45,
      durationMin: 110,
      tags: ["园林", "世界遗产", "秋景"],
      summary:
        "苏州最大的古典园林，水面开阔，亭台借景讲究。10 月的荷叶将残未残，游客比暑期少，是看“秋意江南”的好时候。",
      couple:
        "“与谁同坐轩”的扇形窗是天然画框；远香堂前借荷叶做前景，等一阵风再按快门。",
      tip:
        "10 月旺季 ¥80，学生半价 ¥45（带学生证）；提前 7 天在“君到苏州”或苏州园林旅游网实名分时预约；7:30 开园，想避团就早场，下午 15:00 后相对松。17:00 停止入园。",
      booking: {
        channel: "君到苏州 / 苏州园林旅游网",
        deadline: "提前 7 天 00:00",
        url: "https://suzhou.bendibao.com/news/jingdianbao/",
      },
      review: {
        quote:
          "第一次来苏州只看一个园子的话，选拙政园；格局大、水面开阔，和留园的精致是两种性格。",
        by: "综合 2026 年苏州园林深度游攻略",
        url: "https://www.sohu.com/a/1063361848_122952993",
      },
      sources: [
        {
          label: "苏州本地宝 · 拙政园门票与开放时间",
          url: "https://suzhou.bendibao.com/tour/jingdianbangdan/2700.shtml",
        },
      ],
      accent: "vermilion",
    },
    {
      id: "lion_grove",
      kind: "spot",
      name: "狮子林",
      short: "狮子林",
      label: "假山迷宫",
      area: "gusu-east",
      areaLabel: "园林路 · 平江路北",
      address: "姑苏区园林路 23 号",
      lat: 31.32306,
      lng: 120.62778,
      day: 1,
      price: 40,
      priceLabel: "¥40",
      studentPrice: 20,
      durationMin: 60,
      tags: ["园林", "假山", "亲子"],
      summary:
        "以湖石假山闻名，九狮峰像一座可以钻进去的石头森林。比起拙政园的开阔，这里更像一场捉迷藏。",
      couple:
        "在假山最高处俯拍白墙和花窗，穿浅色衣服会更跳；不赶时间就慢慢钻洞。",
      tip:
        "行程紧时优先拙政园，狮子林作为“加场”。同样需要实名预约；假山石阶湿滑，别穿细高跟。",
      booking: {
        channel: "君到苏州",
        deadline: "提前 7 天",
        url: "https://suzhou.bendibao.com/news/jingdianbao/",
      },
      review: {
        quote:
          "假山王国名不虚传，九狮峰要边看边猜；带小朋友或喜欢拍照的人会玩得很开心。",
        by: "综合 2026 年苏州园林攻略",
        url: "https://m.suzhou.bendibao.com/mip/115820_5.shtm",
      },
      sources: [
        {
          label: "苏州本地宝 · 两日游路线",
          url: "https://m.suzhou.bendibao.com/mip/115820_5.shtm",
        },
      ],
      accent: "vermilion",
    },
    {
      id: "pingjiang",
      kind: "spot",
      name: "平江路历史街区",
      short: "平江路",
      label: "一条平江路，半座姑苏城",
      area: "gusu-east",
      areaLabel: "平江路 · 临顿路",
      address: "姑苏区平江路历史街区",
      lat: 31.31750,
      lng: 120.63200,
      day: 1,
      price: 0,
      priceLabel: "街区免费",
      durationMin: 100,
      tags: ["水巷", "夜游", "小吃", "出片"],
      summary:
        "主街沿平江河展开，白墙黛瓦、石桥、评弹声和桂花香混在一起。别只走主街，拐进大儒巷、丁香巷，人会少很多。",
      couple:
        "傍晚坐一趟摇橹船，看天色从金到蓝；下船后等灯笼亮起，再沿河慢慢走。",
      tip:
        "摇橹船 ¥40/人、约 30–40 分钟，官方码头 8:30–17:30；14:30 左右光线柔和、人少，17:00 前排队。不要跟路边拉客的“私船”走。主街的“手工龙须糖”和颜色过艳的桂花糕慎买。",
      booking: {
        channel: "现场购票 / 摇橹船码头",
        deadline: "建议 17:00 前排队",
        url: "https://m.suzhou.bendibao.com/tour/ly129525.shtm",
      },
      review: {
        quote:
          "白天游客多，晚上才是精华；评弹声从老宅里传出来，红灯笼映在河面上，随手拍都像电影。",
        by: "综合大众点评、携程 2025–2026 用户攻略",
        url: "https://m.dianping.com/ugcdetail/257843080?bizType=29",
      },
      sources: [
        {
          label: "苏州本地宝 · 平江路游玩指南",
          url: "https://m.suzhou.bendibao.com/tour/ly129525.shtm",
        },
        {
          label: "大众点评 · 平江路玩法",
          url: "https://m.dianping.com/ugcdetail/257843080?bizType=29",
        },
      ],
      accent: "celadon",
    },
    {
      id: "xiyuan",
      kind: "spot",
      name: "西园戒幢律寺",
      short: "西园寺",
      label: "猫、素面与五百罗汉",
      area: "gusu-west",
      areaLabel: "留园路 · 西园弄",
      address: "姑苏区留园路西园弄 18 号",
      lat: 31.32050,
      lng: 120.58670,
      day: 2,
      price: 5,
      priceLabel: "香火券 ¥5",
      durationMin: 80,
      tags: ["古刹", "素面", "撸猫", "小众"],
      summary:
        "苏州最“松弛”的寺庙：进门领三炷香，穿过如意巷吃一碗素面，再去后花园数猫、看鸽子、抄经。",
      couple:
        "黄墙和放生池很出片；两只人都喜欢的猫，可能比景点更能让 TA 记住这天早上。",
      tip:
        "8:00–17:00（16:30 停止入园；报告称 7:30 开门，以现场为准），素面 8:00–15:00、卖完即止。观音面/吉祥面 ¥15，如意面 ¥10。门口算命的奶奶别理；寺庙内不要投喂无证猫条。",
      booking: {
        channel: "现场扫码购票",
        deadline: "无需预约",
        url: "https://m.dianping.com/ugcdetail/149595371?bizType=29",
      },
      review: {
        quote:
          "11 点前去排队大约 15 分钟就能吃上；素面偏甜但分量足，后花园的猫和鸽子才是隐藏主角。",
        by: "大众点评用户 · 2026",
        url: "https://m.dianping.com/ugcdetail/152830963?bizType=29",
      },
      sources: [
        {
          label: "大众点评 · 西园寺吃面撸猫攻略",
          url: "https://m.dianping.com/ugcdetail/149595371?bizType=29",
        },
        {
          label: "大众点评 · 西园寺素面",
          url: "https://m.dianping.com/ugcdetail/152830963?bizType=29",
        },
      ],
      accent: "gold",
    },
    {
      id: "liuyuan",
      kind: "spot",
      name: "留园",
      short: "留园",
      label: "中国四大名园之一",
      area: "gusu-west",
      areaLabel: "留园路 · 西园寺旁",
      address: "姑苏区留园路 338 号",
      lat: 31.31917,
      lng: 120.59667,
      day: 2,
      price: 55,
      priceLabel: "旺季 ¥55",
      studentPrice: 27,
      durationMin: 90,
      tags: ["园林", "世界遗产", "回廊"],
      summary:
        "以建筑空间和冠云峰称绝。回廊曲折，下雨天听雨特别有味道；从西园寺走过来只要十几分钟。",
      couple:
        "冠云峰前拍一张“人小景大”；涵碧山房看水面倒影，比拙政园更安静。",
      tip:
        "10 月旺季 ¥55，学生半价约 ¥27；提前 7 天预约；7:30–17:30（17:00 停止入园）。正门游客中心可以免费寄存大件行李。",
      booking: {
        channel: "君到苏州",
        deadline: "提前 7 天",
        url: "https://suzhou.bendibao.com/news/jingdianbao/",
      },
      review: {
        quote:
          "留园的好在“转”：一条回廊接一个庭院，空间忽大忽小；冠云峰值得专门留十分钟。",
        by: "综合 2026 年苏州园林深度游攻略",
        url: "https://www.sohu.com/a/1063361848_122952993",
      },
      sources: [
        {
          label: "苏州本地宝 · 留园票价与开放时间",
          url: "https://suzhou.bendibao.com/news/jingdianbao/",
        },
      ],
      accent: "vermilion",
    },
    {
      id: "shantang",
      kind: "spot",
      name: "七里山塘",
      short: "山塘街",
      label: "红灯笼与老苏州烟火",
      area: "gusu-west",
      areaLabel: "山塘街 · 阊门",
      address: "姑苏区山塘街 177 号",
      lat: 31.31750,
      lng: 120.59750,
      day: 2,
      price: 0,
      priceLabel: "街区免费",
      durationMin: 80,
      tags: ["水巷", "夜游", "小吃", "老街"],
      summary:
        "从阊门一直延伸到虎丘的七里水街。主街红灯笼很热闹，但真正好逛的是新民桥以西，菜市场、糕团店和本地人的日常都在那里。",
      couple:
        "通贵桥边等一艘画舫经过；往新民桥方向走，人少一半，荣阳楼和赵元章都在这一段。",
      tip:
        "街区全天免费；画舫约 ¥39.9–50/人（不同线路）。10 月下旬约 17:30 亮灯，通贵桥是最佳机位；亮灯后人最多。别接“免费送花”。",
      booking: {
        channel: "现场 / 携程等平台购船票",
        deadline: "无需预约",
        url: "https://touch.piao.qunar.com/ticket/detail_2086978906.html",
      },
      review: {
        quote:
          "山塘街晚上人流量巨大，中午去反而舒服；往里走到新民桥，才能看到真正的生活气。",
        by: "综合大众点评、携程用户攻略",
        url: "https://touch.piao.qunar.com/ticket/detail_2086978906.html",
      },
      sources: [
        {
          label: "去哪儿 · 山塘街游船票与评价",
          url: "https://touch.piao.qunar.com/ticket/detail_2086978906.html",
        },
      ],
      accent: "celadon",
    },
    {
      id: "tiger_hill",
      kind: "spot",
      name: "虎丘山风景名胜区",
      short: "虎丘",
      label: "吴中第一名胜",
      area: "gusu-west",
      areaLabel: "虎丘 · 山门内",
      address: "姑苏区虎丘山门内 8 号",
      lat: 31.33760,
      lng: 120.57670,
      day: 2,
      price: 70,
      priceLabel: "旺季 ¥70",
      studentPrice: 35,
      durationMin: 100,
      tags: ["古迹", "斜塔", "登高"],
      summary:
        "“到苏州不游虎丘乃憾事也。”云岩寺塔倾斜千年，剑池和千人石藏着吴王传说。适合喜欢走路和历史的两个人。",
      couple:
        "千人石平视斜塔、剑池仰拍崖壁，是两个完全不同的机位；秋天树色最好。",
      tip:
        "旺季 7:30–18:00（17:30 停止入园），¥70，学生半价 ¥35；南门是正门，出南门可坐画舫回山塘街。行程紧时与留园二选一。",
      booking: {
        channel: "君到苏州",
        deadline: "提前 7 天",
        url: "https://www.zhunaqu.com/su/article/18445",
      },
      review: {
        quote:
          "虎丘的精华在斜塔和剑池，慢慢走 1.5 小时刚好；南门坐船回山塘是省腿的隐藏玩法。",
        by: "综合 2026 年虎丘自由行实测",
        url: "https://www.zhunaqu.com/su/article/18445",
      },
      sources: [
        {
          label: "住哪去 · 虎丘 2026 自由行攻略",
          url: "https://www.zhunaqu.com/su/article/18445",
        },
      ],
      accent: "gold",
    },
    {
      id: "hanshan_temple",
      kind: "spot",
      name: "寒山寺",
      short: "寒山寺",
      label: "枫桥夜泊 · 千年古寺",
      area: "gusu-west",
      areaLabel: "枫桥 · 寒山寺",
      address: "姑苏区寒山寺弄 24 号",
      lat: 31.31170,
      lng: 120.56820,
      day: 2,
      price: 20,
      priceLabel: "¥20",
      durationMin: 90,
      tags: ["古寺", "枫桥", "钟声"],
      summary:
        "张继一首《枫桥夜泊》让这里出了名。寺院不大，1–1.5 小时足够；大雄宝殿、钟楼、碑廊和普明宝塔都值得慢慢看，寺外枫桥和古运河更有水墨感。",
      couple:
        "钟楼可以撞钟（通常另收费）；寺外枫桥和江村桥是拍“姑苏城外寒山寺”的标准机位，阴天反而更好看。",
      tip:
        "门票 ¥20，线上提前买约 ¥18；7:30–17:00 开放，16:30 停止入寺。可与西园寺串成一条西北线；时间紧时和枫桥景区二选一。",
      booking: {
        channel: "寒山寺官方公众号",
        deadline: "可当日，线上约 ¥18",
        url: "",
      },
      posts: [
        {
          title: "国庆中秋来苏州！一定要留半天给寒山寺",
          author: "我是默默",
          date: "2026-09-18",
          url: "https://www.xiaohongshu.com/explore/6aad3d7f0000000011030996",
        },
        {
          title: "四大寡寺攻略：灵隐寺寒山寺古鸡鸣寺白马寺",
          author: "zara",
          date: "2026-10-11",
          url: "https://www.xiaohongshu.com/explore/6acb16450000000015002c50",
        },
      ],
      sources: [
        {
          label: "苏州两天一夜学生情侣调研 · 寒山寺章节",
          url: "research/苏州两天一夜学生情侣调研_2026.docx",
        },
      ],
      accent: "gold",
    },
    {
      id: "jinji_lake",
      kind: "spot",
      name: "金鸡湖 · 月光码头",
      short: "金鸡湖",
      label: "苏州的“海”与蓝调时刻",
      area: "sip",
      areaLabel: "工业园区 · 湖东",
      address: "工业园区月光码头 / 金水湾栈桥",
      lat: 31.32100,
      lng: 120.71950,
      day: 2,
      price: 0,
      priceLabel: "免费",
      durationMin: 95,
      tags: ["湖景", "日落", "夜景", "现代"],
      summary:
        "古城之外的另一面苏州。秋天日落约 17:20–18:10，月光码头的大相框、金水湾栈桥和东方之门同框，是整趟行程最像电影的一幕。",
      couple:
        "提前 40 分钟到月光码头占机位；日落后别急着走，蓝调时刻的东方之门更出片。",
      tip:
        "音乐喷泉只在周五、周六 19:30 常规开放，周二/周三没有；别把它写进必看清单。蓝调约 17:30–18:05，湖边风大，10 月晚上加一件薄外套。",
      booking: {
        channel: "无需预约",
        deadline: "日落前 40 分钟到",
        url: "https://m.chaxunla.com/1718679480.html",
      },
      review: {
        quote:
          "秋季太阳 18:00 左右落山，17:30–18:30 能拍到黄昏、晚霞和蓝调；月光码头大相框是经典机位。",
        by: "大众点评用户 · 金鸡湖日落机位",
        url: "https://m.dianping.com/ugcdetail/103429532?bizType=29",
      },
      sources: [
        {
          label: "大众点评 · 金鸡湖日落机位",
          url: "https://m.dianping.com/ugcdetail/103429532?bizType=29",
        },
        {
          label: "金鸡湖一日游路线",
          url: "https://m.chaxunla.com/1718679480.html",
        },
      ],
      accent: "gold",
    },
    {
      id: "eslite",
      kind: "spot",
      name: "诚品书店",
      short: "诚品",
      label: "72 级大台阶与湖景",
      area: "sip",
      areaLabel: "工业园区 · 月廊街",
      address: "工业园区月廊街 8 号",
      lat: 31.31980,
      lng: 120.72300,
      day: 2,
      price: 0,
      priceLabel: "免费进入",
      durationMin: 70,
      tags: ["书店", "室内", "咖啡", "出片"],
      summary:
        "大陆第一家诚品。标志性大台阶、书墙和三层湖景露台，适合在日落前躲一会儿空调，也给两个人一段不说话也不尴尬的时间。",
      couple:
        "大台阶拍一张并肩坐；三楼露台看金鸡湖，比楼下咖啡店更安静。",
      tip:
        "10:00–22:00；周末人多。若返程车次早，这一段最先删。",
      booking: {
        channel: "无需预约",
        deadline: "—",
        url: "https://m.chaxunla.com/1718679480.html",
      },
      review: {
        quote:
          "大台阶是文青必拍机位，三楼观景台能眺望金鸡湖；逛文创、喝咖啡休息都合适。",
        by: "金鸡湖一日游攻略",
        url: "https://m.chaxunla.com/1718679480.html",
      },
      sources: [
        {
          label: "金鸡湖一日游路线",
          url: "https://m.chaxunla.com/1718679480.html",
        },
      ],
      accent: "celadon",
    },
    {
      id: "suzhou_center",
      kind: "spot",
      name: "苏州中心 & 东方之门",
      short: "苏州中心",
      label: "“大秋裤”的夜景",
      area: "sip",
      areaLabel: "工业园区 · 东方之门",
      address: "工业园区苏绣路 1 号",
      lat: 31.31650,
      lng: 120.70780,
      day: 2,
      price: 0,
      priceLabel: "免费进入",
      durationMin: 50,
      tags: ["商场", "夜景", "室内"],
      summary:
        "苏州最现代的一面。三楼的露台和商场外的广场都能拍到东方之门；如果下雨，这里是金鸡湖行程的室内备选。",
      couple:
        "日落前在湖畔拍背影，亮灯后到商场三楼平台拍全景；风大时进商场。",
      tip:
        "商场 10:00–22:00；不要为了“音乐喷泉”专门等，开放时间以官方公告为准。",
      booking: {
        channel: "无需预约",
        deadline: "—",
        url: "https://m.chaxunla.com/1718679480.html",
      },
      review: {
        quote:
          "苏州中心外面就是东方之门，日落亮灯后很像小说里的 A 市；三楼平台是稳妥机位。",
        by: "大众点评 · 苏州 citywalk",
        url: "https://m.dianping.com/ugcdetail/334062251?bizType=29",
      },
      sources: [
        {
          label: "大众点评 · 金鸡湖 citywalk",
          url: "https://m.dianping.com/ugcdetail/334062251?bizType=29",
        },
      ],
      accent: "celadon",
    },
    {
      id: "shuangta",
      kind: "spot",
      name: "双塔市集",
      short: "双塔市集",
      label: "菜场改造的苏州烟火",
      area: "gusu-east",
      areaLabel: "石匠弄 · 双塔",
      address: "姑苏区石匠弄 2 号",
      lat: 31.30510,
      lng: 120.62850,
      day: 2,
      price: 0,
      priceLabel: "进场免费",
      durationMin: 70,
      tags: ["市集", "小吃", "室内", "烟火气"],
      summary:
        "老双塔菜场改造的市集，既有菜摊，也有苏州小吃的“浓缩版”。适合把午餐吃成一路逛吃：生煎、海棠糕、芋泥麻薯、碧螺春奶茶。",
      couple:
        "一份分着吃，才能从第一摊吃到最后一摊；大孃孃的芋泥麻薯适合当饭后甜点。",
      tip:
        "约 6:30–21:00（不同摊位略有差异）；上午 9 点前最舒服，下午 4 点后蛋饼要等 20 分钟以上。别把它当“景点”，当菜市场逛会更自在。",
      booking: {
        channel: "现场",
        deadline: "—",
        url: "https://m.dianping.com/ugcdetail/165014370?bizType=29",
      },
      review: {
        quote:
          "十多家小吃人均几十块就能吃撑；芋泥麻薯、生煎、海棠糕是稳妥选择，饭点排队至少 20 分钟。",
        by: "大众点评用户 · 2026",
        url: "https://m.dianping.com/ugcdetail/165014370?bizType=29",
      },
      sources: [
        {
          label: "大众点评 · 双塔市集逛吃",
          url: "https://m.dianping.com/ugcdetail/165014370?bizType=29",
        },
        {
          label: "苏州日报 · 古城寻味游线",
          url: "https://news.2500sz.com/doc/2026/10/18/1234114.shtml",
        },
      ],
      accent: "vermilion",
    },
    {
      id: "canglang",
      kind: "spot",
      name: "沧浪亭",
      short: "沧浪亭",
      label: "最古老的苏州园林",
      area: "gusu-east",
      areaLabel: "三元坊 · 十全街旁",
      address: "姑苏区沧浪亭街 3 号",
      lat: 31.29330,
      lng: 120.62800,
      day: 2,
      price: 20,
      priceLabel: "¥20",
      studentPrice: 10,
      durationMin: 60,
      tags: ["园林", "小众", "安静"],
      summary:
        "苏州现存最古老的园林，未进园先见清流绕郭。复廊漏窗一眼一景，人比拙政园少得多，适合想安静的两个人。",
      couple:
        "沿复廊慢慢走，数一数 108 式漏窗；对面可园可以一并逛。",
      tip:
        "¥20，现场购票即可；7:30–17:30。若已经去过拙政园/留园，这里更适合“补一个清静”。",
      booking: {
        channel: "现场购票",
        deadline: "无需预约",
        url: "https://suzhou.bendibao.com/news/jingdianbao/",
      },
      review: {
        quote:
          "苏州最古老的园林，复廊漏窗百样；游客少，适合喜欢幽静的人。",
        by: "综合苏州园林攻略",
        url: "https://suzhou.bendibao.com/news/jingdianbao/",
      },
      sources: [
        {
          label: "苏州本地宝 · 景点预约",
          url: "https://suzhou.bendibao.com/news/jingdianbao/",
        },
      ],
      accent: "celadon",
    },
    {
      id: "ouyuan",
      kind: "spot",
      name: "耦园",
      short: "耦园",
      label: "平江路旁的“爱情园林”",
      area: "gusu-east",
      areaLabel: "仓街 · 小新桥巷",
      address: "姑苏区仓街小新桥巷 6 号",
      lat: 31.32050,
      lng: 120.63800,
      day: 1,
      price: 25,
      priceLabel: "¥25",
      durationMin: 60,
      tags: ["园林", "小众", "世界遗产", "雨天"],
      summary:
        "藏在平江路东侧的小园林，因“耦”通“偶”被叫作爱情园林。游客少、回廊多，是拙政园约不上时的最佳备选。",
      couple:
        "“耦园住佳偶”的匾额前合影；临水月洞门很安静，雨天更有江南味。",
      tip:
        "¥25，现场购票；7:30–17:00。离平江路步行约 10 分钟，适合替换人挤人的拙政园。",
      booking: {
        channel: "现场购票",
        deadline: "无需预约",
        url: "https://k.sina.cn/article_7879777377_1d5abdc6106801k6n2.html",
      },
      review: {
        quote:
          "小型园林里室内厅堂多、门票低，回廊避雨；耦园是雨天和错峰的好选择。",
        by: "2026 苏州雨天室内替代攻略",
        url: "https://k.sina.cn/article_7879777377_1d5abdc6106801k6n2.html",
      },
      sources: [
        {
          label: "2026 苏州雨天室内替代景点",
          url: "https://k.sina.cn/article_7879777377_1d5abdc6106801k6n2.html",
        },
      ],
      accent: "celadon",
    },
    {
      id: "museum_west",
      kind: "spot",
      name: "苏州博物馆 · 西馆",
      short: "苏博西馆",
      label: "本馆约不上时的 Plan B",
      area: "sip",
      areaLabel: "狮山 · 长江路",
      address: "虎丘区长江路 399 号",
      lat: 31.30200,
      lng: 120.55600,
      day: 1,
      price: 0,
      priceLabel: "免费 · 免预约",
      durationMin: 100,
      tags: ["博物馆", "室内", "免费", "雨天"],
      summary:
        "在本馆之外的另一座苏博，展陈更现代、空间更大，免预约直接入馆。适合作为苏博本馆抢不到票或下雨天的替代。",
      couple:
        "建筑中庭和落地窗很好拍；人少，可以慢慢看展，不用被人流推着走。",
      tip:
        "9:00–17:00，周一闭馆；免预约，遇客流高峰限流。距古城约 13 公里，打车 25–30 分钟，别和本馆搞混。",
      booking: {
        channel: "现场排队入馆",
        deadline: "无需预约",
        url: "https://suzhou.bendibao.com/news/jingdianbao/",
      },
      review: {
        quote:
          "西馆免预约、放票量是本馆的数倍，适合约不上本馆时替代；展陈偏现当代，空间很舒服。",
        by: "2026 苏州雨天/约不上苏博攻略",
        url: "https://k.sina.cn/article_7879777377_1d5abdc6106801k6n2.html",
      },
      sources: [
        {
          label: "苏州本地宝 · 苏博西馆信息",
          url: "https://suzhou.bendibao.com/news/jingdianbao/",
        },
      ],
      accent: "celadon",
    },
  ];

  const foods = [
    {
      id: "songhelou",
      kind: "food",
      name: "松鹤楼（平江路店）",
      short: "松鹤楼",
      label: "苏帮菜 · 百年老字号",
      area: "gusu-east",
      areaLabel: "平江路 · 大儒巷",
      address: "姑苏区大儒巷 62 号",
      lat: 31.31940,
      lng: 120.62980,
      day: 1,
      price: 150,
      priceLabel: "人均 ¥150",
      tags: ["老字号", "苏帮菜", "晚餐"],
      signature: ["松鼠鳜鱼", "响油鳝糊", "清炒虾仁"],
      summary:
        "乾隆年间开到现在的苏帮菜招牌。第一晚正经吃一顿，松鼠鳜鱼上桌时“吱吱”作响，是苏州饭桌上的仪式感。",
      couple:
        "两个人点一份松鼠鳜鱼、一份时蔬、一份清炒虾仁刚好；临河位不多，订位时直接说“想要靠窗”。",
      tip:
        "晚市 17:00 开餐；松鼠鳜鱼约 ¥268，人均会到 150 左右。周末排队，建议提前 1 天订位或用“美味不用等”取号。",
      review: {
        quote:
          "松鼠鳜鱼外酥里嫩、酸甜适口，是苏帮菜的“活化石”；响油鳝糊浓油赤酱，第一次吃苏州菜点这两道不会错。",
        by: "综合腾讯新闻、2026 大众点评必吃榜信息",
        url: "https://view.inews.qq.com/wxn/20260418A02AF700",
      },
      sources: [
        {
          label: "腾讯新闻 · 苏州 8 家老店",
          url: "https://view.inews.qq.com/wxn/20260418A02AF700",
        },
        {
          label: "2026 大众点评苏州必吃榜介绍",
          url: "https://m.toutiao.com/article/7633315667650822691/",
        },
      ],
      query: "松鹤楼 平江路",
      meal: "dinner",
      day: 1,
      ratingNote: "2026 必吃榜入围",
    },
    {
      id: "xinjufeng",
      kind: "food",
      name: "新聚丰菜馆",
      short: "新聚丰",
      label: "本地人聚餐的百年老店",
      area: "gusu-east",
      areaLabel: "观前街 · 太监弄",
      address: "姑苏区太监弄 9 号五芳斋 2 楼",
      lat: 31.31130,
      lng: 120.62050,
      day: 1,
      price: 135,
      priceLabel: "人均 ¥135",
      tags: ["老字号", "苏帮菜", "本地口碑"],
      signature: ["母油船鸭", "三件子", "清炒虾仁"],
      summary:
        "光绪年间创立的苏帮菜馆，和松鹤楼、得月楼做邻居，但更受本地食客偏爱。菜量实在，适合想吃“正经苏帮菜”又不想太游客的人。",
      couple:
        "三件子是一大砂锅，两个人点一份再加一个素菜就够；想拍照可以点清炒虾仁，清清爽爽。",
      tip:
        "11:00–13:30、17:30–20:30；包厢多、散桌少，饭点建议提前订位。位于太监弄，离观前街很近。",
      review: {
        quote:
          "三件子汤鲜美不腻、炸猪排香脆；老苏州聚餐会选这里，价格比隔壁两家亲民。",
        by: "大众点评用户评价 · 2023（近期口碑仍稳）",
        url: "https://m.dianping.com/review/750020076",
      },
      sources: [
        {
          label: "大众点评 · 新聚丰评价",
          url: "https://m.dianping.com/review/750020076",
        },
      ],
      query: "新聚丰 太监弄",
      meal: "lunch",
      ratingNote: "百年老店 · 本地口碑",
    },
    {
      id: "xiehe",
      kind: "food",
      name: "协和菜馆",
      short: "协和菜馆",
      label: "凤凰街的苏帮菜“扫地僧”",
      area: "gusu-east",
      areaLabel: "凤凰街 · 十全街",
      address: "姑苏区凤凰街 15 号",
      lat: 31.30880,
      lng: 120.62450,
      day: 1,
      price: 98,
      priceLabel: "人均 ¥98",
      tags: ["老字号", "苏帮菜", "性价比"],
      signature: ["响油鳝糊", "清炒虾仁", "协和酱方"],
      summary:
        "门面不起眼，却是本地人心里“比松鹤楼更日常”的苏帮菜馆。砂锅一字排开，老板在门口照应，是旧式饭店的样子。",
      couple:
        "点一份酱方、一份清炒虾仁、一份时蔬，甜咸平衡；吃完散步去十全街或网师园都近。",
      tip:
        "10:30–14:00、16:30–21:00；老店服务比较“直来直去”，提前订位更稳。",
      review: {
        quote:
          "老牌苏帮酒楼里风评很稳的一家；出品地道、价格亲民，是本地食客和游客都认的苏帮菜打卡地。",
        by: "城市惠 · 口碑评分 4.5/5",
        url: "https://m.cityhui.com/shop/19598.html",
      },
      sources: [
        {
          label: "城市惠 · 协和菜馆",
          url: "https://m.cityhui.com/shop/19598.html",
        },
      ],
      query: "协和菜馆 凤凰街",
      meal: "dinner",
      ratingNote: "口碑 4.5/5",
    },
    {
      id: "zhenzhu",
      kind: "food",
      name: "珍珠饭店",
      short: "珍珠饭店",
      label: "观前街的性价比之选",
      area: "gusu-east",
      areaLabel: "观前街 · 珍珠弄",
      address: "姑苏区观前街珍珠弄 9 号",
      lat: 31.31200,
      lng: 120.62100,
      day: 1,
      price: 83,
      priceLabel: "人均 ¥83",
      tags: ["苏帮菜", "性价比", "本地人"],
      signature: ["响油鳝糊", "蚌肉桂花菜", "椒盐排条"],
      summary:
        "藏在珍珠弄里的家常菜馆，被不少本地人当作松鹤楼、得月楼的平替。想吃一顿不心疼的苏帮菜，可以把它排进备选。",
      couple:
        "点三道家常菜就好，把预算留给晚上的湖景晚餐或评弹。",
      tip:
        "11:00–13:30、16:30–20:30；菜单里也有川湘菜，点单时认准苏帮菜即可。",
      review: {
        quote:
          "名气不如老字号，却是本地食客心中足以替代松鹤楼、得月楼的性价比之选。",
        by: "城市惠 · 口碑评分 4.5/5",
        url: "https://m.cityhui.com/shop/19602.html",
      },
      sources: [
        {
          label: "城市惠 · 珍珠饭店",
          url: "https://m.cityhui.com/shop/19602.html",
        },
      ],
      query: "珍珠饭店 观前街",
      meal: "lunch",
      ratingNote: "性价比高",
    },
    {
      id: "wumen",
      kind: "food",
      name: "吴门人家（拙政园店）",
      short: "吴门人家",
      label: "一碗糖粥的苏州早晨",
      area: "gusu-east",
      areaLabel: "潘儒巷 · 拙政园旁",
      address: "姑苏区东潘儒巷 38 号（园林路 88 号）",
      lat: 31.32200,
      lng: 120.62750,
      day: 1,
      price: 97,
      priceLabel: "人均 ¥97",
      tags: ["苏帮菜", "早茶", "糖粥", "近苏博"],
      signature: ["糖粥", "樱桃肉", "松鼠鳜鱼"],
      summary:
        "从糖粥摊做起的苏州馆子，离苏博和拙政园都近。比起大鱼大肉，本地人更惦记那碗桂花糖粥——甜得温和，像在爷爷家吃饭。",
      couple:
        "中午点一份糖粥分着吃，再要樱桃肉和时蔬；吃完步行 5 分钟就到苏博。",
      tip:
        "06:30–09:30、11:00–15:00、17:00–20:30；午市人多，建议 11:15 前到。",
      review: {
        quote:
          "苏州人喜欢的还是那碗糖粥；喝到这碗粥，就像坐在老式方桌前，在爷爷家吃饭。",
        by: "姑苏网 · 苏州 11 家苏帮菜老店",
        url: "https://s.gusuwang.com/v3643.html",
      },
      sources: [
        {
          label: "姑苏网 · 苏州苏帮菜老店",
          url: "https://s.gusuwang.com/v3643.html",
        },
      ],
      query: "吴门人家 拙政园",
      meal: "lunch",
      ratingNote: "近景区 · 糖粥招牌",
    },
    {
      id: "tongdexing",
      kind: "food",
      name: "同得兴（十全街店）",
      short: "同得兴",
      label: "苏式面的“头汤”执念",
      area: "gusu-east",
      areaLabel: "十全街 · 三元坊",
      address: "姑苏区十全街 624 号",
      lat: 31.29750,
      lng: 120.62700,
      day: 2,
      price: 56,
      priceLabel: "人均 ¥56",
      tags: ["面馆", "老字号", "早餐"],
      signature: ["枫镇大肉面", "白汤面", "糖醋面筋"],
      summary:
        "《舌尖上的中国》推荐过的苏式面馆。白汤用酒酿吊，汤清味鲜；枫镇大肉面是招牌，焖肉入口即化。",
      couple:
        "两个人点一碗红汤、一碗白汤，交换着吃；再加一份糖醋面筋，甜口党会开心。",
      tip:
        "约 07:00–13:00，卖完即止；想喝“头汤”就 7:00 前到。离网师园、沧浪亭近，适合排在古城南线。",
      review: {
        quote:
          "白汤用酒酿吊制，汤清味鲜，焖肉入口即化；是苏式汤面的代表。",
        by: "2026 大众点评苏州必吃榜介绍",
        url: "https://m.toutiao.com/article/7633315667650822691/",
      },
      sources: [
        {
          label: "2026 大众点评苏州必吃榜介绍",
          url: "https://m.toutiao.com/article/7633315667650822691/",
        },
      ],
      query: "同得兴 十全街",
      meal: "breakfast",
      ratingNote: "2026 必吃榜入围",
    },
    {
      id: "yaba",
      kind: "food",
      name: "哑巴生煎（临顿路店）",
      short: "哑巴生煎",
      label: "苏州生煎界的传奇",
      area: "gusu-east",
      areaLabel: "临顿路 · 温家岸",
      address: "姑苏区临顿路温家岸 12 号",
      lat: 31.31300,
      lng: 120.62900,
      day: 1,
      price: 24,
      priceLabel: "人均 ¥24",
      tags: ["小吃", "生煎", "排队"],
      signature: ["鲜肉生煎", "牛肉粉丝汤", "泡泡小馄饨"],
      summary:
        "本地人从小吃到大的生煎店。现包现煎，皮薄底脆，肉馅带一点甜，咬开先吸汤。",
      couple:
        "一份生煎 + 一碗牛肉粉丝汤分着吃，留着肚子去平江路继续扫街。",
      tip:
        "4 个约 ¥12；饭点排队，建议错峰。刚出锅很烫，先咬小口放汤。",
      review: {
        quote:
          "皮薄如纸、底部焦脆，肉馅紧实带微甜；咬开瞬间爆汁，配牛肉粉丝汤最舒服。",
        by: "腾讯新闻 · 苏州老店",
        url: "https://view.inews.qq.com/wxn/20260418A02AF700",
      },
      sources: [
        {
          label: "腾讯新闻 · 苏州 8 家老店",
          url: "https://view.inews.qq.com/wxn/20260418A02AF700",
        },
      ],
      query: "哑巴生煎 临顿路",
      meal: "snack",
      ratingNote: "2026 必吃榜入围",
    },
    {
      id: "taohuayuanji",
      kind: "food",
      name: "桃花源记（平江路店）",
      short: "桃花源记",
      label: "平江路的苏式小吃铺",
      area: "gusu-east",
      areaLabel: "平江路 · 青石桥",
      address: "姑苏区平江路历史街区内",
      lat: 31.31650,
      lng: 120.63200,
      day: 1,
      price: 35,
      priceLabel: "人均 ¥35",
      tags: ["小吃", "糖水", "平价"],
      signature: ["赤豆糊圆子", "酱骨头", "苏式绿豆汤"],
      summary:
        "平江路上适合“边走边吃”的一站。赤豆糊圆子糯叽叽，酱骨头甜咸入味，人均 30 多就能吃得很满足。",
      couple:
        "点一份赤豆糊圆子两个人分，再打包一份酱骨头边走边啃；比主街的网红奶茶更值得。",
      tip:
        "平江路主街店排队较多，可拐进巷子找分店；小吃偏甜，吃不惯可以配一杯碧螺春。",
      review: {
        quote:
          "赤豆糊圆子糯叽叽，人均 30 吃撑；是平江路上性价比很高的小吃选择。",
        by: "携程 · 平江路游玩攻略",
        url: "https://m.ctrip.com/webapp/you/tripshoot/paipai/detail/detail?articleId=179511809",
      },
      sources: [
        {
          label: "携程 · 平江路摇橹船与评弹",
          url: "https://m.ctrip.com/webapp/you/tripshoot/paipai/detail/detail?articleId=179511809",
        },
      ],
      query: "桃花源记 平江路",
      meal: "snack",
      ratingNote: "平价小吃",
    },
    {
      id: "rongyanglou",
      kind: "food",
      name: "荣阳楼（山塘街店）",
      short: "荣阳楼",
      label: "1866 年开业的油氽团子",
      area: "gusu-west",
      areaLabel: "山塘街 · 新民桥",
      address: "姑苏区山塘街 329 号",
      lat: 31.31880,
      lng: 120.59000,
      day: 2,
      price: 20,
      priceLabel: "人均 ¥20",
      tags: ["老字号", "小吃", "油氽团子"],
      signature: ["油氽团子", "焖肉面", "生煎"],
      summary:
        "山塘街深处的百年老店，本地人比游客多。油氽团子是招牌：糯米皮炸得金黄酥脆，里面是一小团甜肉馅。",
      couple:
        "买一个油氽团子（约 ¥4）分着吃，留肚子去隔壁赵元章再啃一份肉骨烧。",
      tip:
        "06:00–19:00 左右；下午去可能只剩馄饨和生煎，想吃的要早。店内自己取餐，别期待服务。",
      review: {
        quote:
          "油氽团子是当家招牌，糯米皮金黄酥脆、里面肉馅偏甜；本地人从小吃到大。",
        by: "携程 · 102 条点评，4.0/5",
        url: "https://m.ctrip.com/html5/you/foods/suzhou11/5123655.html",
      },
      sources: [
        {
          label: "携程 · 荣阳楼点评",
          url: "https://m.ctrip.com/html5/you/foods/suzhou11/5123655.html",
        },
        {
          label: "大众点评 · 荣阳楼",
          url: "https://m.dianping.com/ugcdetail/248676381?bizType=29",
        },
      ],
      query: "荣阳楼 山塘街",
      meal: "lunch",
      ratingNote: "4.0/5 · 102 条点评",
    },
    {
      id: "zhaoyuanzhang",
      kind: "food",
      name: "赵元章肉骨烧",
      short: "赵元章",
      label: "山塘街的甜咸肉骨",
      area: "gusu-west",
      areaLabel: "山塘街 · 荣阳楼旁",
      address: "姑苏区山塘街（荣阳楼隔壁）",
      lat: 31.31850,
      lng: 120.59100,
      day: 2,
      price: 30,
      priceLabel: "人均 ¥30",
      tags: ["小吃", "肉骨烧", "本地"],
      signature: ["肉骨烧", "酱汁排骨"],
      summary:
        "山塘街上的肉骨烧小店，酱汁浓甜、肉炖得酥烂。和荣阳楼只隔几步，适合一并打卡。",
      couple:
        "一份肉骨烧两个人分，吃完正好沿山塘河散步消食。",
      tip:
        "人均约 ¥30；酱汁偏甜，可以让老板少浇一点。别在景区主街买“手工糕点”当正餐。",
      review: {
        quote:
          "酱汁浓到能拉丝，啃骨头的快乐一口接一口；和荣阳楼是山塘街的固定组合。",
        by: "百度 · 苏州私藏小店",
        url: "https://mbd.baidu.com/newspage/data/dtlandingsuper?from=2001k&nid=dt_4033855743606700414",
      },
      sources: [
        {
          label: "百度 · 苏州私藏小店",
          url: "https://mbd.baidu.com/newspage/data/dtlandingsuper?from=2001k&nid=dt_4033855743606700414",
        },
      ],
      query: "赵元章肉骨烧 山塘街",
      meal: "snack",
      ratingNote: "本地小店",
    },
    {
      id: "xiyuan_noodle",
      kind: "food",
      name: "西园寺素面",
      short: "西园寺素面",
      label: "寺庙里的一碗观音面",
      area: "gusu-west",
      areaLabel: "西园寺 · 素面馆",
      address: "姑苏区留园路西园弄 18 号（寺内）",
      lat: 31.32050,
      lng: 120.58670,
      day: 2,
      price: 15,
      priceLabel: "¥10–15",
      tags: ["素面", "早餐", "寺庙"],
      signature: ["观音面", "吉祥面", "如意面"],
      summary:
        "为了这碗面早起也值得。观音面有笋片、香菇、油面筋，汤头清甜；吃完再去后花园看猫，是苏州最安静的一顿早餐。",
      couple:
        "一个人排队买面、一个人找座；吃完去抄经堂写一页心经，把节奏慢下来。",
      tip:
        "素面 8:00–15:00，卖完即止；11 点后排队明显变长。寺内不要浪费食物。",
      review: {
        quote:
          "观音面 ¥15、如意面 ¥10，汤头偏甜但分量足；11 点排队约 15 分钟，后花园的猫和鸽子很治愈。",
        by: "大众点评用户 · 2026",
        url: "https://m.dianping.com/ugcdetail/152830963?bizType=29",
      },
      sources: [
        {
          label: "大众点评 · 西园寺素面",
          url: "https://m.dianping.com/ugcdetail/152830963?bizType=29",
        },
      ],
      query: "西园寺素面",
      meal: "breakfast",
      ratingNote: "寺庙素面",
    },
    {
      id: "daniangniang",
      kind: "food",
      name: "大孃孃苏式糖水（双塔市集店）",
      short: "大孃孃",
      label: "芋泥麻薯圆子",
      area: "gusu-east",
      areaLabel: "双塔市集",
      address: "姑苏区石匠弄 2 号双塔市集内",
      lat: 31.30520,
      lng: 120.62860,
      day: 2,
      price: 18,
      priceLabel: "人均 ¥18",
      tags: ["糖水", "甜品", "市集"],
      signature: ["芋泥麻薯圆子", "赤豆鸡头米"],
      summary:
        "双塔市集里最受欢迎的糖水摊。芋泥磨得细，麻薯会拉丝，甜度刚好；鸡头米是苏州秋天的时令。",
      couple:
        "点一碗芋泥麻薯、一碗赤豆鸡头米，交换着吃；适合作为市集逛吃的收尾。",
      tip:
        "饭点排队约 20 分钟；碗不大，留肚子给生煎和海棠糕。",
      review: {
        quote:
          "芋泥磨得特别细，配上软糯麻薯和桂花香，甜度刚好不会腻。",
        by: "大众点评用户 · 2026",
        url: "https://m.dianping.com/ugcdetail/165014370?bizType=29",
      },
      sources: [
        {
          label: "大众点评 · 双塔市集逛吃",
          url: "https://m.dianping.com/ugcdetail/165014370?bizType=29",
        },
      ],
      query: "大孃孃 双塔市集",
      meal: "snack",
      ratingNote: "双塔人气摊",
    },
    {
      id: "yuyongsheng",
      kind: "food",
      name: "裕永盛（双塔市集店）",
      short: "裕永盛",
      label: "生煎与纸皮烧卖",
      area: "gusu-east",
      areaLabel: "双塔市集",
      address: "姑苏区石匠弄 2 号双塔市集内",
      lat: 31.30500,
      lng: 120.62840,
      day: 2,
      price: 25,
      priceLabel: "人均 ¥25",
      tags: ["生煎", "烧卖", "市集"],
      signature: ["招牌大虾生煎", "纸皮咸蛋黄烧卖"],
      summary:
        "双塔市集里的生煎摊，鲜肉、虾仁、小龙虾可以双拼。纸皮咸蛋黄烧卖也值得一试。",
      couple:
        "点一份双拼生煎，再加一个纸皮烧卖；先咬小口喝汤，别烫到。",
      tip:
        "鲜肉生煎约 ¥9/4 个，大虾约 ¥16；现煎出炉要等，饭点排队。",
      review: {
        quote:
          "生煎皮酥、馅足、一口爆汁；纸皮咸蛋黄烧卖咸香软糯，盲点不踩雷。",
        by: "大众点评用户 · 2026",
        url: "https://m.dianping.com/ugcdetail/291331832?bizType=29",
      },
      sources: [
        {
          label: "大众点评 · 双塔市集 6 家必吃",
          url: "https://m.dianping.com/ugcdetail/291331832?bizType=29",
        },
      ],
      query: "裕永盛 双塔市集",
      meal: "snack",
      ratingNote: "双塔人气摊",
    },
    {
      id: "tangyifang",
      kind: "food",
      name: "棠艺坊（双塔市集店）",
      short: "棠艺坊",
      label: "非遗海棠糕",
      area: "gusu-east",
      areaLabel: "双塔市集",
      address: "姑苏区石匠弄 2 号双塔市集内",
      lat: 31.30490,
      lng: 120.62870,
      day: 2,
      price: 7,
      priceLabel: "¥7 / 个",
      tags: ["海棠糕", "非遗", "市集"],
      signature: ["海棠糕"],
      summary:
        "现烤的海棠糕，焦糖脆皮里包豆沙，趁热吃最香。比景区里颜色鲜艳的“网红梅花糕”更值得。",
      couple:
        "买一个分着吃，刚出炉的焦糖边最脆；拍照要快，凉了会塌。",
      tip:
        "约 ¥7/个；饭点排队。双塔市集里还有梅花糕，但本地人更推荐海棠糕。",
      review: {
        quote:
          "焦糖脆皮里包着豆沙馅，非遗手艺；比网红梅花糕更值得买。",
        by: "大众点评用户 · 2026",
        url: "https://m.dianping.com/ugcdetail/165014370?bizType=29",
      },
      sources: [
        {
          label: "大众点评 · 双塔市集逛吃",
          url: "https://m.dianping.com/ugcdetail/165014370?bizType=29",
        },
      ],
      query: "棠艺坊 双塔市集",
      meal: "snack",
      ratingNote: "非遗小吃",
    },
    {
      id: "yueshanfu",
      kind: "food",
      name: "悦山府 8 号 · CHAI 8 HOUSE",
      short: "悦山府 8 号",
      label: "金鸡湖边的仪式感晚餐",
      area: "sip",
      areaLabel: "李公堤 · 金鸡湖",
      address: "工业园区李公堤（近金鸡湖）",
      lat: 31.30350,
      lng: 120.68900,
      day: 2,
      price: 300,
      priceLabel: "人均 ¥300",
      tags: ["湖景", "苏菜", "约会", "需订位"],
      signature: ["陈皮狮子头", "醉蟹溏心皮蛋", "金桂烟熏乳鸽"],
      summary:
        "李公堤的三层独栋湖景餐厅，落地窗和楼顶露台能看东方之门与国金中心。菜是偏现代的苏菜，适合把最后一顿吃成纪念日。",
      couple:
        "订位时说要“临湖/露台位”，日落前 30 分钟入座；狮子头和陈皮汤是稳妥的招牌。",
      tip:
        "人均约 ¥300，套餐另计；临湖位紧张，建议提前 2–3 天订。若预算有限，改去江南雅厨或苏堤·花漾。",
      review: {
        quote:
          "三层独栋湖景，傍晚在楼顶露台看东方之门和国金中心；陈皮狮子头肉香汤鲜、入口即化。",
        by: "携程 · 4.5/5，120 条点评",
        url: "https://m.ctrip.com/webapp/you/tripshoot/paipai/detail/detail?articleId=69040231",
      },
      sources: [
        {
          label: "携程 · 悦山府 8 号",
          url: "https://m.ctrip.com/webapp/you/tripshoot/paipai/detail/detail?articleId=69040231",
        },
        {
          label: "新浪 · 江浙菜约会餐厅",
          url: "https://www.sina.cn/gc/article/ninaezp3973936.html",
        },
      ],
      query: "悦山府8号 李公堤",
      meal: "dinner",
      ratingNote: "4.5/5 · 120 条点评",
    },
    {
      id: "jiangnan_yachu",
      kind: "food",
      name: "江南雅厨（李公堤店）",
      short: "江南雅厨",
      label: "湖景边的稳妥苏帮菜",
      area: "sip",
      areaLabel: "李公堤 · 金鸡湖",
      address: "工业园区李公堤",
      lat: 31.30350,
      lng: 120.69050,
      day: 2,
      price: 200,
      priceLabel: "人均 ¥200",
      tags: ["湖景", "苏帮菜", "性价比"],
      signature: ["松鼠鳜鱼", "响油鳝糊", "时令湖鲜"],
      summary:
        "李公堤上环境、服务和菜品都比较均衡的苏帮菜馆。人均 200 左右，比高端湖景餐厅好下手，又能吃到正经苏帮菜。",
      couple:
        "提前订靠窗位；点松鼠鳜鱼和一份时蔬，边吃边等湖面亮灯。",
      tip:
        "人均约 ¥200；周末临湖位紧张，建议提前订。李公堤停车方便但周末车位少，地铁+步行更稳。",
      review: {
        quote:
          "人均 200 左右，环境、服务和菜品都值回票价；适合看湖吃苏帮菜。",
        by: "搜狐 · 2026 李公堤美食指南",
        url: "https://m.sohu.com/a/995446167_122621662/",
      },
      sources: [
        {
          label: "搜狐 · 李公堤美食新地标",
          url: "https://m.sohu.com/a/995446167_122621662/",
        },
      ],
      query: "江南雅厨 李公堤",
      meal: "dinner",
      ratingNote: "湖景 · 人均 200",
    },
    {
      id: "suchi_huayang",
      kind: "food",
      name: "苏堤·花漾 Villa Brunch & Bistro",
      short: "苏堤·花漾",
      label: "李公堤的湖景小酒馆",
      area: "sip",
      areaLabel: "李公堤 · 金鸡湖",
      address: "工业园区李公堤路 66 号",
      lat: 31.30360,
      lng: 120.69200,
      day: 2,
      price: 172,
      priceLabel: "人均 ¥172",
      tags: ["湖景", "西餐", "约会", "下午茶"],
      signature: ["松露火腿薄饼", "黑松露薯条"],
      summary:
        "如果不想吃正经苏帮菜，这里是李公堤上更轻松的约会选择：湖景、落地窗、brunch 和酒。适合把晚餐变成“边吃边看日落”。",
      couple:
        "点薄饼和薯条，配一杯酒；坐窗边看湖面从金色变蓝。",
      tip:
        "10:00–22:00，人均约 ¥172；临窗位建议提前订。",
      review: {
        quote:
          "坐在窗边一边吃一边看湖景，松露火腿薄饼和黑松露薯条都不错；适合约会。",
        by: "百度 · 苏州湖景餐厅",
        url: "https://mbd.baidu.com/newspage/data/dtlandingsuper?nid=dt_4381196753774508611&from=2001k",
      },
      sources: [
        {
          label: "百度 · 苏州湖景餐厅",
          url: "https://mbd.baidu.com/newspage/data/dtlandingsuper?nid=dt_4381196753774508611&from=2001k",
        },
      ],
      query: "苏堤花漾 李公堤",
      meal: "dinner",
      ratingNote: "湖景 Bistro",
    },
  ];

  const experiences = [
    {
      id: "boat_pingjiang",
      kind: "experience",
      name: "平江路摇橹船",
      short: "摇橹船",
      label: "在水上看灯亮起来",
      area: "gusu-east",
      areaLabel: "平江路 · 保吉利桥",
      address: "平江路保吉利桥码头",
      lat: 31.31820,
      lng: 120.63250,
      day: 1,
      price: 40,
      priceLabel: "¥40/人",
      durationMin: 35,
      tags: ["水巷", "夜景", "情侣"],
      summary:
        "从保吉利桥出发，穿过青石桥，往返约 30–40 分钟。船娘摇着橹，两岸白墙和红灯笼慢慢退后。",
      couple:
        "傍晚光线最柔；亮灯后的平江路留到饭后慢慢走，比在船上匆匆拍照更舒服。",
      tip:
        "官方码头购票，¥40/人，1.2m 以下儿童免费；不要跟路边拉客的私船。想听船娘唱小调，通常要另给小费，先问清楚。",
      review: {
        quote:
          "40 元/人、往返约 30 分钟；建议傍晚乘船，两岸灯笼初上时最美。",
        by: "携程 · 平江路攻略",
        url: "https://m.ctrip.com/webapp/you/tripshoot/paipai/detail/detail?articleId=179511809",
      },
      sources: [
        {
          label: "苏州本地宝 · 平江路摇橹船",
          url: "https://m.suzhou.bendibao.com/tour/ly129525.shtm",
        },
      ],
      query: "平江路摇橹船",
      icon: "boat",
    },
    {
      id: "pingtan",
      kind: "experience",
      name: "琵琶语评弹馆",
      short: "听评弹",
      label: "一杯茶，一曲《声声慢》",
      area: "gusu-east",
      areaLabel: "平江路 189 号",
      address: "姑苏区平江路 189 号",
      lat: 31.31680,
      lng: 120.63150,
      day: 1,
      price: 58,
      priceLabel: "约 ¥38–88/人",
      durationMin: 70,
      tags: ["评弹", "茶馆", "夜游"],
      summary:
        "平江路最有名的评弹茶馆。吴亮莹老师唱过《金陵十三钗》里的《秦淮景》，一开口就是吴侬软语的酥。",
      couple:
        "点一壶碧螺春，坐内场；听不懂唱词也没关系，看字幕、听琵琶，氛围足够。",
      tip:
        "票价按场次/座位约 ¥38–88，以现场为准；吴亮莹老师不是每天在，去之前一定电话确认。旺季提前 1 天买票、选座。",
      review: {
        quote:
          "吴亮莹老师不是每天都有演出，去之前一定要提前打电话询问；内场 88 元区域体验更好。",
        by: "苏州本地宝 + 大众点评用户",
        url: "https://m.suzhou.bendibao.com/tour/ly129525.shtm",
      },
      sources: [
        {
          label: "苏州本地宝 · 平江路评弹",
          url: "https://m.suzhou.bendibao.com/tour/ly129525.shtm",
        },
        {
          label: "携程 · 平江路评弹",
          url: "https://m.ctrip.com/webapp/you/tripshoot/paipai/detail/detail?articleId=179511809",
        },
      ],
      query: "琵琶语评弹馆 平江路",
      icon: "music",
    },
    {
      id: "night_garden",
      kind: "experience",
      name: "网师园夜花园",
      short: "夜游网师园",
      label: "一景一戏，江南夜宴",
      area: "gusu-east",
      areaLabel: "阔家头巷 · 十全街",
      address: "姑苏区阔家头巷 11 号",
      lat: 31.29780,
      lng: 120.63200,
      day: 1,
      price: 120,
      priceLabel: "¥120/人",
      durationMin: 90,
      tags: ["夜游", "昆曲", "园林", "预约"],
      summary:
        "网师园的夜间演艺：昆曲、评弹、苏剧、古琴分散在亭台楼阁里，跟着导览员一景一戏地看。比白天多一层灯光和声音。",
      couple:
        "这是整趟行程里最“江南”的一晚；如果只看一场演出，选它。",
      tip:
        "夜游 ¥120/人，园林卡不可用；18:25 开园，周日至周四 21:40 闭园（20:55 停止入园），周五/周六延长。官方公众号实名分时预约，旺季提前 3–7 天。",
      review: {
        quote:
          "灯光水影里听昆曲，像穿越回古代；首场人最少，体验最好。",
        by: "什么值得买 · 2026 夜花园体验",
        url: "https://post.m.smzdm.com/p/a4qrrv68/",
      },
      sources: [
        {
          label: "苏州本地宝 · 网师园夜花园",
          url: "http://m.suzhou.bendibao.com/cyfw/94508.shtm",
        },
        {
          label: "什么值得买 · 夜花园值不值",
          url: "https://post.m.smzdm.com/p/aww53krp/",
        },
      ],
      query: "网师园夜花园",
      icon: "moon",
    },
    {
      id: "hanfu",
      kind: "experience",
      name: "平江路汉服妆造",
      short: "汉服妆造",
      label: "把两个人放进江南",
      area: "gusu-east",
      areaLabel: "平江路 · 大儒巷",
      address: "平江路历史街区（妆造店集中）",
      lat: 31.31720,
      lng: 120.63180,
      day: 1,
      price: 60,
      priceLabel: "¥60 起",
      durationMin: 90,
      tags: ["汉服", "出片", "情侣"],
      summary:
        "平江路一带有很多汉服妆造店。基础服装+造型约 ¥60 起，妆造和跟拍另计。穿新中式或浅色旗袍，和粉墙黛瓦更搭。",
      couple:
        "男生可以选深色长衫/新中式，女生选浅色旗袍；两个人都不要选太花的图案，画面会更干净。",
      tip:
        "基础价 60 元起，妆造/跟拍按店计；提前 1 天预约，预留 1.5–2 小时。雨天改拍室内或改期。",
      review: {
        quote:
          "平江路租汉服 60 元一套+造型，阿姨很友好；穿汉服坐摇橹船拍照很出片。",
        by: "大众点评用户 · 平江路攻略",
        url: "https://m.dianping.com/ugcdetail/257843080?bizType=29",
      },
      sources: [
        {
          label: "大众点评 · 平江路汉服与摇橹船",
          url: "https://m.dianping.com/ugcdetail/257843080?bizType=29",
        },
      ],
      query: "平江路汉服妆造",
      icon: "fan",
    },
    {
      id: "xiyuan_slow",
      kind: "experience",
      name: "西园寺撸猫、抄经、数罗汉",
      short: "西园寺慢时光",
      label: "把早上交给猫和一碗面",
      area: "gusu-west",
      areaLabel: "西园寺",
      address: "姑苏区留园路西园弄 18 号",
      lat: 31.32050,
      lng: 120.58670,
      day: 2,
      price: 5,
      priceLabel: "门票 ¥5",
      durationMin: 80,
      tags: ["撸猫", "抄经", "素面"],
      summary:
        "西园寺的猫、鸽子和后花园，是苏州最治愈的“非景点”。吃完素面去抄经堂写一页心经，或者数罗汉、请一张罗汉卡。",
      couple:
        "一个人撸猫、一个人拍照；抄经时别说话，享受 20 分钟安静。",
      tip:
        "抄经免费，进门先净手；罗汉堂可以按虚岁数罗汉。不要投喂劣质猫条，避免被抓伤。",
      review: {
        quote:
          "寺里每天都有主动营业的猫猫，像天然猫咖；后花园有鸽子和园林景色，免费抄经很治愈。",
        by: "大众点评用户 · 2026",
        url: "https://m.dianping.com/ugcdetail/149595371?bizType=29",
      },
      sources: [
        {
          label: "大众点评 · 西园寺入寺攻略",
          url: "https://m.dianping.com/ugcdetail/149595371?bizType=29",
        },
      ],
      query: "西园寺",
      icon: "cat",
    },
    {
      id: "shantang_boat",
      kind: "experience",
      name: "山塘街画舫",
      short: "山塘画舫",
      label: "从水上穿过红灯笼",
      area: "gusu-west",
      areaLabel: "山塘街 · 古戏台码头",
      address: "山塘街古戏台码头",
      lat: 31.31700,
      lng: 120.59700,
      day: 2,
      price: 40,
      priceLabel: "约 ¥39.9–50/人",
      durationMin: 30,
      tags: ["画舫", "夜景", "水巷"],
      summary:
        "山塘河上的画舫，单程约 30 分钟，可从山塘街坐到虎丘或寒山寺方向。白天看水乡生活，晚上看红灯笼倒影。",
      couple:
        "如果前一晚已经坐过平江路摇橹船，这一段可以换成“岸边散步 + 荣阳楼”，不必重复。",
      tip:
        "票价约 ¥39.9–50/人，不同线路不同；现场购票或携程预订。想坐夜航要问清末班时间。",
      review: {
        quote:
          "画舫从古戏台码头出发，约 30 分钟；虎丘方向往返约 ¥49.8，是省腿的玩法。",
        by: "去哪儿 · 山塘街游船",
        url: "https://touch.piao.qunar.com/ticket/detail_2086978906.html",
      },
      sources: [
        {
          label: "去哪儿 · 山塘街游船",
          url: "https://touch.piao.qunar.com/ticket/detail_2086978906.html",
        },
      ],
      query: "山塘街游船",
      icon: "boat",
    },
    {
      id: "jinji_sunset",
      kind: "experience",
      name: "金鸡湖日落与蓝调",
      short: "湖边日落",
      label: "把最后一小时留给湖",
      area: "sip",
      areaLabel: "月光码头 · 金水湾",
      address: "工业园区月光码头 / 金水湾栈桥",
      lat: 31.32100,
      lng: 120.71950,
      day: 2,
      price: 0,
      priceLabel: "免费",
      durationMin: 75,
      tags: ["日落", "湖景", "出片"],
      summary:
        "10 月下旬日落约 17:20–18:10。月光码头的大相框、金水湾栈桥和东方之门同框，是苏州最现代、也最像“海边”的一幕。",
      couple:
        "提前 40 分钟到，先拍顺光人像；日落后等 15 分钟蓝调，再走去吃饭。",
      tip:
        "免费；湖边风大，带薄外套。音乐喷泉不是每天有，不要把它当必看项目。",
      review: {
        quote:
          "秋季太阳 18:00 左右落山，17:30–18:30 能拍到黄昏、晚霞和蓝调；月光码头大相框是经典机位。",
        by: "大众点评用户 · 金鸡湖日落",
        url: "https://m.dianping.com/ugcdetail/103429532?bizType=29",
      },
      sources: [
        {
          label: "大众点评 · 金鸡湖日落机位",
          url: "https://m.dianping.com/ugcdetail/103429532?bizType=29",
        },
        {
          label: "大众点评 · 金鸡湖环湖路线",
          url: "https://m.dianping.com/ugcdetail/331474787?bizType=29",
        },
      ],
      query: "金鸡湖 月光码头",
      icon: "sun",
    },
    {
      id: "market_graze",
      kind: "experience",
      name: "双塔市集逛吃",
      short: "市集逛吃",
      label: "菜市场里的苏州",
      area: "gusu-east",
      areaLabel: "双塔市集",
      address: "姑苏区石匠弄 2 号",
      lat: 31.30510,
      lng: 120.62850,
      day: 2,
      price: 0,
      priceLabel: "丰俭由人",
      durationMin: 60,
      tags: ["市集", "小吃", "烟火气"],
      summary:
        "把午餐拆成五六个小摊：生煎、海棠糕、芋泥麻薯、碧螺春奶茶。比正襟危坐更有“一起生活”的感觉。",
      couple:
        "每样只买一份，两个人分；从咸吃到甜，最后用一杯碧螺春奶茶收尾。",
      tip:
        "饭点排队 20 分钟起；营业到 20:00–21:00，不同摊位不同。",
      review: {
        quote:
          "十多家小吃人均几十块吃到撑；芋泥麻薯、生煎、海棠糕是稳妥选择。",
        by: "大众点评用户 · 2026",
        url: "https://m.dianping.com/ugcdetail/165014370?bizType=29",
      },
      sources: [
        {
          label: "大众点评 · 双塔市集逛吃",
          url: "https://m.dianping.com/ugcdetail/165014370?bizType=29",
        },
      ],
      query: "双塔市集",
      icon: "bowl",
    },
  ];

  const sources = [
    {
      group: "调研报告",
      title: "苏州两天一夜｜学生情侣深度游调研（含小红书 70 帖索引）",
      publisher: "本次调研报告",
      date: "2026-10-23",
      url: "research/苏州两天一夜学生情侣调研_2026.docx",
    },
    {
      group: "官方与预约",
      title: "苏州博物馆 · 预约须知（开放时间/提前 7 天/爽约规则）",
      publisher: "苏州博物馆官网",
      date: "2026-10 核对",
      url: "https://www.szmuseum.com/Other/ReservationTip",
    },
    {
      group: "官方与预约",
      title: "2026 苏州景点优惠门票、预约与开放时间汇总",
      publisher: "苏州本地宝",
      date: "2026-10-08",
      url: "https://suzhou.bendibao.com/news/jingdianbao/",
    },
    {
      group: "官方与预约",
      title: "拙政园/留园/虎丘门票与开放时间",
      publisher: "苏州本地宝",
      date: "2026-09-30",
      url: "https://suzhou.bendibao.com/tour/jingdianbangdan/2700.shtml",
    },
    {
      group: "官方与预约",
      title: "网师园夜花园票价、场次与购票渠道",
      publisher: "苏州本地宝",
      date: "2026-08-14",
      url: "http://m.suzhou.bendibao.com/cyfw/94508.shtm",
    },
    {
      group: "官方与预约",
      title: "网师园夜花园演出票体验与预约提醒",
      publisher: "什么值得买",
      date: "2026-06-30",
      url: "https://post.m.smzdm.com/p/aww53krp/",
    },
    {
      group: "官方与预约",
      title: "平江路游玩指南：摇橹船/评弹/交通",
      publisher: "苏州本地宝",
      date: "2025-03-26",
      url: "https://m.suzhou.bendibao.com/tour/ly129525.shtm",
    },
    {
      group: "行程与玩法",
      title: "苏州两天一夜情侣游怎么安排",
      publisher: "去哪儿旅行",
      date: "2026-07-23",
      url: "https://travelnews.qunar.com/qa_strategy/suzhou-two-day-one-night-couple-travel-guide",
    },
    {
      group: "行程与玩法",
      title: "2026 苏州三天两晚亲测行程（园林/平江路/山塘/金鸡湖动线参考）",
      publisher: "网易",
      date: "2026-08-24",
      url: "https://www.163.com/dy/article/L548Q1FQ0556NFX3.html",
    },
    {
      group: "行程与玩法",
      title: "2026 年苏杭情侣 8 个浪漫打卡点",
      publisher: "搜狐",
      date: "2026-02-25",
      url: "https://m.sohu.com/a/990011110_122614299/",
    },
    {
      group: "行程与玩法",
      title: "金鸡湖一日游：月光码头、诚品、李公堤",
      publisher: "查讯啦",
      date: "2026-09-22",
      url: "https://m.chaxunla.com/1718679480.html",
    },
    {
      group: "行程与玩法",
      title: "金鸡湖最佳日落机位（秋季 17:30–18:30）",
      publisher: "大众点评 UGC",
      date: "2025-05-23",
      url: "https://m.dianping.com/ugcdetail/103429532?bizType=29",
    },
    {
      group: "行程与玩法",
      title: "平江路摇橹船 + 评弹体验",
      publisher: "携程社区",
      date: "2025-08-02",
      url: "https://m.ctrip.com/webapp/you/tripshoot/paipai/detail/detail?articleId=179511809",
    },
    {
      group: "行程与玩法",
      title: "苏州下雨/苏博约不上？室内替代景点",
      publisher: "新浪",
      date: "2026-07-26",
      url: "https://k.sina.cn/article_7879777377_1d5abdc6106801k6n2.html",
    },
    {
      group: "行程与玩法",
      title: "虎丘 2026 自由行：门票、开放时间、3 条路线",
      publisher: "住哪去",
      date: "2026-08-19",
      url: "https://www.zhunaqu.com/su/article/18445",
    },
    {
      group: "餐厅口碑",
      title: "2026 年大众点评苏州必吃榜介绍（松鹤楼/同得兴/哑巴生煎）",
      publisher: "今日头条",
      date: "2026-04-27",
      url: "https://m.toutiao.com/article/7633315667650822691/",
    },
    {
      group: "餐厅口碑",
      title: "苏州 8 家老店美食：松鹤楼、哑巴生煎、同得兴…",
      publisher: "腾讯新闻",
      date: "2026-04-18",
      url: "https://view.inews.qq.com/wxn/20260418A02AF700",
    },
    {
      group: "餐厅口碑",
      title: "新聚丰菜馆：三件子、炸猪排与本地人聚餐",
      publisher: "大众点评",
      date: "2023-11-07",
      url: "https://m.dianping.com/review/750020076",
    },
    {
      group: "餐厅口碑",
      title: "协和菜馆：4.5/5，响油鳝糊/酱方",
      publisher: "城市惠",
      date: "2026-08-16",
      url: "https://m.cityhui.com/shop/19598.html",
    },
    {
      group: "餐厅口碑",
      title: "珍珠饭店：4.5/5，观前街性价比苏帮菜",
      publisher: "城市惠",
      date: "2025-12-31",
      url: "https://m.cityhui.com/shop/19602.html",
    },
    {
      group: "餐厅口碑",
      title: "吴门人家：一碗糖粥与苏州老味道",
      publisher: "姑苏网",
      date: "2020-02-12",
      url: "https://s.gusuwang.com/v3643.html",
    },
    {
      group: "餐厅口碑",
      title: "西园寺素面与撸猫攻略",
      publisher: "大众点评 UGC",
      date: "2026-04-19",
      url: "https://m.dianping.com/ugcdetail/152830963?bizType=29",
    },
    {
      group: "餐厅口碑",
      title: "双塔市集逛吃：芋泥麻薯/生煎/海棠糕",
      publisher: "大众点评 UGC",
      date: "2026-04-22",
      url: "https://m.dianping.com/ugcdetail/165014370?bizType=29",
    },
    {
      group: "餐厅口碑",
      title: "双塔市集 6 家必吃：裕永盛、大孃孃、棠艺坊",
      publisher: "大众点评 UGC",
      date: "2026-03-15",
      url: "https://m.dianping.com/ugcdetail/291331832?bizType=29",
    },
    {
      group: "餐厅口碑",
      title: "荣阳楼：油氽团子与 102 条点评",
      publisher: "携程",
      date: "2025-06-25",
      url: "https://m.ctrip.com/html5/you/foods/suzhou11/5123655.html",
    },
    {
      group: "餐厅口碑",
      title: "赵元章肉骨烧：山塘街的甜咸肉骨",
      publisher: "百度",
      date: "2025-04-22",
      url: "https://mbd.baidu.com/newspage/data/dtlandingsuper?from=2001k&nid=dt_4033855743606700414",
    },
    {
      group: "餐厅口碑",
      title: "悦山府 8 号：李公堤湖景与 120 条点评",
      publisher: "携程",
      date: "2024-08-01",
      url: "https://m.ctrip.com/webapp/you/tripshoot/paipai/detail/detail?articleId=69040231",
    },
    {
      group: "餐厅口碑",
      title: "江南雅厨：李公堤苏帮菜人均 200",
      publisher: "搜狐",
      date: "2026-03-12",
      url: "https://m.sohu.com/a/995446167_122621662/",
    },
    {
      group: "餐厅口碑",
      title: "苏堤·花漾：李公堤湖景 Bistro",
      publisher: "百度",
      date: "2025-02-12",
      url: "https://mbd.baidu.com/newspage/data/dtlandingsuper?nid=dt_4381196753774508611&from=2001k",
    },
    {
      group: "交通与地图",
      title: "山塘街游船票价与线路",
      publisher: "去哪儿",
      date: "2026-08-04",
      url: "https://touch.piao.qunar.com/ticket/detail_2086978906.html",
    },
    {
      group: "交通与地图",
      title: "苏州平江路/山塘/金鸡湖 citywalk 路线",
      publisher: "大众点评 UGC",
      date: "2026-03-08",
      url: "https://m.dianping.com/ugcdetail/334062251?bizType=29",
    },
  ];

  const presets = {
    couple: {
      id: "couple",
      name: "默认 · 情侣漫游",
      desc: "园林 + 水巷 + 湖上日落",
      pace: "relaxed",
      food: "classic",
      experiences: ["boat", "pingtan", "sunset"],
      rainy: false,
    },
    photo: {
      id: "photo",
      name: "出片优先",
      desc: "汉服 + 园林框景 + 蓝调时刻",
      pace: "balanced",
      food: "classic",
      experiences: ["hanfu", "boat", "pingtan", "sunset"],
      rainy: false,
    },
    foodie: {
      id: "foodie",
      name: "吃货专线",
      desc: "老字号 + 市井小吃 + 湖景晚餐",
      pace: "relaxed",
      food: "local",
      experiences: ["boat", "market", "sunset"],
      rainy: false,
    },
    rainy: {
      id: "rainy",
      name: "雨天备选",
      desc: "博物馆 + 评弹 + 书店 + 湖景",
      pace: "relaxed",
      food: "splurge",
      experiences: ["pingtan"],
      rainy: true,
    },
  };

  window.GUSU_DATA = {
    meta,
    spots: spots.map(withLinks),
    foods: [...foods, ...(Array.isArray(window.GUSU_EXTRA_FOODS) ? window.GUSU_EXTRA_FOODS : [])].map(withLinks),
    experiences: experiences.map(withLinks),
    sources,
    presets,
  };
})();
