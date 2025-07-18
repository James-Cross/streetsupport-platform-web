import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
    MONGODB_URI: process.env.MONGODB_URI,
  },
};

export default nextConfig;
