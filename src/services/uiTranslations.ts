export type UiLanguage = 'English' | 'Urdu';

export interface TranslationStrings {
  appName: string;
  scannerEngine: string;
  continueBtn: string;
  loginTitle: string;
  loginSub: string;
  signUpTitle: string;
  signUpSub: string;
  forgotTitle: string;
  forgotSub: string;
  otpTitle: string;
  otpSub: string;
  
  // Forms
  fullName: string;
  emailAddress: string;
  phoneNumber: string;
  password: string;
  newPassword: string;
  confirmPassword: string;
  codePlaceholder: string;
  submitRegister: string;
  submitLogin: string;
  submitForgot: string;
  submitOtp: string;
  gotoLogin: string;
  gotoSignUp: string;
  gotoForgot: string;
  resendOtp: string;
  
  // Dashboard
  dashboardTab: string;
  pageQueueTab: string;
  heroBadge: string;
  heroHeadingBefore: string;
  heroHeadingAccent: string;
  heroHeadingAfter: string;
  heroSub: string;
  startBtn: string;
  bulkBtn: string;
  dropzoneTitle: string;
  dropzoneSub: string;
  scanCenterReady: string;
  
  // Stats
  statArchived: string;
  statTotalPages: string;
  statScript: string;
  statAccuracy: string;
  statHighAcc: string;
  
  // Library History
  archiveTitle: string;
  archiveCount: string;
  vaultEmptyTitle: string;
  vaultEmptySub: string;
  deleteTooltip: string;
  viewResultTooltip: string;
  
  // Editor
  archivalOptions: string;
  intelIntentLabel: string;
  formalScript: string;
  preserveRaw: string;
  formalTip: string;
  rawTip: string;
  inputLangLabel: string;
  scriptStyleLabel: string;
  instantTranslateLabel: string;
  autoMode: string;
  disabledMode: string;
  chooseTarget: string;
  convertBtn: string;
  stackTitle: string;
  stackSub: string;
  addMoreBtn: string;
  queueEmptyTitle: string;
  laserScanning: string;
  ocrProcessingText: string;
  
  // Result
  resultTitle: string;
  resultSub: string;
  smartCorrectBtn: string;
  speakingBtn: string;
  wordsLabel: string;
  awaitingStream: string;
  downloadLabel: string;
  downloadPdfBtn: string;
  downloadPdfSub: string;
  downloadTxtBtn: string;
  downloadTxtSub: string;
  distributionLabel: string;
  emailCopyBtn: string;
  safeStorageBtn: string;
  
  // Settings
  settingsTitle: string;
  profileTitle: string;
  changeLangLabel: string;
  themeToggleLabel: string;
  notificationsLabel: string;
  notificationToggleSub: string;
  privacyLabel: string;
  privacySub: string;
  logoutBtn: string;
  changePassLabel: string;
  cancelBtn: string;
  saveBtn: string;
  backBtn: string;
}

