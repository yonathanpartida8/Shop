(() => {
  "use strict";

  const CFG = Object.assign(
    { STOREFRONT_TOKEN: "", SHOP_DOMAIN: "", SHOP_NAME: "Shop", TAGLINE: "", CURRENCY: "USD" },
    window.NOTHING_CODE || {}
  );
  const API = "https://storefront-api.fourthwall.com/v1";
  const TOKEN = (CFG.STOREFRONT_TOKEN || "").trim();
  const DEMO = !TOKEN;
  const CART_KEY = "nc_cart_id";

  const $ = (s, r = document) => r.querySelector(s);
  const el = (tag, cls, html) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  };
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  // ---------------- API ----------------
  async function api(path, opts = {}) {
    const url = new URL(API + path);
    url.searchParams.set("storefront_token", TOKEN);
    url.searchParams.set("currency", CFG.CURRENCY);
    const res = await fetch(url, {
      method: opts.method || "GET",
      headers: opts.body ? { "Content-Type": "application/json" } : undefined,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
    if (!res.ok) {
      const err = new Error(`Fourthwall API ${res.status}`);
      err.status = res.status;
      throw err;
    }
    return res.status === 204 ? null : res.json();
  }

  // ---------------- Demo data (cuando aún no hay token) ----------------
  const demoImg = (a, b, emoji) =>
    "data:image/svg+xml," +
    encodeURIComponent(
      `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 500'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='${a}'/><stop offset='1' stop-color='${b}'/></linearGradient></defs><rect width='400' height='500' fill='url(#g)'/><text x='200' y='290' font-size='150' text-anchor='middle'>${emoji}</text></svg>`
    );
  const dv = (id, price, color, swatch, size, compare) => ({
    id, name: `${color} / ${size}`, unitPrice: { value: price, currency: CFG.CURRENCY },
    compareAtPrice: compare ? { value: compare, currency: CFG.CURRENCY } : null,
    attributes: { color: { name: color, swatch }, size: { name: size } }, stock: { type: "UNLIMITED" },
  });
  const DEMO_PRODUCTS = [
    { slug: "hoodie-aurora", name: "Hoodie Aurora", img: ["#ff8fc7", "#b69cff", "🌸"], price: 54, compare: 65, col: "ropa" },
    { slug: "tee-sunset", name: "Camiseta Sunset", img: ["#ffb38a", "#ff8fc7", "🌅"], price: 28, col: "ropa" },
    { slug: "gorra-nebula", name: "Gorra Nebula", img: ["#b69cff", "#7ef0d0", "🧢"], price: 24, col: "accesorios" },
    { slug: "taza-dream", name: "Taza Dream", img: ["#7ef0d0", "#b69cff", "☕"], price: 16, col: "accesorios" },
    { slug: "sticker-pack", name: "Pack de stickers", img: ["#ffd36e", "#ff8fc7", "✨"], price: 9, col: "accesorios" },
    { slug: "tote-cloud", name: "Tote bag Cloud", img: ["#9fd3ff", "#ffb38a", "👜"], price: 22, col: "accesorios" },
  ].map((p, i) => ({
    id: "demo-" + i, slug: p.slug, name: p.name, _col: p.col,
    description: "<p>Producto de demostración. Pega tu <b>storefront token</b> en <code>nothing code/config.js</code> para ver tus productos reales de Fourthwall.</p>",
    images: [{ url: demoImg(...p.img) }, { url: demoImg(p.img[1], p.img[0], p.img[2]) }],
    variants: p.col === "ropa"
      ? ["S", "M", "L", "XL"].flatMap((s, j) => [
          dv(`d${i}-a${j}`, p.price, "Lila", "#b69cff", s, p.compare),
          dv(`d${i}-b${j}`, p.price, "Rosa", "#ff8fc7", s, p.compare),
        ])
      : [dv(`d${i}-u`, p.price, "Único", "#ffb38a", "Única", p.compare)],
  }));

  // ---------------- Estado ----------------
  const state = { collections: [], active: "all", products: [], cart: null, demoCart: [] };

  // ---------------- Utilidades ----------------
  function money(m) {
    if (!m) return "";
    try {
      return new Intl.NumberFormat(navigator.language || "es", { style: "currency", currency: m.currency || CFG.CURRENCY }).format(m.value);
    } catch {
      return `${m.value} ${m.currency || ""}`;
    }
  }
  const inStock = (v) => !v.stock || v.stock.type === "UNLIMITED" || (v.stock.inStock ?? v.stock.inStockCount ?? 0) > 0;
  const firstImg = (p) => (p.images && p.images[0] && (p.images[0].transformedUrl || p.images[0].url)) || "";

  let toastTimer;
  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), 2200);
  }
  const vibrate = (ms = 12) => navigator.vibrate && navigator.vibrate(ms);

  // ---------------- Render: colecciones ----------------
  function renderCollections() {
    const nav = $("#collections");
    nav.innerHTML = "";
    const list = [{ slug: "all", name: "Todo" }, ...state.collections.filter((c) => c.slug !== "all")];
    if (list.length < 2) { nav.hidden = true; return; }
    nav.hidden = false;
    list.forEach((c) => {
      const b = el("button", "chip" + (c.slug === state.active ? " active" : ""), esc(c.name));
      b.onclick = () => { if (state.active !== c.slug) { state.active = c.slug; renderCollections(); loadProducts(); } };
      nav.appendChild(b);
    });
  }

  // ---------------- Render: grid ----------------
  function renderSkeleton() {
    const g = $("#grid");
    g.innerHTML = "";
    for (let i = 0; i < 6; i++) {
      g.appendChild(el("div", "card skeleton", `<div class="media"></div><div class="info"><div class="line"></div><div class="line" style="width:50%"></div></div>`));
    }
  }

  function priceHTML(v) {
    if (!v) return "";
    const sale = v.compareAtPrice && v.compareAtPrice.value > v.unitPrice.value;
    return `<span class="now">${money(v.unitPrice)}</span>${sale ? `<s>${money(v.compareAtPrice)}</s>` : ""}`;
  }

  function cheapest(p) {
    return (p.variants || []).slice().sort((a, b) => a.unitPrice.value - b.unitPrice.value)[0];
  }

  function renderGrid() {
    const g = $("#grid");
    g.innerHTML = "";
    $("#empty").hidden = state.products.length > 0;
    state.products.forEach((p, i) => {
      const v = cheapest(p);
      const soldOut = p.state === "SOLD_OUT" || !(p.variants || []).some(inStock);
      const sale = v && v.compareAtPrice && v.compareAtPrice.value > v.unitPrice.value;
      const card = el("button", "card");
      card.style.animationDelay = `${Math.min(i, 12) * 60}ms`;
      card.innerHTML = `
        <div class="media"><img loading="lazy" alt="${esc(p.name)}" src="${esc(firstImg(p))}"></div>
        ${soldOut ? `<span class="tag">Agotado</span>` : sale ? `<span class="tag sale">Oferta</span>` : ""}
        <div class="info"><div class="name">${esc(p.name)}</div><div class="price">${priceHTML(v)}</div></div>`;
      card.onclick = () => openProduct(p);
      g.appendChild(card);
    });
  }

  // ---------------- Carga de datos ----------------
  async function loadCollections() {
    if (DEMO) {
      state.collections = [{ slug: "ropa", name: "Ropa" }, { slug: "accesorios", name: "Accesorios" }];
      return renderCollections();
    }
    try {
      const data = await api("/collections");
      state.collections = (data.results || data || []).map((c) => ({ slug: c.slug, name: c.name }));
    } catch (e) {
      state.collections = [];
    }
    renderCollections();
  }

  async function loadProducts() {
    renderSkeleton();
    if (DEMO) {
      await new Promise((r) => setTimeout(r, 450));
      state.products = DEMO_PRODUCTS.filter((p) => state.active === "all" || p._col === state.active);
      return renderGrid();
    }
    try {
      const all = [];
      for (let page = 0; page < 10; page++) {
        const data = await api(`/collections/${encodeURIComponent(state.active)}/products?page=${page}&size=50`);
        const results = data.results || [];
        all.push(...results);
        if (!data.paging || !data.paging.hasNextPage || !results.length) break;
      }
      state.products = all;
    } catch (e) {
      state.products = [];
      showNotice(
        e.status === 401 || e.status === 403
          ? "Tu storefront token no es válido. Revisa <code>nothing code/config.js</code>."
          : "No se pudieron cargar los productos. Revisa tu conexión e inténtalo de nuevo."
      );
    }
    renderGrid();
  }

  function showNotice(html) {
    const n = $("#notice");
    n.innerHTML = html;
    n.hidden = false;
  }

  // ---------------- Sheets ----------------
  let openSheetEl = null;
  function openSheet(sheet) {
    if (openSheetEl && openSheetEl !== sheet) closeSheet(true);
    $("#scrim").hidden = false;
    sheet.hidden = false;
    sheet.classList.remove("closing");
    sheet.scrollTop = 0;
    openSheetEl = sheet;
    document.body.style.overflow = "hidden";
    history.pushState({ sheet: sheet.id }, "");
  }
  function closeSheet(instant, fromPop) {
    const sheet = openSheetEl;
    if (!sheet) return;
    openSheetEl = null;
    document.body.style.overflow = "";
    $("#scrim").hidden = true;
    if (!fromPop && history.state && history.state.sheet) history.back();
    if (instant) { sheet.hidden = true; return; }
    sheet.classList.add("closing");
    setTimeout(() => { sheet.hidden = true; sheet.classList.remove("closing"); }, 280);
  }
  // Botón "atrás" de Android cierra el panel abierto
  window.addEventListener("popstate", () => closeSheet(false, true));
  $("#scrim").onclick = () => closeSheet();
  document.querySelectorAll("[data-close]").forEach((b) => (b.onclick = () => closeSheet()));

  // Deslizar hacia abajo para cerrar
  document.querySelectorAll(".sheet").forEach((sheet) => {
    let y0 = null;
    sheet.addEventListener("touchstart", (e) => { y0 = sheet.scrollTop <= 0 ? e.touches[0].clientY : null; }, { passive: true });
    sheet.addEventListener("touchend", (e) => {
      if (y0 != null && e.changedTouches[0].clientY - y0 > 110) closeSheet();
      y0 = null;
    });
  });

  // ---------------- Detalle de producto ----------------
  async function openProduct(p) {
    let product = p;
    renderProduct(product);
    openSheet($("#productSheet"));
    if (!DEMO && (!p.description || !p.variants)) {
      try { product = await api(`/products/${encodeURIComponent(p.slug)}`); renderProduct(product); } catch {}
    }
  }

  function renderProduct(p) {
    const body = $("#productBody");
    const variants = p.variants || [];
    const colors = [...new Map(variants.filter((v) => v.attributes?.color).map((v) => [v.attributes.color.name, v.attributes.color])).values()];
    const sizes = [...new Set(variants.filter((v) => v.attributes?.size).map((v) => v.attributes.size.name))];
    const start = variants.find(inStock) || variants[0];
    const sel = {
      color: start?.attributes?.color?.name || null,
      size: start?.attributes?.size?.name || null,
      variant: start,
      qty: 1,
    };

    const match = (c, s) =>
      variants.find((v) => (!c || v.attributes?.color?.name === c) && (!s || v.attributes?.size?.name === s));

    function images() {
      const vi = (sel.variant?.images || []).map((i) => i.transformedUrl || i.url);
      const pi = (p.images || []).map((i) => i.transformedUrl || i.url);
      return [...new Set([...vi, ...pi])].filter(Boolean);
    }

    function draw() {
      const v = sel.variant;
      const avail = v && inStock(v);
      body.innerHTML = `
        <div class="gallery">${images().map((u) => `<img src="${esc(u)}" alt="${esc(p.name)}">`).join("")}</div>
        <h3 class="p-title">${esc(p.name)}</h3>
        <div class="price p-price">${priceHTML(v)}</div>
        ${colors.length > 1 || (colors.length === 1 && sizes.length > 1) ? `<div class="opt-label">Color${sel.color ? ` · ${esc(sel.color)}` : ""}</div><div class="opts" id="optColor"></div>` : ""}
        ${sizes.length > 1 ? `<div class="opt-label">Talla</div><div class="opts" id="optSize"></div>` : ""}
        ${!colors.length && !sizes.length && variants.length > 1 ? `<div class="opt-label">Opción</div><div class="opts" id="optVariant"></div>` : ""}
        <div class="opt-label">Cantidad</div>
        <div class="qty"><button data-q="-1" aria-label="Menos">−</button><span>${sel.qty}</span><button data-q="1" aria-label="Más">+</button></div>
        <div class="desc">${p.description || ""}</div>
        <div class="actions"><button class="btn primary" id="addBtn" ${avail ? "" : "disabled"}>${avail ? "Añadir al carrito" : "Agotado"}</button></div>`;

      const oc = $("#optColor", body);
      if (oc) colors.forEach((c) => {
        const ok = variants.some((v) => v.attributes?.color?.name === c.name && inStock(v));
        const b = el("button", "opt" + (c.name === sel.color ? " active" : ""), `<span class="swatch" style="background:${esc(c.swatch || "#ccc")}"></span>${esc(c.name)}`);
        b.disabled = !ok;
        b.onclick = () => { sel.color = c.name; sel.variant = match(sel.color, sel.size) || match(sel.color, null); sel.size = sel.variant?.attributes?.size?.name || sel.size; vibrate(); draw(); };
        oc.appendChild(b);
      });
      const os = $("#optSize", body);
      if (os) sizes.forEach((s) => {
        const v = match(sel.color, s);
        const b = el("button", "opt" + (s === sel.size ? " active" : ""), esc(s));
        b.disabled = !v || !inStock(v);
        b.onclick = () => { sel.size = s; sel.variant = v; vibrate(); draw(); };
        os.appendChild(b);
      });
      const ov = $("#optVariant", body);
      if (ov) variants.forEach((v) => {
        const b = el("button", "opt" + (v === sel.variant ? " active" : ""), esc(v.name));
        b.disabled = !inStock(v);
        b.onclick = () => { sel.variant = v; vibrate(); draw(); };
        ov.appendChild(b);
      });
      body.querySelectorAll("[data-q]").forEach((b) => (b.onclick = () => { sel.qty = Math.max(1, Math.min(99, sel.qty + Number(b.dataset.q))); draw(); }));
      $("#addBtn", body).onclick = async (e) => {
        const btn = e.currentTarget;
        btn.disabled = true;
        btn.textContent = "Añadiendo…";
        try {
          await addToCart(sel.variant, sel.qty, p);
          vibrate(30);
          toast(`✓ ${p.name} añadido`);
          closeSheet();
        } catch (err) {
          toast("No se pudo añadir. Intenta de nuevo.");
          btn.disabled = false;
          btn.textContent = "Añadir al carrito";
        }
      };
    }
    draw();
  }

  // ---------------- Carrito ----------------
  async function addToCart(variant, qty, product) {
    if (DEMO) {
      const it = state.demoCart.find((i) => i.variant.id === variant.id);
      if (it) it.quantity += qty;
      else state.demoCart.push({ variant: { ...variant, images: product.images, product: { name: product.name } }, quantity: qty });
      state.cart = { items: state.demoCart };
      return updateBadge(true);
    }
    const items = [{ variantId: variant.id, quantity: qty }];
    const id = localStorage.getItem(CART_KEY);
    let cart;
    if (id) {
      try { cart = await api(`/carts/${id}/add`, { method: "POST", body: { items } }); } catch (e) { cart = null; }
    }
    if (!cart) {
      cart = await api(`/carts`, { method: "POST", body: { items } });
      try { localStorage.setItem(CART_KEY, cart.id); } catch {}
    }
    state.cart = cart;
    updateBadge(true);
  }

  async function changeQty(variantId, quantity) {
    if (DEMO) {
      state.demoCart = state.demoCart.map((i) => (i.variant.id === variantId ? { ...i, quantity } : i)).filter((i) => i.quantity > 0);
      state.cart = { items: state.demoCart };
    } else {
      const id = state.cart.id;
      state.cart = quantity > 0
        ? await api(`/carts/${id}/change`, { method: "POST", body: { items: [{ variantId, quantity }] } })
        : await api(`/carts/${id}/remove`, { method: "POST", body: { items: [{ variantId }] } });
    }
    updateBadge();
    renderCart();
  }

  async function loadCart() {
    if (DEMO) return;
    let id;
    try { id = localStorage.getItem(CART_KEY); } catch {}
    if (!id) return;
    try { state.cart = await api(`/carts/${id}`); } catch { try { localStorage.removeItem(CART_KEY); } catch {} state.cart = null; }
    updateBadge();
  }

  function cartItems() { return (state.cart && state.cart.items) || []; }

  function updateBadge(bump) {
    const n = cartItems().reduce((s, i) => s + i.quantity, 0);
    const b = $("#cartCount");
    b.textContent = n;
    b.hidden = n === 0;
    if (bump) { b.classList.remove("bump"); void b.offsetWidth; b.classList.add("bump"); }
  }

  function renderCart() {
    const wrap = $("#cartItems");
    const items = cartItems();
    wrap.innerHTML = "";
    $("#checkoutBtn").disabled = !items.length;
    if (!items.length) {
      wrap.innerHTML = `<div class="cart-empty"><div class="big">🛍️</div>Tu carrito está vacío</div>`;
      $("#cartTotal").textContent = "—";
      return;
    }
    let total = 0, currency = CFG.CURRENCY;
    items.forEach((it, i) => {
      const v = it.variant;
      total += v.unitPrice.value * it.quantity;
      currency = v.unitPrice.currency || currency;
      const img = (v.images && v.images[0] && (v.images[0].transformedUrl || v.images[0].url)) || "";
      const row = el("div", "cart-item");
      row.style.animationDelay = `${i * 50}ms`;
      row.innerHTML = `
        <img src="${esc(img)}" alt="">
        <div><div class="n">${esc(v.product?.name || v.name)}</div><div class="v">${esc(v.name)}</div><div class="price"><span class="now">${money({ value: v.unitPrice.value * it.quantity, currency: v.unitPrice.currency })}</span></div></div>
        <div class="right"><div class="qty"><button data-d="-1" aria-label="Menos">−</button><span>${it.quantity}</span><button data-d="1" aria-label="Más">+</button></div></div>`;
      row.querySelectorAll("[data-d]").forEach((b) => (b.onclick = async () => {
        row.style.opacity = ".5";
        try { await changeQty(v.id, it.quantity + Number(b.dataset.d)); vibrate(); } catch { toast("No se pudo actualizar"); row.style.opacity = ""; }
      }));
      wrap.appendChild(row);
    });
    $("#cartTotal").textContent = money({ value: total, currency });
  }

  $("#openCart").onclick = async () => {
    renderCart();
    openSheet($("#cartSheet"));
    if (!DEMO && state.cart) { await loadCart(); renderCart(); }
  };

  $("#checkoutBtn").onclick = () => {
    if (DEMO) return toast("Modo demo: pega tu token para pagar de verdad");
    const domain = (CFG.SHOP_DOMAIN || "").replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    if (!domain) return toast("Falta SHOP_DOMAIN en nothing code/config.js");
    const url = `https://${domain}/checkout/?cartCurrency=${encodeURIComponent(CFG.CURRENCY)}&cartId=${encodeURIComponent(state.cart.id)}`;
    window.location.href = url;
  };

  // ---------------- Inicio ----------------
  function initBrand() {
    document.title = CFG.SHOP_NAME;
    $("#shopName").textContent = CFG.SHOP_NAME;
    $("#heroTitle").textContent = CFG.SHOP_NAME;
    $("#tagline").textContent = CFG.TAGLINE || "";
    if (DEMO) showNotice("✦ Estás viendo productos de demostración. Pega tu storefront token de Fourthwall en <code>nothing code/config.js</code> para conectar tu tienda.");
  }

  initBrand();
  loadCollections();
  loadProducts();
  loadCart();

  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
})();
