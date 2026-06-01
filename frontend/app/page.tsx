"use client";

import { useUser, SignUpButton, SignInButton } from "@clerk/nextjs";
import { motion, useScroll, useTransform } from "framer-motion";
import {
  ArrowRight,
  CheckCircle2,
  CloudUpload,
  Cpu,
  FileText,
  HeartHandshake,
  LayoutDashboard,
  Loader2,
  Shield,
  Sparkles,
  Star,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const fadeInUp = {
  hidden: { opacity: 0, y: 40 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.12, duration: 0.6, ease: "easeOut" },
  }),
};

const stagger = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 },
  },
};

const pricingPlans = [
  {
    name: "Explorer",
    price: "$0",
    period: "forever",
    description: "See who's out there before committing.",
    features: [
      "Browse up to 5 matches per week",
      "Basic profile & tech stack",
      "Email support",
    ],
    cta: "Get Started Free",
    highlighted: false,
  },
  {
    name: "Founder",
    price: "$19",
    period: "/month",
    description: "Unlimited matching for serious founders.",
    features: [
      "Unlimited matches & messaging",
      "Pitch deck AI parsing",
      "Verified skill badges",
      "Priority support",
      "Advanced compatibility scoring",
    ],
    cta: "Start Free Trial",
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "$99",
    period: "/month",
    description: "For startup studios and accelerators.",
    features: [
      "Everything in Founder",
      "Background check credits ($50 ea)",
      "Bulk onboarding & admin panel",
      "Dedicated account manager",
      "Custom API access",
    ],
    cta: "Contact Sales",
    highlighted: false,
  },
];

const steps = [
  {
    icon: CloudUpload,
    title: "Upload Your Pitch Deck",
    description:
      "Drag and drop your PDF. Our AI extracts your tech stack, stage, availability, and goals automatically.",
  },
  {
    icon: Cpu,
    title: "AI Compatibility Scoring",
    description:
      "Our algorithm matches you based on skills, stage, and preferences — not just keywords.",
  },
  {
    icon: HeartHandshake,
    title: "Connect & Build",
    description:
      "Chat with matched co-founders, verify each other's skills, and start building together.",
  },
];

const testimonials = [
  {
    name: "Sarah Chen",
    role: "Co-founder of LambdaStack",
    avatar: "SC",
    content:
      "Goon found me a technical co-founder in 3 days. The pitch deck parsing was scarily accurate — it knew my stack better than I did.",
    rating: 5,
  },
  {
    name: "Marcus Rivera",
    role: "Founder of PlantAI",
    avatar: "MR",
    content:
      "I'd spent months on other platforms. Goon's compatibility scoring is on another level — we had our first prototype in two weeks.",
    rating: 5,
  },
  {
    name: "Priya Patel",
    role: "CTO of FinFlow",
    avatar: "PP",
    content:
      "The verified skill badges completely changed the game. I could instantly see who actually had the DevOps experience they claimed.",
    rating: 5,
  },
];

