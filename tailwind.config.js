/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
      "./views/**/*.ejs",
      "./public/**/*.{html,js}",
      "./src/**/*.{html,js}"
    ],
    theme: {
      extend: {},
    },
    plugins: [],
    // Optimize for production
    purge: {
      enabled: process.env.NODE_ENV === 'production',
      content: [
        './views/**/*.ejs',
        './public/**/*.{html,js}',
        './src/**/*.{html,js}'
      ],
      options: {
        safelist: [
          'hidden',
          'block',
          'flex',
          'grid',
          'opacity-0',
          'opacity-100',
          'transform',
          'transition',
          'duration-300',
          'ease-out',
          'scale-95',
          'scale-100',
          'translate-y-0',
          'translate-y-4'
        ]
      }
    }
  }
  