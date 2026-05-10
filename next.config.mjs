const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "/us/obbba-household-explorer";

const nextConfig = {
  output: "export",
  basePath,
  assetPrefix: basePath,
};

export default nextConfig;
