export type Language = 'Urdu' | 'English' | 'Pashto' | 'Hindi' | 'Persian' | 'Arabic' | 'Chinese' | 'Turkish';

export interface WritingStyle {
  id: string;
  label: string;
  nativeLabel: string;
}

export const LANGUAGES: { id: Language; label: string; flag: string }[] = [
  { id: 'English', label: 'English', flag: '🇺🇸' },
  { id: 'Urdu', label: 'Urdu', flag: '🇵🇰' },
  { id: 'Pashto', label: 'Pashto', flag: '🇦🇫' },
  { id: 'Arabic', label: 'Arabic', flag: '🇸🇦' },
  { id: 'Persian', label: 'Persian', flag: '🇮🇷' },
  { id: 'Hindi', label: 'Hindi', flag: '🇮🇳' },
  { id: 'Chinese', label: 'Chinese', flag: '🇨🇳' },
  { id: 'Turkish', label: 'Turkish', flag: '🇹🇷' },
];

export const WRITING_STYLES: Record<Language, WritingStyle[]> = {
  Urdu: [
    { id: 'nastaliq', label: 'Nastaliq (نستعلیق)', nativeLabel: 'نستعلیق' },
    { id: 'naskh', label: 'Naskh (نسخ)', nativeLabel: 'نسخ' },
    { id: 'riqa', label: 'Riqa (رقعہ)', nativeLabel: 'رقعہ' },
    { id: 'thuluth', label: 'Thuluth (ثلث)', nativeLabel: 'ثلث' },
    { id: 'shikasta', label: 'Shikasta (شکستہ)', nativeLabel: 'شکستہ' },
    { id: 'modern', label: 'Modern (جدید)', nativeLabel: 'جدید تحریر' },
    { id: 'literary', label: 'Literary (ادبی)', nativeLabel: 'ادبی خط' },
  ],
  English: [
    { id: 'cursive', label: 'Cursive / Script', nativeLabel: 'Cursive Writing' },
    { id: 'block', label: 'Clear Block', nativeLabel: 'Block Letters' },
    { id: 'calligraphic', label: 'Calligraphic', nativeLabel: 'Calligraphic Style' },
    { id: 'gothic', label: 'Gothic / Blackletter', nativeLabel: 'Gothic Style' },
    { id: 'modern_sans', label: 'Modern Sans', nativeLabel: 'Modern Sans' },
    { id: 'italic', label: 'Italic / Slanted', nativeLabel: 'Italic Style' },
    { id: 'handwritten', label: 'Casual Hand', nativeLabel: 'Casual Handwriting' },
  ],
  Pashto: [
    { id: 'naskh', label: 'Naskh (نسخ)', nativeLabel: 'نسخ' },
    { id: 'nastaliq', label: 'Nastaliq (نستعلیق)', nativeLabel: 'نستعلیق' },
    { id: 'riqa', label: 'Riqa (رقعہ)', nativeLabel: 'رقعہ' },
    { id: 'modern', label: 'Modern', nativeLabel: 'جدید لیکنه' },
  ],
  Arabic: [
    { id: 'naskh', label: 'Naskh (نسخ)', nativeLabel: 'نسخ' },
    { id: 'thuluth', label: 'Thuluth (ثلث)', nativeLabel: 'ثلث' },
    { id: 'diwani', label: 'Diwani (دیوانی)', nativeLabel: 'دیوانی' },
    { id: 'kufic', label: 'Kufic (کوفی)', nativeLabel: 'کوفی' },
    { id: 'riqa', label: 'Riqa (رقعہ)', nativeLabel: 'رقعہ' },
    { id: 'maghrebi', label: 'Maghrebi', nativeLabel: 'مغربی' },
  ],
  Persian: [
    { id: 'nastaliq', label: 'Nastaliq (نستعلیق)', nativeLabel: 'نستعلیق' },
    { id: 'shekaste', label: 'Shikasta (شکستہ)', nativeLabel: 'شکستہ' },
    { id: 'naskh', label: 'Naskh (نسخ)', nativeLabel: 'نسخ' },
    { id: 'tahriri', label: 'Tahriri', nativeLabel: 'تحریری' },
  ],
  Hindi: [
    { id: 'devanagari', label: 'Standard Devanagari', nativeLabel: 'मानक देवनागरी' },
    { id: 'calligraphic', label: 'Calligraphic Hindi', nativeLabel: 'सुलेखन' },
    { id: 'slanted', label: 'Modern Slanted', nativeLabel: 'तिरछा लेखन' },
    { id: 'bold', label: 'Bold Header Style', nativeLabel: 'मोटा लेखन' },
  ],
  Chinese: [
    { id: 'kai', label: 'Regular Script (楷书)', nativeLabel: '楷书' },
    { id: 'xing', label: 'Running Script (行书)', nativeLabel: '行书' },
    { id: 'cao', label: 'Cursive Script (草书)', nativeLabel: '草书' },
    { id: 'li', label: 'Clerical Script (隶书)', nativeLabel: '隶书' },
    { id: 'modern', label: 'Simplified Modern', nativeLabel: '现代简体' },
  ],
  Turkish: [
    { id: 'latin', label: 'Standard Turkish Latin', nativeLabel: 'Standart Latin' },
    { id: 'calligraphy', label: 'Turkish Calligraphy', nativeLabel: 'Güzel Yazı' },
  ],
};
