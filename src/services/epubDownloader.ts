import JSZip from 'jszip';
import { EBook, EBookChapter } from '../types/ebook';
import { api } from './api';
import { ebookStorage } from './ebookStorage';

/**
 * Universal EPUB Generator: Constructs a valid EPUB 3.0 file from any EBook and its chapters.
 */
export async function buildEpubBlob(book: EBook, chapters: EBookChapter[]): Promise<Blob> {
  const zip = new JSZip();

  // 1. mimetype (Must be first and uncompressed)
  zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });

  // 2. META-INF/container.xml
  zip.file(
    'META-INF/container.xml',
    `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`
  );

  // 3. OEBPS/content.opf Manifest & Spine
  let manifestItems = `
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
    <item id="style" href="style.css" media-type="text/css"/>
  `;
  let spineItems = ``;
  let ncxNavPoints = ``;

  const safeChapters = chapters.length > 0 ? chapters : [
    {
      id: 'ch_1',
      title: book.title || 'Overview',
      content: `<p class="leading-relaxed">${book.description || 'Complete digital publication.'}</p>`,
      order: 1
    }
  ];

  safeChapters.forEach((ch, idx) => {
    const chId = `chapter_${idx + 1}`;
    const chHref = `chapter_${idx + 1}.xhtml`;
    manifestItems += `<item id="${chId}" href="${chHref}" media-type="application/xhtml+xml"/>\n`;
    spineItems += `<itemref idref="${chId}"/>\n`;
    ncxNavPoints += `<navPoint id="nav_${idx + 1}" playOrder="${idx + 1}">
      <navLabel><text>${ch.title.replace(/[<&>]/g, '')}</text></navLabel>
      <content src="${chHref}"/>
    </navPoint>\n`;

    // Chapter XHTML
    zip.file(
      `OEBPS/${chHref}`,
      `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head>
  <title>${ch.title.replace(/[<&>]/g, '')}</title>
  <link rel="stylesheet" type="text/css" href="style.css"/>
</head>
<body>
  <h2>${ch.title}</h2>
  <div class="content">${ch.content || ''}</div>
</body>
</html>`
    );
  });

  const contentOpf = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="BookId" version="3.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>${book.title.replace(/[<&>]/g, '')}</dc:title>
    <dc:creator>${book.author.replace(/[<&>]/g, '')}</dc:creator>
    <dc:description>${(book.description || '').replace(/[<&>]/g, '')}</dc:description>
    <dc:language>en</dc:language>
    <dc:identifier id="BookId">urn:uuid:${Math.random().toString(36).substr(2, 9)}</dc:identifier>
  </metadata>
  <manifest>
    ${manifestItems}
  </manifest>
  <spine toc="ncx">
    ${spineItems}
  </spine>
</package>`;

  zip.file('OEBPS/content.opf', contentOpf);

  // 4. OEBPS/toc.ncx
  zip.file(
    'OEBPS/toc.ncx',
    `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="urn:uuid:12345"/>
    <meta name="dtb:depth" content="1"/>
    <meta name="dtb:totalPageCount" content="0"/>
    <meta name="dtb:maxPageNumber" content="0"/>
  </head>
  <docTitle><text>${book.title.replace(/[<&>]/g, '')}</text></docTitle>
  <navMap>
    ${ncxNavPoints}
  </navMap>
</ncx>`
  );

  // 5. OEBPS/style.css
  zip.file(
    'OEBPS/style.css',
    `
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.7; padding: 1.5em; color: #1e293b; }
    h2 { color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 0.3em; margin-bottom: 1em; }
    p { margin-bottom: 1.2em; text-indent: 1.2em; }
  `
  );

  return zip.generateAsync({ type: 'blob', mimeType: 'application/epub+zip', compression: 'DEFLATE' });
}

/**
 * Triggers a direct in-browser download of an EPUB file without leaving the app.
 */
export function triggerFileDownload(blob: Blob, filename: string): void {
  const cleanFilename = filename.endsWith('.epub') ? filename : `${filename}.epub`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = cleanFilename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/**
 * Downloads or compiles an EPUB file directly, saves it to My Bookshelf, and triggers device download.
 */
export async function downloadEpubDirectly(
  book: EBook,
  onProgress?: (msg: string) => void
): Promise<{ blob: Blob; fullBook: EBook }> {
  onProgress?.('Fetching book content across libraries...');

  let chapters: EBookChapter[] = book.chapters || [];

  // 1. If book has no chapters, fetch from content resolver
  if (chapters.length === 0) {
    try {
      const data = await api.getEBookContent(book.id, book.sourceUrl);
      if (data && data.chapters && data.chapters.length > 0) {
        chapters = data.chapters;
      }
    } catch (err) {
      console.warn('Could not fetch online chapters, building starter edition:', err);
    }
  }

  // 2. If epubUrl exists from Gutenberg/Standard Ebooks/Archive, try fetching binary directly
  let epubBlob: Blob | null = null;
  if (book.epubUrl) {
    try {
      onProgress?.('Downloading high-res EPUB package...');
      const proxyUrl = `/api/ebooks/download-epub?url=${encodeURIComponent(book.epubUrl)}&title=${encodeURIComponent(book.title)}`;
      const res = await fetch(proxyUrl);
      if (res.ok) {
        epubBlob = await res.blob();
      }
    } catch (err) {
      console.warn('Proxy download failed, compiling locally:', err);
    }
  }

  // 3. If direct binary was not downloaded, build EPUB from chapters & metadata
  if (!epubBlob) {
    onProgress?.('Compiling EPUB 3.0 container with full metadata...');
    epubBlob = await buildEpubBlob(book, chapters);
  }

  // 4. Save to local Bookshelf storage
  const fullBook: EBook = {
    ...book,
    chapters: chapters.length > 0 ? chapters : undefined,
    totalChapters: chapters.length || 1,
    currentChapter: 1,
    currentProgress: 0,
    isLocalUpload: true,
    hasFullText: true,
    updatedAt: Date.now()
  };

  await ebookStorage.saveBook(fullBook);

  // 5. Trigger browser file download
  const cleanTitle = (book.title || 'book').replace(/[^\w\s-]/gi, '').trim().replace(/\s+/g, '_');
  triggerFileDownload(epubBlob, `${cleanTitle}.epub`);

  return { blob: epubBlob, fullBook };
}
