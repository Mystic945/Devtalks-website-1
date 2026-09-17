/* ============================================================
   DEVTALKS — CONTENT FILE
   ------------------------------------------------------------
   This is the ONLY file most people need to edit.
   Change the text below and the whole site updates.
   Do not remove the commas, quotes or curly braces.
   ============================================================ */

const SITE = {
  eventName:   "DevTalks",
  edition:     "2026",
  theme:       "Ideas Worth Building",
  tagline:     "A day of talks from people who shipped the thing, not just tweeted about it.",
  intro:       "DevTalks brings builders, researchers and founders onto one stage for short, sharp, idea-dense talks. No panels. No fluff. Just people explaining the thing they made and why it mattered.",

  // Countdown target. Format: YYYY-MM-DDTHH:MM:SS+05:30
  date:        "2026-11-14T10:00:00+05:30",
  dateLabel:   "Sat, 14 November 2026",
  timeLabel:   "10:00 AM — 5:30 PM IST",

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

/* ---------- MARQUEE STRIP (hero bottom + section breaks) ---------- */
const MARQUEE = [
  "8 SPEAKERS", "1 STAGE", "600 SEATS", "ZERO SLIDES OF FILLER",
  "IDEAS WORTH BUILDING", "NOV 14", "PUNE"
];

/* ---------- STATS ---------- */
const STATS = [
  { value: 8,   suffix: "",  label: "Speakers on stage" },
  { value: 600, suffix: "+", label: "Seats in the hall" },
  { value: 18,  suffix: "",  label: "Minutes per talk" },
  { value: 12,  suffix: "+", label: "Colleges attending" }
];

/* ---------- SPEAKERS ----------
   photo: put a square image in assets/speakers/ and write "assets/speakers/name.jpg"
   Leave photo as "" and the site draws a clean initials tile instead.
------------------------------------------------------------------ */
const SPEAKERS = [
  {
    name:  "Speaker One",
    role:  "Founder & CTO",
    org:   "Company Name",
    talk:  "Shipping Before You're Ready",
    photo: "",
    bio:   "Replace this with a 40–60 word bio. Who they are, what they built, and the one line that makes a student want to hear them speak. Keep it factual — awards, scale, years, products. Avoid adjectives.",
    tags:  ["Startups", "Engineering"],
    link:  ""
  },
  {
    name:  "Speaker Two",
    role:  "Research Scientist",
    org:   "Lab / Institute",
    talk:  "What Models Still Can't Do",
    photo: "",
    bio:   "Replace this with a 40–60 word bio. Who they are, what they built, and the one line that makes a student want to hear them speak. Keep it factual — awards, scale, years, products. Avoid adjectives.",
    tags:  ["AI", "Research"],
    link:  ""
  },
  {
    name:  "Speaker Three",
    role:  "Principal Engineer",
    org:   "Company Name",
    talk:  "The Systems Nobody Sees",
    photo: "",
    bio:   "Replace this with a 40–60 word bio. Who they are, what they built, and the one line that makes a student want to hear them speak. Keep it factual — awards, scale, years, products. Avoid adjectives.",
    tags:  ["Infra", "Scale"],
    link:  ""
  },
  {
    name:  "Speaker Four",
    role:  "Design Lead",
    org:   "Studio Name",
    talk:  "Designing for People Who Are In A Hurry",
    photo: "",
    bio:   "Replace this with a 40–60 word bio. Who they are, what they built, and the one line that makes a student want to hear them speak. Keep it factual — awards, scale, years, products. Avoid adjectives.",
    tags:  ["Design", "Product"],
    link:  ""
  },
  {
    name:  "Speaker Five",
    role:  "Hardware Engineer",
    org:   "Company Name",
    talk:  "Embedded Systems in the Real World",
    photo: "",
    bio:   "Replace this with a 40–60 word bio. Who they are, what they built, and the one line that makes a student want to hear them speak. Keep it factual — awards, scale, years, products. Avoid adjectives.",
    tags:  ["Hardware", "IoT"],
    link:  ""
  },
  {
    name:  "Speaker Six",
    role:  "Open Source Maintainer",
    org:   "Project Name",
    talk:  "Maintaining Something 40,000 People Depend On",
    photo: "",
    bio:   "Replace this with a 40–60 word bio. Who they are, what they built, and the one line that makes a student want to hear them speak. Keep it factual — awards, scale, years, products. Avoid adjectives.",
    tags:  ["Open Source"],
    link:  ""
  },
  {
    name:  "Speaker Seven",
    role:  "Security Researcher",
    org:   "Company Name",
    talk:  "How I Broke It, Politely",
    photo: "",
    bio:   "Replace this with a 40–60 word bio. Who they are, what they built, and the one line that makes a student want to hear them speak. Keep it factual — awards, scale, years, products. Avoid adjectives.",
    tags:  ["Security"],
    link:  ""
  },
  {
    name:  "Speaker Eight",
    role:  "To Be Announced",
    org:   "",
    talk:  "Announcing Soon",
    photo: "",
    bio:   "This slot is still being confirmed. Follow along on Instagram for the announcement.",
    tags:  ["TBA"],
    link:  ""
  }
];

/* ---------- SCHEDULE ---------- */
const SCHEDULE = [
  { time: "09:15", title: "Doors open & registration",   who: "Volunteer desk, main foyer", kind: "break" },
  { time: "10:00", title: "Opening & why DevTalks",      who: "Organising team",            kind: "talk"  },
  { time: "10:20", title: "Shipping Before You're Ready",who: "Speaker One",                kind: "talk"  },
  { time: "10:45", title: "What Models Still Can't Do",  who: "Speaker Two",                kind: "talk"  },
  { time: "11:10", title: "Chai break",                  who: "Foyer",                      kind: "break" },
  { time: "11:35", title: "The Systems Nobody Sees",     who: "Speaker Three",              kind: "talk"  },
  { time: "12:00", title: "Designing for People Who Are In A Hurry", who: "Speaker Four",    kind: "talk"  },
  { time: "12:30", title: "Lunch",                       who: "Campus canteen",             kind: "break" },
  { time: "13:45", title: "Embedded Systems in the Real World", who: "Speaker Five",         kind: "talk"  },
  { time: "14:10", title: "Maintaining Something 40,000 People Depend On", who: "Speaker Six", kind: "talk" },
  { time: "14:40", title: "Demo floor & sponsor booths", who: "Ground floor",               kind: "break" },
  { time: "15:30", title: "How I Broke It, Politely",    who: "Speaker Seven",              kind: "talk"  },
  { time: "16:00", title: "Closing talk",                who: "To be announced",            kind: "talk"  },
  { time: "16:40", title: "Q&A, prizes & group photo",   who: "Everyone",                   kind: "talk"  },
  { time: "17:30", title: "Doors close",                 who: "",                           kind: "break" }
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

/* ---------- SPONSORS ----------
   logo: put a PNG/SVG in assets/sponsors/ and write "assets/sponsors/name.svg"
   Leave logo as "" and the site draws a clean text tile instead.
------------------------------------------------------------------ */
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
    q: "Can I speak at DevTalks?",
    a: "Speaker slots for this edition are closed, but we open a call for proposals about four months before each edition. Follow us on Instagram to catch it."
  },
  {
    q: "Can my company sponsor?",
    a: "Yes. We have title, gold, silver and community tiers, plus booth-only options. Mail us and we'll send the deck within a day."
  }
];
