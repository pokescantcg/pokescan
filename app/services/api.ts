const BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  (process.env.NODE_ENV === "development"
    ? "http://192.168.1.107:5000"
    : "https://pokemon-card-scan.replit.app");

export default BASE_URL;