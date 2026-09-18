import React from "react";
import { cn } from "@/lib/utils";

export type CropIconSize = "xs" | "sm" | "md" | "lg" | "xl";

export interface CropIconProps extends React.SVGProps<SVGSVGElement> {
  cropId?: string | null;
  size?: CropIconSize;
  className?: string;
}

const SIZE_CLASSES: Record<CropIconSize, string> = {
  xs: "size-3.5",
  sm: "size-5",
  md: "size-7",
  lg: "size-10",
  xl: "size-12",
};

export function CropIcon({
  cropId,
  size = "md",
  className,
  ...props
}: CropIconProps) {
  const normalizedId = (cropId || "").toLowerCase().trim();
  const sizeClass = SIZE_CLASSES[size] ?? SIZE_CLASSES.md;
  const combinedClasses = cn("inline-block shrink-0", sizeClass, className);

  switch (normalizedId) {
    case "tomato":
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={combinedClasses}
          aria-label="Tomato"
          {...props}
        >
          {/* Green Calyx / Stem */}
          <path
            d="M12 2C12 2 13 4 15 4C17 4 18 2 18 2C18 2 17 6 15 7C13 8 12 6 12 6C12 6 11 8 9 7C7 6 6 2 6 2C6 2 7 4 9 4C11 4 12 2 12 2Z"
            fill="#16A34A"
          />
          {/* Red Body */}
          <ellipse cx="12" cy="14" rx="6.5" ry="7" fill="#EF4444" />
          {/* Light Red Highlight */}
          <path
            d="M12 14C12 14 13 12 15 12C17 12 18 14 18 14C18 14 17 16 15 16C13 16 12 14 12 14Z"
            fill="#FCA5A5"
          />
        </svg>
      );

    case "potato":
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={combinedClasses}
          aria-label="Potato"
          {...props}
        >
          {/* Tuber Body */}
          <ellipse cx="12" cy="12" rx="7.5" ry="8" fill="#D4A574" />
          {/* Natural Eye Spots */}
          <ellipse cx="10" cy="9.5" rx="1.5" ry="2" fill="#B88B58" />
          <ellipse cx="14.5" cy="13" rx="1.5" ry="2" fill="#B88B58" />
          <ellipse cx="11" cy="15.5" rx="1" ry="1.5" fill="#B88B58" />
        </svg>
      );

    case "maize":
    case "corn":
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={combinedClasses}
          aria-label="Maize"
          {...props}
        >
          {/* Golden Ear */}
          <path
            d="M12 2C12 2 11 4 10 6C9 8 8 10 8 12C8 16 10 18 12 18C14 18 16 16 16 12C16 10 15 8 14 6C13 4 12 2 12 2Z"
            fill="#FCD34D"
          />
          {/* Kernel Texture */}
          <path d="M12 4L12 18" stroke="#F59E0B" strokeWidth="1" />
          <path d="M10 6L14 6" stroke="#F59E0B" strokeWidth="1" />
          <path d="M9 9L15 9" stroke="#F59E0B" strokeWidth="1" />
          <path d="M9 12L15 12" stroke="#F59E0B" strokeWidth="1" />
          <path d="M10 15L14 15" stroke="#F59E0B" strokeWidth="1" />
          {/* Green Husk / Stalk */}
          <path d="M12 18L12 22" stroke="#22C55E" strokeWidth="2" />
          <path d="M12 20L10 22M12 20L14 22" stroke="#22C55E" strokeWidth="1.5" />
        </svg>
      );

    case "grape":
    case "grapes":
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={combinedClasses}
          aria-label="Grape"
          {...props}
        >
          {/* Grape Berries */}
          <circle cx="8.5" cy="12" r="3" fill="#9333EA" />
          <circle cx="12" cy="10" r="3" fill="#A855F7" />
          <circle cx="15.5" cy="12" r="3" fill="#9333EA" />
          <circle cx="10" cy="16" r="3" fill="#7E22CE" />
          <circle cx="14" cy="16" r="3" fill="#7E22CE" />
          <circle cx="12" cy="19.5" r="2.5" fill="#6B21A8" />
          {/* Vine Stem */}
          <path d="M12 10L12 4" stroke="#22C55E" strokeWidth="2" />
          <path d="M12 4L10 2M12 4L14 2" stroke="#22C55E" strokeWidth="1.5" />
        </svg>
      );

    case "apple":
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={combinedClasses}
          aria-label="Apple"
          {...props}
        >
          {/* Stem & Leaf */}
          <path
            d="M12 6C12 6 13 3.5 15.5 3.5C18 3.5 18 5 18 7C18 9 17 10 16 10"
            stroke="#22C55E"
            strokeWidth="2"
            fill="none"
          />
          {/* Apple Fruit */}
          <ellipse cx="12" cy="14" rx="6.5" ry="7" fill="#EF4444" />
          {/* Highlight */}
          <path
            d="M12 14C12 14 13 12 15 12C17 12 18 14 18 14C18 14 17 16 15 16C13 16 12 14 12 14Z"
            fill="#FCA5A5"
          />
        </svg>
      );

    case "all":
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={combinedClasses}
          aria-label="All Crops"
          {...props}
        >
          <path
            d="M12 22V12M12 12C12 7.5 8.5 5 4 5C4 9.5 6.5 12 12 12ZM12 12C12 8 15 6 20 6C20 10 18 12 12 12Z"
            stroke="#22C55E"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );

    default:
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={combinedClasses}
          aria-label="Crop"
          {...props}
        >
          <path
            d="M12 22C12 22 20 18 20 12V5L12 2L4 5V12C4 18 12 22 12 22Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
  }
}
