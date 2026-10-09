# Portable backend image — runs the SAME app identically on an Oracle Cloud
# Always Free VM (docker run), or any other host.
# Nothing host-specific lives here; all differences are environment variables.
FROM node:20-alpine

WORKDIR /app

# Chromium + fonts for the headless-browser renderer that screenshots the real
# quiz card into a pixel-identical Facebook/Instagram image (see
# src/config/cardShot.js). puppeteer-core uses this system Chromium (no bundled
# download). If this render ever fails, the app falls back to the lightweight
# SVG card, so posting never breaks.
RUN apk add --no-cache \
      chromium \
      nss \
      freetype \
      harfbuzz \
      ca-certificates \
      ttf-freefont \
      font-noto \
      ffmpeg \
    && rm -rf /var/cache/apk/*
# ffmpeg renders the AI Slideshow Reel (slides + narration → one 9:16 MP4) on
# this server — see src/config/videoCompose.js.
# puppeteer-core points here; the app also falls back to common paths.
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser \
    CHROME_BIN=/usr/bin/chromium-browser

# Install production dependencies first (better layer caching).
COPY package*.json ./
# The VM's link to registry.npmjs.org sometimes stalls ("EIDLETIMEOUT"), which
# failed a whole deploy (run #339). Give npm longer timeouts + its own retries,
# and retry the whole install up to 3 times before giving up.
RUN npm config set fetch-retries 5 \
    && npm config set fetch-retry-mintimeout 20000 \
    && npm config set fetch-retry-maxtimeout 120000 \
    && npm config set fetch-timeout 600000 \
    && for i in 1 2 3; do npm install --omit=dev --no-audit --no-fund && break; \
         [ "$i" = 3 ] && exit 1; echo "npm install failed (attempt $i) — retrying in 15s"; sleep 15; done

# App source.
COPY . .

ENV NODE_ENV=production
# The app reads PORT from the environment (defaults to 5000). On a VM you can
# leave it at 5000 and put Nginx in front; a PaaS may inject its own PORT.
EXPOSE 5000

CMD ["node", "src/server.js"]
