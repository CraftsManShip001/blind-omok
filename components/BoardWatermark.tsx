// Ambient background: a faint 15×15 grid bleeding off the edges with a few neutral
// "ghost" stones quietly fading in and out. Pure CSS — SSR-safe, no JS.

const GHOSTS = [
  { left: "12%", top: "24%", delay: "0s" },
  { left: "79%", top: "30%", delay: "3.1s" },
  { left: "23%", top: "71%", delay: "6.2s" },
  { left: "66%", top: "62%", delay: "1.6s" },
  { left: "45%", top: "16%", delay: "4.6s" },
  { left: "88%", top: "82%", delay: "2.3s" },
  { left: "8%", top: "52%", delay: "7.4s" },
];

const LINE = "rgba(255,255,255,0.045)";

export function BoardWatermark() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
    >
      <div
        className="absolute inset-[-12%]"
        style={{
          backgroundImage: `linear-gradient(${LINE} 1px, transparent 1px), linear-gradient(90deg, ${LINE} 1px, transparent 1px)`,
          backgroundSize: "44px 44px",
          maskImage:
            "radial-gradient(ellipse 70% 70% at center, transparent 24%, black 78%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 70% 70% at center, transparent 24%, black 78%)",
        }}
      />
      {GHOSTS.map((g, i) => (
        <span
          key={i}
          className="absolute block h-3.5 w-3.5 rounded-full"
          style={{
            left: g.left,
            top: g.top,
            background: "var(--color-stone)",
            opacity: 0,
            animation: `ghost-stone 9s ease-in-out ${g.delay} infinite`,
          }}
        />
      ))}
    </div>
  );
}
