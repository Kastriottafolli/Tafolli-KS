/* ============================================================
   TAFOLLI GLASS — App logic
   i18n · navigation · scroll reveal · counters · contact · SEO
   ============================================================ */
(function () {
  "use strict";

  var S = window.SITE, I18N = window.I18N;
  var SUPPORTED = ["sq", "en", "de", "fr"];
  var DEFAULT = "sq";
  var $  = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---------- 1. Language resolution ---------- */
  function pickLang() {
    var q = new URLSearchParams(location.search).get("lang");
    if (q && SUPPORTED.indexOf(q) > -1) return q;
    try {
      var saved = localStorage.getItem("tg-lang");
      if (saved && SUPPORTED.indexOf(saved) > -1) return saved;
    } catch (e) {}
    if (S.autoDetectLanguage) {
      var navs = navigator.languages || [navigator.language || ""];
      for (var i = 0; i < navs.length; i++) {
        var code = String(navs[i]).slice(0, 2).toLowerCase();
        if (SUPPORTED.indexOf(code) > -1) return code;
        if (code === "al") return "sq";        // some devices report "al"
      }
    }
    return DEFAULT;
  }

  var lang = pickLang();

  function t(key) {
    var d = I18N[lang] || I18N[DEFAULT];
    return (d && d[key] != null) ? d[key] : (I18N[DEFAULT][key] || "");
  }

  function applyLang(next, push) {
    if (SUPPORTED.indexOf(next) < 0) next = DEFAULT;
    lang = next;
    try { localStorage.setItem("tg-lang", next); } catch (e) {}

    document.documentElement.lang = next;
    document.documentElement.setAttribute("data-lang", next);

    $$("[data-i18n]").forEach(function (el) {
      var key  = el.getAttribute("data-i18n");
      var attr = el.getAttribute("data-i18n-attr");
      var val  = t(key);
      if (attr) el.setAttribute(attr, val);
      else if (el.tagName === "TITLE") document.title = val;
      else el.textContent = val;
    });

    $("#langCur").textContent = next.toUpperCase();
    $$("#langMenu button").forEach(function (b) {
      b.setAttribute("aria-current", String(b.dataset.setlang === next));
    });

    fillContact();
    buildJsonLd();
    document.dispatchEvent(new CustomEvent("tg:lang", { detail: { lang: next } }));

    if (push) {
      var url = new URL(location.href);
      if (next === DEFAULT) url.searchParams.delete("lang");
      else url.searchParams.set("lang", next);
      history.replaceState(null, "", url);
    }
  }

  /* ---------- 2. Contact details from config ---------- */
  function hoursText() {
    return t("contact.h.mon") + ": " + S.hours.weekdays +
           " · " + t("contact.h.lunch") + " " + S.hours.lunch +
           "\n" + t("contact.h.sun") + ": " + t("contact.h.closed");
  }

  function fillContact() {
    var addr = S.street + ", " + S.village + ", " + S.city + ", " + S.country;
    var tel  = "tel:" + S.phonePrimaryTel;
    var wa   = "https://wa.me/" + S.whatsapp;
    var mail = "mailto:" + S.email;

    var set = function (sel, fn) { var el = $(sel); if (el) fn(el); };

    set("#cPhone",  function (e) { e.href = tel; });
    set("#cPhoneV", function (e) {
      e.innerHTML = "";
      e.appendChild(document.createTextNode(S.phonePrimary));
      var sp = document.createElement("span"); sp.textContent = S.phoneSecondary; e.appendChild(sp);
    });
    set("#cMail",  function (e) { e.href = mail; });
    set("#cMailV", function (e) { e.textContent = S.email; });
    set("#cAddr",  function (e) { e.href = S.mapsLink; });
    set("#cAddrV", function (e) {
      e.innerHTML = "";
      e.appendChild(document.createTextNode(S.street));
      var sp = document.createElement("span"); sp.textContent = S.village + ", " + S.city; e.appendChild(sp);
    });
    set("#cHoursV", function (e) {
      e.innerHTML = "";
      e.appendChild(document.createTextNode(t("contact.h.mon") + "  " + S.hours.weekdays));
      var s1 = document.createElement("span");
      s1.textContent = t("contact.h.lunch") + " " + S.hours.lunch + " · " + t("contact.h.sun") + ": " + t("contact.h.closed");
      e.appendChild(s1);
    });

    var map = $("#cMap");
    if (map && !map.src) {
      map.src = "https://www.google.com/maps?q=" + encodeURIComponent(S.street + ", " + S.village + ", " + S.city) + "&output=embed";
    }

    ["#footFb", "#galFb"].forEach(function (s) { set(s, function (e) { e.href = S.facebook; }); });
    ["#footWa", "#fabWa", "#formWa"].forEach(function (s) { set(s, function (e) { e.href = wa; }); });
    set("#footTel", function (e) { e.href = tel; });

    set("#fTel1", function (e) { e.href = tel; e.textContent = S.phonePrimary; });
    set("#fTel2", function (e) { e.href = "tel:" + S.phoneSecondaryTel; e.textContent = S.phoneSecondary; });
    set("#fMail", function (e) { e.href = mail; e.textContent = S.email; });
    set("#fAddr", function (e) { e.textContent = addr; });
    set("#fLegal", function (e) { e.textContent = S.legalName; });
    set("#fNui",   function (e) { e.textContent = t("footer.nui") + ": " + S.nui; });
    set("#fFormer",function (e) { e.textContent = t("footer.former") + ": " + S.formerName; });
    set("#fPlace", function (e) { e.textContent = S.village + ", " + S.city + ", " + S.country; });
    set("#yr",     function (e) { e.textContent = new Date().getFullYear(); });
  }

  /* ---------- 3. Structured data ---------- */
  function abs(path) {
    // the live domain when configured, otherwise relative to this page
    if (S.domain) return S.domain.replace(/\/$/, "") + "/" + String(path).replace(/^\.?\//, "");
    try { return new URL(path, location.href).href; } catch (e) { return path; }
  }

  function buildJsonLd() {
    var faq = [];
    for (var i = 1; i <= 7; i++) {
      faq.push({
        "@type": "Question",
        name: t("faq." + i + ".q"),
        acceptedAnswer: { "@type": "Answer", text: t("faq." + i + ".a") }
      });
    }
    var data = [{
      "@context": "https://schema.org",
      "@type": ["LocalBusiness", "HomeAndConstructionBusiness"],
      name: S.brand,
      legalName: S.legalName,
      alternateName: S.formerName,
      description: t("meta.desc"),
      image: abs("assets/img/og-image.jpg"),
      logo: abs("assets/img/logo-tafolli-glass-dark.png"),
      telephone: S.phonePrimary,
      email: S.email,
      url: S.domain ? S.domain + "/" : abs("."),
      sameAs: [S.facebook].filter(Boolean),
      address: {
        "@type": "PostalAddress",
        streetAddress: S.street,
        addressLocality: S.village,
        addressRegion: S.city,
        addressCountry: "XK"
      },
      areaServed: { "@type": "Country", name: "Kosovo" },
      openingHoursSpecification: [{
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
        opens: "08:00", closes: "17:30"
      }],
      makesOffer: [1, 2, 3, 4, 5, 6].map(function (n) {
        return { "@type": "Offer", itemOffered: { "@type": "Service", name: t("products." + n + ".t"), description: t("products." + n + ".d") } };
      })
    }, {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faq
    }];
    var tag = $("#ld-json");
    if (tag) tag.textContent = JSON.stringify(data);
  }

  /* ---------- 4. Navigation ---------- */
  function initNav() {
    var nav = $("#nav"), burger = $("#burger"), drawer = $("#drawer");
    var onScroll = function () {
      nav.classList.toggle("is-stuck", window.scrollY > 24);
      $("#toTop").classList.toggle("is-on", window.scrollY > 700);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    burger.addEventListener("click", function () {
      var open = document.body.classList.toggle("menu-open");
      burger.setAttribute("aria-expanded", String(open));
      document.body.style.overflow = open ? "hidden" : "";
    });
    drawer.addEventListener("click", function (e) {
      if (e.target.closest("a")) {
        document.body.classList.remove("menu-open");
        burger.setAttribute("aria-expanded", "false");
        document.body.style.overflow = "";
      }
    });

    // language dropdown
    var lw = $("#lang"), lb = $("#langBtn");
    lb.addEventListener("click", function (e) {
      e.stopPropagation();
      var open = lw.getAttribute("aria-expanded") !== "true";
      lw.setAttribute("aria-expanded", String(open));
      lb.setAttribute("aria-expanded", String(open));
    });
    document.addEventListener("click", function () {
      lw.setAttribute("aria-expanded", "false");
      lb.setAttribute("aria-expanded", "false");
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        lw.setAttribute("aria-expanded", "false");
        lb.setAttribute("aria-expanded", "false");
        if (document.body.classList.contains("menu-open")) burger.click();
      }
    });
    $$("#langMenu button").forEach(function (b) {
      b.addEventListener("click", function () {
        applyLang(b.dataset.setlang, true);
        lw.setAttribute("aria-expanded", "false");
        lb.setAttribute("aria-expanded", "false");
      });
    });

    $("#toTop").addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });

    // scroll-spy
    var links = $$("#navlinks a");
    var sections = links.map(function (a) { return $(a.getAttribute("href")); }).filter(Boolean);
    if ("IntersectionObserver" in window && sections.length) {
      var spy = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          links.forEach(function (a) {
            a.classList.toggle("is-active", a.getAttribute("href") === "#" + en.target.id);
          });
        });
      }, { rootMargin: "-45% 0px -50% 0px" });
      sections.forEach(function (s) { spy.observe(s); });
    }
  }

  /* ---------- 5. Reveal on scroll ---------- */
  function initReveal() {
    var items = $$(".reveal, .stat");
    if (!("IntersectionObserver" in window)) {
      items.forEach(function (el) { el.classList.add("is-in"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add("is-in");
        if (en.target.classList.contains("stat")) countUp(en.target);
        io.unobserve(en.target);
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.12 });
    items.forEach(function (el) { io.observe(el); });
  }

  /* ---------- 6. Counters ---------- */
  function countUp(stat) {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    var el = stat.querySelector("[data-count]");
    if (!el || el.dataset.done) return;
    var raw = el.textContent.trim();
    var dec = raw.indexOf(",") > -1 ? "," : ".";
    var target = parseFloat(raw.replace(",", "."));
    if (!isFinite(target) || target === 0) return;
    el.dataset.done = "1";
    var frac = (raw.split(/[.,]/)[1] || "").length;
    var t0 = performance.now(), dur = 1300;
    (function step(now) {
      var p = Math.min(1, (now - t0) / dur);
      var e = 1 - Math.pow(1 - p, 3);
      el.textContent = (target * e).toFixed(frac).replace(".", dec);
      if (p < 1) requestAnimationFrame(step);
      else el.textContent = raw;
    })(t0);
  }

  /* ---------- 7. Pointer-tracked card highlight ---------- */
  function initCards() {
    if (window.matchMedia("(hover: none)").matches) return;
    $$(".card").forEach(function (c) {
      c.addEventListener("pointermove", function (e) {
        var r = c.getBoundingClientRect();
        c.style.setProperty("--mx", ((e.clientX - r.left) / r.width * 100) + "%");
        c.style.setProperty("--my", ((e.clientY - r.top) / r.height * 100) + "%");
      });
    });
  }

  /* ---------- 8. FAQ — one open at a time ---------- */
  function initFaq() {
    var all = $$("#faqList details");
    all.forEach(function (d) {
      d.addEventListener("toggle", function () {
        if (!d.open) return;
        all.forEach(function (o) { if (o !== d) o.open = false; });
      });
    });
  }

  /* ---------- 9. Quote form ---------- */
  function initForm() {
    var form = $("#quoteForm");
    if (!form) return;

    function compose() {
      var fd = new FormData(form);
      var prod = fd.get("product") || "1";
      var prodKey = prod === "other" ? "contact.f.other" : "products." + prod + ".t";
      var L = [
        t("contact.title"),
        "",
        t("contact.f.name") + ": " + (fd.get("name") || "—"),
        t("contact.f.phone") + ": " + (fd.get("phone") || "—"),
        t("contact.f.email") + ": " + (fd.get("email") || "—"),
        t("contact.f.product") + ": " + t(prodKey),
        "",
        t("contact.f.msg") + ":",
        (fd.get("message") || "—")
      ];
      return L.join("\n");
    }

    // keep the WhatsApp button in sync with whatever is typed
    var waBtn = $("#formWa");
    var sync = function () {
      waBtn.href = "https://wa.me/" + S.whatsapp + "?text=" + encodeURIComponent(compose());
    };
    form.addEventListener("input", sync);
    sync();

    function mailtoFallback(subject) {
      location.href = "mailto:" + S.email + "?subject=" + encodeURIComponent(subject) +
                      "&body=" + encodeURIComponent(compose());
    }

    function status(msgKey, isError) {
      var ok = $("#formOk");
      ok.querySelector("span").textContent = t(msgKey);
      ok.classList.toggle("is-err", !!isError);
      ok.classList.add("is-on");
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var name = form.elements.name, phone = form.elements.phone;
      if (!name.value.trim()) { name.focus(); return; }
      if (!phone.value.trim()) { phone.focus(); return; }

      var subject = S.brand + " — " + t("nav.cta") + " (" + lang.toUpperCase() + ")";
      var btn = form.querySelector('button[type="submit"]');
      var label = btn.querySelector("span");
      var labelText = label.textContent;

      // No endpoint configured (or no PHP on the host): hand it to the mail client.
      if (!S.formEndpoint) { mailtoFallback(subject); status("contact.f.okmsg"); return; }

      var fd = new FormData(form);
      fd.append("subject", subject);
      fd.append("lang", lang);
      fd.append("productLabel", t("products." + (fd.get("product") || "1") + ".t"));
      if (fd.get("product") === "other") fd.set("productLabel", t("contact.f.other"));
      fd.append("body", compose());

      btn.setAttribute("aria-busy", "true");
      label.textContent = t("contact.f.sending");

      fetch(S.formEndpoint, { method: "POST", body: fd, headers: { "Accept": "application/json" } })
        .then(function (r) { return r.ok ? r.json() : Promise.reject(new Error("HTTP " + r.status)); })
        .then(function (d) {
          if (!d || d.ok !== true) throw new Error(d && d.error ? d.error : "rejected");
          form.reset(); sync();
          status("contact.f.okmsg");
        })
        .catch(function () {
          status("contact.f.errmsg", true);
          mailtoFallback(subject);
        })
        .finally(function () {
          btn.removeAttribute("aria-busy");
          label.textContent = labelText;
        });
    });
  }

  /* ---------- 11. Glass thickness ---------- */
  var THICKS = [4, 5, 6, 8, 10, 12, 16, 20];
  var PX_PER_MM = 11;

  function initThickness() {
    var seg = $("#thickSeg");
    if (!seg) return;

    // ruler ticks: one per mm up to the largest option
    var ruler = $("#thickRuler");
    if (ruler && !ruler.childElementCount) {
      var maxMm = THICKS[THICKS.length - 1];
      // label every 4 mm once the scale gets long, otherwise every 2
      var every = maxMm > 12 ? 4 : 2;
      for (var mm = 0; mm <= maxMm; mm++) {
        var tick = document.createElement("i");
        tick.style.bottom = (mm * PX_PER_MM) + "px";
        tick.style.width = (mm % every === 0) ? "16px" : "9px";
        if (mm % every === 0) tick.setAttribute("data-major", "");
        ruler.appendChild(tick);
        if (mm % every === 0 && mm > 0) {
          var lab = document.createElement("span");
          lab.textContent = mm;
          lab.style.bottom = (mm * PX_PER_MM - 6) + "px";
          ruler.appendChild(lab);
        }
      }
      ruler.style.height = (maxMm * PX_PER_MM + 20) + "px";
    }

    function show(mm) {
      $("#thickSlab").style.setProperty("--t", (mm * PX_PER_MM) + "px");
      $("#thickVal").textContent = mm;
      $("#thickDim").textContent = mm + " mm";
      $("#thickDesc").textContent = t("thick." + mm + ".d");
      $$("#thickSeg button").forEach(function (b) {
        b.setAttribute("aria-pressed", String(+b.dataset.mm === mm));
      });
      seg.dataset.mm = mm;
    }

    $$("#thickSeg button").forEach(function (b) {
      b.addEventListener("click", function () { show(+b.dataset.mm); });
    });
    show(6);
    document.addEventListener("tg:lang", function () { show(+seg.dataset.mm || 6); });
  }

  /* ---------- 12. Four seasons ---------- */
  var SEASON_TEMP = { 1: ["+14°", "21°"], 2: ["+32°", "22°"], 3: ["+9°", "21°"], 4: ["−12°", "22°"] };

  function initSeasons() {
    var box = $("#seasons");
    if (!box) return;

    // weather particles, scattered once
    var mk = function (sel, n, build) {
      var host = $(sel, box);
      if (!host || host.childElementCount) return;
      for (var i = 0; i < n; i++) host.appendChild(build(i));
    };
    var drop = function () {
      var el = document.createElement("i");
      el.style.left = (Math.random() * 100) + "%";
      el.style.top = (-10 - Math.random() * 30) + "%";
      el.style.animationDuration = (0.55 + Math.random() * 0.5) + "s";
      el.style.animationDelay = (-Math.random() * 2) + "s";
      return el;
    };
    var floaty = function () {
      var el = document.createElement("i");
      el.style.left = (Math.random() * 100) + "%";
      el.style.top = (-10 - Math.random() * 30) + "%";
      el.style.animationDuration = (4 + Math.random() * 4) + "s";
      el.style.animationDelay = (-Math.random() * 6) + "s";
      return el;
    };
    mk(".wx--rain", 34, drop);
    mk(".wx--snow", 26, floaty);
    mk(".wx--leaf", 12, floaty);

    function show(n) {
      box.dataset.season = n;
      $("#seasonName").textContent = t("seasons." + n + ".n");
      $("#seasonDesc").textContent = t("seasons." + n + ".d");
      $("#tOut").textContent = SEASON_TEMP[n][0];
      $("#tIn").textContent = SEASON_TEMP[n][1];
      $$("#seasonSeg button").forEach(function (b) {
        b.setAttribute("aria-pressed", String(+b.dataset.season === n));
      });
    }

    $$("#seasonSeg button").forEach(function (b) {
      b.addEventListener("click", function () {
        show(+b.dataset.season);
        var auto = $("#seasonAuto");
        if (auto) { auto.checked = false; stop(); }
      });
    });

    var timer = null;
    function stop() { clearInterval(timer); timer = null; }
    function start() {
      if (timer || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      timer = setInterval(function () {
        show((+box.dataset.season % 4) + 1);
      }, 5200);
    }
    var auto = $("#seasonAuto");
    if (auto) auto.addEventListener("change", function () { auto.checked ? start() : stop(); });

    // only cycle while the section is actually on screen
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (es) {
        if (es[0].isIntersecting && auto && auto.checked) start(); else stop();
      }, { threshold: 0.25 }).observe(box);
    } else { start(); }

    show(2);
    document.addEventListener("tg:lang", function () { show(+box.dataset.season || 2); });
  }

  /* ---------- 13. Lightbox ---------- */
  function initLightbox() {
    var lb = $("#lb");
    if (!lb) return;
    var btns = $$("#gal .gal__btn");
    if (!btns.length) return;
    var idx = 0, lastFocus = null;

    var MAX_UPSCALE = 1.8;   // past this, a small photo just looks blurry

    function fit() {
      var img = $("#lbImg");
      if (!img.naturalWidth) return;
      var s = Math.min(
        MAX_UPSCALE,
        (window.innerWidth * 0.92) / img.naturalWidth,
        (window.innerHeight * 0.72) / img.naturalHeight
      );
      img.style.width = Math.round(img.naturalWidth * s) + "px";
    }

    function render() {
      var b = btns[idx], img = $("#lbImg");
      img.style.width = "";
      img.src = b.dataset.full;
      img.alt = t(b.dataset.cap);
      if (img.complete) fit(); else img.onload = fit;
      $("#lbCap").textContent = t(b.dataset.cap);
      $("#lbCount").textContent = (idx + 1) + " / " + btns.length;
    }
    window.addEventListener("resize", function () {
      if (lb.classList.contains("is-open")) fit();
    });
    function open(i) {
      idx = i; lastFocus = document.activeElement;
      render();
      lb.classList.add("is-open");
      lb.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";
      $("#lbClose").focus();
    }
    function close() {
      lb.classList.remove("is-open");
      lb.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
      if (lastFocus) lastFocus.focus();
    }
    var step = function (d) { idx = (idx + d + btns.length) % btns.length; render(); };

    btns.forEach(function (b, i) { b.addEventListener("click", function () { open(i); }); });
    $("#lbClose").addEventListener("click", close);
    $("#lbPrev").addEventListener("click", function () { step(-1); });
    $("#lbNext").addEventListener("click", function () { step(1); });
    lb.addEventListener("click", function (e) {
      // only the backdrop closes — not the image, the caption or the controls
      if (e.target.closest(".lb__fig, .lb__nav, .lb__x")) return;
      close();
    });

    document.addEventListener("keydown", function (e) {
      if (!lb.classList.contains("is-open")) return;
      if (e.key === "Escape") close();
      else if (e.key === "ArrowLeft") step(-1);
      else if (e.key === "ArrowRight") step(1);
      else if (e.key === "Tab") { e.preventDefault(); $("#lbClose").focus(); }
    });

    // swipe on touch
    var x0 = null;
    lb.addEventListener("touchstart", function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener("touchend", function (e) {
      if (x0 === null) return;
      var dx = e.changedTouches[0].clientX - x0;
      if (Math.abs(dx) > 55) step(dx < 0 ? 1 : -1);
      x0 = null;
    });

    document.addEventListener("tg:lang", function () {
      if (lb.classList.contains("is-open")) render();
    });
  }

  /* ---------- 10. Boot ---------- */
  function boot() {
    applyLang(lang, false);
    initNav();
    initReveal();
    initCards();
    initFaq();
    initForm();
    initThickness();
    initSeasons();
    initLightbox();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

  // expose for the 3D module
  window.TG = { t: function (k) { return t(k); }, getLang: function () { return lang; } };
})();
