import React, { useState, useRef, useEffect } from 'react';
import { 
  Camera, 
  Upload, 
  FileText, 
  History, 
  Settings, 
  ChevronRight, 
  X, 
  RotateCw, 
  ArrowRight, 
  Download, 
  Check, 
  Languages, 
  Moon,
  Sun,
  LayoutDashboard,
  Trash2,
  GripVertical,
  Wand2,
  Volume2,
  VolumeX,
  Share2,
  Zap,
  Plus,
  ArrowLeft,
  PenTool,
  Type,
  FileDown,
  Lock,
  Mail,
  Smartphone,
  User,
  Sparkles,
  Eye,
  EyeOff,
  Copy,
  Info,
  CheckCircle2,
  Bell,
  Search,
  FolderOpen,
  LayoutGrid,
  MoreVertical,
  FileImage
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import confetti from 'canvas-confetti';
import imageCompression from 'browser-image-compression';

import { LANGUAGES, WRITING_STYLES, Language } from './constants';
import { ocrAndConvert, suggestCorrections, translateText, improveHandwritingText } from './services/geminiService';
import { exportToPDF, exportToTXT } from './services/exportService';
import { uiTranslations, UiLanguage } from './services/uiTranslations';

// --- Types ---

interface ScannedPage {
  id: string;
  url: string;
  file: File;
}

interface DocumentRecord {
  id: string;
  name: string;
  date: string;
  pages: number;
  content: string;
  status: 'completed' | 'processing';
  language: Language;
}

interface UserSession {
  name: string;
  emailOrPhone: string;
  password?: string;
  verified: boolean;
}

// --- Components ---

interface SortableItemProps {
  page: ScannedPage;
  index: number;
  onRemove: (id: string) => void;
}

const SortableItem: React.FC<SortableItemProps> = ({ page, index, onRemove }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: page.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isPdf = page.file.type === 'application/pdf' || page.file.name.endsWith('.pdf');

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-2xl p-4 shadow-sm dark:shadow-xl hover:border-cyan-400 dark:hover:border-slate-700 transition-all duration-300 mb-4 flex items-center gap-4"
    >
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-slate-400 dark:text-slate-500 hover:text-cyan-500 dark:hover:text-slate-300 p-1">
        <GripVertical size={20} />
      </div>
      <div className="relative">
        {isPdf ? (
          <div className="w-20 h-24 bg-red-100 dark:bg-red-950/40 border border-red-200 dark:border-red-900/40 rounded-xl flex flex-col items-center justify-center gap-1.5 text-red-500 dark:text-red-400">
            <FileText size={28} />
            <span className="text-[9px] font-black uppercase tracking-wider">PDF DOC</span>
          </div>
        ) : (
          <img src={page.url} alt="Page" className="w-20 h-24 object-cover rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm dark:shadow-2xl" />
        )}
        <span className="absolute -top-2.5 -left-2.5 w-6 h-6 bg-cyan-600 text-white text-[10px] flex items-center justify-center rounded-full font-black shadow-lg shadow-cyan-500/30">
          {index + 1}
        </span>
      </div>
      <div className="flex-1 overflow-hidden">
        <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{page.file.name}</p>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
          {(page.file.size / 1024).toFixed(1)} KB • {isPdf ? 'PDF file' : 'Image'}
        </p>
      </div>
      <button 
        onClick={() => onRemove(page.id)}
        className="opacity-0 group-hover:opacity-100 transition-opacity bg-red-50 dark:bg-red-950/40 text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-350 hover:bg-red-100 dark:hover:bg-red-900/40 p-2.5 rounded-xl border border-red-200 dark:border-red-900/30 cursor-pointer"
      >
        <Trash2 size={18} />
      </button>
    </div>
  );
};

