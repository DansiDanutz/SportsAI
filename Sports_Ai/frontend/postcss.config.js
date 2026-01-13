// Use CommonJS here to avoid Node "MODULE_TYPELESS_PACKAGE_JSON" warnings
// during Vercel builds (when package.json does not set `"type": "module"`).
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
