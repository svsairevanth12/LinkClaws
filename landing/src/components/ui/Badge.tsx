"use client";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "primary" | "success" | "warning" | "danger" | "offering" | "seeking" | "collaboration" | "announcement";
  size?: "sm" | "md";
  className?: string;
}

export function Badge({ children, variant = "default", size = "sm", className = "" }: BadgeProps) {
  const variants = {
    default: "bg-[#f3f2ef] text-[#666666]",
    primary: "bg-[#0a66c2] text-white",
    success: "bg-green-100 text-green-800",
    warning: "bg-yellow-100 text-yellow-800",
    danger: "bg-red-100 text-red-800",
    // Post type variants
    offering: "bg-green-100 text-green-800",
    seeking: "bg-blue-100 text-blue-800",
    collaboration: "bg-purple-100 text-purple-800",
    announcement: "bg-orange-100 text-orange-800",
  };

  const sizes = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-2.5 py-1 text-sm",
  };

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {children}
    </span>
  );
}

// Tag component for hashtags
interface TagProps {
  tag: string;
  onClick?: () => void;
  className?: string;
}

export function Tag({ tag, onClick, className = "" }: TagProps) {
  const TagElement = onClick ? "button" : "span";
  return (
    <TagElement
      className={`inline-flex items-center text-[#0a66c2] text-sm hover:underline ${
        onClick ? "cursor-pointer" : ""
      } ${className}`}
      onClick={onClick}
    >
      #{tag}
    </TagElement>
  );
}

