import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";

const crewNotes = ["Crew", "Waiver", "Heat", "Dock"];

export default function HomePage() {
  return (
    <main className="paddle-home">
      <CriticalHomeStyles />
      <section className="paddle-hero">
        <RaceScene />
        <div className="paddle-shell">
          <header className="paddle-header">
            <Link href="/" className="paddle-brand" aria-label="PaddlePass home">
              <Image src="/dbf-logo.svg" alt="" width={104} height={68} className="paddle-brand-mark" priority />
              <span>
                <span className="paddle-brand-name">PaddlePass</span>
                <span className="paddle-brand-subtitle">Dragon boat festival</span>
              </span>
            </Link>
            <nav className="paddle-nav" aria-label="Primary">
              <Link href="/login" className="paddle-button paddle-button-ghost">
                Sign in
              </Link>
              <Link href="/portal" className="paddle-button paddle-button-primary">
                Enter portal <ArrowRight size={18} />
              </Link>
            </nav>
          </header>

          <div className="paddle-copy">
            <Image src="/dbf-logo.svg" alt="Dragon boat race logo" width={520} height={340} className="paddle-hero-logo" priority />
            <p className="paddle-kicker">Race day, crew first</p>
            <h1>PaddlePass</h1>
            <p className="paddle-lede">Your team space before the drums start.</p>
            <div className="paddle-actions">
              <Link href="/portal" className="paddle-button paddle-button-primary paddle-button-large">
                Enter portal <ArrowRight size={18} />
              </Link>
              <Link href="/login" className="paddle-button paddle-button-ghost paddle-button-large">
                Team sign in
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="paddle-raceband" aria-label="Team view">
        <div className="paddle-raceband-inner">
          <div className="paddle-scoreboard">
            {crewNotes.map((item, index) => (
              <div key={item} className="paddle-score-tile" style={{ animationDelay: `${index * 0.14}s` }}>
                <span>{item}</span>
                <strong>{index === 0 ? "Ready" : index === 1 ? "Set" : index === 2 ? "Soon" : "Go"}</strong>
              </div>
            ))}
          </div>
          <div className="paddle-current">
            <span />
            <span />
            <span />
          </div>
        </div>
      </section>
    </main>
  );
}

function RaceScene() {
  return (
    <div className="paddle-scene" aria-hidden="true">
      <div className="paddle-sun" />
      <Image src="/dbf-logo.svg" alt="" width={520} height={340} className="paddle-scene-logo" priority />
      <div className="paddle-boat">
        <span className="paddle-dragon-head" />
        <span className="paddle-hull" />
        {Array.from({ length: 7 }).map((_, index) => (
          <span key={index} className="paddle-paddler" style={{ animationDelay: `${index * 0.12}s` }}>
            <i />
          </span>
        ))}
      </div>
      <div className="paddle-waves paddle-waves-a" />
      <div className="paddle-waves paddle-waves-b" />
      <div className="paddle-waves paddle-waves-c" />
      <div className="paddle-lane paddle-lane-a" />
      <div className="paddle-lane paddle-lane-b" />
      <div className="paddle-spark paddle-spark-a" />
      <div className="paddle-spark paddle-spark-b" />
      <div className="paddle-spark paddle-spark-c" />
    </div>
  );
}

