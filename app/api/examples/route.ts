import { database, response, session, validOrigin } from "../../../lib/store";
export async function POST(req: Request) {
  const sid = session(req);
  if (!validOrigin(req))
    return response(req, sid, { error: "Origin not allowed." }, 403);
  const db = await database();
  const examples = [
    [
      "sand",
      "Sunday sand social",
      "Beach volleyball",
      "Barceloneta beach · meeting point to confirm",
      12,
      "A relaxed beach volleyball session for beginners and improvers. Bring water and sun protection. This is a fictional example for testing.",
      "Free spectator interest. No reserved seating or venue booking.",
    ],
    [
      "padel",
      "The friendly americana",
      "Padel",
      "Poblenou · court to confirm",
      8,
      "Rotate partners, meet new people and practise together. This example has no court booking and does not collect payments.",
      "Spectators welcome in this example. Access requires organiser confirmation.",
    ],
    [
      "basket",
      "Sunset hoops",
      "Basketball",
      "Parc de la Ciutadella · court to confirm",
      10,
      "An informal basketball meet for mixed abilities. A fictional listing to test player signups and spectator discovery.",
      "Free spectator interest. Shared public space, no reserved seats.",
    ],
  ];
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`courtside-examples:${sid}`),
  );
  const key = Array.from(new Uint8Array(digest), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
  await db.batch(
    examples.map((e, i) =>
      db
        .prepare(
          "INSERT OR IGNORE INTO events (id,owner,title,sport,venue,starts,capacity,description,access,status,demo) VALUES (?,?,?,?,?,?,?,?,?,'published',1)",
        )
        .bind(
          `sample-${e[0]}-${key}`,
          sid,
          e[1],
          e[2],
          e[3],
          new Date(Date.now() + (i + 3) * 86400000).toISOString(),
          e[4],
          e[5],
          e[6],
        ),
    ),
  );
  return response(req, sid, { ok: true });
}
