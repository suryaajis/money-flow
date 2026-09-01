export interface PreparedReceipt {
  dataUrl: string;
  mimeType: string;
}

export async function prepareReceiptData(
  dataUrl: string,
  mimeType: string,
): Promise<PreparedReceipt> {
  const normalized = mimeType.toLowerCase();
  if (normalized === 'application/pdf') return renderPdfFirstPage(dataUrl);
  if (normalized.includes('heic') || normalized.includes('heif')) return convertHeic(dataUrl, mimeType);
  return { dataUrl, mimeType };
}

async function renderPdfFirstPage(dataUrl: string): Promise<PreparedReceipt> {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/legacy/build/pdf.worker.min.mjs',
    import.meta.url,
  ).toString();
  const bytes = new Uint8Array(await (await fetch(dataUrl)).arrayBuffer());
  const document = await pdfjs.getDocument({ data: bytes }).promise;
  const page = await document.getPage(1);
  const viewport = page.getViewport({ scale: 2 });
  const canvas = window.document.createElement('canvas');
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Browser tidak mendukung rendering PDF');
  await page.render({ canvas, canvasContext: context, viewport }).promise;
  return { dataUrl: canvas.toDataURL('image/jpeg', 0.94), mimeType: 'image/jpeg' };
}

async function convertHeic(dataUrl: string, originalType: string): Promise<PreparedReceipt> {
  const { default: heic2any } = await import('heic2any');
  const source = await (await fetch(dataUrl)).blob();
  const converted = await heic2any({
    blob: new Blob([source], { type: originalType }),
    toType: 'image/jpeg',
    quality: 0.92,
  });
  const blob = Array.isArray(converted) ? converted[0] : converted;
  return { dataUrl: await blobToDataUrl(blob), mimeType: 'image/jpeg' };
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}
