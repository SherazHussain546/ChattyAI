/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#2563eb', // blue-600
          hover: '#1d4ed8', // blue-700
          light: '#dbeafe', // blue-100
          dark: '#1e40af', // blue-800
        },
        secondary: {
          DEFAULT: '#4b5563', // gray-600
          hover: '#374151', // gray-700
          light: '#f3f4f6', // gray-100
          dark: '#1f2937', // gray-800
        },
        accent: {
          DEFAULT: '#8b5cf6', // violet-500
          hover: '#7c3aed', // violet-600
          light: '#ede9fe', // violet-100
          dark: '#6d28d9', // violet-700
        },
        success: {
          DEFAULT: '#10b981', // emerald-500
          light: '#d1fae5', // emerald-100
        },
        danger: {
          DEFAULT: '#ef4444', // red-500
          light: '#fee2e2', // red-100
        },
        warning: {
          DEFAULT: '#f59e0b', // amber-500
          light: '#fef3c7', // amber-100
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
      borderRadius: {
        'sm': '0.125rem',
        DEFAULT: '0.25rem',
        'md': '0.375rem',
        'lg': '0.5rem',
        'xl': '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        'sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        DEFAULT: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        'md': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        'xl': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
      },
    },
  },
  plugins: [],
};