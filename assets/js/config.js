/* ============================================================
   TAFOLLI GLASS — Site configuration
   Edit this file to update contact details across the whole site.
   ============================================================ */
window.SITE = {
  brand: "Tafolli Glass",
  domain: "https://www.tafolliglass.net",
  legalName: "TAFOLLI GLASS SH.P.K.",
  formerName: 'Fabrika e Xhamave "Teuta"',
  nui: "812363208",

  // --- Behaviour -----------------------------------------------
  // false = every visitor lands on Albanian (the main language).
  // true  = the site opens in the visitor's browser language when it is
  //         one of sq / en / de / fr. A saved choice or ?lang= always wins.
  autoDetectLanguage: false,

  // Where the quote form posts. "contact.php" is the small PHP script in this
  // repository, which mails the request to `email` above — it needs a host
  // that runs PHP (DreamHost does; GitHub Pages does not).
  // If the request fails, the form falls back to opening the visitor's mail
  // client. Set to "" to always use that fallback.
  formEndpoint: "contact.php",

  // --- Contact -------------------------------------------------
  phonePrimary:   "+383 44 602 211",
  phonePrimaryTel: "+38344602211",
  phoneSecondary: "+383 49 602 211",
  phoneSecondaryTel: "+38349602211",
  whatsapp:       "38344602211",          // without "+"
  email:          "info@tafolliglass.com",
  // --- Location ------------------------------------------------
  street:   "Rr. Fadil Kabashi nr. 177",
  village:  "Sopijë",
  city:     "Suharekë (Therandë)",
  country:  "Kosovë",
  mapsQuery: "Fabrika+e+Xhamave+Teuta,+Rr.+Fadil+Kabashi,+Sopije,+Suhareke,+Kosovo",
  mapsLink: "https://www.google.com/maps/search/?api=1&query=Fabrika+e+Xhamave+Teuta+Sopije+Suhareke",

  // --- Social --------------------------------------------------
  facebook: "https://www.facebook.com/tafolliglass",
  instagram: "", // TODO: add if available

  // --- Opening hours (24h) ------------------------------------
  hours: { weekdays: "08:00 – 17:30", saturday: "08:00 – 17:30", sunday: null, lunch: "12:00 – 13:00" }
};
