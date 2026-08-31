import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "success" | "warning" | "danger" | "info" | "outline";
  size?: "sm" | "md";
  className?: string;
}

export function Badge({ children, variant = "default", size = "sm", className }: BadgeProps) {
  const variants = {
    default: "bg-slate-100 text-slate-700",
    success: "bg-emerald-100 text-emerald-700",
    warning: "bg-amber-100 text-amber-700",
    danger: "bg-red-100 text-red-700",
    info: "bg-blue-100 text-blue-700",
    outline: "border border-slate-300 text-slate-600 bg-white",
  };

  const sizes = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-2.5 py-1 text-sm",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center font-medium rounded-full",
        variants[variant],
        sizes[size],
        className
      )}
    >
      {children}
    </span>
  );
}

interface StatusBadgeProps {
  status: "PENDING" | "PROCESSING" | "INDEXED" | "ERROR";
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const configs = {
    PENDING: { label: "En attente", variant: "warning" as const },
    PROCESSING: { label: "Indexation...", variant: "info" as const },
    INDEXED: { label: "Indexé", variant: "success" as const },
    ERROR: { label: "Erreur", variant: "danger" as const },
  };

  const config = configs[status];

  return (
    <Badge variant={config.variant}>
      {status === "PROCESSING" && (
        <span className="mr-1 h-1.5 w-1.5 rounded-full bg-current animate-pulse-soft" />
      )}
      {config.label}
    </Badge>
  );
}
