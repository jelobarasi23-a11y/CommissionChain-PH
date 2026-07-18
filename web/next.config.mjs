/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Soroban/Stellar SDK packages assume a Node-like environment for a few
  // dependencies; transpilePackages keeps them working cleanly inside
  // Next.js's bundling instead of needing manual webpack overrides.
  transpilePackages: ["@stellar/stellar-sdk", "@stellar/freighter-api"],
};

export default nextConfig;
