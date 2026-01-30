import { serve } from "bun";
import index from "./index.html";
import { DiscDBClient } from "discdbapi";

const server = serve({
  port: 4000,
  routes: {
    // Serve index.html for all unmatched routes.
    "/*": index,
    "/api/hash": {
      async POST(req) {
        const body = await req.json();
        const resp = await fetch("https://thediscdb.com/api/hash", {
          method: "POST",
          body: JSON.stringify(body),
          headers: { "Content-Type": "application/json" },
        });
        const data = await resp.json();
        return Response.json(data);
      },
    },
    "/api/releases/:hash": {
      async GET(req) {
        const discdb = new DiscDBClient();
        const results =
          (await discdb.getMediaItemsByDiscHashes([req.params.hash]))[
            req.params.hash
          ] ?? [];

        const releases = [];
        for (const item of results) {
          for (const release of item.releases) {
            const hasDisc =
              release.discs.find((d) => d.contentHash === req.params.hash) !==
              undefined;
            if (!hasDisc) continue;

            releases.push({
              item: {
                title: item.title,
                year: item.year,
                type: item.type,
                slug: item.slug,
                imageUrl: item.imageUrl,
              },
              title: release.title,
              year: release.year,
              slug: release.slug,
              imageUrl: release.imageUrl,
              discCount: release.discs.length,
            });
          }
        }
        return Response.json(releases);
      },
    },
  },

  development: process.env.NODE_ENV !== "production" && {
    // Enable browser hot reloading in development
    hmr: true,

    // Echo console logs from the browser to the server
    console: true,
  },
});

console.log(`🚀 Server running at ${server.url}`);
