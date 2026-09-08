import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "kz.kokpar.game",
  appName: "Кокпар 3D",
  webDir: "dist",
  server: {
    androidScheme: "https"
  },
  android: {
    backgroundColor: "#4a2c0a"
  },
  ios: {
    backgroundColor: "#4a2c0a",
    preferredContentMode: "mobile"
  }
};

export default config;