function CriticalHomeStyles() {
  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `
          :root{--dbf-green:#00734e;--dbf-green-dark:#005f46;--dbf-red:#f4311f;--dbf-ink:#062318;--dbf-mist:#f5fbf8;--dbf-cream:#fff8ef}
          .paddle-home{min-height:100vh;background:var(--dbf-mist);color:var(--dbf-ink);font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;overflow:hidden}
          .paddle-home a{text-decoration:none}
          .paddle-hero{position:relative;isolation:isolate;min-height:88vh;overflow:hidden;background:linear-gradient(180deg,#fffaf2 0%,#eef8f2 54%,#d9f0e7 100%)}
          .paddle-shell{position:relative;z-index:3;width:100%;max-width:82rem;margin:0 auto;min-height:88vh;padding:1rem;display:flex;flex-direction:column}
          .paddle-header{display:flex;align-items:center;justify-content:space-between;gap:1rem}
          .paddle-brand{display:flex;align-items:center;gap:.75rem;color:var(--dbf-ink)}
          .paddle-brand-mark{width:4rem;height:2.75rem;object-fit:contain}
          .paddle-brand-name{display:block;font-size:1.05rem;font-weight:900;line-height:1;letter-spacing:0;color:var(--dbf-green-dark)}
          .paddle-brand-subtitle{display:block;margin-top:.18rem;font-size:.72rem;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:var(--dbf-red)}
          .paddle-nav,.paddle-actions{display:flex;align-items:center;gap:.75rem;flex-wrap:wrap}
          .paddle-button{display:inline-flex;align-items:center;justify-content:center;gap:.5rem;border-radius:.5rem;padding:.72rem 1rem;font-weight:900;line-height:1;transition:transform .18s ease,box-shadow .18s ease,background .18s ease,color .18s ease}
          .paddle-button:hover{transform:translateY(-2px)}
          .paddle-button-primary{border:2px solid var(--dbf-green);background:var(--dbf-green);color:#fff;box-shadow:0 16px 36px rgba(0,115,78,.2)}
          .paddle-button-primary:hover{background:var(--dbf-green-dark);border-color:var(--dbf-green-dark);box-shadow:0 18px 44px rgba(0,95,70,.24)}
          .paddle-button-ghost{border:2px solid rgba(0,115,78,.18);background:rgba(255,255,255,.72);color:var(--dbf-green-dark);box-shadow:0 10px 24px rgba(6,35,24,.08);backdrop-filter:blur(14px)}
          .paddle-button-large{padding:1rem 1.2rem}
          .paddle-copy{position:relative;z-index:4;max-width:42rem;margin-top:auto;padding:4.5rem 0 5rem}
          .paddle-hero-logo{width:min(24rem,74vw);height:auto;margin:0 0 .5rem -1rem;filter:drop-shadow(0 24px 30px rgba(0,95,70,.16));animation:paddleLogoRise .9s ease both}
          .paddle-kicker{display:inline-flex;margin:0;border:2px solid rgba(244,49,31,.22);border-radius:.5rem;background:rgba(255,255,255,.72);padding:.55rem .8rem;color:var(--dbf-red);font-size:.86rem;font-weight:950;text-transform:uppercase;letter-spacing:.12em;box-shadow:0 12px 28px rgba(244,49,31,.12);backdrop-filter:blur(14px)}
          .paddle-home h1{margin:.85rem 0 0;font-size:clamp(4.1rem,10vw,7.7rem);line-height:.88;font-weight:1000;letter-spacing:0;color:var(--dbf-green-dark);text-shadow:0 8px 0 rgba(244,49,31,.12)}
          .paddle-lede{margin:1.2rem 0 0;max-width:34rem;color:#174333;font-size:clamp(1.2rem,2.2vw,1.7rem);line-height:1.45;font-weight:800}
          .paddle-actions{margin-top:2rem}
          .paddle-scene{position:absolute;inset:0;z-index:1;pointer-events:none}
          .paddle-sun{position:absolute;right:8vw;top:7vh;width:min(38rem,48vw);aspect-ratio:1;border-radius:999px;background:var(--dbf-red);box-shadow:0 0 0 26px rgba(244,49,31,.07),0 26px 70px rgba(244,49,31,.22);animation:paddleSunPulse 7s ease-in-out infinite}
          .paddle-scene-logo{position:absolute;right:4vw;top:5vh;width:min(38rem,52vw);height:auto;opacity:.24;filter:drop-shadow(0 18px 24px rgba(0,95,70,.12));animation:paddleLogoDrift 9s ease-in-out infinite}
          .paddle-boat{position:absolute;right:4vw;bottom:11vh;width:min(44rem,59vw);height:12rem;animation:paddleBoatGlide 5.5s ease-in-out infinite}
          .paddle-hull{position:absolute;left:8%;right:4%;bottom:1.5rem;height:3rem;border-radius:100% 20% 52% 46%;background:var(--dbf-green);box-shadow:0 20px 36px rgba(0,95,70,.22)}
          .paddle-dragon-head{position:absolute;left:0;bottom:3.3rem;width:7rem;height:5.2rem;border:1rem solid var(--dbf-green);border-right:0;border-bottom:0;border-radius:70% 20% 0 0;transform:rotate(-10deg)}
          .paddle-dragon-head:before{content:"";position:absolute;left:-1.2rem;top:.55rem;width:2.1rem;height:2.1rem;border:8px solid var(--dbf-green);border-right:0;border-bottom:0;border-radius:80% 10% 0 0;transform:rotate(-26deg)}
          .paddle-dragon-head:after{content:"";position:absolute;right:-1.2rem;bottom:-1.5rem;width:6.5rem;height:1rem;border-radius:999px;background:var(--dbf-red)}
          .paddle-paddler{position:absolute;bottom:4.4rem;width:2.9rem;height:4.6rem;transform-origin:50% 100%;animation:paddleStroke 1.18s ease-in-out infinite}
          .paddle-paddler:nth-of-type(3){left:20%}.paddle-paddler:nth-of-type(4){left:30%}.paddle-paddler:nth-of-type(5){left:40%}.paddle-paddler:nth-of-type(6){left:50%}.paddle-paddler:nth-of-type(7){left:60%}.paddle-paddler:nth-of-type(8){left:70%}.paddle-paddler:nth-of-type(9){left:80%}
          .paddle-paddler:before{content:"";position:absolute;left:.9rem;top:0;width:1.05rem;height:1.05rem;border-radius:999px;background:var(--dbf-green-dark)}
          .paddle-paddler:after{content:"";position:absolute;left:.7rem;top:1rem;width:1.45rem;height:2.3rem;border-radius:1rem 1rem .4rem .4rem;background:var(--dbf-green)}
          .paddle-paddler i{position:absolute;left:2rem;top:.8rem;width:.42rem;height:5.4rem;border-radius:999px;background:var(--dbf-red);transform:rotate(-28deg);transform-origin:50% 12%}
          .paddle-waves{position:absolute;left:-8rem;right:-8rem;height:6rem;border-top:10px solid var(--dbf-green);border-radius:50%;opacity:.95;animation:paddleWave 6s linear infinite}
          .paddle-waves-a{bottom:8vh}.paddle-waves-b{bottom:4vh;animation-duration:7.5s;opacity:.68}.paddle-waves-c{bottom:0;animation-duration:9s;opacity:.45}
          .paddle-lane{position:absolute;width:18rem;height:3px;border-radius:999px;background:rgba(244,49,31,.56);animation:paddleLane 4.2s ease-in-out infinite}
          .paddle-lane-a{left:18vw;top:29vh}.paddle-lane-b{right:22vw;top:63vh;animation-delay:1s}
          .paddle-spark{position:absolute;width:.7rem;height:.7rem;border-radius:999px;background:var(--dbf-red);box-shadow:0 0 0 9px rgba(244,49,31,.11);animation:paddleSpark 3.6s ease-in-out infinite}
          .paddle-spark-a{left:10vw;top:23vh}.paddle-spark-b{right:15vw;top:18vh;animation-delay:.8s}.paddle-spark-c{left:44vw;bottom:24vh;animation-delay:1.6s}
          .paddle-raceband{position:relative;z-index:5;background:var(--dbf-green-dark);color:#fff;overflow:hidden}
          .paddle-raceband-inner{position:relative;max-width:82rem;margin:0 auto;padding:1.2rem 1rem 1.7rem}
          .paddle-scoreboard{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:.75rem}
          .paddle-score-tile{border:1px solid rgba(255,255,255,.18);border-radius:.5rem;background:rgba(255,255,255,.08);padding:1rem;box-shadow:inset 0 1px 0 rgba(255,255,255,.12);animation:paddleTileRise .7s ease both}
          .paddle-score-tile span{display:block;color:#bfe5d7;font-size:.75rem;font-weight:900;text-transform:uppercase;letter-spacing:.14em}
          .paddle-score-tile strong{display:block;margin-top:.35rem;color:#fff;font-size:1.3rem;line-height:1;font-weight:1000}
          .paddle-current{position:absolute;left:0;right:0;bottom:0;height:.45rem;display:grid;grid-template-columns:repeat(3,1fr)}
          .paddle-current span:nth-child(1){background:var(--dbf-red)}.paddle-current span:nth-child(2){background:#fff}.paddle-current span:nth-child(3){background:var(--dbf-green)}
          @keyframes paddleLogoRise{from{opacity:0;transform:translateY(18px) scale(.96)}to{opacity:1;transform:translateY(0) scale(1)}}
          @keyframes paddleLogoDrift{0%,100%{transform:translateY(0) rotate(-2deg)}50%{transform:translateY(-18px) rotate(2deg)}}
          @keyframes paddleSunPulse{0%,100%{transform:scale(1);opacity:.98}50%{transform:scale(1.035);opacity:.9}}
          @keyframes paddleBoatGlide{0%,100%{transform:translateX(0) translateY(0)}50%{transform:translateX(-18px) translateY(-9px)}}
          @keyframes paddleStroke{0%,100%{transform:rotate(-4deg)}50%{transform:rotate(10deg)}}
          @keyframes paddleWave{from{transform:translateX(-8rem)}to{transform:translateX(8rem)}}
          @keyframes paddleLane{0%,100%{transform:scaleX(.22);opacity:.18}50%{transform:scaleX(1);opacity:.7}}
          @keyframes paddleSpark{0%,100%{transform:translateY(0) scale(.8);opacity:.45}50%{transform:translateY(-16px) scale(1.15);opacity:1}}
          @keyframes paddleTileRise{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
          @media (max-width:980px){.paddle-shell{min-height:86vh}.paddle-scene-logo{right:-8rem;top:16vh;width:38rem;opacity:.18}.paddle-sun{right:-8rem;width:30rem}.paddle-boat{right:-10rem;width:38rem;opacity:.4}.paddle-copy{padding-top:5rem}.paddle-scoreboard{grid-template-columns:repeat(2,minmax(0,1fr))}}
          @media (max-width:640px){.paddle-header{align-items:flex-start}.paddle-brand-mark{width:3.35rem}.paddle-brand-subtitle{font-size:.63rem}.paddle-nav .paddle-button-ghost{display:none}.paddle-button{padding:.68rem .82rem}.paddle-copy{padding:4rem 0 4.5rem}.paddle-hero-logo{width:min(20rem,86vw);margin-left:-.75rem}.paddle-home h1{font-size:clamp(4rem,19vw,6rem)}.paddle-lede{font-size:1.08rem}.paddle-actions .paddle-button{width:100%}.paddle-scoreboard{grid-template-columns:1fr 1fr}.paddle-sun{top:13vh;right:-11rem;width:25rem}.paddle-boat{bottom:15vh;right:-16rem;width:35rem}}
          @media (prefers-reduced-motion:reduce){.paddle-hero-logo,.paddle-scene-logo,.paddle-sun,.paddle-boat,.paddle-paddler,.paddle-waves,.paddle-lane,.paddle-spark,.paddle-score-tile{animation:none}}
        `,
      }}
    />
  );
}
