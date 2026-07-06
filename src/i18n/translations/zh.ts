import type { Translations } from '../types'

export const zh: Translations = {
  meta: {
    title: 'BeatTraffic KL',
    description: '马来西亚线路感知交通智能 — 智能路线规划、拥挤预测与离线地图。',
  },
  nav: {
    planner: '路线规划',
    lineIntelligence: '线路智能',
    architecture: '系统架构',
    roadmap: '发展路线',
    signIn: '登录',
    logout: '退出',
    admin: '管理',
  },
  liveTicker: {
    liveNetwork: '实时网络',
    dataComingSoon: '数据即将上线',
    wait: '等待',
  },
  hero: {
    badge: '超越 Moovit 的马来西亚交通智能',
    headlinePrefix: 'BeatTraffic KL —',
    headlineHighlight: '线路感知交通',
    headlineSuffix: '真正带您到达目的地。',
    subtitle:
      '基于 OpenStreetMap + MapLibre + GTFS 的智能路线规划、拥挤预测与离线导航。每条线路都有专属的 AI 优势，让您更快、更轻松抵达。',
    planRoute: '规划路线',
    exploreMap: '探索实时地图',
    crowdPulse: 'AI 拥挤指数',
    calm: '畅通',
    offlineNote: '离线导航 + 雪兰莪谷 4.5 万个缓存 POI。重新联网后自动同步。',
    pulseLines: [
      { name: 'MRT 布城线', label: '可靠性', metric: 96, suffix: '%' },
      { name: 'LRT 格拉那再也线', label: '拥挤度', metric: 4, suffix: '/10' },
      { name: 'LRT3 莎阿南线', label: '换乘', metric: 3, suffix: ' 枢纽' },
    ],
  },
  tabs: {
    planner: '路线规划',
    tickets: '我的车票',
    scanner: '二维码扫描',
    assistant: '通勤 AI',
  },
  highlights: [
    {
      title: '智能路线规划',
      description: 'GTFS 实时到站 + 最快换乘',
    },
    {
      title: '线路功能引擎',
      description: '按线路 USP 动态 UI',
    },
    {
      title: '离线缓存',
      description: '无信号区域也能查路线和车站',
    },
  ],
  features: {
    badge: '与众不同',
    title: '为什么 BeatTraffic KL 超越 Moovit',
    subtitle: '线路感知智能意味着每条线路表现不同 — 您的体验也独一无二。',
    items: [
      {
        title: '实时追踪',
        description: '精准的实时到站与离站信息，再也不会错过列车。',
      },
      {
        title: '电子票务',
        description: '一键 QR 车票、自动充值和雪兰莪谷通勤者专属票价上限。',
      },
      {
        title: '安全优先',
        description: '警报、事件聚集分析和深夜出行安全步行指引。',
      },
    ],
  },
  lines: {
    title: '线路感知智能',
    subtitle: '每条吉隆坡铁路线路都配备专属 USP 和针对马来西亚通勤痛点定制的 UI 模式。',
    badgeNew: '新开通',
    badgeComingSoon: '即将上线',
    items: [
      {
        name: 'MRT 布城线（黄线）',
        usp: '速度与可靠性预测',
        detail: '预测快速通道窗口和最佳换乘组合。',
      },
      {
        name: 'MRT 加影线',
        usp: '速度与可靠性预测',
        detail: '根据时段优化跨城可靠性加速建议。',
      },
      {
        name: 'LRT 安邦线',
        usp: '延误应急模式',
        detail: '自动改道、巴士接驳和分线警报。',
      },
      {
        name: 'LRT 大城堡线',
        usp: '延误应急模式',
        detail: '突出显示安全换乘和站台停留时间预测。',
      },
      {
        name: 'LRT 格拉那再也线',
        usp: '拥挤热力图与车厢负载',
        detail: '车厢级载客量和站台拥挤热力图。',
      },
      {
        name: 'KL 单轨铁路',
        usp: '游客与短途优化',
        detail: '景点评分和短途最后一公里建议。',
      },
      {
        name: 'KTM 通勤铁路',
        usp: '长途可靠性与座位查找',
        detail: '座位概率预测和换乘缓冲时间。',
      },
      {
        name: 'LRT3 莎阿南线',
        usp: '西部走廊换乘枢纽',
        detail:
          '37.8 公里、20 个车站，从 Bandar Utama 至 Johan Setia — 2026 年 6 月开通。在 Glenmarie 2（格拉那再也线）、Bandar Utama（加影线）智能换乘，Jambatan Kota 可步行接驳 KTM。',
      },
    ],
  },
  architecture: {
    title: '生产级架构',
    subtitle: '模块化后端、实时数据源和离线优先移动技术栈，为规模化而生。',
    sections: [
      {
        title: '移动应用',
        items: ['React Native (Expo)', '智能路线规划', '离线缓存', '警报与拥挤度'],
      },
      {
        title: '后端',
        items: ['Node.js 编排', 'OpenTripPlanner (OTP)', '线路功能规则引擎', 'GTFS + GTFS-RT'],
      },
      {
        title: '实时数据源',
        items: ['MRT Corp 数据', 'RapidKL 警报', '众包报告', '车站 IoT 信号'],
      },
      {
        title: '数据层',
        items: ['PostgreSQL', 'Redis 热路径', '分析数据仓库', '地理索引瓦片'],
      },
    ],
  },
  roadmap: {
    title: '提升应用',
    subtitle: 'AI 拥挤预测、离线导航、LRT3 深度集成和逐州扩展已在路线图中。',
    items: [
      {
        title: 'AI 拥挤预测',
        detail: '融合客流历史、活动和天气，提前 30 分钟预测车厢负载。',
      },
      {
        title: '离线导航',
        detail: '存储 GTFS 片段和步行图，无数据时也能可靠导航。',
      },
      {
        title: 'LRT3 深度集成',
        detail: '莎阿南线已开通，我们正在接入完整 GTFS-RT、票价表和 5 个即将建成的填充站（预计约 2028 年）。',
      },
      {
        title: '逐州扩展',
        detail: '柔佛 → 槟城 → 砂拉越，配备本地化运营商数据和票价规则。',
      },
    ],
  },
  footer: {
    tagline: '为战胜拥堵、减少等待时间、以线路感知智能推动马来西亚前行而打造。',
    quickLinks: '快速链接',
    helpSupport: '帮助与支持',
    mobileApp: '移动应用',
    mobileAppDesc: '体验吉隆坡交通的未来。立即下载我们的移动应用。',
    appStore: '在 App Store 下载',
    googlePlay: '在 Google Play 下载',
    copyright: '为更智慧的马来西亚而建。',
    links: {
      journeyPlanner: '行程规划',
      ticketPrices: '票价',
      lineMap: '线路图',
      feedback: '反馈',
      contact: '联系我们',
      terms: '服务条款',
      privacy: '隐私政策',
      faq: '常见问题',
    },
  },
}
