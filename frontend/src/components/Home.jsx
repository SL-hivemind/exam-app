import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Database,
  UploadCloud,
  Edit3,
  Eye,
  ShieldCheck,
  Smartphone,
  ClipboardList,
  FileBarChart,
  Bot,
  Target,
  Leaf,
  Timer,
  ArrowRight,
  CheckCircle2,
  PlayCircle,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  BarChart3,
} from "lucide-react";
import { Seo } from "./common";
import { SITE_NAME, SITE_URL } from "../utils/site";

/* ----------------------------------------------------------------------- */
/* Data                                                                     */
/* ----------------------------------------------------------------------- */

const STAGES = [
  {
    number: "01",
    name: "Build",
    tagline: "Set the paper before the first bell",
    features: [
      {
        icon: Database,
        title: "Question Repository",
        desc: "Skip typing questions by hand. Filter the curated bank by subject, chapter and topic, and a full, error-free paper is ready in under a minute.",
      },
      {
        icon: UploadCloud,
        title: "Bring Your Own Questions",
        desc: "Teachers with their own uniquely written questions upload them straight to the secure platform and run a fully custom exam.",
      },
    ],
  },
  {
    number: "02",
    name: "Conduct",
    tagline: "Run the hall without the chaos",
    features: [
      {
        icon: Edit3,
        title: "Live Error Correction",
        desc: "Catch a typo mid-exam? Fix it from the dashboard and it lands on every screen in under a second — no reprint, no interruption.",
      },
      {
        icon: Eye,
        title: "Live Command Center",
        desc: "Catch tab-switching, monitor live activity, and reset a stuck session in one tap — right from your dashboard.",
      },
      {
        icon: ShieldCheck,
        title: "Bank-Grade Security",
        desc: "Shuffled options, locked browsers and live monitoring keep academic integrity intact — cheating becomes virtually impossible.",
      },
      {
        icon: Smartphone,
        title: "Take It From Anywhere",
        desc: "A sick or absent student can sit the exam securely from a phone at home, so attendance still reads 100%.",
      },
    ],
  },
  {
    number: "03",
    name: "Conclude",
    tagline: "Close the loop before the bell rings twice",
    features: [
      {
        icon: ClipboardList,
        title: "Internal Marks, Logged Automatically",
        desc: "Every slip test and weekly assessment records itself into a running average — ready whenever internal marks reporting is due.",
      },
      {
        icon: FileBarChart,
        title: "Exam Report, On Tap",
        desc: "No more compiling a PTM sheet by hand — a simple, downloadable report is ready the moment the exam ends, and every student can check their own on their own phone with a student login.",
      },
    ],
  },
  {
    number: "04",
    name: "Beyond",
    tagline: "Keep them learning after the paper's done",
    features: [
      {
        icon: Bot,
        title: "Private AI Tutor",
        desc: "A focused chatbot gives students instant, accurate answers to theory questions, and feeds engagement data straight to your dashboard.",
      },
      {
        icon: Target,
        title: "Competitive Exam Ready",
        desc: "JEE, NEET, SSC, Banking, Railways and GATE aspirants rehearse on the same professional digital interface they'll meet on the real exam day.",
      },
    ],
  },
];

const IMPACT_STATS = [
  { icon: Timer, value: 60, suffix: " sec", label: "to generate a full exam" },
  { icon: Leaf, value: 100, suffix: "%", label: "paperless, from day one" },
  { icon: FileBarChart, value: 1, suffix: "-click", label: "to download every exam report" },
];

/* The four scenarios the scenario section renders. Stills are authored
   separately and dropped into /images/scenes/ — every slot carries explicit
   1200x900 dimensions so the row does not move when they land, and so a
   <video poster preload="none"> can replace the <img> without touching CSS. */
const SCENARIOS = [
  {
    id: "sick-day",
    img: "/images/scenes/sick-student-home.webp",
    alt: "A student sitting up in bed at home, taking a timed exam on a phone",
    kicker: "Tuesday, 9:40 a.m.",
    story:
      "Meera woke up with a fever. She still sat the unit test — from her bed, on her mother's phone, on the same clock as everyone in the hall.",
    capability: "Take it from anywhere",
    capabilityDesc:
      "Locked browser, shuffled options, live monitoring. Attendance still reads 100%.",
    icon: Smartphone,
  },
  {
    id: "teacher-on-leave",
    img: "/images/scenes/teacher-remote-check.webp",
    alt: "A teacher at a kitchen table watching live exam answers arrive on a laptop",
    kicker: "Thursday, her free period",
    story:
      "Mrs. Rao was on leave, and her Class 9 had just finished Chapter 4. She pushed a ten-question check from home and watched the answers land, live.",
    capability: "A chapter check in under a minute",
    capabilityDesc:
      "Filter the bank by chapter, publish, and open the command centre from wherever you are.",
    icon: ClipboardList,
  },
  {
    id: "no-more-print-nights",
    img: "/images/scenes/no-more-print-night.webp",
    alt: "A dark, empty staff room at night with a switched-off photocopier",
    kicker: "The night before",
    story:
      "No draft. No proof-read at eleven. No box of four hundred sheets — and no correction to Question 12 read out in every room.",
    capability: "Fix a typo mid-exam",
    capabilityDesc:
      "Correct it once on the dashboard; it lands on every screen in under a second. No reprint.",
    icon: Edit3,
  },
  {
    id: "time-with-students",
    img: "/images/scenes/time-with-students.webp",
    alt: "A teacher sitting with two students, going through a topic-wise breakdown on a tablet",
    kicker: "Friday afternoon",
    story:
      "The papers graded themselves at the last submit. So the hour that used to go to a red pen went to the six students who got kinematics wrong.",
    capability: "Analysis, not a single number",
    capabilityDesc:
      "Topic-by-topic accuracy per student and per class, ready before anyone leaves the room.",
    icon: BarChart3,
  },
];

const ROSTER = [
  "normal", "normal", "normal", "normal", "flagged", "normal",
  "normal", "normal", "normal", "normal", "normal", "flagged",
  "normal", "normal", "normal", "normal", "normal", "normal",
];

/* ----------------------------------------------------------------------- */
/* Hooks                                                                    */
/* ----------------------------------------------------------------------- */

function useReveal(threshold = 0.18) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.unobserve(el);
        }
      },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, visible];
}

function useCountUp(target, active, duration = 1300) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!active) return;
    let raf;
    let start = null;
    const step = (ts) => {
      if (start === null) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.floor(eased * target));
      if (progress < 1) raf = requestAnimationFrame(step);
      else setValue(target);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [active, target, duration]);
  return value;
}

/* ----------------------------------------------------------------------- */
/* Small building blocks                                                    */
/* ----------------------------------------------------------------------- */

function Reveal({ children, className = "", delay = 0, as: Tag = "div" }) {
  const [ref, visible] = useReveal();
  return (
    <Tag
      ref={ref}
      className={`reveal ${visible ? "reveal-in" : ""} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </Tag>
  );
}

function TiltCard({ children, className = "", intensity = 9 }) {
  const ref = useRef(null);
  const [style, setStyle] = useState({});

  const onMove = (e) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setStyle({
      transform: `perspective(1000px) rotateY(${x * intensity}deg) rotateX(${-y * intensity}deg)`,
    });
  };
  const onLeave = () =>
    setStyle({ transform: "perspective(1000px) rotateY(0deg) rotateX(0deg)" });

  return (
    <div
      ref={ref}
      className={`tilt-card ${className}`}
      style={style}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
    >
      {children}
    </div>
  );
}

function SpotlightCard({ children, className = "" }) {
  const ref = useRef(null);
  const onMove = (e) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - rect.left}px`);
    el.style.setProperty("--my", `${e.clientY - rect.top}px`);
  };
  return (
    <div ref={ref} className={`spot-card glow-border ${className}`} onMouseMove={onMove}>
      <div className="spot-glow" />
      <div className="spot-content">{children}</div>
    </div>
  );
}

