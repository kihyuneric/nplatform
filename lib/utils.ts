import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"


export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}


export class Util {
  static string = (str: any) => {
    if (!str) {
      return "";
    }
    return String(str).trim();
  };

  static Number(n: any, rtn = 0) {
    n = Number(n);
    if (isNaN(n)) {
      n = rtn;
    }
    return n;
  }
}