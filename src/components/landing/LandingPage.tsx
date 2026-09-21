import './landing.css';

export default function LandingPage() {
  return (
    <section className="landing-page">

      {/* Comic / doodle background */}
      <div className="landing-doodle-field" aria-hidden="true">
        <span className="landing-doodle q1">&lt;/&gt;</span>
        <span className="landing-doodle q2">✦</span>
        <span className="landing-doodle q3">⌁</span>
        <span className="landing-doodle q4">⚙</span>
        <span className="landing-doodle q5">◌</span>
        <span className="landing-doodle q6">↗</span>
        <span className="landing-doodle q7">{'{ AI }'}</span>
        <span className="landing-doodle q9">⌘</span>
        <span className="landing-doodle q10">✧</span>
        <span className="landing-doodle q11">◈</span>
        <span className="landing-doodle q12">01</span>
        <span className="landing-doodle q13">0101</span>
        <span className="landing-doodle q14">→ BUILD</span>
        <span className="landing-doodle q15">[ ]</span>
        <span className="landing-doodle q16">⚡</span>
        <span className="landing-doodle q17">◉</span>
        <span className="landing-doodle q18">&lt;DEV&gt;</span>
      </div>

      <div className="landing-inner">

       

        <div className="landing-title-wrap">

          

          <h1 className="landing-title">
            <span>DEV</span>
            <span>TALKS</span>
          </h1>

          <div className="landing-stamp">
            <span>IDEAS</span>
            <span>CODE</span>
            <span>PEOPLE</span>
            <span>IMPACT</span>
          </div>

        </div>

        <div className="landing-bottom">

          <div>
            <p className="landing-manifesto">
              TECHNOLOGY.
              <br />
              <em>UNFILTERED.</em>
            </p>

            <p className="landing-description">
              A space for developers, builders, founders
              <br />
              and curious minds to talk about what comes next.
            </p>
          </div>

          <div className="landing-event-info">
            <span>26 — 27 SEPTEMBER 2026</span>
            <span>PUNE · DEVKRAFT</span>
          </div>

        </div>

      </div>

      <div className="landing-scroll">
        <span>SCROLL</span>
        <b>↓</b>
      </div>

    </section>
  );
}