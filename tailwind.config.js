const colors = require('tailwindcss/colors')

module.exports = {
  mode: 'jit',
  purge: ['./public/**/*.html'],
  darkMode: 'class',
  theme: {
    fontFamily: {
      sans: ['Menlo', 'sans-serif'],
      'body': ['"Roboto Condensed"', 'sans-serif']
    },
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      black: colors.black,
      white: colors.white,
      gray: colors.trueGray
    },
    extend: {
      spacing:{
        '192':'48rem',
        '120':'30rem',
        'teaser': 'calc(100vh - 96px)'
      },
      minWidth: {
        'featureItem': '420px'
      },
      colors: {
        emeraldLangium: '#26888C',
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
    extend: {}
  },
  plugins: [],
}