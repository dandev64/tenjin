const config = {
  port: process.env.PORT || 4000,
  corsOrigins: process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map(s => s.trim()).filter(Boolean)
    : [],
  cache: {
    maxSize: 500,
    ttl: 1000 * 60 * 30,
  },
};

export default config;
