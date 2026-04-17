import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic, Zap, Timer, BarChart3, CalendarDays, ChevronLeft, ChevronRight,
  CheckSquare, CheckCircle2, Shield, Brain, Star,
  TrendingUp, Globe, Layers, Play, Bell, MessageSquare, Bot
} from "lucide-react";

import screenshotTasks from "../assets/screenshot-tasks.png";
import screenshotTimer from "../assets/screenshot-timer.png";
import screenshotCalendar from "../assets/screenshot-calendar.png";
import screenshotInsights from "../assets/screenshot-insights.png";
import screenshotChatbot from "../assets/screenshot-chatbot.png";

import "./LandingPage.css";

/* ---- Navbar ---------------------------------------- */
const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);
  return (
    <nav className={`lp-nav ${scrolled ? "lp-nav-scrolled" : ""}`}>
      <div className="lp-container lp-nav-inner">
        <div className="lp-nav-logo">
          <div className="lp-nav-logo-icon">
            <Mic size={26} strokeWidth={2} />
          </div>
          <span className="lp-nav-logo-text">VoicePro</span>
        </div>
        <div className="lp-nav-links">
          <a href="#features" className="lp-nav-link">Features</a>
          <a href="#how-it-works" className="lp-nav-link">How it Works</a>
          <a href="#preview" className="lp-nav-link">Preview</a>
        </div>
        <div className="lp-nav-actions">
          <Link to="/auth" className="lp-btn lp-btn-primary">Get Started</Link>
        </div>
      </div>
    </nav>
  );
};

