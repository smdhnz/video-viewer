import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/proxy-ynjn/:path*",
        destination: "https://public.ynjn.jp/:path*",
      },
    ]
  },
}

export default nextConfig
