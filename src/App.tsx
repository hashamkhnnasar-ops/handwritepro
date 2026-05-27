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
  FileJson,
  Moon,
  Sun,
  LayoutDashboard,
  Trash2,
  GripVertical,
  Maximize2,
  Wand2,
  Volume2,
  Share2,
  Zap,
  Plus,
  ArrowLeft,
  PenTool,
  Type,
  FileDown
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
import { ocrAndConvert, suggestCorrections, translateText } from './services/geminiService';
import { exportToPDF, exportToTXT } from './services/exportService';

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

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative group bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-xl hover:border-slate-700/80 transition-all duration-300 mb-4 flex items-center gap-4"
    >
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-slate-500 hover:text-slate-300 p-1">
        <GripVertical size={20} />
      </div>
      <div className="relative">
        <img src={page.url} alt="Page" className="w-20 h-24 object-cover rounded-xl border border-slate-800 shadow-2xl" />
        <span className="absolute -top-2.5 -left-2.5 w-6 h-6 bg-cyan-600 text-white text-[10px] flex items-center justify-center rounded-full font-black shadow-[0_0_10px_rgba(6,182,212,0.4)]">
          {index + 1}
        </span>
      </div>
      <div className="flex-1 overflow-hidden">
        <p className="text-sm font-bold text-slate-200 truncate">{page.file.name}</p>
        <p className="text-xs text-slate-500 mt-0.5">{(page.file.size / 1024).toFixed(1)} KB • Image</p>
      </div>
      <button 
        onClick={() => onRemove(page.id)}
        className="opacity-0 group-hover:opacity-100 transition-opacity bg-red-950/40 text-red-400 hover:text-red-300 hover:bg-red-900/40 p-2.5 rounded-xl border border-red-900/30"
      >
        <Trash2 size={18} />
      </button>
    </div>
  );
};

