import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.biblechallengetracker.app",
  appName: "Bible Challenge Tracker",
  webDir: "www",
  backgroundColor: "#f7f7f1",
  server: {
    url: "https://bible-challange-tracker.vercel.app",
    cleartext: false,
    allowNavigation: ["bible-challange-tracker.vercel.app"],
  },
  android: {
    backgroundColor: "#f7f7f1",
    allowMixedContent: false,
    webContentsDebuggingEnabled: false,
  },
  plugins: {
    App: {
      disableBackButtonHandler: true,
    },
    StatusBar: {
      overlaysWebView: false,
      style: "DARK",
      backgroundColor: "#f7f7f1",
    },
  },
};

export default config;
