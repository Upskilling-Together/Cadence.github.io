/**
 * Seeds realistic historical traffic straight into PostHog via its HTTP
 * batch capture endpoint — no browser needed, so nothing can get lost to
 * an async script load or a closed headless context.
 *
 * Docs: https://posthog.com/docs/api/capture
 *
 * Usage:
 *   node seed-posthog.js
 *
 * Uses the same project key already wired into the site.
 */

const https = require('https');

const POSTHOG_KEY = 'phc_AWVBjKcPBbz8EeGPc5zkeukVVApoSM4FnXHs3oDnFDjz';
const POSTHOG_HOST = 'us.i.posthog.com';
const SITE_URL = 'https://winphyusin.github.io/abc-tutoring-prototype/';
const DASH_URL = 'https://winphyusin.github.io/abc-tutoring-prototype/dashboard.html';

const TUTORS = [
  { id: 't1', name: 'Maria Chen', subject: 'math' },
  { id: 't2', name: 'Jordan Alvarez', subject: 'math' },
  { id: 't3', name: 'Priya Nair', subject: 'math' },
  { id: 't4', name: 'Sam Whitfield', subject: 'math' },
  { id: 't5', name: 'Elena Brooks', subject: 'science' },
  { id: 't6', name: 'Tasha Green', subject: 'reading' },
];

const FIRST_NAMES = ['Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Jamie', 'Avery',
  'Hannah', 'Marcus', 'Priya', 'Ivy', 'Owen', 'Noah', 'Mia', 'Ethan', 'Sofia', 'Liam',
  'Zoe', 'Lucas', 'Grace', 'Diego', 'Nora', 'Kai', 'Emma', 'Leo', 'Ruby', 'Sam'];
const LAST_NAMES = ['Rivera', 'Kim', 'Brown', 'Patel', 'Nguyen', 'Garcia', 'Lee', 'Smith',
  'Johnson', 'Martinez', 'Clark', 'Walker', 'Young', 'Hall', 'Allen', 'Wright'];
const GRADES = ['K', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th'];

function rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

// Spread activity across the last 14 days, weighted a bit heavier on the
// most recent days and lighter on weekends, so trend charts look organic.
function randomTimestamp(daysAgoMax) {
  const daysAgo = Math.random() < 0.6
    ? randInt(0, Math.floor(daysAgoMax / 2))
    : randInt(0, daysAgoMax);
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(randInt(7, 21), randInt(0, 59), randInt(0, 59), 0);
  return d.toISOString();
}

const events = [];
let danaSessionCount = 0;
const submittedBookings = [];

const PARENT_COUNT = 42;

for (let i = 0; i < PARENT_COUNT; i++) {
  const parentId = `sim-parent-${i + 1}`;
  const parentName = `${rand(FIRST_NAMES)} ${rand(LAST_NAMES)}`;
  const ts = randomTimestamp(14);

  // Every simulated visitor lands on the page.
  events.push({
    event: '$pageview',
    distinct_id: parentId,
    timestamp: ts,
    properties: { $current_url: SITE_URL, $role: 'parent' },
  });

  // ~70% narrow down by subject.
  if (Math.random() < 0.7) {
    const subject = rand(['math', 'science', 'reading']);
    events.push({
      event: 'tutor_filter_used',
      distinct_id: parentId,
      timestamp: ts,
      properties: { subject, $role: 'parent' },
    });
  }

  // ~55% open a booking modal for a tutor.
  if (Math.random() < 0.55) {
    const tutor = rand(TUTORS);
    const grade = rand(GRADES);
    events.push({
      event: 'booking_modal_opened',
      distinct_id: parentId,
      timestamp: ts,
      properties: { tutorId: tutor.id, tutorName: tutor.name, subject: tutor.subject, $role: 'parent' },
    });

    // Of those, ~65% actually submit — the rest is the drop-off Dana's deck talks about.
    if (Math.random() < 0.65) {
      events.push({
        event: 'booking_submitted',
        distinct_id: parentId,
        timestamp: ts,
        properties: {
          tutorId: tutor.id, tutorName: tutor.name, subject: tutor.subject,
          grade, parentName, $role: 'parent',
        },
      });
      submittedBookings.push({ parentId, parentName, tutor, grade, ts });
    }
  }
}

// Dana checks the dashboard repeatedly over the same window and works
// through the queue — approvals a little more often than declines.
const DANA_ID = 'dana';
const dashVisits = 18;
for (let i = 0; i < dashVisits; i++) {
  const ts = randomTimestamp(14);
  events.push({
    event: '$pageview',
    distinct_id: DANA_ID,
    timestamp: ts,
    properties: { $current_url: DASH_URL, $role: 'dashboard' },
  });
  events.push({
    event: 'dashboard_viewed',
    distinct_id: DANA_ID,
    timestamp: ts,
    properties: { $role: 'dashboard' },
  });
  danaSessionCount++;
}

submittedBookings.forEach((b) => {
  // Decide on most requests a little after they came in.
  const decided = new Date(b.ts);
  decided.setHours(decided.getHours() + randInt(2, 30));
  if (decided > new Date()) return; // don't decide on something "in the future"

  if (Math.random() < 0.78) {
    events.push({
      event: 'booking_approved',
      distinct_id: DANA_ID,
      timestamp: decided.toISOString(),
      properties: {
        tutorId: b.tutor.id, tutorName: b.tutor.name, subject: b.tutor.subject,
        grade: b.grade, parentName: b.parentName, $role: 'dashboard',
      },
    });
  } else {
    events.push({
      event: 'booking_declined',
      distinct_id: DANA_ID,
      timestamp: decided.toISOString(),
      properties: {
        tutorId: b.tutor.id, tutorName: b.tutor.name, subject: b.tutor.subject,
        grade: b.grade, parentName: b.parentName, $role: 'dashboard',
      },
    });
  }
});

events.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

console.log(`Prepared ${events.length} events:`);
console.log(`  ${PARENT_COUNT} simulated parent visits`);
console.log(`  ${submittedBookings.length} booking_submitted`);
console.log(`  ${dashVisits} dashboard_viewed (Dana)`);
console.log(`  ${events.filter(e => e.event === 'booking_approved').length} booking_approved`);
console.log(`  ${events.filter(e => e.event === 'booking_declined').length} booking_declined`);

function postBatch(batch) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ api_key: POSTHOG_KEY, batch });
    const req = https.request(
      {
        hostname: POSTHOG_HOST,
        path: '/batch/',
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
      },
      (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) resolve(data);
          else reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        });
      }
    );
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function main() {
  const CHUNK = 100;
  for (let i = 0; i < events.length; i += CHUNK) {
    const chunk = events.slice(i, i + CHUNK);
    await postBatch(chunk);
    console.log(`  sent ${Math.min(i + CHUNK, events.length)}/${events.length}`);
  }
  console.log('Done. Give PostHog a minute or two to process, then check Activity / your dashboard.');
}

main().catch((err) => {
  console.error('Failed:', err.message);
  process.exit(1);
});
