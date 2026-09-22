import path from 'node:path';

import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // A stray lockfile further up the tree makes Next guess the wrong root.
  outputFileTracingRoot: path.join(__dirname),
};

export default nextConfig;
