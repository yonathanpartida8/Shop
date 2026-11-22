/*
 * ============================================================
 *  NOTHING CODE — Configuración de tu tienda Fourthwall
 * ============================================================
 *  1. Entra a tu panel de Fourthwall → Settings → For Developers
 *  2. Crea un "Storefront token" (empieza con  ptkn_ )
 *  3. Pégalo abajo entre las comillas de STOREFRONT_TOKEN
 *  4. Pon el dominio de tu tienda en SHOP_DOMAIN (sin https://)
 *
 *  El storefront token es público por diseño (solo lectura de
 *  productos y carritos), así que es seguro tenerlo aquí.
 *  NO pegues aquí tokens de la Open API / admin.
 * ============================================================
 */
window.NOTHING_CODE = {
  // ⬇️ PEGA AQUÍ TU STOREFRONT TOKEN
  STOREFRONT_TOKEN: "",

  // Dominio de tu tienda Fourthwall, ej: "mitienda.fourthwall.com"
  SHOP_DOMAIN: "",

  // Nombre que se muestra en la app
  SHOP_NAME: "Nothing Shop",
  TAGLINE: "Drops exclusivos, hechos con amor",

  // Moneda: USD, EUR, MXN, CAD, GBP, BRL, ...
  CURRENCY: "USD",
};
