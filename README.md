# Commit

A small, offline-friendly productivity app for the browser, built for the **iPhone 6 Plus** (414×736 viewport, iOS 12 / Safari 12). It combines three things in one app:

- **Journal** (Home tab) with an expense summary on top
- **Habit tracker** (Commit tab) with streaks and contribution-style heatmaps
- **Expense manager** (Expenses tab) with monthly budgets and category breakdowns

It is plain HTML, CSS and JavaScript. There is no build step, no dependencies and no server-side code. All data stays on your device.

## Features

### Home: journal
- Write entries with an optional mood (5 faces). Tap a mood on the compose card to start an entry with it already selected.
- Entries are grouped by day, newest first. Tap an entry to edit or delete it.
- Search your journal (appears once you have more than 3 entries).
- Header shows your entry count and writing streak.
- **Reminders** card below the expense summary (see below).
- **Expense gist card** at the top: this month's spend, change vs last month, budget progress, today's spend, and the amount left (or your top category if no budget is set). Tap it to open Expenses, or tap **+ Add** to log an expense straight away.
- The settings button (top right) opens currency, budget and backup options.

### Home: reminders
- Add a reminder with a title, a date (quick picks: Today, Tomorrow, Next week), an optional time, and a repeat (once, daily, weekly or monthly).
- The card lists upcoming reminders soonest first. Overdue ones show in red, and the first four are shown with a "Show all" link for the rest.
- Tap the circle to complete a reminder. A repeating reminder jumps to its next date instead of disappearing; monthly ones keep their day of the month (31st reminders land on the last day of shorter months). Completed one-off reminders move to a "Completed" list where you can undo them.
- The Home tab shows a red badge counting reminders that are overdue or due today.
- **In-app alerts only.** When a reminder with a time comes due while the app is open, a banner drops from the top with **Done** and **+10 min** (snooze, one-off reminders only). If the app was closed at the time, you'll see the banner when you next open it (reminders more than a day late just show as overdue). iPhone web apps cannot send notifications when closed, so this app can't wake your phone.

### Commit: habit tracker
- **Today** view: tap the big circle to check off a commitment. The 14-day strip lets you log or correct earlier days.
- Each commitment repeats on the weekdays you choose (every day, weekdays, or any custom set) and has its own colour. Days it isn't scheduled don't break a streak.
- **Stats** view: total commits, longest streak, 30-day completion rate, an overall 17-week heatmap, and a heatmap plus current/best streak and rate for each commitment.

### Expenses
- Month switcher with total spent, budget progress bar and remaining (or over-budget) amount.
- Breakdown across 8 categories: Food, Travel, Shopping, Bills, Health, Fun, Home, Other.
- Transactions grouped by day with a daily total. Tap one to edit or delete it.
- Each expense has an amount, category, optional note and date.

## Running it

Open `index.html` in a browser, or serve the folder:

```bash
python -m http.server 5173
```

Then visit `http://localhost:5173`.

### On the iPhone

1. On your computer, serve this folder from a machine on the same Wi-Fi as the phone:
   ```bash
   python -m http.server 8000
   ```
   (Allow it through the firewall if prompted.)
2. On the phone, open `http://<your-computer's-LAN-IP>:8000` in Safari.
3. Tap **Share → Add to Home Screen** to run it full-screen like an app.

Alternatively, host the three files on any static host (GitHub Pages, Netlify, Vercel, etc.).

## Your data

Everything is stored in the browser's `localStorage` under the key `commit.v1`. Nothing is sent anywhere.

- Storage is tied to the address you open the app from. A different host, port or protocol sees a separate, empty copy.
- On iOS, the Home Screen app and Safari keep **separate** storage. Data entered in one won't appear in the other.
- Clearing site data or browsing history deletes your data.

**Back up regularly:** open settings (Home tab, top right), tap **Export**, and save the text somewhere safe. To restore (or move data between devices or between Safari and the Home Screen app), paste the text into the box and tap **Import**. Import replaces all current data.

Settings:
- **Currency symbol:** up to 3 characters (default `$`).
- **Theme:** Dark (default) or Light. It applies instantly, is remembered, and is included in backups.
- **Monthly budget:** `0` means no budget.

## Project layout

| File | Purpose |
| --- | --- |
| `index.html` | Page shell and bottom tab bar |
| `style.css` | All styling (colours are CSS variables; the light theme overrides them under `:root[data-theme="light"]`) |
| `app.js` | All logic: storage, views, events (ES5, one IIFE) |

### Data shape

```json
{
  "habits":   [{ "id": "", "name": "", "days": [0,1,2,3,4,5,6], "color": "#3fb950", "created": "YYYY-MM-DD", "log": { "YYYY-MM-DD": 1 } }],
  "journal":  [{ "id": "", "ts": 0, "date": "YYYY-MM-DD", "mood": 0, "text": "" }],
  "expenses": [{ "id": "", "ts": 0, "date": "YYYY-MM-DD", "amount": 0, "cat": "food", "note": "" }],
  "reminders": [{ "id": "", "title": "", "date": "YYYY-MM-DD", "time": "HH:MM or empty", "repeat": "none|daily|weekly|monthly", "anchor": 1, "done": false, "alerted": "" }],
  "settings": { "currency": "$", "budget": 0, "theme": "dark" }
}
```

Dates are local calendar days. `days` uses `0` for Sunday through `6` for Saturday. `mood` is `1`–`5`, or `0` for none.

## Device and browser notes

The app is designed around the iPhone 6 Plus, whose Safari tops out at iOS 12, so:

- JavaScript is ES5 (no optional chaining, `??`, `async`, modules, etc.).
- CSS avoids features Safari 12 lacks (`gap` in flexbox, `aspect-ratio`, `inset`) and uses `-webkit-` prefixes where needed.
- Layout targets a 414px-wide portrait viewport with no horizontal scroll, 44px minimum tap targets, and 16px inputs so Safari doesn't zoom on focus.
- Data entry sheets keep their Save button at the top so the on-screen keyboard doesn't cover it.

It also works in current desktop and mobile browsers. For a phone-sized view on desktop, use your browser's device emulation at 414×736.

## Ideas for later

Recurring expenses, income and balance tracking, per-commitment detail pages, and an "auto" theme that follows the system setting.
