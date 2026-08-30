import JSZip from 'jszip';
import { Comic, ComicPage } from '../types/comic';

const VALID_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif'];

/**
 * Parses a local .cbz, .zip, or image files into a readable Comic
 */
export async function readLocalComicArchive(file: File | File[]): Promise<{ comic: Comic; pages: ComicPage[] }> {
  // 1. Array of images dropped together
  if (Array.isArray(file)) {
    const images = file.filter(f => VALID_EXTENSIONS.some(ext => f.name.toLowerCase().endsWith(ext)));
    if (images.length === 0) {
      throw new Error('No valid comic page images found in selection.');
    }
    images.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));

    const pages: ComicPage[] = images.map((img, idx) => ({
      pageNumber: idx + 1,
      url: URL.createObjectURL(img)
    }));

    const title = images[0].name.replace(/\.[^/.]+$/, '').replace(/_\d+$/, '') || 'Imported Comic Issue';
    const comic: Comic = {
      id: `local_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      source: 'local',
      title,
      description: `Local imported comic: ${images.length} pages`,
      cover: pages[0].url,
      author: 'Local File',
      year: 'Local',
      status: 'Ready',
      type: 'Local Comic',
      tags: ['Local Import', 'Images'],
      chapters: [{ id: 'local_main', chapter: '1', title, pages: pages.length }],
      pages
    };
    return { comic, pages };
  }

  // 2. Single Image File
  const fileName = file.name;
  const isImage = VALID_EXTENSIONS.some(ext => fileName.toLowerCase().endsWith(ext));
  if (isImage) {
    const url = URL.createObjectURL(file);
    const pages: ComicPage[] = [{ pageNumber: 1, url }];
    const title = fileName.replace(/\.[^/.]+$/, '').replace(/_/g, ' ');
    const comic: Comic = {
      id: `local_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      source: 'local',
      title,
      description: `Local comic page: ${fileName}`,
      cover: url,
      author: 'Local File',
      year: 'Local',
      status: 'Ready',
      type: 'Local Comic',
      tags: ['Local Import', 'Image'],
      chapters: [{ id: 'local_main', chapter: '1', title, pages: 1 }],
      pages
    };
    return { comic, pages };
  }

  // 3. Zip or CBZ Archive
  const isZipOrCbz = fileName.toLowerCase().endsWith('.cbz') || fileName.toLowerCase().endsWith('.zip') || fileName.toLowerCase().endsWith('.cbr');

  if (!isZipOrCbz) {
    throw new Error('Unsupported format. Please upload a .cbz, .zip comic archive or image files.');
  }

  try {
    const zip = new JSZip();
    const loadedZip = await zip.loadAsync(file);

    const imageFiles: Array<{ name: string; zipEntry: JSZip.JSZipObject }> = [];

    loadedZip.forEach((relativePath, zipEntry) => {
      if (!zipEntry.dir) {
        const lower = relativePath.toLowerCase();
        // Filter out mac os metadata and hidden files
        if (!lower.includes('__macosx') && !lower.startsWith('.') && VALID_EXTENSIONS.some(ext => lower.endsWith(ext))) {
          imageFiles.push({ name: relativePath, zipEntry });
        }
      }
    });

    if (imageFiles.length === 0) {
      throw new Error('No readable comic images found inside this archive.');
    }

    // Sort files naturally (001.jpg, 002.jpg, 010.jpg etc.)
    imageFiles.sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
    );

    // Convert files to blob URLs
    const pages: ComicPage[] = [];
    for (let i = 0; i < imageFiles.length; i++) {
      const blob = await imageFiles[i].zipEntry.async('blob');
      const url = URL.createObjectURL(blob);
      pages.push({
        pageNumber: i + 1,
        url,
        blob
      });
    }

    const title = fileName.replace(/\.(cbz|zip|cbr)$/i, '').replace(/_/g, ' ');
    const coverUrl = pages[0]?.url || '';

    const comic: Comic = {
      id: `local_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      source: 'local',
      title,
      description: `Local comic archive: ${fileName} (${pages.length} pages)`,
      cover: coverUrl,
      author: 'Local File',
      year: 'Local',
      status: 'Ready',
      type: 'Local Comic',
      tags: ['Local Archive', 'CBZ'],
      chapters: [
        {
          id: 'local_main',
          chapter: '1',
          title: title,
          pages: pages.length
        }
      ],
      pages
    };

    return { comic, pages };
  } catch (err: any) {
    if (fileName.toLowerCase().endsWith('.cbr')) {
      throw new Error('This .cbr archive uses RAR compression. Please convert it to .cbz / .zip to view.');
    }
    throw err;
  }
}
