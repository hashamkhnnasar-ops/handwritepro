import { Language } from "../constants";

export interface ConversionOptions {
  category: 'original' | 'formal';
  targetLanguage: Language;
  writingStyle?: string;
  translateTo?: Language;
}

export const ocrAndConvert = async (
  images: string[], // Base64 strings
  options: ConversionOptions,
  onProgress?: (progress: number) => void
) => {
  if (onProgress) onProgress(5);

  const total = images.length;
  let completed = 0;

  try {
    // Process each image concurrently using individual parallel fetch requests
    const promises = images.map(async (img, index) => {
      const response = await fetch("/api/gemini/convert", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ image: img, options, index }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to process page ${index + 1}: status ${response.status}`);
      }

      const data = await response.json();
      completed++;
      if (onProgress) {
        onProgress(Math.round((completed / total) * 100));
      }
      return { index, text: data.text };
    });

    const results = await Promise.all(promises);
    // Sort by original index to preserve page order
    results.sort((a, b) => a.index - b.index);
    const combinedText = results.map(r => r.text).join("\n\n---\n\n").trim();

    if (onProgress) onProgress(100);
    return combinedText;
  } catch (err: any) {
    if (onProgress) onProgress(0);
    throw err;
  }
};

export const suggestCorrections = async (text: string, language: Language) => {
  const response = await fetch("/api/gemini/correct", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text, language }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  return data.text;
};

export const translateText = async (text: string, targetLanguage: Language) => {
  const response = await fetch("/api/gemini/translate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text, targetLanguage }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  return data.text;
};

