import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import importPlugin from 'eslint-plugin-import'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import sonarjs from 'eslint-plugin-sonarjs'
import security from 'eslint-plugin-security'

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: {
      react,
      'react-hooks': reactHooks,
      import: importPlugin,
      'jsx-a11y': jsxA11y,
      security,
      sonarjs,
    },
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: ['./tsconfig.json'],
        sourceType: 'module',
        ecmaVersion: 'latest',
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    rules: {
      // Exemple de règles importantes
      'react/self-closing-comp': 'warn',
      'react/no-unescaped-entities': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-misused-promises': 'error',
      'no-console': 'warn',
      'eol-last': ['warn', 'always'],
      'sonarjs/no-duplicate-string': ['warn', { threshold: 5 }],
      'security/detect-hardcoded-secrets': 'warn',
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
  },
]
