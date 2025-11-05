let baseURL = "";

// لو محلي → استخدم Vercel
if (location.hostname === "127.0.0.1" || location.hostname === "localhost") {
  baseURL = "https://bazaar-neon-three.vercel.app";
}
// لو Cloudflare Pages → استخدم Vercel
else if (location.hostname.endsWith("pages.dev") || location.hostname.endsWith("bazaar-bk1.pages.dev")) {
  baseURL = "https://bazaar-neon-three.vercel.app";
}