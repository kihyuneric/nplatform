// Korean font loader for jsPDF - fetches NanumGothic from Google Fonts and caches in memory
let cachedFontBase64: string | null = null;

const FONT_URL = 'https://cdn.jsdelivr.net/gh/pankaspe/jsPDF-Font/NanumGothic-Regular.ttf';

export async function loadKoreanFont(): Promise<string> {
  if (cachedFontBase64) return cachedFontBase64;

  const response = await fetch(FONT_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch Korean font: ${response.status}`);
  }
  const buffer = await response.arrayBuffer();
  cachedFontBase64 = Buffer.from(buffer).toString('base64');
  return cachedFontBase64;
}

export function registerKoreanFont(doc: import('jspdf').jsPDF, fontBase64: string) {
  doc.addFileToVFS('NanumGothic-Regular.ttf', fontBase64);
  doc.addFont('NanumGothic-Regular.ttf', 'NanumGothic', 'normal');
  doc.setFont('NanumGothic');
}
