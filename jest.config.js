module.exports = {
  testEnvironment: "node",
  testMatch: ["**/*.test.ts"],
  transform: {
    "^.+\\.tsx?$": "ts-jest"
  },
  transformIgnorePatterns: ["<rootDir>/node_modules/"],
  collectCoverage: true,
  collectCoverageFrom: [
    "**/*.{ts,tsx}",
    "!**/node_modules/**",
    "!**/vendor/**",
    "!**/dist/**"
  ],
  coverageReporters: ["html"],
  coverageDirectory: "<rootDir>/coverage",
  verbose: true
};
