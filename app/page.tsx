import Link from "next/link";
import { Lobby } from "@/components/Lobby";
import { OnlineCount } from "@/components/OnlineCount";
import { BoardWatermark } from "@/components/BoardWatermark";

export default function Home() {
  return (
    <main className="relative flex min-h-dvh flex-col overflow-hidden">
      <BoardWatermark />

      <header className="relative z-10 flex items-center justify-between px-6 py-5 sm:px-10">
        <Logomark />
        <span className="micro-label rounded-full border border-grid px-2.5 py-1">
          KO
        </span>
      </header>

      <section className="relative z-10 flex flex-1 items-center justify-center px-6 py-8">
        <div className="animate-rise flex w-full max-w-[460px] flex-col gap-9">
          <div className="flex flex-col gap-4">
            <h1 className="text-[clamp(2.6rem,9vw,3.6rem)] font-semibold leading-[1.04] tracking-[-0.02em] text-fg">
              같은 색.
              <br />
              다른 기억.
            </h1>
            <p className="text-base leading-relaxed text-muted">
              모든 돌이 같은 색입니다.
              <br />
              내가 둔 돌을 기억하며 두는 오목.
            </p>
          </div>
          <Lobby />
        </div>
      </section>

      <footer className="relative z-10 flex items-center justify-between px-6 py-5 sm:px-10">
        <OnlineCount />
        <a
          href="#rules"
          className="mono text-xs text-muted transition-colors hover:text-fg"
        >
          규칙 보기 ↓
        </a>
      </footer>

      <RulesSection />
      <JsonLd />
    </main>
  );
}

function Logomark() {
  return (
    <Link href="/" className="flex items-center gap-2.5">
      <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden>
        <circle cx="9" cy="12" r="6.5" fill="var(--color-stone)" />
        <circle
          cx="15"
          cy="12"
          r="6.5"
          fill="none"
          stroke="var(--color-stone-edge)"
          strokeWidth="1.2"
        />
      </svg>
      <span className="text-sm font-semibold tracking-tight text-fg">
        블라인드 오목
      </span>
    </Link>
  );
}

const STEPS = [
  {
    n: "01",
    t: "같은 색, 하나의 판",
    d: "두 사람의 돌이 모두 같은 색으로 놓입니다. 화면만 봐서는 누구 돌인지 구분할 수 없어요.",
  },
  {
    n: "02",
    t: "기억으로 두는 5목",
    d: "내가 어디에 뒀는지 기억하면서 가로·세로·대각선으로 5개를 먼저 잇습니다. 금수 없는 자유 룰.",
  },
  {
    n: "03",
    t: "끝나면 색이 드러난다",
    d: "승부가 나는 순간, 모든 돌의 진짜 주인이 색으로 펼쳐집니다. 기억이 맞았는지 확인하세요.",
  },
];

const FEATURES = [
  { t: "랜덤 매칭", d: "버튼 한 번으로 상대를 찾아 바로 시작." },
  { t: "방 만들기 · 코드 입장", d: "친구와 코드를 공유해 같은 방에서 대국." },
  { t: "관전 + 색 공개", d: "두 명 외에는 관전자. 색 공개를 켜고 끌 수 있어요." },
];

const FAQ = [
  {
    q: "블라인드 오목이 뭔가요?",
    a: "블라인드 오목은 일반 오목과 규칙은 같지만 모든 돌이 같은 색으로 놓이는 변형 오목입니다. 내가 둔 돌과 상대가 둔 돌을 기억하면서 가로·세로·대각선으로 5개를 먼저 이으면 이깁니다.",
  },
  {
    q: "블라인드 오목은 어떻게 하나요?",
    a: "닉네임만 입력하면 바로 시작할 수 있어요. 랜덤 매칭으로 상대를 찾거나, 방을 만들어 코드를 친구에게 공유하면 됩니다. 게임이 끝나면 모든 돌의 진짜 색(흑·백)이 공개됩니다.",
  },
  {
    q: "블라인드 오목은 무료인가요?",
    a: "네, 완전 무료입니다. 설치나 회원가입 없이 웹 브라우저에서 닉네임만으로 바로 플레이할 수 있습니다.",
  },
  {
    q: "관전도 할 수 있나요?",
    a: "가능합니다. 한 방에는 플레이어 2명과 여러 명의 관전자가 들어올 수 있고, 관전자는 돌 색 공개를 자유롭게 켜고 끌 수 있습니다.",
  },
];

function RulesSection() {
  return (
    <section
      id="rules"
      className="relative z-10 border-t border-grid bg-surface/40 px-6 py-20 sm:px-10"
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-14">
        <div className="flex flex-col gap-3">
          <span className="micro-label">HOW TO PLAY</span>
          <h2 className="text-2xl font-semibold tracking-tight text-fg sm:text-3xl">
            블라인드 오목은 이렇게 둡니다
          </h2>
        </div>

        <ol className="grid gap-px overflow-hidden rounded-2xl border border-grid bg-grid sm:grid-cols-3">
          {STEPS.map((s) => (
            <li key={s.n} className="flex flex-col gap-3 bg-surface p-7">
              <span className="mono text-sm text-[color:var(--color-accent)]">
                {s.n}
              </span>
              <h3 className="text-lg font-semibold text-fg">{s.t}</h3>
              <p className="text-sm leading-relaxed text-muted">{s.d}</p>
            </li>
          ))}
        </ol>

        <div className="grid gap-4 sm:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.t}
              className="flex flex-col gap-1.5 rounded-xl border border-grid p-5"
            >
              <h3 className="text-base font-semibold text-fg">{f.t}</h3>
              <p className="text-sm leading-relaxed text-muted">{f.d}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-3">
          <span className="micro-label">FAQ</span>
          <h2 className="text-2xl font-semibold tracking-tight text-fg sm:text-3xl">
            자주 묻는 질문
          </h2>
        </div>
        <div className="flex flex-col divide-y divide-grid overflow-hidden rounded-2xl border border-grid">
          {FAQ.map((f) => (
            <details key={f.q} className="group bg-surface px-6 py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between text-base font-medium text-fg">
                {f.q}
                <span className="mono text-muted transition-transform group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-muted">{f.a}</p>
            </details>
          ))}
        </div>

        <p className="mono text-xs text-muted">
          블라인드 오목 · 같은 색. 다른 기억.
        </p>
      </div>
    </section>
  );
}

function JsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "VideoGame",
    name: "블라인드 오목",
    alternateName: "Blind Gomoku",
    description:
      "모든 돌이 같은 색으로 놓이는 온라인 오목. 내 돌과 상대 돌을 기억하며 두고, 게임이 끝나면 색이 공개됩니다.",
    genre: ["Board game", "Strategy", "Gomoku"],
    gamePlatform: "Web browser",
    applicationCategory: "Game",
    inLanguage: "ko",
    operatingSystem: "Any",
  };
  const faq = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faq) }}
      />
    </>
  );
}
