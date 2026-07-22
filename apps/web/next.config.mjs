/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@gsd/api", "@gsd/validation", "@gsd/domain"],
};

export default nextConfig;
