import React, { useEffect, useRef, useState, useCallback } from "react";
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
  BarChart3,
  Library,
  Monitor,
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

/* CursorGlow removed — replaced by mouse-interactive ThreeOrbit */

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

/* Rotating wireframe accent behind the hero mockup — mouse-interactive */
function ThreeOrbit({ className, containerRef }) {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let width = mount.clientWidth || 400;
    let height = mount.clientHeight || 400;

    const scene = new THREE.Scene();
    const aspect = width / height;
    const camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 100);
    
    // Calculate distance to fit the 3.3 radius torus (uses 8.2 to fill ~97% of canvas)
    camera.position.z = Math.max(8.2, 8.2 / aspect);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    mount.appendChild(renderer.domElement);

    const geo1 = new THREE.IcosahedronGeometry(2.5, 1);
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

    /* --- Mouse-driven spin ------------------------------------------------ */
    const mouse = { x: 0, y: 0 };          // target  (-1…1)
    const smoothMouse = { x: 0, y: 0 };    // lerped  (-1…1)
    let isHovering = false;

    const container = containerRef?.current || mount;

    const onMouseMove = (e) => {
      const rect = container.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;   // -1 → 1
      mouse.y = ((e.clientY - rect.top) / rect.height) * 2 - 1;   // -1 → 1
    };
    const onMouseEnter = () => { isHovering = true; };
    const onMouseLeave = () => {
      isHovering = false;
      mouse.x = 0;
      mouse.y = 0;
    };

    container.addEventListener("mousemove", onMouseMove);
    container.addEventListener("mouseenter", onMouseEnter);
    container.addEventListener("mouseleave", onMouseLeave);

    /* --- Animation loop --------------------------------------------------- */
    let raf;
    const reduceMotion =
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const LERP = 0.06;           // smoothing factor
    const MOUSE_STRENGTH = 0.012; // how strongly mouse affects spin speed
    const AUTO_SPEED = 1;         // multiplier for idle auto-rotation

    const animate = () => {
      // Smoothly interpolate towards the mouse target
      smoothMouse.x += (mouse.x - smoothMouse.x) * LERP;
      smoothMouse.y += (mouse.y - smoothMouse.y) * LERP;

      if (!reduceMotion) {
        // Base auto-rotation (always running)
        mesh1.rotation.x += 0.0022 * AUTO_SPEED;
        mesh1.rotation.y += 0.0032 * AUTO_SPEED;
        mesh2.rotation.z += 0.0016 * AUTO_SPEED;
        mesh3.rotation.z -= 0.001 * AUTO_SPEED;

        // Mouse-driven extra spin layered on top
        const mx = smoothMouse.x * MOUSE_STRENGTH;
        const my = smoothMouse.y * MOUSE_STRENGTH;

        mesh1.rotation.y += mx * 2.5;
        mesh1.rotation.x += my * 2.5;

        mesh2.rotation.z += mx * 1.2;
        mesh2.rotation.x += my * 0.8;

        mesh3.rotation.z -= mx * 0.9;
        mesh3.rotation.y += my * 0.6;
      }

      renderer.render(scene, camera);
      raf = requestAnimationFrame(animate);
    };
    animate();

    const handleResize = () => {
      if (!mount) return;
      width = mount.clientWidth || width;
      height = mount.clientHeight || height;
      const aspect = width / height;
      camera.aspect = aspect;
      camera.position.z = Math.max(8.2, 8.2 / aspect);
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", handleResize);
      container.removeEventListener("mousemove", onMouseMove);
      container.removeEventListener("mouseenter", onMouseEnter);
      container.removeEventListener("mouseleave", onMouseLeave);
      try {
        mount.removeChild(renderer.domElement);
      } catch (e) { }
      geo1.dispose();
      mat1.dispose();
      geo2.dispose();
      mat2.dispose();
      geo3.dispose();
      mat3.dispose();
      renderer.dispose();
    };
  }, [containerRef]);

  return <div ref={mountRef} className={className} />;
}

/* ----------------------------------------------------------------------- */
/* Main component                                                           */
/* ----------------------------------------------------------------------- */

const HERO_CARD_COUNT = 4;