function Navbar() {
  const { isLoaded, isSignedIn, user } = useUser();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-white/90 dark:bg-zinc-950/90 backdrop-blur-xl border-b border-zinc-200/60 dark:border-zinc-800/60 shadow-sm"
          : "bg-transparent"
      }`}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 text-xs font-bold text-white">
              G
            </div>
            <span className="text-lg font-bold tracking-tight">Goon</span>
          </Link>

          <div className="hidden items-center gap-8 md:flex">
            <Link
              href="#how-it-works"
              className="text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              How It Works
            </Link>
            <Link
              href="#features"
              className="text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              Features
            </Link>
            <Link
              href="#pricing"
              className="text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              Pricing
            </Link>
            {isLoaded && isSignedIn ? (
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-violet-500/20 transition-all hover:shadow-xl hover:shadow-violet-500/30 hover:scale-105"
              >
                Dashboard
                <LayoutDashboard className="h-4 w-4" />
              </Link>
            ) : (
              <SignUpButton mode="modal">
                <button className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-violet-500/20 transition-all hover:shadow-xl hover:shadow-violet-500/30 hover:scale-105">
                  Get Started
                  <ArrowRight className="h-4 w-4" />
                </button>
              </SignUpButton>
            )}
          </div>

          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-zinc-600 transition-colors hover:bg-zinc-100 md:hidden dark:text-zinc-400 dark:hover:bg-zinc-800"
            aria-label="Toggle menu"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              {mobileOpen ? (
                <path d="M18 6L6 18M6 6l12 12" />
              ) : (
                <>
                  <path d="M4 6h16" />
                  <path d="M4 12h16" />
                  <path d="M4 18h16" />
                </>
              )}
            </svg>
          </button>
        </div>

        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="border-t border-zinc-200 pb-4 pt-2 md:hidden dark:border-zinc-800"
          >
            <div className="flex flex-col gap-2">
              <Link
                href="#how-it-works"
                onClick={() => setMobileOpen(false)}
                className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                How It Works
              </Link>
              <Link
                href="#features"
                onClick={() => setMobileOpen(false)}
                className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                Features
              </Link>
              <Link
                href="#pricing"
                onClick={() => setMobileOpen(false)}
                className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                Pricing
              </Link>
              {isLoaded && isSignedIn ? (
                <Link
                  href="/dashboard"
                  onClick={() => setMobileOpen(false)}
                  className="mt-2 inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2 text-sm font-semibold text-white"
                >
                  Dashboard
                  <LayoutDashboard className="h-4 w-4" />
                </Link>
              ) : (
                <SignUpButton mode="modal">
                  <button
                    onClick={() => setMobileOpen(false)}
                    className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2 text-sm font-semibold text-white"
                  >
                    Get Started
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </SignUpButton>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </nav>
  );
}

function HeroSection() {
  const { isLoaded, isSignedIn } = useUser();
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const opacity = useTransform(scrollYProgress, [0, 1], [1, 0]);
  const y = useTransform(scrollYProgress, [0, 1], [0, 100]);

  return (
    <motion.section
      ref={ref}
      style={{ opacity }}
      className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4"
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-violet-50/50 to-white dark:from-zinc-950/50 dark:to-zinc-950" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(139,92,246,0.15),transparent)]" />

      <motion.div
        style={{ y }}
        className="relative z-10 mx-auto max-w-4xl text-center"
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-6 inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700 dark:border-violet-800/50 dark:bg-violet-950/50 dark:text-violet-300"
        >
          <Sparkles className="h-3.5 w-3.5" />
          AI-Powered Co-Founder Matching
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-4xl font-bold leading-tight tracking-tight sm:text-6xl md:text-7xl lg:text-8xl"
        >
          Find Your{" "}
          <span className="bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
            Perfect Co-Founder
          </span>{" "}
          with AI
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-zinc-600 dark:text-zinc-400 sm:text-xl"
        >
          Upload your pitch deck, and let our AI match you with complementary
          co-founders based on real skills, stage, and goals — not just buzzwords.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
        >
          {!isLoaded ? (
            <div className="flex items-center gap-2 rounded-xl bg-zinc-100 px-6 py-3 text-sm font-medium text-zinc-400 dark:bg-zinc-800">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading...
            </div>
          ) : isSignedIn ? (
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-violet-500/20 transition-all hover:shadow-xl hover:shadow-violet-500/30 hover:scale-105"
            >
              Go to Dashboard
              <LayoutDashboard className="h-5 w-5" />
            </Link>
          ) : (
            <>
              <SignUpButton mode="modal">
                <button className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-violet-500/20 transition-all hover:shadow-xl hover:shadow-violet-500/30 hover:scale-105">
                  Get Started Free
                  <ArrowRight className="h-5 w-5" />
                </button>
              </SignUpButton>
              <SignInButton mode="modal">
                <button className="inline-flex items-center gap-2 rounded-xl border border-zinc-300 bg-white px-8 py-3.5 text-base font-semibold text-zinc-900 transition-all hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800">
                  Sign In
                </button>
              </SignInButton>
            </>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-zinc-500 dark:text-zinc-500"
        >
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            AI Pitch Parsing
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            Verified Skill Badges
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            Real-Time Matching
          </span>
        </motion.div>
      </motion.div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="text-zinc-400"
        >
          <path d="M12 5v14M19 12l-7 7-7-7" />
        </svg>
      </div>
    </motion.section>
  );
}

function HowItWorksSection() {
  return (
    <section id="how-it-works" className="relative bg-zinc-50 py-24 dark:bg-zinc-900/50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={stagger}
          className="text-center"
        >
          <motion.span
            variants={fadeInUp}
            className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700 dark:border-violet-800/50 dark:bg-violet-950/50 dark:text-violet-300"
          >
            <Zap className="h-3.5 w-3.5" />
            How It Works
          </motion.span>
          <motion.h2
            variants={fadeInUp}
            className="text-3xl font-bold tracking-tight sm:text-4xl"
          >
            Three Steps to Your Perfect Match
          </motion.h2>
          <motion.p
            variants={fadeInUp}
            className="mx-auto mt-4 max-w-2xl text-lg text-zinc-600 dark:text-zinc-400"
          >
            No endless swiping. No stale profiles. Just intelligent matching
            based on what actually matters.
          </motion.p>
        </motion.div>

        <div className="mt-16 grid gap-8 md:grid-cols-3">
          {steps.map((step, i) => (
            <motion.div
              key={step.title}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-60px" }}
              variants={fadeInUp}
              custom={i}
              className="group relative rounded-2xl border border-zinc-200 bg-white p-8 transition-all hover:shadow-lg hover:border-violet-200 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-violet-800"
            >
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-100 to-indigo-100 text-violet-700 dark:from-violet-900/50 dark:to-indigo-900/50 dark:text-violet-300">
                <step.icon className="h-7 w-7" />
              </div>
              <div className="mb-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-violet-600 text-xs font-bold text-white">
                {i + 1}
              </div>
              <h3 className="mt-3 text-xl font-semibold">{step.title}</h3>
              <p className="mt-2 leading-relaxed text-zinc-600 dark:text-zinc-400">
                {step.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeaturesSection() {
  const features = [
    {
      icon: FileText,
      title: "Pitch Deck AI Parsing",
      description:
        "Upload your PDF and our parser extracts tech stack, business stage, availability, and founder preferences with high accuracy.",
    },
    {
      icon: Cpu,
      title: "Smart Compatibility Algorithm",
      description:
        "Multi-dimensional scoring that considers complementary skills, stage alignment, availability overlap, and domain experience.",
    },
    {
      icon: Shield,
      title: "Verified Skill Badges",
      description:
        "Co-founders verify each other's skills post-match, building a trusted network of validated expertise.",
    },
    {
      icon: LayoutDashboard,
      title: "Live Matching Dashboard",
      description:
        "Real-time dashboard with filterable matches, compatibility scores, and direct messaging to move fast.",
    },
    {
      icon: Star,
      title: "Background Checks",
      description:
        "Optional thorough background verification for trust-sensitive partnerships. One-time fee, comprehensive report.",
    },
    {
      icon: Zap,
      title: "Real-Time Notifications",
      description:
        "Get instant alerts when a high-compatibility match appears. Never miss a potential co-founder again.",
    },
  ];

  return (
    <section id="features" className="py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={stagger}
          className="text-center"
        >
          <motion.span
            variants={fadeInUp}
            className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700 dark:border-violet-800/50 dark:bg-violet-950/50 dark:text-violet-300"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Features
          </motion.span>
          <motion.h2
            variants={fadeInUp}
            className="text-3xl font-bold tracking-tight sm:text-4xl"
          >
            Everything You Need to Find The One
          </motion.h2>
          <motion.p
            variants={fadeInUp}
            className="mx-auto mt-4 max-w-2xl text-lg text-zinc-600 dark:text-zinc-400"
          >
            Purpose-built tools that make co-founder matching fast, accurate,
            and trustworthy.
          </motion.p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          variants={stagger}
          className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
        >
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              variants={fadeInUp}
              custom={i}
              className="group rounded-xl border border-zinc-200 bg-white p-6 transition-all hover:border-violet-200 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-violet-800"
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-100 to-indigo-100 text-violet-700 dark:from-violet-900/50 dark:to-indigo-900/50 dark:text-violet-300">
                <feature.icon className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

function PricingSection() {
  const [billingInterval, setBillingInterval] = useState<"monthly" | "annual">(
    "monthly"
  );

  return (
    <section id="pricing" className="bg-zinc-50 py-24 dark:bg-zinc-900/50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={stagger}
          className="text-center"
        >
          <motion.span
            variants={fadeInUp}
            className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700 dark:border-violet-800/50 dark:bg-violet-950/50 dark:text-violet-300"
          >
            <Star className="h-3.5 w-3.5" />
            Pricing
          </motion.span>
          <motion.h2
            variants={fadeInUp}
            className="text-3xl font-bold tracking-tight sm:text-4xl"
          >
            Simple, Transparent Pricing
          </motion.h2>
          <motion.p
            variants={fadeInUp}
            className="mx-auto mt-4 max-w-2xl text-lg text-zinc-600 dark:text-zinc-400"
          >
            Start free. Upgrade when you&apos;re ready to find your perfect
            co-founder.
          </motion.p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-40px" }}
          variants={fadeInUp}
          className="mt-8 flex items-center justify-center gap-3"
        >
          <button
            onClick={() => setBillingInterval("monthly")}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              billingInterval === "monthly"
                ? "bg-violet-600 text-white shadow-sm"
                : "bg-white text-zinc-600 hover:bg-zinc-100 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800"
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingInterval("annual")}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              billingInterval === "annual"
                ? "bg-violet-600 text-white shadow-sm"
                : "bg-white text-zinc-600 hover:bg-zinc-100 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800"
            }`}
          >
            Annual{" "}
            <span className="ml-1 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
              Save 20%
            </span>
          </button>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          variants={stagger}
          className="mt-10 grid gap-8 lg:grid-cols-3"
        >
          {pricingPlans.map((plan, i) => (
            <motion.div
              key={plan.name}
              variants={fadeInUp}
              custom={i}
              className={`relative flex flex-col rounded-2xl border p-8 transition-all hover:shadow-lg ${
                plan.highlighted
                  ? "border-violet-300 bg-white shadow-xl shadow-violet-500/10 dark:border-violet-700 dark:bg-zinc-900"
                  : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
              }`}
            >
              {plan.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-1 text-xs font-semibold text-white shadow-sm">
                  Most Popular
                </div>
              )}
              <h3 className="text-lg font-semibold">{plan.name}</h3>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-4xl font-bold tracking-tight">
                  {plan.price}
                </span>
                <span className="text-sm text-zinc-500">{plan.period}</span>
              </div>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                {plan.description}
              </p>
              <ul className="mt-6 flex flex-col gap-3">
                {plan.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300"
                  >
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                    {feature}
                  </li>
                ))}
              </ul>
              <div className="mt-8">
                <button
                  className={`w-full rounded-xl py-3 text-sm font-semibold transition-all ${
                    plan.highlighted
                      ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/20 hover:shadow-xl hover:shadow-violet-500/30 hover:scale-[1.02]"
                      : "border border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
                  }`}
                >
                  {plan.cta}
                </button>
              </div>
            </motion.div>
          ))}
        </motion.div>

        <motion.p
          variants={fadeInUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="mt-10 text-center text-sm text-zinc-500"
        >
          All plans include a 14-day free trial. No credit card required.
          Background checks available for $50–$150 one-time.
        </motion.p>
      </div>
    </section>
  );
}

