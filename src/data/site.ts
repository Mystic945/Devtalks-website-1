/* ============================================================
   DEVTALKS — CONTENT
   ------------------------------------------------------------
   The one file most people need to edit. Ported from the old
   js/data-3.js with the values unchanged; the only additions
   are the types, so a missing date or a mistyped field is
   caught by the editor instead of by a blank section.
   ============================================================ */

export interface Site {
  eventName: string; edition: string; theme: string; tagline: string; intro: string;
  /** Countdown target. Format: YYYY-MM-DDTHH:MM:SS+05:30 */
  date: string; dateLabel: string; timeLabel: string;
  venue: string; venueLine2: string; venueShort: string; mapLink: string;
  club: string; college: string;
  /** Where every "Get tickets" button points. Paste your form link here. */
  registerUrl: string; sponsorMail: string; contactMail: string;
  socials: Record<string, string>;
}
export interface Stat    { value: number; suffix: string; label: string }
export interface Speaker { name: string; role: string; org: string; talk: string; photo: string; bio: string; icon: string; tags: string[]; link: string }
export interface Perk    { icon: 'play' | 'cup' | 'mic'; label: string; note: string }
export interface Offer   { title: string; body: string }
export interface Reel    { src: string; poster: string; label: string }
export interface GalleryShot { src: string; label: string }
export interface SchedRow{ time: string; title: string; who: string; kind: 'talk' | 'break' }
export interface Pass    { tag: string; kind: string; price: string; priceNote: string; chip: string; cta: string; fine: string; url: string }
export interface SponsorTier { tier: string; items: { name: string; logo: string; url: string }[] }
export interface Faq     { q: string; a: string }

export const SITE: Site = {
  eventName: 'DevTalks',
  edition: '2026',
  theme: 'Ideas Worth Building',
  tagline: 'Three talks from people who shipped the thing, not just tweeted about it.',
  intro: 'DevTalks brings builders, researchers and founders onto one stage for long-form, idea-dense talks. No panels. No fluff. Three people, twenty-five minutes each, explaining the thing they made and why it mattered.',
  date: '2026-11-14T10:00:00+05:30',
  dateLabel: 'Sat, 14 November 2026',
  timeLabel: '10:00 AM — 4:00 PM IST',
  venue: 'Main Auditorium, D.Y. Patil Institute of Technology',
  venueLine2: 'Sector 29, Nigdi Pradhikaran, Pimpri-Chinchwad, Pune 411044',
  venueShort: 'DYPIT, Pimpri · Pune',
  mapLink: 'https://maps.google.com/?q=D.Y.+Patil+Institute+of+Technology+Pimpri+Pune',
  club: 'The Developers Club',
  college: 'D.Y. Patil Institute of Technology, Pimpri',
  registerUrl: '#tickets',
  sponsorMail: 'mailto:devtalks@dypit.ac.in?subject=DevTalks%202026%20Sponsorship',
  contactMail: 'mailto:devtalks@dypit.ac.in',
  socials: {
    instagram: 'https://instagram.com/',
    linkedin: 'https://linkedin.com/',
    x: 'https://x.com/',
    youtube: 'https://youtube.com/',
    github: 'https://github.com/'
  }
};

/** Hero marquee strip. */
export const MARQUEE: string[] = [
  '3 SPEAKERS',
  '1 STAGE',
  '600 SEATS',
  'ZERO SLIDES OF FILLER',
  'IDEAS WORTH BUILDING',
  'NOV 14',
  'PUNE'
];

export const STATS: Stat[] = [
  { value: 3, suffix: '', label: 'Speakers on stage' },
  { value: 600, suffix: '+', label: 'Seats in the hall' },
  { value: 25, suffix: '', label: 'Minutes per talk' },
  { value: 12, suffix: '+', label: 'Colleges attending' }
];

