module.exports = {
  output: 'standalone',
  swcMinify: true,
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3000',
      }
    ],
    unoptimized: process.env.NODE_ENV === 'development'
  },
  webpack: (config) => {
    config.module.rules.push({
      test: /\.json$/,
      type: 'json',
    });
    return config;
  }
}