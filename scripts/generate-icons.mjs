/**
 * Rasterises the app icon (app/icon.svg) into the PNGs that SVG-only assets
 * cannot cover: apple-touch-icon and the manifest entries several browsers
 * require before showing an install prompt.
 *
 * Zero dependencies: a minimal PNG encoder over node:zlib, plus a tiny
 * software rasteriser with 3x3 supersampling — enough anti-aliasing for flat
 * shapes at these sizes. Run `npm run icons` after changing the source SVG so
 * the two never drift.
 *
 * Outputs, all derived from the same geometry:
 *   public/icons/icon-{192,512}.png           rounded tile, any purpose
 *   public/icons/icon-maskable-{192,512}.png  full-bleed, glyph in safe zone
 *   public/icons/apple-touch-icon.png         180px, full-bleed (iOS masks it)
 */
import { writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";
import path from "node:path";

const BG = [194, 65, 12]; // #c2410c
const FG = [251, 249, 246]; // #fbf9f6

// Geometry from app/icon.svg, in its 512-unit viewBox.
const VIEWBOX = 512;
const CORNER_RADIUS = 112;
const STROKE_WIDTH = 34;
const STROKES = [
  [[120, 160], [280, 160]],
  [[120, 240], [392, 240]],
  [[120, 320], [392, 320]],
  [[120, 400], [280, 400]],
];
const CIRCLE = { x: 352, y: 160, r: 38 };

function pointInRoundedTile(px, py) {
  const r = CORNER_RADIUS;
  const min = r, maxX = VIEWBOX - r, maxY = VIEWBOX - r;

  if (px < 0 || px > VIEWBOX || py < 0 || py > VIEWBOX) return false;
  const cx = Math.min(Math.max(px, min), maxX);
  const cy = Math.min(Math.max(py, min), maxY);
  const dx = px - cx, dy = py - cy;
  return dx * dx + dy * dy <= r * r;
}

function pointInCapsule(px, py, [ax, ay], [bx, by], radius) {
  const abx = bx - ax, aby = by - ay;
  const lengthSquared = abx * abx + aby * aby;
  const t = lengthSquared === 0
    ? 0
    : Math.max(0, Math.min(1, ((px - ax) * abx + (py - ay) * aby) / lengthSquared));
  const cx = ax + t * abx - px;
  const cy = ay + t * aby - py;
  return cx * cx + cy * cy <= radius * radius;
}

function pointInGlyph(px, py) {
  const halfStroke = STROKE_WIDTH / 2;
  for (const [a, b] of STROKES) {
    if (pointInCapsule(px, py, a, b, halfStroke)) return true;
  }
  const dx = px - CIRCLE.x, dy = py - CIRCLE.y;
  return dx * dx + dy * dy <= CIRCLE.r * CIRCLE.r;
}

/** Renders one frame. `glyphScale` shrinks the glyph toward the centre for
 *  maskable/apple variants, whose platform masks eat the outer ~10%. */
function render(size, { rounded, glyphScale }) {
  const scale = size / VIEWBOX;
  const samples = 3;
  const pixels = new Uint8Array(size * size * 4);

  // Glyph coordinates are scaled about the viewBox centre so the design stays
  // centred instead of anchored to the top-left.
  const toGlyph = (v) => ((v - VIEWBOX / 2) * glyphScale + VIEWBOX / 2);

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let aSum = 0, rSum = 0, gSum = 0, bSum = 0;

      for (let sy = 0; sy < samples; sy += 1) {
        for (let sx = 0; sx < samples; sx += 1) {
          const px = (x + (sx + 0.5) / samples) / scale;
          const py = (y + (sy + 0.5) / samples) / scale;

          let color = null;
          if ((!rounded || pointInRoundedTile(px, py))) {
            color = pointInGlyph(toGlyph(px), toGlyph(py)) ? FG : BG;
          }

          if (color) {
            aSum += 255;
            rSum += color[0];
            gSum += color[1];
            bSum += color[2];
          }
        }
      }

      const total = samples * samples;
      const offset = (y * size + x) * 4;
      pixels[offset] = Math.round(rSum / total);
      pixels[offset + 1] = Math.round(gSum / total);
      pixels[offset + 2] = Math.round(bSum / total);
      pixels[offset + 3] = Math.round(aSum / total);
    }
  }

  return encodePng(size, size, pixels);
}

// --- Minimal PNG encoding ---------------------------------------------------

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) {
    c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

function encodePng(width, height, rgba) {
  const raw = Buffer.alloc(height * (width * 4 + 1));
  for (let y = 0; y < height; y += 1) {
    raw[y * (width * 4 + 1)] = 0; // filter: none
    raw.set(rgba.subarray(y * width * 4, (y + 1) * width * 4), y * (width * 4 + 1) + 1);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type: RGBA
  // compression, filter, interlace all zero by allocation

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", deflateSync(raw)),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

// --- Output -----------------------------------------------------------------

const outDir = path.resolve(process.cwd(), "public", "icons");
const outputs = [
  ["icon-192.png", 192, { rounded: true, glyphScale: 1 }],
  ["icon-512.png", 512, { rounded: true, glyphScale: 1 }],
  ["icon-maskable-192.png", 192, { rounded: false, glyphScale: 0.78 }],
  ["icon-maskable-512.png", 512, { rounded: false, glyphScale: 0.78 }],
  ["apple-touch-icon.png", 180, { rounded: false, glyphScale: 0.82 }],
];

for (const [name, size, options] of outputs) {
  writeFileSync(path.join(outDir, name), render(size, options));
  console.log(`wrote public/icons/${name}`);
}
