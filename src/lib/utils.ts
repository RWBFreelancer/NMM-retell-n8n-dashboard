import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Join class names, with later Tailwind classes winning. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
