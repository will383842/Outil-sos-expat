import { cn } from "@/lib/utils"

/**
 * Skeleton component for loading states
 * - Uses a more visible gray background (bg-gray-200 instead of bg-muted)
 * - Sets min-height to prevent layout shifts
 * - Supports custom sizing via className
 */
function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        // Animation de pulsation
        "animate-pulse",
        // Forme arrondie
        "rounded-md",
        // Couleur plus visible que bg-muted pour mieux indiquer le chargement
        "bg-gray-200",
        // Hauteur minimum par défaut pour éviter les layout shifts
        "min-h-[1rem]",
        className
      )}
      // Accessibilité : indiquer que c'est un élément en chargement
      aria-busy="true"
      aria-live="polite"
      {...props}
    />
  )
}

export { Skeleton }
