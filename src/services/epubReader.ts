import JSZip from 'jszip';
import { EBook, EBookChapter } from '../types/ebook';

/**
 * Universal Client-Side E-Book Parser for .epub, .txt, .md, and .html files
 */
export async function parseEpubFile(file: File | Blob, customTitle?: string): Promise<EBook> {
  const zip = new JSZip();
  const zipContent = await zip.loadAsync(file);

  // 1. Find the root OPF file path from container.xml
  let opfPath = 'content.opf';
  const containerFile = zipContent.file('META-INF/container.xml');
  if (containerFile) {
    const containerXml = await containerFile.async('text');
    const parser = new DOMParser();
    const doc = parser.parseFromString(containerXml, 'text/xml');
    const rootfile = doc.querySelector('rootfile');
    if (rootfile && rootfile.getAttribute('full-path')) {
      opfPath = rootfile.getAttribute('full-path')!;
    }
  }

  // 2. Read and parse the OPF document
  const opfFile = zipContent.file(opfPath);
  if (!opfFile) {
    // Fallback: search for any .opf file in the zip
    const anyOpf = Object.keys(zipContent.files).find((f) => f.endsWith('.opf'));
    if (!anyOpf) throw new Error('Invalid EPUB: No OPF package manifest found.');
    opfPath = anyOpf;
  }

  const opfXml = await zipContent.file(opfPath)!.async('text');
  const parser = new DOMParser();
  const opfDoc = parser.parseFromString(opfXml, 'text/xml');

  // Base directory for resolving relative paths in the EPUB
  const opfDir = opfPath.includes('/') ? opfPath.substring(0, opfPath.lastIndexOf('/') + 1) : '';

  // Extract Metadata
  const title =
    opfDoc.querySelector('title')?.textContent ||
    customTitle ||
    (file instanceof File ? file.name.replace(/\.epub$/i, '') : 'Uploaded E-Book');
  const author = opfDoc.querySelector('creator')?.textContent || 'Unknown Author';
  const description = opfDoc.querySelector('description')?.textContent || '';

  // Build manifest map (id -> href)
  const manifest: Record<string, { href: string; mediaType: string }> = {};
  opfDoc.querySelectorAll('manifest > item').forEach((item) => {
    const id = item.getAttribute('id');
    const href = item.getAttribute('href');
    const mediaType = item.getAttribute('media-type') || '';
    if (id && href) {
      manifest[id] = { href, mediaType };
    }
  });

  // Extract Cover Image if present
  let coverDataUrl: string | undefined = undefined;
  const coverItem =
    opfDoc.querySelector('item[properties*="cover-image"]') ||
    opfDoc.querySelector('item[id*="cover"]') ||
    opfDoc.querySelector('item[href*="cover"]');

  if (coverItem && coverItem.getAttribute('href')) {
    const coverRelHref = coverItem.getAttribute('href')!;
    const coverFullPath = opfDir + coverRelHref;
    const coverZipFile = zipContent.file(coverFullPath) || zipContent.file(coverRelHref);
    if (coverZipFile) {
      const coverBase64 = await coverZipFile.async('base64');
      const ext = coverRelHref.split('.').pop() || 'jpeg';
      coverDataUrl = `data:image/${ext};base64,${coverBase64}`;
    }
  }

  // Extract Spine (Reading Order)
  const spineItemRefs: string[] = [];
  opfDoc.querySelectorAll('spine > itemref').forEach((itemRef) => {
    const idref = itemRef.getAttribute('idref');
    if (idref) spineItemRefs.push(idref);
  });

  // Extract Chapters Content
  const chapters: EBookChapter[] = [];
  let order = 1;

  for (const idref of spineItemRefs) {
    const item = manifest[idref];
    if (!item) continue;

    const chapterFullPath = opfDir + item.href;
    const chapterFile = zipContent.file(chapterFullPath) || zipContent.file(item.href);
    if (!chapterFile) continue;

    const rawHtml = await chapterFile.async('text');
    const chapterDoc = parser.parseFromString(rawHtml, 'text/html');

    // Extract title from heading or title tag
    const heading =
      chapterDoc.querySelector('h1, h2, h3, title')?.textContent?.trim() ||
      `Chapter ${order}`;

    // Clean body HTML: replace local image references with base64 if needed
    const bodyContent = chapterDoc.body ? chapterDoc.body.innerHTML : rawHtml;

    chapters.push({
      id: `ch_${order}`,
      title: heading,
      content: bodyContent,
      href: item.href,
      order: order++
    });
  }

  // If cover or metadata is missing, attempt auto-enrichment via OpenLibrary API
  let finalCover = coverDataUrl;
  let finalAuthor = author;
  let finalDesc = description;
  let finalSubjects: string[] = ['Local Import'];

  if (!finalCover || finalAuthor === 'Unknown Author' || !finalDesc) {
    try {
      const enrichRes = await fetch(`/api/ebooks/enrich-metadata`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          author: finalAuthor !== 'Unknown Author' ? finalAuthor : undefined,
          filename: file instanceof File ? file.name : undefined
        })
      });
      if (enrichRes.ok) {
        const enriched = await enrichRes.json();
        if (!finalCover && enriched.cover) finalCover = enriched.cover;
        if (finalAuthor === 'Unknown Author' && enriched.author) finalAuthor = enriched.author;
        if (!finalDesc && enriched.synopsis) finalDesc = enriched.synopsis;
        if (enriched.subjects && enriched.subjects.length > 0) finalSubjects = enriched.subjects;
      }
    } catch {}
  }

  return {
    id: `local_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    title,
    author: finalAuthor,
    description: finalDesc || `Local imported e-book: ${title}`,
    cover: finalCover || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?q=80&w=600&auto=format&fit=crop',
    subjects: finalSubjects,
    chapters,
    totalChapters: chapters.length,
    currentChapter: 1,
    isLocalUpload: true,
    updatedAt: Date.now()
  };
}

/**
 * Parses a plain text or markdown file into readable book chapters
 */
export async function parseTxtFile(file: File): Promise<EBook> {
  const text = await file.text();
  const title = file.name.replace(/\.(txt|md)$/i, '');

  // Split by Chapter headings if found (e.g. "Chapter 1", "CHAPTER I", "## Chapter")
  const chapterRegex = /(?:^|\n)(?:#{1,3}\s+|CHAPTER\s+[0-9IVXLCDM]+|Chapter\s+[0-9]+|BOOK\s+[0-9]+|ACT\s+[0-9]+)/i;
  const rawParts = text.split(chapterRegex);

  const chapters: EBookChapter[] = [];

  if (rawParts.length > 1) {
    rawParts.forEach((part, idx) => {
      const clean = part.trim();
      if (clean.length > 50) {
        chapters.push({
          id: `ch_${idx + 1}`,
          title: `Chapter ${idx + 1}`,
          content: `<p class="whitespace-pre-line leading-relaxed">${clean.replace(/\n\n+/g, '</p><p class="mt-4 whitespace-pre-line leading-relaxed">')}</p>`,
          order: idx + 1
        });
      }
    });
  }

  // Fallback: split long text into ~1200-word chapter pages
  if (chapters.length === 0) {
    const paragraphs = text.split(/\n\s*\n/);
    const chunkSize = 15;
    for (let i = 0; i < paragraphs.length; i += chunkSize) {
      const chunk = paragraphs.slice(i, i + chunkSize).join('\n\n');
      const order = Math.floor(i / chunkSize) + 1;
      chapters.push({
        id: `ch_${order}`,
        title: `Section ${order}`,
        content: `<p class="whitespace-pre-line leading-relaxed">${chunk.replace(/\n\n+/g, '</p><p class="mt-4 whitespace-pre-line leading-relaxed">')}</p>`,
        order
      });
    }
  }

  // Attempt auto-metadata enrichment for text file
  let author = 'Local Author';
  let cover = 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?q=80&w=600&auto=format&fit=crop';
  let description = `Local imported book: ${title}`;
  let subjects: string[] = ['Text File', 'Local Import'];

  try {
    const enrichRes = await fetch(`/api/ebooks/enrich-metadata`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        filename: file.name
      })
    });
    if (enrichRes.ok) {
      const enriched = await enrichRes.json();
      if (enriched.cover) cover = enriched.cover;
      if (enriched.author) author = enriched.author;
      if (enriched.synopsis) description = enriched.synopsis;
      if (enriched.subjects && enriched.subjects.length > 0) subjects = enriched.subjects;
    }
  } catch {}

  return {
    id: `local_txt_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    title,
    author,
    description,
    cover,
    subjects,
    chapters,
    totalChapters: chapters.length,
    currentChapter: 1,
    isLocalUpload: true,
    updatedAt: Date.now()
  };
}
