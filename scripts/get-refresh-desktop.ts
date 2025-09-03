import http from "http";
import { google } from "googleapis";

const PORT = 53682; // any free port
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;
const REDIRECT = `http://127.0.0.1:${PORT}/oauth2callback`;

const oauth2 = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT);
const url = oauth2.generateAuthUrl({
  access_type: "offline",
  scope: ["https://www.googleapis.com/auth/calendar.events"],
  prompt: "consent",
});

const srv = http.createServer(async (req, res) => {
  if (!req.url?.startsWith("/oauth2callback")) { res.statusCode = 404; return res.end(); }
  const qs = new URL(req.url, `http://127.0.0.1:${PORT}`).searchParams;
  const code = qs.get("code");
  const { tokens } = await oauth2.getToken(code!);
  console.log("\n=== COPY THIS INTO .env ===");
  console.log("GOOGLE_REFRESH_TOKEN=" + tokens.refresh_token);
  res.end("All set. You can close this tab.");
  srv.close();
});

srv.listen(PORT, "127.0.0.1", () => {
  console.log("Open this URL in your browser:\n" + url + "\n");
});
