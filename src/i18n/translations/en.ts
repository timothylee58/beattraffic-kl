import type { Translations } from './types'

export const en: Translations = {
  meta: {
    title: 'Beat KL traffic',
    brandName: 'Beat KL traffic',
    description:
      'Beat KL traffic — smart transit for Klang Valley. Plan faster routes, skip the jam, and get more cars off the road.',
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
    badge: 'Alleviating Klang Valley traffic, one smarter route at a time',
    headlinePrefix: 'Beat KL traffic —',
    headlineHighlight: 'beat the jam',
    headlineSuffix: 'with line-aware transit across the Valley.',
    subtitle:
      'Our goal is to get more commuters off congested roads in Klang Valley. Smart route planning, crowd prediction, and offline routing on OpenStreetMap + MapLibre + GTFS — so you choose trains and buses that are actually faster than sitting in traffic.',
    planRoute: 'Plan a route',
    exploreMap: 'Explore live map',
    crowdPulse: 'AI Crowd Pulse',
    calm: 'calm',
    offlineNote: 'Offline-ready routing + 45k cached POIs across Klang Valley. Fewer wrong turns, less time stuck in jams.',
    pulseLines: [
      { name: 'MRT Putrajaya', label: 'Reliability', metric: 96, suffix: '%' },
      { name: 'LRT Kelana Jaya', label: 'Crowd', metric: 4, suffix: '/10' },
      { name: 'LRT3 Shah Alam', label: 'Interchange', metric: 3, suffix: ' hubs' },
    ],
  },
  tabs: {
    planner: 'Route Planner',
    tickets: 'My Tickets',
    scanner: 'Scan & OCR',
    assistant: 'Commute AI',
    commutes: 'Saved Commutes',
    passport: 'Passport',
    heatmap: 'Crowd Map',
    getoff: 'Get-Off Alert',
    leaderboard: 'Leaderboard',
  },
  scanner: {
    title: 'Scan & OCR Hub',
    subtitle: 'Scan QR tickets or read station signs, timetables, and fare boards — then ask the AI agent.',
    qrTab: 'QR Ticket',
    ocrTab: 'OCR Vision',
    qrHint: 'Point your camera at a Beat KL traffic ticket QR code',
    ocrHint: 'Photograph a station sign, timetable, fare board, or paper ticket — AI extracts the text.',
    scanCamera: 'Scan via Camera',
    cameraUnsupported: 'Camera not supported',
    enterCode: 'Enter Code',
    captureSign: 'Capture Sign',
    uploadImage: 'Upload Image',
    runOcr: 'Run OCR',
    qrAlign: 'Align QR code within the frame',
    ocrAlign: 'Frame the sign or timetable, then tap Run OCR',
    cancel: 'Cancel',
    manualPlaceholder: 'e.g. RAPIDKL-T-A1B2C3-KJ16-MR6',
    validate: 'Validate',
    validating: 'Validating ticket…',
    ocrProcessing: 'Reading image with AI vision…',
    validTicket: 'Valid Ticket',
    ocrComplete: 'Text extracted',
    failed: 'Scan failed',
    ticketId: 'Ticket ID',
    from: 'From',
    to: 'To',
    fare: 'Fare',
    askAi: 'Ask Commute AI',
    scanAnother: 'Scan Another',
    tryAgain: 'Try Again',
    signInHint: 'Sign in to validate tickets against your account.',
    cameraDenied: 'Camera access denied. Use manual input or upload instead.',
    ticketNotFound: 'No ticket found for this QR code.',
    validationFailed: 'Validation failed. Please try again.',
    ocrFailed: 'OCR failed. Try a clearer photo or better lighting.',
  },
  agent: {
    title: 'Commute AI Agent',
    subtitle: 'Line-aware answers for Klang Valley — powered by your scans and live transit data.',
    signInPrompt: 'Sign in to chat with the AI agent and get personalised jam-beating routes.',
    scanContext: 'Paired scans',
    clearScans: 'Clear',
    emptyState: 'Ask about routes, delays, or your latest scan. Quick prompts below:',
    inputPlaceholder: 'Ask how to beat the jam…',
    ragSources: 'Grounded in',
    ragFirebase: 'Firebase RAG',
    ragLocal: 'Local knowledge',
  },
  highlights: [
    {
      title: 'Jam-Aware Route Planner',
      description: 'GTFS-aware ETA + routes that dodge peak congestion',
    },
    {
      title: 'Line Feature Engine',
      description: 'Dynamic UI per line to keep you moving',
    },
    {
      title: 'Offline Cache',
      description: 'Routes + stations stored for no-signal zones',
    },
  ],
  features: {
    badge: 'Our Mission',
    title: 'Why Beat KL traffic fights congestion',
    subtitle:
      'Every minute on a packed highway is a minute we want to give back. Line-aware intelligence helps Klang Valley commuters switch to transit that actually wins against the jam.',
    items: [
      {
        title: 'Real-time Tracking',
        description: 'Arrive at the platform right on time — no extra waiting in traffic or on the concourse.',
      },
      {
        title: 'Digital Ticketing',
        description: 'One tap for QR tickets so boarding is faster and car parks stay emptier.',
      },
      {
        title: 'Safety First',
        description: 'Alerts, incident clusters, and safe-walk guidance for reliable late-night alternatives to driving.',
      },
    ],
  },
  lines: {
    title: 'Line-Aware Intelligence',
    subtitle:
      'Every Klang Valley rail line tuned to move people off roads and through the network faster — with Malaysia-specific commuter pain points in mind.',
    badgeNew: 'New',
    badgeComingSoon: 'Coming Soon',
    items: [
      {
        name: 'MRT Putrajaya Line (Yellow)',
        usp: 'Speed & Reliability Predictor',
        detail: 'Predicts fast-track windows and best transfer combos to skip road bottlenecks.',
      },
      {
        name: 'MRT Kajang Line',
        usp: 'Speed & Reliability Predictor',
        detail: 'Cross-city reliability tips that beat peak-hour highway delays.',
      },
      {
        name: 'LRT Ampang Line',
        usp: 'Delay Survival Mode',
        detail: 'Auto-reroutes with bus bridges when the jam spills onto your usual route.',
      },
      {
        name: 'LRT Sri Petaling Line',
        usp: 'Delay Survival Mode',
        detail: 'Disruption-safe transfers so you are not forced back into traffic.',
      },
      {
        name: 'LRT Kelana Jaya Line',
        usp: 'Crowd Heatmap & Coach Load',
        detail: 'Pick less crowded coaches and platforms — smoother flow, less dwell time.',
      },
      {
        name: 'KL Monorail',
        usp: 'Tourist & Short-Hop Optimizer',
        detail: 'Short-hop trips that replace last-mile drives through busy streets.',
      },
      {
        name: 'KTM Komuter',
        usp: 'Long-Distance Reliability & Seat Finder',
        detail: 'Seat probability and transfer buffering for reliable suburban commutes without the car.',
      },
      {
        name: 'LRT3 Shah Alam Line',
        usp: 'Western Corridor Hub Connector',
        detail:
          '37.8 km, 20 stations from Bandar Utama to Johan Setia — live since June 2026. Opens the western corridor so fewer drivers clog the Federal Highway.',
      },
    ],
  },
  architecture: {
    title: 'Production-Ready Architecture',
    subtitle: 'Built to scale real-time congestion relief across Klang Valley with modular backend and offline-first mobile.',
    sections: [
      {
        title: 'Mobile App',
        items: ['React Native (Expo)', 'Jam-Aware Route Planner', 'Offline Cache', 'Alerts & Crowding'],
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
    title: 'Clearer Roads Ahead',
    subtitle:
      'AI crowd prediction, offline routing, LRT3 deep integration, and wider coverage — all aimed at pulling more cars off Klang Valley highways.',
    items: [
      {
        title: 'AI Crowd Prediction',
        detail: 'Forecast coach load 30 minutes ahead so commuters spread out instead of bunching on roads and platforms.',
      },
      {
        title: 'Offline Routing',
        detail: 'Reliable routing without data — still beats sitting in a stationary jam.',
      },
      {
        title: 'LRT3 Deep Integration',
        detail:
          'Full GTFS-RT and fare tables for the new Shah Alam Line, plus five infill stations (~2028) to widen the car-free corridor.',
      },
      {
        title: 'State-by-State Expansion',
        detail: 'Johor → Penang → Sarawak — the same traffic-busting playbook beyond Klang Valley.',
      },
    ],
  },
  footer: {
    tagline:
      'Our aim: alleviate traffic jams across Klang Valley by making public transit the faster, easier choice.',
    quickLinks: 'Quick Links',
    helpSupport: 'Help & Support',
    mobileApp: 'Mobile App',
    mobileAppDesc: 'Beat the jam from your phone. Download Beat KL traffic today.',
    appStore: 'Get it on App Store',
    googlePlay: 'Get it on Google Play',
    copyright: 'Clearer roads for Klang Valley.',
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
