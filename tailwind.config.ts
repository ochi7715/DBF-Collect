import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef8f3",
          100: "#d7efe5",
          200: "#bfe2d4",
          500: "#0a8a60",
          600: "#00734e",
          700: "#005f46",
        },
      },
    },
  },
  plugins: [],
};
export default config;
