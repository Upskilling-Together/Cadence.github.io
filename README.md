# ABC Tutoring — Website Prototype

A working prototype for ABC Tutoring's booking website, built to review with Dana before any real development investment. It's a fully static site (HTML/CSS/vanilla JS) — no backend, no database — so it can be hosted for free on GitHub Pages.

**Live site:** https://upskilling-together.github.io/Cadence.github.io/

## What's here

Three pages:

- **`index.html`** — Home page explaining the service (what ABC Tutoring offers, how requests work) with a "Request a session" button.
- **`tutors.html`** — Browse tutors with photo (placeholder), subjects, grade levels, hourly rate, availability, and a short bio. Filter by subject.
- **`dashboard.html`** — Dana's view: pending requests (with the subject and grade the parent asked for), upcoming sessions grouped by tutor, and an alert when a new request comes in.

## How booking works

A parent fills out a short request form (parent name, email, student's first name, grade, subject) from the Home or Tutors page. That creates a **pending** request — it is never shown as booked anywhere, and it never touches a tutor's schedule, until Dana opens her dashboard and approves it. All of this is stored in the browser's `localStorage`, so it resets if you clear site data or open the site in a different browser/device — there's no shared server yet.

## Notifications

While Dana's dashboard tab is open, new requests are highlighted immediately and the browser tab title flashes; she can also opt in to a native desktop notification. This only works while the tab is open — there's no email/SMS/push backend in this prototype.

## Telemetry

The site has PostHog analytics wired in (page views, button clicks, funnel from browsing to request submitted) to show usage patterns if useful later. It runs quietly in the background — there's no visible analytics UI on Dana's dashboard, since she wasn't sure yet if she wants visitor tracking as a v1 feature.

## Running it locally

No build step — just serve the folder and open it in a browser:

```bash
python3 -m http.server 5501
# then visit http://localhost:5501/index.html
```

## What's still placeholder

- Tutor photos, bios, rates, and availability are sample data — swap in Dana's real roster before launch.
- No payment or cancellation policy is implemented yet (Dana hasn't decided on one).
- No login/auth on Dana's dashboard — anyone with the link can currently view it.
- No real backend — bookings live only in one browser's local storage.
