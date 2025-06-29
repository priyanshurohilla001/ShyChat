interface AnimatedBackgroundProps {
  className?: string;
}

export function AnimatedBackground({
  className = "absolute inset-0 w-full h-full opacity-10 pointer-events-none",
}: AnimatedBackgroundProps) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      style={{ pointerEvents: "none" }}
    >
      <defs>
        <pattern
          id="grid"
          x="0"
          y="0"
          width="60"
          height="60"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M 60 0 L 0 0 0 60"
            fill="none"
            stroke="currentColor"
            strokeWidth="0.5"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid)" />

      {/* Network nodes - peer connection points */}
      <circle cx="20%" cy="25%" r="3" fill="currentColor" opacity="0.4">
        <animate
          attributeName="opacity"
          values="0.2; 0.8; 0.2"
          dur="3s"
          repeatCount="indefinite"
        />
      </circle>

      <circle cx="75%" cy="40%" r="2.5" fill="currentColor" opacity="0.4">
        <animate
          attributeName="opacity"
          values="0.4; 1; 0.4"
          dur="4s"
          repeatCount="indefinite"
        />
      </circle>

      <circle cx="40%" cy="70%" r="2" fill="currentColor" opacity="0.4">
        <animate
          attributeName="opacity"
          values="0.1; 0.6; 0.1"
          dur="5s"
          repeatCount="indefinite"
        />
      </circle>

      <circle cx="80%" cy="75%" r="3.5" fill="currentColor" opacity="0.4">
        <animate
          attributeName="opacity"
          values="0.3; 0.9; 0.3"
          dur="3.5s"
          repeatCount="indefinite"
        />
      </circle>

      <circle cx="25%" cy="85%" r="2" fill="currentColor" opacity="0.4">
        <animate
          attributeName="opacity"
          values="0.2; 0.7; 0.2"
          dur="4.5s"
          repeatCount="indefinite"
        />
      </circle>

      {/* Connection lines between peers */}
      <path
        d="M20,25 Q50,15 75,40"
        stroke="currentColor"
        strokeWidth="0.8"
        fill="none"
        opacity="0.2"
      >
        <animate
          attributeName="stroke-dasharray"
          values="0 100; 50 50; 100 0; 0 100"
          dur="8s"
          repeatCount="indefinite"
        />
      </path>

      <path
        d="M40,70 Q60,55 80,75"
        stroke="currentColor"
        strokeWidth="0.6"
        fill="none"
        opacity="0.15"
      >
        <animate
          attributeName="stroke-dasharray"
          values="0 80; 40 40; 80 0; 0 80"
          dur="6s"
          repeatCount="indefinite"
        />
      </path>
    </svg>
  );
}
