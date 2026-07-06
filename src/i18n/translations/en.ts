import type { Translations } from './types'

export const en: Translations = {
  meta: {
    title: 'BeatTraffic KL',
    description: 'Line-aware transit intelligence for Malaysia — smart routing, crowd prediction, and offline maps.',
  },
  nav: {
    planner: 'Planner',
    lineIntelligence: 'Line Intelligence',
    architecture: 'Architecture',
    roadmap: 'Roadmap',
    signIn: 'Sign In',
    logout: 'Logout',
    admin: 'Admin',
  },
  liveTicker: {
    liveNetwork: 'Live Network',
    dataComingSoon: 'data coming soon',
    wait: 'wait',
  },
  hero: {
    badge: 'Moovit-beating intelligence for Malaysia',
    headlinePrefix: 'BeatTraffic KL —',
    headlineHighlight: 'line-aware transit',
    headlineSuffix: 'that actually gets you there.',
    subtitle:
      'Smart route planning, crowd prediction, and offline routing built on OpenStreetMap + MapLibre + GTFS. Every line has its own AI-driven advantage so you arrive faster and less stressed.',
    planRoute: 'Plan a route',
    exploreMap: 'Explore live map',
    crowdPulse: 'AI Crowd Pulse',
    calm: 'calm',
    offlineNote: 'Offline-ready routing + 45k cached POIs across Klang Valley. Syncs when you reconnect.',
    pulseLines: [
      { name: 'MRT Putrajaya', label: 'Reliability', metric: 96, suffix: '%' },
      { name: 'LRT Kelana Jaya', label: 'Crowd', metric: 4, suffix: '/10' },
      { name: 'LRT3 Shah Alam', label: 'Interchange', metric: 3, suffix: ' hubs' },
    ],
  },
  tabs: {
    planner: 'Route Planner',
    tickets: 'My Tickets',
    scanner: 'QR Scanner',
    assistant: 'Commute AI',
  },
  highlights: [
    {
      title: 'Smart Route Planner',
      description: 'GTFS-aware ETA + fastest transfers',
    },
    {
      title: 'Line Feature Engine',
      description: 'Dynamic UI per line USP',
    },
    {
      title: 'Offline Cache',
      description: 'Routes + stations stored for no-signal zones',
    },
  ],
  features: {
    badge: "Why It's Different",
    title: 'Why BeatTraffic KL Beats Moovit',
    subtitle: 'Line-aware intelligence means every line behaves differently — and so does the experience.',
    items: [
      {
        title: 'Real-time Tracking',
        description: 'Never miss a train with precise real-time arrival and departure information.',
      },
      {
        title: 'Digital Ticketing',
        description: 'One tap for QR tickets, auto top-up, and fare caps tailored to Klang Valley commuters.',
      },
      {
        title: 'Safety First',
        description: 'Alerts, incident clusters, and safe-walk guidance for late-night trips.',
      },
    ],
  },
  lines: {
    title: 'Line-Aware Intelligence',
    subtitle:
      'Every KL rail line ships with a dedicated USP and UI mode tuned for Malaysia-specific commuter pain points.',
    badgeNew: 'New',
    badgeComingSoon: 'Coming Soon',
    items: [
      {
        name: 'MRT Putrajaya Line (Yellow)',
        usp: 'Speed & Reliability Predictor',
        detail: 'Predicts fast-track windows and best transfer combos.',
      },
      {
        name: 'MRT Kajang Line',
        usp: 'Speed & Reliability Predictor',
        detail: 'Optimizes cross-city reliability with time-of-day acceleration tips.',
      },
      {
        name: 'LRT Ampang Line',
        usp: 'Delay Survival Mode',
        detail: 'Auto-reroutes with bus bridges and split-line alerts.',
      },
      {
        name: 'LRT Sri Petaling Line',
        usp: 'Delay Survival Mode',
        detail: 'Highlights disruption-safe transfers and platform dwell forecasts.',
      },
      {
        name: 'LRT Kelana Jaya Line',
        usp: 'Crowd Heatmap & Coach Load',
        detail: 'Coach-level occupancy and platform crowd heatmaps.',
      },
      {
        name: 'KL Monorail',
        usp: 'Tourist & Short-Hop Optimizer',
        detail: 'Attraction scoring and short-hop last-mile nudges.',
      },
      {
        name: 'KTM Komuter',
        usp: 'Long-Distance Reliability & Seat Finder',
        detail: 'Seat probability prediction and transfer buffering.',
      },
      {
        name: 'LRT3 Shah Alam Line',
        usp: 'Western Corridor Hub Connector',
        detail:
          '37.8 km, 20 stations from Bandar Utama to Johan Setia — live since June 2026. Smart interchange routing at Glenmarie 2 (Kelana Jaya), Bandar Utama (MRT Kajang), and KTM walk at Jambatan Kota.',
      },
    ],
  },
  architecture: {
    title: 'Production-Ready Architecture',
    subtitle: 'Built for scale with a modular backend, realtime sources, and offline-first mobile stack.',
    sections: [
      {
        title: 'Mobile App',
        items: ['React Native (Expo)', 'Smart Route Planner', 'Offline Cache', 'Alerts & Crowding'],
      },
      {
        title: 'Backend',
        items: ['Node.js orchestration', 'OpenTripPlanner (OTP)', 'Line Feature Rules Engine', 'GTFS + GTFS-RT'],
      },
      {
        title: 'Realtime Sources',
        items: ['MRT Corp feeds', 'RapidKL alerts', 'Crowdsourced reports', 'IoT station signals'],
      },
      {
        title: 'Data Layer',
        items: ['PostgreSQL', 'Redis for hot paths', 'Analytics warehouse', 'Geo-indexed tiles'],
      },
    ],
  },
  roadmap: {
    title: 'Elevate the App',
    subtitle:
      'AI crowd prediction, offline routing, LRT3 deep integration, and state-by-state expansion already mapped on the roadmap.',
    items: [
      {
        title: 'AI Crowd Prediction',
        detail: 'Blends ridership history, events, and weather to forecast coach load 30 minutes ahead.',
      },
      {
        title: 'Offline Routing',
        detail: 'Store GTFS fragments + walking graphs for reliable routing even without data.',
      },
      {
        title: 'LRT3 Deep Integration',
        detail:
          'Now that the Shah Alam Line is live, we are wiring full GTFS-RT, fare tables, and the five upcoming infill stations (expected ~2028).',
      },
      {
        title: 'State-by-State Expansion',
        detail: 'Johor → Penang → Sarawak with localized operator feeds and fare rules.',
      },
    ],
  },
  footer: {
    tagline: 'Built to outsmart congestion, reduce wait times, and keep Malaysia moving with line-aware intelligence.',
    quickLinks: 'Quick Links',
    helpSupport: 'Help & Support',
    mobileApp: 'Mobile App',
    mobileAppDesc: 'Experience the future of KL transit. Download our mobile app today.',
    appStore: 'Get it on App Store',
    googlePlay: 'Get it on Google Play',
    copyright: 'Built for a smarter Malaysia.',
    links: {
      journeyPlanner: 'Journey Planner',
      ticketPrices: 'Ticket Prices',
      lineMap: 'Line Map',
      feedback: 'Feedback',
      contact: 'Contact Us',
      terms: 'Terms of Service',
      privacy: 'Privacy Policy',
      faq: 'FAQ',
    },
  },
}
