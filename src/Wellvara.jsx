import React, { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { auth, db } from "./firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import * as pdfjsLib from "pdfjs-dist";
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.mjs", import.meta.url).href;
import {
  Leaf, Sparkles, Sun, Cloud, Moon, ChevronRight, ChevronLeft, Check,
  Heart, Brain, Zap, Activity, Dumbbell, Scale, Target, ArrowRight,
  User, Calendar, Shield, FileText, Upload, Home, PillIcon, Stethoscope,
  BarChart3, Settings, Star, Clock, Video, MapPin, Filter, X,
  CheckCircle2, Info, Lock, Mail, Trash2, CreditCard, Package,
  TrendingUp, Flame, Droplets, Wind, CircleDot, Plus, Minus,
  Users, MessageCircle, Trophy, Globe, Send
} from "lucide-react";

// ============================================================
// DESIGN TOKENS
// ============================================================
const FONTS_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..900;1,9..144,300..900&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap');

html, body { background: #F2ECDF; }

.font-display { font-family: 'Fraunces', Georgia, serif; font-optical-sizing: auto; letter-spacing: -0.02em; }
.font-body { font-family: 'Plus Jakarta Sans', system-ui, sans-serif; }

.grain {
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' seed='3'/><feColorMatrix values='0 0 0 0 0.1 0 0 0 0 0.08 0 0 0 0 0.05 0 0 0 0.18 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
  background-size: 220px 220px;
  opacity: 0.6;
  pointer-events: none;
  mix-blend-mode: multiply;
}

@keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes slideIn { from { opacity: 0; transform: translateX(16px); } to { opacity: 1; transform: translateX(0); } }
@keyframes gentle { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
@keyframes shine { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }

.animate-fadeUp { animation: fadeUp 0.5s cubic-bezier(0.22, 1, 0.36, 1) both; }
.animate-fadeIn { animation: fadeIn 0.4s ease both; }
.animate-slideIn { animation: slideIn 0.45s cubic-bezier(0.22, 1, 0.36, 1) both; }
.animate-gentle { animation: gentle 4s ease-in-out infinite; }

.chip-select {
  transition: all 0.22s cubic-bezier(0.22, 1, 0.36, 1);
}
.chip-select:active { transform: scale(0.97); }

.range-salvia::-webkit-slider-thumb {
  appearance: none; width: 26px; height: 26px; border-radius: 50%;
  background: #3E5A4A; border: 4px solid #FDFBF5;
  box-shadow: 0 2px 8px rgba(62,90,74,0.35);
  cursor: pointer;
}
.range-salvia::-moz-range-thumb {
  width: 26px; height: 26px; border-radius: 50%;
  background: #3E5A4A; border: 4px solid #FDFBF5;
  box-shadow: 0 2px 8px rgba(62,90,74,0.35);
  cursor: pointer; border: none;
}
.range-salvia { -webkit-appearance: none; appearance: none; background: transparent; }

.scroll-hide::-webkit-scrollbar { display: none; }
.scroll-hide { scrollbar-width: none; }

.btn-primary {
  background: linear-gradient(180deg, #4A6B58 0%, #3E5A4A 100%);
  box-shadow: 0 1px 0 rgba(255,255,255,0.15) inset, 0 8px 24px -8px rgba(30,45,36,0.45);
}
.btn-primary:active { transform: translateY(1px); }
`;

// ============================================================
// QUESTIONNAIRE DEFINITIONS
// ============================================================
const QUESTIONS = [
  {
    id: "name",
    kind: "text",
    label: "¿Cómo te llamamos?",
    sub: "Usaremos tu nombre para personalizar tu experiencia.",
    placeholder: "Tu nombre",
    icon: User,
  },
  {
    id: "age",
    kind: "number",
    label: "¿Qué edad tienes?",
    sub: "Esto nos ayuda a ajustar las dosis recomendadas.",
    placeholder: "Edad",
    suffix: "años",
    min: 18, max: 99,
    icon: Calendar,
  },
  {
    id: "gender",
    kind: "choice",
    label: "Género",
    sub: "Selecciona la opción con la que te identificas.",
    options: [
      { v: "femenino", label: "Femenino" },
      { v: "masculino", label: "Masculino" },
      { v: "no-binario", label: "No binario" },
      { v: "prefiero-no-decir", label: "Prefiero no decir" },
    ],
  },
  {
    id: "body",
    kind: "body",
    label: "Tu cuerpo hoy",
    sub: "Datos aproximados son suficientes.",
  },
  {
    id: "sleep",
    kind: "scale",
    label: "¿Cómo describirías tu sueño?",
    sub: "Desliza para indicar la calidad de tu descanso en general.",
    low: "Inquieto",
    high: "Reparador",
    icon: Moon,
  },
  {
    id: "stress",
    kind: "scale",
    label: "¿Cómo se siente tu nivel de estrés?",
    sub: "Una vista rápida a cómo manejas la carga diaria.",
    low: "En calma",
    high: "Al límite",
    icon: Wind,
  },
  {
    id: "exercise",
    kind: "choice",
    label: "¿Con qué frecuencia te mueves?",
    sub: "Caminar, entrenar, yoga — todo cuenta.",
    options: [
      { v: "nada", label: "Casi nunca", sub: "Movimiento esporádico" },
      { v: "poco", label: "1–2 veces por semana", sub: "Actividad ligera" },
      { v: "moderado", label: "3–4 veces por semana", sub: "Rutina establecida" },
      { v: "alto", label: "5 o más veces", sub: "Muy activo/a" },
    ],
  },
  {
    id: "diet",
    kind: "choice",
    label: "Tu estilo de alimentación",
    sub: "El que mejor describa tu día a día.",
    options: [
      { v: "omnivora", label: "Omnívora", sub: "De todo un poco" },
      { v: "alta-proteina", label: "Alta en proteína", sub: "Enfoque deportivo" },
      { v: "vegetariana", label: "Vegetariana" },
      { v: "vegana", label: "Vegana" },
      { v: "keto", label: "Keto / baja en carbos" },
      { v: "mediterranea", label: "Mediterránea" },
    ],
  },
  {
    id: "goals",
    kind: "multi",
    label: "¿Qué te gustaría optimizar?",
    sub: "Puedes elegir varias. Máximo 3 para mejores resultados.",
    max: 3,
    options: [
      { v: "energia", label: "Más energía", icon: Zap },
      { v: "enfoque", label: "Mejor enfoque", icon: Brain },
      { v: "musculo", label: "Ganar músculo", icon: Dumbbell },
      { v: "grasa", label: "Perder grasa", icon: Flame },
      { v: "hormonal", label: "Balance hormonal", icon: Droplets },
      { v: "sueno", label: "Dormir mejor", icon: Moon },
      { v: "inmunidad", label: "Reforzar inmunidad", icon: Shield },
      { v: "longevidad", label: "Bienestar general", icon: Heart },
    ],
  },
  {
    id: "symptoms",
    kind: "multi",
    label: "¿Reconoces alguna de estas señales?",
    sub: "Sin presión — elige solo las que sientas frecuentes.",
    max: 5,
    options: [
      { v: "baja-energia", label: "Baja energía durante el día" },
      { v: "dormir", label: "Me cuesta conciliar el sueño" },
      { v: "niebla", label: "Niebla mental ocasional" },
      { v: "animo", label: "Ánimo cambiante" },
      { v: "antojos", label: "Antojos frecuentes" },
      { v: "digestion", label: "Digestión lenta" },
      { v: "recuperacion", label: "Recuperación lenta post-ejercicio" },
      { v: "piel", label: "Piel o cabello apagados" },
      { v: "ninguno", label: "Ninguna en particular" },
    ],
  },
  {
    id: "labs",
    kind: "labs",
    label: "¿Tienes estudios de laboratorio recientes?",
    sub: "Opcional. Solo los guardamos — no diagnosticamos.",
  },
  {
    id: "consent",
    kind: "consent",
    label: "Un último paso",
    sub: "Tu privacidad nos importa tanto como tu bienestar.",
  },
];

// ============================================================
// SUPPLEMENT DATABASE
// ============================================================
const SUPPLEMENTS = {
  vitD: {
    name: "Vitamina D3 + K2",
    timing: "morning",
    dose: "2,000–4,000 UI",
    benefit: "Apoya la salud ósea y la función inmunológica",
    color: "#E8A547",
  },
  omega: {
    name: "Omega-3 EPA/DHA",
    timing: "morning",
    dose: "1,000–2,000 mg",
    benefit: "Apoya la función cognitiva y cardiovascular",
    color: "#6B8FB5",
  },
  magnesio: {
    name: "Magnesio Glicinato",
    timing: "night",
    dose: "300–400 mg",
    benefit: "Promueve la relajación y el descanso profundo",
    color: "#9B8EC7",
  },
  lteanina: {
    name: "L-Teanina",
    timing: "night",
    dose: "200 mg",
    benefit: "Apoya la calma mental antes de dormir",
    color: "#7AA98A",
  },
  ashwagandha: {
    name: "Ashwagandha KSM-66",
    timing: "afternoon",
    dose: "600 mg",
    benefit: "Apoya al cuerpo frente al estrés cotidiano",
    color: "#B87B5F",
  },
  rhodiola: {
    name: "Rhodiola Rosea",
    timing: "morning",
    dose: "200–400 mg",
    benefit: "Apoya la energía y adaptación al estrés",
    color: "#D88B7A",
  },
  complejoB: {
    name: "Complejo B Activado",
    timing: "morning",
    dose: "1 cápsula",
    benefit: "Apoya la producción natural de energía",
    color: "#E6B15C",
  },
  coq10: {
    name: "CoQ10 Ubiquinol",
    timing: "morning",
    dose: "100 mg",
    benefit: "Apoya la energía celular y cardiovascular",
    color: "#C8844D",
  },
  bacopa: {
    name: "Bacopa Monnieri",
    timing: "morning",
    dose: "300 mg",
    benefit: "Apoya la memoria y el enfoque",
    color: "#7A9870",
  },
  creatina: {
    name: "Creatina Monohidratada",
    timing: "afternoon",
    dose: "5 g",
    benefit: "Apoya el rendimiento y recuperación",
    color: "#8595B5",
  },
  proteina: {
    name: "Proteína de Suero Aislada",
    timing: "afternoon",
    dose: "25 g",
    benefit: "Apoya la síntesis muscular",
    color: "#B89470",
  },
  teVerde: {
    name: "Té Verde EGCG",
    timing: "morning",
    dose: "500 mg",
    benefit: "Apoya el metabolismo y antioxidación",
    color: "#6A8D65",
  },
  zinc: {
    name: "Zinc Bisglicinato",
    timing: "night",
    dose: "15–25 mg",
    benefit: "Apoya la función hormonal e inmunológica",
    color: "#8E98A5",
  },
  probioticos: {
    name: "Probióticos Multi-Cepa",
    timing: "morning",
    dose: "25B CFU",
    benefit: "Apoya la salud digestiva",
    color: "#D4A574",
  },
  colageno: {
    name: "Colágeno Hidrolizado + C",
    timing: "morning",
    dose: "10 g",
    benefit: "Apoya piel, cabello y articulaciones",
    color: "#E8B7A0",
  },
};

// ============================================================
// RECOMMENDATION ENGINE
// ============================================================
function generateStack(answers) {
  const stack = [];
  const goals = answers.goals || [];
  const symptoms = answers.symptoms || [];
  const sleep = Number(answers.sleep ?? 5);
  const stress = Number(answers.stress ?? 5);
  const diet = answers.diet;

  const add = (key, reason) => {
    if (!stack.find(s => s.key === key)) {
      stack.push({ ...SUPPLEMENTS[key], key, reason });
    }
  };

  // Base universal recommendations
  add("vitD", "Base fundamental para casi toda rutina de bienestar");
  add("omega", diet === "vegana" || diet === "vegetariana"
    ? "Mencionaste dieta basada en plantas — Omega-3 de algas cubre lo esencial"
    : "Apoya base cognitiva y cardiovascular");

  // Sleep-related
  if (sleep <= 5 || symptoms.includes("dormir") || goals.includes("sueno")) {
    add("magnesio", `Calidad de sueño reportada: ${sleep}/10`);
    if (sleep <= 4 || symptoms.includes("dormir")) {
      add("lteanina", "Mencionaste dificultad para conciliar el sueño");
    }
  }

  // Stress-related
  if (stress >= 6) {
    add("ashwagandha", `Nivel de estrés reportado: ${stress}/10`);
  }
  if (stress >= 7) {
    add("rhodiola", "Apoyo adicional frente a carga sostenida");
  }

  // Energy goals
  if (goals.includes("energia") || symptoms.includes("baja-energia")) {
    add("complejoB", "Seleccionaste energía como prioridad");
    if (Number(answers.age) > 35) {
      add("coq10", "CoQ10 se vuelve relevante después de los 35");
    }
  }

  // Focus goals
  if (goals.includes("enfoque") || symptoms.includes("niebla")) {
    add("bacopa", "Seleccionaste enfoque como prioridad");
  }

  // Muscle
  if (goals.includes("musculo")) {
    add("creatina", "Objetivo: ganancia muscular");
    add("proteina", "Complemento de proteína para síntesis muscular");
  }

  // Fat loss
  if (goals.includes("grasa")) {
    add("teVerde", "Objetivo: composición corporal");
  }

  // Hormonal
  if (goals.includes("hormonal") || symptoms.includes("animo")) {
    add("zinc", "Apoyo al balance hormonal cotidiano");
  }

  // Digestion
  if (symptoms.includes("digestion")) {
    add("probioticos", "Mencionaste digestión lenta");
  }

  // Skin/hair
  if (symptoms.includes("piel") || goals.includes("longevidad")) {
    add("colageno", "Apoyo para piel, cabello y articulaciones");
  }

  return stack;
}

const PROVIDER_COLORS = ["#B87B5F","#3E5A4A","#8E98A5","#C0633F","#9B8EC7","#6A8D65","#4A7B8E","#7A5E8E"];

// ============================================================
// UI PRIMITIVES
// ============================================================
const Shell = ({ children }) => (
  <div className="min-h-screen w-full flex items-start justify-center font-body text-[#1A1F1B]">
    <div className="relative w-full max-w-[440px] min-h-screen bg-[#FDFBF5] overflow-hidden shadow-[0_0_60px_rgba(30,45,36,0.08)]">
      <div className="absolute inset-0 grain" aria-hidden />
      <div className="relative">{children}</div>
    </div>
  </div>
);

const TopBar = ({ title, onBack, right }) => (
  <div className="sticky top-0 z-30 backdrop-blur-xl bg-[#FDFBF5]/85 border-b border-[#E8E0CF]">
    <div className="flex items-center justify-between px-5 h-14">
      <div className="w-10">
        {onBack && (
          <button onClick={onBack} className="w-10 h-10 -ml-2 flex items-center justify-center rounded-full hover:bg-[#F2ECDF] transition">
            <ChevronLeft size={22} strokeWidth={1.6} />
          </button>
        )}
      </div>
      <h2 className="font-display text-[17px] tracking-tight">{title}</h2>
      <div className="w-10 flex justify-end">{right}</div>
    </div>
  </div>
);

const Pill = ({ children, tone = "sage" }) => {
  const tones = {
    sage: "bg-[#E4EADF] text-[#3E5A4A]",
    terra: "bg-[#F2DBCE] text-[#8B4A2B]",
    sand: "bg-[#EEE6D3] text-[#6B5E3F]",
    ink: "bg-[#1F2A24] text-[#F2ECDF]",
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium tracking-wide uppercase ${tones[tone]}`}>
      {children}
    </span>
  );
};

const SectionTitle = ({ eyebrow, title, sub }) => (
  <div className="mb-5">
    {eyebrow && <div className="text-[11px] tracking-[0.18em] uppercase text-[#8B8470] mb-2">{eyebrow}</div>}
    <h2 className="font-display text-[28px] leading-[1.1] tracking-tight">{title}</h2>
    {sub && <p className="text-[14px] text-[#6B6657] mt-2 leading-relaxed">{sub}</p>}
  </div>
);

// ============================================================
// SCREENS: WELCOME
// ============================================================
function WelcomeScreen({ onStart, onOpenPrivacy }) {
  return (
    <div className="relative min-h-screen flex flex-col">
      {/* Hero */}
      <div className="relative px-6 pt-14 pb-8">
        <div className="absolute -top-10 -right-16 w-64 h-64 rounded-full bg-[#D7C9A7] opacity-40 blur-3xl" />
        <div className="absolute top-32 -left-20 w-56 h-56 rounded-full bg-[#A8BFA8] opacity-35 blur-3xl" />

        <div className="relative animate-fadeUp">
          <div className="flex items-center gap-2.5 mb-10">
            <div className="w-9 h-9 rounded-full bg-[#1F2A24] flex items-center justify-center">
              <Leaf size={18} className="text-[#D7C9A7]" strokeWidth={1.5} />
            </div>
            <div className="font-display text-[22px] tracking-tight">
              Well<span className="italic text-[#C0633F]">vara</span>
            </div>
          </div>

          <div className="mb-3 flex items-center gap-2">
            <Pill tone="sage">Bienestar personalizado</Pill>
          </div>

          <h1 className="font-display text-[44px] leading-[0.98] tracking-[-0.025em] text-[#1F2A24]">
            Tu cuerpo,<br/>
            <em className="font-display italic text-[#C0633F]">escuchado</em><br/>
            con intención.
          </h1>

          <p className="mt-5 text-[15px] leading-relaxed text-[#4A463B] max-w-[320px]">
            Una rutina de suplementos pensada a partir de tu energía, sueño y objetivos.
            Sin diagnósticos — solo optimización diaria.
          </p>
        </div>
      </div>

      {/* Feature cards */}
      <div className="px-6 space-y-3 mt-2 animate-fadeUp" style={{ animationDelay: "120ms" }}>
        {[
          { icon: Sparkles, title: "Protocolo diario personalizado", sub: "Mañana, tarde y noche en tu bolsillo." },
          { icon: Stethoscope, title: "Doctores independientes", sub: "Accede a profesionales si lo deseas." },
          { icon: Shield, title: "Tus datos bajo tu control", sub: "Alineado con la LFPDPPP de México." },
        ].map((f, i) => (
          <div key={i} className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#FBF7EC] to-[#F5EDD8] border border-[#E8DEC3] p-4 flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#1F2A24] text-[#D7C9A7] flex items-center justify-center flex-shrink-0">
              <f.icon size={18} strokeWidth={1.6} />
            </div>
            <div>
              <div className="font-display text-[16px] tracking-tight leading-snug">{f.title}</div>
              <div className="text-[13px] text-[#6B6657] leading-relaxed mt-0.5">{f.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Disclaimer banner */}
      <div className="mx-6 mt-6 rounded-xl bg-[#F5ECDB] border border-[#E3D5B3] p-3.5 flex gap-2.5 animate-fadeUp" style={{ animationDelay: "240ms" }}>
        <Info size={16} className="text-[#8B6F3A] flex-shrink-0 mt-0.5" strokeWidth={1.6} />
        <p className="text-[12px] leading-relaxed text-[#6B5A2E]">
          Wellvara ofrece información general de bienestar y <strong>no sustituye consejo, diagnóstico ni tratamiento médico</strong>.
        </p>
      </div>

      {/* CTA */}
      <div className="flex-1" />
      <div className="sticky bottom-0 px-6 pt-4 pb-7 bg-gradient-to-t from-[#FDFBF5] via-[#FDFBF5] to-transparent">
        <button
          onClick={onStart}
          className="btn-primary w-full h-14 rounded-full text-white font-medium tracking-wide flex items-center justify-center gap-2"
        >
          Empezar mi evaluación
          <ArrowRight size={18} strokeWidth={2} />
        </button>
        <button
          onClick={onOpenPrivacy}
          className="w-full mt-3 text-[12px] text-[#6B6657] underline underline-offset-4 decoration-[#C7BFA7]"
        >
          Leer aviso de privacidad
        </button>
      </div>
    </div>
  );
}

// ============================================================
// SCREENS: QUESTIONNAIRE
// ============================================================
function Questionnaire({ onComplete, onExit }) {
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState({ height: 170, weight: 70 });
  const q = QUESTIONS[idx];
  const progress = ((idx + 1) / QUESTIONS.length) * 100;

  const setAns = (key, value) => setAnswers(prev => ({ ...prev, [key]: value }));

  const canAdvance = (() => {
    if (q.kind === "labs" || q.kind === "consent") return q.kind === "consent" ? !!answers.consent : true;
    if (q.kind === "body") return true;
    const v = answers[q.id];
    if (q.kind === "multi") return Array.isArray(v) && v.length > 0;
    return v !== undefined && v !== "" && v !== null;
  })();

  const next = () => {
    if (idx < QUESTIONS.length - 1) setIdx(idx + 1);
    else onComplete(answers);
  };
  const back = () => {
    if (idx === 0) onExit();
    else setIdx(idx - 1);
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Progress header */}
      <div className="sticky top-0 z-30 bg-[#FDFBF5]/90 backdrop-blur-xl border-b border-[#E8E0CF]">
        <div className="flex items-center justify-between px-5 h-14">
          <button onClick={back} className="w-10 h-10 -ml-2 flex items-center justify-center rounded-full hover:bg-[#F2ECDF]">
            <ChevronLeft size={22} strokeWidth={1.6} />
          </button>
          <div className="flex-1 mx-3">
            <div className="h-[3px] w-full bg-[#EEE5D0] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#3E5A4A] transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
          <div className="text-[11px] tabular-nums text-[#6B6657] font-medium">
            {idx + 1}/{QUESTIONS.length}
          </div>
        </div>
      </div>

      <div key={idx} className="flex-1 flex flex-col px-6 pt-8 pb-28 animate-slideIn">
        <div className="text-[11px] tracking-[0.2em] uppercase text-[#8B8470] mb-3">
          Paso {idx + 1}
        </div>
        <h2 className="font-display text-[30px] leading-[1.05] tracking-tight text-[#1F2A24]">
          {q.label}
        </h2>
        {q.sub && <p className="text-[14px] text-[#6B6657] mt-2 leading-relaxed">{q.sub}</p>}

        <div className="mt-8">
          {q.kind === "text" && (
            <input
              autoFocus
              type="text"
              value={answers[q.id] || ""}
              onChange={e => setAns(q.id, e.target.value)}
              placeholder={q.placeholder}
              className="w-full bg-transparent border-b-2 border-[#D7C9A7] focus:border-[#3E5A4A] outline-none py-3 font-display text-[28px] tracking-tight placeholder:text-[#C4BBA1] transition-colors"
            />
          )}

          {q.kind === "number" && (
            <div className="flex items-baseline gap-3">
              <input
                autoFocus
                type="number"
                value={answers[q.id] || ""}
                onChange={e => setAns(q.id, e.target.value)}
                placeholder={q.placeholder}
                min={q.min}
                max={q.max}
                className="flex-1 bg-transparent border-b-2 border-[#D7C9A7] focus:border-[#3E5A4A] outline-none py-3 font-display text-[36px] tracking-tight placeholder:text-[#C4BBA1]"
              />
              {q.suffix && <span className="font-display text-[18px] text-[#6B6657]">{q.suffix}</span>}
            </div>
          )}

          {q.kind === "choice" && (
            <div className="space-y-2.5">
              {q.options.map(opt => {
                const active = answers[q.id] === opt.v;
                return (
                  <button
                    key={opt.v}
                    onClick={() => { setAns(q.id, opt.v); setTimeout(next, 180); }}
                    className={`chip-select w-full text-left px-5 py-4 rounded-2xl border-2 flex items-center justify-between ${
                      active
                        ? "bg-[#1F2A24] border-[#1F2A24] text-[#F2ECDF]"
                        : "bg-[#FBF7EC] border-[#E8DEC3] text-[#1F2A24] hover:border-[#B8A876]"
                    }`}
                  >
                    <div>
                      <div className="font-medium text-[15px]">{opt.label}</div>
                      {opt.sub && (
                        <div className={`text-[12px] mt-0.5 ${active ? "text-[#D7C9A7]/80" : "text-[#8B8470]"}`}>
                          {opt.sub}
                        </div>
                      )}
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${active ? "border-[#D7C9A7] bg-[#D7C9A7]" : "border-[#C7BFA7]"}`}>
                      {active && <Check size={12} className="text-[#1F2A24]" strokeWidth={3} />}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {q.kind === "multi" && (
            <>
              <div className="grid grid-cols-2 gap-2.5">
                {q.options.map(opt => {
                  const arr = answers[q.id] || [];
                  const active = arr.includes(opt.v);
                  const Icon = opt.icon;
                  return (
                    <button
                      key={opt.v}
                      onClick={() => {
                        const next = active ? arr.filter(x => x !== opt.v) : [...arr, opt.v];
                        if (q.max && next.length > q.max) return;
                        setAns(q.id, next);
                      }}
                      className={`chip-select relative rounded-2xl border-2 p-4 text-left ${
                        active
                          ? "bg-[#3E5A4A] border-[#3E5A4A] text-white"
                          : "bg-[#FBF7EC] border-[#E8DEC3] hover:border-[#B8A876]"
                      }`}
                    >
                      {Icon && (
                        <Icon
                          size={18}
                          strokeWidth={1.6}
                          className={active ? "text-[#D7C9A7]" : "text-[#6B6657]"}
                        />
                      )}
                      <div className={`mt-2 font-medium text-[13px] leading-tight ${active ? "text-white" : "text-[#1F2A24]"}`}>
                        {opt.label}
                      </div>
                      {active && (
                        <div className="absolute top-2.5 right-2.5 w-4 h-4 rounded-full bg-[#D7C9A7] flex items-center justify-center">
                          <Check size={10} className="text-[#3E5A4A]" strokeWidth={3} />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
              {q.max && (
                <div className="text-[11px] text-[#8B8470] mt-3 tracking-wide">
                  {(answers[q.id] || []).length}/{q.max} seleccionados
                </div>
              )}
            </>
          )}

          {q.kind === "scale" && (
            <div className="mt-4">
              <div className="flex items-center justify-center">
                <div className="font-display text-[72px] leading-none text-[#3E5A4A] tabular-nums">
                  {answers[q.id] ?? 5}
                </div>
                <div className="font-display text-[24px] text-[#8B8470] ml-1">/10</div>
              </div>
              <input
                type="range"
                min="1" max="10" step="1"
                value={answers[q.id] ?? 5}
                onChange={e => setAns(q.id, Number(e.target.value))}
                className="range-salvia w-full mt-8 h-2 rounded-full bg-gradient-to-r from-[#E8DEC3] via-[#B8A876] to-[#3E5A4A]"
                style={{
                  background: `linear-gradient(to right, #3E5A4A 0%, #3E5A4A ${((answers[q.id] ?? 5) - 1) * 11.11}%, #E8DEC3 ${((answers[q.id] ?? 5) - 1) * 11.11}%, #E8DEC3 100%)`
                }}
              />
              <div className="flex justify-between mt-3 text-[12px] text-[#8B8470] font-medium">
                <span>{q.low}</span>
                <span>{q.high}</span>
              </div>
            </div>
          )}

          {q.kind === "body" && (
            <div className="space-y-6 mt-2">
              <div>
                <div className="flex justify-between items-baseline mb-2">
                  <span className="text-[13px] text-[#6B6657]">Estatura</span>
                  <span className="font-display text-[22px] text-[#3E5A4A] tabular-nums">{answers.height} cm</span>
                </div>
                <input
                  type="range"
                  min="140" max="210" step="1"
                  value={answers.height || 170}
                  onChange={e => setAns("height", Number(e.target.value))}
                  className="range-salvia w-full h-2 rounded-full"
                  style={{
                    background: `linear-gradient(to right, #3E5A4A 0%, #3E5A4A ${((answers.height - 140) / 70) * 100}%, #E8DEC3 ${((answers.height - 140) / 70) * 100}%, #E8DEC3 100%)`
                  }}
                />
              </div>
              <div>
                <div className="flex justify-between items-baseline mb-2">
                  <span className="text-[13px] text-[#6B6657]">Peso</span>
                  <span className="font-display text-[22px] text-[#3E5A4A] tabular-nums">{answers.weight} kg</span>
                </div>
                <input
                  type="range"
                  min="40" max="150" step="1"
                  value={answers.weight || 70}
                  onChange={e => setAns("weight", Number(e.target.value))}
                  className="range-salvia w-full h-2 rounded-full"
                  style={{
                    background: `linear-gradient(to right, #3E5A4A 0%, #3E5A4A ${((answers.weight - 40) / 110) * 100}%, #E8DEC3 ${((answers.weight - 40) / 110) * 100}%, #E8DEC3 100%)`
                  }}
                />
              </div>
            </div>
          )}

          {q.kind === "labs" && (
            <div>
              <button className="w-full rounded-2xl border-2 border-dashed border-[#D7C9A7] bg-[#FBF7EC]/60 hover:bg-[#F5ECDB] transition p-8 flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-[#1F2A24] flex items-center justify-center">
                  <Upload size={20} className="text-[#D7C9A7]" strokeWidth={1.6} />
                </div>
                <div className="font-medium text-[14px]">Subir PDF o imagen</div>
                <div className="text-[12px] text-[#8B8470] text-center">Solo los guardamos. No diagnosticamos.</div>
              </button>
              <div className="mt-4 flex gap-2 items-start bg-[#E4EADF] rounded-xl p-3">
                <Lock size={14} className="text-[#3E5A4A] mt-0.5 flex-shrink-0" strokeWidth={1.8} />
                <p className="text-[11.5px] text-[#3E5A4A] leading-relaxed">
                  Tus estudios se cifran en reposo. Puedes eliminarlos en cualquier momento desde tu perfil.
                </p>
              </div>
              <button onClick={next} className="mt-5 w-full text-[13px] text-[#6B6657] underline underline-offset-4 decoration-[#C7BFA7] py-2">
                Omitir por ahora
              </button>
            </div>
          )}

          {q.kind === "consent" && (
            <div className="space-y-4">
              <label className="flex gap-3 items-start cursor-pointer p-4 rounded-2xl bg-[#FBF7EC] border border-[#E8DEC3]">
                <input
                  type="checkbox"
                  checked={!!answers.consent}
                  onChange={e => setAns("consent", e.target.checked)}
                  className="mt-1 w-5 h-5 accent-[#3E5A4A]"
                />
                <span className="text-[13px] leading-relaxed text-[#1F2A24]">
                  He leído y acepto el <u className="decoration-[#C7BFA7]">aviso de privacidad</u> conforme a la
                  <strong> Ley Federal de Protección de Datos Personales en Posesión de los Particulares</strong>.
                  Autorizo el tratamiento de mis datos con fines de personalización del servicio.
                </span>
              </label>
              <div className="flex gap-3 items-start bg-[#F5ECDB] rounded-xl p-3 border border-[#E3D5B3]">
                <Info size={14} className="text-[#8B6F3A] mt-0.5 flex-shrink-0" />
                <p className="text-[11.5px] text-[#6B5A2E] leading-relaxed">
                  Wellvara no proporciona diagnóstico ni tratamiento médico. Las recomendaciones son educativas y de bienestar.
                  Siempre consulta a un profesional para decisiones de salud.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 flex justify-center pointer-events-none">
        <div className="w-full max-w-[440px] px-6 pb-6 pt-4 bg-gradient-to-t from-[#FDFBF5] via-[#FDFBF5]/95 to-transparent pointer-events-auto">
          <button
            disabled={!canAdvance}
            onClick={next}
            className={`w-full h-14 rounded-full flex items-center justify-center gap-2 font-medium tracking-wide transition ${
              canAdvance
                ? "btn-primary text-white"
                : "bg-[#E8E0CF] text-[#B0A890]"
            }`}
          >
            {idx === QUESTIONS.length - 1 ? "Ver mi rutina personalizada" : "Continuar"}
            {canAdvance && <ArrowRight size={18} strokeWidth={2} />}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// SCREENS: RESULTS (DAILY STACK)
// ============================================================
function ResultsScreen({ answers, stack, onGoDashboard, onSubscribe }) {
  const grouped = useMemo(() => {
    const g = { morning: [], afternoon: [], night: [] };
    stack.forEach(s => g[s.timing].push(s));
    return g;
  }, [stack]);

  const sections = [
    { key: "morning", label: "Mañana", sub: "Al despertar", Icon: Sun, tint: "#E8A547" },
    { key: "afternoon", label: "Tarde", sub: "Con la comida", Icon: Cloud, tint: "#C0633F" },
    { key: "night", label: "Noche", sub: "Antes de dormir", Icon: Moon, tint: "#5A5478" },
  ];

  return (
    <div className="min-h-screen pb-32">
      {/* Hero */}
      <div className="relative px-6 pt-10 pb-6">
        <div className="absolute top-0 right-0 w-60 h-60 rounded-full bg-[#C0633F]/15 blur-3xl" />
        <div className="relative animate-fadeUp">
          <Pill tone="terra">Tu rutina diaria</Pill>
          <h1 className="font-display text-[38px] leading-[1.02] tracking-tight mt-4 text-[#1F2A24]">
            Hola{answers.name ? `, ${answers.name.split(" ")[0]}` : ""}.<br/>
            Esta es <em className="italic text-[#C0633F]">tu pila</em>.
          </h1>
          <p className="mt-3 text-[14px] text-[#6B6657] leading-relaxed max-w-[320px]">
            {stack.length} suplementos seleccionados a partir de tus respuestas.
            Divididos en momentos del día para absorción óptima.
          </p>
        </div>

        {/* Stats strip */}
        <div className="mt-6 grid grid-cols-3 gap-2 animate-fadeUp" style={{animationDelay:"120ms"}}>
          {[
            { label: "Mañana", count: grouped.morning.length },
            { label: "Tarde", count: grouped.afternoon.length },
            { label: "Noche", count: grouped.night.length },
          ].map((s, i) => (
            <div key={i} className="rounded-2xl bg-[#FBF7EC] border border-[#E8DEC3] p-3 text-center">
              <div className="font-display text-[24px] tabular-nums text-[#3E5A4A]">{s.count}</div>
              <div className="text-[10px] uppercase tracking-[0.14em] text-[#8B8470] mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Sections */}
      <div className="px-6 space-y-8 mt-4">
        {sections.map((section, si) => {
          const { key, label, sub, tint } = section;
          const SectionIcon = section.Icon;
          return grouped[key].length > 0 && (
            <div key={key} className="animate-fadeUp" style={{ animationDelay: `${200 + si * 80}ms` }}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-11 h-11 rounded-full flex items-center justify-center" style={{background: `${tint}20`}}>
                  <SectionIcon size={20} strokeWidth={1.5} style={{color: tint}} />
                </div>
                <div>
                  <h3 className="font-display text-[22px] tracking-tight leading-none">{label}</h3>
                  <div className="text-[12px] text-[#8B8470] mt-0.5">{sub}</div>
                </div>
                <div className="ml-auto text-[11px] tabular-nums text-[#8B8470] tracking-wider">
                  {grouped[key].length} {grouped[key].length === 1 ? "item" : "items"}
                </div>
              </div>
              <div className="space-y-3">
                {grouped[key].map((s, i) => <SupplementCard key={s.key} supp={s} index={i} />)}
              </div>
            </div>
          );
        })}
      </div>

      {/* Disclaimer */}
      <div className="mx-6 mt-8 rounded-xl bg-[#F5ECDB] border border-[#E3D5B3] p-3.5 flex gap-2.5">
        <Info size={16} className="text-[#8B6F3A] flex-shrink-0 mt-0.5" strokeWidth={1.6} />
        <p className="text-[11.5px] leading-relaxed text-[#6B5A2E]">
          Rangos de dosis orientativos de bienestar general. Consulta a un profesional de salud antes de iniciar
          cualquier suplementación, especialmente si tomas medicamentos o tienes condiciones médicas.
        </p>
      </div>

      {/* Sticky CTA */}
      <div className="fixed bottom-0 left-0 right-0 flex justify-center pointer-events-none">
        <div className="w-full max-w-[440px] px-6 pb-6 pt-8 bg-gradient-to-t from-[#FDFBF5] via-[#FDFBF5]/95 to-transparent pointer-events-auto">
          <div className="flex gap-2.5">
            <button
              onClick={onSubscribe}
              className="btn-primary flex-1 h-14 rounded-full text-white font-medium flex items-center justify-center gap-2"
            >
              <Package size={18} strokeWidth={1.8} />
              Suscribir stack
            </button>
            <button
              onClick={onGoDashboard}
              className="w-14 h-14 rounded-full bg-[#1F2A24] text-[#D7C9A7] flex items-center justify-center"
              aria-label="Ir al inicio"
            >
              <Home size={18} strokeWidth={1.8} />
            </button>
          </div>
          <div className="text-center text-[11px] text-[#8B8470] mt-2.5">Cancelas cuando quieras · Envío a toda México</div>
        </div>
      </div>
    </div>
  );
}

function SupplementCard({ supp, index }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="relative rounded-2xl bg-[#FBF7EC] border border-[#E8DEC3] overflow-hidden animate-fadeUp"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <button onClick={() => setOpen(!open)} className="w-full text-left p-4 flex items-start gap-3">
        <div
          className="w-11 h-11 rounded-xl flex-shrink-0 flex items-center justify-center"
          style={{
            background: `linear-gradient(135deg, ${supp.color}, ${supp.color}BB)`,
            boxShadow: `0 4px 12px ${supp.color}40`,
          }}
        >
          <PillIcon size={18} className="text-white" strokeWidth={1.6} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-display text-[17px] tracking-tight leading-snug text-[#1F2A24]">
            {supp.name}
          </div>
          <div className="text-[12.5px] text-[#6B6657] mt-0.5 leading-snug">{supp.benefit}</div>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#E4EADF] text-[#3E5A4A] font-medium">
              {supp.dose}
            </span>
            <span className="text-[11px] text-[#8B8470]">
              · {supp.timing === "morning" ? "A.M." : supp.timing === "afternoon" ? "P.M." : "Noche"}
            </span>
          </div>
        </div>
        <div className={`w-7 h-7 rounded-full bg-[#1F2A24] text-[#D7C9A7] flex items-center justify-center flex-shrink-0 transition-transform ${open ? "rotate-45" : ""}`}>
          <Plus size={14} strokeWidth={2} />
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 pt-1 border-t border-[#E8DEC3]/60 mt-1 animate-fadeIn">
          <div className="text-[11px] tracking-[0.14em] uppercase text-[#8B8470] mt-2 mb-1.5">
            Por qué se sugirió
          </div>
          <p className="text-[13px] text-[#3F3A2E] leading-relaxed">{supp.reason}</p>
          <div className="flex gap-2 mt-3">
            <button className="flex-1 h-10 rounded-full bg-[#1F2A24] text-[#F2ECDF] text-[12px] font-medium">
              Comprar
            </button>
            <button className="flex-1 h-10 rounded-full bg-white border border-[#D7C9A7] text-[#1F2A24] text-[12px] font-medium">
              Ver ingredientes
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// SCREENS: DASHBOARD
// ============================================================
function Dashboard({ answers, stack, doseLogs, logDose, providers, workouts, wearables, logWorkout, toggleWearable, onNav, tab, setTab, onLogout }) {
  if (tab === "telehealth") return <TelehealthList onNav={onNav} providers={providers} />;
  if (tab === "progress") return <ProgressView answers={answers} stack={stack} doseLogs={doseLogs} />;
  if (tab === "workouts") return <WorkoutsView workouts={workouts} wearables={wearables} logWorkout={logWorkout} toggleWearable={toggleWearable} />;
  if (tab === "communities") return <CommunitiesView workouts={workouts} doseLogs={doseLogs} userName={answers.name} />;
  if (tab === "profile") return <ProfileView answers={answers} onNav={onNav} onLogout={onLogout} />;

  // Home tab
  const firstName = answers.name ? answers.name.split(" ")[0] : "";
  const now = new Date();
  const hour = now.getHours();
  const greet = hour < 12 ? "Buenos días" : hour < 19 ? "Buenas tardes" : "Buenas noches";
  const timeOfDay = hour < 12 ? "morning" : hour < 19 ? "afternoon" : "night";

  const todayStr = now.toISOString().slice(0, 10);
  const uniqueTimings = [...new Set(stack.map(s => s.timing).filter(Boolean))];
  const possiblePerDay = uniqueTimings.length || 1;

  const week7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now);
    d.setDate(now.getDate() - (6 - i));
    return d.toISOString().slice(0, 10);
  });

  const weekDayPcts = week7.map(date => {
    const logged = doseLogs.filter(l => l.date === date).length;
    return Math.min(100, Math.round((logged / possiblePerDay) * 100));
  });

  const weekLogged = doseLogs.filter(l => week7.includes(l.date)).length;
  const weekPct = Math.round((weekLogged / (7 * possiblePerDay)) * 100);

  const alreadyLoggedNow = doseLogs.some(l => l.date === todayStr && l.timeOfDay === timeOfDay);

  const goalLabels = {
    energia: "Energía", enfoque: "Enfoque", musculo: "Músculo", grasa: "Composición",
    hormonal: "Hormonal", sueno: "Sueño", inmunidad: "Inmunidad", longevidad: "Longevidad"
  };

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <div className="px-6 pt-10 pb-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[12px] text-[#8B8470] tracking-wide">{greet}</div>
            <h1 className="font-display text-[32px] leading-tight tracking-tight text-[#1F2A24]">
              {firstName || "Bienvenido"}
            </h1>
          </div>
          <button
            onClick={() => setTab("profile")}
            className="w-11 h-11 rounded-full bg-gradient-to-br from-[#3E5A4A] to-[#1F2A24] text-[#D7C9A7] flex items-center justify-center font-display text-[14px] font-semibold"
          >
            {firstName ? firstName[0].toUpperCase() : "?"}
          </button>
        </div>

        {/* Goals chips */}
        {answers.goals?.length > 0 && (
          <div className="flex gap-1.5 mt-4 overflow-x-auto scroll-hide">
            {answers.goals.map(g => (
              <span key={g} className="whitespace-nowrap px-3 py-1 rounded-full bg-[#E4EADF] text-[#3E5A4A] text-[11px] font-medium tracking-wide">
                {goalLabels[g] || g}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Today's hero card */}
      <div className="mx-6 rounded-3xl overflow-hidden relative bg-gradient-to-br from-[#2A3D31] via-[#1F2A24] to-[#121915] text-[#F2ECDF] p-6">
        <div className="absolute -top-14 -right-14 w-52 h-52 rounded-full bg-[#C0633F]/30 blur-3xl" />
        <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full bg-[#A8BFA8]/15 blur-2xl" />

        <div className="relative">
          <div className="flex items-center gap-2 text-[11px] tracking-[0.18em] uppercase text-[#D7C9A7]/80">
            {timeOfDay === "morning" ? <Sun size={13} /> : timeOfDay === "afternoon" ? <Cloud size={13} /> : <Moon size={13} />}
            Ahora
          </div>
          <h3 className="font-display text-[26px] leading-tight tracking-tight mt-2">
            Tu toma de {timeOfDay === "morning" ? "la mañana" : timeOfDay === "afternoon" ? "la tarde" : "la noche"}
          </h3>
          <div className="mt-4 space-y-2">
            {stack.filter(s => s.timing === timeOfDay).slice(0, 3).map(s => (
              <div key={s.key} className="flex items-center gap-3 py-2 border-b border-white/10 last:border-0">
                <div className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                <div className="text-[14px] font-medium">{s.name}</div>
                <div className="ml-auto text-[11px] text-[#D7C9A7]/70 tabular-nums">{s.dose}</div>
              </div>
            ))}
            {stack.filter(s => s.timing === timeOfDay).length === 0 && (
              <div className="text-[13px] text-[#D7C9A7]/70">No hay tomas programadas para este momento.</div>
            )}
          </div>
          <button
            onClick={() => !alreadyLoggedNow && logDose(timeOfDay)}
            className={`mt-5 h-11 px-5 rounded-full text-[13px] font-semibold inline-flex items-center gap-2 transition ${
              alreadyLoggedNow
                ? "bg-[#8DAF92] text-[#1F2A24] cursor-default"
                : "bg-[#D7C9A7] text-[#1F2A24]"
            }`}
          >
            {alreadyLoggedNow ? "Tomado ✓" : "Marcar como tomado"}
            {!alreadyLoggedNow && <Check size={14} strokeWidth={2.5} />}
          </button>
        </div>
      </div>

      {/* Row: stack + telehealth */}
      <div className="px-6 mt-5 grid grid-cols-2 gap-3">
        <button
          onClick={() => onNav("results")}
          className="rounded-2xl bg-[#FBF7EC] border border-[#E8DEC3] p-4 text-left"
        >
          <div className="w-9 h-9 rounded-xl bg-[#C0633F]/15 text-[#C0633F] flex items-center justify-center">
            <PillIcon size={17} strokeWidth={1.6} />
          </div>
          <div className="font-display text-[17px] tracking-tight mt-3 leading-tight">Mi stack</div>
          <div className="text-[11.5px] text-[#8B8470] mt-0.5">{stack.length} suplementos activos</div>
        </button>
        <button
          onClick={() => setTab("telehealth")}
          className="rounded-2xl bg-[#1F2A24] text-[#F2ECDF] p-4 text-left relative overflow-hidden"
        >
          <div className="w-9 h-9 rounded-xl bg-[#D7C9A7]/15 text-[#D7C9A7] flex items-center justify-center">
            <Stethoscope size={17} strokeWidth={1.6} />
          </div>
          <div className="font-display text-[17px] tracking-tight mt-3 leading-tight">Hablar con<br/>un profesional</div>
          <ChevronRight size={18} className="absolute bottom-4 right-4 text-[#D7C9A7]/60" />
        </button>
      </div>

      {/* Labs card */}
      <div className="px-6 mt-3">
        <button
          onClick={() => onNav("labs")}
          className="w-full rounded-2xl p-4 text-left relative overflow-hidden"
          style={{ background: "linear-gradient(135deg, #2A1F3D 0%, #1F2A3A 100%)" }}
        >
          <div className="absolute -top-8 -right-8 w-36 h-36 rounded-full bg-[#C0633F]/20 blur-2xl" />
          <div className="relative flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
              <Activity size={18} className="text-[#C0633F]" strokeWidth={1.8} />
            </div>
            <div className="flex-1">
              <div className="font-display text-[17px] tracking-tight text-[#F2ECDF] leading-tight">Laboratorios</div>
              <div className="text-[11.5px] text-[#D7C9A7]/70 mt-0.5">Analiza tus resultados con IA</div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-semibold tracking-wide px-2 py-0.5 rounded-full bg-[#C0633F]/30 text-[#E8A87C]">PRO</span>
              <ChevronRight size={16} className="text-[#D7C9A7]/60" />
            </div>
          </div>
        </button>
      </div>

      {/* Weekly adherence */}
      <div className="mx-6 mt-5 rounded-2xl bg-[#FBF7EC] border border-[#E8DEC3] p-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[11px] tracking-[0.14em] uppercase text-[#8B8470]">Esta semana</div>
            <div className="font-display text-[22px] tracking-tight leading-tight mt-1">Constancia</div>
          </div>
          <div className="text-right">
            {weekLogged === 0 ? (
              <div className="text-[13px] text-[#8B8470]">Sin registros</div>
            ) : (
              <>
                <div className="font-display text-[28px] tabular-nums text-[#3E5A4A] leading-none">{weekPct}%</div>
                <div className="text-[11px] text-[#8B8470] mt-0.5">de adherencia</div>
              </>
            )}
          </div>
        </div>
        <div className="mt-4 grid grid-cols-7 gap-1.5">
          {["L","M","M","J","V","S","D"].map((d, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5">
              <div className="w-full h-16 rounded-lg bg-[#E8DEC3] relative overflow-hidden">
                {weekDayPcts[i] > 0 && (
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#3E5A4A] to-[#6B8F77]" style={{ height: `${weekDayPcts[i]}%` }} />
                )}
              </div>
              <div className="text-[10px] text-[#8B8470] font-medium">{d}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick tip */}
      <div className="mx-6 mt-4 rounded-2xl p-4 bg-gradient-to-br from-[#F5ECDB] to-[#EEE6D3] border border-[#E3D5B3] flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-[#1F2A24] text-[#D7C9A7] flex items-center justify-center flex-shrink-0">
          <Sparkles size={16} strokeWidth={1.6} />
        </div>
        <div>
          <div className="font-display text-[15px] tracking-tight">Tip del día</div>
          <p className="text-[12.5px] text-[#6B5A2E] mt-1 leading-relaxed">
            Acompaña el Omega-3 con una comida que contenga grasas saludables para mejor absorción.
          </p>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// TELEHEALTH LIST
// ============================================================
function TelehealthList({ onNav, providers }) {
  const [filter, setFilter] = useState("all");
  const filters = [
    { v: "all", label: "Todos" },
    { v: "bienestar", label: "Bienestar general" },
    { v: "nutricion", label: "Nutrición" },
    { v: "hormonal", label: "Hormonal" },
    { v: "wellness", label: "Wellness Coach" },
  ];
  const approved = providers.filter(p => p.status === "approved");
  const docs = filter === "all" ? approved : approved.filter(d => d.tags.includes(filter));

  return (
    <div className="min-h-screen pb-24">
      <div className="px-6 pt-10 pb-4">
        <Pill tone="sage">Marketplace</Pill>
        <h1 className="font-display text-[32px] tracking-tight leading-tight mt-3">
          Profesionales <em className="italic text-[#C0633F]">independientes</em>
        </h1>
        <p className="text-[13px] text-[#6B6657] leading-relaxed mt-2 max-w-[340px]">
          Médicos y coaches certificados en México. Ellos brindan consulta, diagnóstico y recetas — Wellvara solo conecta.
        </p>
      </div>

      {/* Filters */}
      <div className="px-6 overflow-x-auto scroll-hide">
        <div className="flex gap-2 pb-2 min-w-max">
          {filters.map(f => (
            <button
              key={f.v}
              onClick={() => setFilter(f.v)}
              className={`whitespace-nowrap px-4 py-2 rounded-full text-[12.5px] font-medium border transition ${
                filter === f.v
                  ? "bg-[#1F2A24] text-[#F2ECDF] border-[#1F2A24]"
                  : "bg-[#FBF7EC] text-[#3F3A2E] border-[#E8DEC3]"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Provider cards */}
      <div className="px-6 mt-4 space-y-3">
        {docs.length === 0 && (
          <div className="text-center py-10">
            <div className="w-14 h-14 rounded-full bg-[#F2ECDF] flex items-center justify-center mx-auto mb-3">
              <Stethoscope size={22} className="text-[#B0A890]" strokeWidth={1.5} />
            </div>
            <div className="font-display text-[18px] tracking-tight text-[#3F3A2E]">Próximamente</div>
            <p className="text-[12.5px] text-[#8B8470] mt-1 max-w-[240px] mx-auto leading-relaxed">
              Estamos incorporando profesionales verificados. ¡Sé el primero en unirte!
            </p>
          </div>
        )}
        {docs.map((d, i) => (
          <button
            key={d.id}
            onClick={() => onNav("doctor", d)}
            className="w-full text-left rounded-2xl bg-[#FBF7EC] border border-[#E8DEC3] p-4 flex gap-3 items-start animate-fadeUp"
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center font-display text-[18px] font-semibold text-white flex-shrink-0"
              style={{ background: `linear-gradient(135deg, ${d.color}, ${d.color}DD)` }}
            >
              {d.initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-display text-[17px] tracking-tight leading-tight text-[#1F2A24]">{d.name}</div>
                  <div className="text-[12.5px] text-[#6B6657] mt-0.5">{d.specialty}</div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="font-display text-[18px] tabular-nums text-[#3E5A4A] leading-none">${d.price}</div>
                  <div className="text-[10px] text-[#8B8470] tracking-wider mt-0.5">MXN</div>
                </div>
              </div>
              <div className="flex items-center gap-3 mt-2.5 text-[11.5px] text-[#6B6657]">
                {d.rating && (
                  <span className="flex items-center gap-1">
                    <Star size={12} className="fill-[#E8A547] text-[#E8A547]" strokeWidth={0} />
                    <span className="font-semibold text-[#1F2A24]">{d.rating}</span>
                    <span className="text-[#8B8470]">({d.reviews})</span>
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <MapPin size={12} strokeWidth={1.6} /> {d.city}
                </span>
                <span className="flex items-center gap-1">
                  <Video size={12} strokeWidth={1.6} /> Online
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Register CTA */}
      <div className="mx-6 mt-6 rounded-2xl bg-gradient-to-br from-[#1F2A24] to-[#2A3D31] p-5">
        <div className="text-[11px] uppercase tracking-[0.14em] text-[#D7C9A7]/70 mb-2">¿Eres profesional?</div>
        <div className="font-display text-[20px] tracking-tight text-[#F2ECDF] leading-tight">
          Únete a la red<br/>Wellvara
        </div>
        <p className="text-[12px] text-[#D7C9A7]/70 mt-2 leading-relaxed">
          85% de cada sesión es tuyo. Verificamos tu cédula y te conectamos con pacientes.
        </p>
        <button
          onClick={() => onNav("provider-register")}
          className="mt-4 h-10 px-5 rounded-full bg-[#D7C9A7] text-[#1F2A24] text-[12.5px] font-semibold inline-flex items-center gap-2"
        >
          Registrarme <ArrowRight size={13} strokeWidth={2.2} />
        </button>
      </div>

      {/* Footer note */}
      <div className="mx-6 mt-4 mb-6 rounded-xl bg-[#F5ECDB] border border-[#E3D5B3] p-3 flex gap-2 items-start">
        <Info size={14} className="text-[#8B6F3A] mt-0.5 flex-shrink-0" />
        <p className="text-[11px] text-[#6B5A2E] leading-relaxed">
          Los profesionales operan como proveedores independientes conforme a lineamientos de COFEPRIS.
        </p>
      </div>
    </div>
  );
}

// ============================================================
// DOCTOR DETAIL / BOOKING
// ============================================================
function DoctorDetail({ doctor, onBack, onBook }) {
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);

  const availability = doctor.availability || {};
  const dates = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d;
  }).filter(d => {
    const key = d.toISOString().slice(0, 10);
    return !availability || Object.keys(availability).length === 0 || (availability[key] && availability[key].length > 0);
  });
  const selectedDateStr = selectedDate != null && dates[selectedDate] ? dates[selectedDate].toISOString().slice(0, 10) : null;
  const times = selectedDateStr && availability[selectedDateStr]?.length > 0
    ? availability[selectedDateStr]
    : ["09:00", "11:00", "13:00", "15:00", "17:00", "19:00"];
  const dayNames = ["D","L","M","M","J","V","S"];
  const monthNames = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

  return (
    <div className="min-h-screen pb-32">
      <TopBar onBack={onBack} title="Perfil" />

      <div className="px-6 pt-6 pb-6">
        <div className="flex gap-4 items-start">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center font-display text-[26px] font-semibold text-white flex-shrink-0"
            style={{ background: `linear-gradient(135deg, ${doctor.color}, ${doctor.color}DD)` }}
          >
            {doctor.initials}
          </div>
          <div className="flex-1">
            <h1 className="font-display text-[24px] tracking-tight leading-tight">{doctor.name}</h1>
            <div className="text-[13px] text-[#6B6657] mt-0.5">{doctor.specialty}</div>
            <div className="flex items-center gap-2 mt-2 text-[12px]">
              <Star size={13} className="fill-[#E8A547] text-[#E8A547]" strokeWidth={0} />
              <span className="font-semibold">{doctor.rating}</span>
              <span className="text-[#8B8470]">· {doctor.reviews} reseñas</span>
            </div>
          </div>
        </div>

        <p className="mt-5 text-[14px] leading-relaxed text-[#3F3A2E]">{doctor.bio}</p>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-[#FBF7EC] border border-[#E8DEC3] p-3">
            <div className="text-[10px] uppercase tracking-[0.14em] text-[#8B8470]">Idiomas</div>
            <div className="text-[13px] font-medium mt-0.5">{doctor.languages.join(" · ")}</div>
          </div>
          <div className="rounded-xl bg-[#FBF7EC] border border-[#E8DEC3] p-3">
            <div className="text-[10px] uppercase tracking-[0.14em] text-[#8B8470]">Modalidad</div>
            <div className="text-[13px] font-medium mt-0.5">Videollamada</div>
          </div>
        </div>
      </div>

      {/* Date picker */}
      <div className="px-6 pt-2">
        <SectionTitle eyebrow="Agenda" title="Elige fecha" />
        <div className="flex gap-2 overflow-x-auto scroll-hide pb-2">
          {dates.map((d, i) => {
            const active = selectedDate === i;
            return (
              <button
                key={i}
                onClick={() => setSelectedDate(i)}
                className={`flex-shrink-0 w-14 rounded-2xl border-2 transition p-2.5 text-center ${
                  active ? "bg-[#1F2A24] border-[#1F2A24] text-[#F2ECDF]" : "bg-[#FBF7EC] border-[#E8DEC3] text-[#1F2A24]"
                }`}
              >
                <div className={`text-[10px] font-medium tracking-wider ${active ? "text-[#D7C9A7]" : "text-[#8B8470]"}`}>
                  {dayNames[d.getDay()]}
                </div>
                <div className="font-display text-[22px] tabular-nums leading-tight mt-1">{d.getDate()}</div>
                <div className={`text-[9px] uppercase tracking-wider mt-0.5 ${active ? "text-[#D7C9A7]" : "text-[#8B8470]"}`}>
                  {monthNames[d.getMonth()]}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {selectedDate !== null && (
        <div className="px-6 mt-6 animate-fadeUp">
          <div className="text-[11px] tracking-[0.18em] uppercase text-[#8B8470] mb-3">Horarios disponibles</div>
          <div className="grid grid-cols-3 gap-2">
            {times.map(t => {
              const active = selectedTime === t;
              return (
                <button
                  key={t}
                  onClick={() => setSelectedTime(t)}
                  className={`h-12 rounded-xl border-2 font-medium text-[14px] tabular-nums transition ${
                    active
                      ? "bg-[#3E5A4A] border-[#3E5A4A] text-white"
                      : "bg-[#FBF7EC] border-[#E8DEC3] text-[#1F2A24]"
                  }`}
                >
                  {t}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Sticky booking footer */}
      <div className="fixed bottom-0 left-0 right-0 flex justify-center pointer-events-none">
        <div className="w-full max-w-[440px] px-6 pb-6 pt-4 bg-gradient-to-t from-[#FDFBF5] via-[#FDFBF5]/95 to-transparent pointer-events-auto">
          <div className="flex items-center justify-between mb-3 px-2">
            <div className="text-[12px] text-[#6B6657]">Total consulta</div>
            <div className="font-display text-[22px] tabular-nums text-[#1F2A24]">${doctor.price} <span className="text-[11px] text-[#8B8470] tracking-wider">MXN</span></div>
          </div>
          <button
            disabled={selectedDate === null || !selectedTime}
            onClick={() => onBook({ doctor, date: dates[selectedDate], time: selectedTime })}
            className={`w-full h-14 rounded-full font-medium flex items-center justify-center gap-2 transition ${
              selectedDate !== null && selectedTime
                ? "btn-primary text-white"
                : "bg-[#E8E0CF] text-[#B0A890]"
            }`}
          >
            <Calendar size={18} strokeWidth={1.8} />
            Reservar consulta
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// PROVIDER REGISTER SCREEN
// ============================================================
function ProviderRegisterScreen({ onBack, onSubmit }) {
  const [form, setForm] = useState({
    name: "", type: "doctor", specialty: "", city: "", price: "",
    bio: "", languages: "Español", cedula: null, tags: [],
  });
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState({});

  const tagOptions = [
    { v: "bienestar", label: "Bienestar general" },
    { v: "nutricion", label: "Nutrición" },
    { v: "hormonal", label: "Hormonal" },
    { v: "wellness", label: "Wellness Coach" },
  ];

  const toggleTag = (tag) =>
    setForm(prev => ({ ...prev, tags: prev.tags.includes(tag) ? prev.tags.filter(t => t !== tag) : [...prev.tags, tag] }));

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Requerido";
    if (!form.specialty.trim()) e.specialty = "Requerido";
    if (!form.city.trim()) e.city = "Requerido";
    if (!form.price || isNaN(Number(form.price))) e.price = "Precio inválido";
    if (!form.bio.trim()) e.bio = "Requerido";
    if (!form.cedula) e.cedula = "Requerido";
    if (form.tags.length === 0) e.tags = "Selecciona al menos una";
    return e;
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center pb-12">
        <div className="w-16 h-16 rounded-full bg-[#E4EADF] flex items-center justify-center mx-auto mb-5">
          <CheckCircle2 size={32} className="text-[#3E5A4A]" strokeWidth={1.5} />
        </div>
        <Pill tone="sage">Solicitud enviada</Pill>
        <h1 className="font-display text-[30px] tracking-tight leading-tight mt-4">
          Te avisamos en<br/><em className="italic text-[#C0633F]">48–72 horas</em>
        </h1>
        <p className="text-[13px] text-[#6B6657] mt-3 leading-relaxed max-w-[280px]">
          Revisaremos tu documentación y recibirás confirmación por correo.
        </p>
        <div className="mt-6 rounded-2xl bg-gradient-to-br from-[#1F2A24] to-[#2A3D31] p-5 w-full max-w-[320px] text-left">
          <div className="text-[11px] uppercase tracking-[0.14em] text-[#D7C9A7]/70 mb-3">Tu acuerdo comercial</div>
          <div className="flex items-end justify-between">
            <div>
              <div className="font-display text-[36px] leading-none text-[#D7C9A7]">85%</div>
              <div className="text-[11px] text-[#D7C9A7]/60 mt-1">para ti por sesión</div>
            </div>
            <div className="text-right">
              <div className="font-display text-[28px] leading-none text-[#8B9A92]">15%</div>
              <div className="text-[11px] text-[#8B9A92]/60 mt-1">Wellvara</div>
            </div>
          </div>
          <div className="mt-3 h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div className="h-full bg-[#D7C9A7] rounded-full" style={{ width: "85%" }} />
          </div>
        </div>
        <button onClick={onBack} className="mt-6 text-[13px] text-[#3E5A4A] font-medium underline underline-offset-2">
          Volver al inicio
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-32">
      <TopBar onBack={onBack} title="Registro de profesional" />
      <div className="px-6 pt-6 space-y-4">
        <Pill tone="sage">Para profesionales</Pill>
        <h2 className="font-display text-[26px] tracking-tight leading-tight">
          Únete a la <em className="italic text-[#C0633F]">red</em> Wellvara
        </h2>
        <p className="text-[13px] text-[#6B6657] leading-relaxed">
          Conecta con pacientes en México. 85% de cada sesión es tuyo.
        </p>

        {/* Type toggle */}
        <div>
          <label className="text-[11px] uppercase tracking-[0.14em] text-[#8B8470] block mb-1.5">Tipo de profesional</label>
          <div className="flex gap-2">
            {[{ v: "doctor", label: "Médico/a" }, { v: "wellness_coach", label: "Wellness Coach" }].map(t => (
              <button key={t.v} onClick={() => setForm(p => ({ ...p, type: t.v }))}
                className={`flex-1 py-2.5 rounded-xl border text-[13px] font-medium transition ${form.type === t.v ? "bg-[#1F2A24] text-[#F2ECDF] border-[#1F2A24]" : "bg-[#FBF7EC] text-[#3F3A2E] border-[#E8DEC3]"}`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-[11px] uppercase tracking-[0.14em] text-[#8B8470] block mb-1.5">Nombre completo</label>
          <input className="w-full h-11 rounded-xl border border-[#E8DEC3] bg-[#FBF7EC] px-4 text-[14px] outline-none focus:border-[#3E5A4A]"
            value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Dra. / Dr. / Lic." />
          {errors.name && <div className="text-[11px] text-[#C0633F] mt-1">{errors.name}</div>}
        </div>

        <div>
          <label className="text-[11px] uppercase tracking-[0.14em] text-[#8B8470] block mb-1.5">Especialidad</label>
          <input className="w-full h-11 rounded-xl border border-[#E8DEC3] bg-[#FBF7EC] px-4 text-[14px] outline-none focus:border-[#3E5A4A]"
            value={form.specialty} onChange={e => setForm(p => ({ ...p, specialty: e.target.value }))} placeholder="Ej. Nutrición Clínica" />
          {errors.specialty && <div className="text-[11px] text-[#C0633F] mt-1">{errors.specialty}</div>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] uppercase tracking-[0.14em] text-[#8B8470] block mb-1.5">Ciudad</label>
            <input className="w-full h-11 rounded-xl border border-[#E8DEC3] bg-[#FBF7EC] px-4 text-[14px] outline-none focus:border-[#3E5A4A]"
              value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} placeholder="CDMX" />
            {errors.city && <div className="text-[11px] text-[#C0633F] mt-1">{errors.city}</div>}
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-[0.14em] text-[#8B8470] block mb-1.5">Precio / sesión (MXN)</label>
            <input type="number" className="w-full h-11 rounded-xl border border-[#E8DEC3] bg-[#FBF7EC] px-4 text-[14px] outline-none focus:border-[#3E5A4A]"
              value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))} placeholder="800" />
            {errors.price && <div className="text-[11px] text-[#C0633F] mt-1">{errors.price}</div>}
          </div>
        </div>

        <div>
          <label className="text-[11px] uppercase tracking-[0.14em] text-[#8B8470] block mb-1.5">Bio breve</label>
          <textarea className="w-full rounded-xl border border-[#E8DEC3] bg-[#FBF7EC] px-4 py-3 text-[14px] outline-none focus:border-[#3E5A4A] resize-none"
            rows={3} value={form.bio} onChange={e => setForm(p => ({ ...p, bio: e.target.value }))}
            placeholder="Tu enfoque y experiencia en 2–3 oraciones..." />
          {errors.bio && <div className="text-[11px] text-[#C0633F] mt-1">{errors.bio}</div>}
        </div>

        <div>
          <label className="text-[11px] uppercase tracking-[0.14em] text-[#8B8470] block mb-1.5">Categorías</label>
          <div className="flex flex-wrap gap-2">
            {tagOptions.map(t => (
              <button key={t.v} onClick={() => toggleTag(t.v)}
                className={`px-3 py-1.5 rounded-full border text-[12px] font-medium transition ${form.tags.includes(t.v) ? "bg-[#3E5A4A] text-white border-[#3E5A4A]" : "bg-[#FBF7EC] text-[#3F3A2E] border-[#E8DEC3]"}`}>
                {t.label}
              </button>
            ))}
          </div>
          {errors.tags && <div className="text-[11px] text-[#C0633F] mt-1">{errors.tags}</div>}
        </div>

        <div>
          <label className="text-[11px] uppercase tracking-[0.14em] text-[#8B8470] block mb-1.5">
            {form.type === "doctor" ? "Cédula Profesional (PDF/imagen)" : "Certificación o título (PDF/imagen)"}
          </label>
          <label className="flex items-center gap-3 h-12 rounded-xl border-2 border-dashed border-[#E8DEC3] bg-[#FBF7EC] px-4 cursor-pointer hover:border-[#3E5A4A] transition">
            <Upload size={16} className="text-[#8B8470]" strokeWidth={1.6} />
            <span className="text-[13px] text-[#8B8470]">{form.cedula || "Seleccionar archivo"}</span>
            <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png"
              onChange={e => { if (e.target.files[0]) setForm(p => ({ ...p, cedula: e.target.files[0].name })); }} />
          </label>
          {errors.cedula && <div className="text-[11px] text-[#C0633F] mt-1">{errors.cedula}</div>}
        </div>

        {/* Split preview */}
        <div className="rounded-2xl bg-gradient-to-br from-[#1F2A24] to-[#2A3D31] text-[#F2ECDF] p-4">
          <div className="text-[11px] uppercase tracking-[0.14em] text-[#D7C9A7]/70 mb-3">Acuerdo de ingresos</div>
          <div className="flex items-end justify-between">
            <div><div className="font-display text-[32px] leading-none text-[#D7C9A7]">85%</div>
              <div className="text-[11px] text-[#D7C9A7]/60 mt-0.5">para ti</div></div>
            <div className="text-right"><div className="font-display text-[24px] leading-none text-[#8B9A92]">15%</div>
              <div className="text-[11px] text-[#8B9A92]/60 mt-0.5">Wellvara</div></div>
          </div>
          <div className="mt-3 h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div className="h-full bg-[#D7C9A7] rounded-full" style={{ width: "85%" }} />
          </div>
        </div>

        <button
          onClick={() => {
            const e = validate();
            if (Object.keys(e).length > 0) { setErrors(e); return; }
            onSubmit({ ...form, price: Number(form.price) });
            setSubmitted(true);
          }}
          className="btn-primary w-full h-14 rounded-full text-white font-medium tracking-wide flex items-center justify-center gap-2"
        >
          Enviar solicitud <ArrowRight size={16} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}

// ============================================================
// PROVIDER DASHBOARD (availability calendar)
// ============================================================
function ProviderDashboard({ provider, onBack, onUpdateAvailability }) {
  const [selectedDate, setSelectedDate] = useState(null);
  const [availability, setAvailability] = useState(provider.availability || {});

  const timeSlots = ["08:00","09:00","10:00","11:00","12:00","14:00","15:00","16:00","17:00","18:00","19:00"];
  const dayNames = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"];
  const monthNames = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

  const days14 = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d;
  });

  const toggleSlot = (dateStr, slot) => {
    const current = availability[dateStr] || [];
    const next = current.includes(slot) ? current.filter(s => s !== slot) : [...current, slot];
    const updated = { ...availability, [dateStr]: next };
    setAvailability(updated);
    onUpdateAvailability(provider.id, updated);
  };

  const selectedDateStr = selectedDate != null ? days14[selectedDate]?.toISOString().slice(0, 10) : null;

  return (
    <div className="min-h-screen pb-32">
      <TopBar onBack={onBack} title="Mi portal" />
      <div className="px-6 pt-6 space-y-4">

        {/* Profile card */}
        <div className="rounded-2xl bg-gradient-to-br from-[#1F2A24] to-[#2A3D31] text-[#F2ECDF] p-5 flex items-center gap-4">
          <div className="w-14 h-14 rounded-full flex items-center justify-center font-display text-[20px] font-semibold text-white flex-shrink-0"
            style={{ background: `linear-gradient(135deg, ${provider.color}, ${provider.color}99)` }}>
            {provider.initials}
          </div>
          <div className="flex-1">
            <div className="font-display text-[18px] tracking-tight leading-tight">{provider.name}</div>
            <div className="text-[12px] text-[#D7C9A7]/70 mt-0.5">{provider.specialty} · {provider.city}</div>
            <div className="mt-2">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium ${
                provider.status === "approved" ? "bg-[#3E5A4A]/50 text-[#8DAF92]" :
                provider.status === "pending" ? "bg-[#D7C9A7]/20 text-[#D7C9A7]" :
                "bg-[#C0633F]/30 text-[#E8956A]"
              }`}>
                {provider.status === "approved" ? "Aprobado" : provider.status === "pending" ? "En revisión (48–72h)" : "Rechazado"}
              </span>
            </div>
          </div>
        </div>

        {/* Earnings */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-[#FBF7EC] border border-[#E8DEC3] p-4">
            <div className="text-[10px] uppercase tracking-[0.14em] text-[#8B8470]">Tu parte</div>
            <div className="font-display text-[28px] text-[#3E5A4A] leading-none mt-1">85%</div>
            <div className="text-[11px] text-[#8B8470] mt-0.5">MXN ${Math.round(provider.price * 0.85)} / sesión</div>
          </div>
          <div className="rounded-xl bg-[#FBF7EC] border border-[#E8DEC3] p-4">
            <div className="text-[10px] uppercase tracking-[0.14em] text-[#8B8470]">Plataforma</div>
            <div className="font-display text-[28px] text-[#8B8470] leading-none mt-1">15%</div>
            <div className="text-[11px] text-[#8B8470] mt-0.5">MXN ${Math.round(provider.price * 0.15)} / sesión</div>
          </div>
        </div>

        {/* Availability calendar — only when approved */}
        {provider.status === "approved" ? (
          <div>
            <div className="text-[11px] uppercase tracking-[0.14em] text-[#8B8470] mb-3">Configurar disponibilidad</div>

            <div className="overflow-x-auto scroll-hide -mx-1 px-1">
              <div className="flex gap-2 min-w-max pb-2">
                {days14.map((d, i) => {
                  const dateStr = d.toISOString().slice(0, 10);
                  const isSelected = selectedDate === i;
                  const hasSlots = (availability[dateStr] || []).length > 0;
                  return (
                    <button key={i} onClick={() => setSelectedDate(i)}
                      className={`w-[52px] py-2.5 rounded-xl border flex flex-col items-center gap-0.5 transition ${
                        isSelected ? "bg-[#1F2A24] text-[#F2ECDF] border-[#1F2A24]" :
                        hasSlots ? "bg-[#E4EADF] border-[#3E5A4A]/40 text-[#3E5A4A]" :
                        "bg-[#FBF7EC] border-[#E8DEC3] text-[#3F3A2E]"
                      }`}>
                      <div className={`text-[9px] uppercase tracking-wider ${isSelected ? "text-[#D7C9A7]/70" : "text-[#8B8470]"}`}>
                        {dayNames[d.getDay()]}
                      </div>
                      <div className="font-display text-[17px] leading-tight">{d.getDate()}</div>
                      <div className={`text-[8px] ${isSelected ? "text-[#D7C9A7]/60" : "text-[#8B8470]"}`}>
                        {monthNames[d.getMonth()]}
                      </div>
                      {hasSlots && !isSelected && <div className="w-1.5 h-1.5 rounded-full bg-[#3E5A4A] mt-0.5" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {selectedDate != null ? (
              <div className="mt-4">
                <div className="text-[12px] text-[#6B6657] mb-3">
                  {dayNames[days14[selectedDate].getDay()]} {days14[selectedDate].getDate()} {monthNames[days14[selectedDate].getMonth()]}
                  {" · "}
                  <span className="text-[#3E5A4A] font-medium">
                    {(availability[selectedDateStr] || []).length} horarios activos
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {timeSlots.map(slot => {
                    const active = (availability[selectedDateStr] || []).includes(slot);
                    return (
                      <button key={slot} onClick={() => toggleSlot(selectedDateStr, slot)}
                        className={`h-10 rounded-xl border text-[13px] font-medium transition ${
                          active ? "bg-[#3E5A4A] text-white border-[#3E5A4A]" : "bg-[#FBF7EC] border-[#E8DEC3] text-[#3F3A2E]"
                        }`}>
                        {slot}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="text-center py-5 text-[12px] text-[#8B8470]">
                Selecciona un día para configurar tus horarios
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-2xl bg-[#FBF7EC] border border-[#E8DEC3] p-5 text-center">
            <div className="font-display text-[17px] tracking-tight">Solicitud en revisión</div>
            <p className="text-[12.5px] text-[#6B6657] mt-2 leading-relaxed">
              Una vez aprobado, podrás configurar tu disponibilidad aquí.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// ADMIN VIEW
// ============================================================
function AdminView({ providers, onApprove, onReject, onBack }) {
  const [filter, setFilter] = useState("all");
  const filtered = filter === "all" ? providers : providers.filter(p => p.status === filter);
  const counts = {
    total: providers.length,
    pending: providers.filter(p => p.status === "pending").length,
    approved: providers.filter(p => p.status === "approved").length,
    rejected: providers.filter(p => p.status === "rejected").length,
  };

  return (
    <div className="min-h-screen pb-24">
      <TopBar onBack={onBack} title="Admin — Profesionales" />
      <div className="px-6 pt-4">

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-2 mb-5">
          {[
            { label: "Total", value: counts.total, color: "#3F3A2E" },
            { label: "Pendientes", value: counts.pending, color: "#C0633F" },
            { label: "Aprobados", value: counts.approved, color: "#3E5A4A" },
            { label: "Rechazados", value: counts.rejected, color: "#8B8470" },
          ].map(s => (
            <div key={s.label} className="rounded-xl bg-[#FBF7EC] border border-[#E8DEC3] p-3 text-center">
              <div className="font-display text-[22px] leading-none" style={{ color: s.color }}>{s.value}</div>
              <div className="text-[9px] text-[#8B8470] mt-1 leading-tight">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-4 overflow-x-auto scroll-hide">
          {[
            { v: "all", label: "Todos" },
            { v: "pending", label: "Pendientes" },
            { v: "approved", label: "Aprobados" },
            { v: "rejected", label: "Rechazados" },
          ].map(f => (
            <button key={f.v} onClick={() => setFilter(f.v)}
              className={`whitespace-nowrap px-3 py-1.5 rounded-full text-[11px] font-medium border transition ${
                filter === f.v ? "bg-[#1F2A24] text-[#F2ECDF] border-[#1F2A24]" : "bg-[#FBF7EC] text-[#3F3A2E] border-[#E8DEC3]"
              }`}>
              {f.label}
            </button>
          ))}
        </div>

        {/* Provider list */}
        <div className="space-y-3">
          {filtered.length === 0 && (
            <div className="text-center py-10 text-[13px] text-[#8B8470]">Sin registros en esta categoría</div>
          )}
          {filtered.map(p => (
            <div key={p.id} className="rounded-2xl bg-[#FBF7EC] border border-[#E8DEC3] p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center font-display text-[13px] font-semibold text-white flex-shrink-0"
                  style={{ background: `linear-gradient(135deg, ${p.color}, ${p.color}99)` }}>
                  {p.initials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-display text-[15px] tracking-tight leading-tight">{p.name}</div>
                      <div className="text-[11.5px] text-[#6B6657]">{p.specialty} · {p.city}</div>
                    </div>
                    <span className={`flex-shrink-0 text-[10px] px-2 py-0.5 rounded-full font-medium ${
                      p.status === "approved" ? "bg-[#E4EADF] text-[#3E5A4A]" :
                      p.status === "pending" ? "bg-[#FFF3E8] text-[#C0633F]" :
                      "bg-[#F5E8E8] text-[#9B3030]"
                    }`}>
                      {p.status === "approved" ? "Aprobado" : p.status === "pending" ? "Pendiente" : "Rechazado"}
                    </span>
                  </div>
                  <div className="text-[11px] text-[#8B8470] mt-1">
                    {p.type === "doctor" ? "Médico/a" : "Wellness Coach"} · MXN ${p.price}/sesión · {(p.languages || []).join(", ")}
                  </div>
                  <div className="text-[11px] text-[#8B8470]">
                    Documento: <span className="text-[#3E5A4A]">{p.cedula || "—"}</span>
                  </div>
                  <p className="text-[11.5px] text-[#6B6657] mt-1.5 line-clamp-2 leading-relaxed">{p.bio}</p>
                  <div className="text-[10px] text-[#B0A890] mt-1">
                    Tags: {(p.tags || []).join(", ")}
                  </div>
                </div>
              </div>

              {p.status === "pending" && (
                <div className="flex gap-2 mt-3">
                  <button onClick={() => onApprove(p.id)}
                    className="flex-1 h-9 rounded-xl bg-[#3E5A4A] text-white text-[12px] font-semibold">
                    ✓ Aprobar
                  </button>
                  <button onClick={() => onReject(p.id)}
                    className="flex-1 h-9 rounded-xl bg-[#FBF7EC] border border-[#E8DEC3] text-[#C0633F] text-[12px] font-semibold">
                    ✗ Rechazar
                  </button>
                </div>
              )}
              {p.status === "approved" && (
                <div className="mt-3 text-[11px] text-[#8B8470]">
                  Horarios configurados: {Object.values(p.availability || {}).flat().length} slots
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// BOOKING CONFIRMATION
// ============================================================
function BookingConfirmation({ booking, onDone }) {
  const [bookingId] = useState(() => `WLV-${Math.floor(Math.random() * 9000 + 1000)}`);
  const d = booking.date;
  const dayNames = ["domingo","lunes","martes","miércoles","jueves","viernes","sábado"];
  const monthNames = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];

  return (
    <div className="min-h-screen flex flex-col">
      <TopBar onBack={onDone} title="Reserva" />
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <div className="w-20 h-20 rounded-full bg-[#E4EADF] flex items-center justify-center mb-5 animate-gentle">
          <CheckCircle2 size={40} className="text-[#3E5A4A]" strokeWidth={1.4} />
        </div>
        <Pill tone="sage">Confirmada</Pill>
        <h1 className="font-display text-[32px] leading-tight tracking-tight mt-4">
          Todo listo, <em className="italic text-[#C0633F]">{booking.doctor.name.split(" ")[1]}</em> te espera.
        </h1>
        <p className="mt-3 text-[13.5px] text-[#6B6657] leading-relaxed">
          Recibirás el enlace de la videollamada por correo 15 minutos antes de tu consulta.
        </p>

        <div className="w-full rounded-2xl bg-[#1F2A24] text-[#F2ECDF] p-5 mt-7 text-left">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <span className="text-[11px] uppercase tracking-[0.14em] text-[#D7C9A7]/70">Cita</span>
            <span className="text-[11px] text-[#D7C9A7]/70">{bookingId}</span>
          </div>
          <div className="pt-4 space-y-3">
            <div>
              <div className="text-[11px] text-[#D7C9A7]/70 uppercase tracking-[0.14em]">Cuándo</div>
              <div className="font-display text-[18px] mt-0.5">
                {dayNames[d.getDay()].charAt(0).toUpperCase() + dayNames[d.getDay()].slice(1)} {d.getDate()} de {monthNames[d.getMonth()]}, {booking.time}h
              </div>
            </div>
            <div>
              <div className="text-[11px] text-[#D7C9A7]/70 uppercase tracking-[0.14em]">Con</div>
              <div className="font-display text-[18px] mt-0.5">{booking.doctor.name}</div>
              <div className="text-[12px] text-[#D7C9A7]/70">{booking.doctor.specialty}</div>
            </div>
            <div>
              <div className="text-[11px] text-[#D7C9A7]/70 uppercase tracking-[0.14em]">Monto cobrado</div>
              <div className="font-display text-[18px] mt-0.5 tabular-nums">${booking.doctor.price} MXN</div>
            </div>
          </div>
        </div>

        <button onClick={onDone} className="btn-primary w-full h-14 rounded-full text-white font-medium mt-6">
          Volver al inicio
        </button>
      </div>
    </div>
  );
}

// ============================================================
// PROGRESS VIEW
// ============================================================
function ProgressView({ answers, stack, doseLogs }) {
  const goalLabels = {
    energia: "Energía", enfoque: "Enfoque", musculo: "Músculo", grasa: "Composición",
    hormonal: "Hormonal", sueno: "Sueño", inmunidad: "Inmunidad", longevidad: "Longevidad"
  };

  const now = new Date();
  const uniqueTimings = [...new Set(stack.map(s => s.timing).filter(Boolean))];
  const possiblePerDay = uniqueTimings.length || 1;

  const days30 = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(now);
    d.setDate(now.getDate() - (29 - i));
    return d.toISOString().slice(0, 10);
  });

  const barHeights = days30.map(date => {
    const logged = doseLogs.filter(l => l.date === date).length;
    return Math.min(100, Math.round((logged / possiblePerDay) * 100));
  });

  const thisMonthLogged = doseLogs.filter(l => days30.includes(l.date)).length;
  const thisPct = Math.round((thisMonthLogged / (30 * possiblePerDay)) * 100);

  const days30prev = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(now);
    d.setDate(now.getDate() - (59 - i));
    return d.toISOString().slice(0, 10);
  });
  const prevLogged = doseLogs.filter(l => days30prev.includes(l.date)).length;
  const prevPct = Math.round((prevLogged / (30 * possiblePerDay)) * 100);
  const delta = thisMonthLogged > 0 || prevLogged > 0 ? thisPct - prevPct : null;

  const hasData = thisMonthLogged > 0;

  return (
    <div className="min-h-screen pb-24 px-6 pt-10">
      <Pill tone="sand">Tu evolución</Pill>
      <h1 className="font-display text-[30px] tracking-tight mt-3 leading-tight">
        Pequeños <em className="italic text-[#C0633F]">cambios</em>, <br/>grandes resultados.
      </h1>

      <div className="mt-6 rounded-2xl bg-[#FBF7EC] border border-[#E8DEC3] p-5">
        <div className="text-[11px] tracking-[0.14em] uppercase text-[#8B8470]">Últimos 30 días</div>
        {hasData ? (
          <>
            <div className="flex items-baseline gap-2 mt-1">
              <div className="font-display text-[40px] tabular-nums text-[#3E5A4A] leading-none">{thisPct}%</div>
              {delta !== null && (
                <div className={`text-[12px] font-medium flex items-center gap-1 ${delta >= 0 ? "text-[#3E5A4A]" : "text-[#C0633F]"}`}>
                  <TrendingUp size={12} /> {delta >= 0 ? "+" : ""}{delta}% vs mes anterior
                </div>
              )}
            </div>
            <div className="text-[12px] text-[#8B8470] mt-1">adherencia promedio</div>
            <div className="mt-5 flex items-end gap-1.5 h-20">
              {barHeights.map((h, i) => (
                <div key={i} className="flex-1 rounded-sm bg-[#E8DEC3] relative overflow-hidden" style={{ height: "100%" }}>
                  {h > 0 && (
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#3E5A4A] to-[#8DAF92]" style={{ height: `${h}%` }} />
                  )}
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="mt-3 text-[13px] text-[#8B8470]">
            Aún no tienes registros. Marca tus tomas desde el inicio para ver tu progreso aquí.
          </div>
        )}
      </div>

      <div className="mt-5">
        <div className="text-[11px] tracking-[0.14em] uppercase text-[#8B8470] mb-3">Tus objetivos</div>
        <div className="space-y-2.5">
          {(answers.goals || []).map(g => (
            <div key={g} className="rounded-2xl bg-[#FBF7EC] border border-[#E8DEC3] p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="font-display text-[16px] tracking-tight">{goalLabels[g]}</div>
                <div className="text-[12px] tabular-nums font-medium text-[#3E5A4A]">
                  {hasData ? `${thisPct}%` : "—"}
                </div>
              </div>
              <div className="h-1.5 rounded-full bg-[#E8DEC3] overflow-hidden">
                {hasData && (
                  <div className="h-full bg-gradient-to-r from-[#3E5A4A] to-[#8DAF92]" style={{ width: `${thisPct}%` }} />
                )}
              </div>
            </div>
          ))}
          {(answers.goals || []).length === 0 && (
            <div className="text-[13px] text-[#8B8470]">Aún no has definido objetivos.</div>
          )}
        </div>
      </div>

      {hasData && (
        <div className="mt-5 rounded-2xl p-5 bg-gradient-to-br from-[#F5ECDB] to-[#EEE6D3] border border-[#E3D5B3]">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-[#1F2A24] text-[#D7C9A7] flex items-center justify-center flex-shrink-0">
              <Sparkles size={17} strokeWidth={1.6} />
            </div>
            <div>
              <div className="font-display text-[17px] tracking-tight">Insight de la semana</div>
              <p className="text-[12.5px] text-[#6B5A2E] mt-1 leading-relaxed">
                {thisPct >= 80
                  ? `Excelente constancia este mes (${thisPct}%). Sigue así para maximizar los beneficios de tu stack.`
                  : thisPct >= 50
                  ? `Vas bien con ${thisPct}% de adherencia. Intenta ser más consistente con las tomas de la tarde.`
                  : `Tu adherencia es de ${thisPct}% este mes. Establece recordatorios para mejorar tu consistencia.`}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// PROFILE / PRIVACY
// ============================================================
function ProfileView({ answers, onNav, onLogout }) {
  const [toast, setToast] = useState(null);
  const showToast = (label) => {
    setToast(label);
    setTimeout(() => setToast(null), 2000);
  };

  return (
    <div className="min-h-screen pb-24 px-6 pt-10">
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-[#1F2A24] text-[#F2ECDF] text-[13px] px-5 py-3 rounded-2xl shadow-lg animate-fadeUp">
          {toast} · próximamente
        </div>
      )}
      <div className="flex items-center gap-4 mb-8">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#3E5A4A] to-[#1F2A24] text-[#D7C9A7] flex items-center justify-center font-display text-[24px] font-semibold">
          {answers.name ? answers.name[0].toUpperCase() : "V"}
        </div>
        <div>
          <div className="font-display text-[22px] tracking-tight leading-tight">{answers.name || "Usuario"}</div>
          <div className="text-[12px] text-[#8B8470]">Miembro desde hoy</div>
        </div>
      </div>

      <div className="space-y-1">
        {[
          { icon: Pill, label: "Mi suscripción", sub: "Stack mensual · próximo envío en 18 días" },
          { icon: Calendar, label: "Mis consultas", sub: "Historial y próximas citas" },
          { icon: FileText, label: "Mis estudios", sub: "Documentos subidos" },
          { icon: CreditCard, label: "Pagos", sub: "Métodos de pago y facturación" },
        ].map((item, i) => (
          <button key={i} onClick={() => showToast(item.label)} className="w-full rounded-2xl bg-[#FBF7EC] border border-[#E8DEC3] p-4 flex items-center gap-3 text-left">
            <div className="w-10 h-10 rounded-xl bg-white border border-[#E8DEC3] flex items-center justify-center flex-shrink-0">
              <item.icon size={17} className="text-[#3E5A4A]" strokeWidth={1.6} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-[14px]">{item.label}</div>
              <div className="text-[11.5px] text-[#8B8470] truncate">{item.sub}</div>
            </div>
            <ChevronRight size={18} className="text-[#B0A890]" />
          </button>
        ))}
      </div>

      <div className="text-[11px] tracking-[0.14em] uppercase text-[#8B8470] mt-8 mb-3 px-1">Equipo Wellvara</div>
      <div className="space-y-1 mb-6">
        <button onClick={() => onNav("admin")}
          className="w-full rounded-2xl bg-[#1F2A24] text-[#F2ECDF] p-4 flex items-center gap-3 text-left">
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
            <Shield size={17} className="text-[#D7C9A7]" strokeWidth={1.6} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-[14px]">Administración</div>
            <div className="text-[11.5px] text-[#D7C9A7]/60 truncate">Gestionar profesionales</div>
          </div>
          <ChevronRight size={18} className="text-[#D7C9A7]/40" />
        </button>
      </div>

      <div className="text-[11px] tracking-[0.14em] uppercase text-[#8B8470] mb-3 px-1">Privacidad y datos</div>
      <div className="space-y-1">
        <button
          onClick={() => onNav("privacy")}
          className="w-full rounded-2xl bg-[#FBF7EC] border border-[#E8DEC3] p-4 flex items-center gap-3 text-left"
        >
          <div className="w-10 h-10 rounded-xl bg-white border border-[#E8DEC3] flex items-center justify-center">
            <Shield size={17} className="text-[#3E5A4A]" strokeWidth={1.6} />
          </div>
          <div className="flex-1">
            <div className="font-medium text-[14px]">Aviso de privacidad</div>
            <div className="text-[11.5px] text-[#8B8470]">Cumplimiento LFPDPPP</div>
          </div>
          <ChevronRight size={18} className="text-[#B0A890]" />
        </button>
        <button className="w-full rounded-2xl bg-[#FBF7EC] border border-[#E8DEC3] p-4 flex items-center gap-3 text-left">
          <div className="w-10 h-10 rounded-xl bg-white border border-[#E8DEC3] flex items-center justify-center">
            <Trash2 size={17} className="text-[#C0633F]" strokeWidth={1.6} />
          </div>
          <div className="flex-1">
            <div className="font-medium text-[14px] text-[#C0633F]">Eliminar mi cuenta y datos</div>
            <div className="text-[11.5px] text-[#8B8470]">Acción irreversible</div>
          </div>
          <ChevronRight size={18} className="text-[#B0A890]" />
        </button>
      </div>

      <div className="text-center mt-10">
        <button
          onClick={onLogout}
          className="text-[13px] text-[#C0633F] underline mb-4"
        >
          Cerrar sesión
        </button>
        <div className="font-display text-[16px] tracking-tight text-[#8B8470]">
          Well<span className="italic">vara</span>
        </div>
        <div className="text-[10px] text-[#B0A890] tracking-wider mt-1">v1.0 · Hecho en México</div>
      </div>
    </div>
  );
}

// ============================================================
// SUBSCRIPTION FLOW
// ============================================================
function SubscribeScreen({ stack, onBack, onDone }) {
  const [plan, setPlan] = useState("mensual");
  const base = stack.reduce((acc) => acc + 180, 0);
  const mensualPrice = base;
  const trimestralPrice = Math.round(base * 0.85);
  const price = plan === "mensual" ? mensualPrice : trimestralPrice;

  return (
    <div className="min-h-screen pb-32">
      <TopBar onBack={onBack} title="Suscribir stack" />

      <div className="px-6 pt-6">
        <Pill tone="terra">Entrega mensual</Pill>
        <h1 className="font-display text-[30px] leading-tight tracking-tight mt-3">
          Tu pila, <em className="italic text-[#C0633F]">lista</em> cada mes.
        </h1>
        <p className="text-[13px] text-[#6B6657] leading-relaxed mt-2">
          Envío gratuito a toda México. Pausa, ajusta o cancela desde tu perfil.
        </p>

        <div className="mt-6 rounded-2xl bg-[#FBF7EC] border border-[#E8DEC3] p-4">
          <div className="text-[11px] tracking-[0.14em] uppercase text-[#8B8470] mb-2">Incluye</div>
          <div className="grid grid-cols-2 gap-y-2 gap-x-3">
            {stack.map(s => (
              <div key={s.key} className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.color }} />
                <div className="text-[12px] text-[#3F3A2E] truncate">{s.name}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-5 space-y-2">
          {[
            { v: "mensual", label: "Cada mes", sub: "Envío mensual · flexibilidad total", price: mensualPrice, save: null },
            { v: "trimestral", label: "Cada 3 meses", sub: "Ahorra 15% · envío cada trimestre", price: trimestralPrice, save: "Ahorra $" + (mensualPrice - trimestralPrice) },
          ].map(p => {
            const active = plan === p.v;
            return (
              <button
                key={p.v}
                onClick={() => setPlan(p.v)}
                className={`w-full rounded-2xl border-2 p-4 flex items-center justify-between text-left transition ${
                  active ? "border-[#1F2A24] bg-[#1F2A24] text-[#F2ECDF]" : "border-[#E8DEC3] bg-[#FBF7EC]"
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <div className={`font-display text-[18px] tracking-tight ${active ? "text-[#F2ECDF]" : "text-[#1F2A24]"}`}>
                      {p.label}
                    </div>
                    {p.save && (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${active ? "bg-[#D7C9A7] text-[#1F2A24]" : "bg-[#C0633F] text-white"}`}>
                        {p.save}
                      </span>
                    )}
                  </div>
                  <div className={`text-[12px] mt-0.5 ${active ? "text-[#D7C9A7]/80" : "text-[#8B8470]"}`}>
                    {p.sub}
                  </div>
                </div>
                <div className="text-right">
                  <div className={`font-display text-[22px] tabular-nums ${active ? "text-[#F2ECDF]" : "text-[#1F2A24]"}`}>
                    ${p.price}
                  </div>
                  <div className={`text-[10px] tracking-wider ${active ? "text-[#D7C9A7]/70" : "text-[#8B8470]"}`}>
                    MXN/MES
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex gap-2 bg-[#E4EADF] rounded-xl p-3 items-start">
          <Shield size={14} className="text-[#3E5A4A] mt-0.5 flex-shrink-0" strokeWidth={1.8} />
          <p className="text-[11.5px] text-[#3E5A4A] leading-relaxed">
            Pago seguro procesado en pesos mexicanos. Al suscribirte aceptas los términos del servicio.
          </p>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 flex justify-center pointer-events-none">
        <div className="w-full max-w-[440px] px-6 pb-6 pt-4 bg-gradient-to-t from-[#FDFBF5] via-[#FDFBF5]/95 to-transparent pointer-events-auto">
          <button onClick={onDone} className="btn-primary w-full h-14 rounded-full text-white font-medium flex items-center justify-center gap-2">
            Suscribirme · ${price} MXN
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// PRIVACY SCREEN
// ============================================================
function PrivacyScreen({ onBack }) {
  return (
    <div className="min-h-screen pb-12">
      <TopBar onBack={onBack} title="Privacidad" />
      <div className="px-6 pt-6 pb-12">
        <Pill tone="sage">LFPDPPP</Pill>
        <h1 className="font-display text-[28px] leading-tight tracking-tight mt-3">
          Tus datos, <em className="italic text-[#C0633F]">tus reglas</em>.
        </h1>

        <div className="mt-6 space-y-5 text-[13.5px] leading-relaxed text-[#3F3A2E]">
          <p>
            Wellvara cumple con la Ley Federal de Protección de Datos Personales en Posesión de los Particulares.
            Tratamos tu información con los más altos estándares de seguridad y transparencia.
          </p>

          <div className="rounded-2xl bg-[#FBF7EC] border border-[#E8DEC3] p-4">
            <div className="font-display text-[16px] tracking-tight mb-2">Qué recolectamos</div>
            <ul className="space-y-1.5 text-[12.5px] text-[#4A463B]">
              <li>· Respuestas del cuestionario de bienestar</li>
              <li>· Estudios de laboratorio que decidas compartir</li>
              <li>· Historial de adherencia y consultas</li>
              <li>· Información de pago (procesada por terceros certificados)</li>
            </ul>
          </div>

          <div className="rounded-2xl bg-[#FBF7EC] border border-[#E8DEC3] p-4">
            <div className="font-display text-[16px] tracking-tight mb-2">Tus derechos ARCO</div>
            <p className="text-[12.5px] text-[#4A463B]">
              Puedes <strong>Acceder, Rectificar, Cancelar</strong> u <strong>Oponerte</strong> al tratamiento de
              tus datos en cualquier momento desde tu perfil o escribiendo a privacidad@wellvara.mx
            </p>
          </div>

          <div className="rounded-2xl bg-[#F5ECDB] border border-[#E3D5B3] p-4">
            <div className="font-display text-[16px] tracking-tight mb-2 text-[#6B5A2E]">Posicionamiento regulatorio</div>
            <ul className="space-y-1.5 text-[12.5px] text-[#6B5A2E]">
              <li>· Los suplementos son productos de bienestar, no medicamentos.</li>
              <li>· Wellvara no emite diagnósticos ni recetas.</li>
              <li>· Los profesionales de la telesalud son proveedores independientes.</li>
              <li>· Alineado con la guía de COFEPRIS para productos nutricionales.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// WORKOUTS VIEW
// ============================================================
const WORKOUT_TYPES = [
  { v: "strength", label: "Fuerza", Icon: Dumbbell, color: "#C0633F" },
  { v: "running", label: "Correr", Icon: Zap, color: "#3E5A4A" },
  { v: "cycling", label: "Ciclismo", Icon: Wind, color: "#4A7B8E" },
  { v: "yoga", label: "Yoga", Icon: Flame, color: "#9B8EC7" },
  { v: "swimming", label: "Natación", Icon: Droplets, color: "#5B8EA6" },
  { v: "hiit", label: "HIIT", Icon: Activity, color: "#B87B5F" },
];

const WEARABLES = [
  {
    key: "apple_watch",
    name: "Apple Watch",
    sub: "Health & HealthKit",
    note: "Requiere la app iOS de Wellvara",
    initials: "AW",
    color: "#1C1C1E",
    metrics: (seed) => [
      { label: "Pasos", value: `${(4200 + (seed * 73) % 8000).toLocaleString()}` },
      { label: "Calorías", value: `${1800 + (seed * 47) % 600} kcal` },
      { label: "FC promedio", value: `${62 + (seed * 3) % 20} bpm` },
      { label: "Sueño", value: `${6 + (seed % 2)}h ${(seed * 7) % 60}m` },
    ],
  },
  {
    key: "whoop",
    name: "Whoop",
    sub: "WHOOP API · OAuth2",
    note: "Conecta con tu cuenta Whoop",
    initials: "WH",
    color: "#00BE00",
    metrics: (seed) => [
      { label: "Recuperación", value: `${50 + (seed * 11) % 45}%` },
      { label: "Carga", value: `${8 + (seed * 3) % 12}.${seed % 9}` },
      { label: "HRV", value: `${42 + (seed * 7) % 35} ms` },
      { label: "Sueño", value: `${(70 + (seed * 9) % 25)}%` },
    ],
  },
  {
    key: "garmin",
    name: "Garmin",
    sub: "Garmin Health API",
    note: "Conecta con Garmin Connect",
    initials: "GR",
    color: "#007CC3",
    metrics: (seed) => [
      { label: "Pasos", value: `${(5000 + (seed * 91) % 9000).toLocaleString()}` },
      { label: "VO2 Max", value: `${42 + (seed * 2) % 12} mL/kg/min` },
      { label: "Estrés", value: `${20 + (seed * 5) % 50}` },
      { label: "Intensidad", value: `${(seed * 3) % 60} min` },
    ],
  },
  {
    key: "fitbit",
    name: "Fitbit",
    sub: "Fitbit Web API · OAuth2",
    note: "Conecta con tu cuenta Fitbit",
    initials: "FB",
    color: "#00B0B9",
    metrics: (seed) => [
      { label: "Pasos", value: `${(3800 + (seed * 83) % 7500).toLocaleString()}` },
      { label: "Calorías", value: `${1600 + (seed * 53) % 700} kcal` },
      { label: "Zona cardio", value: `${15 + (seed * 4) % 40} min` },
      { label: "Puntuación sueño", value: `${70 + (seed * 3) % 25}` },
    ],
  },
];

function WorkoutsView({ workouts, wearables, logWorkout, toggleWearable }) {
  const [subtab, setSubtab] = useState("today");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ type: "strength", duration: "", intensity: "medium", notes: "" });

  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const seed = today.getDate() + today.getMonth() * 31;

  const todayWorkouts = workouts.filter(w => w.date === todayStr);
  const connectedKeys = Object.keys(wearables).filter(k => wearables[k]);

  // Week workouts for stats
  const week7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (6 - i));
    return d.toISOString().slice(0, 10);
  });
  const weekWorkouts = workouts.filter(w => week7.includes(w.date));

  const subtabs = [
    { v: "today", label: "Hoy" },
    { v: "historial", label: "Historial" },
    { v: "dispositivos", label: "Dispositivos" },
  ];

  return (
    <div className="min-h-screen pb-28">
      {/* Header */}
      <div className="px-6 pt-10 pb-4">
        <Pill tone="terra">Actividad</Pill>
        <h1 className="font-display text-[30px] tracking-tight leading-tight mt-3">
          Mueve tu <em className="italic text-[#C0633F]">cuerpo</em>
        </h1>
        {connectedKeys.length > 0 && (
          <div className="flex gap-2 mt-3 flex-wrap">
            {connectedKeys.map(k => {
              const dev = WEARABLES.find(w => w.key === k);
              return (
                <span key={k} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium"
                  style={{ background: dev.color + "20", color: dev.color }}>
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: dev.color }} />
                  {dev.name}
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* Sub-tabs */}
      <div className="px-6 flex gap-2 mb-4">
        {subtabs.map(t => (
          <button key={t.v} onClick={() => setSubtab(t.v)}
            className={`px-4 py-2 rounded-full text-[12.5px] font-medium border transition ${
              subtab === t.v ? "bg-[#1F2A24] text-[#F2ECDF] border-[#1F2A24]" : "bg-[#FBF7EC] text-[#3F3A2E] border-[#E8DEC3]"
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── TODAY ─────────────────────────── */}
      {subtab === "today" && (
        <div className="px-6 space-y-4">

          {/* Wearable live metrics */}
          {connectedKeys.length > 0 && (
            <div className="space-y-3">
              {connectedKeys.map(k => {
                const dev = WEARABLES.find(w => w.key === k);
                const metrics = dev.metrics(seed);
                return (
                  <div key={k} className="rounded-2xl overflow-hidden border border-[#E8DEC3]">
                    <div className="flex items-center gap-3 px-4 py-3" style={{ background: dev.color + "18" }}>
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0"
                        style={{ background: dev.color }}>
                        {dev.initials}
                      </div>
                      <div>
                        <div className="font-display text-[14px] tracking-tight">{dev.name}</div>
                        <div className="text-[10px] text-[#8B8470]">Datos de hoy</div>
                      </div>
                      <div className="ml-auto w-2 h-2 rounded-full bg-[#4CAF50]" />
                    </div>
                    <div className="grid grid-cols-4 divide-x divide-[#E8DEC3] bg-[#FBF7EC]">
                      {metrics.map(m => (
                        <div key={m.label} className="p-3 text-center">
                          <div className="font-display text-[13px] tabular-nums leading-tight text-[#1F2A24]">{m.value}</div>
                          <div className="text-[9px] text-[#8B8470] mt-0.5 leading-tight">{m.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Week summary */}
          <div className="rounded-2xl bg-[#FBF7EC] border border-[#E8DEC3] p-4">
            <div className="flex items-center justify-between">
              <div className="text-[11px] uppercase tracking-[0.14em] text-[#8B8470]">Esta semana</div>
              <div className="font-display text-[22px] tabular-nums text-[#C0633F]">{weekWorkouts.length}</div>
            </div>
            <div className="text-[11px] text-[#8B8470] mt-0.5 mb-3">entrenamientos registrados</div>
            <div className="grid grid-cols-7 gap-1">
              {week7.map((d, i) => {
                const count = workouts.filter(w => w.date === d).length;
                const dayLabel = ["L","M","M","J","V","S","D"][i];
                return (
                  <div key={i} className="flex flex-col items-center gap-1">
                    <div className={`w-full h-8 rounded-lg flex items-center justify-center text-[10px] font-semibold transition ${
                      count > 0 ? "bg-[#C0633F] text-white" : "bg-[#E8DEC3] text-transparent"
                    }`}>
                      {count > 0 ? count : "·"}
                    </div>
                    <div className="text-[9px] text-[#8B8470]">{dayLabel}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Log workout button */}
          {!showForm ? (
            <button onClick={() => setShowForm(true)}
              className="w-full h-14 rounded-2xl bg-gradient-to-br from-[#C0633F] to-[#A04E2D] text-white font-semibold flex items-center justify-center gap-2 text-[14px]">
              <Plus size={18} strokeWidth={2.2} />
              Registrar entrenamiento
            </button>
          ) : (
            <div className="rounded-2xl bg-[#FBF7EC] border border-[#E8DEC3] p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="font-display text-[17px] tracking-tight">Nuevo entrenamiento</div>
                <button onClick={() => setShowForm(false)} className="text-[#8B8470] text-[12px]">Cancelar</button>
              </div>

              {/* Type grid */}
              <div>
                <div className="text-[11px] uppercase tracking-[0.14em] text-[#8B8470] mb-2">Tipo</div>
                <div className="grid grid-cols-3 gap-2">
                  {WORKOUT_TYPES.map(t => {
                    const active = form.type === t.v;
                    return (
                      <button key={t.v} onClick={() => setForm(p => ({ ...p, type: t.v }))}
                        className={`h-14 rounded-xl border flex flex-col items-center justify-center gap-1 transition ${
                          active ? "border-2 text-white" : "border-[#E8DEC3] bg-white text-[#3F3A2E]"
                        }`}
                        style={active ? { background: t.color, borderColor: t.color } : {}}>
                        <t.Icon size={16} strokeWidth={1.8} />
                        <span className="text-[10px] font-medium">{t.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Duration */}
              <div>
                <div className="text-[11px] uppercase tracking-[0.14em] text-[#8B8470] mb-2">Duración (minutos)</div>
                <input type="number" min="1" max="300"
                  className="w-full h-11 rounded-xl border border-[#E8DEC3] bg-white px-4 text-[14px] outline-none focus:border-[#C0633F]"
                  value={form.duration} onChange={e => setForm(p => ({ ...p, duration: e.target.value }))}
                  placeholder="45" />
              </div>

              {/* Intensity */}
              <div>
                <div className="text-[11px] uppercase tracking-[0.14em] text-[#8B8470] mb-2">Intensidad</div>
                <div className="flex gap-2">
                  {[{ v: "low", label: "Baja" }, { v: "medium", label: "Media" }, { v: "high", label: "Alta" }].map(iv => (
                    <button key={iv.v} onClick={() => setForm(p => ({ ...p, intensity: iv.v }))}
                      className={`flex-1 py-2 rounded-xl border text-[12px] font-medium transition ${
                        form.intensity === iv.v ? "bg-[#1F2A24] text-[#F2ECDF] border-[#1F2A24]" : "bg-white border-[#E8DEC3] text-[#3F3A2E]"
                      }`}>
                      {iv.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <div className="text-[11px] uppercase tracking-[0.14em] text-[#8B8470] mb-2">Notas (opcional)</div>
                <input className="w-full h-11 rounded-xl border border-[#E8DEC3] bg-white px-4 text-[14px] outline-none focus:border-[#C0633F]"
                  value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                  placeholder="PR en sentadilla, etc." />
              </div>

              <button
                disabled={!form.duration}
                onClick={() => {
                  if (!form.duration) return;
                  logWorkout({ type: form.type, duration: Number(form.duration), intensity: form.intensity, notes: form.notes });
                  setForm({ type: "strength", duration: "", intensity: "medium", notes: "" });
                  setShowForm(false);
                }}
                className={`w-full h-12 rounded-xl font-semibold text-[14px] transition ${
                  form.duration ? "bg-[#C0633F] text-white" : "bg-[#E8E0CF] text-[#B0A890]"
                }`}>
                Guardar entrenamiento
              </button>
            </div>
          )}

          {/* Today's workouts */}
          {todayWorkouts.length > 0 && (
            <div>
              <div className="text-[11px] uppercase tracking-[0.14em] text-[#8B8470] mb-2">Hoy</div>
              <div className="space-y-2">
                {todayWorkouts.map(w => {
                  const wt = WORKOUT_TYPES.find(t => t.v === w.type) || WORKOUT_TYPES[0];
                  return (
                    <div key={w.id} className="rounded-2xl bg-[#FBF7EC] border border-[#E8DEC3] p-4 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-white"
                        style={{ background: wt.color }}>
                        <wt.Icon size={18} strokeWidth={1.8} />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-[14px]">{wt.label}</div>
                        <div className="text-[11.5px] text-[#8B8470]">{w.duration} min · {w.intensity === "low" ? "Baja" : w.intensity === "medium" ? "Media" : "Alta"} intensidad</div>
                        {w.notes && <div className="text-[11px] text-[#8B8470] mt-0.5 italic">{w.notes}</div>}
                      </div>
                      <Check size={16} className="text-[#3E5A4A]" strokeWidth={2} />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {todayWorkouts.length === 0 && !showForm && connectedKeys.length === 0 && (
            <div className="text-center py-6 text-[13px] text-[#8B8470]">
              Sin actividad registrada hoy. Conecta un dispositivo o registra tu entreno.
            </div>
          )}
        </div>
      )}

      {/* ── HISTORIAL ─────────────────────── */}
      {subtab === "historial" && (
        <div className="px-6 space-y-4">
          {workouts.length === 0 ? (
            <div className="text-center py-10 text-[13px] text-[#8B8470]">
              Aún no tienes entrenamientos registrados.
            </div>
          ) : (
            (() => {
              const byDate = {};
              workouts.forEach(w => {
                if (!byDate[w.date]) byDate[w.date] = [];
                byDate[w.date].push(w);
              });
              return Object.entries(byDate)
                .sort(([a], [b]) => b.localeCompare(a))
                .map(([date, ws]) => {
                  const d = new Date(date + "T12:00:00");
                  const dayNames = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"];
                  const monthNames = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
                  const label = date === todayStr ? "Hoy" : `${dayNames[d.getDay()]} ${d.getDate()} ${monthNames[d.getMonth()]}`;
                  return (
                    <div key={date}>
                      <div className="text-[11px] uppercase tracking-[0.14em] text-[#8B8470] mb-2">{label}</div>
                      <div className="space-y-2">
                        {ws.map(w => {
                          const wt = WORKOUT_TYPES.find(t => t.v === w.type) || WORKOUT_TYPES[0];
                          return (
                            <div key={w.id} className="rounded-2xl bg-[#FBF7EC] border border-[#E8DEC3] p-4 flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white flex-shrink-0"
                                style={{ background: wt.color }}>
                                <wt.Icon size={18} strokeWidth={1.8} />
                              </div>
                              <div className="flex-1">
                                <div className="font-medium text-[14px]">{wt.label}</div>
                                <div className="text-[11.5px] text-[#8B8470]">{w.duration} min · {w.intensity === "low" ? "Baja" : w.intensity === "medium" ? "Media" : "Alta"}</div>
                                {w.notes && <div className="text-[11px] text-[#6B6657] italic mt-0.5">{w.notes}</div>}
                              </div>
                              <div className="text-right">
                                <div className="text-[10px] text-[#B0A890]">{w.source === "manual" ? "Manual" : w.source}</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                });
            })()
          )}
        </div>
      )}

      {/* ── DISPOSITIVOS ──────────────────── */}
      {subtab === "dispositivos" && (
        <div className="px-6 space-y-3">
          <p className="text-[12.5px] text-[#6B6657] leading-relaxed">
            Conecta tu dispositivo para sincronizar automáticamente tu actividad, sueño y frecuencia cardíaca.
          </p>

          {WEARABLES.map(dev => {
            const connected = !!wearables[dev.key];
            const metrics = dev.metrics(seed);
            return (
              <div key={dev.key} className="rounded-2xl border border-[#E8DEC3] overflow-hidden">
                <div className="flex items-center gap-3 p-4 bg-[#FBF7EC]">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-[13px] font-bold flex-shrink-0"
                    style={{ background: dev.color }}>
                    {dev.initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-display text-[16px] tracking-tight">{dev.name}</div>
                    <div className="text-[11px] text-[#8B8470]">{dev.sub}</div>
                    <div className="text-[10.5px] text-[#B0A890] mt-0.5">{dev.note}</div>
                  </div>
                  <button onClick={() => toggleWearable(dev.key)}
                    className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-[12px] font-semibold border transition ${
                      connected
                        ? "bg-[#E4EADF] border-[#3E5A4A]/30 text-[#3E5A4A]"
                        : "bg-[#1F2A24] border-[#1F2A24] text-[#F2ECDF]"
                    }`}>
                    {connected ? "✓ Conectado" : "Conectar"}
                  </button>
                </div>

                {connected && (
                  <div className="grid grid-cols-4 divide-x divide-[#E8DEC3] border-t border-[#E8DEC3]">
                    {metrics.map(m => (
                      <div key={m.label} className="p-3 text-center bg-white">
                        <div className="font-display text-[12px] tabular-nums leading-tight text-[#1F2A24]">{m.value}</div>
                        <div className="text-[9px] text-[#8B8470] mt-0.5 leading-tight">{m.label}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          <div className="rounded-xl bg-[#F5ECDB] border border-[#E3D5B3] p-3 flex gap-2 items-start mt-2">
            <Info size={14} className="text-[#8B6F3A] mt-0.5 flex-shrink-0" />
            <p className="text-[11px] text-[#6B5A2E] leading-relaxed">
              Apple Watch requiere la app nativa de iOS. Whoop, Garmin y Fitbit usan OAuth2 — la integración completa estará disponible próximamente.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// LABS
// ============================================================
const LAB_CATEGORIES = [
  { key: "metabolic",    label: "Metabólico" },
  { key: "lipids",       label: "Lípidos" },
  { key: "thyroid",      label: "Tiroides" },
  { key: "hormones",     label: "Hormonas" },
  { key: "inflammation", label: "Inflamación" },
  { key: "nutrients",    label: "Nutrientes" },
  { key: "liver",        label: "Hígado" },
  { key: "kidney",       label: "Riñón" },
  { key: "cbc",          label: "Biometría" },
];

const BIOMARKERS = [
  // METABOLIC
  { key: "glucose", label: "Glucosa en ayunas", unit: "mg/dL", category: "metabolic",
    poor: [0, 99], normal: [70, 99], optimal: [72, 90],
    poorLow: "Hipoglucemia: mareo, fatiga, irritabilidad.", poorHigh: "Prediabetes o diabetes. Riesgo cardiovascular y metabólico.",
    desc: "Nivel de azúcar en sangre en ayunas. Indicador clave de resistencia a la insulina.",
    lowRecs: ["Aumenta ingesta de carbohidratos complejos.", "Consulta a tu médico si hay síntomas."],
    highRecs: ["Reduce azúcar y harinas refinadas.", "Ejercicio de resistencia 3-5x por semana.", "Ayuno intermitente supervisado.", "Añade berberina o cromo bajo supervisión médica."],
    optRecs: ["Mantén dieta mediterránea.", "Monitorea cada 6 meses."] },

  { key: "hba1c", label: "HbA1c", unit: "%", category: "metabolic",
    poor: [0, 5.6], normal: [4.8, 5.6], optimal: [4.8, 5.2],
    poorLow: "Raro; posible anemia hemolítica.", poorHigh: "Prediabetes (5.7–6.4%) o diabetes (≥6.5%).",
    desc: "Hemoglobina glucosilada: promedio de glucosa de los últimos 3 meses.",
    lowRecs: ["Evalúa con médico."],
    highRecs: ["Dieta baja en carbohidratos refinados.", "Caminata post-comida 15 min.", "Reduce estrés crónico.", "Evalúa metformina con tu médico."],
    optRecs: ["Excelente control glucémico. Mantén hábitos actuales."] },

  { key: "insulin_fast", label: "Insulina en ayunas", unit: "µU/mL", category: "metabolic",
    poor: [0, 25], normal: [2, 10], optimal: [2, 6],
    poorLow: "Posible diabetes tipo 1 o pancreática.", poorHigh: "Resistencia a la insulina. Riesgo metabólico alto.",
    desc: "Nivel de insulina en ayunas. Marcador temprano de resistencia insulínica.",
    lowRecs: ["Monitorear si hay síntomas."],
    highRecs: ["Ayuno intermitente 16:8.", "Reduce carbohidratos.", "Entrenamiento de fuerza.", "Reduce consumo de fructosa."],
    optRecs: ["Sensibilidad insulínica óptima."] },

  // LIPIDS
  { key: "total_chol", label: "Colesterol total", unit: "mg/dL", category: "lipids",
    poor: [0, 240], normal: [0, 200], optimal: [150, 200],
    poorLow: "Colesterol muy bajo: riesgo neurológico y hormonal.", poorHigh: "Riesgo cardiovascular elevado.",
    desc: "Suma de todas las fracciones de colesterol.",
    lowRecs: ["Consume huevo, lácteos enteros, aguacate."],
    highRecs: ["Reduce grasas saturadas y trans.", "Omega-3 2-4g/día.", "Fibra soluble (psyllium).", "Ejercicio aeróbico regular."],
    optRecs: ["Perfil lipídico saludable."] },

  { key: "ldl", label: "LDL (colesterol malo)", unit: "mg/dL", category: "lipids",
    poor: [0, 160], normal: [0, 100], optimal: [0, 70],
    poorLow: "", poorHigh: "Riesgo aterosclerosis y evento cardiovascular.",
    desc: "Lipoproteínas de baja densidad. Predictor de riesgo cardiovascular.",
    lowRecs: [],
    highRecs: ["Dieta baja en grasas saturadas.", "Berberina 500mg 2x/día.", "Red yeast rice (bajo supervisión).", "Reduce estrés oxidativo."],
    optRecs: ["LDL óptimo. Mantén dieta antiinflamatoria."] },

  { key: "hdl", label: "HDL (colesterol bueno)", unit: "mg/dL", category: "lipids",
    poor: [0, 40], normal: [40, 999], optimal: [60, 999],
    poorLow: "HDL bajo: mayor riesgo cardiovascular.", poorHigh: "",
    desc: "Lipoproteínas de alta densidad. Protege contra enfermedad cardíaca.",
    lowRecs: ["Ejercicio aeróbico 150 min/semana.", "Niacina (bajo supervisión).", "Omega-3.", "Reduce carbohidratos refinados."],
    highRecs: [],
    optRecs: ["Excelente HDL. Continúa con ejercicio regular."] },

  { key: "triglycerides", label: "Triglicéridos", unit: "mg/dL", category: "lipids",
    poor: [0, 200], normal: [0, 150], optimal: [0, 100],
    poorLow: "", poorHigh: "Riesgo cardiovascular y pancreatitis.",
    desc: "Grasas en sangre. Indicador de ingesta de azúcar y carbohidratos.",
    lowRecs: [],
    highRecs: ["Elimina azúcar y alcohol.", "Omega-3 3-4g/día.", "Ayuno intermitente.", "Reduce frutas altas en fructosa."],
    optRecs: ["Triglicéridos óptimos."] },

  // THYROID
  { key: "tsh", label: "TSH", unit: "mUI/L", category: "thyroid",
    poor: [0, 4.5], normal: [0.5, 4.5], optimal: [0.5, 2.5],
    poorLow: "Hipertiroidismo. Palpitaciones, pérdida de peso, ansiedad.", poorHigh: "Hipotiroidismo. Fatiga, frío, depresión, aumento de peso.",
    desc: "Hormona estimulante de tiroides. Refleja función tiroidea global.",
    lowRecs: ["Reduce ingesta de yodo excesiva.", "Consulta endocrinólogo."],
    highRecs: ["Asegura yodo y selenio en dieta.", "Reduce estrés (cortisol afecta tiroides).", "Evalúa tiroxina con médico.", "Elimina gluten si hay autoinmunidad."],
    optRecs: ["Función tiroidea óptima."] },

  { key: "free_t4", label: "T4 libre", unit: "ng/dL", category: "thyroid",
    poor: [0, 0.8], normal: [0.8, 1.8], optimal: [1.0, 1.6],
    poorLow: "Hipotiroidismo.", poorHigh: "Hipertiroidismo.",
    desc: "Forma activa de tiroxina. Regula metabolismo.",
    lowRecs: ["Selenio 200µg/día.", "Yodo adecuado.", "Consulta endocrinólogo."],
    highRecs: ["Consulta endocrinólogo."],
    optRecs: ["T4 libre en rango óptimo."] },

  { key: "free_t3", label: "T3 libre", unit: "pg/mL", category: "thyroid",
    poor: [0, 2.3], normal: [2.3, 4.2], optimal: [3.0, 4.0],
    poorLow: "Conversión T4→T3 deficiente. Fatiga, frío.", poorHigh: "Hipertiroidismo.",
    desc: "La hormona tiroidea activa más potente.",
    lowRecs: ["Zinc y selenio.", "Reduce estrés.", "Evalúa conversión con médico."],
    highRecs: ["Monitoreo médico."],
    optRecs: ["Conversión tiroidea óptima."] },

  // HORMONES
  { key: "testosterone_t", label: "Testosterona total", unit: "ng/dL", category: "hormones",
    poor: [0, 300], normal: [300, 1000], optimal: [550, 900],
    poorLow: "Hipogonadismo. Fatiga, pérdida muscular, libido baja, depresión.", poorHigh: "Posible exceso o uso externo.",
    desc: "Hormona anabólica principal. Afecta músculo, libido, energía y estado de ánimo.",
    lowRecs: ["Entrenamiento de fuerza.", "Zinc 30mg/día.", "Vitamina D 5000 UI.", "Reduce alcohol y estrés.", "Ashwagandha.", "Sueño 7-9h."],
    highRecs: ["Descarta uso externo. Monitorea con médico."],
    optRecs: ["Testosterona óptima. Mantén entrenamiento y sueño."] },

  { key: "estradiol", label: "Estradiol (E2)", unit: "pg/mL", category: "hormones",
    poor: [0, 10], normal: [10, 40], optimal: [20, 35],
    poorLow: "Deficiencia estrogénica: fatiga ósea, sequedad, cambios de humor.", poorHigh: "Dominancia estrogénica: retención, irritabilidad.",
    desc: "Estrógeno principal. Importante en hombres y mujeres para huesos, cerebro y cardiovascular.",
    lowRecs: ["Grasas saludables.", "Reduce ejercicio extremo.", "Evalúa con ginecólogo/endocrinólogo."],
    highRecs: ["Reduce grasa corporal.", "DIM 200mg.", "Fibra 30g/día.", "Reduce alcohol."],
    optRecs: ["Equilibrio estrogénico adecuado."] },

  { key: "cortisol_am", label: "Cortisol AM", unit: "µg/dL", category: "hormones",
    poor: [0, 7], normal: [7, 25], optimal: [15, 23],
    poorLow: "Posible insuficiencia adrenal. Fatiga extrema, mareo.", poorHigh: "Estrés crónico. Resistencia insulínica, insomnio, pérdida muscular.",
    desc: "Hormona del estrés. Se mide por la mañana. Regula energía, inflamación e inmunidad.",
    lowRecs: ["Rhodiola rosea.", "Sal marina.", "Consulta endocrinólogo."],
    highRecs: ["Meditación y respiración.", "Ashwagandha 600mg.", "Limita cafeína.", "Sueño consistente.", "Reduce entrenamiento intensivo."],
    optRecs: ["Respuesta adrenal óptima."] },

  // INFLAMMATION
  { key: "crp_hs", label: "PCR ultrasensible", unit: "mg/L", category: "inflammation",
    poor: [3, 999], normal: [0, 3], optimal: [0, 1],
    poorLow: "", poorHigh: "Inflamación sistémica. Riesgo cardíaco, metabólico y autoinmune.",
    desc: "Proteína C reactiva. Marcador de inflamación aguda y crónica.",
    lowRecs: [],
    highRecs: ["Dieta mediterránea.", "Omega-3 3g/día.", "Cúrcuma + pimienta negra.", "Reduce azúcar y alcohol.", "Ejercicio moderado.", "Sueño 7-9h."],
    optRecs: ["Inflamación mínima. Excelente estado inflamatorio."] },

  { key: "homocysteine", label: "Homocisteína", unit: "µmol/L", category: "inflammation",
    poor: [15, 999], normal: [5, 15], optimal: [5, 9],
    poorLow: "", poorHigh: "Riesgo cardiovascular, daño arterial y neurodegenerativo.",
    desc: "Aminoácido que daña vasos cuando está elevado. Relacionado con B12 y folato.",
    lowRecs: [],
    highRecs: ["B12 1000µg/día.", "Folato activo (5-MTHF).", "B6 50mg.", "Betaína (TMG)."],
    optRecs: ["Homocisteína óptima."] },

  { key: "uric_acid", label: "Ácido úrico", unit: "mg/dL", category: "inflammation",
    poor: [7, 999], normal: [3.4, 7], optimal: [3.5, 5.5],
    poorLow: "", poorHigh: "Riesgo de gota, daño renal y síndrome metabólico.",
    desc: "Producto del metabolismo de purinas. Elevado por fructosa, alcohol y carnes rojas.",
    lowRecs: [],
    highRecs: ["Reduce fructosa (jugos, refrescos).", "Hidratación 2-3L/día.", "Reduce alcohol.", "Evita carnes rojas en exceso.", "Vitamina C 1000mg."],
    optRecs: ["Ácido úrico controlado."] },

  // NUTRIENTS
  { key: "vitamin_d", label: "Vitamina D (25-OH)", unit: "ng/mL", category: "nutrients",
    poor: [0, 30], normal: [30, 100], optimal: [50, 80],
    poorLow: "Deficiencia: fatiga, depresión, inmunidad baja, huesos frágiles.", poorHigh: "Toxicidad (raro). Posible hipercalcemia.",
    desc: "Prohormona clave para inmunidad, huesos, estado de ánimo y testosterona.",
    lowRecs: ["Vitamina D3 5000-10000 UI/día.", "Exposición solar 20 min/día.", "K2 MK-7 100µg.", "Magnesio 300mg."],
    highRecs: ["Reduce suplementación."],
    optRecs: ["Vitamina D óptima. Mantén suplementación actual."] },

  { key: "b12", label: "Vitamina B12", unit: "pg/mL", category: "nutrients",
    poor: [0, 300], normal: [200, 900], optimal: [500, 800],
    poorLow: "Deficiencia: fatiga, daño neurológico, anemia megaloblástica.", poorHigh: "Posible suplementación excesiva o enfermedad hepática.",
    desc: "Esencial para sistema nervioso, producción de glóbulos rojos y metilación.",
    lowRecs: ["Metilcobalamina 1000µg sublingual.", "Aumenta carnes, huevo, mariscos.", "Evalúa absorción si eres vegano."],
    highRecs: ["Monitorea fuente."],
    optRecs: ["B12 óptima."] },

  { key: "folate", label: "Folato", unit: "ng/mL", category: "nutrients",
    poor: [0, 5], normal: [3, 20], optimal: [10, 20],
    poorLow: "Deficiencia: anemia, defectos del tubo neural, fatiga.", poorHigh: "",
    desc: "Vitamina B9. Crítica para metilación, DNA y embarazo.",
    lowRecs: ["5-MTHF (metilfolato) 400-800µg.", "Verde de hoja, leguminosas.", "Evita folato sintético si tienes MTHFR."],
    highRecs: [],
    optRecs: ["Folato óptimo."] },

  { key: "ferritin", label: "Ferritina", unit: "ng/mL", category: "nutrients",
    poor: [0, 30], normal: [30, 300], optimal: [50, 150],
    poorLow: "Reservas de hierro bajas. Fatiga, caída de cabello, frío.", poorHigh: "Sobrecarga de hierro. Inflamación, daño hepático (>300 es señal de alerta).",
    desc: "Proteína de almacenamiento de hierro. Mejor indicador de reservas corporales.",
    lowRecs: ["Hierro bisglicinato 25-50mg.", "Vitamina C con comidas ricas en hierro.", "Carnes rojas, leguminosas."],
    highRecs: ["Dona sangre.", "Reduce hierro en suplementos.", "Descarta hemocromatosis."],
    optRecs: ["Reservas de hierro óptimas."] },

  { key: "magnesium", label: "Magnesio (RBC)", unit: "mg/dL", category: "nutrients",
    poor: [0, 4.2], normal: [4.2, 6.8], optimal: [5.5, 6.8],
    poorLow: "Deficiencia: calambres, insomnio, ansiedad, estreñimiento.", poorHigh: "",
    desc: "Cofactor de 300+ enzimas. Esencial para sueño, músculos y sistema nervioso.",
    lowRecs: ["Glicinato o malato de magnesio 300-400mg.", "Verduras de hoja verde.", "Baños de sal de Epsom."],
    highRecs: [],
    optRecs: ["Magnesio óptimo."] },

  { key: "zinc", label: "Zinc plasmático", unit: "µg/dL", category: "nutrients",
    poor: [0, 70], normal: [70, 120], optimal: [90, 110],
    poorLow: "Deficiencia: inmunidad baja, pérdida de cabello, baja testosterona.", poorHigh: "Toxicidad: náuseas, interferencia con cobre.",
    desc: "Mineral esencial para inmunidad, testosterona y síntesis de proteínas.",
    lowRecs: ["Zinc bisglicinato 20-30mg.", "Carnes, mariscos, semillas de calabaza.", "Evita exceso de hierro simultáneo."],
    highRecs: ["Reduce suplementación."],
    optRecs: ["Zinc óptimo."] },

  { key: "omega3_index", label: "Índice Omega-3", unit: "%", category: "nutrients",
    poor: [0, 4], normal: [4, 8], optimal: [8, 12],
    poorLow: "Muy bajo: mayor riesgo cardiovascular e inflamatorio.", poorHigh: "",
    desc: "Porcentaje de EPA+DHA en membrana de glóbulos rojos. Predictor cardiovascular.",
    lowRecs: ["Omega-3 EPA+DHA 3-4g/día.", "Salmón, sardinas, mariscos 3x/semana.", "Monitorea cada 4 meses."],
    highRecs: [],
    optRecs: ["Índice omega-3 excelente."] },

  // LIVER
  { key: "alt", label: "ALT (TGP)", unit: "U/L", category: "liver",
    poor: [56, 999], normal: [7, 56], optimal: [7, 30],
    poorLow: "", poorHigh: "Daño hepatocelular: hígado graso, hepatitis, toxicidad.",
    desc: "Enzima hepática. Elevada indica inflamación o daño del hígado.",
    lowRecs: [],
    highRecs: ["Elimina alcohol.", "Reduce azúcar y fructosa.", "NAC 600mg.", "Milk thistle (silimarina).", "Evalúa hígado graso con médico."],
    optRecs: ["Función hepática óptima."] },

  { key: "ast", label: "AST (TGO)", unit: "U/L", category: "liver",
    poor: [40, 999], normal: [10, 40], optimal: [10, 25],
    poorLow: "", poorHigh: "Daño hepático o muscular. Ratio AST/ALT relevante.",
    desc: "Enzima presente en hígado y músculo. Indicador de daño tisular.",
    lowRecs: [],
    highRecs: ["Evalúa hígado y descartar daño muscular.", "Reduce alcohol.", "NAC y silimarina."],
    optRecs: ["AST óptimo."] },

  { key: "ggt", label: "GGT", unit: "U/L", category: "liver",
    poor: [51, 999], normal: [0, 51], optimal: [0, 25],
    poorLow: "", poorHigh: "Indicador sensible de daño hepático por alcohol, fármacos u oxidación.",
    desc: "Gamma-glutamil transferasa. Biomarcador de estrés oxidativo hepático.",
    lowRecs: [],
    highRecs: ["Elimina alcohol.", "Reduce medicamentos hepatotóxicos.", "Vitamina C y E.", "NAC.", "Silimarina."],
    optRecs: ["GGT óptima. Buena salud hepática."] },

  // KIDNEY
  { key: "creatinine", label: "Creatinina sérica", unit: "mg/dL", category: "kidney",
    poor: [1.3, 999], normal: [0.6, 1.3], optimal: [0.7, 1.1],
    poorLow: "Posible baja masa muscular.", poorHigh: "Posible disfunción renal.",
    desc: "Producto del metabolismo muscular. Indica función renal.",
    lowRecs: ["Evalúa masa muscular."],
    highRecs: ["Hidratación adecuada.", "Reduce proteína excesiva.", "Monitorea TFG con médico."],
    optRecs: ["Función renal óptima."] },

  { key: "egfr", label: "TFG estimada", unit: "mL/min/1.73m²", category: "kidney",
    poor: [0, 60], normal: [60, 999], optimal: [90, 999],
    poorLow: "", poorHigh: "",
    desc: "Tasa de filtración glomerular estimada. Indicador de función renal.",
    lowRecs: ["Monitoreo nefrológico urgente si <30.", "Reduce nefrotóxicos.", "Control de presión."],
    highRecs: [],
    optRecs: ["Función renal excelente."] },

  { key: "bun", label: "BUN (urea)", unit: "mg/dL", category: "kidney",
    poor: [21, 999], normal: [7, 21], optimal: [10, 18],
    poorLow: "", poorHigh: "Posible disfunción renal o dieta muy alta en proteína.",
    desc: "Nitrógeno ureico en sangre. Refleja función renal y metabolismo proteico.",
    lowRecs: [],
    highRecs: ["Hidratación.", "Modera proteína.", "Descarta disfunción renal."],
    optRecs: ["BUN óptimo."] },

  // CBC
  { key: "hemoglobin", label: "Hemoglobina", unit: "g/dL", category: "cbc",
    poor: [0, 12], normal: [12, 17.5], optimal: [13.5, 17],
    poorLow: "Anemia: fatiga, mareo, disnea.", poorHigh: "Policitemia: riesgo trombótico.",
    desc: "Proteína transportadora de oxígeno en glóbulos rojos.",
    lowRecs: ["Hierro bisglicinato.", "B12 y folato.", "Vitamina C.", "Evalúa tipo de anemia."],
    highRecs: ["Hidratación.", "Descarta policitemia vera."],
    optRecs: ["Hemoglobina óptima."] },

  { key: "hematocrit", label: "Hematocrito", unit: "%", category: "cbc",
    poor: [0, 36], normal: [36, 50], optimal: [40, 48],
    poorLow: "Anemia.", poorHigh: "Deshidratación o policitemia.",
    desc: "Porcentaje de glóbulos rojos en sangre total.",
    lowRecs: ["Evalúa anemia.", "Hierro, B12, folato."],
    highRecs: ["Hidratación.", "Monitoreo."],
    optRecs: ["Hematocrito óptimo."] },

  { key: "wbc", label: "Leucocitos totales", unit: "x10³/µL", category: "cbc",
    poor: [0, 4], normal: [4, 11], optimal: [5, 8],
    poorLow: "Leucopenia: inmunidad comprometida.", poorHigh: "Posible infección, inflamación o respuesta inmune.",
    desc: "Glóbulos blancos. Indicador de actividad inmune.",
    lowRecs: ["Evalúa infección o inmunosupresión.", "Zinc, vitamina C, D."],
    highRecs: ["Descarta infección activa.", "Reduce inflamación sistémica."],
    optRecs: ["Sistema inmune equilibrado."] },

  { key: "platelets", label: "Plaquetas", unit: "x10³/µL", category: "cbc",
    poor: [0, 150], normal: [150, 400], optimal: [200, 350],
    poorLow: "Trombocitopenia: riesgo de sangrado.", poorHigh: "Trombocitosis: riesgo trombótico.",
    desc: "Células responsables de la coagulación.",
    lowRecs: ["Evalúa con médico urgente si <100.", "Vitamina K2.", "Papaya."],
    highRecs: ["Evalúa causa.", "Hidratación."],
    optRecs: ["Plaquetas en rango óptimo."] },
];

function classifyValue(bm, value) {
  const v = parseFloat(value);
  if (isNaN(v)) return "unknown";
  const [optLow, optHigh] = bm.optimal;
  const [normLow, normHigh] = bm.normal;
  if (v >= optLow && v <= optHigh) return "optimal";
  if (v >= normLow && v <= normHigh) return "normal";
  return "poor";
}

function getStatus(bm, value) {
  const v = parseFloat(value);
  if (isNaN(v)) return null;
  const cls = classifyValue(bm, v);
  const [normLow] = bm.normal;
  const isLow = v < normLow;
  return { cls, isLow };
}

function getRecommendations(bm, value) {
  const s = getStatus(bm, value);
  if (!s) return [];
  if (s.cls === "optimal") return bm.optRecs;
  if (s.isLow) return bm.lowRecs;
  return bm.highRecs;
}

function RangeBar({ bm, value }) {
  const v = parseFloat(value);
  const cls = isNaN(v) ? "unknown" : classifyValue(bm, v);
  const [normLow, normHigh] = bm.normal;
  const [optLow, optHigh] = bm.optimal;

  const rangeMin = Math.min(normLow * 0.6, optLow * 0.6, v || normLow * 0.6);
  const rangeMax = Math.max(normHigh * 1.4, optHigh * 1.4, v || normHigh * 1.4);
  const span = rangeMax - rangeMin || 1;

  const toPos = (x) => Math.max(0, Math.min(100, ((x - rangeMin) / span) * 100));

  const poorColor = "#E57373";
  const normalColor = "#FFB74D";
  const optimalColor = "#66BB6A";

  const clsColors = { poor: poorColor, normal: normalColor, optimal: optimalColor, unknown: "#ccc" };
  const clsLabels = { poor: "Fuera de rango", normal: "Normal", optimal: "Óptimo", unknown: "—" };

  return (
    <div className="mt-3">
      <div className="relative h-3 rounded-full bg-[#E8DEC3] overflow-hidden">
        {/* normal zone */}
        <div className="absolute top-0 h-full rounded-sm" style={{
          left: `${toPos(normLow)}%`, width: `${toPos(normHigh) - toPos(normLow)}%`, background: normalColor, opacity: 0.35
        }} />
        {/* optimal zone */}
        <div className="absolute top-0 h-full rounded-sm" style={{
          left: `${toPos(optLow)}%`, width: `${toPos(optHigh) - toPos(optLow)}%`, background: optimalColor, opacity: 0.55
        }} />
        {/* user value dot */}
        {!isNaN(v) && (
          <div className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-white shadow"
            style={{ left: `calc(${toPos(v)}% - 8px)`, background: clsColors[cls] }} />
        )}
      </div>
      <div className="flex justify-between mt-1.5 text-[10px] text-[#8B8470]">
        <span>{normLow} {bm.unit}</span>
        <span className="font-medium" style={{ color: clsColors[cls] }}>{clsLabels[cls]}</span>
        <span>{normHigh} {bm.unit}</span>
      </div>
    </div>
  );
}

// Regex patterns per biomarker key — tries Spanish and English lab formats
const BIOMARKER_PATTERNS = {
  glucose:        [/glucosa?\s*(?:en\s*ayunas?)?\s*[:\-]?\s*([\d.,]+)/i, /blood\s*glucose\s*[:\-]?\s*([\d.,]+)/i, /glucose\s*[:\-]?\s*([\d.,]+)/i],
  hba1c:          [/hba?1c\s*[:\-]?\s*([\d.,]+)/i, /hemoglobina\s*glucosilada\s*[:\-]?\s*([\d.,]+)/i, /a1c\s*[:\-]?\s*([\d.,]+)/i],
  insulin_fast:   [/insulina?\s*(?:basal|en\s*ayunas?)?\s*[:\-]?\s*([\d.,]+)/i, /insulin\s*[:\-]?\s*([\d.,]+)/i],
  total_chol:     [/colesterol\s*total\s*[:\-]?\s*([\d.,]+)/i, /total\s*cholesterol\s*[:\-]?\s*([\d.,]+)/i],
  ldl:            [/ldl[\s\-]*c(?:olesterol)?\s*[:\-]?\s*([\d.,]+)/i, /ldl\s*[:\-]?\s*([\d.,]+)/i, /c-ldl\s*[:\-]?\s*([\d.,]+)/i],
  hdl:            [/hdl[\s\-]*c(?:olesterol)?\s*[:\-]?\s*([\d.,]+)/i, /hdl\s*[:\-]?\s*([\d.,]+)/i, /c-hdl\s*[:\-]?\s*([\d.,]+)/i],
  triglycerides:  [/triglic[eé]ridos?\s*[:\-]?\s*([\d.,]+)/i, /trigliceridos\s*[:\-]?\s*([\d.,]+)/i, /triglycerides?\s*[:\-]?\s*([\d.,]+)/i],
  tsh:            [/tsh\s*[:\-]?\s*([\d.,]+)/i, /hormona\s*estimulante\s*[:\-]?\s*([\d.,]+)/i],
  free_t4:        [/t[4]\s*libre\s*[:\-]?\s*([\d.,]+)/i, /free\s*t4\s*[:\-]?\s*([\d.,]+)/i, /tiroxina\s*libre\s*[:\-]?\s*([\d.,]+)/i],
  free_t3:        [/t[3]\s*libre\s*[:\-]?\s*([\d.,]+)/i, /free\s*t3\s*[:\-]?\s*([\d.,]+)/i, /triyodotironina\s*libre\s*[:\-]?\s*([\d.,]+)/i],
  testosterone_t: [/testosterona\s*total\s*[:\-]?\s*([\d.,]+)/i, /total\s*testosterone\s*[:\-]?\s*([\d.,]+)/i, /testosterona\s*[:\-]?\s*([\d.,]+)/i],
  estradiol:      [/estradiol\s*[:\-]?\s*([\d.,]+)/i, /e2\s*[:\-]?\s*([\d.,]+)/i],
  cortisol_am:    [/cortisol\s*(?:am|ma[ñn]ana|matutino)?\s*[:\-]?\s*([\d.,]+)/i, /cortisol\s*[:\-]?\s*([\d.,]+)/i],
  crp_hs:         [/pcr\s*(?:ultrasensible|us|hs)?\s*[:\-]?\s*([\d.,]+)/i, /crp\s*(?:hs|ultra)?\s*[:\-]?\s*([\d.,]+)/i, /prote[íi]na\s*c\s*reactiva\s*[:\-]?\s*([\d.,]+)/i],
  homocysteine:   [/homociste[íi]na\s*[:\-]?\s*([\d.,]+)/i, /homocysteine\s*[:\-]?\s*([\d.,]+)/i],
  uric_acid:      [/[áa]cido\s*[úu]rico\s*[:\-]?\s*([\d.,]+)/i, /uric\s*acid\s*[:\-]?\s*([\d.,]+)/i],
  vitamin_d:      [/vitamina\s*d\s*(?:25[\s\-]*oh|total)?\s*[:\-]?\s*([\d.,]+)/i, /25[\s\-]*oh[\s\-]*d\s*[:\-]?\s*([\d.,]+)/i, /vitamin\s*d\s*[:\-]?\s*([\d.,]+)/i],
  b12:            [/vitamina\s*b[\s\-]*12\s*[:\-]?\s*([\d.,]+)/i, /cobalamina\s*[:\-]?\s*([\d.,]+)/i, /vitamin\s*b12\s*[:\-]?\s*([\d.,]+)/i],
  folate:         [/folato\s*[:\-]?\s*([\d.,]+)/i, /[áa]cido\s*f[óo]lico\s*[:\-]?\s*([\d.,]+)/i, /folate\s*[:\-]?\s*([\d.,]+)/i],
  ferritin:       [/ferritina\s*[:\-]?\s*([\d.,]+)/i, /ferritin\s*[:\-]?\s*([\d.,]+)/i],
  magnesium:      [/magnesio\s*[:\-]?\s*([\d.,]+)/i, /magnesium\s*[:\-]?\s*([\d.,]+)/i],
  zinc:           [/zinc\s*(?:plasm[áa]tico|s[eé]rico)?\s*[:\-]?\s*([\d.,]+)/i, /zinc\s*[:\-]?\s*([\d.,]+)/i],
  omega3_index:   [/omega[\s\-]*3\s*(?:[íi]ndice|index)?\s*[:\-]?\s*([\d.,]+)/i],
  alt:            [/alt\s*[:\-]?\s*([\d.,]+)/i, /tgp\s*[:\-]?\s*([\d.,]+)/i, /alanina\s*aminotransferasa\s*[:\-]?\s*([\d.,]+)/i],
  ast:            [/ast\s*[:\-]?\s*([\d.,]+)/i, /tgo\s*[:\-]?\s*([\d.,]+)/i, /aspartato\s*aminotransferasa\s*[:\-]?\s*([\d.,]+)/i],
  ggt:            [/ggt\s*[:\-]?\s*([\d.,]+)/i, /gamma[\s\-]*glutamil\s*[:\-]?\s*([\d.,]+)/i],
  creatinine:     [/creatinina\s*(?:s[eé]rica)?\s*[:\-]?\s*([\d.,]+)/i, /creatinine\s*[:\-]?\s*([\d.,]+)/i],
  egfr:           [/tfg\s*(?:estimada)?\s*[:\-]?\s*([\d.,]+)/i, /egfr\s*[:\-]?\s*([\d.,]+)/i, /filtraci[oó]n\s*glomerular\s*[:\-]?\s*([\d.,]+)/i],
  bun:            [/bun\s*[:\-]?\s*([\d.,]+)/i, /nitr[oó]geno\s*ureico\s*[:\-]?\s*([\d.,]+)/i, /urea\s*[:\-]?\s*([\d.,]+)/i],
  hemoglobin:     [/hemoglobina\s*[:\-]?\s*([\d.,]+)/i, /hemoglobin\s*[:\-]?\s*([\d.,]+)/i, /\bhgb\b\s*[:\-]?\s*([\d.,]+)/i],
  hematocrit:     [/hematocrito\s*[:\-]?\s*([\d.,]+)/i, /hematocrit\s*[:\-]?\s*([\d.,]+)/i, /\bhct\b\s*[:\-]?\s*([\d.,]+)/i],
  wbc:            [/leucocitos\s*(?:totales)?\s*[:\-]?\s*([\d.,]+)/i, /\bwbc\b\s*[:\-]?\s*([\d.,]+)/i, /glóbulos\s*blancos\s*[:\-]?\s*([\d.,]+)/i],
  platelets:      [/plaquetas\s*[:\-]?\s*([\d.,]+)/i, /platelets?\s*[:\-]?\s*([\d.,]+)/i, /\bplt\b\s*[:\-]?\s*([\d.,]+)/i],
};

function extractBiomarkersFromText(text) {
  const found = {};
  for (const [key, patterns] of Object.entries(BIOMARKER_PATTERNS)) {
    for (const regex of patterns) {
      const m = text.match(regex);
      if (m) {
        const val = parseFloat(m[1].replace(",", "."));
        if (!isNaN(val)) { found[key] = String(val); break; }
      }
    }
  }
  return found;
}

async function parsePDFFile(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    fullText += content.items.map(item => item.str).join(" ") + "\n";
  }
  return fullText;
}

function LabsScreen({ onBack }) {
  const [isPro, setIsPro] = useState(() => {
    try { return JSON.parse(localStorage.getItem("wv_labs_pro") || "false"); } catch { return false; }
  });
  const [labValues, setLabValues] = useState(() => {
    try { return JSON.parse(localStorage.getItem("wv_lab_values") || "{}"); } catch { return {}; }
  });
  const [activeCategory, setActiveCategory] = useState("metabolic");
  const [selectedBm, setSelectedBm] = useState(null);
  const [editVal, setEditVal] = useState("");
  const [showPaywall, setShowPaywall] = useState(false);
  const [parseState, setParseState] = useState("idle"); // idle | loading | review | error
  const [parsedValues, setParsedValues] = useState({});
  const [parseError, setParseError] = useState("");
  const fileInputRef = useRef(null);

  const updateValue = (key, val) => {
    const next = { ...labValues, [key]: val };
    setLabValues(next);
    localStorage.setItem("wv_lab_values", JSON.stringify(next));
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    const isPDF = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    if (!isPDF) {
      setParseError("Por ahora solo se admiten archivos PDF. Sube el PDF de tu laboratorio.");
      setParseState("error");
      return;
    }

    setParseState("loading");
    try {
      const text = await parsePDFFile(file);
      const found = extractBiomarkersFromText(text);
      if (Object.keys(found).length === 0) {
        setParseError("No se detectaron valores en el PDF. Asegúrate de que el archivo tenga texto seleccionable (no sea imagen escaneada).");
        setParseState("error");
      } else {
        setParsedValues(found);
        setParseState("review");
      }
    } catch {
      setParseError("Error al leer el PDF. Verifica que el archivo no esté protegido con contraseña.");
      setParseState("error");
    }
  };

  const confirmParsed = () => {
    const merged = { ...labValues, ...parsedValues };
    setLabValues(merged);
    localStorage.setItem("wv_lab_values", JSON.stringify(merged));
    setParseState("idle");
    setParsedValues({});
  };

  const activeBiomarkers = BIOMARKERS.filter(b => b.category === activeCategory);

  const enteredCount = BIOMARKERS.filter(b => labValues[b.key] !== undefined && labValues[b.key] !== "").length;
  const optimalCount = BIOMARKERS.filter(b => {
    const v = labValues[b.key];
    return v !== undefined && v !== "" && classifyValue(b, v) === "optimal";
  }).length;
  const score = enteredCount > 0 ? Math.round((optimalCount / enteredCount) * 100) : null;

  const priorityList = BIOMARKERS.filter(b => {
    const v = labValues[b.key];
    return v !== undefined && v !== "" && classifyValue(b, v) === "poor";
  }).slice(0, 5);

  return (
    <div className="min-h-screen bg-[#FAF7F2] pb-10">
      {/* Header */}
      <div className="px-6 pt-10 pb-4 bg-gradient-to-b from-[#1F2A24] to-[#2A3D31] text-[#F2ECDF]">
        <button onClick={onBack} className="flex items-center gap-1.5 text-[#D7C9A7]/80 text-[13px] mb-4">
          <ChevronLeft size={16} /> Volver
        </button>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#C0633F]/20 flex items-center justify-center">
            <Activity size={20} className="text-[#C0633F]" />
          </div>
          <div>
            <h1 className="font-display text-[26px] tracking-tight leading-tight">Mis Laboratorios</h1>
            <p className="text-[12px] text-[#D7C9A7]/70 mt-0.5">Ingresa tus resultados para análisis personalizado</p>
          </div>
        </div>

        {/* Upload button */}
        <input ref={fileInputRef} type="file" accept="application/pdf,.pdf" className="hidden" onChange={handleFileUpload} />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={parseState === "loading"}
          className="mt-4 w-full h-11 rounded-2xl bg-white/10 border border-white/20 text-[#D7C9A7] text-[13px] font-medium flex items-center justify-center gap-2 transition active:opacity-70"
        >
          {parseState === "loading" ? (
            <>
              <div className="w-4 h-4 border-2 border-[#D7C9A7]/40 border-t-[#D7C9A7] rounded-full animate-spin" />
              Leyendo PDF...
            </>
          ) : (
            <>
              <Upload size={15} strokeWidth={1.8} />
              Subir PDF de laboratorio
            </>
          )}
        </button>

        {/* Score card */}
        {score !== null && (
          <div className="mt-4 rounded-2xl bg-white/10 border border-white/15 p-4 flex items-center gap-4">
            <div className="w-14 h-14 rounded-full flex items-center justify-center text-[22px] font-display font-bold"
              style={{ background: score >= 70 ? "#66BB6A30" : score >= 40 ? "#FFB74D30" : "#E5737330",
                       color: score >= 70 ? "#66BB6A" : score >= 40 ? "#FFB74D" : "#E57373" }}>
              {score}
            </div>
            <div>
              <div className="text-[13px] font-semibold text-[#F2ECDF]">Score de optimización</div>
              <div className="text-[11px] text-[#D7C9A7]/70 mt-0.5">{optimalCount} de {enteredCount} marcadores en rango óptimo</div>
            </div>
          </div>
        )}
      </div>

      {/* Priority alerts */}
      {priorityList.length > 0 && isPro && (
        <div className="mx-4 mt-4 rounded-2xl bg-[#FFF3E0] border border-[#FFB74D]/40 p-4">
          <div className="text-[12px] font-semibold text-[#E65100] mb-2 flex items-center gap-1.5">
            <Flame size={13} /> Prioridades a optimizar
          </div>
          {priorityList.map(b => (
            <div key={b.key} className="text-[12px] text-[#5D4037] py-1 border-b border-[#FFB74D]/20 last:border-0 flex justify-between">
              <span>{b.label}</span>
              <span className="font-medium text-[#E65100]">{labValues[b.key]} {b.unit}</span>
            </div>
          ))}
        </div>
      )}

      {/* Category tabs */}
      <div className="px-4 mt-4 overflow-x-auto scroll-hide">
        <div className="flex gap-2 pb-1 min-w-max">
          {LAB_CATEGORIES.map(cat => (
            <button key={cat.key} onClick={() => setActiveCategory(cat.key)}
              className={`whitespace-nowrap px-3 py-1.5 rounded-full text-[11.5px] font-medium border transition ${
                activeCategory === cat.key
                  ? "bg-[#1F2A24] text-[#F2ECDF] border-[#1F2A24]"
                  : "bg-[#FBF7EC] text-[#3F3A2E] border-[#E8DEC3]"
              }`}>
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Biomarker list */}
      <div className="px-4 mt-3 space-y-3">
        {activeBiomarkers.map(bm => {
          const val = labValues[bm.key] || "";
          const cls = val ? classifyValue(bm, val) : "unknown";
          const clsColor = { optimal: "#66BB6A", normal: "#FFB74D", poor: "#E57373", unknown: "#C5BAA8" }[cls];
          const clsLabel = { optimal: "Óptimo", normal: "Normal", poor: "Fuera de rango", unknown: "Sin dato" }[cls];

          return (
            <div key={bm.key} className="rounded-2xl bg-white border border-[#E8DEC3] overflow-hidden">
              <button className="w-full p-4 text-left" onClick={() => {
                if (!isPro && cls !== "unknown") { setShowPaywall(true); return; }
                setSelectedBm(selectedBm?.key === bm.key ? null : bm);
                setEditVal(val);
              }}>
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="text-[14px] font-semibold text-[#1F2A24] truncate">{bm.label}</div>
                    <div className="text-[11px] text-[#8B8470] mt-0.5">{bm.unit}</div>
                  </div>
                  <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                    {val && (
                      <span className="text-[13px] font-bold tabular-nums" style={{ color: clsColor }}>{val}</span>
                    )}
                    <div className="px-2 py-0.5 rounded-full text-[10px] font-medium border"
                      style={{ color: clsColor, borderColor: clsColor + "40", background: clsColor + "15" }}>
                      {clsLabel}
                    </div>
                    {!isPro && val && <Lock size={13} className="text-[#8B8470]" />}
                  </div>
                </div>
                {val && <RangeBar bm={bm} value={val} />}
              </button>

              {selectedBm?.key === bm.key && (
                <div className="px-4 pb-4 border-t border-[#E8DEC3] bg-[#FAF7F2]">
                  <p className="text-[12px] text-[#6B6657] mt-3 leading-relaxed">{bm.desc}</p>

                  {/* Input */}
                  <div className="flex gap-2 mt-3">
                    <input
                      type="number"
                      value={editVal}
                      onChange={e => setEditVal(e.target.value)}
                      placeholder={`Valor en ${bm.unit}`}
                      className="flex-1 h-10 px-3 rounded-xl border border-[#E8DEC3] bg-white text-[13px] focus:outline-none focus:border-[#3E5A4A]"
                    />
                    <button
                      onClick={() => { updateValue(bm.key, editVal); setSelectedBm(null); }}
                      className="h-10 px-4 rounded-xl bg-[#3E5A4A] text-white text-[12px] font-semibold"
                    >
                      Guardar
                    </button>
                  </div>

                  {/* Recommendations — Pro only */}
                  {val && (
                    isPro ? (
                      <div className="mt-4">
                        <div className="text-[11px] font-semibold tracking-[0.12em] uppercase text-[#8B8470] mb-2">
                          Recomendaciones
                        </div>
                        {getRecommendations(bm, val).length > 0 ? (
                          <ul className="space-y-1.5">
                            {getRecommendations(bm, val).map((r, i) => (
                              <li key={i} className="flex items-start gap-2 text-[12.5px] text-[#3F3A2E]">
                                <CheckCircle2 size={13} className="text-[#3E5A4A] mt-0.5 flex-shrink-0" />
                                {r}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-[12px] text-[#8B8470]">Sin recomendaciones adicionales.</p>
                        )}

                        {/* Poor range explanation */}
                        {cls === "poor" && (
                          <div className="mt-3 p-3 rounded-xl bg-[#FFF3E0] border border-[#FFB74D]/30 text-[11.5px] text-[#5D4037]">
                            {getStatus(bm, val)?.isLow ? bm.poorLow : bm.poorHigh}
                          </div>
                        )}
                      </div>
                    ) : (
                      <button onClick={() => setShowPaywall(true)}
                        className="mt-3 w-full py-2.5 rounded-xl bg-[#1F2A24] text-[#D7C9A7] text-[12.5px] font-semibold flex items-center justify-center gap-2">
                        <Lock size={13} /> Desbloquear recomendaciones — Pro
                      </button>
                    )
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Paywall modal */}
      {/* Parse review modal */}
      {parseState === "review" && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center p-4" onClick={() => setParseState("idle")}>
          <div className="w-full max-w-sm rounded-3xl bg-[#FAF7F2] p-6 max-h-[75vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-[20px] tracking-tight">Resultados detectados</h2>
              <span className="text-[12px] text-[#3E5A4A] font-semibold bg-[#E4EADF] px-2 py-0.5 rounded-full">
                {Object.keys(parsedValues).length} marcadores
              </span>
            </div>
            <p className="text-[12px] text-[#6B6657] mb-4 leading-relaxed">
              Revisa los valores extraídos del PDF. Puedes editarlos después.
            </p>
            <div className="space-y-2 mb-5">
              {Object.entries(parsedValues).map(([key, val]) => {
                const bm = BIOMARKERS.find(b => b.key === key);
                if (!bm) return null;
                const cls = classifyValue(bm, val);
                const clsColor = { optimal: "#66BB6A", normal: "#FFB74D", poor: "#E57373" }[cls];
                const clsLabel = { optimal: "Óptimo", normal: "Normal", poor: "Fuera de rango" }[cls];
                return (
                  <div key={key} className="flex items-center justify-between py-2 border-b border-[#E8DEC3] last:border-0">
                    <div>
                      <div className="text-[13px] font-medium text-[#1F2A24]">{bm.label}</div>
                      <div className="text-[11px] text-[#8B8470]">{bm.unit}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[14px] font-bold tabular-nums" style={{ color: clsColor }}>{val}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium border"
                        style={{ color: clsColor, borderColor: clsColor + "50", background: clsColor + "15" }}>
                        {clsLabel}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
            <button onClick={confirmParsed}
              className="w-full h-12 rounded-2xl bg-[#1F2A24] text-[#D7C9A7] font-semibold text-[14px]">
              Guardar resultados
            </button>
            <button onClick={() => setParseState("idle")}
              className="mt-2 w-full h-10 text-[12.5px] text-[#8B8470]">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Parse error modal */}
      {parseState === "error" && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center p-4" onClick={() => setParseState("idle")}>
          <div className="w-full max-w-sm rounded-3xl bg-[#FAF7F2] p-6" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-2xl bg-[#FFEBEE] flex items-center justify-center mx-auto mb-3">
              <Info size={22} className="text-[#E57373]" />
            </div>
            <h2 className="font-display text-[19px] tracking-tight text-center mb-2">No se pudo leer el archivo</h2>
            <p className="text-[12.5px] text-[#6B6657] text-center leading-relaxed">{parseError}</p>
            <button onClick={() => setParseState("idle")}
              className="mt-5 w-full h-11 rounded-2xl bg-[#1F2A24] text-[#D7C9A7] font-semibold text-[13px]">
              Entendido
            </button>
          </div>
        </div>
      )}

      {showPaywall && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center p-4" onClick={() => setShowPaywall(false)}>
          <div className="w-full max-w-sm rounded-3xl bg-[#FAF7F2] p-6" onClick={e => e.stopPropagation()}>
            <div className="text-center">
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-[#C0633F] to-[#8B4A2F] mx-auto flex items-center justify-center">
                <Lock size={28} className="text-white" />
              </div>
              <h2 className="font-display text-[24px] tracking-tight mt-4">Wellvara Pro</h2>
              <p className="text-[13px] text-[#6B6657] mt-2 leading-relaxed">
                Desbloquea recomendaciones personalizadas, score de optimización, prioridades de salud y análisis completo de biomarcadores.
              </p>
            </div>
            <div className="mt-5 space-y-2.5">
              {["Análisis de 40+ biomarcadores", "Recomendaciones de suplementos y estilo de vida", "Score de optimización personalizado", "Prioridades semanales de salud"].map(f => (
                <div key={f} className="flex items-center gap-2.5 text-[13px] text-[#3F3A2E]">
                  <CheckCircle2 size={15} className="text-[#3E5A4A] flex-shrink-0" />
                  {f}
                </div>
              ))}
            </div>
            <button
              onClick={() => {
                setIsPro(true);
                localStorage.setItem("wv_labs_pro", "true");
                setShowPaywall(false);
              }}
              className="mt-6 w-full h-12 rounded-2xl bg-gradient-to-r from-[#1F2A24] to-[#3E5A4A] text-[#D7C9A7] font-semibold text-[14px]"
            >
              Activar Pro — $299 MXN/mes
            </button>
            <button onClick={() => setShowPaywall(false)}
              className="mt-2 w-full h-10 text-[12.5px] text-[#8B8470]">
              Continuar gratis
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// COMMUNITY
// ============================================================
const COMMUNITY_CATEGORIES = [
  { v: "all",         label: "Todos" },
  { v: "workouts",    label: "Entreno" },
  { v: "nutrition",   label: "Nutrición" },
  { v: "consistency", label: "Constancia" },
  { v: "supplements", label: "Suplementos" },
  { v: "wellness",    label: "Bienestar" },
];

const SEED_COMMUNITIES = [
  { id: 1, name: "Wellvara México", description: "La comunidad oficial de Wellvara en México. Comparte tu progreso, rutinas y hábitos.", type: "public", category: "wellness", memberCount: 0, emoji: "", coverColor: "#3E5A4A", joined: false, posts: [], createdAt: "2026-04-20" },
];

function timeAgo(iso) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "ahora";
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function CommunityDetail({ community, workouts, doseLogs, userName, onBack, onPost, onLike, onJoin, onLeave }) {
  const [subtab, setSubtab] = useState("feed");
  const [postText, setPostText] = useState("");

  const now = new Date();
  const thisMonthWorkouts = workouts.filter(w => {
    const d = new Date(w.date + "T12:00:00");
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  let streak = 0;
  for (let i = 0; i < 60; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const ds = d.toISOString().slice(0, 10);
    const hasActivity = workouts.some(w => w.date === ds) || doseLogs.some(l => l.date === ds);
    if (hasActivity) streak++;
    else break;
  }

  const days30 = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    return d.toISOString().slice(0, 10);
  });
  const adherencePct = Math.min(100, Math.round((doseLogs.filter(l => days30.includes(l.date)).length / 30) * 100));

  const displayName = userName || "Tú";
  const initial = displayName[0]?.toUpperCase() || "?";

  return (
    <div className="min-h-screen pb-28">
      {/* Cover */}
      <div className="relative h-44" style={{ background: `linear-gradient(135deg, ${community.coverColor}F0, ${community.coverColor}70)` }}>
        <button onClick={onBack}
          className="absolute top-12 left-4 w-10 h-10 rounded-full bg-black/20 backdrop-blur-sm flex items-center justify-center text-white">
          <ChevronLeft size={20} strokeWidth={1.8} />
        </button>
        <div className="absolute bottom-0 left-0 right-0 px-5 pb-4 flex items-end justify-between">
          <div>
            <h1 className="font-display text-[22px] tracking-tight text-white leading-tight drop-shadow">{community.name}</h1>
            <div className="flex items-center gap-2 mt-1 text-[11px] text-white/75">
              <Users size={11} /> {community.memberCount.toLocaleString()} miembros
              <span>·</span>
              {community.type === "public" ? "Pública" : "Privada"}
            </div>
          </div>
          {!community.joined ? (
            <button onClick={onJoin} className="px-4 py-2 rounded-full bg-white text-[#1F2A24] text-[12px] font-semibold shadow">
              Unirse
            </button>
          ) : (
            <button onClick={onLeave} className="px-4 py-2 rounded-full bg-white/20 border border-white/40 backdrop-blur-sm text-white text-[12px] font-medium">
              Miembro
            </button>
          )}
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex border-b border-[#E8DEC3] bg-[#FDFBF5] sticky top-0 z-10">
        {[{ v: "feed", label: "Feed", Icon: MessageCircle }, { v: "ranking", label: "Ranking", Icon: Trophy }, { v: "members", label: "Miembros", Icon: Users }].map(t => (
          <button key={t.v} onClick={() => setSubtab(t.v)}
            className={`flex-1 py-3 flex items-center justify-center gap-1.5 text-[12px] font-medium border-b-2 transition ${
              subtab === t.v ? "border-[#C0633F] text-[#C0633F]" : "border-transparent text-[#8B8470]"
            }`}>
            <t.Icon size={14} strokeWidth={subtab === t.v ? 2 : 1.5} />{t.label}
          </button>
        ))}
      </div>

      {/* ── FEED ── */}
      {subtab === "feed" && (
        <div className="px-5 pt-4 space-y-4">
          {community.joined && (
            <div className="flex gap-3 items-center">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#3E5A4A] to-[#1F2A24] text-[#D7C9A7] flex items-center justify-center font-display text-[13px] font-semibold flex-shrink-0">
                {initial}
              </div>
              <div className="flex-1 flex gap-2">
                <input value={postText} onChange={e => setPostText(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && postText.trim()) { onPost(postText.trim()); setPostText(""); } }}
                  className="flex-1 h-10 rounded-full border border-[#E8DEC3] bg-[#FBF7EC] px-4 text-[13px] outline-none focus:border-[#3E5A4A]"
                  placeholder="Comparte tu progreso..." />
                <button disabled={!postText.trim()}
                  onClick={() => { if (postText.trim()) { onPost(postText.trim()); setPostText(""); } }}
                  className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition ${postText.trim() ? "bg-[#C0633F] text-white" : "bg-[#E8E0CF] text-[#B0A890]"}`}>
                  <Send size={15} strokeWidth={2} />
                </button>
              </div>
            </div>
          )}

          {(community.posts || []).length === 0 ? (
            <div className="text-center py-10">
              <MessageCircle size={28} className="text-[#B0A890] mx-auto mb-3" strokeWidth={1.4} />
              <div className="font-display text-[16px] tracking-tight text-[#3F3A2E]">Sin actividad aún</div>
              <p className="text-[12px] text-[#8B8470] mt-1 max-w-[220px] mx-auto leading-relaxed">
                {community.joined ? "Sé el primero en compartir tu progreso." : "Únete para participar en el feed."}
              </p>
            </div>
          ) : (
            [...(community.posts || [])].map(post => (
              <div key={post.id} className="flex gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#3E5A4A] to-[#1F2A24] text-[#D7C9A7] flex items-center justify-center font-display text-[13px] font-semibold flex-shrink-0">
                  {(post.author || "?")[0].toUpperCase()}
                </div>
                <div className="flex-1">
                  <div className="rounded-2xl bg-[#FBF7EC] border border-[#E8DEC3] p-3.5">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="font-medium text-[13px]">{post.author}</div>
                      <div className="text-[11px] text-[#B0A890]">{timeAgo(post.timestamp)}</div>
                    </div>
                    <p className="text-[13px] text-[#3F3A2E] leading-relaxed">{post.text}</p>
                  </div>
                  <button onClick={() => onLike(post.id)}
                    className={`mt-1.5 ml-2 flex items-center gap-1.5 text-[11px] font-medium transition ${post.likedByMe ? "text-[#C0633F]" : "text-[#8B8470]"}`}>
                    <Heart size={13} strokeWidth={post.likedByMe ? 0 : 1.6} fill={post.likedByMe ? "currentColor" : "none"} />
                    {post.likes > 0 ? `${post.likes} ` : ""}Me gusta
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── RANKING ── */}
      {subtab === "ranking" && (
        <div className="px-5 pt-4 space-y-4">
          <div className="rounded-2xl bg-gradient-to-br from-[#1F2A24] to-[#2A3D31] text-[#F2ECDF] p-5">
            <div className="flex items-center gap-2 mb-4">
              <Trophy size={16} className="text-[#D7C9A7]" strokeWidth={1.5} />
              <div className="font-display text-[16px] tracking-tight">Leaderboard — este mes</div>
            </div>
            <div className="bg-white/10 rounded-xl p-3 flex items-center gap-3">
              <div className="w-7 h-7 rounded-full bg-[#D7C9A7] text-[#1F2A24] flex items-center justify-center text-[11px] font-bold flex-shrink-0">1</div>
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#3E5A4A] to-[#1F2A24] text-[#D7C9A7] flex items-center justify-center font-display text-[13px] font-semibold flex-shrink-0">
                {initial}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium">{displayName}</div>
                <div className="text-[10px] text-[#D7C9A7]/60">{thisMonthWorkouts.length} entrenos · {streak} días racha</div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="font-display text-[17px] text-[#D7C9A7]">{adherencePct}%</div>
                <div className="text-[9px] text-[#D7C9A7]/50">adherencia</div>
              </div>
            </div>
            {community.memberCount > 1 && (
              <div className="mt-3 text-center text-[11px] text-[#D7C9A7]/40">
                + {(community.memberCount - 1).toLocaleString()} miembros más en el ranking
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Entrenos", value: thisMonthWorkouts.length, sub: "este mes", color: "#C0633F" },
              { label: "Racha", value: `${streak}d`, sub: "consecutivos", color: "#3E5A4A" },
              { label: "Adherencia", value: `${adherencePct}%`, sub: "suplementos", color: "#9B8EC7" },
            ].map(s => (
              <div key={s.label} className="rounded-xl bg-[#FBF7EC] border border-[#E8DEC3] p-3 text-center">
                <div className="font-display text-[22px] leading-none" style={{ color: s.color }}>{s.value}</div>
                <div className="text-[10px] font-medium text-[#3F3A2E] mt-1">{s.label}</div>
                <div className="text-[9px] text-[#8B8470]">{s.sub}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── MIEMBROS ── */}
      {subtab === "members" && (
        <div className="px-5 pt-4 space-y-3">
          {community.joined && (
            <div className="flex items-center gap-3 rounded-2xl bg-[#FBF7EC] border border-[#E8DEC3] p-4">
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#3E5A4A] to-[#1F2A24] text-[#D7C9A7] flex items-center justify-center font-display text-[16px] font-semibold">
                {initial}
              </div>
              <div className="flex-1">
                <div className="font-display text-[15px] tracking-tight">{displayName}</div>
                <div className="text-[11.5px] text-[#8B8470]">{thisMonthWorkouts.length} entrenos · {streak}d racha</div>
              </div>
              <span className="text-[10px] px-2.5 py-1 rounded-full bg-[#E4EADF] text-[#3E5A4A] font-medium">Miembro</span>
            </div>
          )}
          {community.memberCount - (community.joined ? 1 : 0) > 0 && (
            <div className="rounded-2xl bg-[#FBF7EC] border border-[#E8DEC3] p-4 text-center">
              <div className="font-display text-[30px] text-[#3F3A2E] leading-none">
                {(community.memberCount - (community.joined ? 1 : 0)).toLocaleString()}
              </div>
              <div className="text-[12px] text-[#8B8470] mt-1">otros miembros</div>
              <p className="text-[11px] text-[#B0A890] mt-2 leading-relaxed">Perfiles detallados disponibles próximamente.</p>
            </div>
          )}
          {!community.joined && (
            <p className="text-center text-[13px] text-[#8B8470] py-6">Únete para ver los miembros activos.</p>
          )}
        </div>
      )}
    </div>
  );
}

function CommunitiesView({ workouts, doseLogs, userName }) {
  const [communities, setCommunities] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("wv_communities") || "null");
      // Reset if it contains any of the old fake seed IDs (2–6)
      if (stored && stored.some(c => [2,3,4,5,6].includes(c.id))) {
        localStorage.removeItem("wv_communities");
        return SEED_COMMUNITIES;
      }
      return stored || SEED_COMMUNITIES;
    } catch { return SEED_COMMUNITIES; }
  });
  const [activeTab, setActiveTab] = useState("discover");
  const [catFilter, setCatFilter] = useState("all");
  const [selectedId, setSelectedId] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ name: "", description: "", emoji: "", type: "public", category: "workouts" });

  const save = (next) => { setCommunities(next); localStorage.setItem("wv_communities", JSON.stringify(next)); };

  const joinCommunity   = (id) => save(communities.map(c => c.id === id ? { ...c, joined: true,  memberCount: c.memberCount + 1 } : c));
  const leaveCommunity  = (id) => save(communities.map(c => c.id === id ? { ...c, joined: false, memberCount: Math.max(0, c.memberCount - 1) } : c));

  const addPost = (cid, text) => save(communities.map(c => c.id !== cid ? c : {
    ...c,
    posts: [{ id: Date.now(), author: userName || "Tú", text, timestamp: new Date().toISOString(), likes: 0, likedByMe: false }, ...(c.posts || [])],
  }));

  const likePost = (cid, pid) => save(communities.map(c => c.id !== cid ? c : {
    ...c,
    posts: (c.posts || []).map(p => p.id !== pid ? p : { ...p, likes: p.likedByMe ? p.likes - 1 : p.likes + 1, likedByMe: !p.likedByMe }),
  }));

  const createCommunity = () => {
    if (!createForm.name.trim()) return;
    save([...communities, { ...createForm, id: Date.now(), memberCount: 1, joined: true, posts: [], createdAt: new Date().toISOString().slice(0, 10) }]);
    setShowCreate(false);
    setCreateForm({ name: "", description: "", emoji: "", type: "public", category: "workouts" });
  };

  if (selectedId) {
    const c = communities.find(x => x.id === selectedId);
    if (!c) { setSelectedId(null); return null; }
    return (
      <CommunityDetail
        community={c}
        workouts={workouts}
        doseLogs={doseLogs}
        userName={userName}
        onBack={() => setSelectedId(null)}
        onPost={(t) => addPost(c.id, t)}
        onLike={(pid) => likePost(c.id, pid)}
        onJoin={() => joinCommunity(c.id)}
        onLeave={() => leaveCommunity(c.id)}
      />
    );
  }

  const mine = communities.filter(c => c.joined);
  const displayed = activeTab === "mine" ? mine
    : catFilter === "all" ? communities : communities.filter(c => c.category === catFilter);

  return (
    <div className="min-h-screen pb-28">
      {/* Header */}
      <div className="px-6 pt-10 pb-4 flex items-start justify-between">
        <div>
          <Pill tone="sage">Social</Pill>
          <h1 className="font-display text-[30px] tracking-tight leading-tight mt-3">
            Tu <em className="italic text-[#C0633F]">comunidad</em>
          </h1>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="mt-10 w-10 h-10 rounded-full bg-[#1F2A24] text-[#D7C9A7] flex items-center justify-center flex-shrink-0">
          <Plus size={18} strokeWidth={2.2} />
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="mx-6 mb-4 rounded-2xl bg-[#FBF7EC] border border-[#E8DEC3] p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="font-display text-[17px] tracking-tight">Nueva comunidad</div>
            <button onClick={() => setShowCreate(false)} className="text-[12px] text-[#8B8470]">Cancelar</button>
          </div>
          <div className="flex gap-2">
            <input className="flex-1 h-11 rounded-xl border border-[#E8DEC3] bg-white px-4 text-[14px] outline-none focus:border-[#3E5A4A]"
              value={createForm.name} onChange={e => setCreateForm(p => ({ ...p, name: e.target.value }))} placeholder="Nombre de la comunidad" />
          </div>
          <textarea className="w-full rounded-xl border border-[#E8DEC3] bg-white px-4 py-3 text-[13px] outline-none focus:border-[#3E5A4A] resize-none"
            rows={2} value={createForm.description} onChange={e => setCreateForm(p => ({ ...p, description: e.target.value }))}
            placeholder="Descripción breve..." />
          <div className="flex flex-wrap gap-1.5">
            {COMMUNITY_CATEGORIES.filter(c => c.v !== "all").map(c => (
              <button key={c.v} onClick={() => setCreateForm(p => ({ ...p, category: c.v }))}
                className={`px-3 py-1 rounded-full border text-[11px] font-medium transition ${createForm.category === c.v ? "bg-[#3E5A4A] text-white border-[#3E5A4A]" : "bg-white border-[#E8DEC3] text-[#3F3A2E]"}`}>
                {c.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            {[{ v: "public", label: "Pública", Icon: Globe }, { v: "private", label: "Privada", Icon: Lock }].map(t => (
              <button key={t.v} onClick={() => setCreateForm(p => ({ ...p, type: t.v }))}
                className={`flex-1 h-10 rounded-xl border flex items-center justify-center gap-1.5 text-[12px] font-medium transition ${createForm.type === t.v ? "bg-[#1F2A24] text-[#F2ECDF] border-[#1F2A24]" : "bg-white border-[#E8DEC3] text-[#3F3A2E]"}`}>
                <t.Icon size={13} strokeWidth={1.8} />{t.label}
              </button>
            ))}
          </div>
          <button disabled={!createForm.name.trim()} onClick={createCommunity}
            className={`w-full h-11 rounded-xl font-semibold text-[13px] transition ${createForm.name.trim() ? "bg-[#1F2A24] text-[#F2ECDF]" : "bg-[#E8E0CF] text-[#B0A890]"}`}>
            Crear comunidad
          </button>
        </div>
      )}

      {/* Discover / Mine tabs */}
      <div className="px-6 flex gap-2 mb-4">
        {[{ v: "discover", label: "Descubrir" }, { v: "mine", label: `Mis comunidades${mine.length > 0 ? ` (${mine.length})` : ""}` }].map(t => (
          <button key={t.v} onClick={() => setActiveTab(t.v)}
            className={`px-4 py-2 rounded-full text-[12.5px] font-medium border transition ${activeTab === t.v ? "bg-[#1F2A24] text-[#F2ECDF] border-[#1F2A24]" : "bg-[#FBF7EC] text-[#3F3A2E] border-[#E8DEC3]"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Category filter */}
      {activeTab === "discover" && (
        <div className="px-6 overflow-x-auto scroll-hide mb-4">
          <div className="flex gap-2 min-w-max pb-1">
            {COMMUNITY_CATEGORIES.map(c => (
              <button key={c.v} onClick={() => setCatFilter(c.v)}
                className={`whitespace-nowrap px-3.5 py-1.5 rounded-full text-[12px] font-medium border transition ${catFilter === c.v ? "bg-[#1F2A24] text-[#F2ECDF] border-[#1F2A24]" : "bg-[#FBF7EC] text-[#3F3A2E] border-[#E8DEC3]"}`}>
                {c.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Community cards */}
      <div className="px-6 space-y-3">
        {displayed.length === 0 && (
          <div className="text-center py-10">
            <div className="font-display text-[18px] tracking-tight text-[#3F3A2E]">
              {activeTab === "mine" ? "Aún no eres miembro de ninguna comunidad" : "Sin resultados"}
            </div>
            {activeTab === "mine" && <p className="text-[12.5px] text-[#8B8470] mt-2">Explora en Descubrir o crea la tuya.</p>}
          </div>
        )}
        {displayed.map((c, i) => (
          <button key={c.id} onClick={() => setSelectedId(c.id)}
            className="w-full text-left rounded-2xl overflow-hidden border border-[#E8DEC3] animate-fadeUp"
            style={{ animationDelay: `${i * 40}ms` }}>
            <div className="h-12 relative flex items-center px-4"
              style={{ background: `linear-gradient(135deg, ${c.coverColor}E8, ${c.coverColor}80)` }}>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${c.type === "public" ? "bg-white/25 text-white" : "bg-black/20 text-white"}`}>
                {c.type === "public" ? "Pública" : "Privada"}
              </span>
            </div>
            <div className="bg-[#FBF7EC] p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="font-display text-[16px] tracking-tight leading-tight">{c.name}</div>
                  <p className="text-[12px] text-[#6B6657] mt-1 leading-relaxed line-clamp-2">{c.description}</p>
                </div>
                <button
                  onClick={e => { e.stopPropagation(); c.joined ? leaveCommunity(c.id) : joinCommunity(c.id); }}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] font-semibold border transition ${c.joined ? "bg-[#E4EADF] border-[#3E5A4A]/30 text-[#3E5A4A]" : "bg-[#1F2A24] border-[#1F2A24] text-[#F2ECDF]"}`}>
                  {c.joined ? "Unido" : "Unirse"}
                </button>
              </div>
              <div className="flex items-center gap-3 mt-3 text-[11px] text-[#8B8470]">
                <span className="flex items-center gap-1"><Users size={11} strokeWidth={1.5} /> {c.memberCount.toLocaleString()}</span>
                <span className="flex items-center gap-1"><MessageCircle size={11} strokeWidth={1.5} /> {(c.posts || []).length}</span>
                <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full font-medium"
                  style={{ background: `${c.coverColor}20`, color: c.coverColor }}>
                  {COMMUNITY_CATEGORIES.find(cat => cat.v === c.category)?.label}
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// BOTTOM NAV
// ============================================================
function BottomNav({ tab, setTab }) {
  const items = [
    { v: "home",        label: "Inicio",    Icon: Home },
    { v: "progress",    label: "Progreso",  Icon: BarChart3 },
    { v: "workouts",    label: "Actividad", Icon: Dumbbell },
    { v: "communities", label: "Social",    Icon: Users },
    { v: "telehealth",  label: "Doctores",  Icon: Stethoscope },
    { v: "profile",     label: "Perfil",    Icon: User },
  ];
  return (
    <div className="fixed bottom-0 left-0 right-0 flex justify-center pointer-events-none z-40">
      <div className="w-full max-w-[440px] px-2 pb-4 pointer-events-auto">
        <div className="backdrop-blur-xl bg-[#1F2A24]/94 rounded-full h-[60px] flex items-center justify-around px-1 shadow-[0_12px_32px_-8px_rgba(30,45,36,0.5)]">
          {items.map(it => {
            const active = tab === it.v;
            return (
              <button key={it.v} onClick={() => setTab(it.v)}
                className={`relative flex flex-col items-center justify-center gap-0.5 px-2.5 py-2 rounded-full transition ${active ? "text-[#D7C9A7]" : "text-[#8B9A92]"}`}>
                {active && <div className="absolute inset-x-1.5 top-0 h-[2px] bg-[#D7C9A7] rounded-full" />}
                <it.Icon size={17} strokeWidth={active ? 1.9 : 1.5} />
                <span className="text-[9px] font-medium tracking-wide">{it.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// AUTH SCREEN
// ============================================================
function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError("");
    setLoading(true);
    try {
      if (mode === "signup") {
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        await setDoc(doc(db, "users", cred.user.uid), { email: email.trim(), createdAt: new Date().toISOString() }, { merge: true });
        onAuth(cred.user);
      } else {
        const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
        onAuth(cred.user);
      }
    } catch (e) {
      const msgs = {
        "auth/email-already-in-use": "Este correo ya está registrado.",
        "auth/invalid-email": "Correo inválido.",
        "auth/weak-password": "Contraseña muy corta (mínimo 6 caracteres).",
        "auth/user-not-found": "No encontramos esa cuenta.",
        "auth/wrong-password": "Contraseña incorrecta.",
        "auth/invalid-credential": "Correo o contraseña incorrectos.",
      };
      setError(msgs[e.code] || "Algo salió mal. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F0E8] flex flex-col items-center justify-center px-8">
      <div className="w-14 h-14 rounded-3xl bg-gradient-to-br from-[#3E5A4A] to-[#1F2A24] flex items-center justify-center mb-6 shadow-lg">
        <Leaf size={26} className="text-[#D7C9A7]" strokeWidth={1.5} />
      </div>
      <h1 className="font-display text-[32px] tracking-tight text-[#1F2A24] text-center leading-tight">
        {mode === "login" ? "Bienvenido de vuelta" : "Crear cuenta"}
      </h1>
      <p className="text-[13px] text-[#6B6657] mt-2 text-center mb-8">
        {mode === "login" ? "Ingresa a tu cuenta Wellvara." : "Crea tu cuenta para guardar tu progreso."}
      </p>

      <div className="w-full max-w-[320px] space-y-3">
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="Correo electrónico"
          className="w-full border border-[#D8CEB8] rounded-2xl px-4 py-3.5 text-[15px] bg-white outline-none focus:border-[#3E5A4A] transition-colors"
        />
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === "Enter" && submit()}
          placeholder="Contraseña"
          className="w-full border border-[#D8CEB8] rounded-2xl px-4 py-3.5 text-[15px] bg-white outline-none focus:border-[#3E5A4A] transition-colors"
        />
        {error && <p className="text-[12px] text-[#E57373] text-center">{error}</p>}
        <button
          onClick={submit}
          disabled={loading || !email || !password}
          className="btn-primary w-full text-[#F2ECDF] font-semibold py-3.5 rounded-2xl text-[15px] disabled:opacity-50"
        >
          {loading ? "..." : mode === "login" ? "Entrar" : "Crear cuenta"}
        </button>
      </div>

      <p className="mt-6 text-[12px] text-[#8B8470] text-center">
        {mode === "login" ? "¿No tienes cuenta?" : "¿Ya tienes cuenta?"}{" "}
        <button onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); }}
          className="underline text-[#3E5A4A]">
          {mode === "login" ? "Regístrate" : "Inicia sesión"}
        </button>
      </p>
    </div>
  );
}

// ============================================================
// BETA GATE
// ============================================================
const BETA_PASSWORD = "wellvara2026"; // change this to whatever you want

function BetaGate({ onUnlock }) {
  const [input, setInput] = useState("");
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);

  const attempt = () => {
    if (input.trim().toLowerCase() === BETA_PASSWORD.toLowerCase()) {
      localStorage.setItem("wv_beta_unlocked", "true");
      onUnlock();
    } else {
      setError(true);
      setShake(true);
      setTimeout(() => setShake(false), 500);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F0E8] flex flex-col items-center justify-center px-8">
      <style>{`@keyframes shake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-8px)}40%,80%{transform:translateX(8px)}}`}</style>
      <div className="w-14 h-14 rounded-3xl bg-gradient-to-br from-[#3E5A4A] to-[#1F2A24] flex items-center justify-center mb-6 shadow-lg">
        <Leaf size={26} className="text-[#D7C9A7]" strokeWidth={1.5} />
      </div>
      <h1 className="font-display text-[32px] tracking-tight text-[#1F2A24] text-center leading-tight">Wellvara Beta</h1>
      <p className="text-[13px] text-[#6B6657] mt-2 text-center leading-relaxed max-w-[260px]">
        Acceso exclusivo para testers. Ingresa la clave que te compartimos.
      </p>

      <div className="mt-8 w-full max-w-[320px]" style={{ animation: shake ? "shake 0.4s ease" : "none" }}>
        <input
          type="password"
          value={input}
          onChange={e => { setInput(e.target.value); setError(false); }}
          onKeyDown={e => e.key === "Enter" && attempt()}
          placeholder="Clave de acceso"
          autoFocus
          className={`w-full h-13 px-5 py-4 rounded-2xl border text-[15px] outline-none bg-white text-[#1F2A24] placeholder-[#B5AC9A] transition ${
            error ? "border-[#E57373] bg-[#FFF5F5]" : "border-[#E8DEC3] focus:border-[#3E5A4A]"
          }`}
        />
        {error && <p className="text-[12px] text-[#E57373] mt-2 text-center">Clave incorrecta. Intenta de nuevo.</p>}
      </div>

      <button
        onClick={attempt}
        className="mt-4 w-full max-w-[320px] h-13 py-4 rounded-2xl bg-[#1F2A24] text-[#D7C9A7] font-semibold text-[15px] transition active:opacity-80"
      >
        Entrar
      </button>

      <p className="mt-8 text-[11px] text-[#B5AC9A] text-center">
        ¿Eres profesional de salud?{" "}
        <button onClick={() => { localStorage.setItem("wv_beta_unlocked", "true"); onUnlock(); }}
          className="underline text-[#3E5A4A]">
          Regístrate aquí
        </button>
      </p>
    </div>
  );
}

// ============================================================
// MAIN APP
// ============================================================
export default function Wellvara() {
  const [unlocked, setUnlocked] = useState(() =>
    localStorage.getItem("wv_beta_unlocked") === "true"
  );
  const [user, setUser] = useState(undefined);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u ?? null));
    return unsub;
  }, []);

  if (!unlocked) return <BetaGate onUnlock={() => setUnlocked(true)} />;
  if (user === undefined) return null;
  if (!user) return <AuthScreen onAuth={setUser} />;
  return <WellvaraApp user={user} />;
}

function WellvaraApp({ user }) {
  const [screen, setScreen] = useState("welcome");
  const [answers, setAnswers] = useState({});
  const [tab, setTab] = useState("home");
  const [currentDoctor, setCurrentDoctor] = useState(null);
  const [currentBooking, setCurrentBooking] = useState(null);
  const [doseLogs, setDoseLogs] = useState([]);
  const [providers, setProviders] = useState([]);
  const [currentProvider, setCurrentProvider] = useState(null);

  useEffect(() => {
    if (!user) return;
    getDoc(doc(db, "users", user.uid)).then(snap => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.answers) { setAnswers(data.answers); setScreen("dashboard"); }
        if (data.doseLogs) setDoseLogs(data.doseLogs);
        if (data.providers) setProviders(data.providers);
        if (data.workouts) setWorkouts(data.workouts);
        if (data.wearables) setWearables(data.wearables);
      }
    });
  }, [user]);

  const saveToFirestore = useCallback((updates) => {
    if (!user) return;
    setDoc(doc(db, "users", user.uid), updates, { merge: true });
  }, [user]);

  const stack = useMemo(() => generateStack(answers), [answers]);

  const logDose = useCallback((timeOfDay) => {
    const entry = { date: new Date().toISOString().slice(0, 10), timeOfDay };
    setDoseLogs(prev => {
      if (prev.some(l => l.date === entry.date && l.timeOfDay === entry.timeOfDay)) return prev;
      const next = [...prev, entry];
      saveToFirestore({ doseLogs: next });
      return next;
    });
  }, [saveToFirestore]);

  const registerProvider = useCallback((formData) => {
    const id = Date.now();
    const initials = formData.name.trim().split(/\s+/).map(w => w[0]).join("").slice(0, 2).toUpperCase();
    const color = PROVIDER_COLORS[id % PROVIDER_COLORS.length];
    const provider = {
      ...formData,
      id, initials, color,
      status: "pending",
      submittedAt: new Date().toISOString(),
      availability: {},
      rating: null,
      reviews: 0,
      languages: formData.languages.split(",").map(l => l.trim()),
    };
    setProviders(prev => {
      const next = [...prev, provider];
      saveToFirestore({ providers: next });
      return next;
    });
    setCurrentProvider(provider);
  }, [saveToFirestore]);

  const approveProvider = useCallback((id) => {
    setProviders(prev => {
      const next = prev.map(p => p.id === id ? { ...p, status: "approved" } : p);
      saveToFirestore({ providers: next });
      return next;
    });
  }, [saveToFirestore]);

  const rejectProvider = useCallback((id) => {
    setProviders(prev => {
      const next = prev.map(p => p.id === id ? { ...p, status: "rejected" } : p);
      saveToFirestore({ providers: next });
      return next;
    });
  }, [saveToFirestore]);

  const updateProviderAvailability = useCallback((providerId, availability) => {
    setProviders(prev => {
      const next = prev.map(p => p.id === providerId ? { ...p, availability } : p);
      saveToFirestore({ providers: next });
      return next;
    });
  }, [saveToFirestore]);

  const [workouts, setWorkouts] = useState([]);
  const [wearables, setWearables] = useState({});

  const logWorkout = useCallback((w) => {
    const entry = { ...w, id: Date.now(), date: new Date().toISOString().slice(0, 10), source: "manual" };
    setWorkouts(prev => {
      const next = [entry, ...prev];
      saveToFirestore({ workouts: next });
      return next;
    });
  }, [saveToFirestore]);

  const toggleWearable = useCallback((key) => {
    setWearables(prev => {
      const next = { ...prev, [key]: !prev[key] };
      saveToFirestore({ wearables: next });
      return next;
    });
  }, [saveToFirestore]);

  const handleNav = (target, payload) => {
    if (target === "doctor") {
      setCurrentDoctor(payload);
      setScreen("doctor");
    } else if (target === "privacy") {
      setScreen("privacy");
    } else if (target === "results") {
      setScreen("results");
    } else if (target === "dashboard") {
      setScreen("dashboard");
    } else if (target === "provider-register") {
      setScreen("provider-register");
    } else if (target === "provider-dashboard") {
      setCurrentProvider(payload);
      setScreen("provider-dashboard");
    } else if (target === "admin") {
      setScreen("admin");
    } else if (target === "labs") {
      setScreen("labs");
    }
  };

  const showBottomNav = screen === "dashboard";

  return (
    <>
      <style>{FONTS_CSS}</style>
      <Shell>
        {screen === "welcome" && (
          <WelcomeScreen
            onStart={() => setScreen("questionnaire")}
            onOpenPrivacy={() => setScreen("privacy")}
          />
        )}

        {screen === "questionnaire" && (
          <Questionnaire
            onExit={() => setScreen("welcome")}
            onComplete={(a) => { setAnswers(a); saveToFirestore({ answers: a }); setScreen("results"); }}
          />
        )}

        {screen === "results" && (
          <ResultsScreen
            answers={answers}
            stack={stack}
            onGoDashboard={() => { setScreen("dashboard"); setTab("home"); }}
            onSubscribe={() => setScreen("subscribe")}
          />
        )}

        {screen === "dashboard" && (
          <>
            <Dashboard
              answers={answers}
              stack={stack}
              doseLogs={doseLogs}
              logDose={logDose}
              providers={providers}
              workouts={workouts}
              wearables={wearables}
              logWorkout={logWorkout}
              toggleWearable={toggleWearable}
              onNav={handleNav}
              tab={tab}
              setTab={setTab}
              onLogout={() => signOut(auth)}
            />
            {showBottomNav && <BottomNav tab={tab} setTab={setTab} />}
          </>
        )}

        {screen === "provider-register" && (
          <ProviderRegisterScreen
            onBack={() => setScreen("welcome")}
            onSubmit={registerProvider}
          />
        )}

        {screen === "provider-dashboard" && currentProvider && (
          <ProviderDashboard
            provider={providers.find(p => p.id === currentProvider.id) || currentProvider}
            onBack={() => setScreen("welcome")}
            onUpdateAvailability={updateProviderAvailability}
          />
        )}

        {screen === "admin" && (
          <AdminView
            providers={providers}
            onApprove={approveProvider}
            onReject={rejectProvider}
            onBack={() => setScreen("dashboard")}
          />
        )}

        {screen === "doctor" && currentDoctor && (
          <DoctorDetail
            doctor={currentDoctor}
            onBack={() => setScreen("dashboard")}
            onBook={(b) => { setCurrentBooking(b); setScreen("booking"); }}
          />
        )}

        {screen === "booking" && currentBooking && (
          <BookingConfirmation
            booking={currentBooking}
            onDone={() => { setScreen("dashboard"); setTab("home"); }}
          />
        )}

        {screen === "subscribe" && (
          <SubscribeScreen
            stack={stack}
            onBack={() => setScreen("results")}
            onDone={() => { setScreen("dashboard"); setTab("home"); }}
          />
        )}

        {screen === "privacy" && (
          <PrivacyScreen onBack={() => {
            if (answers.name) setScreen("dashboard");
            else setScreen("welcome");
          }} />
        )}

        {screen === "labs" && (
          <LabsScreen onBack={() => setScreen("dashboard")} />
        )}
      </Shell>
    </>
  );
}
