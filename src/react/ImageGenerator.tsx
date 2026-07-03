import { useState, useCallback, useEffect, useRef } from 'react';
import { generateImage, type GenerateImageResult } from '../lib/api/image-generation';
import { NSFW_CATEGORIES } from '../lib/constants';

function triggerDownload(blobUrl: string, filename: string) {
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

async function fetchImageWithRetry(url: string, maxRetries = 2): Promise<Blob> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error('API request failed');
      const contentType = res.headers.get('Content-Type') || '';
      if (!contentType.startsWith('image/')) {
        throw new Error('API returned non-image data');
      }
      return await res.blob();
    } catch (err) {
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, 1000));
        continue;
      }
      throw new Error('Failed to load image. Please try again.');
    }
  }
  throw new Error('Failed to load image. Please try again.');
}

function generateId() {
  return Math.random().toString(36).substring(2, 15);
}

interface HistoryItem {
  id: string;
  category: string;
  imageUrl: string;
  timestamp: number;
}

const defaultImageUrl = '/placeholder.svg';
const blobCache = new Map<string, string>();
const STORAGE_KEY = 'image-history-meta';

export default function ImageGenerator() {
  const [category, setCategory] = useState('pussy');
  const [loading, setLoading] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<GenerateImageResult | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [imageBlobUrl, setImageBlobUrl] = useState<string | null>(null);
  const blobUrlRef = useRef<string | null>(null);

  const revokeBlob = useCallback(() => {
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
    };
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed: HistoryItem[] = JSON.parse(saved);
        setHistory(parsed);
      }
    } catch {}
  }, []);

  useEffect(() => {
    try {
      const meta = history.map(({ id, category, imageUrl, timestamp }) => ({
        id, category, imageUrl, timestamp,
      }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(meta));
    } catch {}
  }, [history]);

  const AD_KEY = '6b97b58bf5a14cdb611470f92f6d47d0';

  useEffect(() => {
    if (!result) return;
    const container = document.getElementById('ad-container-300x250');
    if (!container) return;
    container.innerHTML = '';
    (window as any).atOptions = {
      key: AD_KEY,
      format: 'iframe',
      height: 250,
      width: 300,
      params: {},
    };
    const script = document.createElement('script');
    script.src = `https://www.highperformanceformat.com/${AD_KEY}/invoke.js`;
    script.async = true;
    container.appendChild(script);
    return () => {
      container.innerHTML = '';
    };
  }, [result]);

  const handleGenerate = useCallback(async () => {
    setLoading(true);
    setError('');
    setResult(null);
    setImageLoading(true);
    setImageBlobUrl(null);
    revokeBlob();

    try {
      const img = await generateImage(category);
      const blob = await fetchImageWithRetry(img.url);
      const blobUrl = URL.createObjectURL(blob);
      blobUrlRef.current = blobUrl;
      setImageBlobUrl(blobUrl);
      setResult(img);
      blobCache.set(img.id, blobUrl);
      const newItem: HistoryItem = {
        id: img.id,
        category: img.category,
        imageUrl: img.url,
        timestamp: Date.now(),
      };
      setHistory((prev) => [newItem, ...prev].slice(0, 50));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
      setImageLoading(false);
    } finally {
      setLoading(false);
    }
  }, [category, revokeBlob]);

  const handleHistoryClick = useCallback(async (item: HistoryItem) => {
    setCategory(item.category);
    setImageLoading(true);
    setError('');

    const cached = blobCache.get(item.id);
    if (cached) {
      setImageBlobUrl(cached);
      setImageLoading(false);
      return;
    }

    try {
      const blob = await fetchImageWithRetry(item.imageUrl);
      const blobUrl = URL.createObjectURL(blob);
      blobCache.set(item.id, blobUrl);
      blobUrlRef.current = blobUrl;
      setImageBlobUrl(blobUrl);
    } catch {
      setError('Failed to load image from history.');
    } finally {
      setImageLoading(false);
    }
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    localStorage.removeItem(STORAGE_KEY);
    blobCache.clear();
  }, []);

  return (
    <div class="space-y-6 sm:space-y-8">
      <div class="rounded-2xl sm:rounded-3xl border border-border bg-card p-4 sm:p-8 shadow-sm space-y-4 sm:space-y-6">
        <div class="space-y-2">
          <label class="text-sm font-medium">Category</label>
          <div class="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {NSFW_CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setCategory(cat.value)}
                class={`px-4 py-2.5 rounded-2xl text-sm font-medium transition-all duration-200 ${
                  category === cat.value
                    ? 'bg-brand text-white shadow-sm'
                    : 'bg-secondary text-secondary-foreground hover:bg-accent border border-border'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div class="p-4 rounded-2xl bg-destructive/10 border border-destructive/20 text-sm text-destructive">
            {error}
          </div>
        )}

        <button
          onClick={handleGenerate}
          disabled={loading}
          class="w-full px-6 sm:px-8 py-3.5 sm:py-4 bg-brand text-white font-semibold rounded-2xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md flex items-center justify-center gap-2 text-base sm:text-lg"
        >
          {loading ? (
            <>
              <svg class="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Generating...
            </>
          ) : (
            <>
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456Z" />
              </svg>
              Generate
            </>
          )}
        </button>
      </div>

      {result && (
        <><div class="space-y-4">
          <div class="flex items-center justify-between">
            <h2 class="text-xl font-semibold">Generated Image</h2>
            <button
              onClick={handleGenerate}
              disabled={loading}
              class="px-4 py-2 text-sm font-medium rounded-2xl bg-secondary text-secondary-foreground hover:bg-accent transition-colors flex items-center gap-2"
            >
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" />
              </svg>
              Regenerate
            </button>
          </div>

          <div class="rounded-2xl sm:rounded-3xl overflow-hidden border border-border bg-card group">
            <div class="aspect-square bg-gradient-to-br from-brand/5 to-purple-500/5 flex items-center justify-center relative">
              {imageLoading && (
                <div class="absolute inset-0 flex items-center justify-center bg-muted/50">
                  <div class="flex flex-col items-center gap-3">
                    <svg class="w-10 h-10 text-muted-foreground animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <span class="text-sm text-muted-foreground">Loading image...</span>
                  </div>
                </div>
              )}
              {imageBlobUrl && (
                <img
                  src={imageBlobUrl}
                  alt={result.category}
                  class={`w-full h-full object-cover transition-opacity duration-300 ${imageLoading ? 'opacity-0' : 'opacity-100'}`}
                  onLoad={() => setImageLoading(false)}
                  onError={() => {
                    setImageLoading(false);
                    setError('Failed to load image. Please try again.');
                  }}
                />
              )}
              <div class="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
                <button
                  onClick={() => {
                    if (downloading || !imageBlobUrl) return;
                    setDownloading(true);
                    triggerDownload(imageBlobUrl, `nsfw-${result.category}-${Date.now()}.jpg`);
                    setTimeout(() => setDownloading(false), 300);
                  }}
                  disabled={downloading || !imageBlobUrl}
                  class="p-4 rounded-2xl bg-background/30 backdrop-blur-sm text-foreground hover:bg-background/50 transition-all disabled:opacity-50"
                  title="Download Image"
                >
                  {downloading ? (
                    <svg class="w-6 h-6 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : (
                    <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
            <div class="p-4">
              <div class="flex items-center justify-between">
                <span class="text-sm font-medium capitalize">{result.category}</span>
                <button
                  onClick={() => {
                    if (downloading || !imageBlobUrl) return;
                    setDownloading(true);
                    triggerDownload(imageBlobUrl, `nsfw-${result.category}-${Date.now()}.jpg`);
                    setTimeout(() => setDownloading(false), 300);
                  }}
                  disabled={downloading || !imageBlobUrl}
                  class="px-4 py-2 rounded-2xl bg-brand text-white text-sm font-medium hover:opacity-90 transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {downloading ? (
                    <svg class="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : (
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                    </svg>
                  )}
                  Download
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="flex justify-center">
          <div id="ad-container-300x250" />
        </div>
      </>)}

      {history.length > 0 && (
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <button
              onClick={() => setShowHistory(!showHistory)}
              class="flex items-center gap-2 text-lg font-semibold hover:text-brand transition-colors"
            >
              <svg class={`w-5 h-5 transition-transform duration-200 ${showHistory ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
              </svg>
              History ({history.length})
            </button>
            <button
              onClick={clearHistory}
              class="text-sm text-muted-foreground hover:text-destructive transition-colors"
            >
              Clear History
            </button>
          </div>

          {showHistory && (
            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {history.map((item) => (
                <div
                  key={item.id}
                  class="rounded-2xl overflow-hidden border border-border bg-card group cursor-pointer"
                  onClick={() => handleHistoryClick(item)}
                >
                  <div class="aspect-square bg-gradient-to-br from-brand/5 to-purple-500/5">
                    <img
                      src={blobCache.get(item.id) || item.imageUrl}
                      alt={item.category}
                      class="w-full h-full object-cover"
                      loading="lazy"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = defaultImageUrl;
                      }}
                    />
                  </div>
                  <div class="p-2">
                    <p class="text-xs text-muted-foreground capitalize">{item.category}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
