import type { Translations } from '../types'

export const zh: Translations = {
  meta: {
    title: 'Beat KL traffic',
    brandName: 'Beat KL traffic',
    description: 'Beat KL traffic — 巴生谷智能交通。规划更快路线，避开车辆拥堵，让更多汽车驶离道路。',
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
    badge: '缓解巴生谷车辆拥堵，一次一条更智能的路线',
    headlinePrefix: 'Beat KL traffic —',
    headlineHighlight: '缓解车辆拥堵',
    headlineSuffix: '用线路感知交通覆盖整个巴生谷。',
    subtitle:
      '我们的目标：让更多巴生谷通勤者放下私家车。基于 OpenStreetMap + MapLibre + GTFS 的智能路线规划、拥挤预测与离线导航 — 帮您选择比堵在路上更快的列车和巴士。',
    planRoute: '规划路线',
    exploreMap: '探索实时地图',
    crowdPulse: 'AI 拥挤指数',
    calm: '畅通',
    offlineNote: '离线导航 + 巴生谷 4.5 万个缓存 POI。更少绕路，更少困在车辆拥堵中。',
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
      title: '拥堵感知路线规划',
      description: 'GTFS 实时到站 + 避开高峰拥堵的路线',
    },
    {
      title: '线路功能引擎',
      description: '按线路动态 UI，助您持续前行',
    },
    {
      title: '离线缓存',
      description: '无信号区域也能查路线和车站',
    },
  ],
  features: {
    badge: '我们的使命',
    title: '为什么 Beat KL traffic 能对抗车辆拥堵',
    subtitle:
      '高速公路上多堵一分钟，我们就想帮您夺回一分钟。线路感知智能帮助巴生谷通勤者转向真正胜过堵车的公共交通。',
    items: [
      {
        title: '实时追踪',
        description: '准时抵达站台 — 减少在路面或站厅空等的时间。',
      },
      {
        title: '电子票务',
        description: '一键 QR 车票，加快登车，让停车场更空。',
      },
      {
        title: '安全优先',
        description: '警报与安全步行指引，为深夜出行提供可靠的驾车替代方案。',
      },
    ],
  },
  lines: {
    title: '线路感知智能',
    subtitle: '每条巴生谷铁路线路都针对将人们从道路引向更快通行而优化。',
    badgeNew: '新开通',
    badgeComingSoon: '即将上线',
    items: [
      {
        name: 'MRT 布城线（黄线）',
        usp: '速度与可靠性预测',
        detail: '预测快速通道窗口和最佳换乘，避开道路瓶颈。',
      },
      {
        name: 'MRT 加影线',
        usp: '速度与可靠性预测',
        detail: '跨城可靠性建议，胜过高峰时段高速公路延误。',
      },
      {
        name: 'LRT 安邦线',
        usp: '延误应急模式',
        detail: '拥堵蔓延到常用路线时，自动改道并提供巴士接驳。',
      },
      {
        name: 'LRT 大城堡线',
        usp: '延误应急模式',
        detail: '中断期间的安全换乘，避免被迫回到路面堵车。',
      },
      {
        name: 'LRT 格拉那再也线',
        usp: '拥挤热力图与车厢负载',
        detail: '选择较空车厢和站台 — 流动更顺畅，停靠更短。',
      },
      {
        name: 'KL 单轨铁路',
        usp: '游客与短途优化',
        detail: '短途出行替代繁忙街道上的最后一公里驾车。',
      },
      {
        name: 'KTM 通勤铁路',
        usp: '长途可靠性与座位查找',
        detail: '座位概率与换乘缓冲，郊区通勤无需开车。',
      },
      {
        name: 'LRT3 莎阿南线',
        usp: '西部走廊换乘枢纽',
        detail:
          '37.8 公里、20 个车站，Bandar Utama 至 Johan Setia — 2026 年 6 月开通。打通西部走廊，减少联邦大道上的车流。',
      },
    ],
  },
  architecture: {
    title: '生产级架构',
    subtitle: '模块化后端与离线优先移动技术栈，为巴生谷实时缓解车辆拥堵而构建。',
    sections: [
      {
        title: '移动应用',
        items: ['React Native (Expo)', '拥堵感知路线规划', '离线缓存', '警报与拥挤度'],
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
    title: '更畅通的道路在前方',
    subtitle: 'AI 拥挤预测、离线导航、LRT3 深度集成与更广覆盖 — 目标是将更多汽车驶离巴生谷高速公路。',
    items: [
      {
        title: 'AI 拥挤预测',
        detail: '提前 30 分钟预测车厢负载，分散客流而非聚集在道路和站台上。',
      },
      {
        title: '离线导航',
        detail: '无数据时也能可靠导航 — 仍胜过原地堵车。',
      },
      {
        title: 'LRT3 深度集成',
        detail: '莎阿南线完整 GTFS-RT 与票价表，以及 5 个填充站（约 2028 年）以扩展无车走廊。',
      },
      {
        title: '逐州扩展',
        detail: '柔佛 → 槟城 → 砂拉越 — 将缓解车辆拥堵的策略推广到巴生谷以外。',
      },
    ],
  },
  footer: {
    tagline: '我们的目标：通过让公共交通更快、更方便，缓解巴生谷的车辆拥堵。',
    quickLinks: '快速链接',
    helpSupport: '帮助与支持',
    mobileApp: '移动应用',
    mobileAppDesc: '用手机缓解拥堵。立即下载 Beat KL traffic。',
    appStore: '在 App Store 下载',
    googlePlay: '在 Google Play 下载',
    copyright: '为更畅通的巴生谷道路而建。',
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
