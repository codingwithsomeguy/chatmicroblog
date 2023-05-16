module.exports = {
    env: {
        browser: true,
        commonjs: true,
        es2021: true,
    },
    overrides: [
    ],
    extends: "xo",
    parserOptions: {
        ecmaVersion: "latest",
    },
    rules: {
        indent: ["error", 4],
        quotes: ["error", "double"],
        "capitalized-comments": ["off"],
    },
};
