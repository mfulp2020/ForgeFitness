export function BackgroundAccent() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10">
      <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_0%_0%,var(--glow-a),transparent)]" />
      <div className="absolute inset-0 bg-[radial-gradient(70%_55%_at_90%_10%,var(--glow-b),transparent)]" />
    </div>
  );
}
