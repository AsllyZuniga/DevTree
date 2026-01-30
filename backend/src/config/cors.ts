import { CorsOptions } from "cors";

const whiteList = [
  process.env.FRONTEND_URL,
  "http://localhost:5173",
  "http://127.0.0.1:5173",
];

export const corsConfig: CorsOptions = {
  origin: (origin, callback) => {
  
    if (!origin) {
      return callback(null, true);
    }

    if (whiteList.includes(origin)) {
      return callback(null, true);
    }

    console.log("❌ CORS bloqueado desde:", origin);
    callback(new Error("Error de CORS"));
  },
  credentials: true,
};
