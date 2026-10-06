async function verifyChunks() {
  const routes = ['/control', '/security', '/arc', '/missions/demo/replay'];
  for (const route of routes) {
    const res = await fetch('http://localhost:3000' + route);
    if (!res.ok) {
      console.error(`Route ${route} returned HTTP ${res.status}`);
      process.exit(1);
    }
    const html = await res.text();
    const cssLinks = [...html.matchAll(/href="(\/_next\/static\/[^"]+\.css[^"]*)"/g)].map(m => m[1]);
    const jsLinks = [...html.matchAll(/src="(\/_next\/static\/[^"]+\.js[^"]*)"/g)].map(m => m[1]);
    console.log(`Route ${route}: HTTP 200, CSS count: ${cssLinks.length}, JS chunks: ${jsLinks.length}`);
    for (const c of cssLinks) {
      const cRes = await fetch('http://localhost:3000' + c);
      if (!cRes.ok) throw new Error(`Missing CSS: ${c} status ${cRes.status}`);
    }
    for (const j of jsLinks) {
      const jRes = await fetch('http://localhost:3000' + j);
      if (!jRes.ok) throw new Error(`Missing JS chunk: ${j} status ${jRes.status}`);
    }
  }
  console.log('ALL ROUTES AND ASSET CHUNKS VERIFIED CLEANLY (0 missing chunks, 0 errors)');
}
verifyChunks().catch(e => { console.error(e); process.exit(1); });
