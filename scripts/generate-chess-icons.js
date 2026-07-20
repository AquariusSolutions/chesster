// Generates chess-themed app assets (no external image tooling needed).
//   assets/images/icon.png                    – 8x8 checkerboard (app icon)
//   assets/images/splash-icon.png             – white pawn on transparent
//   assets/images/android-icon-foreground.png – white pawn (adaptive fg)
const zlib = require("zlib");
const fs = require("fs");
const path = require("path");

const CRC = (() => {
  const t = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return (buf) => {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) c = t[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
})();

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(CRC(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

// px(x, y) => [r, g, b, a]
function writePng(file, size, px) {
  const raw = Buffer.alloc(size * (size * 4 + 1));
  let o = 0;
  for (let y = 0; y < size; y++) {
    raw[o++] = 0; // filter: none
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = px(x, y);
      raw[o++] = r;
      raw[o++] = g;
      raw[o++] = b;
      raw[o++] = a;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  const png = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
  fs.writeFileSync(file, png);
  console.log("wrote", path.basename(file), `${size}x${size}`);
}

const LIGHT = [222, 231, 240];
const DARK = [110, 146, 184];

// A pawn silhouette: circular head, tapered body, wide base. n is normalized 0..1.
function inPawn(nx, ny) {
  const cx = 0.5;
  // head
  if (Math.hypot(nx - cx, ny - 0.3) <= 0.135) return true;
  // body (cone widening downward)
  if (ny >= 0.4 && ny <= 0.73) {
    const hw = 0.06 + ((ny - 0.4) / 0.33) * 0.11;
    if (Math.abs(nx - cx) <= hw) return true;
  }
  // base
  if (ny >= 0.72 && ny <= 0.8 && Math.abs(nx - cx) <= 0.22) return true;
  return false;
}

const dir = path.join(__dirname, "..", "assets", "images");
const NAVY = [26, 40, 66];

const mix = (a, b, t) => [
  Math.round(a[0] + (b[0] - a[0]) * t),
  Math.round(a[1] + (b[1] - a[1]) * t),
  Math.round(a[2] + (b[2] - a[2]) * t),
];

// App icon: checkerboard with a centered white pawn on a dark contrast disc.
writePng(path.join(dir, "icon.png"), 1024, (x, y) => {
  const nx = x / 1024;
  const ny = y / 1024;
  const col = Math.floor(x / (1024 / 8));
  const row = Math.floor(y / (1024 / 8));
  let c = (row + col) % 2 === 0 ? LIGHT : DARK;

  // Soft dark disc behind the piece for contrast.
  const d = Math.hypot(nx - 0.5, ny - 0.5);
  const t = d <= 0.31 ? 1 : d >= 0.35 ? 0 : (0.35 - d) / 0.04;
  if (t > 0) c = mix(c, NAVY, t * 0.85);

  // Pawn, scaled to 80% and centered.
  const s = 0.8;
  if (inPawn((nx - 0.5) / s + 0.5, (ny - 0.5) / s + 0.5)) {
    return [255, 255, 255, 255];
  }
  return [c[0], c[1], c[2], 255];
});

// Splash + adaptive foreground: white pawn on transparent.
for (const [name, size] of [
  ["splash-icon.png", 512],
  ["android-icon-foreground.png", 1024],
]) {
  writePng(path.join(dir, name), size, (x, y) => {
    const on = inPawn(x / size, y / size);
    return on ? [255, 255, 255, 255] : [0, 0, 0, 0];
  });
}
