if (typeof window !== "undefined" && !process.env.NEXT_PUBLIC_API_BASE) {
  console.warn("NEXT_PUBLIC_API_BASE is not set. Falling back to http://localhost:4000");
}
export const apiBase = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:4000";
