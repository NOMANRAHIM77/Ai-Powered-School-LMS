/** Keep local documentation builds separate from an active dev server. */
const nextConfig = { distDir: process.env.NEXT_BUILD_DIR || '.next' };
export default nextConfig;
