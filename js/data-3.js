/* ============================================================
   DEVTALKS — CONTENT FILE (three-speaker edition)
   ------------------------------------------------------------
   Read by index.html, the site's only page. js/data.js (the
   eight-speaker version) is unused now — it belonged to the
   variant pages this repo used to carry.

   This is the ONLY file most people need to edit.
   Change the text below and the page updates.
   Do not remove the commas, quotes or curly braces.
   ============================================================ */

const SITE = {
  eventName:   "DevTalks",
  edition:     "2026",
  theme:       "Ideas Worth Building",
  tagline:     "Three talks from people who shipped the thing, not just tweeted about it.",
  intro:       "DevTalks brings builders, researchers and founders onto one stage for long-form, idea-dense talks. No panels. No fluff. Three people, twenty-five minutes each, explaining the thing they made and why it mattered.",

  // Countdown target. Format: YYYY-MM-DDTHH:MM:SS+05:30
  date:        "2026-11-14T10:00:00+05:30",
  dateLabel:   "Sat, 14 November 2026",
  timeLabel:   "10:00 AM — 4:00 PM IST",

  venue:       "Main Auditorium, D.Y. Patil Institute of Technology",
  venueLine2:  "Sector 29, Nigdi Pradhikaran, Pimpri-Chinchwad, Pune 411044",
  venueShort:  "DYPIT, Pimpri · Pune",
  mapLink:     "https://maps.google.com/?q=D.Y.+Patil+Institute+of+Technology+Pimpri+Pune",

  club:        "The Developers Club",
  college:     "D.Y. Patil Institute of Technology, Pimpri",

  // Where the "Get Tickets" / "Register" buttons point.
  // Paste a Google Form / Konfhub / Luma link here.
  registerUrl: "#tickets",
  sponsorMail: "mailto:devtalks@dypit.ac.in?subject=DevTalks%202026%20Sponsorship",
  contactMail: "mailto:devtalks@dypit.ac.in",

  socials: {
    instagram: "https://instagram.com/",
    linkedin:  "https://linkedin.com/",
    x:         "https://x.com/",
    youtube:   "https://youtube.com/",
    github:    "https://github.com/"
  }
};

/* ---------- MARQUEE STRIP (hero bottom) ---------- */
const MARQUEE = [
  "3 SPEAKERS", "1 STAGE", "600 SEATS", "ZERO SLIDES OF FILLER",
  "IDEAS WORTH BUILDING", "NOV 14", "PUNE"
];

/* ---------- STATS ---------- */
const STATS = [
  { value: 3,   suffix: "",  label: "Speakers on stage" },
  { value: 600, suffix: "+", label: "Seats in the hall" },
  { value: 25,  suffix: "",  label: "Minutes per talk" },
  { value: 12,  suffix: "+", label: "Colleges attending" }
];

/* ---------- SPEAKERS ----------
   Three of them, so each card carries real weight on the page.
   photo: put a portrait image (4:5 works best — e.g. 800x1000) in
   assets/speakers/ and write "assets/speakers/name.jpg".
   Leave photo as "" and the site draws a clean initials tile instead.
------------------------------------------------------------------ */
const SPEAKERS = [
  {
    name:  "Speaker One",
    role:  "Founder & CTO",
    org:   "Company Name",
    talk:  "Shipping Before You're Ready",
    photo: "assets/speakers/placeholder-1.jpg",
    bio:   "Replace this with a 60–90 word bio. With only three speakers there is room for more than a line — who they are, what they built, the scale it runs at, and the one detail that makes a student want to hear them speak. Keep it factual: products, years, numbers. Avoid adjectives and avoid anything that reads like a LinkedIn headline.",
    icon:  "terminal",          // topic icon on the glass card
    tags:  ["Startups", "Engineering"],
    link:  ""
  },
  {
    name:  "Speaker Two",
    role:  "Research Scientist",
    org:   "Lab / Institute",
    talk:  "What Models Still Can't Do",
    photo: "assets/speakers/placeholder-2.jpg",
    bio:   "Replace this with a 60–90 word bio. With only three speakers there is room for more than a line — who they are, what they built, the scale it runs at, and the one detail that makes a student want to hear them speak. Keep it factual: products, years, numbers. Avoid adjectives and avoid anything that reads like a LinkedIn headline.",
    icon:  "chip",
    tags:  ["AI", "Research"],
    link:  ""
  },
  {
    name:  "Speaker Three",
    role:  "Principal Engineer",
    org:   "Company Name",
    talk:  "The Systems Nobody Sees",
    photo: "assets/speakers/placeholder-3.jpg",
    bio:   "Replace this with a 60–90 word bio. With only three speakers there is room for more than a line — who they are, what they built, the scale it runs at, and the one detail that makes a student want to hear them speak. Keep it factual: products, years, numbers. Avoid adjectives and avoid anything that reads like a LinkedIn headline.",
    icon:  "stack",
    tags:  ["Infra", "Scale"],
    link:  ""
  }
];

