
import eslint from '@eslint/js';
// import jestPlugin from 'eslint-plugin-jest';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    ignores: [
      "dist/**/*",
      "coverage/**/*",
      "node_modules/*",
      "jest.config.js",
      "eslint.config.js",
      "webpack.config.js"
    ]
  },
  {
    languageOptions: {
      parserOptions: {
        project: ['tsconfig.eslint.json'],
      },
    },
    rules: {
      "indent": [
        "warn",
        2,
        {
          "SwitchCase": 1,
          "MemberExpression": 1,
          "ignoredNodes": ["ConditionalExpression"],
          "ignoreComments": true
        }],
      "max-len": [
        "error",
        {
          "code": 140,
          "ignorePattern": "^import|^export|^\\s+it\\(|^\\s*describe\\("
        }
      ],
      "no-prototype-builtins": "off",
      "@typescript-eslint/no-redundant-type-constituents": "off",
      "@typescript-eslint/restrict-template-expressions": "off",
      "@typescript-eslint/explicit-module-boundary-types": "error",
      "@typescript-eslint/unbound-method": [
        "error",
        {
          "ignoreStatic": true
        }
      ]
    }
  },
  {
    files: ['*.js'],
    ...tseslint.configs.disableTypeChecked,
  }
);


// module.exports = [{
//   ignores: [
//     "./dist/**/*",
//     "./coverage/**/*",
//     "./node_modules/*"
//   ],
//   "files": [
//     "*.ts"
//   ],
//   "parserOptions": {
//     "project": [
//       "tsconfig.lint.json"
//     ],
//     "createDefaultProgram": false
//   },
//   "extends": [
//     "eslint:recommended",
//     "plugin:@typescript-eslint/recommended"
//   ],
//   "rules": {
//     "indent": [
//       "warn",
//       2,
//       {
//         "SwitchCase": 1,
//         "MemberExpression": 1,
//         "ignoredNodes": ["ConditionalExpression"],
//         "ignoreComments": true
//       }],
//     "max-len": [
//       "error",
//       {
//         "code": 140,
//         "ignorePattern": "^import|^export|^\\s+it\\(|^\\s*describe\\("
//       }
//     ],
//     "no-prototype-builtins": "off",
//     "@typescript-eslint/restrict-template-expressions": "off",
//     "@typescript-eslint/explicit-module-boundary-types": "error",
//     "@typescript-eslint/unbound-method": [
//       "error",
//       {
//         "ignoreStatic": true
//       }
//     ]
//   }
// }];
