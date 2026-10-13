# White Witch for-sale monitor

Checks <https://whitewitch.cz/en/for-sale/> every 60 seconds and e-mails you when:

| Event | Subject |
|---|---|
| A cat/kitten appears | `[White Witch] NEW CAT: <name>` |
| A cat disappears from the page | `[White Witch] CAT REMOVED: <name>` |
| Any detail changes (name, price, date of birth, sex, colour, status, description, photos, …) | `[White Witch] DETAILS CHANGED: <name>` |

Every e-mail has the cat's name and a clickable direct link. Change e-mails list each changed field with its previous and new value. New-cat e-mails are always sent first.

> **Not yet checked against the live site.** The site was unreachable from the environment where this was built, so the parser was tested only on sample WordPress-style pages. It doesn't rely on one fixed layout (details under *How it works*). Run `python monitor.py --show` once (step 4) to confirm it finds the cats correctly.

## Setup (Windows)

1. **Install Python 3** from <https://www.python.org/downloads/>. In the installer, tick **"Add python.exe to PATH"**.
2. **Open a terminal in this folder.** In File Explorer, open the `whitewitch-monitor` folder, click the address bar, type `cmd` and press Enter. Then run:

   ```bat
   py -m venv .venv
   .venv\Scripts\python -m pip install -r requirements.txt
   copy .env.example .env
   notepad .env
   ```

3. **Fill in the e-mail settings in `.env`** and save:
   - **Gmail:** turn on 2-step verification, then create an *App password* at <https://myaccount.google.com/apppasswords>. Use `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=587`, `SMTP_SECURITY=starttls`, `SMTP_USER=` your Gmail address, `SMTP_PASSWORD=` the 16-character app password, and `EMAIL_TO=` where alerts should go.
   - **Seznam.cz:** `SMTP_HOST=smtp.seznam.cz`, `SMTP_PORT=465`, `SMTP_SECURITY=ssl`, plus your full address and password.
   - **Other providers:** use their SMTP server details. `EMAIL_TO` takes several addresses separated by commas.
4. **Check that everything works:**

   ```bat
   .venv\Scripts\python monitor.py --test-email
   .venv\Scripts\python monitor.py --show
   ```

   `--test-email` sends a test e-mail. `--show` prints every cat the parser finds, with its link, details and photos. It sends no e-mail and saves nothing.
5. **Start monitoring:** double-click **`run_monitor.bat`**, or run `.venv\Scripts\python monitor.py`.

   The first successful check only records what is listed now (the *baseline*) and sends no e-mails. After that, each check prints a line such as `Check OK: 3 listed, 0 new, 0 changed, 0 removed.` Stop the monitor with Ctrl+C or by closing the window.

## Commands

| Command | What it does |
|---|---|
| `python monitor.py` | Runs continuously |
| `python monitor.py --once` | Runs one check now, sends any notifications, then exits |
| `python monitor.py --show` | Shows what the parser sees (no e-mail, state untouched) |
| `python monitor.py --test-email` | Sends a test e-mail |
| `scan_now.bat`, or creating an empty file named `SCAN_NOW` in this folder | Makes the running monitor check immediately |
| `python -m unittest -v` | Runs the offline tests |

To start over with a new baseline, stop the monitor and delete `state.json`.

## Start automatically with Windows

**Simplest:** press `Win+R`, type `shell:startup`, press Enter, and put a shortcut to `run_monitor.bat` in the folder that opens (right-drag the file there → *Create shortcuts here*). The monitor starts in a window each time you log in. To keep the window out of the way, open the shortcut's Properties and set *Run* to *Minimized*.

**Without a window (Task Scheduler):**

1. Open *Task Scheduler* → *Create Task…*.
2. *General* tab: name it `White Witch monitor` and tick *Run whether user is logged on or not*.
3. *Triggers* tab → *New…* → *At log on* (or *At startup*).
4. *Actions* tab → *New…*:
   - *Program:* the full path to `run_monitor.bat`
   - *Start in:* the full path to this folder
5. *Settings* tab: untick *Stop the task if it runs longer than…*.

Either way, output also goes to `monitor.log` in this folder. `run_monitor.bat` restarts the monitor if Python ever exits.

## How it works

- **Fetching.** Uses one persistent HTTP session with timeouts and automatic retries. Sends conditional requests (ETag / Last-Modified) where the server supports them, and follows `robots.txt`. The page is plain server-rendered HTML as far as can be told, so no browser or Playwright is used. If the page turns out to need JavaScript, the monitor logs a clear error instead of reporting nothing.
- **Parsing** (`parse_listing` / `parse_detail` in `monitor.py`). Takes the page's main content area, strips menus, headers, footers, language switchers and cookie bars, then splits it into cats:
  1. one cat per heading (the most common heading level), or
  2. if there are no headings, one cat per link to a sub-page, or
  3. if neither is found, the whole page as a single entry, so any change is still reported.
- **Detail pages.** If a cat has its own page, that link becomes its identity and the direct link in e-mails. The page is read for the full description, extra fields (father, mother, …) and photos:
  - immediately when the cat appears or its card changes
  - otherwise every `DETAIL_REFRESH_SECONDS` (at most 3 per check)
- **Field extraction.** Picks up `Label: value` lines and table rows in English and Czech: date of birth, sex, colour/EMS, breed, price, status, father, mother and any other labels. It also recognises prices (Kč/EUR), dates, male/female and available/reserved/sold even without labels.
- **Ignored differences:** whitespace, HTML formatting, tracking parameters (`utm_*`, `fbclid`, …), `www.`, trailing slashes, and WordPress image size variants (`-300x200.jpg`).
- **State.** Saved in `state.json`, written atomically. It is updated only after a complete, successful check, so a restart never repeats alerts.
- **Failed checks.** Network errors, non-200 responses, truncated or empty pages and parsing failures leave the saved state untouched. They are never treated as "all cats removed".
- **Removals.** A cat must be missing on `REMOVAL_CONFIRMATIONS` (default 2) successful checks in a row before a removal e-mail goes out, which filters out one-off glitches.
- **E-mail delivery.** Notifications are saved to an outbox before sending and stay there until the SMTP server accepts them. They are retried every check, and after a restart.
- **Renames.** A cat with its own page is matched by its URL, so a new name is reported as a change. Without its own page, a renamed cat is matched by shared photos.

## If the website changes or the parser gets it wrong

Run `python monitor.py --show`. If it picks up the wrong things, set these in `.env`:

- `CONTENT_SELECTOR`: a CSS selector for the area that holds the listings, e.g. `.entry-content`.
- `CAT_LINK_PATTERN`: a regular expression every individual cat link must match, e.g. `/kitten/`.

Then delete `state.json` so a new baseline is recorded.

## Limitations

- Not yet verified against the real whitewitch.cz HTML (see the note at the top).
- At-least-once delivery: if the PC loses power in the second between an e-mail being accepted and the outbox being saved, that one e-mail can arrive twice.
- If the page shows a counter that changes on its own (e.g. "age: 9 weeks"), that change is reported, because age is one of the tracked fields.
- Without its own page and without photos, a renamed cat is reported as one cat removed and one new cat.
