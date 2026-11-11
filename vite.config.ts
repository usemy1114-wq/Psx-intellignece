import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";
import { AsyncLocalStorage } from "node:async_hooks";

// Dev model (DESIGN §5.1 / M1): Vite serves the SPA on PORT (default 3000) with
// native HMR; API calls to /trpc and /app-storage are proxied to the Hono API
// process (dev:api on API_PORT, default 3001). In prod there is NO Vite — the
// single Hono process (dist/index.js) serves the built client from dist/public
// AND the API. Keeping runtime fs to that one prod shim (server/_core/serve.ts)
// is what keeps the template edge-portable (§5.7.3).
//
// base: './' — RELATIVE, not '/'. The app must work at any mount path, not only
// at the origin root: the platform serves previews under a prefix such as
// /swarm/api/webapps/<id>/preview. With base '/' every emitted asset URL was
// root-absolute, so opening that prefixed URL in a new tab asked the HOST for
// /src/main.tsx, got a 404, and rendered an empty shell — the HTML loaded and
// nothing else did. Relative URLs resolve against whatever prefix the document
// was served from, which is correct in every case (root, prefix, deep link).
//
// See client/src/lib/base-path.ts for the runtime side and
// server/_core/base-path.ts for the server side.
const WEB_PORT = Number(process.env.PORT ?? 3000);
const API_PORT = Number(process.env.API_PORT ?? 3001);
const apiProxy = { target: `http://localhost:${API_PORT}`, changeOrigin: true };

/**
 * The platform's preview prefix, e.g. /swarm/api/webapps/<id>/preview.
 *
 * Whether the upstream proxy strips this before forwarding is not something this
 * repo controls, and it has differed between environments. Handling it here
 * makes the dev server correct either way: if the prefix arrives, it is removed
 * so Vite sees the app-relative path it expects; if it was already stripped,
 * this is a no-op. The BROWSER's URL keeps the prefix, which is what the
 * relative asset URLs and the router base resolve against.
 */
const PREVIEW_PREFIX = /^(\/swarm\/api\/webapps\/[^/]+\/preview)(\/.*)?$/;

/**
 * Dev-time base-path support.
 *
 * 1. Strips the preview prefix from incoming requests (see above).
 * 2. Rewrites index.html so EVERY asset reference carries the app's real mount
 *    prefix, and writes a matching `<base href="{prefix}/">`.
 *
 * WHY AN ABSOLUTE PREFIX AND NOT `./` — this is the subtle part, and getting it
 * wrong is what produced a blank page even after the prefix was stripped
 * correctly. A relative URL resolves against the DOCUMENT's URL, and the
 * document URL here is `…/preview` with NO trailing slash. The browser treats
 * the last segment as a file name, so `./src/main.tsx` resolved to
 * `…/webapps/<id>/src/main.tsx` — one directory too high — and the entry module
 * came back as index.html (200, text/html), which the browser refuses to execute
 * as a module. The page loaded its title and nothing else.
 *
 * The fix is to emit the prefix the request actually arrived under, which the
 * middleware knows. It is carried to transformIndexHtml through
 * AsyncLocalStorage rather than a module variable, so two concurrent requests
 * under different prefixes cannot read each other's value.
 *
 * `order: "post"` is also load-bearing: Vite and the react plugin inject their
 * own tags during transformIndexHtml — `/@vite/client`, the react-refresh
 * preamble, the entry `/src/main.tsx`. Running BEFORE them (order "pre")
 * rewrote only the tags already in the source file, so the injected ones stayed
 * root-absolute and still 404'd under a prefix.
 */
