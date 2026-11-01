const js = require("@eslint/js");
const google = require("eslint-config-google");
const globals = require("globals");
// Google style rules are configuration data, without the removed JSDoc rules.
const googleRules = {...google.rules};
delete googleRules["valid-jsdoc"];
delete googleRules["require-jsdoc"];
module.exports = [
  {ignores: ["node_modules/**"]},
  {linterOptions: {reportUnusedDisableDirectives: false}},
  {files: ["**/*.js", "**/*.mjs"],
    languageOptions: {ecmaVersion: 2022, sourceType: "commonjs",
      globals: {...globals.node, ...globals.es2022}},
    rules: {...js.configs.recommended.rules, ...googleRules,
      "no-unused-vars": ["error", {args: "none", caughtErrors: "none"}],
      "no-restricted-globals": ["error", "name", "length"],
      "prefer-arrow-callback": "error",
      "quotes": ["error", "double", {allowTemplateLiterals: true}]}},
  {files: ["**/*.mjs"], languageOptions: {sourceType: "module"},
    rules: {"max-len": "off"}},
  {files: ["**/*.spec.*"], languageOptions: {globals: globals.mocha}},
];
