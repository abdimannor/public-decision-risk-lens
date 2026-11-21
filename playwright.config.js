const { defineConfig } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "tests",
  use: { baseURL: "http://127.0.0.1:4173" },
  webServer: {
    command: "node tests/server.js",
    url: "http://127.0.0.1:4173/prototype/",
    reuseExistingServer: !process.env.CI
  },
  projects: [
    { name: "chromium", use: { browserName: "chromium" } },
    { name: "firefox", use: { browserName: "firefox" }, testMatch: /cross-browser\.spec\.js/ },
    { name: "webkit", use: { browserName: "webkit" }, testMatch: /cross-browser\.spec\.js/ }
  ]
});
