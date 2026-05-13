import Link from "next/link";
import { ArrowRight, CheckCircle2, FileCheck2, LockKeyhole, ShieldCheck, Signature, Users } from "lucide-react";

const workflowItems = [
  {
    icon: <Users size={22} />,
    title: "Caregiver access",
    body: "Invite parents and guardians into child-specific records with separate view and upload permissions.",
  },
  {
    icon: <FileCheck2 size={22} />,
    title: "Intake checklist",
    body: "Keep required uploads, staff review, correction notes, and completed files in one organized workflow.",
  },
  {
    icon: <Signature size={22} />,
    title: "Signature tracking",
    body: "Send Dropbox Sign templates, track signature status, and store completed signed PDFs privately.",
  },
];

export default function HomePage() {
  return (
    <main className="abs-home">
      <CriticalHomeStyles />
      <section className="abs-home-hero">
        <AnimatedPortalGraphic />
        <div className="abs-home-shell">
          <header className="abs-home-header">
            <Link href="/" className="abs-home-brand">
              <span className="abs-home-logo">A</span>
              <span>
                <span className="abs-home-brand-name">ABS Connect</span>
                <span className="abs-home-brand-subtitle">Intake Portal</span>
              </span>
            </Link>
            <nav className="abs-home-nav">
              <Link href="/login" className="abs-home-button abs-home-button-secondary">
                Sign in
              </Link>
              <Link href="/signup" className="abs-home-button abs-home-button-secondary abs-home-button-signup">
                Sign up
              </Link>
              <Link href="/portal" className="abs-home-button abs-home-button-primary abs-home-button-portal">
                Open portal
              </Link>
            </nav>
          </header>

          <div className="abs-home-copy">
            <p className="abs-home-kicker">
              <ShieldCheck size={16} /> Secure child-centered intake
            </p>
            <h1>ABS Connect</h1>
            <p className="abs-home-lede">
              A focused portal for caregiver onboarding, child intake documents, staff review, and signature-ready paperwork.
            </p>
            <div className="abs-home-actions">
              <Link href="/login" className="abs-home-button abs-home-button-primary abs-home-button-large">
                Sign in <ArrowRight size={18} />
              </Link>
              <Link href="/signup" className="abs-home-button abs-home-button-secondary abs-home-button-large">
                Create account
              </Link>
              <Link href="/admin" className="abs-home-button abs-home-button-secondary abs-home-button-large">
                Staff back office
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="abs-home-workflow">
        <div className="abs-home-workflow-grid">
          {workflowItems.map((item) => (
            <article key={item.title} className="abs-home-card">
              <div className="abs-home-card-icon">{item.icon}</div>
              <h2>{item.title}</h2>
              <p>{item.body}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

function AnimatedPortalGraphic() {
  return (
    <div className="abs-home-art" aria-hidden="true">
      <div className="abs-home-side-panel" />
      <div className="abs-home-document abs-home-document-a">
        <div className="abs-home-doc-header">
          <span className="abs-home-blue-line" />
          <span className="abs-home-lock">
            <LockKeyhole size={16} />
          </span>
        </div>
        <span className="abs-home-skeleton abs-home-skeleton-wide" />
        <span className="abs-home-skeleton abs-home-skeleton-mid" />
        <span className="abs-home-skeleton abs-home-skeleton-long" />
        <div className="abs-home-color-grid">
          <span />
          <span />
          <span />
        </div>
      </div>

      <div className="abs-home-document abs-home-document-b">
        <div className="abs-home-doc-title">
          <span className="abs-home-file-icon">
            <FileCheck2 size={20} />
          </span>
          <span>
            <span className="abs-home-skeleton abs-home-skeleton-title" />
            <span className="abs-home-skeleton abs-home-skeleton-short" />
          </span>
        </div>
        <div className="abs-home-checklist">
          <WorkflowRow label="Insurance card" done />
          <WorkflowRow label="Photo ID" done />
          <WorkflowRow label="Consent" />
        </div>
      </div>

      <div className="abs-home-signature">
        <span>Signature packet</span>
        <span className="abs-home-signature-line" />
        <span className="abs-home-completed">
          <CheckCircle2 size={16} /> Completed
        </span>
      </div>

      <div className="abs-home-flow abs-home-flow-a" />
      <div className="abs-home-flow abs-home-flow-b" />
      <div className="abs-home-chip abs-home-chip-a">Uploaded</div>
      <div className="abs-home-chip abs-home-chip-b">In review</div>
    </div>
  );
}

function WorkflowRow({ label, done = false }: { label: string; done?: boolean }) {
  return (
    <div className="abs-home-row">
      <span>{label}</span>
      <span className={done ? "abs-home-row-check abs-home-row-check-done" : "abs-home-row-check"}>
        {done ? <CheckCircle2 size={15} /> : null}
      </span>
    </div>
  );
}

function CriticalHomeStyles() {
  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `
          .abs-home{min-height:100vh;background:#f7fafb;color:#0f172a;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
          .abs-home a{text-decoration:none}
          .abs-home-hero{position:relative;isolation:isolate;display:flex;min-height:92vh;overflow:hidden}
          .abs-home-shell{position:relative;z-index:2;width:100%;max-width:80rem;margin:0 auto;padding:1.25rem 1rem;display:flex;flex-direction:column;justify-content:space-between}
          .abs-home-header{display:flex;align-items:center;justify-content:space-between;gap:1rem}
          .abs-home-brand{display:flex;align-items:center;gap:.75rem;color:#0f172a}
          .abs-home-logo{display:flex;width:2.5rem;height:2.5rem;align-items:center;justify-content:center;border-radius:.5rem;background:#1767cc;color:#fff;font-weight:800}
          .abs-home-brand-name{display:block;font-weight:800;line-height:1.1}
          .abs-home-brand-subtitle{display:block;font-size:.75rem;color:#64748b}
          .abs-home-nav,.abs-home-actions{display:flex;align-items:center;gap:.75rem}
          .abs-home-button{display:inline-flex;align-items:center;justify-content:center;gap:.5rem;border-radius:.5rem;padding:.7rem 1rem;font-weight:750;box-shadow:0 1px 2px rgba(15,23,42,.08);transition:transform .18s ease,box-shadow .18s ease,background .18s ease}
          .abs-home-button:hover{transform:translateY(-1px);box-shadow:0 8px 22px rgba(15,23,42,.12)}
          .abs-home-button-primary{background:#1767cc;color:#fff}
          .abs-home-button-primary:hover{background:#1152a3}
          .abs-home-button-secondary{border:1px solid #cbd5e1;background:#fff;color:#334155}
          .abs-home-button-large{padding:.9rem 1.25rem}
          .abs-home-copy{max-width:46rem;padding:6rem 0 5rem}
          .abs-home-kicker{display:inline-flex;align-items:center;gap:.5rem;border:1px solid #cfe1df;border-radius:.5rem;background:#fff;padding:.55rem .8rem;color:#145d56;font-size:.875rem;font-weight:800;box-shadow:0 1px 2px rgba(15,23,42,.06)}
          .abs-home h1{margin:1.5rem 0 0;max-width:42rem;font-size:clamp(3.4rem,7vw,6.2rem);line-height:1.02;letter-spacing:0;font-weight:900;color:#020617}
          .abs-home-lede{margin:1.25rem 0 0;max-width:42rem;color:#475569;font-size:clamp(1.08rem,2vw,1.28rem);line-height:1.7}
          .abs-home-actions{margin-top:2rem;flex-wrap:wrap}
          .abs-home-art{pointer-events:none;position:absolute;inset:0;z-index:1}
          .abs-home-side-panel{position:absolute;inset-block:0;right:0;width:58%;background:#ecf4f1}
          .abs-home-document,.abs-home-signature,.abs-home-chip{box-shadow:0 24px 70px rgba(23,32,51,.14)}
          .abs-home-document{position:absolute;border:1px solid #d9e1e8;background:rgba(255,255,255,.94);backdrop-filter:blur(10px);border-radius:.5rem}
          .abs-home-document-a{right:clamp(1.5rem,8vw,8rem);top:17%;width:min(31rem,42vw);padding:1.35rem;animation:absHomeFloat 8s ease-in-out infinite}
          .abs-home-document-b{right:clamp(5rem,18vw,18rem);bottom:13%;width:min(24rem,34vw);padding:1.1rem;animation:absHomeFloat 9s ease-in-out 1.2s infinite}
          .abs-home-doc-header,.abs-home-doc-title{display:flex;align-items:center;justify-content:space-between;gap:.75rem}
          .abs-home-doc-title{justify-content:flex-start}
          .abs-home-blue-line{display:block;width:6rem;height:.75rem;border-radius:999px;background:#1767cc}
          .abs-home-lock,.abs-home-file-icon{display:flex;align-items:center;justify-content:center;border-radius:.5rem}
          .abs-home-lock{width:2rem;height:2rem;background:#e7f4f2;color:#145d56}
          .abs-home-file-icon{width:2.5rem;height:2.5rem;background:#1767cc;color:#fff}
          .abs-home-skeleton{display:block;height:.75rem;border-radius:999px;background:#e2e8f0}
          .abs-home-skeleton-wide{width:13rem;margin-top:1.25rem}.abs-home-skeleton-mid{width:11rem;margin-top:.75rem}.abs-home-skeleton-long{width:14rem;margin-top:.75rem}
          .abs-home-skeleton-title{width:7rem;background:#cbd5e1}.abs-home-skeleton-short{width:5rem;height:.5rem;margin-top:.55rem}
          .abs-home-color-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:.75rem;margin-top:1.75rem}
          .abs-home-color-grid span{height:4rem;border-radius:.5rem}.abs-home-color-grid span:nth-child(1){background:#ffe6cf}.abs-home-color-grid span:nth-child(2){background:#dff1ee}.abs-home-color-grid span:nth-child(3){background:#e8f0ff}
          .abs-home-checklist{display:grid;gap:.75rem;margin-top:1.5rem}
          .abs-home-row{display:flex;align-items:center;justify-content:space-between;border:1px solid #e2e8f0;border-radius:.5rem;background:#fff;padding:.6rem .75rem;color:#334155;font-size:.875rem;font-weight:750}
          .abs-home-row-check{display:flex;width:1.5rem;height:1.5rem;align-items:center;justify-content:center;border:2px solid #e0a05d;border-radius:999px;color:#fff}
          .abs-home-row-check-done{border-color:#145d56;background:#145d56}
          .abs-home-signature{position:absolute;right:clamp(1rem,6vw,6rem);bottom:25%;width:13rem;border:1px solid #cad9d6;border-radius:.5rem;background:#fffaf4;padding:1rem;animation:absHomeFloat 7.5s ease-in-out .5s infinite}
          .abs-home-signature>span:first-child{display:block;color:#145d56;font-size:.875rem;font-weight:800}
          .abs-home-signature-line{display:block;height:2.5rem;margin-top:.9rem;border-bottom:3px solid #e0a05d;border-radius:.5rem;transform-origin:left center;animation:absHomeTrace 3.8s ease-in-out infinite}
          .abs-home-completed{display:inline-flex;align-items:center;gap:.5rem;margin-top:.75rem;border-radius:.5rem;background:#145d56;color:#fff;padding:.55rem .8rem;font-size:.875rem;font-weight:800}
          .abs-home-flow{position:absolute;height:3px;border-radius:999px;background:#1767cc;opacity:.7;transform-origin:left center;animation:absHomeSlide 4.2s ease-in-out infinite}
          .abs-home-flow-a{right:29%;top:48%;width:min(16rem,20vw)}.abs-home-flow-b{right:15%;top:62%;width:min(10rem,15vw);animation-delay:.9s}
          .abs-home-chip{position:absolute;border:1px solid #d9e1e8;border-radius:.5rem;background:#fff;padding:.55rem .8rem;color:#145d56;font-size:.875rem;font-weight:800;animation:absHomePulse 3.8s ease-in-out infinite}
          .abs-home-chip-a{right:clamp(18rem,37vw,36rem);top:35%}.abs-home-chip-b{right:clamp(3rem,12vw,12rem);top:12%;animation-delay:1.4s}
          .abs-home-workflow{border-top:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;background:#fff}
          .abs-home-workflow-grid{max-width:80rem;margin:0 auto;padding:2rem 1rem;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:1rem}
          .abs-home-card{border:1px solid #e2e8f0;border-radius:.5rem;padding:1.25rem;background:#fff}
          .abs-home-card-icon{display:flex;width:2.5rem;height:2.5rem;align-items:center;justify-content:center;border-radius:.5rem;background:#e7f4f2;color:#145d56}
          .abs-home-card h2{margin:1rem 0 0;color:#0f172a;font-size:1.125rem}.abs-home-card p{margin:.5rem 0 0;color:#475569;font-size:.925rem;line-height:1.65}
          @keyframes absHomeFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-16px)}}@keyframes absHomePulse{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-8px) scale(1.03)}}@keyframes absHomeSlide{0%,100%{transform:scaleX(.2);opacity:.2}50%{transform:scaleX(1);opacity:.72}}@keyframes absHomeTrace{0%,100%{transform:scaleX(.18)}55%{transform:scaleX(1)}}
          @media (max-width:1023px){.abs-home-side-panel{display:none}.abs-home-document,.abs-home-signature,.abs-home-flow,.abs-home-chip{opacity:.16}.abs-home-document-a{right:-8rem;top:14%;width:24rem}.abs-home-document-b{right:-5rem;bottom:7%;width:21rem}.abs-home-signature{right:2rem;bottom:27%}.abs-home-workflow-grid{grid-template-columns:1fr}}
          @media (max-width:640px){.abs-home-shell{padding:1rem}.abs-home-button-portal,.abs-home-button-signup{display:none}.abs-home-copy{padding:5rem 0 4rem}.abs-home-actions{align-items:stretch}.abs-home-actions .abs-home-button{width:100%}.abs-home h1{font-size:3.5rem}}
          @media (prefers-reduced-motion:reduce){.abs-home-document-a,.abs-home-document-b,.abs-home-signature,.abs-home-signature-line,.abs-home-flow,.abs-home-chip{animation:none}}
        `,
      }}
    />
  );
}
