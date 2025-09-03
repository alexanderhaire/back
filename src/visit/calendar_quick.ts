import { google } from "googleapis";
import { v4 as uuidv4 } from "uuid";

function auth() {
  const o = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    "http://localhost"
  );
  o.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
  return o;
}

// Creates an event and lets Google email the invite (sendUpdates: "all")
export async function createVisitInvite(
  attendeeEmail: string,
  start: Date,
  end: Date,
  createMeet = true,
  timeZone = "America/New_York"
) {
  const calendar = google.calendar({ version: "v3", auth: auth() });

  const body: any = {
    summary: "Grand Villa Tour",
    description: "Your tour is scheduled. We look forward to meeting you!",
    location: "Grand Villa",
    start: { dateTime: start.toISOString(), timeZone },
    end:   { dateTime: end.toISOString(),   timeZone },
    attendees: [{ email: attendeeEmail }],
    reminders: { useDefault: true }
  };
  if (createMeet) body.conferenceData = { createRequest: { requestId: uuidv4() } };

  const res = await calendar.events.insert({
    calendarId: process.env.GOOGLE_CALENDAR_ID || "primary",
    requestBody: body,
    sendUpdates: "all",          // <-- Google emails the invite automatically
    conferenceDataVersion: 1
  });

  return { id: res.data.id!, htmlLink: res.data.htmlLink! };
}