function appBasePathPlugin() {
  const als = new AsyncLocalStorage<{ base: string }>();

  return {
    name: "app-base-path",
    configureServer(server: {
      middlewares: { use: (fn: (req: { url?: string }, res: unknown, next: () => void) => void) => void };
    }) {
      server.middlewares.use((req, _res, next) => {
        const original = req.url ?? "/";
        const m = original.match(PREVIEW_PREFIX);
        // The prefix the BROWSER used, e.g. "/swarm/api/webapps/<id>/preview".
        const base = m ? m[1] : "";
        if (m) req.url = m[2] && m[2].length > 0 ? m[2] : "/";
        als.run({ base }, () => next());
      });
    },
    transformIndexHtml: {
      order: "post" as const,
      handler(html: string) {
        const base = als.getStore()?.base ?? "";
        const prefix = base; // "" at the root
        let out = html;

        // 1. Root-absolute attribute refs → prefixed. `//host` and full URLs
        //    are left alone (the negative lookahead).
        out = out.replace(
          /\b(src|href)="\/(?!\/)/g,
          (_m: string, attr: string) => `${attr}="${prefix}/`,
        );

        // 2. Vite-internal module specifiers inside inline scripts, e.g.
        //    `from "/@react-refresh"`. These are string literals, not
        //    attributes, so the pass above cannot see them.
        out = out.replace(/"\/@/g, `"${prefix}/@`);

        // 3. <base> first in <head>, so it is in effect before any module load.
        //    Absolute, with a trailing slash — see the note above about why a
        //    relative base breaks on a prefix with no trailing slash. The runtime
        //    hint is injected alongside it so the client reads the same value the
        //    server used, rather than re-deriving it.
        const injection =
          `<base href="${prefix}/">` +
          `<script>window.__APP_BASE__=${JSON.stringify(prefix)};</script>`;
        if (/<head[^>]*>/i.test(out)) {
          out = out.replace(/<head([^>]*)>/i, (m: string) => `${m}${injection}`);
        } else {
          out = injection + out;
        }
        return out;
      },
    },
  };
}

export default defineConfig({
  // Root-relative. The per-request prefix is applied by appBasePathPlugin, which
  // knows the mount path the browser actually used. A static base cannot express
  // that: the same build is served at "/" and under a preview prefix.
  base: "/",
  // Tailwind v4 runs as a Vite plugin (no tailwind.config / postcss / autoprefixer);
  // it auto-detects content, theme tokens live in client/src/index.css (@theme).
  plugins: [appBasePathPlugin(), react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client/src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  server: {
    port: WEB_PORT,
    host: true,
    // This dev server is reachable from the public internet: a preview share
    // link (platform-side `create_preview_share_link`) proxies straight to this
    // port, and the holder is by definition someone outside the project. Both
    // options below are load-bearing because of that, not general hardening.
    //
    // allowedHosts — Vite's default is `[]`, which 403s every Host header that
    // is not an IP or localhost. Previews work today only because the upstream
    // proxy happens to rewrite Host before the request reaches this process:
    // somebody else's implementation detail standing in for configuration. If
    // that ever changes, every preview turns into "Blocked request" at once,
    // and the failure is invisible from this repo. Naming the domains makes the
    // dependency explicit and survives the day the upstream stops rewriting.
    // Leading dot = that host and any subdomain (Vite's `isHostAllowed`).
    allowedHosts: [
      ".preview.teamily.run",
      ".preview.chainopera.run",
      ".proxy.daytona.works",
    ],
    // fs.allow — the default is the workspace root, i.e. the WHOLE app tree, so
    // `/@fs/<app>/server/routers.ts` hands the server source (auth wiring, tRPC
    // procedure definitions, schema) to anyone holding a preview link. `.env`
    // is denied either way by `fs.deny`, so no credential leaks; what leaks is
    // the map of which procedures are unauthenticated — which is exactly the
    // thing a share-link visitor would need it for.
    //
    // The client only ever needs its own tree plus `shared/` (the `@shared/*`
    // alias). `server/` reaches the client through `import type` alone, which
    // esbuild erases, so it never enters the module graph. Narrowing the list
    // does not break real imports: import analysis marks each resolved module
    // path safe as it is served, which is how node_modules deps stay reachable.
    fs: {
      allow: [
        path.resolve(import.meta.dirname, "client"),
        path.resolve(import.meta.dirname, "shared"),
      ],
    },
    proxy: {
      "/trpc": apiProxy,
      "/app-storage": apiProxy,
      "/api": apiProxy,
    },
  },
  build: {
    // Client build lands in dist/public; the prod server serves it statically.
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
});
