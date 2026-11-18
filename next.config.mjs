const mobile = process.env.BUILD_TARGET === "mobile";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // The Android app ships a static copy of the site (see scripts/build-mobile.mjs).
  ...(mobile ? { output: "export", images: { unoptimized: true }, distDir: "out" } : {}),
};

export default nextConfig;
