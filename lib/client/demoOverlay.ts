// Demo-mode stand-in for the AI "after" photo: draws fairy lights and floral
// garlands over the original photo in the concept's colors, clearly labelled
// as a demo. Used only when no image API key is configured.

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Couldn't load the photo."));
    img.src = src;
  });
}

function seeded(seed: number) {
  let s = seed % 2147483647 || 1;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

export async function renderDemoAfter(beforeUrl: string, palette: string[], seed = 7): Promise<string> {
  const img = await loadImage(beforeUrl);
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  const rand = seeded(seed);
  const colors = palette.length ? palette : ["#F2A007", "#D6246E", "#3E7B27", "#B8892F"];
  const unit = Math.max(w, h) / 100;

  ctx.drawImage(img, 0, 0, w, h);

  // Evening mood: warm tint and a soft vignette.
  ctx.globalCompositeOperation = "multiply";
  ctx.fillStyle = "rgba(255, 196, 140, 0.35)";
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = "source-over";
  const vignette = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.75);
  vignette.addColorStop(0, "rgba(20, 8, 0, 0)");
  vignette.addColorStop(1, "rgba(20, 8, 0, 0.45)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, w, h);

  // Garland strands hanging from the top edge.
  const strands = 14;
  for (let i = 0; i < strands; i++) {
    const x = ((i + 0.5) / strands) * w + (rand() - 0.5) * unit * 2;
    const len = h * (0.12 + rand() * 0.22);
    const r = unit * 0.85;
    for (let y = r; y < len; y += r * 1.6) {
      ctx.beginPath();
      ctx.fillStyle = colors[(i + Math.floor(y / (r * 1.6))) % colors.length];
      ctx.arc(x + Math.sin(y / (unit * 6)) * unit * 0.4, y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.fillStyle = "rgba(255,255,255,0.25)";
      ctx.arc(x - r * 0.3 + Math.sin(y / (unit * 6)) * unit * 0.4, y - r * 0.3, r * 0.35, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Draped fairy lights.
  ctx.globalCompositeOperation = "lighter";
  for (let row = 0; row < 3; row++) {
    const y0 = h * (0.04 + row * 0.07);
    const sag = h * (0.08 + row * 0.03);
    const swags = 3 + row;
    for (let sIdx = 0; sIdx < swags; sIdx++) {
      const x0 = (sIdx / swags) * w;
      const x1 = ((sIdx + 1) / swags) * w;
      for (let t = 0; t <= 1; t += 0.035) {
        const x = x0 + (x1 - x0) * t;
        const y = y0 + sag * 4 * t * (1 - t);
        const glow = ctx.createRadialGradient(x, y, 0, x, y, unit * 1.4);
        glow.addColorStop(0, "rgba(255, 244, 200, 0.95)");
        glow.addColorStop(0.3, "rgba(255, 200, 90, 0.5)");
        glow.addColorStop(1, "rgba(255, 160, 40, 0)");
        ctx.fillStyle = glow;
        ctx.fillRect(x - unit * 1.4, y - unit * 1.4, unit * 2.8, unit * 2.8);
      }
    }
  }
  ctx.globalCompositeOperation = "source-over";

  // Demo label.
  const label = "DEMO PREVIEW · add an image API key for a real AI design";
  const fontSize = Math.max(12, Math.round(unit * 1.6));
  ctx.font = `600 ${fontSize}px system-ui, sans-serif`;
  const pad = fontSize * 0.6;
  const tw = ctx.measureText(label).width;
  const bx = pad;
  const by = h - fontSize * 2.4;
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.beginPath();
  ctx.roundRect(bx, by, tw + pad * 2, fontSize * 1.8, fontSize * 0.5);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.fillText(label, bx + pad, by + fontSize * 1.25);

  return canvas.toDataURL("image/jpeg", 0.9);
}
