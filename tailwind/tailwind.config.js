const colors = require('tailwindcss/colors')

module.exports = {
  mode: 'jit',
  content: ['../hugo/layouts/**/*.html','../hugo/content/**/*.html','../hugo/content/**/*.ts','../hugo/content/**/*.tsx','../hugo/static/**/*.html','../hugo/static/**/*.js', '../hugo/assets/scripts/*.tsx', '../hugo/assets/scripts/*.jsx'],
  darkMode: 'class',
  theme: {
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      black: colors.black,
      white: colors.white,
      gray: colors.neutral
    },
    extend: {
      fontFamily: {
        'mono': ['Menlo', 'ui-monospace', 'SFMono-Regular', 'Monaco', 'Consolas', "Liberation Mono", "Courier New", 'monospace'],
        'body': ['"Roboto Condensed"', 'sans-serif']
      },
      spacing:{
        '192':'48rem',
        '120':'30rem',
        'teaser': 'calc(100vh - 96px)',
        'underline': '0.1px',
        '3/2': '150%'
      },
      minWidth: {
        'featureItem': '420px'
      },
      colors: {
        emeraldLangium: '#26888C',
        emeraldLangiumABitDarker: '#207578',
        emeraldLangiumDarker: '#0A4340',
        emeraldLangiumDarkest: '#042424',
        accentBlue: '#1FCDEB',
        accentGreen: '#B6F059',
        accentViolet: '#D568E7',
        accentLightBlue: '#BCDBEF'
      },
      backgroundImage: {
        'office': "url('../assets/office.jpg')"
      }
    }
  },
  variants: {
    extend: {
        textDecoration: ['dashed']  
    }
  },
  plugins: [
    require('@tailwindcss/line-clamp')
  ],
}