function Marquee({ items, duration = 26 }) {
  return (
    <div className="marquee-wrap">
      <div className="marquee-track" style={{ animationDuration: `${duration}s` }}>
        {[...items, ...items].map((item, i) => (
          <span className="marquee-item" key={i}>
            {item}
            <span className="marquee-dot">•</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function ImpactStat({ stat }) {
  const [ref, visible] = useReveal(0.4);
  const value = useCountUp(stat.value, visible);
  const Icon = stat.icon;
  return (
    <div ref={ref} className={`impact-stat reveal ${visible ? "reveal-in" : ""}`}>
      <Icon size={20} className="impact-icon" />
      <div className="impact-value mono">
        {value.toLocaleString()}
        {stat.suffix}
      </div>
      <div className="impact-label">{stat.label}</div>
    </div>
  );
}

/* The exam loop, drawn: build -> conduct -> grade -> analyse.
   Replaced a three.js icosahedron + two tori. Home is imported eagerly in
   AppRoutes, so that decoration put the whole of three into main.js and every
   route on the site paid for it. Coordinates are hardcoded on purpose —
   Math.cos yields 220.00000000000003 in the prerendered snapshot.
   r = 150 in a 440 box; circumference = 942.478. */
/* `beat` is which of the four strikes stops here — NOT this list's order. The
   arc's path begins a quarter turn before Build, so it reaches Conduct first.
   Driving the blink off the array index lit a node the arc had not arrived at.
   These values are measured, not derived: seeking every orbit animation to the
   same cycle time and mapping the arc's midpoint to node coordinates gives
   Conduct at 6% of the cycle, Grade at 31%, Analyse at 56%, Build at 81%. */
const ORBIT_NODES = [
  { key: "build", label: "Build", sub: "in under a minute", cx: 220, cy: 70, beat: 3 },
  { key: "conduct", label: "Conduct", sub: "on any phone", cx: 370, cy: 220, beat: 0 },
  { key: "grade", label: "Grade", sub: "before the bell", cx: 220, cy: 370, beat: 1 },
  { key: "analyse", label: "Analyse", sub: "not just a number", cx: 70, cy: 220, beat: 2 },
];

/* 72 ticks, 5deg apart, drawn as real lines. They were a repeating-conic-
   gradient masked into a ring — at r=130 each 0.55deg wedge renders under 2px
   wide, so anti-aliasing gave every mark a different weight and the ring looked
   ragged. Deg 0 is top; y grows downward, so increasing deg runs clockwise. */
const ORBIT_TICKS = Array.from({ length: 72 }, (_, i) => {
  const rad = (i * 5 - 90) * (Math.PI / 180);
  return {
    x1: +(220 + 127 * Math.cos(rad)).toFixed(2),
    y1: +(220 + 127 * Math.sin(rad)).toFixed(2),
    x2: +(220 + 134 * Math.cos(rad)).toFixed(2),
    y2: +(220 + 134 * Math.sin(rad)).toFixed(2),
  };
});

function LifecycleOrbit() {
  return (
    <div className="orbit">
      <div className="orbit-ring">
        <svg
          className="orbit-svg"
          viewBox="0 0 440 440"
          role="img"
          aria-labelledby="orbitTitle orbitDesc"
          focusable="false"
        >
          <title id="orbitTitle">The SL Exams cycle</title>
          <desc id="orbitDesc">
            Build, conduct, grade and analyse — one loop that closes the same day.
          </desc>

          <defs>
            <linearGradient id="orbitStroke" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#f5a623" stopOpacity="0.85" />
              <stop offset="55%" stopColor="#6c7cff" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#4ade80" stopOpacity="0.6" />
            </linearGradient>
            <radialGradient id="orbitCore" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#f5a623" stopOpacity="0.18" />
              <stop offset="65%" stopColor="#f5a623" stopOpacity="0.03" />
              <stop offset="100%" stopColor="#f5a623" stopOpacity="0" />
            </radialGradient>
          </defs>

          <circle className="orbit-core" cx="220" cy="220" r="122" fill="url(#orbitCore)" />

          <g className="orbit-ticks">
            {ORBIT_TICKS.map((t, i) => (
              <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} />
            ))}
          </g>
          <circle className="orbit-track" cx="220" cy="220" r="150" />

          {/* rotate -90 so the comet departs from Build (top), not 3 o'clock.
              Everything that "spins" here animates stroke-dashoffset rather
              than rotating a node — rotating an SVG child needs
              transform-box: fill-box, which floors us at Safari 15.4. */}
          <g transform="rotate(-90 220 220)">
            <circle className="orbit-inner-a" cx="220" cy="220" r="116" />
            <circle className="orbit-inner-b" cx="220" cy="220" r="86" />
            <circle className="orbit-runner" cx="220" cy="220" r="150" />
          </g>

          {ORBIT_NODES.map((n) => (
            <g key={n.key} className="orbit-node" style={{ "--i": n.beat }}>
              <circle className="orbit-node-halo" cx={n.cx} cy={n.cy} r="12" />
              <circle className="orbit-node-dot" cx={n.cx} cy={n.cy} r="5.5" />
            </g>
          ))}
        </svg>

        {/* The browser-tab mark. An HTML <img>, not an SVG <image>, so it gets
            real width/height attributes — what the CLS audit and the preload
            matcher both read. Above the fold, so deliberately NOT lazy. */}
        <img
          className="orbit-mark"
          src="/favicon-192.png"
          width="96"
          height="96"
          alt=""
          aria-hidden="true"
          decoding="async"
          fetchPriority="high"
        />
      </div>

      {/* HTML, not <text>: inherits the page fonts without SVG scaling quirks,
          and the same DOM reflows into a legend row below 1000px. */}
      <div className="orbit-labels">
        {ORBIT_NODES.map((n) => (
          <span key={n.key} className={`orbit-label orbit-label-${n.key}`}>
            <span className="orbit-label-name">{n.label}</span>
            <span className="orbit-label-sub mono">{n.sub}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------------- */
/* Main component                                                           */
/* ----------------------------------------------------------------------- */

const HERO_WORDS = ["Everything's", "instant.", "Why", "not", "exams?"];

/* Capability chips around the orbit, one per quadrant, read clockwise from the
   top left so each sits beside the stage it belongs to: chapter-wise building,
   auto-save during the paper, proctoring while it runs, grading at the end. */
const HERO_BADGES = [
  { key: "tl", icon: Database, label: "Chapter-wise", tone: "amber" },
  { key: "tr", icon: CheckCircle2, label: "Auto-saved", tone: "mint" },
  { key: "br", icon: ShieldCheck, label: "Proctoring on", tone: "indigo" },
  { key: "bl", icon: Sparkles, label: "Auto-graded", tone: "amber" },
];

export default function Home() {
  const navigate = useNavigate();
  const [activeStage, setActiveStage] = useState(0);
  const [loaded, setLoaded] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
  const stageRefs = useRef([]);

  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 500);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveStage(Number(entry.target.dataset.idx));
          }
        });
      },
      { threshold: 0.5, rootMargin: "-15% 0px -35% 0px" }
    );
    stageRefs.current.forEach((el) => el && obs.observe(el));
    return () => obs.disconnect();
  }, []);

  return (
    <div className="slexam">
      {/* Search intent first, brand last. The title was
          "SL EXAMS | Saaradaa Learknowations" — findable only by someone who
          already knew the company name, which is not who a homepage is for. */}
      <Seo
        path="/"
        /* The homepage serves two audiences — schools buying an exam system
           and students looking for practice — and was only speaking to the
           second. Both sets of words are here now. */
        title="Online Exam Software for Schools & Free Chapter Practice Tests"
        description="Conduct secure online exams and school assessments — unit tests, slip tests and board exam practice — or practise free subject and chapter-wise questions and mock tests for JEE, NEET, CBSE, SSC, RRB, Police and Banking. Instant results and analytics."
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: SITE_NAME,
          url: SITE_URL,
          potentialAction: {
            '@type': 'SearchAction',
            target: {
              '@type': 'EntryPoint',
              urlTemplate: `${SITE_URL}/public?q={search_term_string}`,
            },
            'query-input': 'required name=search_term_string',
          },
        }}
      />
      {/* The orbit's centre mark is the hero's only image and sits above the
          fold. React 19 hoists this into <head>, and because / is prerendered
          it lands in the static HTML — every other route is served the pristine
          shell by prerender.js, so it does not bleed onto them. */}
      <link rel="preload" as="image" href="/favicon-192.png" fetchPriority="high" />
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');

        .slexam {
          --bg: transparent;
          --bg-alt: rgba(13, 18, 32, 0.4);
          --surface: #12182a;
          --surface-2: #161e33;
          --border: rgba(255,255,255,0.09);
          --border-soft: rgba(255,255,255,0.05);
          --text: #eef0f6;
          --text-dim: #9aa3ba;
          --text-faint: #626d89;
          --amber: #f5a623;
          --amber-soft: #ffcf7a;
          --mint: #4ade80;
          --indigo: #6c7cff;
          --red: #f2685c;
          font-family: 'Inter', sans-serif;
          background: var(--bg);
          color: var(--text);
          position: relative;
          overflow-x: hidden;
          line-height: 1.5;
          -webkit-font-smoothing: antialiased;
        }
        .slexam *, .slexam *::before, .slexam *::after { box-sizing: border-box; }
        .slexam a { color: inherit; text-decoration: none; }
        .slexam button { font-family: inherit; }

        .mono { font-family: 'JetBrains Mono', monospace; }
        .container { max-width: 1520px; margin: 0 auto; padding: 0 20px; }

        .reveal { opacity: 0; transform: translateY(26px); transition: opacity .8s cubic-bezier(.16,.84,.44,1), transform .8s cubic-bezier(.16,.84,.44,1); }
        .reveal-in { opacity: 1; transform: none; }

        /* background-image: var(--amber) was invalid — --amber is a colour, not
           a gradient — so it computed to none while color:transparent still
           applied, and both consumers rendered as rgba(0,0,0,0). Verified live:
           the hero subhead was blank space on the deployed site. The fallback
           colour now paints on its own, and only goes transparent where
           background-clip:text is actually supported. */
        .grad-text {
          color: var(--amber-soft);
          background-image: linear-gradient(96deg, var(--amber-soft) 0%, var(--amber) 46%, #ffe6b3 100%);
          -webkit-background-clip: text; background-clip: text;
        }
        @supports ((-webkit-background-clip: text) or (background-clip: text)) {
          .grad-text { -webkit-text-fill-color: transparent; color: transparent; }
        }

        /* ---------------- Card edge ----------------
           Was a conic-gradient ring rotating around the border, whose amber
           and indigo stops read as two bright rays sweeping each card — on
           the hero mock windows they ran permanently. Replaced with a static
           hairline: the cards still separate from the background, without
           anything moving. Class names kept so the markup is untouched. */
        .glow-border { position: relative; }
        .glow-border::before {
          content: "";
          position: absolute;
          inset: 0;
          border-radius: inherit;
          padding: 1px;
          background: rgba(255,255,255,0.10);
          -webkit-mask: #000 content-box, #000;
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          opacity: 0;
          transition: opacity .3s ease;
          pointer-events: none;
          z-index: 2;
        }
        .glow-border:hover::before { opacity: 1; }
        .glow-border-always::before { opacity: 0.7; }

        /* ---------------- Reveal loader ---------------- */
        .mount-curtain { position: fixed; inset: 0; z-index: 200; background: #0a0e1a; display: flex; align-items: center; justify-content: center; transition: opacity .6s cubic-bezier(.16,.84,.44,1), visibility .6s; }
        .curtain-hide { opacity: 0; pointer-events: none; visibility: hidden; }
        .curtain-logo { width: 280px; height: 280px; object-fit: contain; animation: curtainPulse 1.6s ease-in-out infinite; }
        @keyframes curtainPulse { 0%,100% { transform: scale(1); filter: drop-shadow(0 0 6px rgba(56,149,248,.25)); } 50% { transform: scale(1.06); filter: drop-shadow(0 0 16px rgba(56,149,248,.45)) drop-shadow(0 0 24px rgba(246,137,20,.2)); } }

        /* ---------------- Buttons ---------------- */
        .btn { display: inline-flex; align-items: center; gap: 9px; padding: 14px 26px; border-radius: 11px; font-weight: 600; font-size: 15px; cursor: pointer; border: 1px solid transparent; transition: transform .25s ease, box-shadow .25s ease, background .25s ease, border-color .25s ease; white-space: nowrap; }
        .btn-primary { background: var(--amber); color: #1a1305; box-shadow: 0 10px 26px -10px rgba(245,166,35,0.6); }
        .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 16px 32px -10px rgba(245,166,35,0.7); }
        .btn-ghost { background: rgba(255,255,255,0.03); border-color: var(--border); color: var(--text); }
        .btn-ghost:hover { background: rgba(255,255,255,0.08); transform: translateY(-2px); border-color: rgba(255,255,255,0.18); }
        .btn-sm { padding: 10px 18px; font-size: 13.5px; }

        .slexam a:focus-visible, .slexam button:focus-visible { outline: 2px solid var(--amber); outline-offset: 3px; border-radius: 6px; }

        /* ---------------- Hero ---------------- */
        .hero { position: relative; padding: 48px 0 40px; overflow: hidden; min-height: calc(100vh - 60px); display: flex; flex-direction: column; justify-content: center; }
        .perspective-grid {
          position: absolute;
          left: 50%;
          bottom: -80px;
          width: 1500px;
          height: 480px;
          transform: translateX(-50%) perspective(600px) rotateX(62deg);
          background-image:
            linear-gradient(rgba(245,166,35,0.14) 1px, transparent 1px),
            linear-gradient(90deg, rgba(245,166,35,0.14) 1px, transparent 1px);
          background-size: 46px 46px;
          -webkit-mask-image: linear-gradient(to top, #000 8%, transparent 78%);
          mask-image: linear-gradient(to top, #000 8%, transparent 78%);
          animation: gridMove 5s linear infinite;
          pointer-events: none;
          z-index: 0;
        }
        @keyframes gridMove { from { background-position: 0 0, 0 0; } to { background-position: 0 46px, 46px 0; } }

        .hero-inner { position: relative; z-index: 2; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; align-items: center; }
        .eyebrow { display: inline-flex; align-items: center; gap: 8px; padding: 7px 15px; border: 1px solid var(--border); border-radius: 999px; font-family: 'JetBrains Mono', monospace; font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--amber-soft); background: rgba(245,166,35,0.07); margin-bottom: 26px; }
        .eyebrow-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--mint); box-shadow: 0 0 8px var(--mint); animation: pulseDot 1.8s ease-in-out infinite; }
        @keyframes pulseDot { 0%,100% { opacity: 1; } 50% { opacity: 0.35; } }

        /* Capped at 52px the hero filled only 60% of its own min-height —
           198px of dead space above the content and 142px below. */
        .hero-title { font-family: 'Space Grotesk', sans-serif; font-size: clamp(34px, 4.8vw, 68px); line-height: 1.08; font-weight: 700; letter-spacing: -0.025em; margin: 0 0 22px; }
        .hero-title-word { display: inline-block; opacity: 0; transform: translateY(30px); animation: wordUp .7s cubic-bezier(.16,.84,.44,1) forwards; margin-right: 0.24em; }
        @keyframes wordUp { to { opacity: 1; transform: translateY(0); } }
        /* No longer .grad-text — this is the line that was rendering invisible,
           so it gets a plain colour rather than anything clip-dependent. */
        .hero-title-line2 { display: block; margin-top: 16px; font-size: clamp(17px, 1.7vw, 25px); font-weight: 500; line-height: 1.5; color: var(--text-dim); max-width: 34ch; }

        .hero-ctas { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; margin-bottom: 30px; }
        /* The school action is the primary button; /public and /thinklets are
           navigation on this page, not competing calls to action. */
        .hero-link { display: inline-flex; align-items: center; gap: 7px; font-size: 14px; color: var(--text-dim); background: none; border: none; padding: 6px 2px; cursor: pointer; border-bottom: 1px solid transparent; transition: color .2s ease, border-color .2s ease; }
        .hero-link:hover { color: var(--text); border-bottom-color: rgba(245,166,35,0.5); }
        .hero-stats { display: flex; gap: 48px; flex-wrap: wrap; }
        .hero-stat-value { font-family: 'Space Grotesk', sans-serif; font-size: 32px; font-weight: 700; color: var(--text); line-height: 1.1; }
        .hero-stat-label { font-size: 13.5px; color: var(--text-faint); margin-top: 4px; }

        .hero-visual { position: relative; height: 600px; display: flex; align-items: center; justify-content: center; }
        .tilt-card { transition: transform .15s ease-out; transform-style: preserve-3d; }

        /* ---------------- Hero orbit ----------------
           Was a three.js icosahedron plus two tori. That pulled the whole of
           three (~2MB of source, ~170KB gzip) into main.js — and because Home
           is imported eagerly in AppRoutes, every route on the site downloaded
           it, for a decoration on one. This draws what the product actually is:
           build -> conduct -> grade -> analyse, one loop that closes. */
        /* .hero-orbit-wrap carries the width. .orbit itself must not size
           itself off its own content — as a flex item of a centring flex
           parent that is shrink-to-fit, so a percentage width on .orbit-ring
           would resolve against nothing and collapse the whole ring. */
        .hero-orbit-wrap { position: relative; width: 100%; max-width: 580px; }
        .orbit { position: relative; display: flex; flex-direction: column; align-items: center; z-index: 1; width: 100%; }
        .orbit-ring { position: relative; width: 100%; aspect-ratio: 1; }
        .orbit-svg { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; }

        .orbit-track { fill: none; stroke: rgba(255,255,255,0.09); stroke-width: 1; }

        /* The headline promises instant, so the ring must not glide. It jumps a
           quarter lap in 0.48s, holds for a beat, then jumps again — four
           strikes per 8s cycle, landing exactly on the four nodes. Every other
           animation here is phase-locked to those four moments.
           Quarter lap = 942.478 / 4 = 235.62. */
        .orbit-runner {
          fill: none; stroke: url(#orbitStroke); stroke-width: 3.25; stroke-linecap: round;
          stroke-dasharray: 210 732.478;            /* 2*pi*150 = 942.478 */
          animation: orbitStrike 8s linear infinite;
          filter: drop-shadow(0 0 9px rgba(245,166,35,0.42));
        }
        /* One lap in 8s at constant speed — so it passes a node every 2s, which
           is exactly the blink cadence. The start offset is phased so the arc's
           MIDPOINT (not its leading edge) coincides with a node at each blink:
           midpoint = -offset + 105, half the 210 arc. Starting at -74.07 puts
           the midpoint on Conduct at 6% of the cycle, Grade at 31%, Analyse at
           56%, Build at 81% — the four beats the nodes already fire on.
           The travel is exactly one circumference, so the loop is seamless. */
        @keyframes orbitStrike {
          from { stroke-dashoffset: -74.07; }
          to   { stroke-dashoffset: -1016.548; }   /* -74.07 - 942.478 */
        }

        /* Two inner rings turning steadily, in opposite directions. Deliberately
           NOT on the strike beat — the mechanism runs continuously underneath
           while the result lands instantly on the outer ring.
           Both dash patterns have a 24-unit period, and each animation travels a
           whole multiple of 24 (720 and 528 — the nearest multiples to their
           circumferences, 728.849 and 540.354) so the pattern is identical at
           both ends of the loop and there is no jump on restart. The old 2-unit
           dashes rendered as ragged specks; nothing under 8 units survives here. */
        .orbit-inner-a {
          fill: none; stroke: rgba(108,124,255,0.30); stroke-width: 1; stroke-dasharray: 10 14;
          animation: dashA 26s linear infinite;
        }
        @keyframes dashA { to { stroke-dashoffset: 720; } }
        .orbit-inner-b {
          fill: none; stroke: rgba(74,222,128,0.22); stroke-width: 1; stroke-dasharray: 8 16;
          animation: dashB 34s linear infinite;
        }
        @keyframes dashB { to { stroke-dashoffset: -528; } }

        /* The core flares on each strike, not on a lazy sine. */
        .orbit-core { animation: coreFlare 8s ease-out infinite; }
        @keyframes coreFlare {
          0%, 3%, 22%, 28%, 47%, 53%, 72%, 78%, 97%, 100% { opacity: 0.55; }
          6%, 31%, 56%, 81% { opacity: 1; }
        }

        /* Each node fires the instant the strike lands on it — delay is one
           quarter cycle per node. Only fill, stroke, opacity and stroke-width
           animate, never the r geometry property, which older Safari will not
           tween. */
        .orbit-node-dot {
          fill: var(--surface-2); stroke: rgba(255,255,255,0.30); stroke-width: 1.25;
          animation: nodeLit 8s ease-out infinite;
          animation-delay: calc(var(--i) * 2s);
        }
        @keyframes nodeLit {
          0%, 4% { fill: var(--surface-2); stroke: rgba(255,255,255,0.30); stroke-width: 1.25; }
          7% { fill: var(--amber); stroke: var(--amber-soft); stroke-width: 2.4; }
          24%, 100% { fill: var(--surface-2); stroke: rgba(255,255,255,0.30); stroke-width: 1.25; }
        }
        .orbit-node-halo {
          fill: none; stroke: var(--amber); stroke-width: 1.5; opacity: 0;
          animation: nodePing 8s ease-out infinite;
          animation-delay: calc(var(--i) * 2s);
        }
        @keyframes nodePing {
          0%, 4% { opacity: 0; stroke-width: 1.5; }
          6% { opacity: 1; stroke-width: 4; }
          22%, 100% { opacity: 0; stroke-width: 1.5; }
        }

        /* The ring no longer turns. A rotating tick ring reads as a clock hand
           and had nothing to do with the strike — it was moving on its own
           transform while the flare lived on the bolt, so the two never
           related. Now it flares on exactly the same keyframe stops as
           .orbit-mark and .orbit-core: one glow, three elements. */
        .orbit-ticks line { stroke: rgba(255,255,255,0.5); stroke-width: 1; }
        .orbit-ticks { animation: tickFlare 8s ease-out infinite; }
        @keyframes tickFlare {
          0%, 3%, 22%, 28%, 47%, 53%, 72%, 78%, 97%, 100% { opacity: 0.42; }
          6%, 31%, 56%, 81% { opacity: 1; }
        }

        /* It is a lightning bolt on a page whose headline is "instant" — so it
           strikes rather than breathes, flaring on each of the four hits. */
        /* Sized as a share of the ring, not fixed px: the ring shrinks at two
           breakpoints and a fixed mark ate all its clearance (0px at 390px
           wide). 31% flares to 33.5% at the strike's 1.08 scale, against the
           innermost dashed ring at 39.1% (r=86 of the 440 viewBox) — so the gap
           is the same fraction at every size. */
        .orbit-mark { position: absolute; left: 50%; top: 50%; width: 31%; height: 31%; object-fit: contain; animation: markStrike 8s ease-out infinite; }
        @keyframes markStrike {
          0%, 3%, 22%, 28%, 47%, 53%, 72%, 78%, 97%, 100% {
            transform: translate(-50%, -50%) scale(1);
            filter: drop-shadow(0 14px 34px rgba(0,0,0,0.55)) brightness(1);
          }
          6%, 31%, 56%, 81% {
            transform: translate(-50%, -50%) scale(1.08);
            filter: drop-shadow(0 14px 34px rgba(0,0,0,0.55))
                    drop-shadow(0 0 26px rgba(245,166,35,0.6)) brightness(1.35);
          }
        }

        .orbit-labels { position: absolute; inset: 0; pointer-events: none; }
        .orbit-label { position: absolute; display: flex; flex-direction: column; gap: 2px; white-space: nowrap; }
        .orbit-label-name { font-family: 'Space Grotesk', sans-serif; font-size: 14px; font-weight: 600; color: var(--text); }
        .orbit-label-sub { font-size: 10.5px; letter-spacing: 0.06em; color: var(--text-faint); }
        .orbit-label-build { left: 50%; top: 2%; transform: translateX(-50%); align-items: center; }
        .orbit-label-grade { left: 50%; top: 89%; transform: translateX(-50%); align-items: center; }
        .orbit-label-conduct { left: 89%; top: 50%; transform: translateY(-50%); align-items: flex-start; }
        .orbit-label-analyse { right: 89%; top: 50%; transform: translateY(-50%); align-items: flex-end; text-align: right; }
        .hero-badges { position: absolute; inset: 0; pointer-events: none; z-index: 3; }
        .floating-badge { position: absolute; display: flex; align-items: center; gap: 6px; padding: 8px 13px; border-radius: 10px; background: rgba(18,24,42,0.9); border: 1px solid var(--border); font-size: 12px; font-weight: 500; color: var(--text); backdrop-filter: blur(6px); animation: floatY 4.5s ease-in-out infinite; box-shadow: 0 12px 24px -12px rgba(0,0,0,0.6); white-space: nowrap; }
        .badge-mint { color: var(--mint); }
        .badge-indigo { color: var(--indigo); }
        .badge-amber { color: var(--amber-soft); }
        /* The four corners INSIDE the 440 box. The cardinal points belong to the
           node labels, and the circle (r=150, centre 220) never reaches these
           squares — so the chips clear both the ring and every label, at any
           column width, without overflowing into the copy on the left. */
        .badge-tl { top: 7%; left: 0; }
        .badge-tr { top: 7%; right: 0; }
        .badge-br { bottom: 7%; right: 0; }
        .badge-bl { bottom: 7%; left: 0; }
        @keyframes floatY { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }

        /* ---------------- Marquee ---------------- */
        .marquee-section { padding: 30px 0; border-top: 1px solid var(--border-soft); border-bottom: 1px solid var(--border-soft); }
        .marquee-wrap { overflow: hidden; -webkit-mask-image: linear-gradient(90deg, transparent, #000 10%, #000 90%, transparent); mask-image: linear-gradient(90deg, transparent, #000 10%, #000 90%, transparent); }
        .marquee-track { display: flex; width: max-content; animation: marqueeScroll linear infinite; }
        .marquee-item { display: inline-flex; align-items: center; gap: 20px; font-family: 'JetBrains Mono', monospace; font-size: 13px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--text-faint); padding: 0 20px; }
        .marquee-dot { color: var(--amber); }
        @keyframes marqueeScroll { from { transform: translateX(0); } to { transform: translateX(-50%); } }

        /* ---------------- Section shared ---------------- */
        .section { padding: 90px 0; position: relative; }
        .section-head { max-width: 620px; margin-bottom: 56px; }
        .section-eyebrow { font-family: 'JetBrains Mono', monospace; font-size: 12px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--amber-soft); margin-bottom: 14px; display: block; }
        .section-title { font-family: 'Space Grotesk', sans-serif; font-size: clamp(30px, 3.6vw, 46px); font-weight: 700; letter-spacing: -0.02em; margin: 0 0 14px; }
        .section-desc { color: var(--text-dim); font-size: 16px; }

        /* ---------------- Lifecycle (signature) ---------------- */
        .lifecycle-body { display: grid; grid-template-columns: 56px 1fr; gap: 20px; }
        .lifecycle-rail { position: relative; display: flex; flex-direction: column; align-items: center; }
        .rail-track { position: absolute; top: 6px; bottom: 6px; width: 2px; background: var(--border); border-radius: 2px; }
        .rail-fill { position: absolute; top: 0; left: 0; width: 100%; background: var(--amber); border-radius: 2px; transition: height .5s cubic-bezier(.16,.84,.44,1); }
        .rail-dots { position: relative; width: 100%; height: 100%; }
        .rail-dot { position: absolute; left: 50%; transform: translate(-50%, -50%); width: 34px; height: 34px; border-radius: 50%; background: var(--bg); border: 2px solid var(--border); display: flex; align-items: center; justify-content: center; transition: border-color .4s ease, background .4s ease, box-shadow .4s ease; z-index: 1; }
        .rail-num { font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--text-faint); transition: color .4s ease; }
        .rail-dot-active { border-color: var(--amber); background: rgba(245,166,35,0.12); box-shadow: 0 0 18px rgba(245,166,35,0.35); }
        .rail-dot-active .rail-num { color: var(--amber-soft); }

        .lifecycle-stages { display: flex; flex-direction: column; gap: 90px; }
        .stage-eyebrow { font-family: 'JetBrains Mono', monospace; font-size: 12px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--amber-soft); display: block; margin-bottom: 10px; }
        .stage-title { font-family: 'Space Grotesk', sans-serif; font-size: 28px; font-weight: 700; margin: 0 0 8px; }
        .stage-tagline { color: var(--text-dim); font-size: 15px; margin: 0 0 28px; }
        .stage-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }

        .spot-card { position: relative; overflow: hidden; border-radius: 14px; border: 1px solid var(--border); background: var(--surface); padding: 22px; transition: border-color .3s ease, transform .3s ease; }
        .spot-card:hover { border-color: rgba(245,166,35,0.35); transform: translateY(-3px); }
        .spot-glow { position: absolute; inset: 0; opacity: 0; transition: opacity .35s ease; background: radial-gradient(240px circle at var(--mx, 50%) var(--my, 50%), rgba(245,166,35,0.14), transparent 70%); pointer-events: none; }
        .spot-card:hover .spot-glow { opacity: 1; }
        .spot-content { position: relative; z-index: 1; }
        .feature-icon-wrap { width: 42px; height: 42px; border-radius: 11px; background: rgba(245,166,35,0.1); border: 1px solid rgba(245,166,35,0.2); display: flex; align-items: center; justify-content: center; color: var(--amber-soft); margin-bottom: 16px; }
        .spot-content h4 { font-family: 'Space Grotesk', sans-serif; font-size: 16.5px; font-weight: 600; margin: 0 0 8px; }
        .spot-content p { font-size: 14px; color: var(--text-dim); margin: 0; line-height: 1.55; }

        @media (max-width: 860px) {
          .lifecycle-body { grid-template-columns: 1fr; }
          .lifecycle-rail { display: none; }
          .stage-grid { grid-template-columns: 1fr; }
        }

        /* ---------------- Scenarios ---------------- */
        .scenario-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 18px; }
        .scenario-cell { display: flex; }
        .scenario-card { display: flex; flex-direction: column; width: 100%; border: 1px solid var(--border); border-radius: 16px; background: var(--surface); overflow: hidden; transition: border-color .3s ease, box-shadow .3s ease; }
        .scenario-card:hover { border-color: rgba(245,166,35,0.32); box-shadow: 0 22px 48px -26px rgba(0,0,0,0.8); }

        /* The frame, not the picture. aspect-ratio here plus width/height on the
           <img> means the row never moves, whether the still has shipped or not
           — and a <video poster preload="none"> drops into the same slot. */
        .scenario-media {
          position: relative; margin: 0; aspect-ratio: 4 / 3; overflow: hidden;
          border-bottom: 1px solid var(--border-soft);
          background:
            radial-gradient(120% 90% at 22% 0%, rgba(108,124,255,0.10), transparent 62%),
            linear-gradient(158deg, var(--surface-2), var(--surface));
        }
        .scenario-media::after {
          content: ""; position: absolute; inset: 0; pointer-events: none;
          background-image:
            linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px);
          background-size: 28px 28px;
          -webkit-mask-image: radial-gradient(72% 72% at 50% 44%, #000, transparent);
                  mask-image: radial-gradient(72% 72% at 50% 44%, #000, transparent);
        }
        .scenario-img, .scenario-media video { position: relative; z-index: 1; display: block; width: 100%; height: 100%; object-fit: cover; }
        .scenario-kicker { position: absolute; z-index: 2; left: 12px; bottom: 12px; font-size: 10.5px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--amber-soft); background: rgba(10,14,26,0.72); border: 1px solid var(--border-soft); padding: 4px 9px; border-radius: 999px; backdrop-filter: blur(4px); }

        .scenario-body { display: flex; flex-direction: column; gap: 16px; padding: 20px 18px; flex: 1; }
        .scenario-story { margin: 0; font-size: 14.5px; line-height: 1.6; color: var(--text); }
        .scenario-cap { display: flex; align-items: flex-start; gap: 10px; margin-top: auto; padding-top: 14px; border-top: 1px solid var(--border-soft); }
        .scenario-cap-icon { flex-shrink: 0; width: 28px; height: 28px; border-radius: 8px; background: rgba(245,166,35,0.10); border: 1px solid rgba(245,166,35,0.20); display: flex; align-items: center; justify-content: center; color: var(--amber-soft); }
        .scenario-cap-text { display: flex; flex-direction: column; gap: 3px; }
        .scenario-cap-text strong { font-size: 13px; font-weight: 600; color: var(--text); }
        .scenario-cap-desc { font-size: 12.5px; line-height: 1.5; color: var(--text-dim); }

        @media (max-width: 1180px) { .scenario-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 860px) {
          .scenario-grid { gap: 14px; }
          .scenario-body { padding: 16px 14px; gap: 13px; }
          .scenario-story { font-size: 14px; }
        }

        /* ---------------- Command center spotlight ---------------- */
        .spotlight-section { background: var(--bg-alt); border-top: 1px solid var(--border-soft); border-bottom: 1px solid var(--border-soft); }
        .spotlight-inner { display: grid; grid-template-columns: 0.85fr 1.15fr; gap: 60px; align-items: center; }
        .spotlight-list { list-style: none; padding: 0; margin: 28px 0 0; display: flex; flex-direction: column; gap: 16px; }
        .spotlight-list li { display: flex; align-items: flex-start; gap: 12px; font-size: 14.5px; color: var(--text-dim); }
        .spotlight-list svg { color: var(--mint); flex-shrink: 0; margin-top: 2px; }

        .cc-panel { background: var(--surface-2); border: 1px solid var(--border); border-radius: 16px; padding: 20px; box-shadow: 0 40px 80px -30px rgba(0,0,0,0.7); }
        .cc-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 18px; }
        .cc-live { display: flex; align-items: center; gap: 7px; font-size: 12px; color: var(--red); font-family: 'JetBrains Mono', monospace; letter-spacing: 0.06em; }
        .cc-live-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--red); box-shadow: 0 0 8px var(--red); animation: pulseDot 1.4s ease-in-out infinite; }
        .cc-title { font-size: 13px; color: var(--text-faint); }
        .cc-roster { display: grid; grid-template-columns: repeat(6, 1fr); gap: 8px; margin-bottom: 18px; }
        .cc-seat { aspect-ratio: 1; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 10.5px; font-family: 'JetBrains Mono', monospace; border: 1px solid var(--border-soft); }
        .seat-normal { background: rgba(108,124,255,0.08); color: var(--indigo); border-color: rgba(108,124,255,0.2); }
        .seat-flagged { background: rgba(242,104,92,0.14); color: var(--red); border-color: rgba(242,104,92,0.4); animation: flagPulse 1.6s ease-in-out infinite; }
        @keyframes flagPulse { 0%,100% { box-shadow: 0 0 0 rgba(242,104,92,0); } 50% { box-shadow: 0 0 12px rgba(242,104,92,0.5); } }
        .cc-alert { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 11px 13px; border-radius: 10px; background: rgba(242,104,92,0.08); border: 1px solid rgba(242,104,92,0.25); margin-bottom: 12px; }
        .cc-alert-text { display: flex; align-items: center; gap: 8px; font-size: 12.5px; color: #ffb3ac; }
        .cc-reset { display: flex; align-items: center; gap: 6px; font-size: 11.5px; color: var(--text-dim); background: rgba(255,255,255,0.05); border: 1px solid var(--border); padding: 6px 10px; border-radius: 7px; cursor: pointer; transition: background .2s ease; }
        .cc-reset:hover { background: rgba(255,255,255,0.1); }

        @media (max-width: 860px) {
          .spotlight-inner { grid-template-columns: 1fr; }
        }

        /* ---------------- Impact ---------------- */
        .impact-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1px; background: var(--border-soft); border: 1px solid var(--border-soft); border-radius: 16px; overflow: hidden; }
        .impact-stat { background: var(--surface); padding: 34px 26px; }
        .impact-icon { color: var(--amber-soft); margin-bottom: 14px; }
        .impact-value { font-size: 34px; font-weight: 600; color: var(--text); }
        .impact-label { font-size: 13.5px; color: var(--text-dim); margin-top: 6px; }
        @media (max-width: 640px) { .impact-grid { grid-template-columns: 1fr; } }

        /* ---------------- Explore SL (beyond exams) ---------------- */
        .explore-card { position: relative; overflow: hidden; border-radius: 20px; border: 1px solid var(--border); background: rgba(245,166,35,0.07), var(--surface); padding: 46px; display: grid; grid-template-columns: 1.2fr 0.8fr; gap: 40px; align-items: center; }
        /* The two drifting blurred orbs that sat in this card are gone —
           same treatment as the rest of the public side. The elements are
           left in the markup but draw nothing. */
        .explore-orb { display: none; }
        @keyframes exploreDrift { 0%,100% { transform: translate(0,0); } 50% { transform: translate(-24px, 18px); } }
        .explore-chips { display: flex; flex-wrap: wrap; gap: 10px; margin: 22px 0 30px; }
        .explore-chip { font-size: 13px; padding: 8px 14px; border-radius: 999px; border: 1px solid var(--border); background: rgba(255,255,255,0.04); color: var(--text-dim); transition: all .25s ease; }
        .explore-chip:hover { border-color: rgba(245,166,35,0.45); color: var(--text); transform: translateY(-2px); }
        .explore-visual { position: relative; display: flex; align-items: center; justify-content: center; }
        .explore-logo-ring { position: relative; width: 210px; height: 210px; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
        /* Was an amber-to-indigo conic ring spinning around the Saaradaa
           logo. Plain static ring — the logo is the thing worth looking at. */
        .explore-logo-ring::before { content: ''; position: absolute; inset: 0; border-radius: 50%; padding: 2px; background: rgba(255,255,255,0.12); -webkit-mask: #000 content-box, #000; -webkit-mask-composite: xor; mask-composite: exclude; }
        .explore-logo-ring img { width: 120px; height: 120px; border-radius: 26%; box-shadow: 0 18px 44px rgba(0,0,0,0.5); }
        .explore-cta-row { display: flex; gap: 14px; flex-wrap: wrap; align-items: center; }
        .btn-explore { display: inline-flex; align-items: center; gap: 9px; padding: 13px 26px; border-radius: 12px; font-weight: 600; font-size: 15px; color: #1a1305; background: var(--amber); border: none; cursor: pointer; text-decoration: none; box-shadow: 0 10px 26px rgba(245,166,35,0.35); transition: transform .2s ease, box-shadow .2s ease; }
        .btn-explore:hover { transform: translateY(-2px); box-shadow: 0 14px 34px rgba(245,166,35,0.5); }
        .btn-explore svg { transition: transform .2s ease; }
        .btn-explore:hover svg { transform: translateX(4px); }
        @media (max-width: 860px) { .explore-card { grid-template-columns: 1fr; padding: 30px 22px; } .explore-visual { order: -1; } }

        /* ---------------- Testimonial ---------------- */
        .testimonial-inner { max-width: 740px; margin: 0 auto; text-align: center; }
        .testimonial-card { position: relative; border-radius: 20px; border: 1px solid var(--border); background: var(--surface); padding: 48px 44px; }
        .quote-mark { font-family: 'Space Grotesk', sans-serif; font-size: 64px; color: var(--amber); opacity: 0.5; line-height: 1; margin-bottom: 6px; }
        .quote-text { font-family: 'Space Grotesk', sans-serif; font-size: clamp(20px, 2.6vw, 27px); font-weight: 500; line-height: 1.5; letter-spacing: -0.01em; margin: 0 0 26px; }
        .quote-attrib { color: var(--text-faint); font-size: 14px; }
        .quote-attrib strong { color: var(--text-dim); font-weight: 600; }

        /* ---------------- CTA ---------------- */
        .cta-card { position: relative; border-radius: 24px; border: 1px solid var(--border); padding: 70px 40px; text-align: center; overflow: hidden; background: radial-gradient(circle at 30% 20%, rgba(245,166,35,0.12), transparent 60%), radial-gradient(circle at 80% 80%, rgba(108,124,255,0.12), transparent 60%), var(--surface); }
        .cta-title { font-family: 'Space Grotesk', sans-serif; font-size: clamp(28px, 3.6vw, 42px); font-weight: 700; letter-spacing: -0.02em; margin: 0 0 16px; }
        .cta-sub { color: var(--text-dim); font-size: 16px; max-width: 480px; margin: 0 auto 34px; }
        .cta-actions { display: flex; align-items: center; justify-content: center; gap: 16px; flex-wrap: wrap; }
        .cta-note { margin-top: 20px; font-size: 12.5px; color: var(--text-faint); }

        /* 720-1000px is the squeeze band: .hero-inner is still two columns but
           each is only ~390-470px wide, so the orbit's side labels would run
           into the other column and get clipped by .hero { overflow: hidden }.
           Same DOM, reflowed into a legend row underneath instead. */
        @media (max-width: 1000px) {
          .hero-orbit-wrap { max-width: 400px; }
          .orbit-labels { position: static; display: flex; flex-wrap: wrap; justify-content: center; gap: 8px 18px; margin-top: 16px; }
          .orbit-label { position: static; transform: none; flex-direction: row; align-items: baseline; gap: 6px; }
          .orbit-label-analyse { text-align: left; }
          /* Below the two-column layout the corners are gone, but the points
             are worth keeping — they become a wrapped chip row under the
             legend rather than being hidden. */
          .hero-badges { position: static; display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; margin-top: 16px; }
          .floating-badge { position: static; animation: none; font-size: 11.5px; padding: 6px 11px; }
        }

        @media (max-width: 720px) {
          .hero-inner { grid-template-columns: 1fr; }
          .hero { padding: 100px 0 40px; min-height: auto; }
          /* Mobile: text/CTAs first, visual below (was order:-1 = visual on top).
             height:auto, not 340px — the box now holds a ring AND a legend row. */
          .hero-visual { height: auto; margin-top: 14px; }
          .hero-orbit-wrap { max-width: min(360px, 82vw); }
          .section { padding: 80px 0; }
          .spotlight-inner, .hero-inner { grid-template-columns: 1fr; }
          .cta-card { padding: 50px 24px; }
          .scenario-grid { grid-template-columns: 1fr; }
          /* A full-width 4:3 card is a whole screen. The wrapper governs layout
             and object-fit:cover crops, so this costs nothing — but it means the
             subject must sit inside the master's central 16:9 band. */
          .scenario-media { aspect-ratio: 16 / 9; }
        }

        @media (prefers-reduced-motion: reduce) {
          /* Turn the frozen state into a better composition rather than a
             parked comet: the runner becomes a complete ring, every node lights. */
          .orbit-runner { stroke-dasharray: none; stroke-dashoffset: 0; opacity: 0.55; }
          .orbit-inner-a, .orbit-inner-b { opacity: 0.55; }
          .orbit-node-halo { opacity: 0.35; }
          .orbit-core { opacity: 0.85; }
          .orbit-ticks { opacity: 0.42; }
          .slexam * { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; }
        }
      `}</style>

      <div className={`mount-curtain ${loaded ? "curtain-hide" : ""}`} aria-hidden="true">
        <img src="/logo-mark.png" alt="Loading..." className="curtain-logo" />
      </div>

      {/* ---------------- Hero ---------------- */}
      <header className="hero">
        <div className="perspective-grid" />
        <div className="container hero-inner">
          <div>
            <span className="eyebrow">
              <span className="eyebrow-dot" /> Online exams for schools
            </span>
            <h1 className="hero-title">
              {HERO_WORDS.map((w, i) => (
                <span
                  /* key={w} would collide on a repeated word */
                  key={w + i}
                  className="hero-title-word"
                  style={{ animationDelay: `${0.15 + i * 0.08}s` }}
                >
                  {w}
                </span>
              ))}
              <span className="hero-title-line2">
                Set a paper in under a minute. It grades itself the moment the last student submits.
              </span>
            </h1>
            <div className="hero-ctas">
              <button className="btn btn-primary" onClick={() => navigate("/login")}>
                Login / Dashboard <ArrowRight size={17} />
              </button>
              <button className="hero-link" onClick={() => navigate("/public")}>
                <PlayCircle size={15} /> Explore public exams
              </button>
              <button className="hero-link" onClick={() => navigate("/thinklets")}>
                <Sparkles size={15} /> View Thinklets
              </button>
            </div>
            <div className="hero-stats">
              <div>
                <div className="hero-stat-value mono">&lt;60s</div>
                <div className="hero-stat-label">To set a full paper</div>
              </div>
              <div>
                <div className="hero-stat-value mono">0</div>
                <div className="hero-stat-label">Nights spent correcting</div>
              </div>
            </div>
          </div>

          <div className="hero-visual">
            <div className="hero-orbit-wrap">
              <LifecycleOrbit />
              <div className="hero-badges">
                {HERO_BADGES.map((b, i) => {
                  const Icon = b.icon;
                  return (
                    <div
                      key={b.key}
                      className={`floating-badge badge-${b.key} badge-${b.tone}`}
                      style={{ animationDelay: `${i * 0.55}s` }}
                    >
                      <Icon size={14} /> {b.label}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ---------------- Marquee ---------------- */}
      <div className="marquee-section">
        <Marquee
          /* Visible body text, and the terms people actually search. A
             keywords meta tag has been ignored for years; a scrolling line of
             real copy on the page is not. */
          items={[
            "ONLINE EXAMS",
            "SCHOOL ASSESSMENTS",
            "SUBJECT TESTS",
            "CHAPTER PRACTICE",
            "BOARD EXAMS",
            "SLIP TESTS",
            "UNIT TESTS",
            "JEE PRACTICE",
            "NEET PRACTICE",
            "SSC CGL",
            "BANKING",
            "RAILWAYS",
            "POLICE CONSTABLE",
            "GATE",
            "EXAM REPORTS",
            "QUESTION BANK",
          ]}
        />
      </div>

      {/* ---------------- Lifecycle (signature section) ---------------- */}
      <section className="section" id="lifecycle">
        <div className="container">
          <Reveal className="section-head">
            <span className="section-eyebrow">The Exam Ecosystem</span>
            <h2 className="section-title">Your exams, handled end to end — instantly.</h2>
            <p className="section-desc">
              From paper creation to final report card, every step of the exam
              lifecycle is automated so your team stays focused on what really
              matters — building students.
            </p>
          </Reveal>

          <div className="lifecycle-body">
            <div className="lifecycle-rail">
              <div className="rail-dots">
                <div className="rail-track">
                  <div
                    className="rail-fill"
                    style={{ height: `${((activeStage + 1) / STAGES.length) * 100}%` }}
                  />
                </div>
                {STAGES.map((s, i) => (
                  <div
                    key={s.number}
                    className={`rail-dot ${i <= activeStage ? "rail-dot-active" : ""}`}
                    style={{ top: `${(i / (STAGES.length - 1)) * 100}%` }}
                  >
                    <span className="rail-num">{s.number}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="lifecycle-stages">
              {STAGES.map((stage, i) => (
                <div
                  key={stage.number}
                  data-idx={i}
                  ref={(el) => (stageRefs.current[i] = el)}
                >
                  <Reveal>
                    <span className="stage-eyebrow mono">STAGE {stage.number}</span>
                    <h3 className="stage-title">{stage.name}</h3>
                    <p className="stage-tagline">{stage.tagline}</p>
                  </Reveal>
                  <div className="stage-grid">
                    {stage.features.map((f, j) => (
                      <Reveal key={f.title} delay={j * 90}>
                        <SpotlightCard>
                          <div className="feature-icon-wrap">
                            <f.icon size={20} />
                          </div>
                          <h4>{f.title}</h4>
                          <p>{f.desc}</p>
                        </SpotlightCard>
                      </Reveal>
                    ))}
                  </div>
                </div>
              ))}
              
              <Reveal delay={100}>
                <div style={{
                  padding: "24px",
                  background: "var(--surface-2)",
                  border: "1px solid var(--border)",
                  borderRadius: "16px",
                  marginTop: "40px",
                  display: "flex",
                  alignItems: "center",
                  gap: "18px",
                  boxShadow: "0 10px 30px rgba(0,0,0,0.2)"
                }}>
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "48px",
                    height: "48px",
                    borderRadius: "50%",
                    background: "rgba(245,166,35,0.1)",
                    color: "var(--amber)",
                    flexShrink: 0
                  }}>
                    <Timer size={24} />
                  </div>
                  <p style={{ margin: 0, fontSize: "15.5px", lineHeight: "1.6", color: "var(--text)" }}>
                    <strong style={{ color: "var(--amber)", fontWeight: 600 }}>Are you a teacher?</strong> Spoiler alert: In the time it took you to read these stages, you could have already generated a full exam. Time flies when you aren't typing out questions by hand.
                  </p>
                </div>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- Scenarios: a day it saved ----------------
          Deliberately placed after #lifecycle, not after the marquee where it
          reads better editorially. Chrome fetches loading="lazy" images up to
          ~1250px below the viewport, and prerender.js snapshots / at a
          1280x900 viewport that never scrolls — sitting any higher and all
          four stills would be requested during the build. Here it starts at
          ~2400px, clear of that window. */}
      <section className="section scenarios" id="scenarios">
        <div className="container">
          <Reveal className="section-head">
            <span className="section-eyebrow">A day it saved</span>
            <h2 className="section-title">Four ordinary days that used to go differently.</h2>
            <p className="section-desc">
              Not a feature list. This is what a week in the staff room looks like
              once the exam stops being a stack of paper.
            </p>
          </Reveal>

          <div className="scenario-grid">
            {SCENARIOS.map((s, i) => {
              const Icon = s.icon;
              return (
                /* Reveal owns transform — the card must be an inner node, or a
                   hover transform overrides translateY(26px) and the card snaps
                   into place before it has ever revealed. */
                <Reveal className="scenario-cell" key={s.id} delay={i * 90}>
                  <article className="scenario-card">
                    <figure className="scenario-media">
                      <img
                        className="scenario-img"
                        src={s.img}
                        alt={s.alt}
                        width="1200"
                        height="900"
                        loading="lazy"
                        decoding="async"
                        fetchPriority="low"
                        /* The stills are authored separately. Until they land the
                           frame shows its own placeholder rather than a browser
                           broken-image glyph. Direct DOM write, not state: React
                           never re-renders this node, so there is nothing for
                           hydration to disagree about. */
                        onError={(e) => { e.currentTarget.style.visibility = "hidden"; }}
                      />
                      <figcaption className="scenario-kicker mono">{s.kicker}</figcaption>
                    </figure>
                    <div className="scenario-body">
                      <p className="scenario-story">{s.story}</p>
                      <div className="scenario-cap">
                        <span className="scenario-cap-icon"><Icon size={15} /></span>
                        <span className="scenario-cap-text">
                          <strong>{s.capability}</strong>
                          <span className="scenario-cap-desc">{s.capabilityDesc}</span>
                        </span>
                      </div>
                    </div>
                  </article>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ---------------- Command Center spotlight ---------------- */}
      <section className="section spotlight-section" id="live">
        <div className="container spotlight-inner">
          <Reveal>
            <span className="section-eyebrow">The Command Center</span>
            <h2 className="section-title">Watch the whole hall, from one screen.</h2>
            <p className="section-desc">
              This is the feature most staff rooms end up living in during exam
              week.
            </p>
            <ul className="spotlight-list">
              <li>
                <CheckCircle2 size={17} /> Live monitoring of student progress.
              </li>
              <li>
                <CheckCircle2 size={17} /> Tab-switching is flagged the instant
                it happens.
              </li>
              <li>
                <CheckCircle2 size={17} /> A stuck session resets in a single
                tap — no calling the IT room.
              </li>
            </ul>
          </Reveal>

          <Reveal delay={100}>
            <TiltCard intensity={5}>
              <div className="cc-panel glow-border">
                <div className="cc-header">
                  <span className="cc-title mono">EXAM HALL — SEC B</span>
                  <span className="cc-live">
                    <span className="cc-live-dot" /> LIVE
                  </span>
                </div>
                <div className="cc-roster">
                  {ROSTER.map((status, i) => (
                    <div key={i} className={`cc-seat seat-${status}`}>
                      {String(i + 1).padStart(2, "0")}
                    </div>
                  ))}
                </div>
                <div className="cc-alert">
                  <span className="cc-alert-text">
                    <AlertTriangle size={14} /> Tab switch detected — Seat 12
                  </span>
                  <span className="mono" style={{ fontSize: 11, color: "var(--text-faint)" }}>
                    0:03 ago
                  </span>
                </div>
                <button className="cc-reset">
                  <RotateCcw size={13} /> Reset stuck session
                </button>
              </div>
            </TiltCard>
          </Reveal>
        </div>
      </section>

      {/* ---------------- Impact ---------------- */}
      <section className="section">
        <div className="container">
          <Reveal className="section-head">
            <span className="section-eyebrow">Instant & Green</span>
            <h2 className="section-title">Speed that saves trees.</h2>
            <p className="section-desc">
              No paper, no printing queues, no manual mark-sheets — just
              instant exams, instant results, and instant analytics.
            </p>
          </Reveal>
          <div className="impact-grid">
            {IMPACT_STATS.map((stat) => (
              <ImpactStat stat={stat} key={stat.label} />
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- Explore SL (beyond exams) ---------------- */}
      <section className="section" id="explore">
        <div className="container">
          <Reveal>
            <div className="explore-card">
              <div className="explore-orb explore-orb-1" />
              <div className="explore-orb explore-orb-2" />
              <div>
                <span className="section-eyebrow">Beyond Exams</span>
                <h2 className="section-title">Exams are just the beginning.</h2>
                <p className="section-desc">
                  SL Exams is one part of the Saaradaa Learknowations universe — books &
                  publications, school support services and EdTech innovation, all under one roof.
                </p>
                <div className="explore-chips">
                  {['📚 Publications & Books', '🏫 School Support Services', '🔬 E2E India & Journals', '💡 EdTech Innovations'].map((c) => (
                    <span className="explore-chip" key={c}>{c}</span>
                  ))}
                </div>
                <div className="explore-cta-row">
                  <a className="btn-explore" href="https://theslpl.in" target="_blank" rel="noreferrer">
                    Explore theslpl.in <ArrowRight size={17} />
                  </a>
                  <span style={{ fontSize: 13, color: 'var(--text-faint)' }}>Check out everything else we build →</span>
                </div>
              </div>
              <div className="explore-visual">
                <div className="explore-logo-ring">
                  <img src="/sl-logo-master.svg" alt="Saaradaa Learknowations" />
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---------------- Testimonial ---------------- */}
      <section className="section" id="testimonial">
        <div className="container testimonial-inner">
          <Reveal>
            <div className="testimonial-card glow-border">
              <div className="quote-mark">"</div>
              <p className="quote-text">
                We used to spend entire weekends compiling marks manually. Now the
                exam is generated in a minute, results are out the second it ends,
                and parents see the analytics before we even leave the exam hall.
                It freed us up to actually focus on the students.
              </p>
              <p className="quote-attrib">
                — <strong>Exam Cell Coordinator</strong>, Higher Secondary School
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---------------- CTA ---------------- */}
      <section className="section" id="demo">
        <div className="container">
          <Reveal>
            <div className="cta-card glow-border glow-border-always">
              <h2 className="cta-title">
                You build students. <span className="grad-text">We handle exams.</span>
              </h2>
              <p className="cta-sub">
                Instant paper generation, instant grading, instant analytics —
                see the whole ecosystem live in a 20-minute walkthrough.
              </p>
              <div className="cta-actions">
                <button className="btn btn-primary" onClick={() => navigate("/login")}>
                  Login / Dashboard <ArrowRight size={17} />
                </button>
                <button className="btn btn-ghost" onClick={() => navigate("/public")}>
                  Explore Public Exams
                </button>
              </div>
              <p className="cta-note">Everything instant — because your time belongs to your students, not spreadsheets.</p>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}