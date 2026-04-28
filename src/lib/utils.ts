import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function sanitize<T>(obj: T): T {
  // Standard JSON stringify naturally omits undefined values
  const clean = JSON.parse(JSON.stringify(obj));
  
  // Explicitly remove sensitive or auto-generated fields that shouldn't be in the document body
  if (clean && typeof clean === 'object') {
    delete (clean as any).id;
  }
  
  return clean;
}
