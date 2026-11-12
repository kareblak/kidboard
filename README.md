# Kidboard

Wall board for the kids' iPad: analog clock with the Norwegian time phrase, today's events, what to pack, homework with tick boxes, ukas ord, tomorrow, and a seven-day strip. Installs as a fullscreen PWA from GitHub Pages.

## Privacy

The site is public, but the board data is not. `data.json` is encrypted (ECDH P-256 → HKDF-SHA256 → AES-256-GCM) to the key in `public-key.json`. Anyone can write new data with the public key; only a paired device can read it. The private key exists only as the **pairing code** (`KB1-…`), which is never committed.

Homework ticks are stored on the device only.

## Pairing a device

1. Open the site in Safari, Share → Add to Home Screen, then open Kidboard from the home screen.
2. Paste the pairing code when asked. It is stored on the device; no login after that.

Home-screen apps on iOS have their own storage, so pair inside the installed app, not in a Safari tab. If the key is ever replaced, the board asks for the new code.

## Updating the data

Write the plain data to a file **outside the repo** (or a gitignored name such as `plain.json`), then:

```sh
node scripts/encrypt.mjs /tmp/plain.json   # validates, encrypts, writes data.json
git add data.json && git commit -m "Oppdater tavla" && git push
```

The board fetches `data.json` every 10 minutes and whenever it is brought to the front.

### Plain data format

Everything about the children (ids, names, labels, colours) lives in the data file; the code has none of it. Example with made-up children:

```jsonc
{
  "updatedAt": "2026-03-02T06:00:00+01:00",
  // optional: where the weather block forecasts for (decimal degrees); leave out to hide it
  "weather": { "lat": 59.913, "lon": 10.739 },
  "kids": [
    // one column per child, in this order; color is #RRGGBB (lightened automatically in dark mode)
    { "id": "kid1", "name": "Nora", "sub": "4. trinn", "color": "#2E6DB4" },
    { "id": "kid2", "name": "Theo", "sub": "1. trinn", "color": "#CC4B26" }
  ],
  "events": [
    // kids: ids from kids[]; [] when it's unclear who it's for
    { "id": "e-20260303-turn", "date": "2026-03-03", "start": "17:30", "end": "18:30",
      "title": "Turn", "short": "Turn", "place": "Idrettshallen",
      "bring": "Turntøy og drikkeflaske", "kids": ["kid1", "kid2"] },
    { "id": "e-20260305-skidag", "date": "2026-03-05", "endDate": "2026-03-06",
      "title": "Skidager på skolen", "short": "Skidag", "kids": ["kid2"] }
  ],
  "homework": [
    // ISO week; due (YYYY-MM-DD) or daily:true or neither ("i løpet av uka"). Keep ids stable so ticks survive updates.
    { "id": "kid1-2026W10-mat", "kid": "kid1", "week": "2026-W10", "subject": "Matte",
      "text": "Regnebok s. 12–13", "due": "2026-03-04", "order": 1 }
  ],
  "words": [
    { "kid": "kid2", "week": "2026-W10", "label": "Ukas ord", "words": ["sol", "snø"], "song": "Vårsangen" }
  ]
}
```

The weather block shows today's high and low (tomorrow's after 18:00) and a Yr symbol, fetched live from MET Norway's [Locationforecast API](https://api.met.no/weatherapi/locationforecast/2.0/documentation) every 30 minutes. Data from MET Norway (CC BY 4.0); weather icons from [metno/weathericons](https://github.com/metno/weathericons) (MIT, see `icons/weather/LICENSE`).

`bring` drives the yellow "Husk i dag" tags and the "Pakk:" lines in each child's "I morgen" box. On weekends the board shows next week's homework.

## New key

`node scripts/keygen.mjs` writes a new `public-key.json` and prints a new pairing code. Re-encrypt the data and pair the iPad again.

## Shell updates

When changing `index.html`, `crypto.js` or the icons, bump `VERSION` in `sw.js`. Open boards pick up the new version within an hour and reload themselves.
