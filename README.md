# ASHEN OATH — Riftbound

Een browser-based 2D side-view fantasy fighter met pixel-art visuals, snelle combat, vier wapens, vijandgolven en een eindbaas. De game is gebouwd met vanilla HTML, CSS en JavaScript: **geen installatie, framework, backend of externe game-assets nodig**.

## Direct lokaal spelen

1. Download of clone deze repository.
2. Open `index.html` in een moderne browser.
3. Druk op **Enter** of klik op het scherm.

Je kunt ook een kleine lokale webserver gebruiken (optioneel):

```bash
python -m http.server 8000
```

Open daarna <http://localhost:8000>.

## Online zetten met GitHub Pages

1. Maak op GitHub een nieuwe repository, bijvoorbeeld `ashen-oath`.
2. Upload **alle bestanden en mappen** uit deze projectmap naar de hoofdmap (`/`) van de repository.
3. Open in GitHub **Settings → Pages**.
4. Kies bij **Build and deployment** voor **Deploy from a branch**.
5. Selecteer branch **main** en map **/(root)** en klik op **Save**.
6. Na de publicatie staat je game op `https://JOUW-GITHUB-NAAM.github.io/ashen-oath/`.
7. Deel die link met je vrienden. Iedereen speelt zijn eigen singleplayer-run; er is geen account of server nodig.

**Let op:** een GitHub Pages-site is publiek bereikbaar. Zet dus geen wachtwoorden, tokens of persoonlijke gegevens in de repository.

GitHub Pages kan een paar minuten nodig hebben om de eerste publicatie klaar te zetten.

## Besturing

| Toets | Actie |
|---|---|
| `A` / `D` of `←` / `→` | Bewegen |
| `W` / `Space` / `↑` | Springen |
| `J` | Aanval / combo |
| `K` | Zware aanval |
| `L` | Dash / ontwijken |
| `Shift` | Block / parry |
| `U` | Speciale aanval (bij 100 resolve) |
| `1` – `4` | Wissel van wapen |
| `P` / `Esc` | Pauzeren |
| `Enter` | Starten, hervatten of opnieuw proberen |

Op touchscreens verschijnen ook knoppen in beeld.

## Wapens

- **Emberblade** — gebalanceerd, snel en betrouwbaar.
- **Moonpiercer** — langer bereik en krachtige precisie-aanvallen.
- **Fang & Fury** — snelle combo's met hoge aanvalssnelheid.
- **Titan Maul** — trager, maar met zware impact en veel knockback.

Vul je resolve-meter door vijanden te raken en succesvol te blocken. Bij 100 resolve kun je met `U` een wapen-specifieke special loslaten.

## Projectstructuur

```text
ashen-oath/
├── index.html      # Gamepagina en HUD-layout
├── styles.css      # Responsieve vormgeving
├── game.js         # Gameplay, pixel-art rendering, VFX en audio
├── favicon.svg     # Klein game-icoon
├── README.md       # Deze uitleg
└── CHANGELOG.md    # Versiegeschiedenis
```

## Techniek

- Canvas-rendering op een vaste 480×270 resolutie met pixelated scaling.
- Pixel-art personages, vijanden, omgeving en wapens worden rechtstreeks getekend in Canvas.
- Particles, slash arcs, hit flashes, camera shake, screen flash, projectiles en eenvoudige gegenereerde SFX.
- Alle gameplay draait lokaal in de browser. Er worden geen spelersgegevens verstuurd.

## Licentie

MIT — zie `LICENSE`.

## Officiële GitHub Pages-documentatie

- [Een GitHub Pages-site maken](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site)
- [Publiceren vanuit een branch](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)
