/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
  images: {
    domains: ["delivery-aws-s3-images-bucket.s3.sa-east-1.amazonaws.com"],
  },
};

export default nextConfig;
