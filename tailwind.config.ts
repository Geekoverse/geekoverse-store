import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0C0C0F",
        coal: "#141419",
        cream: "#F3EFE6",
        sand: "#D8D0BE",
        smoke: "#8A867D",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      letterSpacing: {
        mega: "0.35em",
      },
    },
  },
  plugins: [],
};

export default config;
