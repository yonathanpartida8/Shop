# Nothing Shop — tienda para Fourthwall (web + Android)

Tienda animada conectada a la **Storefront API de Fourthwall**. Sin frameworks: HTML, CSS y JS puros.

## 1. Pega tu API key

Abre **`nothing code/config.js`** y rellena:

- `STOREFRONT_TOKEN`: tu storefront token (`ptkn_...`). Se crea en Fourthwall → Settings → For Developers.
- `SHOP_DOMAIN`: el dominio de tu tienda (ej. `mitienda.fourthwall.com`), se usa para el pago.
- `SHOP_NAME`, `TAGLINE`, `CURRENCY`: opcional.

Sin token, la tienda muestra productos de demostración.

## 2. Probar en el navegador

```bash
python3 -m http.server 5173
# abre http://localhost:5173
```

## 3. Android

**Opción rápida (PWA):** sube la carpeta a cualquier hosting con HTTPS (Netlify, Vercel, GitHub Pages), ábrela en Chrome de Android → menú ⋮ → *Instalar app*.

**APK nativo (Capacitor):** requiere Node 18+ y Android Studio.

```bash
npm install
npm run android:init    # solo la primera vez
npm run android:open    # abre Android Studio → Run / Build APK
```

Cada vez que cambies el código o el token: `npm run android:sync`.

## Estructura

```
nothing code/config.js   ← aquí va tu token
index.html               página
assets/styles.css        estilos y animaciones
assets/app.js            conexión con la API, carrito y checkout
sw.js, manifest.webmanifest  soporte de app instalable
capacitor.config.json    configuración del APK Android
```
