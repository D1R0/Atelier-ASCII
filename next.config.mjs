/** @type {import('next').NextConfig} */
const nextConfig = {
  // Uncomment to build a fully static site (folder "out/") you can upload to any
  // hosting, including classic cPanel/PHP hosting. API routes won't work in that mode.
  // output: "export",
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Lets the page ask for the camera on your own domain.
          { key: "Permissions-Policy", value: "camera=(self)" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" }
        ]
      }
    ];
  }
};
export default nextConfig;
