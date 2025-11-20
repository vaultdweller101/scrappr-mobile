export default {
  expo: {
    name: "scrappr-mobile",
    slug: "scrappr-mobile",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "scrapprmobile",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.dngo123.scrapprmobile",
      googleServicesFile: "./GoogleService-Info.plist",
    },
    android: {
      adaptiveIcon: {
        backgroundColor: "#E6F4FE",
        foregroundImage: "./assets/images/android-icon-foreground.png",
        backgroundImage: "./assets/images/android-icon-background.png",
        monochromeImage: "./assets/images/android-icon-monochrome.png",
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      package: "com.dngo123.scrapprmobile",
      googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? "./google-services.json",
    },
    web: {
      output: "static",
      favicon: "./assets/images/favicon.png",
    },
    plugins: [
      "expo-router",
      [
        "@react-native-google-signin/google-signin",
        {
          androidClientId: "1075565266262-rjdu8re2t9jnqsv7vehs3dnfn41rn7tm.apps.googleusercontent.com",
          iosUrlScheme: "com.googleusercontent.apps.1075565266262-rjdu8re2t9jnqsv7vehs3dnfn41rn7tm",
          androidConfig: process.env.GOOGLE_SERVICES_JSON ?? "./google-services.json",
        },
      ],
      [
        "expo-splash-screen",
        {
          image: "./assets/images/splash-icon.png",
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: "#ffffff",
          dark: {
            backgroundColor: "#000000",
          },
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
    extra: {
      router: {},
      eas: {
        projectId: "7760c414-d54b-4262-9b63-e717348d614c",
      },
    },
  },
};
