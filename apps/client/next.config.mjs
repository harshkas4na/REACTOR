/** @type {import('next').NextConfig} */
const nextConfig = {
    transpilePackages: ['@uiw/react-md-editor'],
          images: {
              remotePatterns: [
                  {
                      protocol: 'https',
                      hostname: '**',
                  },
              ],
          },
};

export default nextConfig;
