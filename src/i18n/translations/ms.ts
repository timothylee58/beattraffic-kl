import type { Translations } from '../types'

export const ms: Translations = {
  meta: {
    title: 'Beat KL traffic',
    brandName: 'Beat KL traffic',
    description:
      'Beat KL traffic — transit pintar untuk Lembah Klang. Rancang laluan lebih pantas, elak kesesakan, dan kurangkan kereta di jalan raya.',
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
    badge: 'Mengurangkan kesesakan Lembah Klang, satu laluan pintar pada satu masa',
    headlinePrefix: 'Beat KL traffic —',
    headlineHighlight: 'atasi kesesakan',
    headlineSuffix: 'dengan transit mengikut laluan di seluruh Lembah Klang.',
    subtitle:
      'Matlamat kami: mengalihkan lebih ramai komuter daripada jalan sesak di Lembah Klang. Perancangan laluan pintar, ramalan kesesakan, dan navigasi luar talian pada OpenStreetMap + MapLibre + GTFS — supaya anda memilih kereta api dan bas yang lebih pantas daripada terperangkap dalam trafik.',
    planRoute: 'Rancang laluan',
    exploreMap: 'Terokai peta langsung',
    crowdPulse: 'Denyut Kesesakan AI',
    calm: 'tenang',
    offlineNote:
      'Navigasi luar talian + 45k POI cache di Lembah Klang. Kurang salah laluan, kurang masa terperangkap dalam kesesakan.',
    pulseLines: [
      { name: 'MRT Putrajaya', label: 'Kebolehpercayaan', metric: 96, suffix: '%' },
      { name: 'LRT Kelana Jaya', label: 'Kesesakan', metric: 4, suffix: '/10' },
      { name: 'LRT3 Shah Alam', label: 'Pertukaran', metric: 3, suffix: ' hab' },
    ],
  },
  tabs: {
    planner: 'Perancang Laluan',
    tickets: 'Tiket Saya',
    scanner: 'Imbas & OCR',
    assistant: 'AI Komuter',
  },
  scanner: {
    title: 'Hab Imbas & OCR',
    subtitle: 'Imbas tiket QR atau baca papan tanda stesen, jadual, dan tambang — kemudian tanya ejen AI.',
    qrTab: 'Tiket QR',
    ocrTab: 'Visi OCR',
    qrHint: 'Halakan kamera ke kod QR tiket Beat KL traffic',
    ocrHint: 'Ambil gambar papan tanda stesen, jadual, tambang, atau tiket kertas — AI mengekstrak teks.',
    scanCamera: 'Imbas dengan Kamera',
    cameraUnsupported: 'Kamera tidak disokong',
    enterCode: 'Masukkan Kod',
    captureSign: 'Tangkap Papan',
    uploadImage: 'Muat Naik Gambar',
    runOcr: 'Jalankan OCR',
    qrAlign: 'Sejajarkan kod QR dalam bingkai',
    ocrAlign: 'Bingkaikan papan tanda atau jadual, kemudian ketik Jalankan OCR',
    cancel: 'Batal',
    manualPlaceholder: 'cth. RAPIDKL-T-A1B2C3-KJ16-MR6',
    validate: 'Sahkan',
    validating: 'Mengesahkan tiket…',
    ocrProcessing: 'Membaca imej dengan visi AI…',
    validTicket: 'Tiket Sah',
    ocrComplete: 'Teks diekstrak',
    failed: 'Imbasan gagal',
    ticketId: 'ID Tiket',
    from: 'Dari',
    to: 'Ke',
    fare: 'Tambang',
    askAi: 'Tanya AI Komuter',
    scanAnother: 'Imbas Lagi',
    tryAgain: 'Cuba Lagi',
    signInHint: 'Log masuk untuk mengesahkan tiket dengan akaun anda.',
    cameraDenied: 'Akses kamera ditolak. Gunakan input manual atau muat naik.',
    ticketNotFound: 'Tiada tiket dijumpai untuk kod QR ini.',
    validationFailed: 'Pengesahan gagal. Sila cuba lagi.',
    ocrFailed: 'OCR gagal. Cuba foto yang lebih jelas atau pencahayaan lebih baik.',
  },
  agent: {
    title: 'Ejen AI Komuter',
    subtitle: 'Jawapan mengikut laluan untuk Lembah Klang — dikuasakan oleh imbasan dan data transit langsung.',
    signInPrompt: 'Log masuk untuk berbual dengan ejen AI dan dapatkan laluan pintar mengatasi kesesakan.',
    scanContext: 'Imbasan digandingkan',
    clearScans: 'Kosongkan',
    emptyState: 'Tanya tentang laluan, kelewatan, atau imbasan terkini. Prompt pantas di bawah:',
    inputPlaceholder: 'Tanya cara mengatasi kesesakan…',
  },
  highlights: [
    {
      title: 'Perancang Laluan Sensitif Kesesakan',
      description: 'ETA GTFS + laluan yang mengelak kesesakan puncak',
    },
    {
      title: 'Enjin Ciri Laluan',
      description: 'UI dinamik mengikut laluan untuk kekal bergerak',
    },
    {
      title: 'Cache Luar Talian',
      description: 'Laluan + stesen disimpan untuk zon tanpa isyarat',
    },
  ],
  features: {
    badge: 'Misi Kami',
    title: 'Mengapa Beat KL traffic melawan kesesakan',
    subtitle:
      'Setiap minit di lebuh raya sesak adalah masa yang kami mahu pulangkan. Kepintaran mengikut laluan membantu komuter Lembah Klang beralih ke transit yang benar-benar mengatasi kesesakan.',
    items: [
      {
        title: 'Penjejakan Masa Nyata',
        description: 'Tiba di platform tepat pada masanya — kurang menunggu dalam trafik atau di ruang stesen.',
      },
      {
        title: 'Tiket Digital',
        description: 'Satu ketikan untuk tiket QR supaya menaiki lebih pantas dan tempat letak kereta lebih kosong.',
      },
      {
        title: 'Keselamatan Diutamakan',
        description: 'Amaran dan panduan berjalan selamat untuk alternatif malam yang boleh dipercayai berbanding memandu.',
      },
    ],
  },
  lines: {
    title: 'Kepintaran Mengikut Laluan',
    subtitle:
      'Setiap laluan rel Lembah Klang diselaraskan untuk mengalihkan orang daripada jalan raya dan melalui rangkaian dengan lebih pantas.',
    badgeNew: 'Baharu',
    badgeComingSoon: 'Akan Datang',
    items: [
      {
        name: 'Laluan MRT Putrajaya (Kuning)',
        usp: 'Ramalan Kelajuan & Kebolehpercayaan',
        detail: 'Meramalkan tetingkap laluan pantas dan pertukaran terbaik untuk mengelak kesesakan jalan.',
      },
      {
        name: 'Laluan MRT Kajang',
        usp: 'Ramalan Kelajuan & Kebolehpercayaan',
        detail: 'Petua kebolehpercayaan merentas bandar yang mengatasi kelewatan lebuh raya waktu puncak.',
      },
      {
        name: 'Laluan LRT Ampang',
        usp: 'Mod Survival Kelewatan',
        detail: 'Laluan semula automatik dengan jambatan bas apabila kesesakan melimpah ke laluan biasa anda.',
      },
      {
        name: 'Laluan LRT Sri Petaling',
        usp: 'Mod Survival Kelewatan',
        detail: 'Pertukaran selamat semasa gangguan supaya anda tidak terpaksa kembali ke trafik.',
      },
      {
        name: 'Laluan LRT Kelana Jaya',
        usp: 'Peta Haba Kesesakan & Muatan Gerabak',
        detail: 'Pilih gerabak dan platform kurang sesak — aliran lebih lancar, masa tunggu lebih pendek.',
      },
      {
        name: 'Monorel KL',
        usp: 'Pengoptimum Pelancong & Perjalanan Pendek',
        detail: 'Perjalanan pendek yang menggantikan pemanduan last-mile melalui jalan sibuk.',
      },
      {
        name: 'KTM Komuter',
        usp: 'Kebolehpercayaan Jarak Jauh & Pencari Tempat Duduk',
        detail: 'Ramalan tempat duduk dan penimbalan masa pertukaran untuk komuter luar bandar tanpa kereta.',
      },
      {
        name: 'Laluan LRT3 Shah Alam',
        usp: 'Penghubung Koridor Barat',
        detail:
          '37.8 km, 20 stesen dari Bandar Utama ke Johan Setia — beroperasi sejak Jun 2026. Membuka koridor barat supaya kurang pemandu menyumbang kepada kesesakan Lebuhraya Persekutuan.',
      },
    ],
  },
  architecture: {
    title: 'Seni Bina Sedia Pengeluaran',
    subtitle:
      'Dibina untuk melegakan kesesakan masa nyata di Lembah Klang dengan backend modular dan aplikasi mudah alih luar talian.',
    sections: [
      {
        title: 'Aplikasi Mudah Alih',
        items: ['React Native (Expo)', 'Perancang Laluan Sensitif Kesesakan', 'Cache Luar Talian', 'Amaran & Kesesakan'],
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
    title: 'Jalan Lebih Jelas Di Hadapan',
    subtitle:
      'Ramalan kesesakan AI, navigasi luar talian, integrasi LRT3, dan liputan lebih luas — semuanya untuk mengurangkan kereta di lebuh raya Lembah Klang.',
    items: [
      {
        title: 'Ramalan Kesesakan AI',
        detail: 'Ramalkan muatan gerabak 30 minit lebih awal supaya penumpang tidak berkumpul di jalan dan platform.',
      },
      {
        title: 'Navigasi Luar Talian',
        detail: 'Navigasi boleh dipercayai tanpa data — masih lebih baik daripada duduk dalam kesesakan.',
      },
      {
        title: 'Integrasi Mendalam LRT3',
        detail:
          'GTFS-RT penuh dan jadual tambang untuk Laluan Shah Alam, serta lima stesen infill (~2028) untuk meluaskan koridor tanpa kereta.',
      },
      {
        title: 'Pengembangan Negeri demi Negeri',
        detail: 'Johor → Pulau Pinang → Sarawak — strategi yang sama untuk mengurangkan kesesakan di luar Lembah Klang.',
      },
    ],
  },
  footer: {
    tagline:
      'Matlamat kami: mengurangkan kesesakan trafik di Lembah Klang dengan menjadikan transit awam pilihan yang lebih pantas dan mudah.',
    quickLinks: 'Pautan Pantas',
    helpSupport: 'Bantuan & Sokongan',
    mobileApp: 'Aplikasi Mudah Alih',
    mobileAppDesc: 'Atasi kesesakan dari telefon anda. Muat turun Beat KL traffic hari ini.',
    appStore: 'Dapatkan di App Store',
    googlePlay: 'Dapatkan di Google Play',
    copyright: 'Jalan lebih jelas untuk Lembah Klang.',
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
