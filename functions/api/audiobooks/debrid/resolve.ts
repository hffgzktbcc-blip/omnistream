const AUDIO_EXTS = ['.mp3', '.m4b', '.m4a', '.aac', '.flac', '.opus', '.ogg', '.wav'];

function formatBytes(bytes: number): string {
  if (!bytes || isNaN(bytes)) return '0 MB';
  const mb = bytes / (1024 * 1024);
  if (mb >= 1024) return `${(mb / 1024).toFixed(2)} GB`;
  return `${mb.toFixed(1)} MB`;
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}

export async function onRequestPost(context: any) {
  const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  };

  try {
    const { request } = context;
    const body = await request.json();
    const { infoHash, magnet: rawMagnet, title = 'Audiobook', apiKey, provider = 'realdebrid' } = body;

    if (!apiKey) {
      return new Response(JSON.stringify({ success: false, error: 'Missing Debrid API key' }), {
        status: 400,
        headers: corsHeaders
      });
    }

    if (!infoHash && !rawMagnet) {
      return new Response(JSON.stringify({ success: false, error: 'Missing torrent infoHash or magnet' }), {
        status: 400,
        headers: corsHeaders
      });
    }

    let magnet = rawMagnet;
    if (!magnet || !magnet.startsWith('magnet:')) {
      magnet = `magnet:?xt=urn:btih:${infoHash}&dn=${encodeURIComponent(title)}&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337%2Fannounce&tr=udp%3A%2F%2Fopen.stealth.si%3A80%2Fannounce&tr=udp%3A%2F%2Ftracker.torrent.eu.org%3A451%2Fannounce`;
    }

    if (provider === 'torbox') {
      // -------------------------------------------------------------
      // Torbox Resolution
      // -------------------------------------------------------------
      const addRes = await fetch('https://api.torbox.app/v1/api/torrents/createtorrent', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ magnet, seed: 1, allow_zip: false })
      });

      const addData = await addRes.json();
      const torrentId = addData.data?.torrent_id;
      if (!torrentId) {
        return new Response(
          JSON.stringify({ success: false, error: addData.detail || 'Failed to add torrent to Torbox' }),
          { status: 200, headers: corsHeaders }
        );
      }

      const infoRes = await fetch(`https://api.torbox.app/v1/api/torrents/mylist?id=${torrentId}`, {
        headers: { Authorization: `Bearer ${apiKey}` }
      });
      const infoData = await infoRes.json();
      const torrent = infoData.data;

      if (!torrent || torrent.download_state !== 'completed') {
        return new Response(
          JSON.stringify({
            success: false,
            isCached: false,
            provider: 'torbox',
            tracks: [],
            statusText: `Buffering into Torbox seedbox (${torrent?.progress || 0}%)...`
          }),
          { status: 200, headers: corsHeaders }
        );
      }

      const audioFiles = (torrent.files || []).filter((f: any) =>
        AUDIO_EXTS.some((ext) => f.name?.toLowerCase().endsWith(ext))
      );

      const tracks: any[] = [];
      for (let idx = 0; idx < audioFiles.length; idx++) {
        const file = audioFiles[idx];
        try {
          const dlRes = await fetch(
            `https://api.torbox.app/v1/api/torrents/requestdl?token=${apiKey}&torrent_id=${torrentId}&file_id=${file.id}`
          );
          const dlData = await dlRes.json();
          if (dlData.data) {
            tracks.push({
              index: idx,
              name: file.name.replace(/\.(mp3|m4b|m4a|aac|flac|ogg)$/i, ''),
              path: file.name,
              length: 3600,
              sizeFormatted: formatBytes(file.size || 0),
              streamUrl: dlData.data,
              downloadUrl: dlData.data,
              isDebrid: true
            });
          }
        } catch {}
      }

      return new Response(
        JSON.stringify({
          success: tracks.length > 0,
          isCached: true,
          provider: 'torbox',
          tracks,
          statusText: `⚡ Loaded ${tracks.length} track(s) from Torbox CDN`
        }),
        { status: 200, headers: corsHeaders }
      );
    } else {
      // -------------------------------------------------------------
      // Real-Debrid Resolution
      // -------------------------------------------------------------
      // 1. Check existing torrents first to reuse an existing torrentId
      let torrentId: string | null = null;
      try {
        const listRes = await fetch('https://api.real-debrid.com/rest/1.0/torrents?limit=50', {
          headers: { Authorization: `Bearer ${apiKey}` }
        });
        if (listRes.ok) {
          const listData = await listRes.json();
          if (Array.isArray(listData)) {
            const existing = listData.find((t: any) =>
              (infoHash && t.hash?.toLowerCase() === infoHash.toLowerCase()) ||
              (t.filename && title && t.filename.toLowerCase().includes(title.toLowerCase().slice(0, 15)))
            );
            if (existing) {
              torrentId = existing.id;
            }
          }
        }
      } catch {}

      if (!torrentId) {
        const addBody = new URLSearchParams();
        addBody.append('magnet', magnet);

        const addRes = await fetch('https://api.real-debrid.com/rest/1.0/torrents/addMagnet', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: addBody.toString()
        });

        if (!addRes.ok) {
          const errText = await addRes.text();
          return new Response(
            JSON.stringify({ success: false, error: `Real-Debrid error (${addRes.status}): ${errText}` }),
            { status: 200, headers: corsHeaders }
          );
        }

        const addData = await addRes.json();
        torrentId = addData.id;
      }

      const infoRes = await fetch(`https://api.real-debrid.com/rest/1.0/torrents/info/${torrentId}`, {
        headers: { Authorization: `Bearer ${apiKey}` }
      });
      let infoData = await infoRes.json();

      if (infoData.status === 'waiting_files_selection') {
        const audioFiles = (infoData.files || []).filter((f: any) =>
          AUDIO_EXTS.some((ext) => f.path.toLowerCase().endsWith(ext))
        );
        const fileIds = audioFiles.length > 0 ? audioFiles.map((f: any) => f.id).join(',') : 'all';

        const selectBody = new URLSearchParams();
        selectBody.append('files', fileIds);
        await fetch(`https://api.real-debrid.com/rest/1.0/torrents/selectFiles/${torrentId}`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: selectBody.toString()
        });

        // Poll up to 6 times (with 400ms delay) to allow Real-Debrid to link the cached files
        for (let attempt = 0; attempt < 6; attempt++) {
          await new Promise((r) => setTimeout(r, 450));
          const updatedRes = await fetch(
            `https://api.real-debrid.com/rest/1.0/torrents/info/${torrentId}`,
            { headers: { Authorization: `Bearer ${apiKey}` } }
          );
          if (updatedRes.ok) {
            infoData = await updatedRes.json();
            if (infoData.status === 'downloaded' && Array.isArray(infoData.links) && infoData.links.length > 0) {
              break;
            }
            if (infoData.status === 'error' || infoData.status === 'dead') {
              break;
            }
          }
        }
      }

      if (infoData.status !== 'downloaded' || !Array.isArray(infoData.links) || infoData.links.length === 0) {
        return new Response(
          JSON.stringify({
            success: false,
            isCached: false,
            provider: 'realdebrid',
            tracks: [],
            statusText:
              infoData.status === 'downloading'
                ? `Buffering into Real-Debrid cloud seedbox (${infoData.progress}%)...`
                : `Torrent status: ${infoData.status || 'queued'}`
          }),
          { status: 200, headers: corsHeaders }
        );
      }

      const selectedFiles = (infoData.files || []).filter((f: any) => f.selected === 1);
      const links = infoData.links || [];
      const tracks: any[] = [];
      const BATCH_SIZE = 5;

      for (let i = 0; i < links.length; i += BATCH_SIZE) {
        // For large multi-disc collections, load first 30 tracks initially to ensure instant response
        if (i >= 30 && tracks.length > 0) break;

        const batch = links.slice(i, i + BATCH_SIZE);
        const batchResults = await Promise.all(
          batch.map(async (link: string, batchIdx: number) => {
            const idx = i + batchIdx;
            try {
              const uBody = new URLSearchParams();
              uBody.append('link', link);
              const uRes = await fetch('https://api.real-debrid.com/rest/1.0/unrestrict/link', {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${apiKey}`,
                  'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: uBody.toString()
              });
              if (!uRes.ok) return null;
              const uData = await uRes.json();
              const file = selectedFiles[idx] || {};
              const filename = uData.filename || file.path?.replace(/^\//, '') || `Track ${idx + 1}`;
              return {
                index: idx,
                name: filename.replace(/\.(mp3|m4b|m4a|aac|flac|ogg)$/i, ''),
                path: file.path || filename,
                length: 3600,
                sizeFormatted: formatBytes(uData.filesize || file.bytes || 0),
                streamUrl: uData.download,
                downloadUrl: uData.download,
                isDebrid: true
              };
            } catch {
              return null;
            }
          })
        );
        tracks.push(...batchResults.filter(Boolean));
        if (i + BATCH_SIZE < links.length && i < 30) {
          await new Promise((r) => setTimeout(r, 60));
        }
      }

      // Pageturner pattern: Filter out sample clips and natural numerical sort chapters
      const nonSample = tracks.filter((t) => {
        const lower = (t.name || '').toLowerCase();
        return !lower.startsWith('sample') && !lower.includes('sample track');
      });
      const finalTracks = nonSample.length > 0 ? nonSample : tracks;
      finalTracks.sort((a, b) =>
        (a.path || a.name).localeCompare(b.path || b.name, undefined, { numeric: true, sensitivity: 'base' })
      );
      finalTracks.forEach((t, i) => {
        t.index = i;
      });

      return new Response(
        JSON.stringify({
          success: finalTracks.length > 0,
          isCached: true,
          provider: 'realdebrid',
          tracks: finalTracks,
          statusText: `⚡ Loaded ${finalTracks.length} chapter(s) from Real-Debrid CDN`
        }),
        { status: 200, headers: corsHeaders }
      );
    }
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err.message || 'Internal server error resolving debrid stream' }),
      { status: 500, headers: corsHeaders }
    );
  }
}
