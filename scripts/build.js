// Copia la tienda (incluida la carpeta "nothing code") a www/ para Capacitor / hosting.
const fs = require("fs");
const path = require("path");
const root = path.join(__dirname, "..");
const out = path.join(root, "www");
fs.rmSync(out, { recursive: true, force: true });
for (const f of ["index.html", "manifest.webmanifest", "sw.js", "assets", "nothing code"]) {
  fs.cpSync(path.join(root, f), path.join(out, f), { recursive: true });
}
const cfg = fs.readFileSync(path.join(root, "nothing code", "config.js"), "utf8");
if (/STOREFRONT_TOKEN:\s*""/.test(cfg)) console.warn('⚠️  STOREFRONT_TOKEN vacío en "nothing code/config.js": la app mostrará productos demo.');
console.log("✓ Build listo en www/");
