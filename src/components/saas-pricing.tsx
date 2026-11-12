// Copy of root saas-pricing-page.tsx — placed here so VoltCore can render /pricing directly.
// Usage in voltcore_erp: create src/app/pricing/page.tsx with:
//   import SaasPricing from "@/components/saas-pricing";
//   export default function Page(){ return <SaasPricing/> }

import { Check, Sparkles } from "lucide-react";

const PLANS = [
  {
    name: "Starter",
    price: "₹4,999",
    per: "/mo per platform",
    desc: "For single shop, school or team getting live fast.",
    cta: "Start Free Trial",
    features: ["1 SaaS platform of choice", "Up to 10 users", "1 location / 1 academy", "Cloud hosting + backups", "Email support"],
    highlight: false,
  },
  {
    name: "Growth",
    price: "₹9,999",
    per: "/mo any 2 platforms",
    desc: "Most popular. ERP+LMS or Marketing+Restaurant combos.",
    cta: "Start Free Trial",
    features: ["Any 2 SaaS platforms", "Up to 50 users", "Unlimited courses / products", "Custom domain + WhatsApp support", "Excel import + onboarding"],
    highlight: true,
  },
  {
    name: "Enterprise Suite",
    price: "₹19,999",
    per: "/mo all 4 platforms",
    desc: "Full suite: ERP + LMS + AI Marketing + Restaurant OS.",
    cta: "Book Live Demo",
    features: ["All 4 SaaS platforms", "Unlimited users, multi-branch", "API access + dedicated manager", "99.9% uptime SLA", "Priority phone support"],
    highlight: false,
  },
];

export default function SaasPricing() {
  return (
    <section className="py-16 px-4 max-w-6xl mx-auto">
      <div className="text-center mb-10">
        <span className="inline-flex items-center gap-1 text-xs font-semibold bg-black text-white px-3 py-1 rounded-full">
          <Sparkles size={12} /> 100% Cloud SaaS — No servers, no source-code setup
        </span>
        <h1 className="text-4xl font-bold mt-4">One Subscription. Four Powerful SaaS Platforms.</h1>
        <p className="text-gray-600 mt-3 max-w-2xl mx-auto">
          ERP, LMS, AI Marketing & Restaurant OS — cloud-hosted, live in days, not months.
          Just login and scale. Cancel anytime.
        </p>
      </div>
      <div className="grid md:grid-cols-3 gap-6">
        {PLANS.map((p) => (
          <div key={p.name} className={`rounded-2xl border p-6 flex flex-col ${p.highlight ? "border-black shadow-xl scale-[1.02]" : "border-gray-200"}`}>
            {p.highlight && <span className="text-xs font-bold bg-black text-white w-fit px-2 py-1 rounded">MOST POPULAR</span>}
            <h3 className="font-bold text-lg mt-2">{p.name}</h3>
            <div className="mt-2"><span className="text-3xl font-extrabold">{p.price}</span><span className="text-sm text-gray-500">{p.per}</span></div>
            <p className="text-sm text-gray-600 mt-2">{p.desc}</p>
            <ul className="mt-4 space-y-2 text-sm flex-1">
              {p.features.map((f) => (
                <li key={f} className="flex gap-2"><Check size={16} className="mt-0.5 shrink-0" />{f}</li>
              ))}
            </ul>
            <a href={`/signup?plan=${p.name.toLowerCase()}`} className={`mt-6 text-center rounded-xl py-3 font-semibold ${p.highlight ? "bg-black text-white" : "bg-gray-100"}`}>
              {p.cta}
            </a>
          </div>
        ))}
      </div>
      <p className="text-center text-xs text-gray-500 mt-6">
        All plans SaaS hosted. No server cost. No license fee. 14-day free trial. GST extra.
      </p>
      <footer className="text-center text-xs text-gray-500 mt-12 border-t pt-6">
        © 2026 YourBrand • 100% Cloud SaaS • Terms • Privacy • SLA & Uptime • Status: All systems operational
      </footer>
    </section>
  );
}