export default function App() {
  const [view, setView] = useState<'dashboard' | 'editor' | 'result'>('dashboard');
  
  // App defaulted permanently to stunning premium black/dark mode for realistic feel
  const [darkMode, setDarkMode] = useState(true);
  
  const [pages, setPages] = useState<ScannedPage[]>([]);
  const [history, setHistory] = useState<DocumentRecord[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [convertedText, setConvertedText] = useState("");
  const [activeTab, setActiveTab] = useState<'original' | 'formal'>('formal');
  const [selectedLang, setSelectedLang] = useState<Language>('English');
  const [selectedStyle, setSelectedStyle] = useState<string>("");
  const [translateTo, setTranslateTo] = useState<Language | "">("");
  
  // Independent feature switches (Enabled / Disabled)
  const [isLangEnabled, setIsLangEnabled] = useState(true);
  const [isStyleEnabled, setIsStyleEnabled] = useState(false);
  const [isTranslationEnabled, setIsTranslationEnabled] = useState(false);
  
  // Independent accordion expand/collapse states (Open / Closed)
  const [isLangOpen, setIsLangOpen] = useState(true);
  const [isStyleOpen, setIsStyleOpen] = useState(false);
  const [isTranslationOpen, setIsTranslationOpen] = useState(false);

  // Dynamic Translation states in Results Screen
  const [resultTranslateTo, setResultTranslateTo] = useState<Language>('Urdu');
  const [isTranslating, setIsTranslating] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // --- Handlers ---

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newPages: ScannedPage[] = [];
    const options = {
      maxSizeMB: 0.2, // Extremely lightweight (max 200KB) for ultra-fast upload & processing
      maxWidthOrHeight: 1200, // Outstanding crispness for OCR but significantly faster to read than 2048px
      useWebWorker: true,
    };

    for (const file of Array.from(files)) {
      try {
        const compressedFile = (await (imageCompression as any)(file, options)) as File;
        const url = URL.createObjectURL(compressedFile);
        newPages.push({
          id: Math.random().toString(36).substring(2, 11),
          url,
          file: compressedFile,
        });
      } catch (error) {
        console.error("Compression error:", error);
      }
    }

    setPages(prev => [...prev, ...newPages]);
    if (view === 'dashboard') setView('editor');
    e.target.value = '';
  };

  const removePage = (id: string) => {
    setPages(pages.filter(p => p.id !== id));
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
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
    setProgress(0);

    try {
      const imageUrls = await Promise.all(pages.map(async (p) => {
        return new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(p.file);
        });
      }));

      // Directly calls optimized backend parallel transcription proxy
      const text = await ocrAndConvert(imageUrls, {
        category: activeTab,
        targetLanguage: isLangEnabled ? selectedLang : undefined as any,
        writingStyle: isStyleEnabled ? selectedStyle : undefined,
        translateTo: (isTranslationEnabled && translateTo) ? (translateTo as Language) : undefined,
      }, (p) => setProgress(p));

      setConvertedText(text);
      setResultTranslateTo((isTranslationEnabled && translateTo) ? (translateTo as Language) : selectedLang);
      
      const newRecord: DocumentRecord = {
        id: Math.random().toString(36).substring(2, 11),
        name: `Letter Archive ${history.length + 1}`,
        date: new Date().toISOString(),
        pages: pages.length,
        content: text,
        status: 'completed',
        language: translateTo as Language || selectedLang
      };
      
      setHistory([newRecord, ...history]);
      setView('result');
      
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#06b6d4', '#3b82f6', '#10b981']
      });
    } catch (error) {
      console.error(error);
      alert("Note: Conversion failed. Make sure your local Express server with GEMINI_API_KEY is running and check console log.");
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
      confetti({
        particleCount: 80,
        spread: 50,
        origin: { y: 0.85 },
        colors: ['#a855f7', '#06b6d4', '#10b981']
      });
    } catch (error: any) {
      console.error(error);
      alert("Translation failed. Details: " + error.message);
    } finally {
      setIsTranslating(false);
    }
  };

  const handleSpeech = () => {
    const utterance = new SpeechSynthesisUtterance(convertedText);
    utterance.lang = (translateTo || selectedLang) === 'English' ? 'en-US' : (translateTo || selectedLang).toLowerCase();
    window.speechSynthesis.speak(utterance);
  };

  // --- Effects ---

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // --- Render Helpers ---

  const renderDashboard = () => (
    <div className="p-8 max-w-7xl mx-auto space-y-12">
      {/* Hero Section */}
      <div className="flex flex-col lg:flex-row gap-12 items-center justify-between py-12 relative">
        {/* Subtle decorative glow in top right */}
        <div className="absolute right-0 top-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />
        
        <div className="space-y-6 max-w-2xl text-center lg:text-left relative z-10">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 border border-slate-800 text-cyan-400 rounded-full text-xs font-black tracking-widest uppercase shadow-md"
          >
            <Zap size={14} className="animate-pulse" fill="currentColor" /> AI HANDWRITTEN LETTER ARCHIVIST
          </motion.div>
          
          <h1 className="text-5xl lg:text-7xl font-black text-white leading-[1.1] tracking-tight">
            Transcribe raw <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500">Handwritten</span> manuscripts & letters.
          </h1>
          <p className="text-lg text-slate-400 font-medium leading-relaxed">
            Convert any copy, diary pages, historical letters, or handwriting into computerized digital text in seconds. Engineered for Arabic, Urdu, Pashto, English, and more.
          </p>
          
          <div className="flex flex-wrap items-center gap-4 pt-4 justify-center lg:justify-start">
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="px-8 py-4.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-2xl font-black text-lg transition-all duration-300 shadow-[0_0_20px_rgba(6,182,212,0.35)] flex items-center gap-3 active:scale-95 cursor-pointer"
            >
              <Camera size={22} className="text-cyan-100" /> Start Uploading
            </button>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="px-8 py-4.5 bg-slate-900 text-slate-300 rounded-2xl font-bold text-lg border border-slate-800 hover:border-slate-700 hover:text-white transition-all flex items-center gap-3 cursor-pointer"
            >
              Bulk Upload (100+ pages)
            </button>
          </div>
        </div>

        {/* Dropzone with realistic glass scanner aesthetic */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative group w-full max-w-md"
        >
          <div className="absolute inset-0 bg-cyan-500/5 blur-3xl rounded-[40px] group-hover:bg-cyan-500/10 transition-all duration-500" />
          <div className="relative bg-slate-950/80 backdrop-blur-xl p-8 rounded-[40px] shadow-[0_0_50px_rgba(0,0,0,0.8)] border border-slate-800/80 w-full">
             <div 
               className="aspect-[3/4] bg-slate-900/30 rounded-3xl border-2 border-dashed border-slate-800 hover:border-cyan-500/55 flex flex-col items-center justify-center space-y-5 p-8 text-center text-slate-500 hover:text-cyan-400 transition-all duration-300 cursor-pointer relative overflow-hidden" 
               onClick={() => fileInputRef.current?.click()}
             >
               {/* Visual scanner line reflection animation */}
               <div className="absolute top-0 left-0 right-0 h-[1px] bg-cyan-400/40 shadow-[0_0_10px_#22d3ee] pointer-events-none animate-[scan_3s_ease-in-out_infinite]" />
               
               <div className="w-20 h-20 bg-slate-950 rounded-2xl shadow-xl flex items-center justify-center text-slate-400 border border-slate-800 group-hover:border-cyan-500/30 group-hover:text-cyan-400 transition-colors">
                 <Upload size={32} />
               </div>
               
               <div className="space-y-2">
                 <p className="font-extrabold text-slate-200 group-hover:text-cyan-300 transition-colors">Drop photos of letter manuscripts here</p>
                 <p className="text-xs text-slate-500 max-w-[240px] mx-auto">Supports bulk copying and photo streams up to 100 pages concurrently</p>
               </div>
               
               <span className="text-[10px] bg-slate-950 border border-slate-800 text-slate-400 px-3 py-1 rounded-full font-black tracking-widest uppercase">
                 Scan Center Ready
               </span>
             </div>
          </div>
        </motion.div>
      </div>

      {/* Stats dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Archived Documents', value: history.length, icon: FileText, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
          { label: 'Total Pages Processed', value: history.reduce((acc, h) => acc + h.pages, 0), icon: LayoutDashboard, color: 'text-blue-400', bg: 'bg-blue-500/10' },
          { label: 'Script Support', value: 'Nastaliq + 8 More', icon: Languages, color: 'text-purple-400', bg: 'bg-purple-500/10' },
          { label: 'Handwriting Resolution', value: 'High Accuracy', icon: Check, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
        ].map((stat, i) => (
          <div key={i} className="bg-slate-950/60 p-6 rounded-3xl border border-slate-900 flex items-center gap-4 hover:border-slate-800 transition-colors">
            <div className={`w-14 h-14 ${stat.bg} rounded-2xl flex items-center justify-center ${stat.color} border border-slate-800/50`}>
              <stat.icon size={26} />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{stat.label}</p>
              <p className="text-xl font-black text-white leading-none mt-1.5">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* History */}
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
            <History size={22} className="text-cyan-500" /> Digital Archive Library
          </h2>
          <span className="text-xs font-bold text-slate-500">{history.length} Saved Manuscripts</span>
        </div>
        
        {history.length === 0 ? (
          <div className="bg-slate-950/40 border border-slate-900 rounded-[32px] p-20 text-center space-y-5">
             <div className="w-20 h-20 bg-slate-900/60 mx-auto flex items-center justify-center rounded-3xl text-slate-700 border border-slate-800">
               <FileText size={36} />
             </div>
             <div className="space-y-2">
                <h3 className="text-xl font-extrabold text-slate-300">Archive Vault is empty</h3>
                <p className="text-slate-500 max-w-sm mx-auto text-sm">Upload or capture pictures of letters to construct your digital computerized records catalog.</p>
             </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {history.map(item => (
              <motion.div 
                whileHover={{ y: -4, borderColor: 'rgba(6,182,212,0.3)' }}
                key={item.id} 
                className="bg-slate-900/40 p-6 rounded-3xl border border-slate-900 shadow-xl transition-all group"
              >
                <div className="flex justify-between items-start mb-6">
                  <div className="w-12 h-12 bg-slate-950 flex items-center justify-center rounded-2xl text-slate-400 group-hover:text-cyan-400 border border-slate-800 transition-colors">
                    <FileText size={22} />
                  </div>
                  <button onClick={() => setHistory(history.filter(h => h.id !== item.id))} className="text-slate-600 hover:text-red-400 transition-colors p-1">
                    <X size={18} />
                  </button>
                </div>
                <h4 className="text-lg font-bold text-slate-200 mb-1 group-hover:text-white transition-colors">{item.name}</h4>
                <p className="text-xs text-slate-500 mb-6">{item.pages} pages • {new Date(item.date).toLocaleDateString()}</p>
                <div className="flex items-center justify-between">
                  <span className="px-3 py-1 bg-slate-950 border border-slate-800 text-cyan-400 rounded-lg text-[10px] font-black uppercase">{item.language}</span>
                  <button 
                    onClick={() => {
                      setConvertedText(item.content);
                      setResultTranslateTo(item.language);
                      setView('result');
                    }}
                    className="w-10 h-10 bg-slate-950 hover:bg-cyan-600 border border-slate-800 text-slate-300 hover:text-white flex items-center justify-center rounded-xl transition-all cursor-pointer"
                  >
                    <ArrowRight size={18} />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderEditor = () => (
    <div className="flex h-[calc(100vh-80px)] overflow-hidden bg-black">
      {/* Sidebar: Settings accordion container */}
      <aside className="w-96 bg-slate-950 border-r border-slate-900 flex flex-col z-20">
         <div className="p-6 border-b border-slate-900 flex items-center justify-between">
            <h3 className="text-sm font-black text-white flex items-center gap-2.5 uppercase tracking-wider">
              <Settings size={18} className="text-cyan-400" /> Archival Options
            </h3>
            <button onClick={() => setView('dashboard')} className="p-2 hover:bg-slate-900 rounded-xl transition-colors cursor-pointer text-slate-400 hover:text-white">
              <ArrowLeft size={18} />
            </button>
         </div>
         
         {/* Beautiful Accordion Area for Input Language, Writing Style and Instant Translation */}
         <div className="flex-1 overflow-y-auto p-5 space-y-5 scrollbar-hide">
            
            {/* Intelligent Transcription Mode Switches */}
            <div className="space-y-3 bg-slate-900/20 p-4 border border-slate-900 rounded-3xl">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Intelligent Intent</label>
              <div className="grid grid-cols-2 gap-2 bg-slate-950/60 p-1 rounded-2xl border border-slate-900">
                <button 
                  onClick={() => setActiveTab('formal')}
                  className={`flex items-center justify-center gap-2 py-2.5 text-xs font-black rounded-xl transition-all cursor-pointer ${activeTab === 'formal' ? 'bg-cyan-600 text-white shadow-xl shadow-cyan-900/20' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  <Type size={14} /> Formal Script
                </button>
                <button 
                  onClick={() => setActiveTab('original')}
                  className={`flex items-center justify-center gap-2 py-2.5 text-xs font-black rounded-xl transition-all cursor-pointer ${activeTab === 'original' ? 'bg-cyan-600 text-white shadow-xl shadow-cyan-900/20' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  <PenTool size={14} /> Preserve Raw
                </button>
              </div>
              <p className="text-[10px] text-slate-500 leading-relaxed italic">
                {activeTab === 'formal' 
                  ? "Corrects raw handwriting syntax and spacing to standardized computerized typography." 
                  : "Retains colloquialisms, specific spelling anomalies, and raw formatting of standard letters."}
              </p>
            </div>

            {/* Accordion Block 1: Input Language */}
            <div className="border border-slate-900 bg-slate-900/10 rounded-3xl overflow-hidden transition-all duration-300">
               <div 
                 onClick={() => setIsLangOpen(!isLangOpen)}
                 className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-900/40 transition-colors"
               >
                 <div className="flex items-center gap-3">
                   <div className="p-2 bg-cyan-500/15 rounded-xl text-cyan-400">
                     <Languages size={18} />
                   </div>
                   <div>
                     <span className="text-xs font-black text-slate-200 block">Input Language</span>
                     <span className="text-[10px] text-slate-500">
                       {isLangEnabled ? `${selectedLang}` : "Auto Mode"}
                     </span>
                   </div>
                 </div>
                 
                 <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                   {/* Toggle switch */}
                   <button 
                     onClick={() => {
                       setIsLangEnabled(!isLangEnabled);
                       if (!isLangEnabled) setIsLangOpen(true);
                     }}
                     className={`w-9 h-5 rounded-full transition-all relative cursor-pointer ${isLangEnabled ? 'bg-cyan-600' : 'bg-slate-800'}`}
                     title={isLangEnabled ? "Turn Off Input Language" : "Turn On Input Language"}
                   >
                     <motion.div 
                       animate={{ x: isLangEnabled ? 18 : 2 }}
                       className="absolute top-1 w-3 h-3 bg-white rounded-full shadow-md"
                     />
                   </button>
                   {/* Expand/Collapse Chevron */}
                   <button 
                     onClick={() => setIsLangOpen(!isLangOpen)}
                     className="text-slate-500 hover:text-slate-300 transition-colors p-1 cursor-pointer"
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
                     transition={{ duration: 0.2 }}
                     className="border-t border-slate-950 overflow-hidden bg-slate-950/40"
                   >
                     <div className={`p-4 space-y-2 ${isLangEnabled ? '' : 'opacity-30 pointer-events-none'}`}>
                       {LANGUAGES.map(lang => (
                         <button 
                          key={lang.id}
                          onClick={() => {
                            setSelectedLang(lang.id);
                            setSelectedStyle("");
                          }}
                          className={`w-full p-3 rounded-2xl flex items-center justify-between transition-all border ${selectedLang === lang.id ? 'bg-cyan-600/10 border-cyan-500/30 text-cyan-400' : 'bg-slate-900/40 border-slate-900/80 text-slate-400 hover:border-slate-800 hover:text-slate-200'}`}
                         >
                           <span className="flex items-center gap-2.5 font-bold text-xs">
                             <span className="text-sm">{lang.flag}</span> {lang.label}
                           </span>
                           {selectedLang === lang.id && <Check size={14} className="text-cyan-400" />}
                         </button>
                       ))}
                     </div>
                   </motion.div>
                 )}
               </AnimatePresence>
            </div>

            {/* Accordion Block 2: Writing Script Style (Khat) */}
            <div className="border border-slate-900 bg-slate-900/10 rounded-3xl overflow-hidden transition-all duration-300">
               <div 
                 onClick={() => setIsStyleOpen(!isStyleOpen)}
                 className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-900/40 transition-colors"
               >
                 <div className="flex items-center gap-3">
                   <div className="p-2 bg-amber-500/15 rounded-xl text-amber-400">
                     <PenTool size={18} />
                   </div>
                   <div>
                     <span className="text-xs font-black text-slate-200 block">Writing Style (Khat)</span>
                     <span className="text-[10px] text-slate-500">
                       {isStyleEnabled ? (selectedStyle === '' ? "Auto Style" : WRITING_STYLES[selectedLang]?.find(s => s.id === selectedStyle)?.label || "Manual Style") : "Disabled"}
                     </span>
                   </div>
                 </div>
                 
                 <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                   {/* Toggle switch */}
                   <button 
                     onClick={() => {
                       setIsStyleEnabled(!isStyleEnabled);
                       if (!isStyleEnabled) setIsStyleOpen(true);
                     }}
                     className={`w-9 h-5 rounded-full transition-all relative cursor-pointer ${isStyleEnabled ? 'bg-cyan-600' : 'bg-slate-800'}`}
                     title={isStyleEnabled ? "Turn Off Style Context" : "Turn On Style Context"}
                   >
                     <motion.div 
                       animate={{ x: isStyleEnabled ? 18 : 2 }}
                       className="absolute top-1 w-3 h-3 bg-white rounded-full shadow-md"
                     />
                   </button>
                   {/* Expand/Collapse Chevron */}
                   <button 
                     onClick={() => setIsStyleOpen(!isStyleOpen)}
                     className="text-slate-500 hover:text-slate-300 transition-colors p-1 cursor-pointer"
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
                     transition={{ duration: 0.2 }}
                     className="border-t border-slate-950 overflow-hidden bg-slate-950/40"
                   >
                     <div className={`p-4 space-y-3 ${isStyleEnabled ? '' : 'opacity-30 pointer-events-none'}`}>
                       <select 
                         value={selectedStyle}
                         disabled={!isStyleEnabled}
                         onChange={(e) => setSelectedStyle(e.target.value)}
                         className="w-full p-4 bg-slate-900 border border-slate-850 rounded-2xl text-xs font-bold text-slate-200 outline-none focus:border-cyan-500/50 transition-colors"
                       >
                         <option value="">AI Detect Style Automatically (Default)</option>
                         {WRITING_STYLES[selectedLang]?.map(style => (
                           <option key={style.id} value={style.id}>{style.nativeLabel} — {style.label}</option>
                         ))}
                       </select>
                       <p className="text-[10px] text-slate-500 leading-relaxed italic">
                         Informs OCR engine of custom calligraphy parameters like Nastaleq, Shikasta, Naskh or Cursive.
                       </p>
                     </div>
                   </motion.div>
                 )}
               </AnimatePresence>
            </div>

            {/* Accordion Block 3: Instant Translation */}
            <div className="border border-slate-900 bg-slate-900/10 rounded-3xl overflow-hidden transition-all duration-300">
               <div 
                 onClick={() => setIsTranslationOpen(!isTranslationOpen)}
                 className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-900/40 transition-colors"
               >
                 <div className="flex items-center gap-3">
                   <div className="p-2 bg-purple-500/15 rounded-xl text-purple-400">
                     <Languages size={18} />
                   </div>
                   <div>
                     <span className="text-xs font-black text-slate-200 block">Instant Translation</span>
                     <span className="text-[10px] text-slate-500">
                       {isTranslationEnabled ? (translateTo ? `To: ${translateTo}` : "Select target") : "Disabled"}
                     </span>
                   </div>
                 </div>
                 
                 <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                   {/* Toggle switch */}
                   <button 
                     onClick={() => {
                       setIsTranslationEnabled(!isTranslationEnabled);
                       if (!isTranslationEnabled) setIsTranslationOpen(true);
                     }}
                     className={`w-9 h-5 rounded-full transition-all relative cursor-pointer ${isTranslationEnabled ? 'bg-cyan-600' : 'bg-slate-800'}`}
                     title={isTranslationEnabled ? "Turn Off Translation" : "Turn On Translation"}
                   >
                     <motion.div 
                       animate={{ x: isTranslationEnabled ? 18 : 2 }}
                       className="absolute top-1 w-3 h-3 bg-white rounded-full shadow-md"
                     />
                   </button>
                   {/* Expand/Collapse Chevron */}
                   <button 
                     onClick={() => setIsTranslationOpen(!isTranslationOpen)}
                     className="text-slate-500 hover:text-slate-300 transition-colors p-1 cursor-pointer"
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
                     transition={{ duration: 0.2 }}
                     className="border-t border-slate-950 overflow-hidden bg-slate-950/40"
                   >
                     <div className={`p-4 space-y-3 ${isTranslationEnabled ? '' : 'opacity-30 pointer-events-none'}`}>
                       <select 
                         value={translateTo}
                         disabled={!isTranslationEnabled}
                         onChange={(e) => setTranslateTo(e.target.value as Language)}
                         className="w-full p-4 bg-slate-900 border border-slate-850 rounded-2xl text-xs font-bold text-slate-200 outline-none focus:border-cyan-500/50 transition-colors"
                       >
                         <option value="">Choose Target Language</option>
                         {LANGUAGES.map(lang => (
                           <option key={lang.id} value={lang.id}>{lang.flag} Translate to {lang.label}</option>
                         ))}
                       </select>
                       <p className="text-[10px] text-slate-500 leading-relaxed italic">
                         Translates transcribed manuscript outputs into another target dictionary instantly.
                       </p>
                     </div>
                   </motion.div>
                 )}
               </AnimatePresence>
            </div>

         </div>
         
         {/* Action Process Button */}
         <div className="p-5 border-t border-slate-900">
            <button 
              onClick={startConversion}
              disabled={pages.length === 0 || processing}
              className="w-full py-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-2xl font-black text-base transition-all shadow-[0_4px_15px_rgba(6,182,212,0.25)] flex items-center justify-center gap-2.5 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
            >
              <Wand2 size={20} /> Convert {pages.length} Pages Now
            </button>
         </div>
      </aside>

      {/* Main Area: Page Reordering List */}
      <main className="flex-1 overflow-y-auto p-12 space-y-8 scrollbar-hide">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h2 className="text-3xl font-black text-white tracking-tight">Manuscript Stack</h2>
            <p className="text-slate-500 font-semibold mt-1 text-sm">Drag to reorder/flow. Set logical chronologies of handwritten pages.</p>
          </div>
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="px-6 py-3.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-2xl text-slate-200 font-bold text-sm hover:text-white transition-all flex items-center gap-2 cursor-pointer"
          >
            <Plus size={18} /> Add More Pages
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
            <div className="py-24 border-2 border-dashed border-slate-800 rounded-[35px] flex flex-col items-center justify-center text-slate-500">
               <Upload size={48} className="mb-4 opacity-30" />
               <p className="text-sm font-bold opacity-70">Capture pages to begin transcription</p>
            </div>
          )}
        </div>
      </main>

      {/* Holographic Interactive Laser Scanner Overlay */}
      <AnimatePresence>
        {processing && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 backdrop-blur-md z-[100] flex items-center justify-center p-8"
          >
            <div className="max-w-md w-full space-y-8 text-center relative p-8 bg-slate-950 border border-slate-800 rounded-[35px] shadow-[0_0_50px_rgba(6,182,212,0.15)] overflow-hidden">
               
               {/* Holographic Glowing laser scanning bar moving up and down the viewport */}
               <div className="absolute top-0 right-0 bottom-0 left-0 overflow-hidden pointer-events-none rounded-[35px]">
                 <motion.div 
                   className="w-full h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_15px_#22d3ee]"
                   animate={{ y: ["0%", "100%", "0%"] }}
                   transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                 />
                 {/* Secondary green laser */}
                 <motion.div 
                   className="w-full h-[0.5px] bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_10px_#34d399]"
                   animate={{ y: ["100%", "0%", "100%"] }}
                   transition={{ duration: 2.7, repeat: Infinity, ease: "easeInOut" }}
                 />
               </div>

               <div className="relative w-32 h-32 mx-auto flex items-center justify-center">
                 <div className="absolute inset-0 border-4 border-slate-900 rounded-full"></div>
                 <motion.div 
                   className="absolute inset-0 border-4 border-cyan-500 rounded-full border-t-transparent"
                   animate={{ rotate: 360 }}
                   transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
                 />
                 <div className="absolute inset-0 flex items-center justify-center">
                   <span className="text-2xl font-black text-white">{progress}%</span>
                 </div>
               </div>

               <div className="space-y-4 relative z-10">
                  <h3 className="text-xl font-black text-white tracking-tight uppercase tracking-wider">OCR Scanner Analysing...</h3>
                  <div className="flex justify-center gap-1.5">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <motion.div
                        key={i}
                        animate={{ scale: [1, 1.4, 1], opacity: [0.4, 1, 0.4] }}
                        transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
                        className={`w-2 h-2 rounded-full ${progress > (i * 25) ? 'bg-cyan-400' : 'bg-slate-800'}`}
                      />
                    ))}
                  </div>
                  <p className="text-slate-500 text-xs">Processing {pages.length} pages in parallel with Gemini LLMOCR</p>
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  const renderResult = () => (
    <div className="flex h-[calc(100vh-80px)] overflow-hidden bg-black">
      <div className="flex-1 overflow-y-auto p-12 space-y-8 scrollbar-hide">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="flex justify-between items-center bg-slate-950 p-6 rounded-3xl border border-slate-900 shadow-xl">
            <div className="flex items-center gap-4">
               <button onClick={() => setView('editor')} className="w-12 h-12 flex items-center justify-center bg-slate-900 rounded-2xl text-slate-400 hover:text-cyan-400 border border-slate-800 transition-colors cursor-pointer">
                 <ArrowLeft size={22} />
               </button>
               <div>
                 <h2 className="text-xl font-black text-white leading-none tracking-tight">Transcribed Text</h2>
                 <p className="text-xs text-slate-500 mt-1">Computerized output ready for editing or publication.</p>
               </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={handleSpeech} className="w-12 h-12 bg-slate-900 text-slate-400 hover:text-white rounded-2xl flex items-center justify-center border border-slate-800 transition-all active:scale-95 cursor-pointer">
                <Volume2 size={22} />
              </button>
              <button 
                onClick={handleCorrection}
                className="px-5 py-3 bg-emerald-950/40 text-emerald-400 rounded-2xl font-black text-xs flex items-center gap-2 hover:bg-emerald-900/40 border border-emerald-900/30 transition-all cursor-pointer"
              >
                <Check size={16} /> Smart AI Correct
              </button>
            </div>
          </div>

          {/* Premium AI Multilingual Translation Console */}
          <div className="bg-gradient-to-br from-slate-950 to-slate-900/60 p-7 rounded-[30px] border border-indigo-950/40 shadow-2xl space-y-5">
            <div className="flex justify-between items-center">
              <div>
                <span className="px-3 py-1 bg-indigo-500/10 text-indigo-400 rounded-xl text-[9px] font-black tracking-widest uppercase border border-indigo-500/20">AI MULTILINGUAL TRANSLATOR</span>
                <h3 className="text-lg font-black text-slate-100 mt-2 tracking-tight">Instant Text Translation (ترجمہ کریں)</h3>
              </div>
              <span className="text-xs text-slate-500 font-medium hidden sm:inline">Select your destination language below</span>
            </div>

            <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-8 gap-2.5">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.id}
                  onClick={() => setResultTranslateTo(lang.id)}
                  className={`flex flex-col items-center justify-center py-3.5 px-3 rounded-2xl border transition-all text-center cursor-pointer group ${
                    resultTranslateTo === lang.id
                      ? "bg-indigo-600/20 text-indigo-300 border-indigo-500/60 shadow-lg shadow-indigo-950/40 scale-[1.03] font-extrabold"
                      : "bg-slate-900/50 text-slate-400 border-slate-850 hover:border-slate-700 hover:bg-slate-900/80"
                  }`}
                >
                  <span className="text-2xl mb-1.5 transform group-hover:scale-110 transition-transform">{lang.flag}</span>
                  <span className="text-xs tracking-tight">{lang.label}</span>
                </button>
              ))}
            </div>

            <div className="flex justify-end pt-2">
              <button
                disabled={isTranslating || !convertedText}
                onClick={handleResultTranslate}
                className="w-full sm:w-auto px-10 py-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:from-indigo-950/50 disabled:to-slate-900 disabled:text-slate-500 disabled:border-slate-800 disabled:cursor-not-allowed text-white font-extrabold text-sm rounded-2xl flex items-center justify-center gap-2.5 border border-indigo-500/20 shadow-xl shadow-indigo-950/30 transition-all hover:scale-[1.01] active:scale-95 cursor-pointer"
              >
                {isTranslating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    <span>Translating to {resultTranslateTo}...</span>
                  </>
                ) : (
                  <>
                    <Languages size={18} />
                    <span>Translate to {resultTranslateTo}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Premium layout holding text result */}
          <div className="bg-slate-950 border border-slate-900 rounded-[35px] shadow-[0_10px_40px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col min-h-[60vh]">
            <div className="bg-slate-900/40 border-b border-slate-900 p-6 flex justify-between items-center">
               <div className="flex gap-2">
                 {['RAW TEXT', 'UNICODE FORMAT', 'LTR/RTL DETECT'].map(tab => (
                   <span key={tab} className="px-3.5 py-1.5 bg-slate-950 border border-slate-850 text-slate-400 rounded-xl text-[9px] font-black tracking-widest uppercase">{tab}</span>
                 ))}
               </div>
               <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Words: {convertedText.trim() === "" ? 0 : convertedText.split(/\s+/).length}</span>
            </div>
            <textarea 
              value={convertedText}
              onChange={(e) => setConvertedText(e.target.value)}
              className="flex-1 p-10 text-xl font-medium leading-relaxed text-slate-200 bg-transparent outline-none resize-none selection:bg-cyan-500/35"
              placeholder="Awaiting computerized OCR stream..."
              dir={['Urdu', 'Arabic', 'Persian', 'Pashto'].includes(resultTranslateTo) ? 'rtl' : 'ltr'}
              style={{ fontFamily: resultTranslateTo === 'Urdu' ? "'Noto Nastaliq Urdu', serif" : ['Arabic', 'Persian', 'Pashto'].includes(resultTranslateTo) ? "'Noto Sans Arabic', serif" : 'inherit' }}
            />
          </div>
        </div>
      </div>

      {/* Export & Actions Sidebar */}
      <aside className="w-96 bg-slate-950 border-l border-slate-900 p-8 space-y-8 overflow-y-auto scrollbar-hide">
          <div className="space-y-4">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Download Options</h3>
            <div className="space-y-4">
              {/* Option 1: PDF Document with "Wazah Alpaz" (Pristine High-Fidelity layout) */}
              <button 
                onClick={() => exportToPDF(
                  convertedText, 
                  "Manuscript Transcription Document", 
                  ['Urdu', 'Arabic', 'Persian', 'Pashto'].includes(resultTranslateTo), 
                  resultTranslateTo === 'Urdu' ? 'nastaliq' : ''
                )}
                className="w-full p-6 bg-red-950/20 hover:bg-red-900/20 border border-red-900/30 hover:border-red-500/40 text-red-400 rounded-3xl flex flex-col items-center justify-center gap-2.5 transition-all hover:scale-[1.01] active:scale-95 shadow-lg shadow-black/80 cursor-pointer group"
              >
                <FileDown size={32} />
                <div className="text-center">
                  <p className="font-extrabold text-[15px] tracking-tight text-red-200 group-hover:text-red-100 transition-colors">Download as PDF Document</p>
                  <p className="text-[10px] font-black uppercase tracking-wider opacity-60 mt-0.5">High-Fidelity Clear Text Page (.pdf)</p>
                </div>
              </button>

              {/* Option 2: Plain Text Document */}
              <button 
                onClick={() => exportToTXT(convertedText, "transcription.txt")}
                className="w-full p-6 bg-emerald-950/20 hover:bg-emerald-900/20 border border-emerald-900/30 hover:border-emerald-500/40 text-emerald-400 rounded-3xl flex flex-col items-center justify-center gap-2.5 transition-all hover:scale-[1.01] active:scale-95 shadow-lg shadow-black/80 cursor-pointer group"
              >
                <FileText size={32} />
                <div className="text-center">
                  <p className="font-extrabold text-[15px] tracking-tight text-emerald-200 group-hover:text-emerald-100 transition-colors">Download as Text (TXT)</p>
                  <p className="text-[10px] font-black uppercase tracking-wider opacity-60 mt-0.5">Plain Unicode Text Document (.txt)</p>
                </div>
              </button>
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-slate-900">
             <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Local Distribution</h3>
             <div className="grid grid-cols-2 gap-4">
                <button className="p-4 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-cyan-500/30 rounded-2xl flex flex-col items-center justify-center gap-2 text-slate-400 hover:text-white transition-all cursor-pointer group">
                  <Share2 size={18} />
                  <span className="text-xs font-bold">Email copy</span>
                </button>
                <button className="p-4 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-emerald-500/30 rounded-2xl flex flex-col items-center justify-center gap-2 text-slate-400 hover:text-white transition-all cursor-pointer group">
                  <History size={18} />
                  <span className="text-xs font-bold">Safe Storage</span>
                </button>
             </div>
          </div>
      </aside>
    </div>
  );

  return (
    <div className="min-h-screen font-sans bg-black text-white transition-colors duration-550 selection:bg-cyan-600 selection:text-white">
      {/* Dynamic scan line background animation overlay */}
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.035)_0%,transparent_100%)] pointer-events-none" />

      {/* Top Navbar */}
      <nav className="h-20 bg-black/80 backdrop-blur-md border-b border-slate-900 sticky top-0 z-50 px-8 flex justify-between items-center">
        <div 
          className="flex items-center gap-3 cursor-pointer group" 
          onClick={() => setView('dashboard')}
        >
          <div className="w-11 h-11 bg-gradient-to-tr from-cyan-600 to-blue-600 text-white flex items-center justify-center rounded-[16px] group-hover:scale-105 transition-transform shadow-[0_0_15px_rgba(6,182,212,0.3)]">
            <Zap size={22} fill="currentColor" />
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-black tracking-tight leading-none text-white">HandWrite<span className="text-cyan-400">Pro</span></span>
            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500 mt-1">Scanner Engine 3.5</span>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="hidden lg:flex items-center gap-1.5 bg-slate-900/60 p-1.5 border border-slate-850 rounded-2xl">
              <button 
                onClick={() => setView('dashboard')}
                className={`px-5 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer ${view === 'dashboard' ? 'bg-slate-800 text-cyan-400 shadow-md border border-slate-700/50' : 'text-slate-400 hover:text-slate-200'}`}
              >
                <LayoutDashboard size={16} /> Dashboard
              </button>
              <button 
                onClick={() => {
                  if (pages.length > 0) setView('editor');
                  else fileInputRef.current?.click();
                }}
                className={`px-5 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer ${view === 'editor' || view === 'result' ? 'bg-slate-800 text-cyan-400 shadow-md border border-slate-700/50' : 'text-slate-400 hover:text-slate-200'}`}
              >
                <Wand2 size={16} /> Page Queue ({pages.length})
              </button>
          </div>

          <div className="flex items-center gap-2 border-l border-slate-900 pl-6">
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="p-3 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-2xl transition-all text-slate-400 hover:text-cyan-400 cursor-pointer"
              title="Flash Capture Scanned Paper"
            >
              <Camera size={18} />
            </button>
            <button 
              onClick={() => setDarkMode(!darkMode)}
              className="p-3 bg-slate-900 border border-slate-800 rounded-2xl transition-all text-slate-400 hover:text-amber-400 cursor-pointer"
              title="Toggle Theme Presets"
            >
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </div>
      </nav>

      <main className="relative z-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={view}
            initial={{ opacity: 0, scale: 0.99 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.99 }}
            transition={{ duration: 0.2 }}
          >
            {view === 'dashboard' && renderDashboard()}
            {view === 'editor' && renderEditor()}
            {view === 'result' && renderResult()}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Persistent Invisible Input Element */}
      <input 
        type="file" 
        multiple 
        ref={fileInputRef} 
        onChange={handleFileUpload} 
        className="hidden animate-none" 
        accept="image/*"
      />
    </div>
  );
}
