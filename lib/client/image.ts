// Browser-side image helpers: shrink big phone photos before upload so requests
// stay fast and under hosting limits.

export interface PreparedImage {
  dataUrl: string;
  base64: string;
  mediaType: "image/jpeg";
  width: number;
  height: number;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("This photo format can't be opened. Please use a JPG or PNG photo."));
    img.src = src;
  });
}

export async function prepareImage(source: File | string, maxEdge = 1600, quality = 0.88): Promise<PreparedImage> {
  const objectUrl = typeof source === "string" ? null : URL.createObjectURL(source);
  try {
    const img = await loadImage(objectUrl ?? (source as string));
    const scale = Math.min(1, maxEdge / Math.max(img.naturalWidth, img.naturalHeight));
    const width = Math.max(1, Math.round(img.naturalWidth * scale));
    const height = Math.max(1, Math.round(img.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Your browser couldn't process the photo.");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, width, height);
    const dataUrl = canvas.toDataURL("image/jpeg", quality);
    return { dataUrl, base64: dataUrl.slice(dataUrl.indexOf(",") + 1), mediaType: "image/jpeg", width, height };
  } finally {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  }
}

export function toApiImage(img: PreparedImage) {
  return { data: img.base64, mediaType: img.mediaType };
}

export function slugify(text: string) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}
