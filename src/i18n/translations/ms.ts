import type { Translations } from '../types'

export const ms: Translations = {
  meta: {
    title: 'BeatTraffic KL',
    description:
      'Kepintaran transit mengikut laluan untuk Malaysia — perancangan laluan pintar, ramalan kesesakan, dan peta luar talian.',
  },
  nav: {
    planner: 'Perancang',
    lineIntelligence: 'Kepintaran Laluan',
    architecture: 'Seni Bina',
    roadmap: 'Pelan Masa Depan',
    signIn: 'Log Masuk',
    logout: 'Log Keluar',
    admin: 'Admin',
  },
  liveTicker: {
    liveNetwork: 'Rangkaian Langsung',
    dataComingSoon: 'data akan datang',
    wait: 'tunggu',
  },
  hero: {
    badge: 'Kepintaran transit yang mengatasi Moovit untuk Malaysia',
    headlinePrefix: 'BeatTraffic KL —',
    headlineHighlight: 'transit mengikut laluan',
    headlineSuffix: 'yang benar-benar membawa anda ke destinasi.',
    subtitle:
      'Perancangan laluan pintar, ramalan kesesakan, dan navigasi luar talian berasaskan OpenStreetMap + MapLibre + GTFS. Setiap laluan mempunyai kelebihan AI tersendiri supaya anda tiba lebih cepat dan kurang tertekan.',
    planRoute: 'Rancang laluan',
    exploreMap: 'Terokai peta langsung',
    crowdPulse: 'Denyut Kesesakan AI',
    calm: 'tenang',
    offlineNote:
      'Navigasi luar talian + 45k POI cache di Lembah Klang. Disegerakkan apabila anda bersambung semula.',
    pulseLines: [
      { name: 'MRT Putrajaya', label: 'Kebolehpercayaan', metric: 96, suffix: '%' },
      { name: 'LRT Kelana Jaya', label: 'Kesesakan', metric: 4, suffix: '/10' },
      { name: 'LRT3 Shah Alam', label: 'Pertukaran', metric: 3, suffix: ' hab' },
    ],
  },
  tabs: {
    planner: 'Perancang Laluan',
    tickets: 'Tiket Saya',
    scanner: 'Pengimbas QR',
    assistant: 'AI Komuter',
  },
  highlights: [
    {
      title: 'Perancang Laluan Pintar',
      description: 'ETA GTFS + pertukaran terpantas',
    },
    {
      title: 'Enjin Ciri Laluan',
      description: 'UI dinamik mengikut USP setiap laluan',
    },
    {
      title: 'Cache Luar Talian',
      description: 'Laluan + stesen disimpan untuk zon tanpa isyarat',
    },
  ],
  features: {
    badge: 'Mengapa Ia Berbeza',
    title: 'Mengapa BeatTraffic KL Mengatasi Moovit',
    subtitle:
      'Kepintaran mengikut laluan bermakna setiap laluan berkelakuan berbeza — begitu juga pengalaman anda.',
    items: [
      {
        title: 'Penjejakan Masa Nyata',
        description: 'Jangan terlepas kereta dengan maklumat ketibaan dan berlepas masa nyata yang tepat.',
      },
      {
        title: 'Tiket Digital',
        description: 'Satu ketikan untuk tiket QR, tambah nilai automatik, dan had tambang untuk komuter Lembah Klang.',
      },
      {
        title: 'Keselamatan Diutamakan',
        description: 'Amaran, kluster insiden, dan panduan berjalan selamat untuk perjalanan lewat malam.',
      },
    ],
  },
  lines: {
    title: 'Kepintaran Mengikut Laluan',
    subtitle:
      'Setiap laluan rel KL dilengkapi USP khusus dan mod UI yang disesuaikan dengan masalah komuter Malaysia.',
    badgeNew: 'Baharu',
    badgeComingSoon: 'Akan Datang',
    items: [
      {
        name: 'Laluan MRT Putrajaya (Kuning)',
        usp: 'Ramalan Kelajuan & Kebolehpercayaan',
        detail: 'Meramalkan tetingkap laluan pantas dan kombinasi pertukaran terbaik.',
      },
      {
        name: 'Laluan MRT Kajang',
        usp: 'Ramalan Kelajuan & Kebolehpercayaan',
        detail: 'Mengoptimumkan kebolehpercayaan merentas bandar dengan petua pecutan mengikut waktu.',
      },
      {
        name: 'Laluan LRT Ampang',
        usp: 'Mod Survival Kelewatan',
        detail: 'Laluan semula automatik dengan jambatan bas dan amaran pecahan laluan.',
      },
      {
        name: 'Laluan LRT Sri Petaling',
        usp: 'Mod Survival Kelewatan',
        detail: 'Menonjolkan pertukaran selamat semasa gangguan dan ramalan masa menunggu di platform.',
      },
      {
        name: 'Laluan LRT Kelana Jaya',
        usp: 'Peta Haba Kesesakan & Muatan Gerabak',
        detail: 'Pengisian per gerabak dan peta haba kesesakan platform.',
      },
      {
        name: 'Monorel KL',
        usp: 'Pengoptimum Pelancong & Perjalanan Pendek',
        detail: 'Skor tarikan pelancongan dan cadangan last-mile untuk perjalanan pendek.',
      },
      {
        name: 'KTM Komuter',
        usp: 'Kebolehpercayaan Jarak Jauh & Pencari Tempat Duduk',
        detail: 'Ramalan kebarangkalian tempat duduk dan penimbalan masa pertukaran.',
      },
      {
        name: 'Laluan LRT3 Shah Alam',
        usp: 'Penghubung Koridor Barat',
        detail:
          '37.8 km, 20 stesen dari Bandar Utama ke Johan Setia — beroperasi sejak Jun 2026. Laluan pertukaran pintar di Glenmarie 2 (Kelana Jaya), Bandar Utama (MRT Kajang), dan sambungan berjalan ke KTM di Jambatan Kota.',
      },
    ],
  },
  architecture: {
    title: 'Seni Bina Sedia Pengeluaran',
    subtitle: 'Dibina untuk skala dengan backend modular, sumber masa nyata, dan stack mudah alih luar talian.',
    sections: [
      {
        title: 'Aplikasi Mudah Alih',
        items: ['React Native (Expo)', 'Perancang Laluan Pintar', 'Cache Luar Talian', 'Amaran & Kesesakan'],
      },
      {
        title: 'Backend',
        items: ['Orkestrasi Node.js', 'OpenTripPlanner (OTP)', 'Enjin Peraturan Ciri Laluan', 'GTFS + GTFS-RT'],
      },
      {
        title: 'Sumber Masa Nyata',
        items: ['Suapan MRT Corp', 'Amaran RapidKL', 'Laporan orang ramai', 'Isyarat IoT stesen'],
      },
      {
        title: 'Lapisan Data',
        items: ['PostgreSQL', 'Redis untuk laluan panas', 'Gudang analitik', 'Jubin geo-berindeks'],
      },
    ],
  },
  roadmap: {
    title: 'Tingkatkan Aplikasi',
    subtitle:
      'Ramalan kesesakan AI, navigasi luar talian, integrasi mendalam LRT3, dan pengembangan negeri demi negeri sudah dirancang.',
    items: [
      {
        title: 'Ramalan Kesesakan AI',
        detail: 'Menggabungkan sejarah penumpang, acara, dan cuaca untuk meramalkan muatan gerabak 30 minit lebih awal.',
      },
      {
        title: 'Navigasi Luar Talian',
        detail: 'Simpan fragmen GTFS + graf berjalan untuk navigasi boleh dipercayai tanpa data.',
      },
      {
        title: 'Integrasi Mendalam LRT3',
        detail:
          'Memandangkan Laluan Shah Alam sudah beroperasi, kami sedang menyambung GTFS-RT penuh, jadual tambang, dan lima stesen infill akan datang (jangkaan ~2028).',
      },
      {
        title: 'Pengembangan Negeri demi Negeri',
        detail: 'Johor → Pulau Pinang → Sarawak dengan suapan pengendali dan peraturan tambang tempatan.',
      },
    ],
  },
  footer: {
    tagline:
      'Dibina untuk mengatasi kesesakan, mengurangkan masa menunggu, dan memastikan Malaysia terus bergerak dengan kepintaran mengikut laluan.',
    quickLinks: 'Pautan Pantas',
    helpSupport: 'Bantuan & Sokongan',
    mobileApp: 'Aplikasi Mudah Alih',
    mobileAppDesc: 'Alami masa depan transit KL. Muat turun aplikasi mudah alih kami hari ini.',
    appStore: 'Dapatkan di App Store',
    googlePlay: 'Dapatkan di Google Play',
    copyright: 'Dibina untuk Malaysia yang lebih pintar.',
    links: {
      journeyPlanner: 'Perancang Perjalanan',
      ticketPrices: 'Harga Tiket',
      lineMap: 'Peta Laluan',
      feedback: 'Maklum Balas',
      contact: 'Hubungi Kami',
      terms: 'Terma Perkhidmatan',
      privacy: 'Dasar Privasi',
      faq: 'Soalan Lazim',
    },
  },
}
