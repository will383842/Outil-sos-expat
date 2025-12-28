/**
 * cn - Utility for merging class names
 * Compatible avec Tailwind CSS
 */

export function cn(...classes: (string | undefined | false | null | 0)[]): string {
  return classes.filter(Boolean).join(' ');
}

export default cn;