/* ---------- SCHEDULE ---------- */
const SCHEDULE = [
  { time: "09:15", title: "Doors open & registration",      who: "Volunteer desk, main foyer", kind: "break" },
  { time: "10:00", title: "Opening & why DevTalks",         who: "Organising team",            kind: "talk"  },
  { time: "10:20", title: "Shipping Before You're Ready",   who: "Speaker One",                kind: "talk"  },
  { time: "10:55", title: "Q&A with Speaker One",           who: "Audience",                   kind: "talk"  },
  { time: "11:15", title: "Chai break",                     who: "Foyer",                      kind: "break" },
  { time: "11:40", title: "What Models Still Can't Do",     who: "Speaker Two",                kind: "talk"  },
  { time: "12:15", title: "Q&A with Speaker Two",           who: "Audience",                   kind: "talk"  },
  { time: "12:35", title: "Lunch",                          who: "Campus canteen",             kind: "break" },
  { time: "13:45", title: "The Systems Nobody Sees",        who: "Speaker Three",              kind: "talk"  },
  { time: "14:20", title: "Q&A with Speaker Three",         who: "Audience",                   kind: "talk"  },
  { time: "14:40", title: "Demo floor & sponsor booths",    who: "Ground floor",               kind: "break" },
  { time: "15:20", title: "All three on stage — open panel", who: "Everyone",                  kind: "talk"  },
  { time: "15:50", title: "Prizes & group photo",           who: "Everyone",                   kind: "talk"  },
  { time: "16:00", title: "Doors close",                    who: "",                           kind: "break" }
];

/* ---------- TICKETS ---------- */
const TICKETS = [
  {
    name:     "Student",
    price:    "₹199",
    strike:   "₹349",
    note:     "Valid college ID required at entry",
    featured: false,
    perks:    ["Full-day access", "Lunch & chai", "Event lanyard", "Talk recordings"],
    cta:      "Get student pass",
    url:      ""
  },
  {
    name:     "Early Bird",
    price:    "₹399",
    strike:   "₹599",
    note:     "First 150 passes only",
    featured: true,
    perks:    ["Everything in Student", "Reserved front rows", "DevTalks tee", "Speaker meet & greet"],
    cta:      "Grab early bird",
    url:      ""
  },
  {
    name:     "Professional",
    price:    "₹899",
    strike:   "",
    note:     "For working professionals & alumni",
    featured: false,
    perks:    ["Everything in Early Bird", "Networking lunch table", "Sponsor floor access", "Printed programme"],
    cta:      "Book professional",
    url:      ""
  }
];

/* ---------- SPONSORS ---------- */
const SPONSORS = [
  {
    tier: "Title Partner",
    items: [ { name: "Your Brand Here", logo: "", url: "" } ]
  },
  {
    tier: "Gold Partners",
    items: [
      { name: "Sponsor Two",   logo: "", url: "" },
      { name: "Sponsor Three", logo: "", url: "" },
      { name: "Sponsor Four",  logo: "", url: "" }
    ]
  },
  {
    tier: "Silver Partners",
    items: [
      { name: "Sponsor Five",  logo: "", url: "" },
      { name: "Sponsor Six",   logo: "", url: "" },
      { name: "Sponsor Seven", logo: "", url: "" },
      { name: "Sponsor Eight", logo: "", url: "" }
    ]
  },
  {
    tier: "Community Partners",
    items: [
      { name: "Community One",   logo: "", url: "" },
      { name: "Community Two",   logo: "", url: "" },
      { name: "Community Three", logo: "", url: "" },
      { name: "Community Four",  logo: "", url: "" },
      { name: "Community Five",  logo: "", url: "" },
      { name: "Community Six",   logo: "", url: "" }
    ]
  }
];

/* ---------- FAQ ---------- */
const FAQS = [
  {
    q: "Who can attend DevTalks?",
    a: "Anyone. Students from any college, working professionals, and alumni are all welcome. You do not need to be from the host college and you do not need to code."
  },
  {
    q: "Only three speakers — why so few?",
    a: "Because twenty-five minutes plus a real Q&A beats eight rushed slots. Fewer speakers means each one can actually go deep, and you get to ask them something afterwards."
  },
  {
    q: "Is the pass transferable or refundable?",
    a: "Passes are non-refundable but transferable. Mail us at least 48 hours before the event with the new attendee's name and we'll update the list."
  },
  {
    q: "Will the talks be recorded?",
    a: "Yes. Every talk is recorded and published on our YouTube channel roughly three weeks after the event. Pass holders get the links first."
  },
  {
    q: "Is food included?",
    a: "Lunch and two chai breaks are included with every pass. Vegetarian and Jain options are available — mention it on the registration form."
  },
  {
    q: "How do I get to the venue?",
    a: "The venue is a short auto ride from Nigdi and Akurdi stations. Parking is available on campus. The full map link is in the venue section above."
  },
  {
    q: "Can my company sponsor?",
    a: "Yes. We have title, gold, silver and community tiers, plus booth-only options. Mail us and we'll send the deck within a day."
  }
];
