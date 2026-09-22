import { AudioTrack } from '../types/audiobook';
import { stremioService } from './stremioService';

export interface DebridAudioResult {
  success: boolean;
  isCached: boolean;
  provider: string;
  tracks: AudioTrack[];
  statusText?: string;
  error?: string;
}

const AUDIO_EXTS = ['.mp3', '.m4b', '.m4a', '.aac', '.flac', '.opus', '.ogg', '.wav'];

function formatBytes(bytes: number): string {
  if (!bytes || isNaN(bytes)) return '0 MB';
  const mb = bytes / (1024 * 1024);
  if (mb >= 1024) return `${(mb / 1024).toFixed(2)} GB`;
  return `${mb.toFixed(1)} MB`;
}

class DebridAudioService {
  public isDebridConfigured(): boolean {
    return !!stremioService.getDebridKey();
  }

  public getDebridProvider(): string {
    return stremioService.getDebridProvider() || 'realdebrid';
  }

  public getDebridKey(): string {
    return stremioService.getDebridKey();
  }

  /**
   * Resolves an AudioBookBay swarm magnet or infoHash into direct high-speed HTTP streams
   * via Real-Debrid or Torbox cloud seedboxes.
   */
  public async resolveAudiobook(params: {
    infoHash?: string;
    magnet?: string;
    title?: string;
  }): Promise<DebridAudioResult> {
    const apiKey = this.getDebridKey();
    const provider = this.getDebridProvider();

    if (!apiKey) {
      return {
        success: false,
        isCached: false,
        provider,
        tracks: [],
        error: 'No Debrid API key configured. Enter your Real-Debrid or Torbox key to stream from the cloud.'
      };
    }

    const { infoHash, magnet, title = 'Audiobook' } = params;
    if (!infoHash && !magnet) {
      return {
        success: false,
        isCached: false,
        provider,
        tracks: [],
        error: 'Missing torrent infoHash or magnet link.'
      };
    }

    // Step 1: Try resolving via local server / Cloudflare Pages Function endpoint
    try {
      const res = await fetch('/api/audiobooks/debrid/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          infoHash,
          magnet,
          title,
          apiKey,
          provider
        })
      });

      if (res.ok) {
        const ct = res.headers.get('content-type') || '';
        if (ct.includes('application/json')) {
          const data = await res.json();
          if (data.success && Array.isArray(data.tracks) && data.tracks.length > 0) {
            return data;
          }
          if (data.statusText || data.error) {
            return data;
          }
        }
      }
    } catch (e) {
      console.warn('Backend debrid endpoint unreachable, attempting direct client fallback:', e);
    }

    // Step 2: Direct client-side resolution fallback
    if (provider === 'torbox') {
      return this.resolveDirectTorbox(magnet || infoHash!, apiKey, title);
    } else {
      return this.resolveDirectRealDebrid(magnet || infoHash!, apiKey, title);
    }
  }

  private async resolveDirectRealDebrid(
    magnetOrHash: string,
    apiKey: string,
    title: string
  ): Promise<DebridAudioResult> {
    try {
      let magnet = magnetOrHash;
      if (!magnet.startsWith('magnet:')) {
        magnet = `magnet:?xt=urn:btih:${magnetOrHash}&dn=${encodeURIComponent(title)}&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337%2Fannounce&tr=udp%3A%2F%2Fopen.stealth.si%3A80%2Fannounce&tr=udp%3A%2F%2Ftracker.torrent.eu.org%3A451%2Fannounce`;
      }

      // Add magnet
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
        return {
          success: false,
          isCached: false,
          provider: 'realdebrid',
          tracks: [],
          error: `Real-Debrid error (${addRes.status}): ${errText}`
        };
      }

      const addData = await addRes.json();
      const torrentId = addData.id;

      // Check info
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

        const updatedRes = await fetch(
          `https://api.real-debrid.com/rest/1.0/torrents/info/${torrentId}`,
          { headers: { Authorization: `Bearer ${apiKey}` } }
        );
        infoData = await updatedRes.json();
      }

      if (infoData.status !== 'downloaded' || !Array.isArray(infoData.links) || infoData.links.length === 0) {
        return {
          success: false,
          isCached: false,
          provider: 'realdebrid',
          tracks: [],
          statusText:
            infoData.status === 'downloading'
              ? `Buffering into Real-Debrid cloud seedbox (${infoData.progress}%)...`
              : `Torrent status: ${infoData.status || 'queued'}`
        };
      }

      const selectedFiles = (infoData.files || []).filter((f: any) => f.selected === 1);
      const unrestrictPromises = infoData.links.map(async (link: string, idx: number) => {
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
          } as AudioTrack;
        } catch {
          return null;
        }
      });

      const tracks = (await Promise.all(unrestrictPromises)).filter(Boolean) as AudioTrack[];
      return {
        success: tracks.length > 0,
        isCached: true,
        provider: 'realdebrid',
        tracks,
        statusText: `⚡ Loaded ${tracks.length} track(s) from Real-Debrid CDN`
      };
    } catch (err: any) {
      return {
        success: false,
        isCached: false,
        provider: 'realdebrid',
        tracks: [],
        error: err.message || 'Failed to resolve Real-Debrid streams.'
      };
    }
  }

  private async resolveDirectTorbox(
    magnetOrHash: string,
    apiKey: string,
    title: string
  ): Promise<DebridAudioResult> {
    try {
      let magnet = magnetOrHash;
      if (!magnet.startsWith('magnet:')) {
        magnet = `magnet:?xt=urn:btih:${magnetOrHash}&dn=${encodeURIComponent(title)}`;
      }

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
        return {
          success: false,
          isCached: false,
          provider: 'torbox',
          tracks: [],
          error: addData.detail || 'Failed to add torrent to Torbox'
        };
      }

      const infoRes = await fetch(`https://api.torbox.app/v1/api/torrents/mylist?id=${torrentId}`, {
        headers: { Authorization: `Bearer ${apiKey}` }
      });
      const infoData = await infoRes.json();
      const torrent = infoData.data;

      if (!torrent || torrent.download_state !== 'completed') {
        return {
          success: false,
          isCached: false,
          provider: 'torbox',
          tracks: [],
          statusText: `Buffering on Torbox seedbox (${torrent?.progress || 0}%)...`
        };
      }

      const audioFiles = (torrent.files || []).filter((f: any) =>
        AUDIO_EXTS.some((ext) => f.name?.toLowerCase().endsWith(ext))
      );

      const tracks: AudioTrack[] = [];
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

      return {
        success: tracks.length > 0,
        isCached: true,
        provider: 'torbox',
        tracks,
        statusText: `⚡ Loaded ${tracks.length} track(s) from Torbox CDN`
      };
    } catch (err: any) {
      return {
        success: false,
        isCached: false,
        provider: 'torbox',
        tracks: [],
        error: err.message || 'Failed to resolve Torbox streams.'
      };
    }
  }
}

export const debridAudioService = new DebridAudioService();
