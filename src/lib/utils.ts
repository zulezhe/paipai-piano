/*
 * @Author: oliver
 * @Date: 2026-01-19 22:28:18
 * @LastEditors: oliver
 * @LastEditTime: 2026-01-19 22:28:20
 * @Description: 
 */
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}