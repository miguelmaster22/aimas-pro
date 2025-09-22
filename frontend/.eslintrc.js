module.exports = {
  parser: "@babel/eslint-parser",
  parserOptions: {
    requireConfigFile: false
  },
  env: {
    browser: true,
    es2021: true,
    node: true
  },
  extends: [
    "react-app",
    "eslint:recommended",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended"
  ],
  plugins: ["react", "react-hooks"],
  rules: {
    // Disable prop-types validation for legacy codebase
    "react/prop-types": "off",
    // Allow anonymous default exports
    "import/no-anonymous-default-export": "off",
    // Allow unused variables that start with underscore
    "no-unused-vars": ["error", { "argsIgnorePattern": "^_" }]
  }
};