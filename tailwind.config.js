/** @type {import('tailwindcss').Config} */
import plugin from 'tailwindcss/plugin';

export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        geist: ['Geist', 'sans-serif'],
        montserrat: ['Montserrat', 'sans-serif'],
        playfair: ['Playfair Display', 'serif'],
        'instrument-serif': ['Instrument Serif', 'serif'],
      }
    },
  },
  plugins: [
    plugin(function({ addUtilities }) {
      const rotateXUtilities = {};
      const rotateYUtilities = {};
      const rotateZUtilities = {};
      const rotateValues = [0, 5, 10, 15, 20, 30, 45, 75];

      rotateValues.forEach((value) => {
        rotateXUtilities[`.rotate-x-${value}`] = {
          '--tw-rotate-x': `${value}deg`,
          transform: `translate3d(var(--tw-translate-x, 0), var(--tw-translate-y, 0), var(--tw-translate-z, 0)) rotateX(var(--tw-rotate-x, 0)) rotateY(var(--tw-rotate-y, 0)) rotateZ(var(--tw-rotate-z, 0)) skewX(var(--tw-skew-x, 0)) skewY(var(--tw-skew-y, 0)) scaleX(var(--tw-scale-x, 1)) scaleY(var(--tw-scale-y, 1))`
        };
        if (value !== 0) {
          rotateXUtilities[`.-rotate-x-${value}`] = {
            '--tw-rotate-x': `-${value}deg`,
            transform: `translate3d(var(--tw-translate-x, 0), var(--tw-translate-y, 0), var(--tw-translate-z, 0)) rotateX(var(--tw-rotate-x, 0)) rotateY(var(--tw-rotate-y, 0)) rotateZ(var(--tw-rotate-z, 0)) skewX(var(--tw-skew-x, 0)) skewY(var(--tw-skew-y, 0)) scaleX(var(--tw-scale-x, 1)) scaleY(var(--tw-scale-y, 1))`
          };
        }
      });

      rotateValues.forEach((value) => {
        rotateYUtilities[`.rotate-y-${value}`] = {
          '--tw-rotate-y': `${value}deg`,
          transform: `translate3d(var(--tw-translate-x, 0), var(--tw-translate-y, 0), var(--tw-translate-z, 0)) rotateX(var(--tw-rotate-x, 0)) rotateY(var(--tw-rotate-y, 0)) rotateZ(var(--tw-rotate-z, 0)) skewX(var(--tw-skew-x, 0)) skewY(var(--tw-skew-y, 0)) scaleX(var(--tw-scale-x, 1)) scaleY(var(--tw-scale-y, 1))`
        };
        if (value !== 0) {
          rotateYUtilities[`.-rotate-y-${value}`] = {
            '--tw-rotate-y': `-${value}deg`,
            transform: `translate3d(var(--tw-translate-x, 0), var(--tw-translate-y, 0), var(--tw-translate-z, 0)) rotateX(var(--tw-rotate-x, 0)) rotateY(var(--tw-rotate-y, 0)) rotateZ(var(--tw-rotate-z, 0)) skewX(var(--tw-skew-x, 0)) skewY(var(--tw-skew-y, 0)) scaleX(var(--tw-scale-x, 1)) scaleY(var(--tw-scale-y, 1))`
          };
        }
      });

      rotateValues.forEach((value) => {
        rotateZUtilities[`.rotate-z-${value}`] = {
          '--tw-rotate-z': `${value}deg`,
          transform: `translate3d(var(--tw-translate-x, 0), var(--tw-translate-y, 0), var(--tw-translate-z, 0)) rotateX(var(--tw-rotate-x, 0)) rotateY(var(--tw-rotate-y, 0)) rotateZ(var(--tw-rotate-z, 0)) skewX(var(--tw-skew-x, 0)) skewY(var(--tw-skew-y, 0)) scaleX(var(--tw-scale-x, 1)) scaleY(var(--tw-scale-y, 1))`
        };
        if (value !== 0) {
          rotateZUtilities[`.-rotate-z-${value}`] = {
            '--tw-rotate-z': `-${value}deg`,
            transform: `translate3d(var(--tw-translate-x, 0), var(--tw-translate-y, 0), var(--tw-translate-z, 0)) rotateX(var(--tw-rotate-x, 0)) rotateY(var(--tw-rotate-y, 0)) rotateZ(var(--tw-rotate-z, 0)) skewX(var(--tw-skew-x, 0)) skewY(var(--tw-skew-y, 0)) scaleX(var(--tw-scale-x, 1)) scaleY(var(--tw-scale-y, 1))`
          };
        }
      });

      const perspectiveUtilities = {
        ".perspective-none": { perspective: "none" },
        ".perspective-dramatic": { perspective: "100px" },
        ".perspective-near": { perspective: "300px" },
        ".perspective-normal": { perspective: "500px !important" },
        ".perspective-midrange": { perspective: "800px" },
        ".perspective-distant": { perspective: "1200px" },
      };

      const transformStyleUtilities = {
        ".transform-style-preserve-3d": { "transform-style": "preserve-3d" },
        ".transform-style-flat": { "transform-style": "flat" },
      };

      addUtilities({
        ...rotateXUtilities,
        ...rotateYUtilities,
        ...rotateZUtilities,
        ...perspectiveUtilities,
        ...transformStyleUtilities,
      });
    })
  ]
}