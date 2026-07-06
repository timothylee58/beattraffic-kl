export type Locale = 'en' | 'ms' | 'zh'

export const LOCALES: { code: Locale; label: string; native: string }[] = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'ms', label: 'Malay', native: 'Bahasa Melayu' },
  { code: 'zh', label: 'Chinese', native: '中文' },
]

export interface LineTranslation {
  name: string
  usp: string
  detail: string
}

export interface Translations {
  meta: {
    title: string
    brandName: string
    description: string
  }
  nav: {
    planner: string
    lineIntelligence: string
    architecture: string
    roadmap: string
    signIn: string
    logout: string
    admin: string
  }
  liveTicker: {
    liveNetwork: string
    dataComingSoon: string
    wait: string
  }
  hero: {
    badge: string
    headlinePrefix: string
    headlineHighlight: string
    headlineSuffix: string
    subtitle: string
    planRoute: string
    exploreMap: string
    crowdPulse: string
    calm: string
    offlineNote: string
    pulseLines: {
      name: string
      label: string
      metric: number
      suffix: string
    }[]
  }
  tabs: {
    planner: string
    tickets: string
    scanner: string
    assistant: string
  }
  scanner: {
    title: string
    subtitle: string
    qrTab: string
    ocrTab: string
    qrHint: string
    ocrHint: string
    scanCamera: string
    cameraUnsupported: string
    enterCode: string
    captureSign: string
    uploadImage: string
    runOcr: string
    qrAlign: string
    ocrAlign: string
    cancel: string
    manualPlaceholder: string
    validate: string
    validating: string
    ocrProcessing: string
    validTicket: string
    ocrComplete: string
    failed: string
    ticketId: string
    from: string
    to: string
    fare: string
    askAi: string
    scanAnother: string
    tryAgain: string
    signInHint: string
    cameraDenied: string
    ticketNotFound: string
    validationFailed: string
    ocrFailed: string
  }
  agent: {
    title: string
    subtitle: string
    signInPrompt: string
    scanContext: string
    clearScans: string
    emptyState: string
    inputPlaceholder: string
  }
  highlights: {
    title: string
    description: string
  }[]
  features: {
    badge: string
    title: string
    subtitle: string
    items: { title: string; description: string }[]
  }
  lines: {
    title: string
    subtitle: string
    badgeNew: string
    badgeComingSoon: string
    items: LineTranslation[]
  }
  architecture: {
    title: string
    subtitle: string
    sections: { title: string; items: string[] }[]
  }
  roadmap: {
    title: string
    subtitle: string
    items: { title: string; detail: string }[]
  }
  footer: {
    tagline: string
    quickLinks: string
    helpSupport: string
    mobileApp: string
    mobileAppDesc: string
    appStore: string
    googlePlay: string
    copyright: string
    links: {
      journeyPlanner: string
      ticketPrices: string
      lineMap: string
      feedback: string
      contact: string
      terms: string
      privacy: string
      faq: string
    }
  }
}
