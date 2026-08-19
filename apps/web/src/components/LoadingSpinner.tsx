import { BrainCircuit } from "lucide-react";
import { cn } from "./ui";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  label?: string;
  className?: string;
}

const sizeMap = {
  sm: { spinner: "h-5 w-5", icon: "h-3 w-3", text: "text-xs" },
  md: { spinner: "h-8 w-8", icon: "h-5 w-5", text: "text-sm" },
  lg: { spinner: "h-12 w-12", icon: "h-7 w-7", text: "text-base" },
};

export default function LoadingSpinner({ size = "md", label, className }: LoadingSpinnerProps) {
  const s = sizeMap[size];
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3", className)}>
      <div className={cn("relative", s.spinner)}>
        <div className="absolute inset-0 animate-spin rounded-full border-2 border-white/10 border-t-brand-500" />
        <div className="flex h-full w-full items-center justify-center">
          <BrainCircuit className={cn("text-brand-400", s.icon)} />
        </div>
      </div>
      {label && <p className={cn("font-medium text-slate-400", s.text)}>{label}</p>}
    </div>
  );
}
