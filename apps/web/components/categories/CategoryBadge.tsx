import type { Category } from "@/lib/types";
import { cn } from "@/lib/utils";

interface CategoryBadgeProps {
  category: Category;
  className?: string;
}

/**
 * Displays a category as a colored chip. The background uses the category
 * color at low opacity so it blends well in both themes; we set CSS vars
 * inline to combine the dynamic color with Tailwind utilities.
 */
export const CategoryBadge: React.FC<CategoryBadgeProps> = ({ category, className }) => (
  <span
    className={cn(
      "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium",
      className,
    )}
    style={{
      backgroundColor: `${category.color}1F`, // ~12% alpha
      color: category.color,
    }}
  >
    <span
      className="inline-block h-1.5 w-1.5 rounded-full"
      style={{ backgroundColor: category.color }}
      aria-hidden
    />
    {category.name}
  </span>
);
