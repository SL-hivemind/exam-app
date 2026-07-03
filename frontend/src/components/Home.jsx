import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
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
} from "lucide-react";

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
        desc: "JEE, NEET and EAMCET aspirants rehearse on the same professional digital interface they'll meet on the real exam day.",
      },
    ],
  },
];

const IMPACT_STATS = [
  { icon: Timer, value: 60, suffix: " sec", label: "to generate a full exam" },
  { icon: Leaf, value: 100, suffix: "%", label: "paperless, from day one" },
  { icon: FileBarChart, value: 1, suffix: "-click", label: "to download every exam report" },
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

function CursorGlow({ targetRef }) {
  const glowRef = useRef(null);
  const pos = useRef({ x: 0, y: 0 });
  const cur = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const el = targetRef.current;
    if (!el) return;
    const reduceMotion =
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) return;

    const onMove = (e) => {
      const rect = el.getBoundingClientRect();
      pos.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };
    el.addEventListener("mousemove", onMove);

    let raf;
    const tick = () => {
      cur.current.x += (pos.current.x - cur.current.x) * 0.12;
      cur.current.y += (pos.current.y - cur.current.y) * 0.12;
      if (glowRef.current) {
        glowRef.current.style.transform = `translate(${cur.current.x}px, ${cur.current.y}px)`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      el.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(raf);
    };
  }, [targetRef]);

  return <div ref={glowRef} className="cursor-glow" />;
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

/* Rotating wireframe accent behind the hero mockup */
function ThreeOrbit({ className }) {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let width = mount.clientWidth || 400;
    let height = mount.clientHeight || 400;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.z = 6.2;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    mount.appendChild(renderer.domElement);

    const geo1 = new THREE.IcosahedronGeometry(2.15, 1);
    const mat1 = new THREE.MeshBasicMaterial({
      color: 0xf5a623,
      wireframe: true,
      transparent: true,
      opacity: 0.5,
    });
    const mesh1 = new THREE.Mesh(geo1, mat1);
    scene.add(mesh1);

    const geo2 = new THREE.TorusGeometry(2.85, 0.012, 8, 100);
    const mat2 = new THREE.MeshBasicMaterial({
      color: 0x6c7cff,
      transparent: true,
      opacity: 0.45,
    });
    const mesh2 = new THREE.Mesh(geo2, mat2);
    mesh2.rotation.x = Math.PI / 2.6;
    scene.add(mesh2);

    const geo3 = new THREE.TorusGeometry(3.3, 0.008, 8, 100);
    const mat3 = new THREE.MeshBasicMaterial({
      color: 0x4ade80,
      transparent: true,
      opacity: 0.3,
    });
    const mesh3 = new THREE.Mesh(geo3, mat3);
    mesh3.rotation.x = Math.PI / 1.8;
    mesh3.rotation.y = Math.PI / 5;
    scene.add(mesh3);

    let raf;
    const reduceMotion =
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const animate = () => {
      if (!reduceMotion) {
        mesh1.rotation.x += 0.0022;
        mesh1.rotation.y += 0.0032;
        mesh2.rotation.z += 0.0016;
        mesh3.rotation.z -= 0.001;
      }
      renderer.render(scene, camera);
      raf = requestAnimationFrame(animate);
    };
    animate();

    const handleResize = () => {
      if (!mount) return;
      width = mount.clientWidth || width;
      height = mount.clientHeight || height;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", handleResize);
      try {
        mount.removeChild(renderer.domElement);
      } catch (e) {}
      geo1.dispose();
      mat1.dispose();
      geo2.dispose();
      mat2.dispose();
      geo3.dispose();
      mat3.dispose();
      renderer.dispose();
    };
  }, []);

  return <div ref={mountRef} className={className} />;
}

