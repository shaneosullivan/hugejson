/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  trailingSlash: true,
  skipTrailingSlashRedirect: true,
  distDir: process.env.NODE_ENV === "production" ? "dist" : ".next-build",
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
    tsconfigPath:
      process.env.NODE_ENV === "development"
        ? "./tsconfig.dev.json"
        : "./tsconfig.json",
  },
  images: {
    unoptimized: true,
  },
  webpack: (config, { isServer, dev }) => {
    // Configure webpack to handle jq-web by providing empty modules for Node.js dependencies
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
        stream: false,
        util: false,
        buffer: false,
        process: false,
      };

      // Fix for jq-web module trying to import 'fs' on Vercel
      config.node = {
        ...config.node,
        fs: "empty",
      };
    }

    // Ensure WASM files are handled correctly
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    };

    // Add watch debugging in development
    if (dev && !isServer) {
      // Configure webpack watch options
      config.watchOptions = {
        ...config.watchOptions,
        ignored: [
          "**/node_modules/**",
          "**/.next/**",
          "**/.next-build/**",
          "**/dist/**",
          "**/public/_next/**",
        ],
      };

      // Add plugin to log file changes
      config.plugins.push({
        apply: (compiler) => {
          compiler.hooks.watchRun.tap("FileChangeLogger", (compilation) => {
            const changedFiles = compilation.modifiedFiles || new Set();
            const removedFiles = compilation.removedFiles || new Set();

            if (changedFiles.size > 0) {
              console.log("🔄 Files changed:", Array.from(changedFiles));
            }
            if (removedFiles.size > 0) {
              console.log("🗑️ Files removed:", Array.from(removedFiles));
            }
          });
        },
      });
    }

    return config;
  },
};

export default nextConfig;
