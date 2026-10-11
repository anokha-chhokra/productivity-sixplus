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
- **Mood trend** card (appears once any entry has a mood): switch between 7, 30 and 90 days to see your average mood, whether it's up or down versus the previous period, a line chart of your daily average (several entries on one day are averaged), and how many entries fell on each of the five moods. Entries without a mood are ignored.
- Search your journal (appears once you have more than 3 entries).
- Header shows your entry count and writing streak.
- **Reminders** card below the expense summary (see below).
- **Expense gist card** at the top: this month's spend, change vs last month, budget progress, today's spend, and the amount left (or your top category if no budget is set). When you have income or several accounts it also shows your **net balance** and this month's income. Tap it to open Expenses, or tap **+ Add** to log a transaction straight away.
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
- **Tags:** label a commitment with any number of tags (Health, Work, Mind...). In the commitment sheet, tap existing tags to turn them on or off, or type a new one and tap **Add** (or Enter). Tags are matched ignoring case, so `health` and `Health` are the same tag, and a leading `#` is dropped. Tags show as small pills on each card, and a tag disappears on its own once no commitment uses it.
- **Filter by tag:** a row of tag chips on both Today and Stats narrows the list, the progress bar, the day-strip dots, the totals and the heatmaps to that tag. While a tag is selected, new commitments start with it.
- **Stats** view: total commits, longest streak, 30-day completion rate, an overall 17-week heatmap, and a heatmap plus current/best streak and rate for each commitment. With tags in use, a **By tag** panel compares each tag's 30-day completion rate.

### Expenses
- **Income and expenses.** The **+** button opens a sheet with an Expense / Income switch. Each transaction has an amount, an **account**, a category, an optional note and a date.
- **Accounts.** The app starts with Cash and Bank. Add more (savings, card, wallet...), choose an icon and colour, and set a starting balance (negative for a card you owe on). Tap an account to edit it. Deleting an account moves its transactions to your first remaining account.
- **Net balance** at the top is the sum of all account balances. An account's balance is its starting balance plus income minus expenses logged to it.
- **Month view:** switch months, filter everything below by account (or "All accounts"), and see Income, Spent and Net for the month, plus the budget bar and remaining amount when viewing all accounts.
- Spending is broken down across 8 categories (Food, Travel, Shopping, Bills, Health, Fun, Home, Other). Income has its own 8 (Salary, Freelance, Business, Gift, Interest, Refund, Sale, Other).
- Transactions are grouped by day with the day's net. Income shows in green. Tap a transaction to edit or delete it.
- Transactions you logged before accounts existed are moved into your first account automatically. Set its starting balance to correct the total.

## Running it

Open `index.html` in a browser, or serve the folder:

```bash
python -m http.server 5173
```

Then visit `http://localhost:5173`.

### Offline support

The app registers a service worker (`sw.js`) that caches all of its files, so it opens with no internet connection (airplane mode, no signal). Your data was always stored locally, so everything keeps working offline.

- **It needs HTTPS** (or `localhost`). Browsers only allow service workers on secure origins, so a plain `http://192.168.x.x:8000` address on your Wi-Fi will **not** get offline support. Host the folder on any HTTPS static host (GitHub Pages, Netlify, Vercel, Cloudflare Pages...) to use it on your phone.
- **First visit must be online.** Open the app once while connected and keep it open for a moment. Settings shows **Offline mode: Ready** when it's set up. If it says "Not available", the page isn't being served securely.
- **Updates:** while you're online the app always fetches the newest files (falling back to the saved copy if the network is down or takes more than 3 seconds). If you add or rename files, add them to `ASSETS` in `sw.js` and bump `CACHE` (e.g. `commit-v2`) so devices pick up the change.
- **Clearing Safari's website data** removes both the saved files and your journal/habit/expense data, so export a backup first.

### On the iPhone

**Recommended (works offline):** host the folder on an HTTPS static host, open the URL in Safari, and tap **Share → Add to Home Screen**. The Home Screen icon comes from `icon-180.png`.

**Quick local test (online only):**
1. On your computer, serve this folder from a machine on the same Wi-Fi as the phone:
   ```bash
   python -m http.server 8000
   ```
   (Allow it through the firewall if prompted.)
2. On the phone, open `http://<your-computer's-LAN-IP>:8000` in Safari.
3. Tap **Share → Add to Home Screen** to run it full-screen like an app. Offline mode won't be available over plain HTTP (see above).

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
| `sw.js` | Service worker for offline support |
| `manifest.json` | Web app manifest (name, colours, icons) |
| `icon-180.png`, `icon-192.png`, `icon-512.png` | App icons (180px is the iPhone Home Screen icon) |

### Data shape

```json
{
  "habits":   [{ "id": "", "name": "", "days": [0,1,2,3,4,5,6], "color": "#3fb950", "tags": ["Health"], "created": "YYYY-MM-DD", "log": { "YYYY-MM-DD": 1 } }],
  "journal":  [{ "id": "", "ts": 0, "date": "YYYY-MM-DD", "mood": 0, "text": "" }],
  "accounts": [{ "id": "", "name": "Cash", "icon": "💵", "color": "#3fb950", "opening": 0 }],
  "expenses": [{ "id": "", "ts": 0, "date": "YYYY-MM-DD", "amount": 0, "type": "expense|income", "acct": "account id", "cat": "food", "note": "" }],
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

Transfers between accounts, recurring transactions, per-commitment detail pages, and an "auto" theme that follows the system setting.
