import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import importPlugin from 'eslint-plugin-import'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import sonarjs from 'eslint-plugin-sonarjs'
import security from 'eslint-plugin-security'

export default [
  // Fichiers à ignorer
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'functions/**',
      '*.config.js',
      '*.config.ts',
      'vite.config.ts',
    ],
  },
  // Config JS recommandée
  js.configs.recommended,
  // Config TypeScript
  ...tseslint.configs.recommended,
  // Config principale
  {
    files: ['src/**/*.{ts,tsx,js,jsx}'],
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
        sourceType: 'module',
        ecmaVersion: 'latest',
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    rules: {
      // React
      'react/self-closing-comp': 'warn',
      'react/no-unescaped-entities': 'off',
      'react/prop-types': 'off',
      'react/react-in-jsx-scope': 'off',

      // React Hooks
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      // TypeScript
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-empty-function': 'off',

      // Accessibilité
      'jsx-a11y/alt-text': 'warn',
      'jsx-a11y/anchor-has-content': 'warn',
      'jsx-a11y/click-events-have-key-events': 'warn',
      'jsx-a11y/no-static-element-interactions': 'warn',

      // Sécurité (règles qui existent vraiment)
      'security/detect-object-injection': 'off', // Trop de faux positifs
      'security/detect-non-literal-regexp': 'warn',
      'security/detect-unsafe-regex': 'warn',
      'security/detect-buffer-noassert': 'warn',
      'security/detect-eval-with-expression': 'error',
      'security/detect-no-csrf-before-method-override': 'warn',
      'security/detect-possible-timing-attacks': 'warn',

      // SonarJS (qualité de code)
      'sonarjs/no-duplicate-string': 'off', // Trop strict pour les labels
      'sonarjs/cognitive-complexity': ['warn', 20],
      'sonarjs/no-identical-functions': 'warn',

      // Général
      'no-console': ['warn', { allow: ['warn', 'error', 'debug'] }],
      'eol-last': ['warn', 'always'],
      'no-unused-vars': 'off', // Géré par @typescript-eslint
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
  },
]
