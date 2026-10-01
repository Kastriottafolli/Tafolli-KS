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
      var prodKey = "products." + (fd.get("product") || "1") + ".t";
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

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var name = form.elements.name, phone = form.elements.phone;
      if (!name.value.trim()) { name.focus(); return; }
      if (!phone.value.trim()) { phone.focus(); return; }

      var subject = S.brand + " — " + t("nav.cta") + " (" + lang.toUpperCase() + ")";
      location.href = "mailto:" + S.email + "?subject=" + encodeURIComponent(subject) +
                      "&body=" + encodeURIComponent(compose());

      var ok = $("#formOk");
      ok.querySelector("span").textContent = t("contact.sub");
      ok.classList.add("is-on");
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
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

  // expose for the 3D module
  window.TG = { t: function (k) { return t(k); }, getLang: function () { return lang; } };
})();
