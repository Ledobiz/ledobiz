const CIRCUMFERENCE = 502.65;
const SEGMENT = 96;
const offsets = [0, -125.66, -251.33, -376.99];

type RingProps = {
  code: string;
  /** Colour per segment; `null` draws the missing piece as a dashed outline. */
  segments: (string | null)[];
};

/** The brand's segmented "loading ring" with the error code in the middle. */
export function ErrorRing({ code, segments }: RingProps) {
  return (
    <div aria-hidden="true" className="relative aspect-square w-full max-w-[260px] flex-none md:max-w-[340px] lg:flex-[0_1_340px]">
      <svg viewBox="0 0 200 200" className="block size-full">
        {segments.map((color, index) =>
          color ? (
            <circle
              key={offsets[index]}
              cx="100"
              cy="100"
              r="80"
              fill="none"
              stroke={color}
              strokeWidth="16"
              strokeLinecap="round"
              strokeDasharray={`${SEGMENT} ${CIRCUMFERENCE - SEGMENT}`}
              strokeDashoffset={offsets[index]}
              transform="rotate(-80 100 100)"
            />
          ) : (
            <path key={offsets[index]} d="M21.2 86.1 A80 80 0 0 1 84.4 21.5" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="2" strokeDasharray="4 6" strokeLinecap="round" />
          ),
        )}
      </svg>
      <span className="absolute inset-0 flex items-center justify-center font-display text-[56px] font-extrabold tracking-[-0.02em] text-white md:text-[clamp(56px,7vw,80px)]">
        {code}
      </span>
    </div>
  );
}