/* ---- Voice Command Demo Card ----------------------- */
const DemoCard = () => {
  const cmds = [
    { voice: "I have 45 minutes free", result: "✨  Here are 3 suggested tasks that fit 45m." },
    { voice: "Any overdue tasks?", result: "🚨  Found 2 tasks sitting the longest without progress." },
    { voice: "Plan my day", result: "🌅  Here is your Day Plan · ~4h estimated." },
    { voice: "Add 'Review Final Draft' task", result: "🤖  Got it. What's the priority? High, Medium, or Low?" },
  ];
  const [idx, setIdx] = useState(0);
  const [typed, setTyped] = useState("");
  const [phase, setPhase] = useState("typing");
  const cur = cmds[idx];

  useEffect(() => {
    setTyped(""); setPhase("typing");
    let i = 0;
    const t = setInterval(() => {
      i++;
      setTyped(cur.voice.slice(0, i));
      if (i >= cur.voice.length) {
        clearInterval(t);
        setTimeout(() => setPhase("result"), 500);
        setTimeout(() => setIdx(p => (p + 1) % cmds.length), 3200);
      }
    }, 38);
    return () => clearInterval(t);
  }, [idx]);

  return (
    <motion.div
      className="lp-demo-card"
      initial={{ opacity: 0, y: 32 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.7, duration: 0.8 }}
    >
      <div className="lp-demo-titlebar">
        <div className="lp-demo-dots">
          <span className="lp-demo-dot lp-dot-r" />
          <span className="lp-demo-dot lp-dot-y" />
          <span className="lp-demo-dot lp-dot-g" />
        </div>
        <span className="lp-demo-wintitle">VoicePro - AI Assistant</span>
      </div>
      <div className="lp-demo-body">
        <div className="lp-demo-input-row">
          <div className="lp-demo-mic">
            <Bot size={14} color="#fff" />
          </div>
          <span className="lp-demo-text">
            {typed}
            <span className="lp-demo-cursor" />
          </span>
        </div>
        <AnimatePresence>
          {phase === "result" && (
            <motion.div
              key="r"
              className="lp-demo-result"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <CheckCircle2 size={14} color="#4ade80" />
              <span>{cur.result}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

/* ---- Features Carousel ----------------------------- */
const FeaturesCarousel = () => {
  const features = [
    {
      icon: MessageSquare,
      name: "Frictionless AI Assistant",
      desc: "Bypass complex menus. Use our guided chat options to instantly schedule events, log tasks, and start timers with a single tap or voice command.",
      iconClass: "lp-icon-orange",
      cardClass: "lp-icon-orange-card",
    },
    {
      icon: Zap,
      name: "Time-Aware Suggestions",
      desc: "Tell the AI how much free time you have, and it instantly suggests the best tasks to tackle based on priority and duration.",
      iconClass: "lp-icon-teal",
      cardClass: "lp-icon-teal-card",
    },
    {
      icon: Timer,
      name: "Focus Timer",
      desc: "Run structured deep-work sessions with Pomodoro timers, started instantly by voice.",
      iconClass: "lp-icon-yellow",
      cardClass: "lp-icon-yellow-card",
    },
    {
      icon: BarChart3,
      name: "Performance Analytics",
      desc: "Track peak focus hours, completion rates, and weekly performance trends at a glance.",
      iconClass: "lp-icon-purple",
      cardClass: "lp-icon-purple-card",
    },
    {
      icon: Bell,
      name: "Smart Reminders",
      desc: "Get context-aware reminders that nudge at the right moment, not just at a fixed time.",
      iconClass: "lp-icon-green",
      cardClass: "lp-icon-green-card",
    },
    {
      icon: Layers,
      name: "Unified Workspace",
      desc: "Manage tasks, reminders, timers, and analytics in one workspace with minimal context switching.",
      iconClass: "lp-icon-orange",
      cardClass: "lp-icon-orange-card",
    },
  ];

  const [paused, setPaused] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [cardsPerView, setCardsPerView] = useState(3);
  const [activeIndex, setActiveIndex] = useState(3);
  const [trackOffset, setTrackOffset] = useState(0);
  const [transitionEnabled, setTransitionEnabled] = useState(true);
  const itemRefs = useRef([]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setPrefersReducedMotion(mediaQuery.matches);

    updatePreference();
    mediaQuery.addEventListener("change", updatePreference);

    return () => mediaQuery.removeEventListener("change", updatePreference);
  }, []);

  useEffect(() => {
    const updateCardsPerView = () => {
      if (window.innerWidth >= 1120) {
        setCardsPerView(3);
        return;
      }
      if (window.innerWidth >= 720) {
        setCardsPerView(2);
        return;
      }
      setCardsPerView(1);
    };

    updateCardsPerView();
    window.addEventListener("resize", updateCardsPerView);

    return () => window.removeEventListener("resize", updateCardsPerView);
  }, []);

  useEffect(() => {
    setTransitionEnabled(false);
    setActiveIndex(cardsPerView);
  }, [cardsPerView]);

  useEffect(() => {
    const target = itemRefs.current[activeIndex];
    if (!target) return;
    setTrackOffset(target.offsetLeft);
  }, [activeIndex, cardsPerView]);

  useEffect(() => {
    const syncOffset = () => {
      const target = itemRefs.current[activeIndex];
      if (!target) return;
      setTransitionEnabled(false);
      setTrackOffset(target.offsetLeft);
    };

    window.addEventListener("resize", syncOffset);
    return () => window.removeEventListener("resize", syncOffset);
  }, [activeIndex]);

  useEffect(() => {
    if (transitionEnabled) return undefined;

    const frameOne = window.requestAnimationFrame(() => {
      const frameTwo = window.requestAnimationFrame(() => {
        setTransitionEnabled(true);
      });
      return () => window.cancelAnimationFrame(frameTwo);
    });

    return () => window.cancelAnimationFrame(frameOne);
  }, [transitionEnabled]);

  useEffect(() => {
    if (paused || prefersReducedMotion) return undefined;
    const timer = setInterval(() => {
      setActiveIndex((current) => current + 1);
    }, 4500);
    return () => clearInterval(timer);
  }, [paused, prefersReducedMotion]);

  const renderedFeatures = [
    ...features.slice(-cardsPerView),
    ...features,
    ...features.slice(0, cardsPerView),
  ];

  const prev = () => setActiveIndex((current) => current - 1);
  const next = () => setActiveIndex((current) => current + 1);

  const handleTransitionEnd = () => {
    if (activeIndex >= features.length + cardsPerView) {
      setTransitionEnabled(false);
      setActiveIndex(cardsPerView);
      return;
    }

    if (activeIndex < cardsPerView) {
      setTransitionEnabled(false);
      setActiveIndex(features.length + activeIndex);
    }
  };

  return (
    <div
      className="lp-features-carousel"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="lp-feature-viewport">
        <button className="lp-feature-arrow lp-feature-arrow-left" aria-label="Previous feature" onClick={prev}>
          <ChevronLeft size={18} />
        </button>
        <div className="lp-feature-scroller">
          <div
            className="lp-feature-track"
            onTransitionEnd={handleTransitionEnd}
            style={{
              transform: `translateX(-${trackOffset}px)`,
              transition: transitionEnabled && !prefersReducedMotion ? "transform 420ms cubic-bezier(0.22, 1, 0.36, 1)" : "none",
            }}
          >
            {renderedFeatures.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={`${feature.name}-${index}`}
                  className={`lp-feature-card lp-feature-slide ${feature.cardClass}`}
                  ref={(element) => {
                    itemRefs.current[index] = element;
                  }}
                >
                  <div className={`lp-feature-icon ${feature.iconClass}`}>
                    <Icon size={24} />
                  </div>
                  <div className="lp-feature-name">{feature.name}</div>
                  <div className="lp-feature-desc">{feature.desc}</div>
                </div>
              );
            })}
          </div>
        </div>
        <button className="lp-feature-arrow lp-feature-arrow-right" aria-label="Next feature" onClick={next}>
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
};

/* ---- Step ------------------------------------------ */
const Step = ({ num, title, desc, delay = 0 }) => (
  <motion.div
    className="lp-step"
    initial={{ opacity: 0, y: 18 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ delay, duration: 0.5 }}
  >
    <div className="lp-step-num">{num}</div>
    <div className="lp-step-title">{title}</div>
    <div className="lp-step-desc">{desc}</div>
  </motion.div>
);

/* ---- Stat ------------------------------------------ */
const Stat = ({ num, label, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 14 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ delay, duration: 0.45 }}
  >
    <div className="lp-stat-num">{num}</div>
    <div className="lp-stat-desc">{label}</div>
  </motion.div>
);