/** Three of them, so each card carries real weight on the page. */
export const SPEAKERS: Speaker[] = [
  {
    name: 'Speaker One',
    role: 'Founder & CTO',
    org: 'Company Name',
    talk: "Shipping Before You're Ready",
    photo: '/assets/speakers/placeholder-1.jpg',
    bio: 'Replace this with a 60–90 word bio. With only three speakers there is room for more than a line — who they are, what they built, the scale it runs at, and the one detail that makes a student want to hear them speak. Keep it factual: products, years, numbers. Avoid adjectives and avoid anything that reads like a LinkedIn headline.',
    icon: 'terminal',
    tags: ['Startups', 'Engineering'],
    link: ''
  },
  {
    name: 'Speaker Two',
    role: 'Research Scientist',
    org: 'Lab / Institute',
    talk: "What Models Still Can't Do",
    photo: '/assets/speakers/placeholder-2.jpg',
    bio: 'Replace this with a 60–90 word bio. With only three speakers there is room for more than a line — who they are, what they built, the scale it runs at, and the one detail that makes a student want to hear them speak. Keep it factual: products, years, numbers. Avoid adjectives and avoid anything that reads like a LinkedIn headline.',
    icon: 'chip',
    tags: ['AI', 'Research'],
    link: ''
  },
  {
    name: 'Speaker Three',
    role: 'Principal Engineer',
    org: 'Company Name',
    talk: 'The Systems Nobody Sees',
    photo: '/assets/speakers/placeholder-3.jpg',
    bio: 'Replace this with a 60–90 word bio. With only three speakers there is room for more than a line — who they are, what they built, the scale it runs at, and the one detail that makes a student want to hear them speak. Keep it factual: products, years, numbers. Avoid adjectives and avoid anything that reads like a LinkedIn headline.',
    icon: 'stack',
    tags: ['Infra', 'Scale'],
    link: ''
  }
];

/** The hero's "What you get" tile. Keep it to three. */
export const PERKS: Perk[] = [
  { icon: 'play', label: 'Talk recordings', note: 'Every pass' },
  { icon: 'cup', label: 'Lunch & chai', note: 'Included' },
  { icon: 'mic', label: 'Meet the speakers', note: 'Q&A after every talk' }
];

/** "What the day gives you" in the About section. Each line is a real
    row in SCHEDULE below — change one, change the other. */
export const OFFERS: Offer[] = [
  {
    title: 'Three long-form talks',
    body: 'Twenty-five minutes each. One speaker, one idea, start to finish.'
  },
  {
    title: 'Q&A after every talk',
    body: 'Twenty minutes with the person who actually built the thing.'
  },
  {
    title: 'All three on stage',
    body: 'The speakers come back together to close the day and take questions.'
  },
  {
    title: 'Demo floor & booths',
    body: 'Student projects and sponsor teams on the ground floor all afternoon.'
  }
];

/** Leave src and poster empty and the card renders as a numbered slot. */
export const REELS: Reel[] = [
  { src: '', poster: '', label: '' },
  { src: '', poster: '', label: '' },
  { src: '', poster: '', label: '' },
  { src: '', poster: '', label: '' },
  { src: '', poster: '', label: '' },
  { src: '', poster: '', label: '' }
];

export const GALLERY: GalleryShot[] = [
  { src: '/assets/gallery/g-01.jpg', label: '' },
  { src: '/assets/gallery/g-02.jpg', label: '' },
  { src: '/assets/gallery/g-03.jpg', label: '' },
  { src: '/assets/gallery/g-04.jpg', label: '' },
  { src: '/assets/gallery/g-05.jpg', label: '' },
  { src: '/assets/gallery/g-06.jpg', label: '' },
  { src: '/assets/gallery/g-07.jpg', label: '' },
  { src: '/assets/gallery/g-08.jpg', label: '' },
  { src: '/assets/gallery/g-09.jpg', label: '' },
  { src: '/assets/gallery/g-10.jpg', label: '' },
  { src: '/assets/gallery/g-11.jpg', label: '' },
  { src: '/assets/gallery/g-12.jpg', label: '' }
];