/* ----------------------------------------------------------------------- */
/* Main component                                                           */
/* ----------------------------------------------------------------------- */

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
  const heroVisualRef = useRef(null);

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

  const headline = ["Question", "bank", "to", "report", "card."];

  return (
    <div className="slexam">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');

        @property --angle {
          syntax: '<angle>';
          inherits: false;
          initial-value: 0deg;
        }

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
        .container { max-width: 1180px; margin: 0 auto; padding: 0 28px; }

        .reveal { opacity: 0; transform: translateY(26px); transition: opacity .8s cubic-bezier(.16,.84,.44,1), transform .8s cubic-bezier(.16,.84,.44,1); }
        .reveal-in { opacity: 1; transform: none; }

        .grad-text {
          background-image: linear-gradient(95deg, var(--amber) 10%, var(--amber-soft) 45%, var(--indigo) 100%);
          -webkit-background-clip: text; background-clip: text; color: transparent;
        }

        /* ---------------- Glow border (rotating gradient ring) ---------------- */
        .glow-border { position: relative; }
        .glow-border::before {
          content: "";
          position: absolute;
          inset: 0;
          border-radius: inherit;
          padding: 1px;
          background: conic-gradient(from var(--angle, 0deg), transparent 0%, var(--amber) 12%, transparent 26%, transparent 74%, var(--indigo) 88%, transparent 100%);
          -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          opacity: 0;
          transition: opacity .4s ease;
          animation: rotateAngle 4s linear infinite;
          pointer-events: none;
          z-index: 2;
        }
        .glow-border:hover::before { opacity: 1; }
        .glow-border-always::before { opacity: 0.85; }
        @keyframes rotateAngle { to { --angle: 360deg; } }

        /* ---------------- Reveal loader ---------------- */
        .mount-curtain { position: fixed; inset: 0; z-index: 200; background: #0a0e1a; display: flex; align-items: center; justify-content: center; transition: opacity .6s cubic-bezier(.16,.84,.44,1), visibility .6s; }
        .curtain-hide { opacity: 0; pointer-events: none; visibility: hidden; }
        .curtain-mark { width: 44px; height: 44px; border-radius: 12px; background: linear-gradient(135deg, var(--amber), var(--indigo)); animation: curtainPulse 0.9s ease-in-out infinite; }
        @keyframes curtainPulse { 0%,100% { transform: scale(1); opacity: 1; } 50% { transform: scale(0.82); opacity: 0.65; } }

        /* ---------------- Buttons ---------------- */
        .btn { display: inline-flex; align-items: center; gap: 9px; padding: 14px 26px; border-radius: 11px; font-weight: 600; font-size: 15px; cursor: pointer; border: 1px solid transparent; transition: transform .25s ease, box-shadow .25s ease, background .25s ease, border-color .25s ease; white-space: nowrap; }
        .btn-primary { background: linear-gradient(135deg, var(--amber), #ffb648); color: #1a1305; box-shadow: 0 10px 26px -10px rgba(245,166,35,0.6); }
        .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 16px 32px -10px rgba(245,166,35,0.7); }
        .btn-ghost { background: rgba(255,255,255,0.03); border-color: var(--border); color: var(--text); }
        .btn-ghost:hover { background: rgba(255,255,255,0.08); transform: translateY(-2px); border-color: rgba(255,255,255,0.18); }
        .btn-sm { padding: 10px 18px; font-size: 13.5px; }

        .slexam a:focus-visible, .slexam button:focus-visible { outline: 2px solid var(--amber); outline-offset: 3px; border-radius: 6px; }

        /* ---------------- Hero ---------------- */
        .hero { position: relative; padding: 168px 0 100px; overflow: hidden; }
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

        .hero-inner { position: relative; z-index: 2; display: grid; grid-template-columns: 1.05fr 0.95fr; gap: 50px; align-items: center; }
        .eyebrow { display: inline-flex; align-items: center; gap: 8px; padding: 7px 15px; border: 1px solid var(--border); border-radius: 999px; font-family: 'JetBrains Mono', monospace; font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--amber-soft); background: rgba(245,166,35,0.07); margin-bottom: 26px; }
        .eyebrow-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--mint); box-shadow: 0 0 8px var(--mint); animation: pulseDot 1.8s ease-in-out infinite; }
        @keyframes pulseDot { 0%,100% { opacity: 1; } 50% { opacity: 0.35; } }

        .hero-title { font-family: 'Space Grotesk', sans-serif; font-size: clamp(38px, 5vw, 60px); line-height: 1.06; font-weight: 700; letter-spacing: -0.02em; margin: 0 0 22px; }
        .hero-title-word { display: inline-block; opacity: 0; transform: translateY(30px); animation: wordUp .7s cubic-bezier(.16,.84,.44,1) forwards; margin-right: 0.24em; }
        @keyframes wordUp { to { opacity: 1; transform: translateY(0); } }
        .hero-title-line2 { display: block; margin-top: 4px; }

        .hero-sub { font-size: 17.5px; color: var(--text-dim); max-width: 480px; margin-bottom: 34px; }
        .hero-ctas { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; margin-bottom: 44px; }
        .hero-stats { display: flex; gap: 34px; flex-wrap: wrap; }
        .hero-stat-value { font-family: 'Space Grotesk', sans-serif; font-size: 22px; font-weight: 700; color: var(--text); }
        .hero-stat-label { font-size: 12.5px; color: var(--text-faint); margin-top: 2px; }

        /* ---------------- Hero visual / mockup ---------------- */
        .hero-visual { position: relative; height: 480px; display: flex; align-items: center; justify-content: center; }
        .hero-three { position: absolute; inset: -40px; z-index: 0; }
        .cursor-glow { position: absolute; top: 0; left: 0; width: 220px; height: 220px; margin-left: -110px; margin-top: -110px; background: radial-gradient(circle, rgba(245,166,35,0.2), rgba(108,124,255,0.1) 45%, transparent 70%); border-radius: 50%; pointer-events: none; filter: blur(6px); z-index: 1; mix-blend-mode: screen; opacity: 0; transition: opacity .3s ease; }
        .hero-visual:hover .cursor-glow { opacity: 1; }
        .tilt-card { transition: transform .15s ease-out; transform-style: preserve-3d; }
        .hero-mock { position: relative; z-index: 2; width: 100%; max-width: 420px; }
        .mock-window { background: linear-gradient(180deg, var(--surface-2), var(--surface)); border: 1px solid var(--border); border-radius: 16px; box-shadow: 0 40px 80px -30px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.02) inset; overflow: hidden; }
        .mock-topbar { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-bottom: 1px solid var(--border-soft); background: rgba(255,255,255,0.02); }
        .mock-dots { display: flex; gap: 6px; }
        .mock-dots span { width: 8px; height: 8px; border-radius: 50%; background: rgba(255,255,255,0.15); }
        .mock-timer { display: flex; align-items: center; gap: 6px; font-size: 12.5px; color: var(--amber-soft); background: rgba(245,166,35,0.1); padding: 4px 10px; border-radius: 6px; }
        .mock-body { display: grid; grid-template-columns: 1.4fr 1fr; gap: 0; }
        .mock-qpanel { padding: 18px 16px; border-right: 1px solid var(--border-soft); }
        .mock-qlabel { font-size: 10.5px; color: var(--text-faint); letter-spacing: 0.06em; margin: 0 0 10px; }
        .mock-qtext { font-size: 13px; color: var(--text); line-height: 1.5; margin: 0 0 14px; }
        .mock-options { display: flex; flex-direction: column; gap: 7px; }
        .mock-opt { display: flex; align-items: center; gap: 8px; padding: 7px 9px; border-radius: 7px; border: 1px solid var(--border-soft); font-size: 11.5px; color: var(--text-dim); }
        .mock-opt span { width: 16px; height: 16px; border-radius: 5px; border: 1px solid var(--border); display: flex; align-items: center; justify-content: center; font-size: 9px; flex-shrink: 0; }
        .mock-opt-active { border-color: var(--mint); background: rgba(74,222,128,0.08); color: var(--text); }
        .mock-opt-active span { background: var(--mint); border-color: var(--mint); color: #06210f; }
        .mock-side { padding: 18px 14px; }
        .mock-side-label { font-size: 10.5px; color: var(--text-faint); letter-spacing: 0.06em; margin: 0 0 10px; }
        .mock-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 5px; }
        .mock-cell { aspect-ratio: 1; border-radius: 5px; border: 1px solid var(--border-soft); display: flex; align-items: center; justify-content: center; font-size: 8.5px; color: var(--text-faint); }
        .mock-cell.filled { background: rgba(108,124,255,0.14); border-color: rgba(108,124,255,0.3); color: var(--indigo); }
        .mock-cell.current { background: var(--amber); border-color: var(--amber); color: #1a1305; font-weight: 700; }

        .floating-badge { position: absolute; display: flex; align-items: center; gap: 6px; padding: 8px 13px; border-radius: 10px; background: rgba(18,24,42,0.9); border: 1px solid var(--border); font-size: 12px; font-weight: 500; color: var(--text); backdrop-filter: blur(6px); z-index: 3; animation: floatY 4.5s ease-in-out infinite; box-shadow: 0 12px 24px -12px rgba(0,0,0,0.6); }
        .badge-1 { top: -18px; right: -10px; color: var(--mint); animation-delay: 0s; }
        .badge-2 { bottom: 30px; left: -34px; color: var(--indigo); animation-delay: 1.1s; }
        .badge-3 { bottom: -16px; right: 20px; animation-delay: 0.5s; }
        @keyframes floatY { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }

        /* ---------------- Marquee ---------------- */
        .marquee-section { padding: 30px 0; border-top: 1px solid var(--border-soft); border-bottom: 1px solid var(--border-soft); }
        .marquee-wrap { overflow: hidden; -webkit-mask-image: linear-gradient(90deg, transparent, #000 10%, #000 90%, transparent); mask-image: linear-gradient(90deg, transparent, #000 10%, #000 90%, transparent); }
        .marquee-track { display: flex; width: max-content; animation: marqueeScroll linear infinite; }
        .marquee-item { display: inline-flex; align-items: center; gap: 20px; font-family: 'JetBrains Mono', monospace; font-size: 13px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--text-faint); padding: 0 20px; }
        .marquee-dot { color: var(--amber); }
        @keyframes marqueeScroll { from { transform: translateX(0); } to { transform: translateX(-50%); } }

        /* ---------------- Section shared ---------------- */
        .section { padding: 110px 0; position: relative; }
        .section-head { max-width: 620px; margin-bottom: 56px; }
        .section-eyebrow { font-family: 'JetBrains Mono', monospace; font-size: 12px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--amber-soft); margin-bottom: 14px; display: block; }
        .section-title { font-family: 'Space Grotesk', sans-serif; font-size: clamp(28px, 3.4vw, 40px); font-weight: 700; letter-spacing: -0.02em; margin: 0 0 14px; }
        .section-desc { color: var(--text-dim); font-size: 16px; }

        /* ---------------- Lifecycle (signature) ---------------- */
        .lifecycle-body { display: grid; grid-template-columns: 56px 1fr; gap: 20px; }
        .lifecycle-rail { position: relative; display: flex; flex-direction: column; align-items: center; }
        .rail-track { position: absolute; top: 6px; bottom: 6px; width: 2px; background: var(--border); border-radius: 2px; }
        .rail-fill { position: absolute; top: 0; left: 0; width: 100%; background: linear-gradient(180deg, var(--amber), var(--indigo)); border-radius: 2px; transition: height .5s cubic-bezier(.16,.84,.44,1); }
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

        /* ---------------- Command center spotlight ---------------- */
        .spotlight-section { background: var(--bg-alt); border-top: 1px solid var(--border-soft); border-bottom: 1px solid var(--border-soft); }
        .spotlight-inner { display: grid; grid-template-columns: 0.85fr 1.15fr; gap: 60px; align-items: center; }
        .spotlight-list { list-style: none; padding: 0; margin: 28px 0 0; display: flex; flex-direction: column; gap: 16px; }
        .spotlight-list li { display: flex; align-items: flex-start; gap: 12px; font-size: 14.5px; color: var(--text-dim); }
        .spotlight-list svg { color: var(--mint); flex-shrink: 0; margin-top: 2px; }

        .cc-panel { background: linear-gradient(180deg, var(--surface-2), var(--surface)); border: 1px solid var(--border); border-radius: 16px; padding: 20px; box-shadow: 0 40px 80px -30px rgba(0,0,0,0.7); }
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

        @media (max-width: 720px) {
          .hero-inner { grid-template-columns: 1fr; }
          .hero { padding: 140px 0 70px; }
          .hero-visual { height: 380px; order: -1; margin-bottom: 20px; }
          .section { padding: 80px 0; }
          .spotlight-inner, .hero-inner { grid-template-columns: 1fr; }
          .cta-card { padding: 50px 24px; }
        }

        @media (prefers-reduced-motion: reduce) {
          .slexam * { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; }
        }
      `}</style>

      <div className={`mount-curtain ${loaded ? "curtain-hide" : ""}`} aria-hidden="true">
        <div className="curtain-mark" />
      </div>

      {/* ---------------- Hero ---------------- */}
      <header className="hero">
        <div className="perspective-grid" />
        <div className="container hero-inner">
          <div>
            <span className="eyebrow">
              <span className="eyebrow-dot" /> For Schools, Not Spreadsheets
            </span>
            <h1 className="hero-title">
              {headline.map((w, i) => (
                <span
                  key={w}
                  className="hero-title-word"
                  style={{ animationDelay: `${0.15 + i * 0.08}s` }}
                >
                  {w}
                </span>
              ))}
              <span className="hero-title-line2 grad-text">Zero paper. Zero panic.</span>
            </h1>
            <p className="hero-sub">
              SLExam runs your school's tests end to end — build the paper from a
              curated question bank, monitor the hall live, and put every
              student's report on their own phone before they've left the hall.
            </p>
            <div className="hero-ctas">
              <button className="btn btn-primary" onClick={() => navigate("/login")}>
                Login / Dashboard <ArrowRight size={17} />
              </button>
              <button className="btn btn-ghost" onClick={() => navigate("/public")}>
                <PlayCircle size={17} /> Explore Public Exams
              </button>
              <button className="btn btn-ghost" onClick={() => navigate("/thinklets")} style={{ marginLeft: '10px' }}>
                <Sparkles size={17} /> View Thinklets
              </button>
            </div>
            <div className="hero-stats">
              <div>
                <div className="hero-stat-value mono">&lt;60s</div>
                <div className="hero-stat-label">To build an exam</div>
              </div>
              <div>
                <div className="hero-stat-value mono">100%</div>
                <div className="hero-stat-label">Paperless</div>
              </div>
            </div>
          </div>

          <div className="hero-visual" ref={heroVisualRef}>
            <CursorGlow targetRef={heroVisualRef} />
            <ThreeOrbit className="hero-three" />
            <TiltCard className="hero-mock">
              <div className="mock-window glow-border glow-border-always">
                <div className="mock-topbar">
                  <div className="mock-dots">
                    <span /> <span /> <span />
                  </div>
                  <span className="mock-timer mono">
                    <Timer size={12} /> 42:15
                  </span>
                </div>
                <div className="mock-body">
                  <div className="mock-qpanel">
                    <p className="mock-qlabel mono">QUESTION 7 / 30</p>
                    <p className="mock-qtext">
                      Which of these best explains photosynthesis's role in an
                      ecosystem?
                    </p>
                    <div className="mock-options">
                      {["A", "B", "C", "D"].map((o, i) => (
                        <div key={o} className={`mock-opt ${i === 1 ? "mock-opt-active" : ""}`}>
                          <span>{o}</span>
                          {i === 1
                            ? "Converts light energy into chemical energy"
                            : ["Breaks down cellular waste", "Regulates body temperature", "Transports oxygen in blood"][i > 1 ? i - 1 : i]}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="mock-side">
                    <p className="mock-side-label mono">ANSWER SHEET</p>
                    <div className="mock-grid">
                      {Array.from({ length: 30 }).map((_, i) => (
                        <span
                          key={i}
                          className={`mock-cell ${i < 12 ? "filled" : ""} ${i === 6 ? "current" : ""}`}
                        >
                          {i + 1}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div className="floating-badge badge-1">
                <CheckCircle2 size={14} /> Auto-saved
              </div>
              <div className="floating-badge badge-2">
                <ShieldCheck size={14} /> Proctoring on
              </div>
              <div className="floating-badge badge-3">
                <Sparkles size={14} /> Auto-graded
              </div>
            </TiltCard>
          </div>
        </div>
      </header>

      {/* ---------------- Marquee ---------------- */}
      <div className="marquee-section">
        <Marquee
          items={[
            "BOARD EXAMS",
            "SLIP TESTS",
            "WEEKLY ASSESSMENTS",
            "JEE PRACTICE",
            "NEET PRACTICE",
            "EAMCET PRACTICE",
            "EXAM REPORTS",
          ]}
        />
      </div>

      {/* ---------------- Lifecycle (signature section) ---------------- */}
      <section className="section" id="lifecycle">
        <div className="container">
          <Reveal className="section-head">
            <span className="section-eyebrow">The Exam Lifecycle</span>
            <h2 className="section-title">One workflow, from paper to parent.</h2>
            <p className="section-desc">
              Every exam your school runs moves through the same four stages.
              SLExam is built around that journey, not around a feature list.
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
            </div>
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
            <span className="section-eyebrow">Go Green</span>
            <h2 className="section-title">Every exam you don't print.</h2>
            <p className="section-desc">
              No paper, no printing queue, no storage room full of answer
              sheets — and no cost that comes with them.
            </p>
          </Reveal>
          <div className="impact-grid">
            {IMPACT_STATS.map((stat) => (
              <ImpactStat stat={stat} key={stat.label} />
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- Testimonial ---------------- */}
      <section className="section" id="testimonial">
        <div className="container testimonial-inner">
          <Reveal>
            <div className="testimonial-card glow-border">
              <div className="quote-mark">"</div>
              <p className="quote-text">
                Slip-test Sunday used to mean an evening of manual averages. Now the
                internal marks register keeps itself, and by the time I open my
                dashboard for PTM, most students have already checked their own
                report on their phone.
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
                Give your staff room its <span className="grad-text">afternoons back.</span>
              </h2>
              <p className="cta-sub">
                See your own question bank, your own exam, running live —
                in a 20-minute walkthrough with your team.
              </p>
              <div className="cta-actions">
                <button className="btn btn-primary" onClick={() => navigate("/login")}>
                  Login / Dashboard <ArrowRight size={17} />
                </button>
                <button className="btn btn-ghost" onClick={() => navigate("/public")}>
                  Explore Public Exams
                </button>
              </div>
              <p className="cta-note">No paperwork. Ironically, that's the whole point.</p>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}