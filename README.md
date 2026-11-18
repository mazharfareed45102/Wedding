# Wedding Decor Studio

Upload a photo of your home (living room, courtyard, lawn, rooftop or house front) and get an expert wedding decor plan with **before and after pictures** of your own space.

An AI interior designer:

- **studies your photo** like a site visit: the size, light, walls, windows, doors and power points
- **picks the best spot for the stage** and explains why
- gives you **three different decor concepts** for your function (Mehndi, Haldi/Mayun, Dholki, Sangeet, Nikah, Baraat, Walima/Reception, Engagement, Western ceremony or bridal shower), each with a color palette, stage design, decor for every area, a lighting plan, a shopping and rental list with prices, money-saving tips and setup time
- creates a **photorealistic "after" picture** of your space decorated in that concept, with a drag slider to compare it with your original photo
- lets you **refine the picture** ("add more marigolds on the ceiling", "make the stage bigger"), keep several versions, download them, and save the whole plan as a PDF

It comes as an **Android app** (see below) and as a **website** you can run or host yourself.

## Android app (APK)

Every push to GitHub builds a fresh Android app automatically.

**Download:** open the [latest-apk release](https://github.com/mazharfareed45102/Wedding/releases/tag/latest-apk) on your Android phone and tap **WeddingDecorStudio.apk**.

**Install:**

1. Open the downloaded file. If Android asks, allow your browser or file manager to install apps ("Install unknown apps").
2. If Google Play Protect warns about an unknown developer, tap **More details → Install anyway**. This is normal for apps that aren't from the Play Store.
3. Open **Wedding Decor Studio**, tap the **gear icon** (top right) and paste your API keys (see [API keys](#api-keys)). Without keys the app shows sample designs.

The app doesn't need a website or server: it sends your photo straight from your phone to Claude and to the image service, using your own keys. Keys are stored only on the phone. Use **Take a photo now** to snap your space, and **Save or share photo** / **Share this plan** to send designs to family on WhatsApp.

New builds install over the old one and keep your keys. Every build is signed with the same key, which is committed in `android/` so the automatic build can use it. That's fine for installing the app yourself; create your own private signing key before publishing to Google Play.

**Build it yourself** (needs Android Studio or the Android SDK and Java 21):

```bash
npm install
npm run android:sync          # builds the app files and copies them into android/
cd android && ./gradlew assembleRelease
# → android/app/build/outputs/apk/release/app-release.apk
```

The build runs in `.github/workflows/android.yml`; you can also start it by hand from the **Actions** tab (**Build Android app → Run workflow**).

## Website version: quick start

You need [Node.js](https://nodejs.org) 20.9 or newer.

```bash
npm install
cp .env.example .env.local   # then add your API keys (see below)
npm run dev
```

Open http://localhost:3000.

**No keys yet?** The app still runs in **demo mode**. It shows sample designs and a simple sketch overlay, so you can try the whole flow before you add keys.

## API keys

In the Android app, add them under the gear icon (Settings). For the website, add them to `.env.local` (or to your hosting provider's environment variables):

| Variable | Needed for | Where to get it |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | The AI designer: photo analysis and design plans (Claude) | https://console.anthropic.com/ |
| `GEMINI_API_KEY` | Photorealistic after pictures (Google's image model) | https://aistudio.google.com/apikey |
| `OPENAI_API_KEY` | After pictures from OpenAI GPT Image, if you don't use Gemini | https://platform.openai.com/api-keys |

You need `ANTHROPIC_API_KEY` plus **one** image key. If both image keys are set, Gemini is used unless you set `IMAGE_PROVIDER=openai`.

**Cost:** each design plan uses one Claude request, about $0.10 to $0.20 with the default model. Each after picture is one image-model request; check your provider's current image pricing. A full design with one picture usually costs well under a dollar.

### Optional settings

| Variable | Default | What it does |
| --- | --- | --- |
| `APP_PASSCODE` | *(none)* | **Set this when you put the app online.** Visitors must enter the passcode, so strangers can't spend your API credits. |
| `IMAGE_PROVIDER` | `gemini` | `gemini` or `openai`, when both keys are set |
| `GEMINI_IMAGE_MODEL` | tries `gemini-3.1-flash-image`, then older models | Force a specific Gemini image model |
| `OPENAI_IMAGE_MODEL` | tries `gpt-image-2`, `gpt-image-1.5`, `gpt-image-1` | Force a specific OpenAI image model |
| `OPENAI_IMAGE_QUALITY` | `medium` | `low`, `medium` or `high` (higher is slower and costs more) |
| `DESIGNER_MODEL` | `claude-opus-5-5` | Claude model used for the design analysis |
| `DESIGNER_EFFORT` | `medium` | `low`, `medium`, `high`, `xhigh` or `max`. Higher means more thorough, slower and more expensive. |

Image model names change often, so the app tries a short list for each provider and skips any your key can't use. If none of them work, the error message tells you which variable to set.

## Put it online (Vercel)

1. Push this repository to GitHub (already done if you're reading this there).
2. On [vercel.com](https://vercel.com), choose **Add New → Project** and import the repository.
3. Under **Environment Variables**, add `ANTHROPIC_API_KEY`, `GEMINI_API_KEY` (or `OPENAI_API_KEY`) and `APP_PASSCODE`.
4. Click **Deploy**. Open the link on your phone and share it with family, along with the passcode.

The design and image requests can take up to a minute or two. The API routes allow up to 180 seconds, which Vercel supports with Fluid Compute (on by default for new projects).

Any host that runs Next.js works too: `npm run build && npm start`.

## How it works

```
Your photo ──► /api/analyze ──► Claude (vision + structured output)
                                  └─ space assessment, stage spot, 3 concepts,
                                     shopping list, and an edit prompt per concept
          ──► /api/generate ──► Gemini or OpenAI image editing
                                  └─ your original photo + the concept's edit prompt
                                     = the "after" picture
```

- `app/page.tsx` is the whole user interface: upload, event form, results, before/after slider and refine.
- `lib/ai/` holds the AI calls, shared by the website's API routes (`app/api/`) and the Android app, which calls the AI services directly from the phone (`lib/client/backend.ts`).
- `lib/prompts.ts` holds the designer's instructions. Edit it to change the designer's style or advice.
- `lib/schema.ts` defines the structured design plan Claude returns.
- `lib/ai/designer.ts` makes the Claude call; `lib/ai/images.ts` handles the image providers.
- `android/` is the Android project (Capacitor). `scripts/build-mobile.mjs` builds the app files it packages.
- `lib/demo.ts` holds the sample design used in demo mode.

Photos are resized to 1600 px before upload. The app stores nothing on any server: photos and designs are sent to Anthropic and your image provider to generate results, and otherwise live only on your device.

## Tips for the best results

- Take the photo in **landscape** from a corner or doorway so the whole area is visible.
- Include the wall or spot where you imagine the stage.
- Daylight photos give the most accurate designs.
- AI pictures are inspiration. Confirm sizes, safety (candles, electrical load, rain) and prices with your decorator before booking.