export default function Home() {
  const navigate = useNavigate();
  const [activeStage, setActiveStage] = useState(0);
  const [activeHeroCard, setActiveHeroCard] = useState(0);
  const heroCardInterval = useRef(null);
  const [loaded, setLoaded] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
  const stageRefs = useRef([]);
  const heroVisualRef = useRef(null);

  // Auto-rotate hero cards
  const startHeroRotation = useCallback(() => {
    clearInterval(heroCardInterval.current);
    heroCardInterval.current = setInterval(() => {
      setActiveHeroCard((prev) => (prev + 1) % HERO_CARD_COUNT);
    }, 4000);
  }, []);

  useEffect(() => {
    startHeroRotation();
    return () => clearInterval(heroCardInterval.current);
  }, [startHeroRotation]);

  const handleHeroCardClick = useCallback((idx) => {
    setActiveHeroCard(idx);
    startHeroRotation();
  }, [startHeroRotation]);

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

  const headline = ["Everything's", "instant.", "Why", "not", "exams?"];

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
        .container { max-width: 1320px; margin: 0 auto; padding: 0 28px; }

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
        .curtain-logo { width: 72px; height: 72px; object-fit: contain; animation: curtainPulse 1.6s ease-in-out infinite; }
        @keyframes curtainPulse { 0%,100% { transform: scale(1); filter: drop-shadow(0 0 6px rgba(56,149,248,.25)); } 50% { transform: scale(1.06); filter: drop-shadow(0 0 16px rgba(56,149,248,.45)) drop-shadow(0 0 24px rgba(246,137,20,.2)); } }

        /* ---------------- Buttons ---------------- */
        .btn { display: inline-flex; align-items: center; gap: 9px; padding: 14px 26px; border-radius: 11px; font-weight: 600; font-size: 15px; cursor: pointer; border: 1px solid transparent; transition: transform .25s ease, box-shadow .25s ease, background .25s ease, border-color .25s ease; white-space: nowrap; }
        .btn-primary { background: linear-gradient(135deg, var(--amber), #ffb648); color: #1a1305; box-shadow: 0 10px 26px -10px rgba(245,166,35,0.6); }
        .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 16px 32px -10px rgba(245,166,35,0.7); }
        .btn-ghost { background: rgba(255,255,255,0.03); border-color: var(--border); color: var(--text); }
        .btn-ghost:hover { background: rgba(255,255,255,0.08); transform: translateY(-2px); border-color: rgba(255,255,255,0.18); }
        .btn-sm { padding: 10px 18px; font-size: 13.5px; }

        .slexam a:focus-visible, .slexam button:focus-visible { outline: 2px solid var(--amber); outline-offset: 3px; border-radius: 6px; }

        /* ---------------- Hero ---------------- */
        .hero { position: relative; padding: 100px 0 32px; overflow: hidden; min-height: calc(100vh - 60px); display: flex; flex-direction: column; justify-content: center; }
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

        .hero-inner { position: relative; z-index: 2; display: grid; grid-template-columns: 1.05fr 0.95fr; gap: 64px; align-items: center; }
        .eyebrow { display: inline-flex; align-items: center; gap: 8px; padding: 7px 15px; border: 1px solid var(--border); border-radius: 999px; font-family: 'JetBrains Mono', monospace; font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--amber-soft); background: rgba(245,166,35,0.07); margin-bottom: 26px; }
        .eyebrow-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--mint); box-shadow: 0 0 8px var(--mint); animation: pulseDot 1.8s ease-in-out infinite; }
        @keyframes pulseDot { 0%,100% { opacity: 1; } 50% { opacity: 0.35; } }

        .hero-title { font-family: 'Space Grotesk', sans-serif; font-size: clamp(30px, 3.8vw, 44px); line-height: 1.1; font-weight: 700; letter-spacing: -0.02em; margin: 0 0 18px; }
        .hero-title-word { display: inline-block; opacity: 0; transform: translateY(30px); animation: wordUp .7s cubic-bezier(.16,.84,.44,1) forwards; margin-right: 0.24em; }
        @keyframes wordUp { to { opacity: 1; transform: translateY(0); } }
        .hero-title-line2 { display: block; margin-top: 4px; font-size: clamp(18px, 2.2vw, 24px); }

        .hero-ctas { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; margin-bottom: 30px; }
        .hero-stats { display: flex; gap: 34px; flex-wrap: wrap; }
        .hero-stat-value { font-family: 'Space Grotesk', sans-serif; font-size: 22px; font-weight: 700; color: var(--text); }
        .hero-stat-label { font-size: 12.5px; color: var(--text-faint); margin-top: 2px; }

        .hero-visual { position: relative; height: 440px; display: flex; align-items: center; justify-content: center; }
        .hero-three { position: absolute; inset: -80px; z-index: 0; pointer-events: none; }
        /* cursor-glow removed — 3D orbit is now mouse-interactive */
        .tilt-card { transition: transform .15s ease-out; transform-style: preserve-3d; }
        .hero-mock { position: relative; z-index: 2; width: 100%; max-width: 480px; }
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

        /* --- Analysis card styles --- */
        .mock-analysis-body { padding: 18px 16px; }
        .mock-stat-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 14px; }
        .mock-stat-box { text-align: center; padding: 10px 6px; border-radius: 8px; border: 1px solid var(--border-soft); background: rgba(255,255,255,0.02); }
        .mock-stat-val { font-family: 'Space Grotesk', sans-serif; font-size: 18px; font-weight: 700; }
        .mock-stat-lbl { font-size: 9.5px; color: var(--text-faint); margin-top: 2px; }
        .mock-bar-row { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
        .mock-bar-label { font-size: 11px; color: var(--text-dim); width: 68px; flex-shrink: 0; }
        .mock-bar-track { flex: 1; height: 6px; border-radius: 3px; background: rgba(255,255,255,0.06); overflow: hidden; }
        .mock-bar-fill { height: 100%; border-radius: 3px; transition: width .6s ease; }
        .mock-bar-pct { font-size: 10px; font-weight: 600; width: 32px; text-align: right; flex-shrink: 0; }

        /* --- Repo card styles --- */
        .mock-repo-body { padding: 18px 16px; }
        .mock-repo-search { display: flex; align-items: center; gap: 8px; padding: 7px 10px; border-radius: 8px; border: 1px solid var(--border-soft); background: rgba(255,255,255,0.02); margin-bottom: 12px; font-size: 11px; color: var(--text-faint); }
        .mock-repo-item { display: flex; align-items: flex-start; gap: 10px; padding: 10px 0; border-bottom: 1px solid var(--border-soft); }
        .mock-repo-item:last-child { border-bottom: none; }
        .mock-repo-num { width: 22px; height: 22px; border-radius: 6px; background: rgba(108,124,255,0.1); border: 1px solid rgba(108,124,255,0.25); display: flex; align-items: center; justify-content: center; font-size: 9px; font-weight: 700; color: var(--indigo); flex-shrink: 0; margin-top: 1px; }
        .mock-repo-text { font-size: 11.5px; color: var(--text); line-height: 1.4; }
        .mock-repo-meta { font-size: 9.5px; color: var(--text-faint); margin-top: 3px; display: flex; gap: 8px; }
        .mock-repo-tag { font-size: 9px; padding: 2px 6px; border-radius: 4px; border: 1px solid var(--border-soft); color: var(--text-faint); }

        /* --- Command center card styles --- */
        .mock-cc-body { padding: 18px 16px; }
        .mock-cc-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 5px; margin-bottom: 12px; }
        .mock-cc-seat { aspect-ratio: 1; border-radius: 5px; display: flex; align-items: center; justify-content: center; font-size: 8px; font-weight: 600; }
        .mock-cc-seat.normal { background: rgba(108,124,255,0.1); border: 1px solid rgba(108,124,255,0.25); color: var(--indigo); }
        .mock-cc-seat.flagged { background: rgba(242,104,92,0.12); border: 1px solid rgba(242,104,92,0.35); color: var(--red); animation: flagPulse 1.6s ease-in-out infinite; }
        .mock-cc-seat.done { background: rgba(74,222,128,0.1); border: 1px solid rgba(74,222,128,0.25); color: var(--mint); }
        .mock-cc-alert-row { display: flex; align-items: center; gap: 8px; padding: 8px 10px; border-radius: 8px; background: rgba(242,104,92,0.08); border: 1px solid rgba(242,104,92,0.2); margin-bottom: 8px; font-size: 11px; color: #ffb3ac; }
        .mock-cc-stat-bar { display: flex; gap: 8px; }
        .mock-cc-stat { flex: 1; text-align: center; padding: 8px 4px; border-radius: 7px; border: 1px solid var(--border-soft); background: rgba(255,255,255,0.02); }
        .mock-cc-stat-val { font-family: 'JetBrains Mono', monospace; font-size: 14px; font-weight: 700; }
        .mock-cc-stat-lbl { font-size: 8.5px; color: var(--text-faint); margin-top: 2px; }

        /* --- Hero card shuffle animation --- */
        .hero-cards-container { position: relative; width: 100%; max-width: 440px; min-height: 300px; }
        .hero-card-slide { position: absolute; inset: 0; opacity: 0; transform: translateY(30px) scale(0.96); transition: opacity .5s cubic-bezier(.16,.84,.44,1), transform .5s cubic-bezier(.16,.84,.44,1); pointer-events: none; }
        .hero-card-slide.active { opacity: 1; transform: translateY(0) scale(1); pointer-events: auto; z-index: 2; }
        .hero-card-indicators { display: flex; align-items: center; justify-content: center; gap: 6px; margin-top: 20px; position: relative; z-index: 3; }
        .hero-card-dot { width: 8px; height: 8px; border-radius: 50%; background: rgba(255,255,255,0.12); cursor: pointer; transition: all .3s ease; border: none; padding: 0; }
        .hero-card-dot.active { width: 28px; border-radius: 4px; background: linear-gradient(135deg, var(--amber), var(--indigo)); }
        .hero-card-label { font-size: 11px; color: var(--text-faint); margin-top: 8px; text-align: center; font-family: 'JetBrains Mono', monospace; letter-spacing: 0.05em; transition: opacity .3s ease; position: relative; z-index: 3; }

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

        /* ---------------- Explore SL (beyond exams) ---------------- */
        .explore-card { position: relative; overflow: hidden; border-radius: 20px; border: 1px solid var(--border); background: linear-gradient(135deg, rgba(245,166,35,0.07), rgba(108,124,255,0.07)), var(--surface); padding: 46px; display: grid; grid-template-columns: 1.2fr 0.8fr; gap: 40px; align-items: center; }
        .explore-orb { position: absolute; width: 340px; height: 340px; border-radius: 50%; filter: blur(60px); opacity: .35; pointer-events: none; }
        .explore-orb-1 { background: radial-gradient(circle, rgba(245,166,35,0.5), transparent 70%); top: -120px; right: -80px; animation: exploreDrift 11s ease-in-out infinite; }
        .explore-orb-2 { background: radial-gradient(circle, rgba(108,124,255,0.45), transparent 70%); bottom: -140px; left: -60px; animation: exploreDrift 13s ease-in-out infinite reverse; }
        @keyframes exploreDrift { 0%,100% { transform: translate(0,0); } 50% { transform: translate(-24px, 18px); } }
        .explore-chips { display: flex; flex-wrap: wrap; gap: 10px; margin: 22px 0 30px; }
        .explore-chip { font-size: 13px; padding: 8px 14px; border-radius: 999px; border: 1px solid var(--border); background: rgba(255,255,255,0.04); color: var(--text-dim); transition: all .25s ease; }
        .explore-chip:hover { border-color: rgba(245,166,35,0.45); color: var(--text); transform: translateY(-2px); }
        .explore-visual { position: relative; display: flex; align-items: center; justify-content: center; }
        .explore-logo-ring { position: relative; width: 210px; height: 210px; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
        .explore-logo-ring::before { content: ''; position: absolute; inset: 0; border-radius: 50%; padding: 2px; background: conic-gradient(from 0deg, var(--amber), var(--indigo), transparent 65%, var(--amber)); -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0); -webkit-mask-composite: xor; mask-composite: exclude; animation: exploreSpin 7s linear infinite; }
        @keyframes exploreSpin { to { transform: rotate(360deg); } }
        .explore-logo-ring img { width: 120px; height: 120px; border-radius: 26%; box-shadow: 0 18px 44px rgba(0,0,0,0.5); }
        .explore-cta-row { display: flex; gap: 14px; flex-wrap: wrap; align-items: center; }
        .btn-explore { display: inline-flex; align-items: center; gap: 9px; padding: 13px 26px; border-radius: 12px; font-weight: 600; font-size: 15px; color: #1a1305; background: linear-gradient(135deg, var(--amber), #ffc25e); border: none; cursor: pointer; text-decoration: none; box-shadow: 0 10px 26px rgba(245,166,35,0.35); transition: transform .2s ease, box-shadow .2s ease; }
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

        @media (max-width: 720px) {
          .hero-inner { grid-template-columns: 1fr; }
          .hero { padding: 100px 0 40px; min-height: auto; }
          /* Mobile: text/CTAs first, visual below (was order:-1 = visual on top) */
          .hero-visual { height: 340px; margin-top: 8px; }
          .section { padding: 80px 0; }
          .spotlight-inner, .hero-inner { grid-template-columns: 1fr; }
          .cta-card { padding: 50px 24px; }
        }

        @media (prefers-reduced-motion: reduce) {
          .slexam * { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; }
        }
      `}</style>

      <div className={`mount-curtain ${loaded ? "curtain-hide" : ""}`} aria-hidden="true">
        <img src="/SL-instant-Logo.png" alt="Loading..." className="curtain-logo" />
      </div>

      {/* ---------------- Hero ---------------- */}
      <header className="hero">
        <div className="perspective-grid" />
        <div className="container hero-inner">
          <div>
            <span className="eyebrow">
              <span className="eyebrow-dot" /> Instant Exams. Instant Results.
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
              <span className="hero-title-line2 grad-text">From question bank to report card, in seconds.</span>
            </h1>
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
            <ThreeOrbit className="hero-three" containerRef={heroVisualRef} />
            <TiltCard className="hero-mock">
              <div className="hero-cards-container">

                {/* ── Card 0: Exam Interface (original) ── */}
                <div className={`hero-card-slide ${activeHeroCard === 0 ? "active" : ""}`}>
                  <div className="mock-window glow-border glow-border-always">
                    <div className="mock-topbar">
                      <div className="mock-dots"><span /> <span /> <span /></div>
                      <span className="mock-timer mono"><Timer size={12} /> 42:15</span>
                    </div>
                    <div className="mock-body">
                      <div className="mock-qpanel">
                        <p className="mock-qlabel mono">QUESTION 7 / 30</p>
                        <p className="mock-qtext">Which of these best explains photosynthesis's role in an ecosystem?</p>
                        <div className="mock-options">
                          {["A", "B", "C", "D"].map((o, i) => (
                            <div key={o} className={`mock-opt ${i === 1 ? "mock-opt-active" : ""}`}>
                              <span>{o}</span>
                              {i === 1 ? "Converts light energy into chemical energy" : ["Breaks down cellular waste", "Regulates body temperature", "Transports oxygen in blood"][i > 1 ? i - 1 : i]}
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="mock-side">
                        <p className="mock-side-label mono">ANSWER SHEET</p>
                        <div className="mock-grid">
                          {Array.from({ length: 30 }).map((_, i) => (
                            <span key={i} className={`mock-cell ${i < 12 ? "filled" : ""} ${i === 6 ? "current" : ""}`}>{i + 1}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── Card 1: Score Analysis ── */}
                <div className={`hero-card-slide ${activeHeroCard === 1 ? "active" : ""}`}>
                  <div className="mock-window glow-border glow-border-always">
                    <div className="mock-topbar">
                      <div className="mock-dots"><span /> <span /> <span /></div>
                      <span className="mock-timer mono" style={{ background: 'rgba(74,222,128,0.1)', color: '#86efac' }}><BarChart3 size={12} /> REPORT</span>
                    </div>
                    <div className="mock-analysis-body">
                      <p className="mock-qlabel mono">EXAM ANALYSIS — NEET MOCK 3</p>
                      <div className="mock-stat-row">
                        <div className="mock-stat-box">
                          <div className="mock-stat-val" style={{ color: 'var(--mint)' }}>156</div>
                          <div className="mock-stat-lbl">SCORE</div>
                        </div>
                        <div className="mock-stat-box">
                          <div className="mock-stat-val" style={{ color: 'var(--indigo)' }}>87%</div>
                          <div className="mock-stat-lbl">ACCURACY</div>
                        </div>
                        <div className="mock-stat-box">
                          <div className="mock-stat-val" style={{ color: 'var(--amber-soft)' }}>#42</div>
                          <div className="mock-stat-lbl">RANK</div>
                        </div>
                      </div>
                      {[
                        { label: 'Physics', pct: 92, color: 'var(--mint)' },
                        { label: 'Chemistry', pct: 78, color: 'var(--indigo)' },
                        { label: 'Botany', pct: 85, color: 'var(--amber-soft)' },
                        { label: 'Zoology', pct: 71, color: 'var(--red)' },
                      ].map((s) => (
                        <div key={s.label} className="mock-bar-row">
                          <span className="mock-bar-label">{s.label}</span>
                          <div className="mock-bar-track">
                            <div className="mock-bar-fill" style={{ width: `${s.pct}%`, background: s.color }} />
                          </div>
                          <span className="mock-bar-pct" style={{ color: s.color }}>{s.pct}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* ── Card 2: Question Repository ── */}
                <div className={`hero-card-slide ${activeHeroCard === 2 ? "active" : ""}`}>
                  <div className="mock-window glow-border glow-border-always">
                    <div className="mock-topbar">
                      <div className="mock-dots"><span /> <span /> <span /></div>
                      <span className="mock-timer mono" style={{ background: 'rgba(108,124,255,0.1)', color: '#a5b4fc' }}><Library size={12} /> REPOSITORY</span>
                    </div>
                    <div className="mock-repo-body">
                      <div className="mock-repo-search">
                        <Database size={11} /> Search 10,000+ questions by subject, chapter, topic…
                      </div>
                      {[
                        { num: 'Q1', text: 'A ball is thrown vertically upward with velocity 20 m/s. Find the maximum height reached.', sub: 'Physics', ch: 'Kinematics', diff: 'Medium' },
                        { num: 'Q2', text: 'Which reagent is used for Baeyer\'s test to detect unsaturation?', sub: 'Chemistry', ch: 'Organic', diff: 'Easy' },
                        { num: 'Q3', text: 'The process of photophosphorylation occurs in which part of the chloroplast?', sub: 'Botany', ch: 'Photosynthesis', diff: 'Hard' },
                      ].map((q, i) => (
                        <div key={i} className="mock-repo-item">
                          <div className="mock-repo-num">{q.num}</div>
                          <div>
                            <div className="mock-repo-text">{q.text}</div>
                            <div className="mock-repo-meta">
                              <span className="mock-repo-tag">{q.sub}</span>
                              <span className="mock-repo-tag">{q.ch}</span>
                              <span className="mock-repo-tag">{q.diff}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* ── Card 3: Live Command Center ── */}
                <div className={`hero-card-slide ${activeHeroCard === 3 ? "active" : ""}`}>
                  <div className="mock-window glow-border glow-border-always">
                    <div className="mock-topbar">
                      <div className="mock-dots"><span /> <span /> <span /></div>
                      <span className="mock-timer mono" style={{ background: 'rgba(242,104,92,0.1)', color: '#fca5a5' }}>
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#f2685c', display: 'inline-block', boxShadow: '0 0 8px #f2685c', animation: 'pulseDot 1.4s ease-in-out infinite' }} /> LIVE
                      </span>
                    </div>
                    <div className="mock-cc-body">
                      <p className="mock-qlabel mono">LIVE MONITORING — SECTION A</p>
                      <div className="mock-cc-grid">
                        {['normal', 'normal', 'normal', 'flagged', 'normal', 'normal',
                          'normal', 'done', 'normal', 'normal', 'normal', 'flagged',
                          'normal', 'normal', 'done', 'normal', 'normal', 'normal'].map((s, i) => (
                            <div key={i} className={`mock-cc-seat ${s}`}>
                              {String(i + 1).padStart(2, '0')}
                            </div>
                          ))}
                      </div>
                      <div className="mock-cc-alert-row">
                        <AlertTriangle size={13} />
                        <span>Seat 04 — Tab switch detected (2×)</span>
                      </div>
                      <div className="mock-cc-stat-bar">
                        <div className="mock-cc-stat">
                          <div className="mock-cc-stat-val" style={{ color: 'var(--mint)' }}>14</div>
                          <div className="mock-cc-stat-lbl">Active</div>
                        </div>
                        <div className="mock-cc-stat">
                          <div className="mock-cc-stat-val" style={{ color: 'var(--indigo)' }}>2</div>
                          <div className="mock-cc-stat-lbl">Submitted</div>
                        </div>
                        <div className="mock-cc-stat">
                          <div className="mock-cc-stat-val" style={{ color: 'var(--red)' }}>2</div>
                          <div className="mock-cc-stat-lbl">Flagged</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* Card indicators */}
              <div className="hero-card-indicators">
                {[0, 1, 2, 3].map((idx) => (
                  <button
                    key={idx}
                    className={`hero-card-dot ${activeHeroCard === idx ? "active" : ""}`}
                    onClick={() => handleHeroCardClick(idx)}
                    aria-label={`Show card ${idx + 1}`}
                  />
                ))}
              </div>
              <div className="hero-card-label">
                {["Exam Interface", "Score Analysis", "Question Repository", "Live Command Center"][activeHeroCard]}
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
            "JEE PRACTICE",
            "NEET PRACTICE",
            "SSC CGL",
            "BANKING",
            "RAILWAYS",
            "GATE",
            "EXAM REPORTS",
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