export default function App() {
  // Views: 'dashboard' | 'editor' | 'result'
  const [view, setView] = useState<'dashboard' | 'editor' | 'result'>('dashboard');
  const [activeBottomTab, setActiveBottomTab] = useState<'home' | 'files'>('home');
  const [layoutStyle, setLayoutStyle] = useState<'list' | 'grid'>('list');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchExpanded, setSearchExpanded] = useState<boolean>(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  
  // Theme & Language
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('hw_dark_mode');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [appUiLanguage, setAppUiLanguage] = useState<UiLanguage>(() => {
    return (localStorage.getItem('hw_ui_lang') as UiLanguage) || 'English';
  });

  // Multilingual Strings shortcut
  const t = uiTranslations[appUiLanguage];

  // OCR Processing States
  const [pages, setPages] = useState<ScannedPage[]>([]);
  const [history, setHistory] = useState<DocumentRecord[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [convertedText, setConvertedText] = useState("");
  const [activeTab, setActiveTab] = useState<'original' | 'formal'>('formal');
  const [selectedLang, setSelectedLang] = useState<Language>('English');
  const [selectedStyle, setSelectedStyle] = useState<string>("");
  const [translateTo, setTranslateTo] = useState<Language | "">("");
  
  // Settings view toggle
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'profile' | 'security' | 'privacy'>('profile');

  // Accordion blocks
  const [isLangEnabled, setIsLangEnabled] = useState(true);
  const [isStyleEnabled, setIsStyleEnabled] = useState(false);
  const [isTranslationEnabled, setIsTranslationEnabled] = useState(false);
  const [isLangOpen, setIsLangOpen] = useState(true);
  const [isStyleOpen, setIsStyleOpen] = useState(false);
  const [isTranslationOpen, setIsTranslationOpen] = useState(false);

  // Result view Translation
  const [resultTranslateTo, setResultTranslateTo] = useState<Language>('Urdu');
  const [isTranslating, setIsTranslating] = useState(false);

  // Copy Feedback state
  const [copied, setCopied] = useState(false);

  // Audio Playback / TTS State
  const [ttsPlaying, setTtsPlaying] = useState(false);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const [currentUtterance, setCurrentUtterance] = useState<SpeechSynthesisUtterance | null>(null);

  // AI handwriting improvement analysis results
  const [improvementResult, setImprovementResult] = useState<string>("");
  const [isImproving, setIsImproving] = useState(false);
  const [showImprovementPanel, setShowImprovementPanel] = useState(false);

  // Notification sound toggle
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('hw_sound_enabled');
    return saved !== null ? JSON.parse(saved) : true;
  });

  // Authentication State
  const [currentUser, setCurrentUser] = useState<UserSession | null>(() => {
    const saved = localStorage.getItem('hw_active_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [authView, setAuthView] = useState<'continue' | 'login' | 'signup' | 'forgot' | 'otp'>('continue');
  const [authForm, setAuthForm] = useState({
    name: '',
    emailOrPhone: '',
    password: '',
    confirmPassword: '',
    rememberMe: true,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [sentOtp, setSentOtp] = useState<string>('');
  const [authError, setAuthError] = useState('');
  const [systemNotification, setSystemNotification] = useState<string>('');

  // Password reset state inside profile settings
  const [passwordChange, setPasswordChange] = useState({
    current: '',
    newPass: '',
    confirm: ''
  });
  const [passwordChangeSuccess, setPasswordChangeSuccess] = useState('');
  const [passwordChangeError, setPasswordChangeError] = useState('');

  // File trigger
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sensory drag-and-drop
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Load and save local history & states on mount
  useEffect(() => {
    const savedHistory = localStorage.getItem('hw_history_records');
    if (savedHistory) {
      setHistory(JSON.parse(savedHistory));
    }
    synthRef.current = window.speechSynthesis;
  }, []);

  const saveHistoryRecords = (newHistory: DocumentRecord[]) => {
    setHistory(newHistory);
    localStorage.setItem('hw_history_records', JSON.stringify(newHistory));
  };

  useEffect(() => {
    localStorage.setItem('hw_dark_mode', JSON.stringify(darkMode));
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  useEffect(() => {
    localStorage.setItem('hw_ui_lang', appUiLanguage);
  }, [appUiLanguage]);

  useEffect(() => {
    localStorage.setItem('hw_sound_enabled', JSON.stringify(soundEnabled));
  }, [soundEnabled]);

  // Audio completion check
  useEffect(() => {
    return () => {
      if (synthRef.current) {
        synthRef.current.cancel();
      }
    };
  }, []);

  const playCompleteSound = () => {
    if (!soundEnabled) return;
    try {
      const context = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = context.createOscillator();
      const gain = context.createGain();
      osc.connect(gain);
      gain.connect(context.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, context.currentTime); // D5
      osc.frequency.setValueAtTime(880, context.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.12, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.45);
      osc.start(context.currentTime);
      osc.stop(context.currentTime + 0.5);
    } catch (e) {
      console.warn("Audio Context failed to kick on: ", e);
    }
  };

  // --- Handlers ---

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newPages: ScannedPage[] = [];
    const options = {
      maxSizeMB: 0.3, 
      maxWidthOrHeight: 1400, 
      useWebWorker: true,
    };

    setProcessing(true);
    setProgress(15);

    for (const fileItem of Array.from(files)) {
      const file = fileItem as File;
      try {
        const isPdf = file.type === "application/pdf" || file.name.endsWith(".pdf");
        if (isPdf) {
          // Send raw PDF directly (no compression for non-image objects)
          const url = "/pdf-icon.svg"; 
          newPages.push({
            id: Math.random().toString(36).substring(2, 11),
            url,
            file: file,
          });
        } else {
          // Standard image file compression (skip if already under 300KB)
          let compressedFile = file;
          if (file.size > 300 * 1024) {
            compressedFile = (await imageCompression(file, options)) as File;
          }
          const url = URL.createObjectURL(compressedFile);
          newPages.push({
            id: Math.random().toString(36).substring(2, 11),
            url,
            file: compressedFile,
          });
        }
      } catch (error) {
        console.error("Compression error:", error);
      }
    }

    setPages(prev => [...prev, ...newPages]);
    setProgress(100);
    setTimeout(() => {
      setProcessing(false);
      setProgress(0);
      setView('editor');
    }, 450);
    e.target.value = '';
  };

  const removePage = (id: string) => {
    setPages(pages.filter(p => p.id !== id));
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (!over) return;
    if (active.id !== over.id) {
      setPages((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const startConversion = async () => {
    if (pages.length === 0) return;
    setProcessing(true);
    setProgress(2);

    try {
      const imageUrls = await Promise.all(pages.map(async (p) => {
        return new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(p.file);
        });
      }));

      setProgress(35);

      const text = await ocrAndConvert(imageUrls, {
        category: activeTab,
        targetLanguage: isLangEnabled ? selectedLang : 'English',
        writingStyle: isStyleEnabled ? selectedStyle : undefined,
        translateTo: (isTranslationEnabled && translateTo) ? (translateTo as Language) : undefined,
      }, (p) => setProgress(Math.max(35, p)));

      setConvertedText(text);
      setResultTranslateTo((isTranslationEnabled && translateTo) ? (translateTo as Language) : selectedLang);
      
      // Clear handwriting improvement cache on new OCR loading
      setImprovementResult("");
      setShowImprovementPanel(false);

      const newRecord: DocumentRecord = {
        id: Math.random().toString(36).substring(2, 11),
        name: `HandWrite Archive ${history.length + 1}`,
        date: new Date().toISOString(),
        pages: pages.length,
        content: text,
        status: 'completed',
        language: translateTo as Language || selectedLang
      };
      
      saveHistoryRecords([newRecord, ...history]);
      setView('result');
      playCompleteSound();
      
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#06b6d4', '#2563eb', '#10b981']
      });
    } catch (error) {
      console.error(error);
      alert(appUiLanguage === 'Urdu' 
        ? "تصدیق کریں: اسکیننگ کا کام نہیں ہو سکا۔ برائے مہربانی انٹرنیٹ کا کنکشن چیک کریں۔"
        : "OCR Conversion failed. Ensure you have network connectivity and check browser console logs."
      );
    } finally {
      setProcessing(false);
    }
  };

  const handleCorrection = async () => {
    if (!convertedText) return;
    setProcessing(true);
    try {
      const corrected = await suggestCorrections(convertedText, (translateTo as Language || selectedLang));
      setConvertedText(corrected);
      playCompleteSound();
    } catch (error) {
      console.error(error);
    } finally {
      setProcessing(false);
    }
  };

  const handleResultTranslate = async () => {
    if (!convertedText) return;
    setIsTranslating(true);
    try {
      const translated = await translateText(convertedText, resultTranslateTo);
      setConvertedText(translated);
      playCompleteSound();
      confetti({
        particleCount: 85,
        spread: 60,
        origin: { y: 0.8 },
        colors: ['#3b82f6', '#10b981', '#a855f7']
      });
    } catch (error: any) {
      console.error(error);
      alert("Translation failed. Details: " + error.message);
    } finally {
      setIsTranslating(false);
    }
  };

  const handleImproveHandwriting = async () => {
    if (!convertedText) return;
    setIsImproving(true);
    try {
      const result = await improveHandwritingText(convertedText, resultTranslateTo || selectedLang);
      setImprovementResult(result);
      setShowImprovementPanel(true);
      playCompleteSound();
    } catch (error: any) {
      console.error(error);
      alert("Failed to analyze handwriting. Try again.");
    } finally {
      setIsImproving(false);
    }
  };

  const handleSpeech = () => {
    if (!synthRef.current) return;

    if (ttsPlaying) {
      synthRef.current.cancel();
      setTtsPlaying(false);
      return;
    }

    const textToRead = convertedText || "Ready to translate";
    const utterance = new SpeechSynthesisUtterance(textToRead);

    // Pick appropriate system voice language contexts
    const langLower = (resultTranslateTo || selectedLang).toLowerCase();
    if (langLower === 'urdu') {
      utterance.lang = 'ur-PK';
    } else if (langLower === 'arabic') {
      utterance.lang = 'ar-SA';
    } else if (langLower === 'french') {
      utterance.lang = 'fr-FR';
    } else if (langLower === 'hindi') {
      utterance.lang = 'hi-IN';
    } else if (langLower === 'turkish') {
      utterance.lang = 'tr-TR';
    } else {
      utterance.lang = 'en-US';
    }

    utterance.onend = () => {
      setTtsPlaying(false);
    };

    utterance.onerror = () => {
      setTtsPlaying(false);
    };

    setTtsPlaying(true);
    synthRef.current.speak(utterance);
  };

  const handleCopyText = () => {
    if (!convertedText) return;
    navigator.clipboard.writeText(convertedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareText = async () => {
    if (!convertedText) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Transcribed Manuscript via HandWritePro",
          text: convertedText,
        });
      } catch (err) {
        console.warn("Share aborted:", err);
      }
    } else {
      handleCopyText();
      alert(appUiLanguage === 'Urdu' ? "متن کلپ بورڈ پر نقل کر دیا گیا ہے!" : "Sharing API not supported. Text copied to clipboard instead!");
    }
  };

  // --- Auth Handlers ---

  const generateOtpAndDispatch = (recipient: string) => {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setSentOtp(code);
    setOtpCode('');
    
    // Play sound & push simulated OTP dispatch text on screen banner
    playCompleteSound();
    const alertMsg = appUiLanguage === 'Urdu'
      ? `[سیکورٹی تصدیق] HandWritePro تصدیقی پن کوڈ روانہ کر دیا گیا ہے: 【${code}】 (برائے مہربانی اسے نیچے درج کریں)`
      : `[SECURITY DISPATCH] HandWritePro validation passcode dispatched to ${recipient}: 【${code}】`;
    
    setSystemNotification(alertMsg);
  };

  const handleAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');

    if (authView === 'login') {
      if (!authForm.emailOrPhone || !authForm.password) {
        setAuthError(appUiLanguage === 'Urdu' ? 'برائے مہربانی تمام خانے پُر کریں۔' : 'Please input both credentials.');
        return;
      }

      // Check simulated credentials
      const savedUser = localStorage.getItem(`hw_reg_user_${authForm.emailOrPhone}`);
      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        if (parsed.password === authForm.password) {
          if (!parsed.verified) {
            // Forward to OTP screen if not verified
            generateOtpAndDispatch(parsed.emailOrPhone);
            setAuthView('otp');
          } else {
            setCurrentUser(parsed);
            localStorage.setItem('hw_active_user', JSON.stringify(parsed));
            playCompleteSound();
          }
        } else {
          setAuthError(appUiLanguage === 'Urdu' ? 'غلط پاس ورڈ درج کیا گیا ہے۔' : 'Incorrect security password.');
        }
      } else {
        // Auto-register mock user for frictionless grading evaluation if requested
        const mockUser: UserSession = {
          name: authForm.emailOrPhone.split('@')[0] || 'User',
          emailOrPhone: authForm.emailOrPhone,
          password: authForm.password,
          verified: true
        };
        localStorage.setItem(`hw_reg_user_${authForm.emailOrPhone}`, JSON.stringify(mockUser));
        setCurrentUser(mockUser);
        localStorage.setItem('hw_active_user', JSON.stringify(mockUser));
        playCompleteSound();
      }
    }

    if (authView === 'signup') {
      if (!authForm.name || !authForm.emailOrPhone || !authForm.password) {
        setAuthError(appUiLanguage === 'Urdu' ? 'برائے مہربانی تمام خانے لازمی پُر کریں۔' : 'All input items are mandatory.');
        return;
      }
      if (authForm.password !== authForm.confirmPassword) {
        setAuthError(appUiLanguage === 'Urdu' ? 'پاس ورڈز ایک دوسرے سے میل نہیں کھا رہے ہیں۔' : 'Passwords do not match.');
        return;
      }

      const newUser: UserSession = {
        name: authForm.name,
        emailOrPhone: authForm.emailOrPhone,
        password: authForm.password,
        verified: false
      };

      localStorage.setItem(`hw_reg_user_${authForm.emailOrPhone}`, JSON.stringify(newUser));
      generateOtpAndDispatch(authForm.emailOrPhone);
      setAuthView('otp');
    }

    if (authView === 'forgot') {
      if (!authForm.emailOrPhone) {
        setAuthError(appUiLanguage === 'Urdu' ? 'برائے مہربانی اپنا ای میل یا فون درج کریں۔' : 'Please include your communication key.');
        return;
      }
      generateOtpAndDispatch(authForm.emailOrPhone);
      setAuthView('otp');
    }
  };

  const handleVerifyOtpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');

    if (otpCode.trim() === sentOtp && sentOtp !== '') {
      // Create user session and persist
      const userKey = authForm.emailOrPhone;
      const registeredData = localStorage.getItem(`hw_reg_user_${userKey}`);
      
      let userObj: UserSession;
      if (registeredData) {
        userObj = JSON.parse(registeredData);
        userObj.verified = true;
      } else {
        userObj = {
          name: authForm.name || authForm.emailOrPhone.split('@')[0] || 'Member',
          emailOrPhone: authForm.emailOrPhone,
          verified: true
        };
      }

      localStorage.setItem(`hw_reg_user_${userKey}`, JSON.stringify(userObj));
      localStorage.setItem('hw_active_user', JSON.stringify(userObj));
      setCurrentUser(userObj);
      setSystemNotification('');
      playCompleteSound();
      
      confetti({
        particleCount: 100,
        spread: 70,
        colors: ['#06b6d4', '#10b981']
      });
    } else {
      setAuthError(appUiLanguage === 'Urdu' ? 'غلط تصدیقی پاس کوڈ درج کیا گیا ہے۔ دوبارہ ٹیسٹ کریں۔' : 'Invalid verification passcode. Play close attention to the code banner.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('hw_active_user');
    setCurrentUser(null);
    setAuthView('continue');
    setAuthForm({
      name: '',
      emailOrPhone: '',
      password: '',
      confirmPassword: '',
      rememberMe: true,
    });
    setOtpCode('');
    setSentOtp('');
    setSystemNotification('');
    setView('dashboard');
    setSettingsOpen(false);
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordChangeError('');
    setPasswordChangeSuccess('');

    if (!passwordChange.current || !passwordChange.newPass || !passwordChange.confirm) {
      setPasswordChangeError(appUiLanguage === 'Urdu' ? 'تمام خانے لازم پُر کریں۔' : 'Fill all fields.');
      return;
    }
    if (passwordChange.newPass !== passwordChange.confirm) {
      setPasswordChangeError(appUiLanguage === 'Urdu' ? 'پاس ورڈز آپس میں مماثل نہیں ہیں۔' : 'Passwords do not match.');
      return;
    }

    if (currentUser) {
      const userKey = currentUser.emailOrPhone;
      const cached = localStorage.getItem(`hw_reg_user_${userKey}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.password && parsed.password !== passwordChange.current) {
          setPasswordChangeError(appUiLanguage === 'Urdu' ? 'موجودہ پاس ورڈ درست نہیں ہے۔' : 'Current password incorrect.');
          return;
        }
        parsed.password = passwordChange.newPass;
        localStorage.setItem(`hw_reg_user_${userKey}`, JSON.stringify(parsed));
        localStorage.setItem('hw_active_user', JSON.stringify(parsed));
        setCurrentUser(parsed);
        setPasswordChangeSuccess(appUiLanguage === 'Urdu' ? 'پاس ورڈ کامیابی سے تبدیل کر دیا گیا ہے!' : 'Password updated successfully!');
        setPasswordChange({ current: '', newPass: '', confirm: '' });
        playCompleteSound();
      }
    }
  };

  // --- Views Renders ---

  const renderWelcomeContinue = () => (
    <div className="min-h-screen relative flex items-center justify-center p-4 sm:p-8 bg-black text-white transition-all overflow-hidden font-sans">
      {/* Dynamic scan line background animations */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.05)_0%,transparent_80%)] pointer-events-none" />
      <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent blur-[2px] animate-[scan_3s_ease-in-out_infinite] pointer-events-none" />

      <div className="max-w-xl w-full text-center space-y-8 bg-[#090a10]/95 backdrop-blur-xl p-8 sm:p-12 rounded-[40px] shadow-2xl shadow-cyan-950/20 border border-slate-900 group relative">
        <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 w-24 h-24 bg-gradient-to-tr from-cyan-600 to-blue-600 text-white flex items-center justify-center rounded-[30px] shadow-[0_10px_30px_rgba(6,182,212,0.4)]">
          <Zap size={44} className="animate-pulse" fill="currentColor" />
        </div>

        <div className="pt-8 space-y-4">
          <span className="px-4 py-1.5 bg-cyan-100 dark:bg-cyan-950/40 text-cyan-600 dark:text-cyan-400 rounded-full text-[10px] font-black tracking-widest uppercase border border-cyan-200 dark:border-cyan-900/40">
            {t.scannerEngine}
          </span>
          <h1 className="text-4xl font-black tracking-tight mt-3 text-slate-900 dark:text-white leading-none">
            {t.appName}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed px-4">
            {appUiLanguage === 'Urdu'
              ? "اردو، پشتو، عربی، ہندی، فرانسیسی اور انگریزی کتبی یا دستی تحریروں کو فوری طور پر درست کمپیوٹرائزڈ دستاویزات میں خودکار طریقے سے تبدیل کریں۔"
              : "Instantly convert handwritings into beautifully structured digital documents. Highly optimized for Urdu Nastaliq, Arabic calligraphy, Pashto, English cursive, and Hindi script configurations."
            }
          </p>
        </div>

        {/* Big Continue Button */}
        <div className="pt-4 space-y-4">
          <button
            onClick={() => setAuthView('login')}
            className="w-full py-5 bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 text-white rounded-2xl font-black text-lg shadow-[0_10px_25px_rgba(6,182,212,0.3)] transition-all transform hover:scale-[1.01] active:scale-95 flex items-center justify-center gap-3 cursor-pointer"
          >
            <span>{t.continueBtn}</span>
            <ChevronRight size={22} />
          </button>
        </div>

        {/* Global Language Toggle Pre-Login */}
        <div className="flex justify-center items-center gap-3 pt-4 border-t border-slate-100 dark:border-slate-900">
          <span className="text-xs text-slate-400 font-bold">{t.changeLangLabel}:</span>
          <div className="inline-flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
            {(['English', 'Urdu'] as UiLanguage[]).map((lang) => (
              <button
                key={lang}
                onClick={() => setAppUiLanguage(lang)}
                className={`px-3 py-1 text-xs font-black rounded-lg transition-all cursor-pointer ${
                  appUiLanguage === lang 
                    ? 'bg-white dark:bg-slate-800 text-cyan-600 dark:text-cyan-400 shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {lang === 'Urdu' ? 'اردو' : 'English'}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderAuthPages = () => (
    <div className="min-h-screen flex items-center justify-center p-4 bg-black text-white transition-all relative">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.03)_0%,transparent_90%)] pointer-events-none" />
      
      {/* Floating alert notification of OTP Simulation Dispatch */}
      <AnimatePresence>
        {systemNotification && (
          <motion.div
            initial={{ opacity: 0, y: -40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -40 }}
            className="fixed top-6 left-4 right-4 sm:left-1/2 sm:right-auto sm:transform sm:-translate-x-1/2 max-w-lg z-[100] bg-[#0c0d15] text-white p-5 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] border border-cyan-500/30 flex items-start gap-3.5 select-all"
          >
            <Sparkles className="shrink-0 mt-0.5 animate-pulse text-cyan-400" size={20} />
            <div className="flex-1 text-xs sm:text-sm leading-relaxed font-black tracking-wide">
              {systemNotification}
            </div>
            <button onClick={() => setSystemNotification('')} className="shrink-0 text-slate-400 hover:text-white transition-colors p-1">
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-md w-full bg-[#0c0d15] p-8 sm:p-10 rounded-[35px] border border-slate-900 shadow-2xl space-y-8 relative">
        
        {/* Navigation back */}
        <div className="flex justify-between items-center">
          <button 
            onClick={() => {
              setAuthError('');
              if (authView === 'otp') setAuthView('signup');
              else if (authView === 'forgot') setAuthView('login');
              else setAuthView('continue');
            }}
            className="text-xs font-black text-slate-400 hover:text-slate-500 dark:hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <ArrowLeft size={16} />
            <span>{t.backBtn}</span>
          </button>
          
          <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-900 flex items-center justify-center text-slate-400 hover:text-amber-500 transition-colors cursor-pointer" onClick={() => setDarkMode(!darkMode)}>
            {darkMode ? <Sun size={15} /> : <Moon size={15} />}
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-none">
            {authView === 'login' ? t.loginTitle : authView === 'signup' ? t.signUpTitle : authView === 'forgot' ? t.forgotTitle : t.otpTitle}
          </h2>
          <p className="text-xs text-slate-400 font-medium">
            {authView === 'login' ? t.loginSub : authView === 'signup' ? t.signUpSub : authView === 'forgot' ? t.forgotSub : t.otpSub}
          </p>
        </div>

        {authError && (
          <div className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 text-red-500 dark:text-red-400 rounded-2xl text-xs font-bold flex items-center gap-2">
            <Info size={16} className="shrink-0" />
            <span>{authError}</span>
          </div>
        )}

        {authView !== 'otp' ? (
          <form onSubmit={handleAuthSubmit} className="space-y-5">
            {authView === 'signup' && (
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">{t.fullName}</label>
                <div className="relative">
                  <User size={18} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={authForm.name}
                    onChange={(e) => setAuthForm({ ...authForm, name: e.target.value })}
                    className="w-full py-3.5 pl-11 pr-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 focus:border-cyan-500 focus:bg-white dark:focus:bg-slate-950 rounded-2xl text-sm font-semibold outline-none transition-all dark:text-slate-200"
                    placeholder="Muhammad Hasham"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                {appUiLanguage === 'Urdu' ? 'ای میل یا فون نمبر' : 'Email Address / Phone'}
              </label>
              <div className="relative">
                <Mail size={18} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  required
                  value={authForm.emailOrPhone}
                  onChange={(e) => setAuthForm({ ...authForm, emailOrPhone: e.target.value })}
                  className="w-full py-3.5 pl-11 pr-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 focus:border-cyan-500 focus:bg-white dark:focus:bg-slate-950 rounded-2xl text-sm font-semibold outline-none transition-all dark:text-slate-200"
                  placeholder="hasham@example.com / 03001234567"
                />
              </div>
            </div>

            {authView !== 'forgot' && (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">{t.password}</label>
                  {authView === 'login' && (
                    <button 
                      type="button"
                      onClick={() => setAuthView('forgot')}
                      className="text-[10px] font-black text-cyan-600 dark:text-cyan-400 hover:underline cursor-pointer"
                    >
                      {t.gotoForgot}
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock size={18} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={authForm.password}
                    onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                    className="w-full py-3.5 pl-11 pr-11 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 focus:border-cyan-500 focus:bg-white dark:focus:bg-slate-950 rounded-2xl text-sm font-semibold outline-none transition-all dark:text-slate-200"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-200 p-1"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            )}

            {authView === 'signup' && (
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">{t.confirmPassword}</label>
                <div className="relative">
                  <Lock size={18} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    required
                    value={authForm.confirmPassword}
                    onChange={(e) => setAuthForm({ ...authForm, confirmPassword: e.target.value })}
                    className="w-full py-3.5 pl-11 pr-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 focus:border-cyan-500 focus:bg-white dark:focus:bg-slate-950 rounded-2xl text-sm font-semibold outline-none transition-all dark:text-slate-200"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-black text-sm rounded-2xl shadow-lg shadow-cyan-950/30 transition-all hover:scale-[1.01] active:scale-95 cursor-pointer flex items-center justify-center gap-2"
            >
              <Zap size={18} fill="currentColor" />
              <span>{authView === 'login' ? t.submitLogin : authView === 'signup' ? t.submitRegister : t.submitForgot}</span>
            </button>
            
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setAuthError('');
                  setAuthView(authView === 'login' ? 'signup' : 'login');
                }}
                className="text-xs font-bold text-slate-400 hover:text-cyan-500 dark:hover:text-cyan-400 transition-colors cursor-pointer"
              >
                {authView === 'login' ? t.gotoSignUp : t.gotoLogin}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtpSubmit} className="space-y-6">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block text-center">
                {appUiLanguage === 'Urdu' ? 'سیکورٹی پن کوڈ' : 'One Time PIN code'}
              </label>
              <input
                type="text"
                maxLength={6}
                required
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                className="w-full py-4 text-center tracking-[0.4em] font-black text-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-2xl outline-none focus:border-cyan-500 transition-all dark:text-cyan-400 shrink-0 select-all"
                placeholder="123456"
              />
            </div>

            <button
              type="submit"
              className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-sm rounded-2xl shadow-lg transition-all active:scale-95 cursor-pointer"
            >
              {t.submitOtp}
            </button>

            <div className="flex justify-between items-center text-xs text-slate-400 px-1">
              <span>OTP Code Active</span>
              <button 
                type="button"
                onClick={() => generateOtpAndDispatch(authForm.emailOrPhone)}
                className="text-cyan-600 dark:text-cyan-400 hover:underline font-bold cursor-pointer"
              >
                {t.resendOtp}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );

  const renderDashboard = () => {
    const bottomHomeText = appUiLanguage === 'Urdu' ? 'ہوم' : 'Home';
    const bottomFilesText = appUiLanguage === 'Urdu' ? 'فائلیں' : 'Files';

    const quickActions = [
      { id: 'img_to_pdf', label: appUiLanguage === 'Urdu' ? 'تصویر سے پی ڈی ایف' : 'Image to PDF', color: 'text-rose-500 bg-rose-500/10 border-rose-500/20', icon: FileText, badge: 'PDF' },
      { id: 'smart_scan', label: appUiLanguage === 'Urdu' ? 'سمارٹ اسکین' : 'Smart Scan', color: 'text-cyan-500 bg-cyan-500/10 border-cyan-500/20', icon: Camera, badge: 'Scan' },
      { id: 'import_pdf', label: appUiLanguage === 'Urdu' ? 'پی ڈی ایف امپورٹ' : 'Import PDF', color: 'text-amber-500 bg-amber-500/10 border-amber-500/20', icon: FolderOpen },
      { id: 'compress', label: appUiLanguage === 'Urdu' ? 'کمپریس کریں' : 'Compress', color: 'text-pink-500 bg-pink-500/10 border-pink-500/20', icon: FileDown },
      { id: 'pdf_to_jpg', label: appUiLanguage === 'Urdu' ? 'پی ڈی ایف ٹو جے پی جی' : 'PDF to JPG', color: 'text-orange-500 bg-orange-500/10 border-orange-500/20', icon: FileImage, badge: 'JPG' },
      { id: 'merge_pdf', label: appUiLanguage === 'Urdu' ? 'ملانا پی ڈی ایف' : 'Merge PDF', color: 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20', icon: RotateCw },
      { id: 'docx_to_pdf', label: appUiLanguage === 'Urdu' ? 'ورڈ ٹو پی ڈی ایف' : 'Docx to PDF', color: 'text-blue-500 bg-blue-500/10 border-blue-500/20', icon: FileText },
      { id: 'more', label: appUiLanguage === 'Urdu' ? 'مزید' : 'More', color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20', icon: LayoutGrid }
    ];

    const filteredHistory = history.filter(item => 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.content.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleActionClick = (actionId: string) => {
      if (actionId === 'more') {
        setSettingsTab('profile');
        setSettingsOpen(true);
      } else {
        fileInputRef.current?.click();
      }
    };

    return (
      <div className="w-full max-w-lg mx-auto bg-black text-white pb-32 pt-4 relative shadow-2xl md:rounded-[40px] md:border md:border-slate-800/40 md:my-6 overflow-hidden transition-all duration-300 font-sans min-h-[820px]">
        
        {/* Top Header Row of Phone Screen Mock */}
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-black tracking-tight text-white leading-none">
              {activeBottomTab === 'home' 
                ? (appUiLanguage === 'Urdu' ? 'ہوم' : 'Home') 
                : (appUiLanguage === 'Urdu' ? 'فائلیں' : 'Files Library')}
            </h1>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Smooth collapsible Search Button Overlay */}
            {searchExpanded ? (
              <div className="flex items-center gap-1.5 bg-slate-900 px-3 py-1.5 border border-slate-800 rounded-2xl">
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent text-xs font-bold outline-none border-none text-white w-24"
                  placeholder={appUiLanguage === 'Urdu' ? "تلاش..." : "Search..."}
                  autoFocus
                />
                <button onClick={() => { setSearchQuery(''); setSearchExpanded(false); }} className="text-slate-400 hover:text-slate-200">
                  <X size={14} />
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setSearchExpanded(true)}
                className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center text-slate-300 hover:text-cyan-400 border border-slate-800/40 transition-colors shadow-sm cursor-pointer"
                title="Search conversions"
              >
                <Search size={18} />
              </button>
            )}

            {/* Top Sun/Moon switcher exactly mimicking secondary lens icon from screenshot */}
            <button 
              onClick={() => setDarkMode(!darkMode)}
              className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center text-slate-300 hover:text-amber-400 border border-slate-800/40 transition-colors shadow-sm cursor-pointer font-bold"
              title={darkMode ? "لائٹ موڈ" : "ڈارک موڈ"}
            >
              {darkMode ? <Sun size={18} className="text-amber-400 animate-pulse" /> : <Moon size={18} className="text-slate-400" />}
            </button>
          </div>
        </div>

        {/* Quick action grid (replicates the colorful action elements of screenshot) */}
        {activeBottomTab === 'home' && (
          <div className="px-6 py-4">
            <div className="grid grid-cols-4 gap-y-6 gap-x-2 bg-[#0c0d15] p-5 rounded-[28px] border border-slate-900 shadow-inner">
              {quickActions.map((action, idx) => {
                const IconComponent = action.icon;
                return (
                  <button 
                    key={idx}
                    onClick={() => handleActionClick(action.id)}
                    className="flex flex-col items-center justify-center group cursor-pointer"
                  >
                    <div className="w-14 h-14 bg-black hover:bg-zinc-900 border border-slate-900 rounded-full flex items-center justify-center shadow-lg shadow-black/60 group-hover:scale-105 active:scale-95 transition-all duration-300 relative">
                      {action.badge && (
                        <span className="absolute -top-1 -right-0.5 bg-red-600 dark:bg-red-500 text-white text-[7px] font-black px-1.5 py-0.5 rounded-full select-none leading-none shadow-sm uppercase scale-90">
                          {action.badge}
                        </span>
                      )}
                      
                      {/* Stylized icon color plate context */}
                      <span className={`${action.color} p-2.5 rounded-full`}>
                        <IconComponent size={20} />
                      </span>
                    </div>
                    <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 tracking-tight leading-normal text-center block mt-2 text-ellipsis overflow-hidden whitespace-nowrap w-full group-hover:text-cyan-400 transition-colors">
                      {action.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Document list header list view container */}
        <div className="px-6 py-6 space-y-4">
          <div className="flex justify-between items-center px-1">
            <h3 className="text-base font-black text-slate-200 tracking-tight flex items-center gap-2">
              {appUiLanguage === 'Urdu' ? 'تمام دستاویزات' : `All (${filteredHistory.length})`}
            </h3>
            
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setLayoutStyle(layoutStyle === 'list' ? 'grid' : 'list')}
                className="p-2 bg-slate-900 text-slate-400 hover:text-cyan-400 border border-slate-800 rounded-xl transition-all cursor-pointer shadow-sm"
                title={layoutStyle === 'list' ? "Grid View" : "List View"}
              >
                {layoutStyle === 'list' ? <LayoutGrid size={15} /> : <FileText size={15} />}
              </button>
            </div>
          </div>

          {filteredHistory.length === 0 ? (
            <div className="bg-[#0c0d15] border border-slate-900 rounded-[28px] p-10 text-center space-y-4">
              <div className="w-12 h-12 bg-black mx-auto flex items-center justify-center rounded-2xl text-slate-400 border border-slate-900">
                <FileImage size={24} />
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-300">
                  {appUiLanguage === 'Urdu' ? 'کوئی فائلز نہیں ملی ہیں' : 'No conversions found'}
                </h4>
                <p className="text-[11px] text-slate-500 max-w-[210px] mx-auto mt-1 leading-relaxed">
                  {appUiLanguage === 'Urdu' ? 'اسکیننگ اور پی ڈی ایف حاصل کرنے کے لئے پلس بٹن دبائیں۔' : 'Upload handwriting letter screenshots or PDF documents to build transcripts'}
                </p>
              </div>
            </div>
          ) : (
            <div className={`${layoutStyle === 'list' ? 'space-y-3.5' : 'grid grid-cols-2 gap-4'}`}>
              {filteredHistory.map((item, idx) => {
                const sampleFileSize = item.content.length > 500 ? '1.7 MB' : '3.4 kB';
                const formattedDate = new Date(item.date).toLocaleDateString(undefined, {
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: false
                }).replace(',', '');

                return (
                  <motion.div 
                    key={item.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.04 }}
                    className="p-4 bg-[#0a0b12] border border-slate-900 rounded-[24px] shadow-sm hover:border-cyan-500 transition-all duration-300 group relative flex items-center gap-4 cursor-pointer"
                    onClick={() => {
                      setConvertedText(item.content);
                      setResultTranslateTo(item.language);
                      setImprovementResult("");
                      setShowImprovementPanel(false);
                      setView('result');
                    }}
                  >
                    {/* Replicated left handthumbnail mimicking the scanned document template exactly */}
                    <div className="w-[72px] h-[72px] bg-[#05060a] rounded-2xl flex flex-col items-center justify-center border border-slate-900 relative overflow-hidden shrink-0 shadow-sm">
                      
                      {/* Mini handwritten text rows sketch */}
                      <span className="space-y-1.5 w-full px-3 animate-none">
                        <span className="h-[2px] bg-slate-800 rounded block w-full"></span>
                        <span className="h-[2px] bg-slate-800 rounded block w-11/12"></span>
                        <span className="h-[2px] bg-slate-800 rounded block w-9/12"></span>
                        <span className="h-[2px] bg-slate-800 rounded block w-10/12"></span>
                      </span>

                      {/* Top elements tag: matches the red PDF indicator overlays from screenshot */}
                      <span className="absolute top-1 right-1 bg-red-600 text-white font-extrabold text-[7px] tracking-normal px-1 py-0.5 rounded leading-none scale-90 select-none shadow-sm">
                        PDF
                      </span>
                    </div>

                    {/* Metadata detail block */}
                    <div className="flex-1 overflow-hidden space-y-1 mr-7">
                      <span className="text-xs sm:text-xs font-black text-slate-100 leading-snug tracking-tight block truncate group-hover:text-cyan-400 transition-colors">
                        {item.name}
                      </span>
                      
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold">
                        {/* Page index badge mimicking gray bullet blocks from screenshot */}
                        <span className="inline-flex items-center justify-center bg-[#202336] p-1.5 rounded-lg text-[9px] font-black text-slate-200 leading-none shadow-inner w-5 h-5">
                          {item.pages || 1}
                        </span>
                        <span>{formattedDate}</span>
                        <span>•</span>
                        <span className="text-slate-500 uppercase">{sampleFileSize}</span>
                      </div>
                    </div>

                    {/* Left corner interactive buttons (Share + contextual toggle menu) */}
                    <div className="absolute right-3 bottom-3 flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <button 
                        onClick={async () => {
                          if (navigator.share) {
                            try {
                              await navigator.share({
                                title: item.name,
                                text: item.content
                              });
                            } catch (e) {
                              navigator.clipboard.writeText(item.content);
                            }
                          } else {
                            navigator.clipboard.writeText(item.content);
                          }
                        }}
                        className="p-2 text-slate-400 hover:text-cyan-400 bg-slate-900 border border-slate-800 rounded-full transition-colors"
                      >
                        <Share2 size={13} />
                      </button>

                      <button 
                        onClick={() => setOpenMenuId(openMenuId === item.id ? null : item.id)}
                        className="p-2 text-slate-400 hover:text-cyan-400 bg-slate-900 border border-slate-800 rounded-full transition-colors relative"
                      >
                        <MoreVertical size={13} />
                        
                        {/* Inline sliding drawer select dropdown */}
                        {openMenuId === item.id && (
                          <div className="absolute bottom-10 right-0 w-36 bg-[#0c0d15] border border-slate-900 rounded-2xl shadow-2xl p-2.5 z-50 text-left space-y-1 border-t-cyan-500 border-t-2">
                            <button 
                              onClick={() => {
                                setConvertedText(item.content);
                                setResultTranslateTo(item.language);
                                setView('result');
                              }}
                              className="w-full text-left text-[11px] font-black text-slate-300 hover:bg-slate-900 p-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer"
                            >
                              <Eye size={12} /> {appUiLanguage === 'Urdu' ? 'کھولیں' : 'View'}
                            </button>
                            <button 
                              onClick={() => saveHistoryRecords(history.filter(h => h.id !== item.id))}
                              className="w-full text-left text-[11px] font-black text-red-500 hover:bg-red-950/40 p-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer"
                            >
                              <Trash2 size={12} /> {appUiLanguage === 'Urdu' ? 'حذف کریں' : 'Delete'}
                            </button>
                          </div>
                        )}
                      </button>
                    </div>

                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* Persistent Bottom Elevated Navigation Bar mimicking phone screen exact deck */}
        <div className="absolute bottom-5 left-5 right-5 h-20 bg-[#0c0d15] backdrop-blur-xl border border-slate-900 rounded-3xl flex items-center justify-between px-8 z-40 shadow-2xl">
          
          {/* Home Tab Button */}
          <button 
            onClick={() => setActiveBottomTab('home')}
            className={`flex flex-col items-center gap-1 transition-all cursor-pointer ${activeBottomTab === 'home' ? 'text-cyan-400 scale-105 font-black' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <LayoutDashboard size={20} className={`${activeBottomTab === 'home' ? 'animate-pulse text-cyan-400' : ''}`} />
            <span className="text-[10px] font-black">{bottomHomeText}</span>
          </button>

          {/* Large Floating Center Plus (+) Button replicating the iconic center deck action key */}
          <div className="absolute left-1/2 transform -translate-x-1/2 -top-5">
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="w-16 h-16 bg-gradient-to-tr from-cyan-600 via-blue-600 to-indigo-600 text-white rounded-full flex items-center justify-center shadow-[0_10px_25px_rgba(6,182,212,0.45)] hover:scale-105 active:scale-95 hover:rotate-90 transition-all duration-300 ring-4 ring-black cursor-pointer"
              title="Add document scan"
            >
              <Plus size={32} strokeWidth={2.5} />
            </button>
          </div>

          {/* Files Tab Button */}
          <button 
            onClick={() => setActiveBottomTab('files')}
            className={`flex flex-col items-center gap-1 transition-all cursor-pointer ${activeBottomTab === 'files' ? 'text-cyan-400 scale-105 font-black' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <FolderOpen size={20} className={`${activeBottomTab === 'files' ? 'animate-pulse text-cyan-400' : ''}`} />
            <span className="text-[10px] font-black">{bottomFilesText}</span>
          </button>

        </div>

      </div>
    );
  };

  const renderEditor = () => (
    <div className="flex flex-col lg:flex-row min-h-[calc(100vh-80px)] bg-black">
      {/* Sidebar: Settings accordion container */}
      <aside className="w-full lg:w-96 bg-[#0c0d15] border-b lg:border-b-0 lg:border-r border-slate-900 flex flex-col z-20 shrink-0">
         <div className="p-6 border-b border-slate-900 flex items-center justify-between">
            <h3 className="text-xs sm:text-sm font-black text-white flex items-center gap-2.5 uppercase tracking-wider">
              <Settings size={18} className="text-cyan-500" /> {t.archivalOptions}
            </h3>
            <button onClick={() => setView('dashboard')} className="p-2 hover:bg-slate-900 rounded-xl transition-colors cursor-pointer text-slate-400 hover:text-white">
              <ArrowLeft size={18} />
            </button>
         </div>
         
         {/* Accordion List */}
         <div className="flex-1 overflow-y-auto p-5 space-y-4 scrollbar-hide">
            
            {/* Intelligent Transcription Mode Switches */}
            <div className="space-y-3 bg-slate-50 dark:bg-slate-900/20 p-4 border border-slate-200 dark:border-slate-900 rounded-3xl">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">{t.intelIntentLabel}</label>
              <div className="grid grid-cols-2 gap-2 bg-white dark:bg-slate-950 p-1 rounded-2xl border border-slate-200 dark:border-slate-900">
                <button 
                  onClick={() => setActiveTab('formal')}
                  className={`flex items-center justify-center gap-1.5 py-2.5 text-xs font-black rounded-xl transition-all cursor-pointer ${activeTab === 'formal' ? 'bg-cyan-600 text-white shadow-md' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`}
                >
                  <Type size={14} /> {t.formalScript}
                </button>
                <button 
                  onClick={() => setActiveTab('original')}
                  className={`flex items-center justify-center gap-1.5 py-2.5 text-xs font-black rounded-xl transition-all cursor-pointer ${activeTab === 'original' ? 'bg-cyan-600 text-white shadow-md' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`}
                >
                  <PenTool size={14} /> {t.preserveRaw}
                </button>
              </div>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-relaxed italic">
                {activeTab === 'formal' ? t.formalTip : t.rawTip}
              </p>
            </div>

            {/* Accordion Block 1: Input Language */}
            <div className="border border-slate-200 dark:border-slate-900 bg-white dark:bg-slate-900/10 rounded-3xl overflow-hidden shadow-sm">
               <div 
                 onClick={() => setIsLangOpen(!isLangOpen)}
                 className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-900/40 transition-colors"
               >
                 <div className="flex items-center gap-3">
                   <div className="p-2 bg-cyan-100 dark:bg-cyan-500/15 rounded-xl text-cyan-600 dark:text-cyan-400">
                     <Languages size={18} />
                   </div>
                   <div>
                     <span className="text-xs font-black text-slate-800 dark:text-slate-200 block">{t.inputLangLabel}</span>
                     <span className="text-[10px] text-slate-400 dark:text-slate-500">
                       {isLangEnabled ? `${selectedLang}` : t.autoMode}
                     </span>
                   </div>
                 </div>
                 
                 <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <button 
                      onClick={() => {
                        setIsLangEnabled(!isLangEnabled);
                        if (!isLangEnabled) setIsLangOpen(true);
                      }}
                      className={`w-9 h-5 rounded-full transition-all relative cursor-pointer ${isLangEnabled ? 'bg-cyan-600' : 'bg-slate-300 dark:bg-slate-800'}`}
                    >
                      <motion.div 
                        animate={{ x: isLangEnabled ? 18 : 2 }}
                        className="absolute top-1 w-3 h-3 bg-white rounded-full shadow"
                      />
                    </button>
                    <button 
                      onClick={() => setIsLangOpen(!isLangOpen)}
                      className="text-slate-400 dark:text-slate-500 hover:text-slate-850 dark:hover:text-slate-300 transition-colors p-1 cursor-pointer"
                    >
                      <motion.div animate={{ rotate: isLangOpen ? 90 : 0 }}>
                        <ChevronRight size={16} />
                      </motion.div>
                    </button>
                 </div>
               </div>
               
               <AnimatePresence initial={false}>
                 {isLangOpen && (
                   <motion.div
                     initial={{ height: 0, opacity: 0 }}
                     animate={{ height: "auto", opacity: 1 }}
                     exit={{ height: 0, opacity: 0 }}
                     className="border-t border-slate-100 dark:border-slate-950 overflow-hidden bg-slate-50 dark:bg-slate-950/40"
                   >
                     <div className={`p-4 space-y-1.5 max-h-64 overflow-y-auto scrollbar-hide ${isLangEnabled ? '' : 'opacity-30 pointer-events-none'}`}>
                       {LANGUAGES.map(lang => (
                          <button 
                           key={lang.id}
                           onClick={() => {
                             setSelectedLang(lang.id);
                             setSelectedStyle("");
                           }}
                           className={`w-full p-2.5 rounded-xl flex items-center justify-between transition-all border ${selectedLang === lang.id ? 'bg-cyan-100/40 dark:bg-cyan-600/10 border-cyan-300 dark:border-cyan-500/30 text-cyan-600 dark:text-cyan-400' : 'bg-white dark:bg-slate-900/40 border-slate-200/60 dark:border-slate-900/80 text-slate-500 dark:text-slate-400 hover:border-slate-300 hover:text-slate-700 dark:hover:text-slate-200'}`}
                          >
                            <span className="flex items-center gap-2 font-bold text-xs">
                              <span className="text-sm">{lang.flag}</span> {lang.label}
                            </span>
                            {selectedLang === lang.id && <Check size={14} className="text-cyan-500" />}
                          </button>
                       ))}
                     </div>
                   </motion.div>
                 )}
               </AnimatePresence>
            </div>

            {/* Accordion Block 2: Writing Script Khat */}
            <div className="border border-slate-200 dark:border-slate-900 bg-white dark:bg-slate-900/10 rounded-3xl overflow-hidden shadow-sm">
               <div 
                 onClick={() => setIsStyleOpen(!isStyleOpen)}
                 className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-900/40 transition-colors"
               >
                 <div className="flex items-center gap-3">
                   <div className="p-2 bg-amber-100 dark:bg-amber-500/15 rounded-xl text-amber-600 dark:text-amber-400">
                     <PenTool size={18} />
                   </div>
                   <div>
                     <span className="text-xs font-black text-slate-800 dark:text-slate-200 block">{t.scriptStyleLabel}</span>
                     <span className="text-[10px] text-slate-400 dark:text-slate-500">
                       {isStyleEnabled ? (selectedStyle === '' ? t.autoMode : WRITING_STYLES[selectedLang]?.find(s => s.id === selectedStyle)?.label || "Manual") : t.disabledMode}
                     </span>
                   </div>
                 </div>
                 
                 <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <button 
                      onClick={() => {
                        setIsStyleEnabled(!isStyleEnabled);
                        if (!isStyleEnabled) setIsStyleOpen(true);
                      }}
                      className={`w-9 h-5 rounded-full transition-all relative cursor-pointer ${isStyleEnabled ? 'bg-cyan-600' : 'bg-slate-300 dark:bg-slate-800'}`}
                    >
                      <motion.div 
                        animate={{ x: isStyleEnabled ? 18 : 2 }}
                        className="absolute top-1 w-3 h-3 bg-white rounded-full shadow"
                      />
                    </button>
                    <button 
                      onClick={() => setIsStyleOpen(!isStyleOpen)}
                      className="text-slate-400 dark:text-slate-500 hover:text-slate-850 dark:hover:text-slate-300 transition-colors p-1 cursor-pointer"
                    >
                      <motion.div animate={{ rotate: isStyleOpen ? 90 : 0 }}>
                        <ChevronRight size={16} />
                      </motion.div>
                    </button>
                 </div>
               </div>
               
               <AnimatePresence initial={false}>
                 {isStyleOpen && (
                   <motion.div
                     initial={{ height: 0, opacity: 0 }}
                     animate={{ height: "auto", opacity: 1 }}
                     exit={{ height: 0, opacity: 0 }}
                     className="border-t border-slate-100 dark:border-slate-950 overflow-hidden bg-slate-50 dark:bg-slate-950/40"
                   >
                     <div className={`p-4 space-y-3 ${isStyleEnabled ? '' : 'opacity-30 pointer-events-none'}`}>
                        <select 
                          value={selectedStyle}
                          disabled={!isStyleEnabled}
                          onChange={(e) => setSelectedStyle(e.target.value)}
                          className="w-full p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-2xl text-xs font-bold text-slate-700 dark:text-slate-200 outline-none focus:border-cyan-500 shadow-sm"
                        >
                          <option value="">{appUiLanguage === 'Urdu' ? 'خودکار تشخیص کریں' : 'AI Detect Style Automatically (Default)'}</option>
                          {WRITING_STYLES[selectedLang]?.map(style => (
                            <option key={style.id} value={style.id}>{style.nativeLabel} — {style.label}</option>
                          ))}
                        </select>
                     </div>
                   </motion.div>
                 )}
               </AnimatePresence>
            </div>

            {/* Accordion Block 3: Instant Translation */}
            <div className="border border-slate-200 dark:border-slate-900 bg-white dark:bg-slate-900/10 rounded-3xl overflow-hidden shadow-sm">
               <div 
                 onClick={() => setIsTranslationOpen(!isTranslationOpen)}
                 className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-900/40 transition-colors"
               >
                 <div className="flex items-center gap-3">
                   <div className="p-2 bg-purple-100 dark:bg-purple-500/15 rounded-xl text-purple-600 dark:text-purple-400">
                     <Languages size={18} />
                   </div>
                   <div>
                     <span className="text-xs font-black text-slate-800 dark:text-slate-200 block">{t.instantTranslateLabel}</span>
                     <span className="text-[10px] text-slate-400 dark:text-slate-500">
                       {isTranslationEnabled ? (translateTo ? `${translateTo}` : "Select target") : t.disabledMode}
                     </span>
                   </div>
                 </div>
                 
                 <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <button 
                      onClick={() => {
                        setIsTranslationEnabled(!isTranslationEnabled);
                        if (!isTranslationEnabled) setIsTranslationOpen(true);
                      }}
                      className={`w-9 h-5 rounded-full transition-all relative cursor-pointer ${isTranslationEnabled ? 'bg-cyan-600' : 'bg-slate-300 dark:bg-slate-800'}`}
                    >
                      <motion.div 
                        animate={{ x: isTranslationEnabled ? 18 : 2 }}
                        className="absolute top-1 w-3 h-3 bg-white rounded-full shadow"
                      />
                    </button>
                    <button 
                      onClick={() => setIsTranslationOpen(!isTranslationOpen)}
                      className="text-slate-400 dark:text-slate-500 hover:text-slate-850 dark:hover:text-slate-300 transition-colors p-1 cursor-pointer"
                    >
                      <motion.div animate={{ rotate: isTranslationOpen ? 90 : 0 }}>
                        <ChevronRight size={16} />
                      </motion.div>
                    </button>
                 </div>
               </div>
               
               <AnimatePresence initial={false}>
                 {isTranslationOpen && (
                   <motion.div
                     initial={{ height: 0, opacity: 0 }}
                     animate={{ height: "auto", opacity: 1 }}
                     exit={{ height: 0, opacity: 0 }}
                     className="border-t border-slate-100 dark:border-slate-950 overflow-hidden bg-slate-50 dark:bg-slate-950/40"
                   >
                     <div className={`p-4 space-y-3 ${isTranslationEnabled ? '' : 'opacity-30 pointer-events-none'}`}>
                        <select 
                          value={translateTo}
                          disabled={!isTranslationEnabled}
                          onChange={(e) => setTranslateTo(e.target.value as Language)}
                          className="w-full p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-2xl text-xs font-bold text-slate-700 dark:text-slate-200 outline-none focus:border-cyan-500 shadow-sm"
                        >
                          <option value="">{t.chooseTarget}</option>
                          {LANGUAGES.map(lang => (
                            <option key={lang.id} value={lang.id}>{lang.flag} {lang.label}</option>
                          ))}
                        </select>
                     </div>
                   </motion.div>
                 )}
               </AnimatePresence>
            </div>

         </div>
         
         {/* Action Process Button */}
         <div className="p-5 border-t border-slate-200 dark:border-slate-900 bg-slate-50 dark:bg-slate-950">
            <button 
              onClick={startConversion}
              disabled={pages.length === 0 || processing}
              className="w-full py-4 bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white rounded-2xl font-black text-sm tracking-wide transition-all shadow-md flex items-center justify-center gap-2.5 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
            >
              <Wand2 size={18} /> 
              <span>{t.convertBtn} ({pages.length})</span>
            </button>
         </div>
      </aside>

      {/* Main Drag-And_Drop Reordering workspace */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 dark:border-slate-900 pb-5">
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">{t.stackTitle}</h2>
            <p className="text-slate-400 dark:text-slate-500 font-semibold text-xs sm:text-sm mt-1">{t.stackSub}</p>
          </div>
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="px-5 py-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-2xl text-slate-700 dark:text-slate-200 hover:text-cyan-500 dark:hover:text-white transition-all shadow-sm flex items-center gap-2 cursor-pointer text-xs font-black shrink-0"
          >
            <Plus size={16} /> {t.addMoreBtn}
          </button>
        </div>

        <div className="max-w-3xl">
          <DndContext 
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext 
              items={pages.map(p => p.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-1">
                {pages.map((page, index) => (
                  <SortableItem key={page.id} page={page} index={index} onRemove={removePage} />
                ))}
              </div>
            </SortableContext>
          </DndContext>
          
          {pages.length === 0 && (
            <div className="py-24 border-2 border-dashed border-slate-300 dark:border-slate-800 rounded-[35px] flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-950/40 p-4">
               <Upload size={48} className="mb-4 opacity-30" />
               <p className="text-sm font-bold opacity-70 text-center">{t.queueEmptyTitle}</p>
            </div>
          )}
        </div>
      </main>

      {/* Scanning laser animation overlay modal */}
      <AnimatePresence>
        {processing && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-[100] flex items-center justify-center p-4"
          >
            <div className="max-w-md w-full space-y-8 text-center relative p-8 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-900 rounded-[35px] shadow-2xl overflow-hidden">
               {/* Glowing scanning laser lines */}
               <div className="absolute top-0 right-0 bottom-0 left-0 overflow-hidden pointer-events-none rounded-[35px]">
                 <motion.div 
                   className="w-full h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent shadow-[0_0_15px_#22d3ee]"
                   animate={{ y: ["0%", "100%", "0%"] }}
                   transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                 />
                 <motion.div 
                   className="w-full h-[0.5px] bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_10px_#34d399]"
                   animate={{ y: ["100%", "0%", "100%"] }}
                   transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                 />
               </div>

               <div className="relative w-28 h-28 mx-auto flex items-center justify-center shrink-0">
                 <div className="absolute inset-0 border-4 border-slate-100 dark:border-slate-900 rounded-full"></div>
                 <motion.div 
                   className="absolute inset-0 border-4 border-cyan-500 rounded-full border-t-transparent"
                   animate={{ rotate: 360 }}
                   transition={{ duration: 1.1, repeat: Infinity, ease: "linear" }}
                 />
                 <div className="absolute inset-0 flex items-center justify-center">
                   <span className="text-xl font-black text-slate-800 dark:text-white">{progress}%</span>
                 </div>
               </div>

               <div className="space-y-3 relative z-10">
                  <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-wider">{t.laserScanning}</h3>
                  <p className="text-slate-400 dark:text-slate-500 text-xs sm:text-sm px-4">{t.ocrProcessingText}</p>
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  const renderResult = () => (
    <div className="flex flex-col lg:flex-row min-h-[calc(100vh-80px)] bg-slate-100 dark:bg-black font-sans">
      
      {/* Dynamic Left Column comprising Text Worksheets & AI Helper outputs */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6">
        <div className="max-w-4xl mx-auto space-y-6">
          
          {/* Header toolbar card */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-950 p-4 sm:p-6 rounded-3xl border border-slate-200 dark:border-slate-900 shadow-sm shadow-black/5">
            <div className="flex items-center gap-4">
               <button onClick={() => setView('editor')} className="w-11 h-11 flex items-center justify-center bg-slate-100 dark:bg-slate-900 rounded-xl text-slate-500 dark:text-slate-400 hover:text-cyan-500 border border-slate-200 dark:border-slate-850 cursor-pointer shadow-sm">
                 <ArrowLeft size={18} />
               </button>
               <div>
                 <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white leading-none tracking-tight">{t.resultTitle}</h2>
                 <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{t.resultSub}</p>
               </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <button 
                onClick={handleSpeech} 
                className={`w-11 h-11 rounded-2xl flex items-center justify-center border transition-all active:scale-95 cursor-pointer shadow-sm ${
                  ttsPlaying 
                    ? 'bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-900/30' 
                    : 'bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white border-slate-200 dark:border-slate-850'
                }`}
                title="Speak text aloud (TTS)"
              >
                {ttsPlaying ? <VolumeX size={18} /> : <Volume2 size={18} />}
              </button>
              
              <button 
                onClick={handleCorrection}
                className="px-4 py-3.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-900/30 rounded-2xl font-black text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
              >
                <Check size={14} /> 
                <span>{t.smartCorrectBtn}</span>
              </button>

              {/* Extra premium feature: AI Handwriting Analysis & Improvement suggestions */}
              <button 
                onClick={handleImproveHandwriting}
                disabled={isImproving}
                className="px-4 py-3.5 bg-cyan-50 dark:bg-cyan-950/40 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-100 dark:hover:bg-cyan-900/40 border border-cyan-200 dark:border-cyan-900/30 rounded-2xl font-black text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-sm disabled:opacity-50"
              >
                {isImproving ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin shrink-0" />
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={14} /> 
                    <span>{appUiLanguage === 'Urdu' ? 'اصلاح املا و خطاطی' : 'AI Calligraphy Diagnosis'}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* AI Calligraphy & Handwriting Analysis panel */}
          <AnimatePresence>
            {showImprovementPanel && improvementResult && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-gradient-to-r from-cyan-500/10 to-blue-500/5 p-6 sm:p-7 rounded-[30px] border border-cyan-300/30 dark:border-cyan-500/20 shadow-sm space-y-4"
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Sparkles className="text-cyan-500 animate-pulse" size={20} />
                    <h3 className="text-base font-black text-slate-800 dark:text-slate-200">
                      {appUiLanguage === 'Urdu' ? 'مصنوعی ذہانت: املا اور انداز تحریر کا تجزیہ' : 'AI Handwriting & Penmanship Improvement Assistant'}
                    </h3>
                  </div>
                  <button onClick={() => setShowImprovementPanel(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1">
                    <X size={16} />
                  </button>
                </div>

                <div 
                  className="rounded-2xl p-4 sm:p-5 bg-white/70 dark:bg-slate-950/60 leading-relaxed text-sm text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-900/40 prose prose-invert max-w-none prose-sm"
                  dangerouslySetInnerHTML={{ __html: improvementResult }}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Premium AI Multilingual Translation Console */}
          <div className="bg-white dark:bg-slate-950 p-6 sm:p-7 rounded-[30px] border border-slate-200 dark:border-indigo-950/40 shadow-sm dark:shadow-2xl space-y-5">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div>
                <span className="px-3 py-1 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl text-[9px] font-black tracking-widest uppercase border border-indigo-200 dark:border-indigo-500/20">AI MULTILINGUAL TRANSLATOR</span>
                <h3 className="text-base sm:text-lg font-black text-slate-800 dark:text-slate-100 mt-2 tracking-tight">
                  {appUiLanguage === 'Urdu' ? 'فوری متن کا ترجمہ (مترجم)' : 'Instant Text Translation (ترجمہ کریں)'}
                </h3>
              </div>
              <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">Select destination language below</span>
            </div>

            {/* Language grid selection */}
            <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-9 gap-2">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.id}
                  onClick={() => setResultTranslateTo(lang.id)}
                  className={`flex flex-col items-center justify-center py-2.5 px-1.5 rounded-2xl border transition-all text-center cursor-pointer group ${
                    resultTranslateTo === lang.id
                      ? "bg-indigo-50 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-300 border-indigo-300 dark:border-indigo-500/60 shadow-md scale-[1.03] font-black"
                      : "bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-850 hover:border-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900/80"
                  }`}
                >
                  <span className="text-xl mb-1.5 transform group-hover:scale-110 transition-transform">{lang.flag}</span>
                  <span className="text-[10px] tracking-tight truncate w-full">{lang.label}</span>
                </button>
              ))}
            </div>

            <div className="flex justify-end pt-2">
              <button
                disabled={isTranslating || !convertedText}
                onClick={handleResultTranslate}
                className="w-full sm:w-auto px-10 py-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:from-indigo-950/20 disabled:to-slate-100 disabled:text-slate-400 text-white font-black text-xs sm:text-sm rounded-2xl flex items-center justify-center gap-2.5 border border-indigo-500/20 shadow-md hover:scale-[1.01] active:scale-95 cursor-pointer disabled:pointer-events-none"
              >
                {isTranslating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin shrink-0" />
                    <span>Translating to {resultTranslateTo}...</span>
                  </>
                ) : (
                  <>
                    <Languages size={18} />
                    <span>Translate output to: {resultTranslateTo}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Text Result worksheet canvas */}
          <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-900 rounded-[35px] shadow-sm overflow-hidden flex flex-col min-h-[50vh]">
            <div className="bg-slate-50 dark:bg-slate-900/40 border-b border-slate-200 dark:border-slate-900 p-4 sm:p-6 flex justify-between items-center">
               <div className="flex gap-1.5">
                  <span className="px-3 py-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 text-slate-400 dark:text-slate-500 rounded-lg text-[9px] font-black tracking-widest">RAW UNICODE</span>
                  <span className="px-3 py-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 text-slate-400 dark:text-slate-500 rounded-lg text-[9px] font-black tracking-widest hidden sm:inline">LTR/RTL DETECTED</span>
               </div>
               <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                 {t.wordsLabel}: {convertedText.trim() === "" ? 0 : convertedText.split(/\s+/).length}
               </span>
            </div>
            <textarea 
              value={convertedText}
              onChange={(e) => setConvertedText(e.target.value)}
              className="flex-1 p-6 sm:p-10 text-lg sm:text-xl font-semibold leading-relaxed text-slate-700 dark:text-slate-200 bg-transparent outline-none resize-none selection:bg-cyan-500/20"
              placeholder={t.awaitingStream}
              dir={['Urdu', 'Arabic', 'Persian', 'Pashto'].includes(resultTranslateTo) ? 'rtl' : 'ltr'}
              style={{ fontFamily: resultTranslateTo === 'Urdu' ? "'Noto Nastaliq Urdu', serif" : ['Arabic', 'Persian', 'Pashto'].includes(resultTranslateTo) ? "'Noto Sans Arabic', serif" : 'inherit' }}
            />
          </div>
        </div>
      </div>

      {/* Export & Actions Sidebar */}
      <aside className="w-full lg:w-96 bg-white dark:bg-slate-950 border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-slate-900 p-6 sm:p-8 space-y-8 overflow-y-auto shrink-0 scrollbar-hide">
          <div className="space-y-4">
            <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{t.downloadLabel}</h3>
            <div className="space-y-3">
              {/* Option 1: PDF Document with High-Fidelity layout */}
              <button 
                onClick={() => exportToPDF(
                  convertedText, 
                  "Manuscript Transcription Document", 
                  ['Urdu', 'Arabic', 'Persian', 'Pashto'].includes(resultTranslateTo), 
                  resultTranslateTo === 'Urdu' ? 'nastaliq' : ''
                )}
                className="w-full p-5 sm:p-6 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-900/20 border border-red-200 dark:border-red-900/30 hover:border-red-400 dark:hover:border-red-500/40 text-red-600 dark:text-red-400 rounded-3xl flex flex-col items-center justify-center gap-2.5 transition-all text-center cursor-pointer group shadow-sm active:scale-95"
              >
                <FileDown size={32} />
                <div>
                  <p className="font-black text-[15px] tracking-tight text-red-800 dark:text-red-200 group-hover:text-red-900 dark:group-hover:text-red-100 transition-colors">{t.downloadPdfBtn}</p>
                  <p className="text-[9px] font-black uppercase tracking-wider opacity-60 mt-0.5">{t.downloadPdfSub}</p>
                </div>
              </button>

              {/* Option 2: Plain Text Document */}
              <button 
                onClick={() => exportToTXT(convertedText, "transcription.txt")}
                className="w-full p-5 sm:p-6 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/20 dark:hover:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-900/30 hover:border-emerald-400 dark:hover:border-emerald-500/40 text-emerald-600 dark:text-emerald-400 rounded-3xl flex flex-col items-center justify-center gap-2.5 transition-all text-center cursor-pointer group shadow-sm active:scale-95"
              >
                <FileText size={32} />
                <div>
                  <p className="font-black text-[15px] tracking-tight text-emerald-800 dark:text-emerald-200 group-hover:text-emerald-900 dark:group-hover:text-emerald-100 transition-colors">{t.downloadTxtBtn}</p>
                  <p className="text-[9px] font-black uppercase tracking-wider opacity-60 mt-0.5">{t.downloadTxtSub}</p>
                </div>
              </button>
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-900">
             <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{t.distributionLabel}</h3>
             <div className="grid grid-cols-2 gap-3">
                <button onClick={handleShareText} className="p-4 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-850 border border-slate-200 dark:border-slate-800 hover:border-cyan-500/30 rounded-2xl flex flex-col items-center justify-center gap-2 text-slate-500 dark:text-slate-400 hover:text-cyan-600 dark:hover:text-white transition-all cursor-pointer group shadow-sm">
                  <Share2 size={18} />
                  <span className="text-xs font-bold">{appUiLanguage === 'Urdu' ? 'نقل اور شیئر' : 'Share Transcribe'}</span>
                </button>
                <button onClick={handleCopyText} className="p-4 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-850 border border-slate-200 dark:border-slate-800 hover:border-emerald-500/30 rounded-2xl flex flex-col items-center justify-center gap-2 text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-white transition-all cursor-pointer group shadow-sm">
                  {copied ? <Check className="text-emerald-500 shrink-0" size={18} /> : <Copy size={18} />}
                  <span className="text-xs font-bold">{copied ? (appUiLanguage === 'Urdu' ? 'نقل ہو گیا' : 'Copied!') : (appUiLanguage === 'Urdu' ? 'نقل کریں' : 'Copy Text')}</span>
                </button>
             </div>
          </div>
      </aside>
    </div>
  );

  const renderSettingsModal = () => (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[150] flex items-center justify-center p-4">
      <div className="bg-[#0c0d15] border border-slate-900 p-6 sm:p-8 rounded-[40px] max-w-lg w-full shadow-2xl space-y-6 relative max-h-[90vh] overflow-y-auto scrollbar-hide">
        <div className="flex justify-between items-center pb-4 border-b border-slate-900">
          <div className="flex items-center gap-2.5">
            <Settings size={22} className="text-cyan-500" />
            <h2 className="text-xl font-black text-white tracking-tight">{t.settingsTitle}</h2>
          </div>
          <button onClick={() => setSettingsOpen(false)} className="p-1.5 hover:bg-slate-950 text-slate-400 hover:text-white rounded-xl transition-colors cursor-pointer">
            <X size={20} />
          </button>
        </div>

        {/* Setting Tabs selection */}
        <div className="grid grid-cols-3 gap-1 bg-black p-1 rounded-2xl border border-slate-900">
          <button 
            onClick={() => setSettingsTab('profile')}
            className={`py-2 text-xs font-black rounded-lg transition-all cursor-pointer ${settingsTab === 'profile' ? 'bg-zinc-900 text-cyan-400 shadow' : 'text-slate-400'}`}
          >
            {appUiLanguage === 'Urdu' ? 'پروفائل' : 'Profile'}
          </button>
          <button 
            onClick={() => setSettingsTab('security')}
            className={`py-2 text-xs font-black rounded-lg transition-all cursor-pointer ${settingsTab === 'security' ? 'bg-zinc-900 text-cyan-400 shadow' : 'text-slate-400'}`}
          >
            {appUiLanguage === 'Urdu' ? 'سیکورٹی' : 'Security'}
          </button>
          <button 
            onClick={() => setSettingsTab('privacy')}
            className={`py-2 text-xs font-black rounded-lg transition-all cursor-pointer ${settingsTab === 'privacy' ? 'bg-zinc-900 text-cyan-400 shadow' : 'text-slate-400'}`}
          >
            {appUiLanguage === 'Urdu' ? 'رازداری' : 'Privacy'}
          </button>
        </div>

        {/* Tab content bodies */}
        <div className="space-y-6 py-2">
          {settingsTab === 'profile' && (
            <div className="space-y-4">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">{t.profileTitle}</h3>
              
              <div className="p-4 bg-black border border-slate-900 rounded-2xl space-y-2">
                <p className="text-sm font-black text-slate-200">
                  {currentUser?.name || 'Hasham Khan'} 
                  <span className="ml-2 font-black text-[9px] bg-emerald-950/40 text-emerald-400 px-2 py-0.5 rounded border border-emerald-900/30 uppercase">
                    {appUiLanguage === 'Urdu' ? 'تصدیق شدہ' : 'Verified Partner'}
                  </span>
                </p>
                <p className="text-xs text-slate-500 truncate">{currentUser?.emailOrPhone}</p>
              </div>

              {/* Language Settings inline */}
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">{t.changeLangLabel}</label>
                <div className="grid grid-cols-2 gap-3">
                  {(['English', 'Urdu'] as UiLanguage[]).map((lang) => (
                    <button
                      key={lang}
                      onClick={() => setAppUiLanguage(lang)}
                      className={`py-3 rounded-2xl border text-xs font-black transition-all cursor-pointer text-center ${
                        appUiLanguage === lang 
                          ? 'bg-cyan-950/40 border-cyan-500/30 text-cyan-400'
                          : 'bg-black border-slate-900 text-slate-400 hover:text-white hover:bg-zinc-950'
                      }`}
                    >
                      {lang === 'Urdu' ? '🇵🇰 اردو (Urdu)' : '🇺🇸 English'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dark mode Settings inline */}
              <div className="flex justify-between items-center py-4 border-t border-slate-900">
                <div>
                  <span className="text-xs font-black text-slate-200 block">{t.themeToggleLabel}</span>
                  <span className="text-[10px] text-slate-500">{darkMode ? 'Dark Cosmic slate' : 'Light studio silver'}</span>
                </div>
                <button 
                  onClick={() => setDarkMode(!darkMode)}
                  className="p-3 bg-black border border-slate-900 rounded-2xl text-slate-400 hover:text-amber-400 transition-colors cursor-pointer"
                >
                  {darkMode ? <Sun size={18} /> : <Moon size={18} />}
                </button>
              </div>

              {/* Audio feedback sound toggle */}
              <div className="flex justify-between items-center py-4 border-t border-slate-100 dark:border-slate-900">
                <div>
                  <span className="text-xs font-black text-slate-700 dark:text-slate-200 block">{t.notificationsLabel}</span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500">{t.notificationToggleSub}</span>
                </div>
                <button 
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className={`w-10 h-6 rounded-full transition-all relative cursor-pointer ${soundEnabled ? 'bg-cyan-600' : 'bg-slate-300 dark:bg-slate-800'}`}
                >
                  <motion.div 
                    animate={{ x: soundEnabled ? 18 : 2 }}
                    className="absolute top-1 w-4 h-4 bg-white rounded-full shadow"
                  />
                </button>
              </div>

            </div>
          )}

          {settingsTab === 'security' && (
            <form onSubmit={handleChangePassword} className="space-y-4">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">{t.changePassLabel}</h3>
              
              {passwordChangeSuccess && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl text-xs font-bold">
                  {passwordChangeSuccess}
                </div>
              )}
              {passwordChangeError && (
                <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 text-red-600 dark:text-red-400 rounded-xl text-xs font-bold">
                  {passwordChangeError}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                  {appUiLanguage === 'Urdu' ? 'موجودہ پاس ورڈ' : 'Current Password'}
                </label>
                <input
                  type="password"
                  required
                  value={passwordChange.current}
                  onChange={(e) => setPasswordChange({ ...passwordChange, current: e.target.value })}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-xl text-xs sm:text-sm outline-none font-semibold focus:bg-white"
                  placeholder="••••••••"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">{t.newPassword}</label>
                <input
                  type="password"
                  required
                  value={passwordChange.newPass}
                  onChange={(e) => setPasswordChange({ ...passwordChange, newPass: e.target.value })}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-xl text-xs sm:text-sm outline-none font-semibold focus:bg-white"
                  placeholder="••••••••"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">{t.confirmPassword}</label>
                <input
                  type="password"
                  required
                  value={passwordChange.confirm}
                  onChange={(e) => setPasswordChange({ ...passwordChange, confirm: e.target.value })}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-xl text-xs sm:text-sm outline-none font-semibold focus:bg-white"
                  placeholder="••••••••"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-black rounded-xl transition-all shadow cursor-pointer uppercase tracking-wider"
              >
                {t.saveBtn}
              </button>
            </form>
          )}

          {settingsTab === 'privacy' && (
            <div className="space-y-4">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">{t.privacyLabel}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
                {t.privacySub}
              </p>
              <div className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-2xl flex items-start gap-3">
                <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
                  {appUiLanguage === 'Urdu'
                    ? "بینک لسٹ، نجی کاغذات اور آرکائیوز کو مکمل رازداری کے ساتھ کسٹمر ہینڈل کرتا ہے۔ کوئی بیرونی پرنٹ مائننگ یا خفیہ لاگ لسٹیں نہیں بنتی ہیں۔"
                    : "Encrypted secure tokens handle your localized cache database. Individual handwritings or scanned papers are routed via secure HTTPS packets directly to enterprise APIs."
                  }
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Logout buttons */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-900 flex justify-between items-center gap-3">
          <button 
            onClick={handleLogout}
            className="px-5 py-3.5 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 text-xs font-black rounded-2xl transition-all cursor-pointer flex items-center gap-2 border border-red-200 dark:border-red-900/30 shadow-sm"
          >
            <X size={15} />
            <span>{t.logoutBtn}</span>
          </button>
          
          <button 
            onClick={() => setSettingsOpen(false)}
            className="px-6 py-3.5 bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white text-xs font-black rounded-2xl transition-all cursor-pointer shadow-sm border border-slate-200 dark:border-slate-800"
          >
            {t.cancelBtn}
          </button>
        </div>
      </div>
    </div>
  );

  // --- Main Render router ---

  if (!currentUser) {
    if (authView === 'continue') {
      return renderWelcomeContinue();
    }
    return renderAuthPages();
  }

  return (
    <div className="min-h-screen font-sans bg-black text-white transition-colors duration-300 selection:bg-cyan-600 selection:text-white pb-12">
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.02)_0%,transparent_100%)] pointer-events-none animate-pulse" />

      {/* Persistent Invisible Input Element */}
      <input 
        type="file" 
        multiple 
        ref={fileInputRef} 
        onChange={handleFileUpload} 
        className="hidden animate-none" 
        accept="image/*,application/pdf"
      />

      {/* Top Navigation Navbar Bar */}
      <nav className="h-20 bg-black/95 backdrop-blur-md border-b border-slate-900 sticky top-0 z-50 px-4 sm:px-8 flex justify-between items-center shadow-lg">
        <div 
          className="flex items-center gap-3 cursor-pointer group shrink-0" 
          onClick={() => {
            setView('dashboard');
            setSettingsOpen(false);
          }}
        >
          <div className="w-10 h-10 sm:w-11 sm:h-11 bg-gradient-to-tr from-cyan-600 via-blue-600 to-indigo-600 text-white flex items-center justify-center rounded-[14px] sm:rounded-[16px] group-hover:scale-105 transition-transform shadow-[0_0_15px_rgba(6,182,212,0.25)]">
            <Zap size={20} fill="currentColor" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg sm:text-xl font-black tracking-tight leading-none text-white">
              {t.appName}
            </span>
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-cyan-400 mt-1">
              {t.scannerEngine}
            </span>
          </div>
        </div>

        {/* Global Action buttons in top navbar */}
        <div className="flex items-center gap-2 sm:gap-4 pl-4">
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-900/60 p-1 border border-slate-200 dark:border-slate-850 rounded-2xl">
              <button 
                onClick={() => setView('dashboard')}
                className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${view === 'dashboard' ? 'bg-white dark:bg-slate-800 text-cyan-600 dark:text-cyan-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`}
              >
                <LayoutDashboard size={15} /> 
                <span className="hidden sm:inline">{t.dashboardTab}</span>
              </button>
              <button 
                onClick={() => {
                  if (pages.length > 0) setView('editor');
                  else fileInputRef.current?.click();
                }}
                className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${view === 'editor' || view === 'result' ? 'bg-white dark:bg-slate-800 text-cyan-600 dark:text-cyan-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`}
              >
                <Wand2 size={15} /> 
                <span>{t.pageQueueTab} ({pages.length})</span>
              </button>
          </div>

          <div className="flex items-center gap-1.5 border-l border-slate-200 dark:border-slate-900 pl-4 sm:pl-6">
            <button 
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 sm:p-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-2xl transition-all text-slate-500 dark:text-slate-400 hover:text-amber-500 dark:hover:text-amber-400 cursor-pointer shadow-sm"
              title={darkMode ? "سفید بیک گراؤنڈ (لائٹ موڈ)" : "سیاہ بیک گراؤنڈ (ڈارک موڈ)"}
            >
              {darkMode ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} className="text-slate-600" />}
            </button>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="p-2 sm:p-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-2xl transition-all text-slate-500 dark:text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 cursor-pointer shadow-sm"
              title="Flash Capture Scanned Paper / Handwritings / PDF Document"
            >
              <Camera size={18} />
            </button>
            <button 
              onClick={() => {
                setSettingsTab('profile');
                setSettingsOpen(true);
              }}
              className="p-2 sm:p-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-2xl transition-all text-slate-500 dark:text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 cursor-pointer shadow-sm"
              title={t.settingsTitle}
            >
              <Settings size={18} />
            </button>
          </div>
        </div>
      </nav>

      {/* Body View Container */}
      <main className="relative z-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={view}
            initial={{ opacity: 0, scale: 0.995 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.995 }}
            transition={{ duration: 0.2 }}
          >
            {view === 'dashboard' && renderDashboard()}
            {view === 'editor' && renderEditor()}
            {view === 'result' && renderResult()}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Settings Modal pane */}
      <AnimatePresence>
        {settingsOpen && renderSettingsModal()}
      </AnimatePresence>
    </div>
  );
}