export const SCHEDULE: SchedRow[] = [
  {
    time: '09:15',
    title: 'Doors open & registration',
    who: 'Volunteer desk, main foyer',
    kind: 'break'
  },
  { time: '10:00', title: 'Opening & why DevTalks', who: 'Organising team', kind: 'talk' },
  { time: '10:20', title: "Shipping Before You're Ready", who: 'Speaker One', kind: 'talk' },
  { time: '10:55', title: 'Q&A with Speaker One', who: 'Audience', kind: 'talk' },
  { time: '11:15', title: 'Chai break', who: 'Foyer', kind: 'break' },
  { time: '11:40', title: "What Models Still Can't Do", who: 'Speaker Two', kind: 'talk' },
  { time: '12:15', title: 'Q&A with Speaker Two', who: 'Audience', kind: 'talk' },
  { time: '12:35', title: 'Lunch', who: 'Campus canteen', kind: 'break' },
  { time: '13:45', title: 'The Systems Nobody Sees', who: 'Speaker Three', kind: 'talk' },
  { time: '14:20', title: 'Q&A with Speaker Three', who: 'Audience', kind: 'talk' },
  { time: '14:40', title: 'Demo floor & sponsor booths', who: 'Ground floor', kind: 'break' },
  { time: '15:20', title: 'All three on stage — open panel', who: 'Everyone', kind: 'talk' },
  { time: '15:50', title: 'Prizes & group photo', who: 'Everyone', kind: 'talk' },
  { time: '16:00', title: 'Doors close', who: '', kind: 'break' }
];

/** DevTalks is free: one pass, not three tiers. */
export const PASS: Pass = {
  tag: 'Free entry',
  kind: 'General pass',
  price: 'Free',
  priceNote: 'No charge. Just register.',
  chip: '600 seats · registration required',
  cta: 'Get your free pass',
  fine: 'Free for everyone. Seats are capped by the hall.',
  url: ''
};

export const SPONSORS: SponsorTier[] = [
  { tier: 'Title Partner', items: [{ name: 'Your Brand Here', logo: '', url: '' }] },
  {
    tier: 'Gold Partners',
    items: [
      { name: 'Sponsor Two', logo: '', url: '' },
      { name: 'Sponsor Three', logo: '', url: '' },
      { name: 'Sponsor Four', logo: '', url: '' }
    ]
  },
  {
    tier: 'Silver Partners',
    items: [
      { name: 'Sponsor Five', logo: '', url: '' },
      { name: 'Sponsor Six', logo: '', url: '' },
      { name: 'Sponsor Seven', logo: '', url: '' },
      { name: 'Sponsor Eight', logo: '', url: '' }
    ]
  },
  {
    tier: 'Community Partners',
    items: [
      { name: 'Community One', logo: '', url: '' },
      { name: 'Community Two', logo: '', url: '' },
      { name: 'Community Three', logo: '', url: '' },
      { name: 'Community Four', logo: '', url: '' },
      { name: 'Community Five', logo: '', url: '' },
      { name: 'Community Six', logo: '', url: '' }
    ]
  }
];

export const FAQS: Faq[] = [
  {
    q: 'Who can attend DevTalks?',
    a: 'Anyone. Students from any college, working professionals, and alumni are all welcome. You do not need to be from the host college and you do not need to code.'
  },
  {
    q: 'Only three speakers — why so few?',
    a: 'Because twenty-five minutes plus a real Q&A beats eight rushed slots. Fewer speakers means each one can actually go deep, and you get to ask them something afterwards.'
  },
  {
    q: 'Can I transfer my pass?',
    a: "Yes. Mail us at least 48 hours before the event with the new attendee's name and we'll update the list."
  },
  {
    q: 'Will the talks be recorded?',
    a: 'Yes. Every talk is recorded and published on our YouTube channel roughly three weeks after the event. Pass holders get the links first.'
  },
  {
    q: 'Is food included?',
    a: 'Lunch and two chai breaks are included with every pass. Vegetarian and Jain options are available — mention it on the registration form.'
  },
  {
    q: 'How do I get to the venue?',
    a: 'The venue is a short auto ride from Nigdi and Akurdi stations. Parking is available on campus. The full map link is in the venue section above.'
  },
  {
    q: 'Can my company sponsor?',
    a: "Yes. We have title, gold, silver and community tiers, plus booth-only options. Mail us and we'll send the deck within a day."
  },
  {
    q: 'Be honest. Is it just for the free food?',
    a: "Yes. We know that's why you're coming. Lunch is at 12:35, it's genuinely good, and the talks either side of it are worth staying awake for."
  }
];