function TestimonialsSection() {
  return (
    <section className="py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={stagger}
          className="text-center"
        >
          <motion.span
            variants={fadeInUp}
            className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700 dark:border-violet-800/50 dark:bg-violet-950/50 dark:text-violet-300"
          >
            <HeartHandshake className="h-3.5 w-3.5" />
            Testimonials
          </motion.span>
          <motion.h2
            variants={fadeInUp}
            className="text-3xl font-bold tracking-tight sm:text-4xl"
          >
            Loved by Founders Everywhere
          </motion.h2>
          <motion.p
            variants={fadeInUp}
            className="mx-auto mt-4 max-w-2xl text-lg text-zinc-600 dark:text-zinc-400"
          >
            Hear from founders who found their match on Goon.
          </motion.p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          variants={stagger}
          className="mt-16 grid gap-8 md:grid-cols-3"
        >
          {testimonials.map((t, i) => (
            <motion.div
              key={t.name}
              variants={fadeInUp}
              custom={i}
              className="rounded-2xl border border-zinc-200 bg-white p-6 transition-all hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="flex items-center gap-1">
                {Array.from({ length: t.rating }).map((_, j) => (
                  <Star
                    key={j}
                    className="h-4 w-4 fill-amber-400 text-amber-400"
                  />
                ))}
              </div>
              <p className="mt-4 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                &ldquo;{t.content}&rdquo;
              </p>
              <div className="mt-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-xs font-bold text-white">
                  {t.avatar}
                </div>
                <div>
                  <p className="text-sm font-semibold">{t.name}</p>
                  <p className="text-xs text-zinc-500">{t.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

function StatsSection() {
  const stats = [
    { value: "10K+", label: "Founders Matched" },
    { value: "48h", label: "Avg. Time to Match" },
    { value: "92%", label: "Satisfaction Rate" },
    { value: "150+", label: "Startups Launched" },
  ];

  return (
    <section className="border-y border-zinc-200 bg-gradient-to-r from-violet-600 to-indigo-600 py-16 dark:border-zinc-800">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="text-center"
            >
              <p className="text-4xl font-bold text-white">{stat.value}</p>
              <p className="mt-1 text-sm text-violet-200">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CtaSection() {
  const { isLoaded, isSignedIn } = useUser();

  return (
    <section className="py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-600 via-violet-700 to-indigo-700 px-8 py-16 text-center sm:px-16"
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(255,255,255,0.15),transparent)]" />
          <div className="relative z-10">
            <h2 className="text-3xl font-bold text-white sm:text-4xl">
              Ready to Find Your Co-Founder?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-violet-200">
              Join thousands of founders who found their perfect match. Start
              free, upgrade when you&apos;re ready.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              {!isLoaded ? (
                <div className="inline-flex items-center gap-2 rounded-xl bg-white/20 px-8 py-3.5 text-base font-semibold text-white backdrop-blur-sm">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading...
                </div>
              ) : isSignedIn ? (
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-3.5 text-base font-semibold text-violet-700 shadow-lg transition-all hover:bg-violet-50 hover:scale-105"
                >
                  Go to Dashboard
                  <LayoutDashboard className="h-5 w-5" />
                </Link>
              ) : (
                <>
                  <SignUpButton mode="modal">
                    <button className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-3.5 text-base font-semibold text-violet-700 shadow-lg transition-all hover:bg-violet-50 hover:scale-105">
                      Get Started Free
                      <ArrowRight className="h-5 w-5" />
                    </button>
                  </SignUpButton>
                  <SignInButton mode="modal">
                    <button className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-8 py-3.5 text-base font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/20">
                      Sign In
                    </button>
                  </SignInButton>
                </>
              )}
            </div>
            <p className="mt-4 text-sm text-violet-300">
              No credit card required. 14-day free trial on all plans.
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-zinc-200 py-12 dark:border-zinc-800">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 text-[10px] font-bold text-white">
              G
            </div>
            <span className="text-sm font-bold">Goon</span>
          </div>
          <div className="flex flex-wrap items-center gap-6 text-sm text-zinc-500">
            <Link
              href="#how-it-works"
              className="transition-colors hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              How It Works
            </Link>
            <Link
              href="#features"
              className="transition-colors hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              Features
            </Link>
            <Link
              href="#pricing"
              className="transition-colors hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              Pricing
            </Link>
          </div>
          <p className="text-xs text-zinc-400">
            &copy; {new Date().getFullYear()} Goon. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <Navbar />
      <main>
        <HeroSection />
        <StatsSection />
        <HowItWorksSection />
        <FeaturesSection />
        <PricingSection />
        <TestimonialsSection />
        <CtaSection />
      </main>
      <Footer />
    </div>
  );
}
