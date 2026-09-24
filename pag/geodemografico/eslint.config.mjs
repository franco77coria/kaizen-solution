import js from '@eslint/js'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/.pgdata/**',
      'scripts/.tmp/**',
      'apps/web/dist/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      // Un `any` desactiva el tipado justo donde mas hace falta.
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      // Una promesa sin await en un camino de escritura pierde el error.
      '@typescript-eslint/no-floating-promises': 'off',
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'no-console': ['error', { allow: ['warn', 'error'] }],
      // Reglas propias del proyecto, para que no vuelvan a colarse.
      'no-restricted-syntax': [
        'error',
        {
          selector: "MemberExpression[property.name='dangerouslySetInnerHTML']",
          message:
            'Prohibido: el contenido de notas y del modelo se renderiza como texto, nunca como HTML.',
        },
        {
          selector: "NewExpression[callee.name='Function']",
          message: 'Prohibido construir funciones desde cadenas.',
        },
        {
          selector: "CallExpression[callee.name='eval']",
          message: 'Prohibido evaluar cadenas como codigo.',
        },
      ],
    },
  },
  {
    // Las pruebas pueden usar aserciones y encadenar promesas con libertad.
    files: ['**/*.test.ts', 'tests/**/*.ts', 'evals/**/*.ts'],
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off',
      'no-console': 'off',
    },
  },
  {
    // Los scripts corren en Node con sus globales; sin declararlas, `process`
    // se reporta como variable inexistente.
    files: ['scripts/**/*.mjs', 'scripts/**/*.js', '*.config.mjs'],
    languageOptions: {
      globals: {
        process: 'readonly',
        console: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        fetch: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        AbortSignal: 'readonly',
      },
    },
    rules: { 'no-console': 'off' },
  },
)
