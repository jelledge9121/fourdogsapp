export default function FourDogsLogo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const imgSizes = {
    sm: "h-10 w-10",
    md: "h-14 w-14",
    lg: "h-24 w-24",
  };

  return (
    <div className="flex items-center gap-3">
      <img
        src="/logo.png"
        alt="Four Dogs Entertainment"
        className={`${imgSizes[size]} rounded-xl object-contain`}
      />
      {size !== "sm" && (
        <div className="flex flex-col leading-tight">
          <span className="font-display tracking-wider text-xl text-brand-white">
            FOUR DOGS
          </span>
          <span className="font-display tracking-widest text-xs text-brand-neon">
            ENTERTAINMENT
          </span>
        </div>
      )}
    </div>
  );
}
