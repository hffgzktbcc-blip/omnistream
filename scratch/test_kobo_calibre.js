const cheerio = require('cheerio');
const JSZip = require('jszip');

// Test KEPUB transformation
function injectKoboSpans(html) {
  if (!html) return html;
  const $ = cheerio.load(html, { xmlMode: false, decodeEntities: false });
  let spanIndex = 1;
  $('p, div.paragraph, h1, h2, h3, h4, h5, h6, li, blockquote').each((_, el) => {
    const text = $(el).html() || '';
    if (text.trim() && !text.includes('koboSpan')) {
      $(el).html(`<span class="koboSpan" id="kobo.${spanIndex}.1">${text}</span>`);
      spanIndex++;
    }
  });
  return $('body').html() || html;
}

// Test OPDS XML parsing
function parseOpdsXml(xmlText, baseUrl) {
  const $ = cheerio.load(xmlText, { xmlMode: true });
  const entries = [];
  
  $('entry').each((_, el) => {
    const title = $(el).find('title').text().trim();
    const author = $(el).find('author name').text().trim() || $(el).find('author').text().trim() || 'Unknown';
    const summary = $(el).find('summary, content').text().trim();
    const id = $(el).find('id').text().trim() || title;
    
    // Links
    let cover = '';
    const formats = [];
    
    $(el).find('link').each((_, l) => {
      const rel = $(l).attr('rel') || '';
      const href = $(l).attr('href') || '';
      const type = $(l).attr('type') || '';
      const fullUrl = href.startsWith('http') ? href : new URL(href, baseUrl).toString();
      
      if (rel.includes('image') || rel.includes('thumbnail')) {
        cover = fullUrl;
      }
      if (rel.includes('acquisition') || type.includes('epub') || type.includes('pdf') || type.includes('mobi')) {
        formats.push({ type, url: fullUrl });
      }
    });
    
    if (title) {
      entries.push({ id, title, author, description: summary, cover, formats });
    }
  });
  
  return entries;
}

console.log("KEPUB injector & OPDS parser compiled cleanly!");
