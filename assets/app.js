/* Heelsfreak Hub storefront + admin.
   Data comes from /api/store (Netlify Function + Blobs). If the functions are not
   deployed (for example a drag-and-drop preview), it falls back to /data/store.json
   and the admin runs in preview mode: changes stay in the browser and can be
   downloaded as store.json. */
(function () {
  "use strict";

  var work = null, publishedStr = "", BACKEND = false;

  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function S() { return work.settings; }
  function money(n) { return S().currency + " " + Number(n).toLocaleString("en-US", { maximumFractionDigits: 2 }); }
  function hasSale(p) { return p.sale != null && p.sale !== ""; }
  function priceOf(p) { return hasSale(p) ? Number(p.sale) : Number(p.price); }
  function priceHtml(p) { return hasSale(p) ? money(p.sale) + "<s>" + money(p.price) + "</s>" : money(p.price); }
  function sizesOf(p) { return String(p.sizes || "").split(",").map(function (s) { return s.trim(); }).filter(Boolean); }
  function visible() { return work.products.filter(function (p) { return p.visible; }); }
  function byId(id) { return work.products.find(function (p) { return p.id === id; }); }
  function cover(p) { return p.images && p.images[0] ? p.images[0] : ""; }
  function store(k, v) { try { if (v === undefined) return JSON.parse(localStorage.getItem(k)); localStorage.setItem(k, JSON.stringify(v)); } catch (e) { return null; } }
  function sstore(k, v) { try { if (v === undefined) return sessionStorage.getItem(k); if (v === null) sessionStorage.removeItem(k); else sessionStorage.setItem(k, v); } catch (e) { return null; } }
  var tt;
  function toast(msg) { var t = $("toast"); t.textContent = msg; t.hidden = false; clearTimeout(tt); tt = setTimeout(function () { t.hidden = true; }, 2800); }
  function copyText(text, btn) {
    function ok() { if (btn) { var o = btn.textContent; btn.textContent = "Copied"; setTimeout(function () { btn.textContent = o; }, 1600); } }
    function fail() { var ta = document.createElement("textarea"); ta.value = text; document.body.appendChild(ta); ta.select(); try { document.execCommand("copy"); ok(); } catch (e) { toast("Select the text and copy it manually."); } ta.remove(); }
    try { navigator.clipboard.writeText(text).then(ok, fail); } catch (e) { fail(); }
  }
  function waLink(text) { return "https://wa.me/" + String(S().whatsapp || "").replace(/\D/g, "") + "?text=" + encodeURIComponent(text); }

  /* ---------- Load data ---------- */
  function load() {
    $("grid").innerHTML = '<div class="empty">Loading the shop…</div>';
    return fetch("/api/store", { cache: "no-store" }).then(function (r) {
      var ct = r.headers.get("content-type") || "";
      if (ct.indexOf("json") < 0) throw new Error("no backend");
      BACKEND = true;
      return r.json().then(function (j) { return r.ok && j && j.settings ? j : null; });
    }).catch(function () { BACKEND = false; return null; }).then(function (data) {
      if (data) return data;
      return fetch("/data/store.json", { cache: "no-store" }).then(function (r) { return r.json(); });
    });
  }

  /* ---------- Branding ---------- */
  function usedCats() { var v = visible(); return S().categories.filter(function (c) { return v.some(function (p) { return p.cat === c; }); }); }
  function renderBrand() {
    var s = S();
    document.title = s.storeName;
    $("logoImg").src = s.logo || ""; $("logoImg").hidden = !s.logo;
    $("brandName").textContent = s.storeName; $("brandTag").textContent = s.tagline;
    $("heroTitle").textContent = s.tagline || s.storeName;
    $("heroIntro").textContent = s.intro;
    $("heroImg").src = s.hero || ""; $("heroImg").parentElement.hidden = !s.hero;
    $("heroPhones").textContent = s.phones;
    $("footName").textContent = s.storeName; $("footTag").textContent = s.tagline; $("footPhones").textContent = s.phones;
    var cats = usedCats();
    $("heroEyebrow").textContent = cats.join(" · ");
    $("heroCta").innerHTML = cats.slice(0, 2).map(function (c, i) { return '<button class="btn ' + (i ? "" : "gold") + '" data-cat-go="' + esc(c) + '">Shop ' + esc(c.toLowerCase()) + "</button>"; }).join("");
    $("navCats").innerHTML = cats.map(function (c) { return '<button data-cat-go="' + esc(c) + '" aria-current="' + (view === "shop" && cat === c) + '">' + esc(c) + "</button>"; }).join("");
    var last = store("hfh-last-order");
    $("footLast").innerHTML = last ? '<button class="link" id="lastOrderLink">Your last order: ' + esc(last.no) + "</button>" : "";
    $("adminBtn").hidden = !signedIn();
  }

  /* ---------- Shop ---------- */
  var cat = "All", query = "";
  function renderShop() {
    var v = visible(), cats = usedCats();
    if (cat !== "All" && cats.indexOf(cat) < 0) cat = "All";
    $("chips").innerHTML = ["All"].concat(cats).map(function (c) {
      var n = c === "All" ? v.length : v.filter(function (p) { return p.cat === c; }).length;
      return '<button class="chip" data-cat="' + esc(c) + '" aria-pressed="' + (cat === c) + '">' + esc(c) + "<em>" + n + "</em></button>";
    }).join("");
    var q = query.toLowerCase();
    var list = v.filter(function (p) { return (cat === "All" || p.cat === cat) && (!q || (p.name + " " + p.desc + " " + p.cat).toLowerCase().indexOf(q) >= 0); });
    $("grid").innerHTML = list.length ? list.map(function (p) {
      return '<button class="card" data-open="' + esc(p.id) + '"><div class="ph">' + (cover(p) ? '<img loading="lazy" src="' + esc(cover(p)) + '" alt="' + esc(p.name) + '">' : "") +
        (p.badge ? '<span class="badge">' + esc(p.badge) + "</span>" : "") + (p.stock === "out" ? '<span class="soldout">Sold out</span>' : "") +
        "</div><h3>" + esc(p.name) + '</h3><span class="price">' + priceHtml(p) + "</span></button>";
    }).join("") : '<div class="empty">' + (v.length ? "Nothing matches that search. Try another word." : "No products yet. Check back soon.") + "</div>";
    document.querySelectorAll("#navCats button").forEach(function (b) { b.setAttribute("aria-current", String(view === "shop" && cat === b.dataset.catGo)); });
  }
  document.addEventListener("click", function (e) {
    var t = e.target.closest("[data-cat-go]"); if (t) { go("shop"); cat = t.dataset.catGo; renderShop(); $("shop").scrollIntoView({ behavior: "smooth" }); return; }
    t = e.target.closest("[data-cat]"); if (t) { cat = t.dataset.cat; renderShop(); return; }
    t = e.target.closest("[data-open]"); if (t) { openProduct(t.dataset.open); return; }
    t = e.target.closest("[data-go]"); if (t) { go(t.dataset.go); return; }
    if (e.target.id === "lastOrderLink") { var lo = store("hfh-last-order"); if (lo) { renderPay(lo); go("pay"); } }
  });
  $("q").addEventListener("input", function (e) { query = e.target.value; renderShop(); });

  /* ---------- Views ---------- */
  var view = "shop";
  function go(v) {
    if (v === "admin" && !signedIn()) v = "login";
    view = v;
    ["shop", "checkout", "pay", "login", "admin"].forEach(function (k) { $("v-" + k).hidden = k !== v; });
    if (v === "admin") renderAdmin();
    if (v === "checkout") renderCheckout();
    if (v === "login") {
      $("loginWarn").textContent = BACKEND ? "" : "Preview mode: saving online isn't set up on this deploy, so no password is needed. Press Sign in to try the admin.";
      setTimeout(function () { $("loginPw").focus(); }, 0);
    }
    if ((v === "admin" || v === "login") && location.hash !== "#admin") history.replaceState(null, "", "#admin");
    if (v !== "admin" && v !== "login" && location.hash === "#admin") history.replaceState(null, "", location.pathname);
    window.scrollTo(0, 0);
    renderBrand();
  }

  /* ---------- Overlays ---------- */
  var lastFocus = null;
  function openOverlay(el) { lastFocus = document.activeElement; $("scrim").hidden = false; el.hidden = false; var f = el.querySelector("button"); if (f) f.focus(); }
  function closeAll() { $("modal").hidden = true; $("drawer").hidden = true; $("scrim").hidden = true; if (lastFocus && lastFocus.focus) lastFocus.focus(); }
  $("scrim").addEventListener("click", closeAll);
  $("modal").addEventListener("click", function (e) { if (e.target === $("modal")) closeAll(); });
  document.querySelectorAll("[data-close]").forEach(function (b) { b.addEventListener("click", closeAll); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeAll(); });

  /* ---------- Product modal ---------- */
  var cur = null, curImg = 0, curSize = null, curQty = 1;
  function openProduct(id) {
    cur = byId(id); if (!cur) return; curImg = 0; curSize = null; curQty = 1;
    $("mCat").textContent = cur.cat; $("mName").textContent = cur.name; $("mPrice").innerHTML = priceHtml(cur);
    $("mDesc").textContent = cur.desc; $("mWarn").textContent = "";
    $("mSizeWrap").hidden = !sizesOf(cur).length;
    $("mAdd").disabled = cur.stock === "out"; $("mAdd").textContent = cur.stock === "out" ? "Sold out" : "Add to bag";
    paintProduct(); openOverlay($("modal"));
  }
  function paintProduct() {
    $("mImg").src = cur.images[curImg] || ""; $("mImg").alt = cur.name;
    $("mThumbs").innerHTML = cur.images.length > 1 ? cur.images.map(function (src, i) { return '<button data-img="' + i + '" aria-pressed="' + (i === curImg) + '" aria-label="Photo ' + (i + 1) + '"><img src="' + esc(src) + '" alt=""></button>'; }).join("") : "";
    $("mSizes").innerHTML = sizesOf(cur).map(function (s) { return '<button class="size" data-size="' + esc(s) + '" aria-pressed="' + (s === curSize) + '">' + esc(s) + "</button>"; }).join("");
    $("mQty").textContent = curQty;
  }
  $("mThumbs").addEventListener("click", function (e) { var b = e.target.closest("[data-img]"); if (b) { curImg = +b.dataset.img; paintProduct(); } });
  $("mSizes").addEventListener("click", function (e) { var b = e.target.closest("[data-size]"); if (b) { curSize = b.dataset.size; $("mWarn").textContent = ""; paintProduct(); } });
  $("mDec").addEventListener("click", function () { curQty = Math.max(1, curQty - 1); paintProduct(); });
  $("mInc").addEventListener("click", function () { curQty = Math.min(20, curQty + 1); paintProduct(); });
  $("mAdd").addEventListener("click", function () {
    if (sizesOf(cur).length && !curSize) { $("mWarn").textContent = "Choose your size first."; return; }
    var key = cur.id + "|" + (curSize || "");
    var l = cart.find(function (x) { return x.key === key; });
    if (l) l.qty += curQty; else cart.push({ key: key, id: cur.id, size: curSize, qty: curQty });
    saveCart(); closeAll(); toast(cur.name + " added to your bag");
  });

  /* ---------- Cart ---------- */
  var cart = [];
  function saveCart() { store("hfh-cart", cart); $("bagN").textContent = cart.reduce(function (s, l) { return s + l.qty; }, 0); }
  function lines() { return cart.map(function (l) { var p = byId(l.id); return p ? { l: l, p: p, total: priceOf(p) * l.qty } : null; }).filter(Boolean); }
  function subtotal() { return lines().reduce(function (s, x) { return s + x.total; }, 0); }
  function renderBag() {
    var ls = lines();
    if (!ls.length) {
      $("dBody").innerHTML = '<p class="muted">Your bag is empty.</p>';
      $("dFoot").innerHTML = '<button class="btn gold" data-close-go="shop">Start shopping</button>';
      return;
    }
    $("dBody").innerHTML = ls.map(function (x) {
      return '<div class="line"><img src="' + esc(cover(x.p)) + '" alt=""><div class="t"><b>' + esc(x.p.name) + "</b><small>" + (x.l.size ? "Size " + esc(x.l.size) + " · " : "") + money(priceOf(x.p)) + '</small><br><span class="qty"><button data-dec="' + esc(x.l.key) + '" aria-label="One fewer">−</button><span>' + x.l.qty + '</span><button data-inc="' + esc(x.l.key) + '" aria-label="One more">+</button></span></div><div class="r"><span class="price">' + money(x.total) + '</span><button class="link" data-rm="' + esc(x.l.key) + '">Remove</button></div></div>';
    }).join("");
    $("dFoot").innerHTML = '<div class="sum total"><span>Subtotal</span><span>' + money(subtotal()) + '</span></div><p class="note">Delivery is chosen at checkout.</p><button class="btn gold" data-close-go="checkout">Checkout</button>';
  }
  $("dBody").addEventListener("click", function (e) {
    var t = e.target.closest("[data-inc],[data-dec],[data-rm]"); if (!t) return;
    var key = t.dataset.inc || t.dataset.dec || t.dataset.rm, l = cart.find(function (x) { return x.key === key; }); if (!l) return;
    if (t.dataset.inc) l.qty++; else if (t.dataset.dec) l.qty--; else l.qty = 0;
    cart = cart.filter(function (x) { return x.qty > 0; }); saveCart(); renderBag();
  });
  $("dFoot").addEventListener("click", function (e) { var t = e.target.closest("[data-close-go]"); if (t) { closeAll(); go(t.dataset.closeGo); } });
  $("bagBtn").addEventListener("click", function () { renderBag(); openOverlay($("drawer")); });

  /* ---------- Checkout ---------- */
  var coDel = 0, coPay = 0;
  function isTbc(f) { return f === null || f === "" || f === undefined; }
  function feeText(f) { return isTbc(f) ? "To be confirmed" : Number(f) === 0 ? "Free" : money(f); }
  function totalText(sub, f) { return isTbc(f) ? money(sub) + " + delivery" : money(sub + Number(f)); }
  function renderCheckout() {
    var ls = lines();
    $("coSubmit").disabled = !ls.length;
    if (coDel >= S().delivery.length) coDel = 0; if (coPay >= S().payments.length) coPay = 0;
    $("coDelivery").innerHTML = S().delivery.map(function (d, i) { return '<label class="opt"><input type="radio" name="del" value="' + i + '"' + (i === coDel ? " checked" : "") + "><span>" + esc(d.label) + "</span><span>" + feeText(d.fee) + "</span></label>"; }).join("");
    $("coPay").innerHTML = S().payments.map(function (p, i) { return '<label class="opt"><input type="radio" name="pay" value="' + i + '"' + (i === coPay ? " checked" : "") + "><span>" + esc(p.method) + "</span><span></span></label>"; }).join("") || '<p class="note">Payment details will be shared on WhatsApp.</p>';
    if (!ls.length) { $("coSummary").innerHTML = '<h2>Order summary</h2><p class="muted">Your bag is empty.</p><button class="btn" data-go="shop">Back to the shop</button>'; return; }
    var sub = subtotal(), f = (S().delivery[coDel] || {}).fee;
    $("coSummary").innerHTML = "<h2>Order summary</h2>" + ls.map(function (x) {
      return '<div class="line"><img src="' + esc(cover(x.p)) + '" alt=""><div class="t"><b>' + esc(x.p.name) + "</b><small>" + (x.l.size ? "Size " + esc(x.l.size) + " · " : "") + "Qty " + x.l.qty + '</small></div><div class="r"><span class="price">' + money(x.total) + "</span></div></div>";
    }).join("") + '<div class="sum"><span>Subtotal</span><span>' + money(sub) + '</span></div><div class="sum"><span>Delivery</span><span>' + feeText(f) + '</span></div><div class="sum total"><span>Total</span><span>' + totalText(sub, f) + "</span></div>";
  }
  $("coDelivery").addEventListener("change", function (e) { coDel = +e.target.value; renderCheckout(); });
  $("coPay").addEventListener("change", function (e) { coPay = +e.target.value; });
  $("coForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var name = $("coName").value.trim(), phone = $("coPhone").value.trim(), addr = $("coAddr").value.trim(), note = $("coNote").value.trim();
    var d = S().delivery[coDel] || { label: "", fee: 0 };
    var needAddr = !/pick/i.test(d.label);
    if (!lines().length) { $("coWarn").textContent = "Your bag is empty. Add something first."; return; }
    if (!name) { $("coWarn").textContent = "Enter your full name."; $("coName").focus(); return; }
    if (phone.replace(/\D/g, "").length < 9) { $("coWarn").textContent = "Enter a phone number we can call or WhatsApp."; $("coPhone").focus(); return; }
    if (needAddr && !addr) { $("coWarn").textContent = "Enter your delivery address or area."; $("coAddr").focus(); return; }
    $("coWarn").textContent = "";
    var dt = new Date(), pad = function (n) { return String(n).padStart(2, "0"); };
    var no = (S().orderPrefix || "ORD") + "-" + String(dt.getFullYear()).slice(2) + pad(dt.getMonth() + 1) + pad(dt.getDate()) + "-" + Math.floor(100 + Math.random() * 900);
    var order = {
      no: no, at: dt.toISOString(), name: name, phone: phone, addr: needAddr ? addr : "", note: note,
      delivery: d.label, fee: d.fee, sub: subtotal(), pay: (S().payments[coPay] || {}).method || "",
      items: lines().map(function (x) { return { name: x.p.name, size: x.l.size, qty: x.l.qty, total: x.total }; })
    };
    store("hfh-last-order", order);
    cart = []; saveCart();
    renderPay(order); go("pay");
  });

  /* ---------- Payment page ---------- */
  function orderText(o) {
    var t = "Hello " + S().storeName + ", I just placed order " + o.no + ".\n\n";
    o.items.forEach(function (i) { t += "- " + i.name + (i.size ? " (size " + i.size + ")" : "") + " x" + i.qty + ": " + money(i.total) + "\n"; });
    t += "\nSubtotal: " + money(o.sub) + "\nDelivery: " + o.delivery + " (" + feeText(o.fee) + ")\nTotal: " + totalText(o.sub, o.fee) + "\n";
    t += "\nName: " + o.name + "\nPhone: " + o.phone + (o.addr ? "\nDeliver to: " + o.addr : "") + (o.note ? "\nNote: " + o.note : "") + (o.pay ? "\nPaying with: " + o.pay : "") + "\n\nI'll send the payment screenshot here.";
    return t;
  }
  function renderPay(o) {
    var total = totalText(o.sub, o.fee), pays = S().payments;
    var chosen = pays.filter(function (p) { return p.method === o.pay; }); if (!chosen.length) chosen = pays;
    $("payBody").innerHTML =
      '<p class="eyebrow">Order placed</p><h1>Thank you, ' + esc(o.name.split(" ")[0]) + "</h1>" +
      '<div class="due"><div><span class="optlabel">Amount to pay</span><div class="amt">' + esc(total) + '</div></div><div><span class="optlabel">Order number</span><div class="mono" style="font-size:1.2rem">' + esc(o.no) + ' <button class="copy" data-copy="' + esc(o.no) + '">Copy</button></div></div></div>' +
      (isTbc(o.fee) ? '<p class="note" style="margin:-12px 0 22px">The delivery fee depends on your location. We will confirm it on WhatsApp before you pay it.</p>' : "") +
      '<ol class="steps">' +
      '<li><div class="body"><h3>Send the payment</h3>' + (chosen.length ? chosen.map(function (p) {
        return '<div class="acct"><span class="optlabel" style="margin:0">' + esc(p.method) + '</span><span class="num">' + esc(p.number) + ' <button class="copy" data-copy="' + esc(p.number) + '">Copy</button></span><span class="muted">Account name: ' + esc(p.name) + "</span></div>";
      }).join("") : '<p class="muted">We will send payment details on WhatsApp.</p>') + "</div></li>" +
      '<li><div class="body"><h3>Use your order number as the reference</h3><p class="muted" style="margin:0">Write <span class="mono" style="color:var(--ink)">' + esc(o.no) + "</span> in the reference or note so we can match your payment.</p></div></li>" +
      '<li><div class="body"><h3>Send your order and payment screenshot on WhatsApp</h3><p class="muted" style="margin:0">The button opens WhatsApp with your order already written. Attach the screenshot of your payment and send.</p><div class="cta"><a class="btn wa" target="_blank" rel="noopener" href="' + esc(waLink(orderText(o))) + '">Open WhatsApp chat</a><button class="btn" id="copyOrder">Copy order details</button></div><p class="note">If WhatsApp does not open, message or call <span class="mono" style="color:var(--ink)">' + esc(S().phones) + "</span>.</p></div></li>" +
      "</ol>" + (S().payNote ? '<p class="muted">' + esc(S().payNote) + "</p>" : "") +
      '<div class="panel summary" style="margin-top:22px"><h2>What you ordered</h2>' + o.items.map(function (i) { return '<div class="sum"><span>' + esc(i.name) + (i.size ? " · size " + esc(i.size) : "") + " × " + i.qty + "</span><span>" + money(i.total) + "</span></div>"; }).join("") +
      '<div class="sum"><span>Delivery: ' + esc(o.delivery) + "</span><span>" + feeText(o.fee) + '</span></div><div class="sum total"><span>Total</span><span>' + esc(total) + "</span></div>" + (o.addr ? '<p class="note">Deliver to: ' + esc(o.addr) + "</p>" : "") + '</div><div class="cta" style="margin-top:22px"><button class="btn" data-go="shop">Back to the shop</button></div>';
    $("copyOrder").onclick = function () { copyText(orderText(o), $("copyOrder")); };
  }
  $("payBody").addEventListener("click", function (e) { var b = e.target.closest("[data-copy]"); if (b) copyText(b.dataset.copy, b); });

  /* ---------- Admin: sign in ---------- */
  var password = sstore("hfh-pw") || "";
  var previewAdmin = false;
  function signedIn() { return BACKEND ? !!password : previewAdmin; }
  function api(path, opts) {
    opts = opts || {}; opts.headers = opts.headers || {}; opts.headers["x-admin-password"] = password;
    return fetch(path, opts).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (r.status === 401) { password = ""; sstore("hfh-pw", null); }
        if (!r.ok) { var err = new Error(j.error || "Request failed (" + r.status + ")"); err.status = r.status; throw err; }
        return j;
      });
    });
  }
  $("loginForm").addEventListener("submit", function (e) {
    e.preventDefault();
    if (!BACKEND) { previewAdmin = true; go("admin"); return; }
    var pw = $("loginPw").value;
    if (!pw) { $("loginWarn").textContent = "Enter the admin password."; return; }
    $("loginWarn").textContent = "Checking…";
    password = pw;
    api("/api/login", { method: "POST" }).then(function () {
      sstore("hfh-pw", pw); $("loginPw").value = ""; $("loginWarn").textContent = ""; go("admin");
    }, function (err) {
      password = "";
      $("loginWarn").textContent = err.status === 401 ? "That password is not right. Try again." : err.message;
    });
  });
  $("adminLink").addEventListener("click", function () { go("admin"); });
  $("adminBtn").addEventListener("click", function () { go("admin"); });
  $("logoutBtn").addEventListener("click", function () {
    if (isDirty() && $("logoutBtn").dataset.sure !== "1") { $("logoutBtn").dataset.sure = "1"; $("logoutBtn").textContent = "Discard changes and sign out"; return; }
    password = ""; previewAdmin = false; sstore("hfh-pw", null);
    work = JSON.parse(publishedStr); go("shop");
  });

  /* ---------- Admin ---------- */
  var tab = "products", editing = null, confirmDel = null, saving = false;
  function isDirty() { return work && JSON.stringify(work) !== publishedStr; }
  function markDirty() {
    var d = isDirty();
    $("pubBtn").disabled = !d || saving;
    $("pubBtn").textContent = BACKEND ? "Publish changes" : "Download store.json";
    if (!BACKEND) $("pubBtn").disabled = false;
    $("pubStatus").className = "status" + (d ? " dirty" : "");
    $("pubStatus").textContent = !BACKEND ? "Preview mode: changes stay in this browser only." : d ? "You have changes that are not live yet." : "All changes are live.";
    $("logoutBtn").dataset.sure = ""; $("logoutBtn").textContent = BACKEND ? "Sign out" : "Leave admin";
    $("meterTxt").textContent = work.products.length + " products · " + visible().length + " visible";
    $("meterBar").parentElement.hidden = true;
    renderBrand(); renderShop();
  }
  window.addEventListener("beforeunload", function (e) { if (signedIn() && isDirty() && !saving) { e.preventDefault(); e.returnValue = ""; } });

  function renderAdmin() {
    document.querySelectorAll(".anav [data-tab]").forEach(function (b) { b.setAttribute("aria-current", String(b.dataset.tab === tab)); });
    $("tabEdit").textContent = editing && editing.id && byId(editing.id) ? "Edit product" : "Add new product";
    var html = BACKEND ? "" : '<div class="banner">This copy of the site is running without its Netlify functions, so changes can\'t be saved online. You can still try the admin here, then use Download store.json and replace <span class="mono">data/store.json</span> in your site folder. See the README to turn on online saving.</div>';
    if (tab === "products") html += adminList();
    else if (tab === "edit") html += adminEditor();
    else html += adminSettings();
    $("amain").innerHTML = html;
    if (tab === "edit") wireEditor(); if (tab === "settings") wireSettings();
    markDirty();
  }
  document.querySelector(".anav").addEventListener("click", function (e) {
    var b = e.target.closest("[data-tab]"); if (!b) return;
    if (b.dataset.tab === "edit" && (!editing || (editing.id && byId(editing.id)))) editing = blankProduct();
    tab = b.dataset.tab; confirmDel = null; renderAdmin();
  });
  function blankProduct() { return { id: null, name: "", cat: S().categories[0] || "", price: "", sale: null, desc: "", sizes: "", badge: "", stock: "in", visible: true, images: [] }; }

  function adminList() {
    var ps = work.products;
    return '<div class="ahead"><h1>All products</h1><button class="btn gold small" id="addNew">Add new product</button></div>' +
      (ps.length ? '<div class="tablewrap"><table><thead><tr><th></th><th>Product</th><th>Category</th><th>Price</th><th>Status</th><th></th></tr></thead><tbody>' + ps.map(function (p, i) {
        var st = !p.visible ? '<span class="pill off">Hidden</span>' : p.stock === "out" ? '<span class="pill out">Sold out</span>' : '<span class="pill ok">On sale</span>';
        var acts = confirmDel === p.id ? '<button class="btn small danger" data-delyes="' + esc(p.id) + '">Confirm delete</button><button class="btn small" data-delno="1">Keep</button>' : '<button class="btn small" data-edit="' + esc(p.id) + '">Edit</button><button class="btn small" data-toggle="' + esc(p.id) + '">' + (p.visible ? "Hide" : "Show") + '</button><button class="btn small" data-up="' + i + '" aria-label="Move up"' + (i ? "" : " disabled") + '>↑</button><button class="btn small danger" data-del="' + esc(p.id) + '">Delete</button>';
        return "<tr><td>" + (cover(p) ? '<img src="' + esc(cover(p)) + '" alt="">' : "") + "</td><td><b>" + esc(p.name || "Untitled") + "</b></td><td>" + esc(p.cat) + '</td><td class="price">' + priceHtml(p) + "</td><td>" + st + '</td><td><div class="acts">' + acts + "</div></td></tr>";
      }).join("") + "</tbody></table></div>" : '<div class="empty">No products yet. Add your first one.</div>') +
      '<p class="note">Changes show in the store right away for you, and go live for customers when you publish.</p>';
  }
  $("amain").addEventListener("click", function (e) {
    var t = e.target;
    if (t.id === "addNew") { editing = blankProduct(); tab = "edit"; renderAdmin(); return; }
    var b = t.closest("[data-edit],[data-toggle],[data-del],[data-delyes],[data-delno],[data-up]"); if (!b) return;
    if (b.dataset.edit) { editing = JSON.parse(JSON.stringify(byId(b.dataset.edit))); tab = "edit"; renderAdmin(); return; }
    if (b.dataset.toggle) { var p = byId(b.dataset.toggle); p.visible = !p.visible; renderAdmin(); return; }
    if (b.dataset.del) { confirmDel = b.dataset.del; renderAdmin(); return; }
    if (b.dataset.delno) { confirmDel = null; renderAdmin(); return; }
    if (b.dataset.delyes) { work.products = work.products.filter(function (x) { return x.id !== b.dataset.delyes; }); confirmDel = null; renderAdmin(); toast("Product deleted. Publish to remove it from the store."); return; }
    if (b.dataset.up) { var i = +b.dataset.up, a = work.products, tmp = a[i - 1]; a[i - 1] = a[i]; a[i] = tmp; renderAdmin(); }
  });

  function adminEditor() {
    if (!editing) editing = blankProduct();
    var e = editing, cats = S().categories, fs = 'style="background:var(--bg);border:1px solid var(--line);border-radius:10px;padding:10px 12px;width:100%"';
    return '<div class="ahead"><h1>' + (e.id ? "Edit product" : "Add new product") + "</h1></div>" +
      '<div class="editor"><div class="amain">' +
      '<div class="box"><input class="title-in" id="eName" placeholder="Product name" value="' + esc(e.name) + '" aria-label="Product name" ' + fs + '>' +
      '<label class="fld" for="eDesc">Description<textarea id="eDesc" rows="7" placeholder="Material, heel height, fit, what to wear it with">' + esc(e.desc) + "</textarea></label></div>" +
      '<div class="box"><h3>Photos</h3><div class="imgs" id="eImgs"></div><div class="drop" id="eDrop"><span>Drag photos here, or</span><label class="btn small" for="eFiles">Choose photos</label><input type="file" id="eFiles" accept="image/*" multiple hidden><span class="note">The first photo is the cover. Photos are resized to keep the store fast.</span></div></div>' +
      '</div><div class="amain">' +
      '<div class="box"><h3>Status</h3><label class="fld" for="eVis">Visibility<select id="eVis"><option value="1"' + (e.visible ? " selected" : "") + '>Visible in store</option><option value="0"' + (e.visible ? "" : " selected") + '>Hidden</option></select></label>' +
      '<label class="fld" for="eStock">Stock<select id="eStock"><option value="in"' + (e.stock !== "out" ? " selected" : "") + '>In stock</option><option value="out"' + (e.stock === "out" ? " selected" : "") + ">Sold out</option></select></label>" +
      '<p class="warn" id="eWarn" aria-live="polite"></p><button class="btn gold" id="eSave">' + (e.id ? "Update product" : "Add product") + '</button><button class="link" id="eCancel">Cancel</button></div>' +
      '<div class="box"><h3>Price (' + esc(S().currency) + ')</h3><label class="fld" for="ePrice">Regular price<input id="ePrice" type="number" min="0" step="0.01" inputmode="decimal" value="' + esc(e.price) + '"></label><label class="fld" for="eSale">Sale price (optional)<input id="eSale" type="number" min="0" step="0.01" inputmode="decimal" value="' + esc(e.sale == null ? "" : e.sale) + '"></label></div>' +
      '<div class="box"><h3>Category</h3><select id="eCat" aria-label="Category" ' + fs + ">" + cats.map(function (c) { return "<option" + (c === e.cat ? " selected" : "") + ">" + esc(c) + "</option>"; }).join("") + '</select><label class="fld" for="eNewCat">Or add a new category<input id="eNewCat" placeholder="e.g. Sandals"></label></div>' +
      '<div class="box"><h3>Sizes and label</h3><label class="fld" for="eSizes">Sizes, separated by commas<input id="eSizes" placeholder="36, 37, 38, 39, 40, 41" value="' + esc(e.sizes) + '"></label><p class="note">Leave empty for bags and one-size items.</p><label class="fld" for="eBadge">Badge (optional)<input id="eBadge" placeholder="New, Bestseller, Last pair" value="' + esc(e.badge) + '"></label></div>' +
      "</div></div>";
  }
  function paintImgs() {
    $("eImgs").innerHTML = editing.images.map(function (src, i) {
      return "<figure>" + (i === 0 ? '<span class="badge cover">Cover</span>' : "") + '<img src="' + esc(src) + '" alt="Photo ' + (i + 1) + '"><figcaption><button data-il="' + i + '" aria-label="Move left"' + (i ? "" : " disabled") + '>←</button><button data-ix="' + i + '" aria-label="Remove photo">Remove</button><button data-ir="' + i + '" aria-label="Move right"' + (i < editing.images.length - 1 ? "" : " disabled") + ">→</button></figcaption></figure>";
    }).join("");
  }
  function readEditor() {
    editing.name = $("eName").value.trim(); editing.desc = $("eDesc").value.trim();
    editing.price = $("ePrice").value === "" ? "" : Number($("ePrice").value);
    editing.sale = $("eSale").value === "" ? null : Number($("eSale").value);
    var nc = $("eNewCat").value.trim(); editing.cat = nc || $("eCat").value;
    editing.sizes = $("eSizes").value.split(",").map(function (s) { return s.trim(); }).filter(Boolean).join(",");
    editing.badge = $("eBadge").value.trim(); editing.stock = $("eStock").value; editing.visible = $("eVis").value === "1";
  }
  var uploading = 0;
  function wireEditor() {
    paintImgs();
    $("eImgs").addEventListener("click", function (ev) {
      var b = ev.target.closest("button"); if (!b) return; var a = editing.images, i;
      if (b.dataset.ix) a.splice(+b.dataset.ix, 1);
      if (b.dataset.il) { i = +b.dataset.il; a.splice(i - 1, 0, a.splice(i, 1)[0]); }
      if (b.dataset.ir) { i = +b.dataset.ir; a.splice(i + 1, 0, a.splice(i, 1)[0]); }
      paintImgs();
    });
    $("eFiles").addEventListener("change", function (ev) { addFiles(ev.target.files); ev.target.value = ""; });
    var dz = $("eDrop");
    dz.addEventListener("dragover", function (ev) { ev.preventDefault(); dz.classList.add("over"); });
    dz.addEventListener("dragleave", function () { dz.classList.remove("over"); });
    dz.addEventListener("drop", function (ev) { ev.preventDefault(); dz.classList.remove("over"); addFiles(ev.dataTransfer.files); });
    $("eCancel").onclick = function () { editing = null; tab = "products"; renderAdmin(); };
    $("eSave").onclick = function () {
      readEditor();
      if (uploading) { $("eWarn").textContent = "Wait for the photos to finish uploading."; return; }
      if (!editing.name) { $("eWarn").textContent = "Give the product a name."; $("eName").focus(); return; }
      if (editing.price === "" || isNaN(editing.price)) { $("eWarn").textContent = "Enter a regular price."; $("ePrice").focus(); return; }
      if (!editing.images.length) { $("eWarn").textContent = "Add at least one photo."; return; }
      if (editing.cat && S().categories.indexOf(editing.cat) < 0) S().categories.push(editing.cat);
      if (editing.id && byId(editing.id)) { var ix = work.products.findIndex(function (p) { return p.id === editing.id; }); work.products[ix] = editing; }
      else { editing.id = "p" + Date.now().toString(36); work.products.unshift(editing); }
      var nm = editing.name; editing = null; tab = "products"; renderAdmin();
      toast(nm + " saved. Publish to make it live.");
    };
  }
  function resizeImage(file, max, q) {
    return new Promise(function (res, rej) {
      var url = URL.createObjectURL(file), img = new Image();
      img.onerror = function () { URL.revokeObjectURL(url); rej(new Error("unreadable")); };
      img.onload = function () {
        URL.revokeObjectURL(url);
        var s = Math.min(1, max / Math.max(img.width, img.height));
        var c = document.createElement("canvas"); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
        var g = c.getContext("2d"); g.fillStyle = "#ffffff"; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height);
        c.toBlob(function (b) { b ? res(b) : rej(new Error("encode")); }, "image/jpeg", q);
      };
      img.src = url;
    });
  }
  function blobToDataUrl(b) { return new Promise(function (res, rej) { var fr = new FileReader(); fr.onload = function () { res(fr.result); }; fr.onerror = rej; fr.readAsDataURL(b); }); }
  // Returns a URL for the image: uploaded to Netlify Blobs when online, a data URL in preview mode.
  function storeImage(file, max) {
    return resizeImage(file, max, 0.82).then(function (blob) {
      if (!BACKEND) return blobToDataUrl(blob);
      return api("/api/upload", { method: "POST", headers: { "content-type": "image/jpeg" }, body: blob }).then(function (j) { return j.url; });
    });
  }
  function addFiles(files) {
    var list = Array.prototype.filter.call(files || [], function (f) { return /^image\//.test(f.type); });
    if (!list.length) { $("eWarn").textContent = "Those files are not photos. Use JPG, PNG or WebP images."; return; }
    uploading++; $("eWarn").textContent = "Uploading " + list.length + (list.length === 1 ? " photo…" : " photos…");
    var target = editing;
    Promise.all(list.map(function (f) { return storeImage(f, 1200); })).then(function (urls) {
      uploading--; target.images = target.images.concat(urls);
      if (editing === target && $("eImgs")) { $("eWarn").textContent = ""; paintImgs(); }
    }, function (err) {
      uploading--;
      if ($("eWarn")) $("eWarn").textContent = err && err.status === 401 ? "Your sign-in expired. Sign in again to upload photos." : "A photo could not be uploaded. Try again, or save it as JPG first.";
    });
  }

  function adminSettings() {
    var s = S();
    function f(id, label, val, ph) { return '<label class="fld" for="' + id + '">' + label + '<input id="' + id + '" value="' + esc(val) + '" placeholder="' + esc(ph || "") + '"></label>'; }
    return '<div class="ahead"><h1>Store settings</h1><button class="btn gold small" id="sSave">Apply settings</button></div>' +
      '<div class="box"><h3>Brand</h3><div class="row2">' + f("sName", "Store name", s.storeName) + f("sTag", "Tagline", s.tagline) + '</div><label class="fld" for="sIntro">Intro text on the home page<textarea id="sIntro" rows="3">' + esc(s.intro) + "</textarea></label>" +
      '<div class="row2"><div class="fld">Logo<div class="addrow">' + (s.logo ? '<img src="' + esc(s.logo) + '" alt="" style="width:56px;height:56px;border-radius:50%;object-fit:cover">' : "") + '<label class="btn small" for="sLogo">Replace logo</label><input type="file" id="sLogo" accept="image/*" hidden></div></div>' +
      '<div class="fld">Home page photo<div class="addrow">' + (s.hero ? '<img src="' + esc(s.hero) + '" alt="" style="width:44px;height:58px;border-radius:8px;object-fit:cover">' : "") + '<label class="btn small" for="sHero">Replace photo</label><input type="file" id="sHero" accept="image/*" hidden></div></div></div></div>' +
      '<div class="box"><h3>Contact and orders</h3><div class="row2">' + f("sPhones", "Phone numbers shown to customers", s.phones, "0551816633, 0551602083") + f("sWa", "WhatsApp number for orders (with country code)", s.whatsapp, "233551816633") + "</div>" +
      '<div class="row2">' + f("sCur", "Currency symbol", s.currency, "GH₵") + f("sPrefix", "Order number prefix", s.orderPrefix, "HFH") + "</div>" +
      f("sCats", "Categories, separated by commas", s.categories.join(", "), "Heels, Bags, Accessories") + "</div>" +
      '<div class="box"><h3>Payment details shown at checkout</h3><div class="repeat" id="sPays">' + s.payments.map(function (p, i) {
        return '<div class="r">' + f("pm" + i, "Method", p.method, "MTN Mobile Money") + f("pn" + i, "Number", p.number, "0551816633") + f("pa" + i, "Account name", p.name, "Name on the account") + '<button class="btn small danger" data-rmpay="' + i + '">Remove</button></div>';
      }).join("") + '</div><button class="btn small" id="addPay">Add payment method</button><label class="fld" for="sPayNote">Payment instructions<textarea id="sPayNote" rows="3">' + esc(s.payNote) + "</textarea></label></div>" +
      '<div class="box"><h3>Delivery options</h3><div class="repeat" id="sDels">' + s.delivery.map(function (d, i) {
        return '<div class="r d">' + f("dl" + i, "Option", d.label, "Delivery within the city") + '<label class="fld" for="df' + i + '">Fee (blank = confirm later)<input id="df' + i + '" type="number" min="0" step="0.01" value="' + esc(d.fee == null ? "" : d.fee) + '"></label><button class="btn small danger" data-rmdel="' + i + '">Remove</button></div>';
      }).join("") + '</div><button class="btn small" id="addDel">Add delivery option</button></div>' +
      '<p class="warn" id="sWarn" aria-live="polite"></p>';
  }
  function readSettings() {
    var s = S();
    s.storeName = $("sName").value.trim() || s.storeName; s.tagline = $("sTag").value.trim(); s.intro = $("sIntro").value.trim();
    s.phones = $("sPhones").value.trim(); s.whatsapp = $("sWa").value.replace(/\D/g, ""); s.currency = $("sCur").value.trim() || s.currency; s.orderPrefix = $("sPrefix").value.trim().replace(/\s+/g, "") || "ORD";
    var cats = $("sCats").value.split(",").map(function (c) { return c.trim(); }).filter(Boolean);
    work.products.forEach(function (p) { if (p.cat && cats.indexOf(p.cat) < 0) cats.push(p.cat); });
    s.categories = cats;
    s.payments = s.payments.map(function (p, i) { return { method: $("pm" + i).value.trim(), number: $("pn" + i).value.trim(), name: $("pa" + i).value.trim() }; });
    s.payNote = $("sPayNote").value.trim();
    s.delivery = s.delivery.map(function (d, i) { var v = $("df" + i).value; return { label: $("dl" + i).value.trim(), fee: v === "" ? null : Number(v) }; });
  }
  function cleanSettings() {
    var s = S();
    s.payments = s.payments.filter(function (p) { return p.method || p.number; });
    s.delivery = s.delivery.filter(function (d) { return d.label; });
    if (!s.delivery.length) s.delivery = [{ label: "Pickup", fee: 0 }];
  }
  function wireSettings() {
    $("sSave").onclick = function () { readSettings(); cleanSettings(); renderAdmin(); toast("Settings applied. Publish to make them live."); };
    $("addPay").onclick = function () { readSettings(); S().payments.push({ method: "", number: "", name: "" }); renderAdmin(); };
    $("addDel").onclick = function () { readSettings(); S().delivery.push({ label: "", fee: null }); renderAdmin(); };
    $("sPays").addEventListener("click", function (e) { var b = e.target.closest("[data-rmpay]"); if (b) { readSettings(); S().payments.splice(+b.dataset.rmpay, 1); renderAdmin(); } });
    $("sDels").addEventListener("click", function (e) { var b = e.target.closest("[data-rmdel]"); if (b) { readSettings(); S().delivery.splice(+b.dataset.rmdel, 1); renderAdmin(); } });
    function img(id, key, max) {
      $(id).addEventListener("change", function (e) {
        var file = e.target.files[0]; if (!file) return;
        $("sWarn").textContent = "Uploading…";
        storeImage(file, max).then(function (u) { readSettings(); S()[key] = u; renderAdmin(); }, function () { $("sWarn").textContent = "That photo could not be uploaded. Try a JPG or PNG."; });
      });
    }
    img("sLogo", "logo", 400); img("sHero", "hero", 1100);
  }

  $("pubBtn").addEventListener("click", function () {
    if (tab === "settings" && $("sName")) { readSettings(); cleanSettings(); }
    if (!BACKEND) { downloadJson(); return; }
    if (saving) return;
    saving = true; markDirty(); $("pubStatus").textContent = "Publishing…";
    api("/api/store", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(work) }).then(function () {
      saving = false; publishedStr = JSON.stringify(work); markDirty(); toast("Published. Customers now see your changes.");
    }, function (err) {
      saving = false; markDirty();
      $("pubStatus").textContent = err.status === 401 ? "Your sign-in expired. Sign in again, then publish." : "Publishing failed: " + err.message;
      if (err.status === 401) go("login");
    });
  });
  function downloadJson() {
    var blob = new Blob([JSON.stringify(work, null, 1)], { type: "application/json" });
    var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "store.json";
    document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    toast("store.json downloaded. Replace data/store.json in your site folder with it.");
  }
  $("viewStore").addEventListener("click", function () { go("shop"); toast("Previewing the store. Use Admin to go back."); });

  /* ---------- Boot ---------- */
  load().then(function (data) {
    work = data; publishedStr = JSON.stringify(data);
    cart = (store("hfh-cart") || []).filter(function (l) { return byId(l.id); });
    saveCart(); renderBrand(); renderShop();
    if (location.hash === "#admin") go("admin");
  }).catch(function () {
    $("grid").innerHTML = '<div class="empty">The shop could not load. Refresh the page to try again.</div>';
  });
  window.addEventListener("hashchange", function () { if (location.hash === "#admin" && work) go("admin"); });
})();
