interface LogoProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function Logo({ size = "md", className = "" }: LogoProps) {
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-16 h-16",
    lg: "w-24 h-24"
  };

  return (
    <div className={`${sizeClasses[size]} bg-primary rounded-2xl flex items-center justify-center ${className}`}>
      <div className="w-6 h-6 bg-primary-foreground rounded-full animate-pulse" />
    </div>
  );
}
