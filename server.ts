import express from "express";
import path from "path";
import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));

  // Initialize Gemini with API key and user-agent
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY || "",
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  // Middleware to check if GEMINI_API_KEY is configured
  const checkApiKey = (req: any, res: any, next: any) => {
    if (!process.env.GEMINI_API_KEY) {
      return res.status(403).json({
        error: "GEMINI_API_KEY is not configured. Please open the 'Settings > Secrets' panel in Google AI Studio, add 'GEMINI_API_KEY' with your valid API Key, and save changes."
      });
    }
    next();
  };

  // API Route: OCR and Convert
  app.post("/api/gemini/convert", checkApiKey, async (req, res) => {
    try {
      const { images, image, options, index = 0 } = req.body;
      const modelName = "gemini-3.5-flash"; // Valid list model under guideline

      // Process single page OCR logic
      const processPage = async (imageData: string, pageIdx: number) => {
        const base64Data = imageData.split(',')[1] || imageData;
        const isPdf = imageData.includes("application/pdf") || base64Data.startsWith("JVBERi");
        const mimeType = isPdf ? "application/pdf" : "image/jpeg";
        const prompt = `
          Perform highly accurate Advanced OCR on this handwritten letter/page (Page ${pageIdx + 1}).
          Input Language: ${options.targetLanguage || 'Detect Automatically'}
          
          Category/Intent:
          ${options.category === 'original' 
            ? "Preserve the handwritten flavor exactly as it is written. Keep all abbreviations, native letter phrasing, raw structural formatting, and historical context of handwritten style." 
            : "Convert the handwritten text into a standardized, polished, formal letter or document. Modernize punctuation, correct spelling mistakes, refine sentence flow, and write as a highly professional document in its respective script."}
          
          ${options.writingStyle ? `Specific Khat/Writing Style context requested: ${options.writingStyle}` : ""}
          ${options.translateTo ? `Translate the transcribed text into: ${options.translateTo}` : ""}
          
          Important instructions:
          1. Act as an expert transcribing a personal handwritten letter ("khat") or document.
          2. Return ONLY the transcribed/translated text. Absolutely no conversational intro, greetings, or meta-explanations.
          3. For Persian/Urdu/Pashto/Arabic (RTL texts), use proper Unicode Nastaliq or standard Arabic script context and retain appropriate punctuation.
        `;

        const result = await ai.models.generateContent({
          model: modelName,
          contents: [
            prompt,
            { inlineData: { data: base64Data, mimeType: mimeType } },
          ],
          config: {
            temperature: 0.1, // Faster and more deterministic OCR parsing
            thinkingConfig: {
              thinkingLevel: ThinkingLevel.MINIMAL // Incredibly fast - disables reasoning time for pure OCR layout speed
            }
          }
        });

        return result.text?.trim() || "";
      };

      if (image) {
        // Single page fast-response execution
        const text = await processPage(image, index);
        return res.json({ text });
      }

      if (!images || !Array.isArray(images) || images.length === 0) {
        return res.status(400).json({ error: "No images provided" });
      }

      // Fallback for batch processing
      const results = await Promise.all(images.map((img: string, i: number) => processPage(img, i)));
      const combined = results.join("\n\n---\n\n").trim();
      res.json({ text: combined });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: err.message || "Failed during transcription" });
    }
  });

  // API Route: Smart Correct
  app.post("/api/gemini/correct", checkApiKey, async (req, res) => {
    try {
      const { text, language } = req.body;
      const modelName = "gemini-3.5-flash";

      const prompt = `
        You are an expert handwriting archivist and copyeditor. 
        Review and clean up this converted handwritten letter text ("khat") in ${language || 'the detected language'}.
        Correct any spelling errors, spacing mistakes, and obvious OCR garbage, but keep the authentic paragraph breaks.
        Return ONLY the corrected, highly elegant text. Do not write any greetings or explanations.
        
        Text:
        ${text}
      `;

      const result = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
          thinkingConfig: {
            thinkingLevel: ThinkingLevel.MINIMAL // Skip thinking latency to correct text instantly
          }
        }
      });

      res.json({ text: result.text?.trim() || "" });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: err.message || "Correction failed" });
    }
  });

  // API Route: Translate Text
  app.post("/api/gemini/translate", checkApiKey, async (req, res) => {
    try {
      const { text, targetLanguage } = req.body;
      if (!text || !targetLanguage) {
        return res.status(400).json({ error: "Missing text or targetLanguage parameters" });
      }

      const modelName = "gemini-3.5-flash";
      const prompt = `
        You are a professional literary translator specializing in manuscript and archives style translations.
        Translate the following document transcription directly into the "${targetLanguage}" language.
        
        Guidelines:
        1. Maintain the precise format, line/paragraph breaks, and style of the original.
        2. Deliver a fluid, natural translation in the target script (e.g., proper Urdu Urdu Unicode, modern standard Arabic, Noto Arabic/Persian/Pashto scripts, Devanagari Hindi script, or Turkish standard characters).
        3. Do NOT add any extra introductory notes, commentary, tags, or conversational explanations.
        4. Return ONLY the translated document text and nothing else.
        
        Original Text to Translate:
        ${text}
      `;

      const result = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
          thinkingConfig: {
            thinkingLevel: ThinkingLevel.MINIMAL // Instantaneous translation processing
          }
        }
      });

      res.json({ text: result.text?.trim() || "" });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: err.message || "Translation failed" });
    }
  });

  // API Route: Improve Handwriting & Text Style
  app.post("/api/gemini/improve", checkApiKey, async (req, res) => {
    try {
      const { text, language } = req.body;
      if (!text) {
        return res.status(400).json({ error: "Missing text parameter" });
      }

      const modelName = "gemini-3.5-flash";
      const prompt = `
        You are an elite linguistic expert and professional calligraphy coach.
        Analyze this document text transcribed from raw handwriting in the language: "${language || 'Automatic'}".
        Deliver a highly polished response with these two distinct parts, formatted with simple clean HTML (e.g., using <strong>, <ul>, <li> tags):
        
        1. <strong>[REFINED DOCUMENT COPY]</strong>: An upgraded, beautifully styled, grammatically pristine and elegantly punctuated copy of the original text.
        2. <strong>[CALLIGRAPHY & PENMANSHIP IMPROVEMENT SUGGESTIONS]</strong>: 3 key elegant, encouraging bullet points with actionable advice on spacing, slant, cursive alignment, or stroke consistency to improve the penmanship of this handwriting style next time.
        
        Important: Return ONLY the HTML structured text response. Do NOT add any extra introductory conversational sentences or footnotes. Speak in a helpful and inspiring tone.
        
        Input Text:
        ${text}
      `;

      const result = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
          thinkingConfig: {
            thinkingLevel: ThinkingLevel.MINIMAL // Disable reasoning latency for ultra-fast styling outputs
          }
        }
      });

      res.json({ text: result.text?.trim() || "" });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: err.message || "Improvement failed" });
    }
  });

  // Vite middleware setup
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: any, res: any) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