/* ---- Testimonial ----------------------------------- */
const Testi = ({ quote, name, role, delay = 0 }) => (
  <motion.div
    className="lp-testi-card"
    initial={{ opacity: 0, y: 18 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ delay, duration: 0.5 }}
  >
    <div className="lp-testi-stars">
      {[...Array(5)].map((_, i) => <Star key={i} size={13} fill="#FF6B35" color="#FF6B35" />)}
    </div>
    <p className="lp-testi-quote">"{quote}"</p>
    <div className="lp-testi-author">
      <div className="lp-testi-avatar">{name[0]}</div>
      <div>
        <div className="lp-testi-name">{name}</div>
        <div className="lp-testi-role">{role}</div>
      </div>
    </div>
  </motion.div>
);

/* ---- Preview Section ------------------------------- */
const PreviewSection = () => {
  const tabs = [
    { id: "tasks", label: "Tasks", icon: CheckSquare, img: "/assets/landing-tasks.png", fallbackImg: screenshotTasks },
    { id: "timer", label: "Focus Timer", icon: Timer, img: "/assets/landing-timer.png", fallbackImg: screenshotTimer },
    { id: "calendar", label: "Schedule", icon: CalendarDays, img: "/assets/landing-calendar.png", fallbackImg: screenshotCalendar },
    { id: "insights", label: "Analytics", icon: BarChart3, img: "/assets/landing-insights.png", fallbackImg: screenshotInsights },
    { id: "assistant", label: "AI Assistant", icon: Bot, img: "/assets/landing-chatbot.png", fallbackImg: screenshotChatbot },
  ];
  const [active, setActive] = useState("tasks");
  const activeTab = tabs.find((t) => t.id === active) || tabs[0];
  return (
    <section id="preview" className="lp-section lp-preview-section">
      <div className="lp-container">
        <motion.div
          className="lp-section-header"
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <p className="lp-section-kicker">Product Tour</p>
          <h2 className="lp-section-title">Everything in one place</h2>
          <p className="lp-section-sub">Tasks, focus timers, scheduling, and analytics—supercharged by&nbsp;AI.</p>
        </motion.div>
        <div className="lp-preview-tabs">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setActive(t.id)}
              className={`lp-tab ${active === t.id ? "lp-tab-active" : ""}`}
            >
              <t.icon size={14} />
              {t.label}
            </button>
          ))}
        </div>
        <div className="lp-preview-card">
          <AnimatePresence mode="wait">
            <motion.img
              key={active}
              src={activeTab.img}
              alt={active}
              className="lp-preview-img"
              onError={(e) => {
                if (e.currentTarget.dataset.fallbackApplied === "1") return;
                e.currentTarget.dataset.fallbackApplied = "1";
                e.currentTarget.src = activeTab.fallbackImg;
              }}
              initial={{ opacity: 0, scale: 0.985 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            />
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
};

/* ---- Main LandingPage ------------------------------ */
const LandingPage = () => (
  <div className="lp-root">
    <div className="lp-ambient" />

    <Navbar />

    {/* ── HERO ─────────────────────────────────────── */}
    <section className="lp-hero">
      <div className="lp-hero-blob lp-blob-1" />
      <div className="lp-hero-blob lp-blob-2" />
      <div className="lp-hero-blob lp-blob-3" />

      <div className="lp-container lp-hero-inner">
        <div className="lp-hero-content">
          <motion.h1
            className="lp-hero-title"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.8 }}
          >
            The <span className="lp-gradient-text">unified workspace</span> for focused execution.
          </motion.h1>

          <motion.p
            className="lp-hero-sub"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.28, duration: 0.7 }}
          >
            VoicePro combines Kanban task management, Pomodoro timers, and deep analytics with a guided AI assistant that helps you structure your day without the friction.
          </motion.p>

          <motion.div
            className="lp-hero-ctas"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.42, duration: 0.7 }}
          >
            <Link to="/signup" className="lp-btn lp-btn-primary lp-btn-lg">
              Start for free
            </Link>
            <a href="#preview" className="lp-btn lp-btn-secondary lp-btn-lg">
              View preview
            </a>
          </motion.div>


        </div>

        <DemoCard />
      </div>
    </section>

    {/* ── STATS ──────────────────────────────────────── */}
    <section className="lp-stats-row">
      <div className="lp-container lp-stats-inner">
        <Stat num="10x Faster" label="Task creation" delay={0.0} />
        <Stat num="Zero Setup" label="Guided execution" delay={0.1} />
        <Stat num="1-Click" label="Deep-work timers" delay={0.2} />
        <Stat num="Real-Time" label="Productivity metrics" delay={0.3} />
      </div>
    </section>

    {/* ── FEATURES ───────────────────────────────────── */}
    <section id="features" className="lp-section">
      <div className="lp-container">
        <motion.div
          className="lp-section-header"
          initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
        >
          <p className="lp-section-kicker">Core Features</p>
          <h2 className="lp-section-title">Built for how pros actually work</h2>
          <p className="lp-section-sub">Every feature is designed to minimize friction and maximize deep focus.</p>
        </motion.div>
        <FeaturesCarousel />
      </div>
    </section>

    {/* ── HOW IT WORKS ───────────────────────────────── */}
    <section id="how-it-works" className="lp-section lp-how-section">
      <div className="lp-container">
        <motion.div
          className="lp-section-header"
          initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
        >
          <p className="lp-section-kicker">Workflow</p>
          <h2 className="lp-section-title">From thought to done in seconds</h2>
        </motion.div>
        <div className="lp-steps">
          <div className="lp-steps-connector" />
          <Step num="01" title="Capture" desc="Instantly offload your thoughts, commitments, and deadlines to the AI assistant via text or voice." delay={0.05} />
          <Step num="02" title="Structure" desc="Using curated options, VoicePro automatically structures your inputs into actionable tasks and scheduled blocks." delay={0.12} />
          <Step num="03" title="Focus" desc="Launch deep-work timers directly from your unified dashboard to eliminate context switching." delay={0.19} />
          <Step num="04" title="Optimize" desc="Analyze your peak performance hours and task completion trends to constantly refine your workflow." delay={0.26} />
        </div>
      </div>
    </section>

    {/* ── PREVIEW ────────────────────────────────────── */}
    <PreviewSection />

    {/* ── TESTIMONIALS ───────────────────────────────── */}
    <section className="lp-section">
      <div className="lp-container">
        <motion.div
          className="lp-section-header"
          initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
        >
          <p className="lp-section-kicker">Testimonials</p>
          <h2 className="lp-section-title">Loved by high performers</h2>
        </motion.div>
        <div className="lp-testi-grid">
          <Testi quote="VoicePro handles my entire workflow. The AI assistant makes scheduling and starting focus sessions completely frictionless." name="Princy Karani" role="Startup Founder, Bhuj, Gujarat" delay={0.05} />
          <Testi quote="The time-aware suggestions are incredible. I tell it I have 45 minutes, and it perfectly surfaces a medium-priority task that fits." name="Shivani Ranjan" role="Finance Analyst, Ranchi, Jharkhand" delay={0.12} />
          <Testi quote="Having tasks, deep-work timers, and analytics in one beautiful workspace has transformed my daily execution speed." name="Vishwa Koparkar" role="Senior Engineer, Latur, Maharashtra" delay={0.19} />
        </div>
      </div>
    </section>

    {/* ── CTA ────────────────────────────────────────── */}
    <section className="lp-cta">
      <div className="lp-cta-glow" />
      <div className="lp-container">
        <motion.div
          className="lp-cta-inner"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <div className="lp-cta-mic">
            <MessageSquare size={30} color="#fff" />
          </div>
          <h2 className="lp-cta-title">Stop juggling fragmented tools.</h2>
          <p className="lp-cta-sub">
            Bring your tasks, timers, and analytics into one powerfully simple workspace.
          </p>
          <div className="lp-cta-group">
            <Link to="/auth" className="lp-btn lp-btn-primary lp-btn-lg">
              Get Started Free
            </Link>
          </div>
        </motion.div>
      </div>
    </section>

    {/* ── FOOTER ─────────────────────────────────────── */}
    <footer className="lp-footer">
      <div className="lp-container lp-footer-inner">
        <div className="lp-footer-brand">
          <div className="lp-footer-logo">
            <Mic size={20} className="lp-footer-logo-icon" />
            <span className="lp-footer-logo-text">VoicePro</span>
          </div>
          <p className="lp-footer-tagline">AI-powered productivity for focused execution.</p>
        </div>

        <div className="lp-footer-meta">
          <p className="lp-footer-copy">Made with ❤️ by Rida</p>
        </div>
      </div>
    </footer>
  </div>
);

export default LandingPage;