export const uiTranslations: Record<UiLanguage, TranslationStrings> = {
  English: {
    appName: "HandWritePro",
    scannerEngine: "Scanner Engine 3.5",
    continueBtn: "Continue to App",
    loginTitle: "Sign In",
    loginSub: "Welcome back. Access your digital transcription archives.",
    signUpTitle: "Create Account",
    signUpSub: "Sign up today to start transcribing multi-page documents.",
    forgotTitle: "Reset Password",
    forgotSub: "Enter your account email or phone number to obtain a reset code.",
    otpTitle: "OTP Verification",
    otpSub: "We have dispatched a security verification code. Please input it below.",
    
    fullName: "Full Name",
    emailAddress: "Email Address",
    phoneNumber: "Phone Number",
    password: "Password",
    newPassword: "New Password",
    confirmPassword: "Confirm Password",
    codePlaceholder: "Enter 6-digit OTP code",
    submitRegister: "Initialize Sign Up",
    submitLogin: "Sign In Securely",
    submitForgot: "Request Reset Link",
    submitOtp: "Verify & Launch",
    gotoLogin: "Already registered? Login here",
    gotoSignUp: "New user? Create an account",
    gotoForgot: "Forgot your password?",
    resendOtp: "Resend Code",
    
    dashboardTab: "Dashboard",
    pageQueueTab: "Page Queue",
    heroBadge: "AI HANDWRITTEN LETTER ARCHIVIST",
    heroHeadingBefore: "Transcribe raw",
    heroHeadingAccent: "Handwritten",
    heroHeadingAfter: "manuscripts & letters.",
    heroSub: "Convert any copy, diary pages, historical letters, or handwriting into computerized digital text in seconds. Engineered for Arabic, Urdu, Pashto, English, and more.",
    startBtn: "Start Uploading",
    bulkBtn: "Bulk Upload",
    dropzoneTitle: "Drop photos of letter manuscripts here",
    dropzoneSub: "Supports bulk copying and PDF streams up to 100 pages concurrently",
    scanCenterReady: "Scan Center Ready",
    
    statArchived: "Archived Documents",
    statTotalPages: "Total Pages Processed",
    statScript: "Script Support",
    statAccuracy: "Handwriting Resolution",
    statHighAcc: "High Accuracy",
    
    archiveTitle: "Digital Archive Library",
    archiveCount: "Saved Manuscripts",
    vaultEmptyTitle: "Archive Vault is empty",
    vaultEmptySub: "Upload or capture pictures of letters to construct your digital computerized records catalog.",
    deleteTooltip: "Delete Item",
    viewResultTooltip: "View Results",
    
    archivalOptions: "Archival Options",
    intelIntentLabel: "Transcription Mode",
    formalScript: "Grammar & Rules Mode",
    preserveRaw: "Exact Paper Text (Literal)",
    formalTip: "Transcribes while correcting spelling & grammar to conform strictly to proper language rules.",
    rawTip: "Transcribes exactly what is written on the paper, preserving errors and colloquial layout.",
    inputLangLabel: "Input Language",
    scriptStyleLabel: "Writing Style (Khat)",
    instantTranslateLabel: "Instant Translation",
    autoMode: "Auto Mode",
    disabledMode: "Disabled",
    chooseTarget: "Choose Target Language",
    convertBtn: "Convert Pages Now",
    stackTitle: "Manuscript Stack",
    stackSub: "Drag to reorder/flow. Set logical chronologies of handwritten pages.",
    addMoreBtn: "Add More Pages",
    queueEmptyTitle: "Capture pages to begin transcription",
    laserScanning: "OCR Scanner Analysing...",
    ocrProcessingText: "Processing pages in parallel with Gemini LLMOCR",
    
    resultTitle: "Transcribed Text",
    resultSub: "Computerized output ready for editing or publication.",
    smartCorrectBtn: "Smart AI Correct",
    speakingBtn: "Listen (TTS)",
    wordsLabel: "Words",
    awaitingStream: "Awaiting computerized OCR stream...",
    downloadLabel: "Download Options",
    downloadPdfBtn: "Download as PDF Document",
    downloadPdfSub: "High-Fidelity Clear Text Page (.pdf)",
    downloadTxtBtn: "Download as Text (TXT)",
    downloadTxtSub: "Plain Unicode Text Document (.txt)",
    distributionLabel: "Local Distribution",
    emailCopyBtn: "Email copy",
    safeStorageBtn: "Safe Storage",
    
    settingsTitle: "App Settings",
    profileTitle: "Profile Settings",
    changeLangLabel: "App Interface Language",
    themeToggleLabel: "Visual Theme Preset",
    notificationsLabel: "Notification Warnings",
    notificationToggleSub: "Enable sound cues on OCR completion",
    privacyLabel: "Privacy Safeguards",
    privacySub: "Client-side documents are never saved on external cloud logs",
    logoutBtn: "Secure Log Out",
    changePassLabel: "Reset Security Credentials",
    cancelBtn: "Cancel",
    saveBtn: "Apply Changes",
    backBtn: "Go Back"
  },
  Urdu: {
    appName: "ہینڈ رائٹ پرو",
    scannerEngine: "اسکینر انجن 3.5",
    continueBtn: "ایپلی کیشن شروع کریں",
    loginTitle: "لاگ ان کریں",
    loginSub: "خوش آمدید۔ اپنے ڈیجیٹل تحریری ریکارڈز تک رسائی حاصل کریں۔",
    signUpTitle: "نیا اکاؤنٹ بنائیں",
    signUpSub: "دستاویزات کی کمپیوٹرائزیشن شروع کرنے کے لیے آج ہی رجسٹریشن کریں۔",
    forgotTitle: "پاس ورڈ بھول گئے؟",
    forgotSub: "پاس ورڈ تبدیل کرنے کا کوڈ حاصل کرنے کے لیے اپنا ای میل یا فون نمبر درج کریں۔",
    otpTitle: "OTP تصدیق",
    otpSub: "ہم نے آپ کے اسکرین پر ایک سیکورٹی تصدیق کوڈ بھیجا ہے۔ برائے مہربانی نیچے درج کریں۔",
    
    fullName: "پورا نام",
    emailAddress: "ای میل ایڈریس",
    phoneNumber: "فون نمبر",
    password: "پاس ورڈ",
    newPassword: "نیا پاس ورڈ",
    confirmPassword: "پاس ورڈ کی تصدیق کریں",
    codePlaceholder: "6 ہندسوں کا تصدیقی کوڈ درج کریں",
    submitRegister: "اکاؤنٹ بنائیں",
    submitLogin: "محفوظ لاگ ان کریں",
    submitForgot: "ری سیٹ لنک کی درخواست کریں",
    submitOtp: "تصدیق کریں اور آگے بڑھیں",
    gotoLogin: "پہلے سے اکاؤنٹ موجود ہے؟ یہاں کلک کریں",
    gotoSignUp: "نیا اکاؤنٹ بنانا چاہتے ہیں؟ کلک کریں",
    gotoForgot: "پاس ورڈ بھول گئے ہیں؟",
    resendOtp: "کوڈ دوبارہ بھیجیں",
    
    dashboardTab: "ڈیش بورڈ",
    pageQueueTab: "صفحات کی قطار",
    heroBadge: "مصنوعی ذہانت سے لیس خطوط آرکائیوسٹ",
    heroHeadingBefore: "خام اور ہاتھ سے لکھے",
    heroHeadingAccent: "مخطوطات اور خطوط",
    heroHeadingAfter: "کو ٹائپ شدہ ٹیکسٹ میں تبدیل کریں۔",
    heroSub: "کسی بھی کاپی، ڈائری کے صفحات، تاریخی خطوط، یا ہاتھ کی تحریر کو چند سیکنڈ میں کمپیوٹرائزڈ ڈیجیٹل ٹیکسٹ میں تبدیل کریں۔ اردو، عربی، پشتو، اور انگریزی کے لیے خصوصی طور پر تیار کردہ۔",
    startBtn: "اپ لوڈ شروع کریں",
    bulkBtn: "بلک اپ لوڈ",
    dropzoneTitle: "خطوط کی تصاویر یہاں ڈراپ کریں",
    dropzoneSub: "ایک وقت میں 100 صفحات یا پی ڈی ایف فائل اپ لوڈ کرنے کی صلاحیت",
    scanCenterReady: "اسکیننگ سینٹر تیار ہے",
    
    statArchived: "محفوظ دستاویزات",
    statTotalPages: "پروسیس شدہ صفحات",
    statScript: "رسم الخط کی سہولت",
    statAccuracy: "معیاری پروسیسنگ",
    statHighAcc: "انتہائی درست",
    
    archiveTitle: "ڈیجیٹل آرکائیوز لائبریری",
    archiveCount: "محفوظ کردہ خطوط",
    vaultEmptyTitle: "آرکائیو والٹ خالی ہے",
    vaultEmptySub: "اپنے ڈیجیٹل کمپیوٹرائزڈ ریکارڈز بنانے کے لیے خطوط کے صفحات یہاں اپ لوڈ کریں۔",
    deleteTooltip: "حذف کریں",
    viewResultTooltip: "نتائج دیکھیں",
    
    archivalOptions: "تبدیلی کے اختیارات",
    intelIntentLabel: "کمپیوٹرائزیشن کا موڈ",
    formalScript: "قواعد و ضوابط کے مطابق (درست املا)",
    preserveRaw: "ہوبہو اصل تحریر (جیسا پیپر پر ہے)",
    formalTip: "یہ آپشن ہاتھ سے لکھی ہوئی تحریر کو اس زبان کے مروجہ قواعد و ضوابط اور املا کے مطابق درست ترتیب دیتا ہے۔",
    rawTip: "یہ آپشن بِلکل وہی تحریر فراہم کرتا ہے جو پیپر پر لکھی ہے، چاہے وہ قواعد یا املا کی رو سے درست ہو یا نہ ہو۔",
    inputLangLabel: "تحریر کی زبان",
    scriptStyleLabel: "انداز تحریر (خط)",
    instantTranslateLabel: "فوری ترجمہ کریں (مترجم)",
    autoMode: "خودکار طریقے سے",
    disabledMode: "غیر فعال",
    chooseTarget: "ترجمے کے لیے زبان منتخب کریں",
    convertBtn: "صفحات کو تبدیل کریں",
    stackTitle: "دستاویزات کا ڈھیر",
    stackSub: "ترتیب بدلنے کے لیے پکڑ کر آگے پیچھے کریں۔ صفحات کے تاریخی تسلسل کو درست کریں۔",
    addMoreBtn: "مزید صفحات شامل کریں",
    queueEmptyTitle: "کمپیوٹرائزیشن شروع کرنے کے لیے صفحات اپ لوڈ کریں",
    laserScanning: "او سی آر اسکیننگ شروع ہے...",
    ocrProcessingText: "مصنوعی ذہانت سے صفحات کا تجزیہ کیا جا رہا ہے",
    
    resultTitle: "تبدیل شدہ کمپیوٹرائزڈ ٹیکسٹ",
    resultSub: "ترمیم اور اشاعت کے لیے تیار کردہ تحریر۔",
    smartCorrectBtn: "مصنوعی ذہانت سے اصلاح",
    speakingBtn: "آواز سے سنیں (آڈیو)",
    wordsLabel: "الفاظ",
    awaitingStream: "او سی آر پروسیسنگ کا انتظار کیا جا رہا ہے...",
    downloadLabel: "ڈاؤن لوڈ کے اختیارات",
    downloadPdfBtn: "پی ڈی ایف کی شکل میں ڈاؤن لوڈ کریں",
    downloadPdfSub: "انتہائی واضح اور صاف پرنٹ ایبل فائل (.pdf)",
    downloadTxtBtn: "ٹیکسٹ فائل ڈاؤن لوڈ کریں (TXT)",
    downloadTxtSub: "سادہ یونیکوڈ ٹیکسٹ فائل (.txt)",
    distributionLabel: "مقامی اشتراک",
    emailCopyBtn: "ای میل نقل",
    safeStorageBtn: "محفوظ اسٹوریج",
    
    settingsTitle: "ایپلی کیشن کی ترتیبات",
    profileTitle: "پروفائل کی ترتیبات",
    changeLangLabel: "ایپ انٹرفیس کی زبان",
    themeToggleLabel: "تھیم کا انتخاب",
    notificationsLabel: "اطلاعات (آواز)",
    notificationToggleSub: "تحریری کام مکمل ہونے پر آواز چلائیں",
    privacyLabel: "رازداری کی ضمانت",
    privacySub: "آپ کا ڈیٹا ہمارے بادل یا سرور پر کبھی لاگ نہیں کیا جاتا",
    logoutBtn: "محفوظ لاگ آؤٹ",
    changePassLabel: "سیکورٹی پاس ورڈ تبدیل کریں",
    cancelBtn: "منسوخ کریں",
    saveBtn: "ترتیبات محفوظ کریں",
    backBtn: "واپس جائیں"
  }
};
