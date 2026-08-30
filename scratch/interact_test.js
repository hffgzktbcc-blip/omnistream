import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

async function runInteraction() {
  console.log('🚀 Launching Chrome to interact with OmniStream...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    defaultViewport: { width: 1280, height: 840 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  try {
    // 1. Navigate to Home
    console.log('📍 1. Navigating to http://localhost:5200 ...');
    await page.goto('http://localhost:5200', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1000));
    await page.screenshot({ path: 'scratch/01_home_screen.png' });
    console.log('📸 Captured 01_home_screen.png');

    // 2. Click on E-Books tab
    console.log('📍 2. Navigating to E-Books Tab...');
    const ebookTab = await page.waitForSelector('button::-p-text(E-Books), div::-p-text(E-Books)');
    if (ebookTab) await ebookTab.click();
    await new Promise(r => setTimeout(r, 1500));
    await page.screenshot({ path: 'scratch/02_ebook_catalog.png' });
    console.log('📸 Captured 02_ebook_catalog.png');

    // 3. Find and click on the first E-Book card or "Read" button
    console.log('📍 3. Opening first E-Book in reader...');
    const readBtn = await page.$('button::-p-text(Read Now), button::-p-text(Read)');
    if (readBtn) {
      await readBtn.click();
    } else {
      const cards = await page.$$('[class*="group relative flex flex-col rounded-2xl"]');
      if (cards.length > 0) await cards[0].click();
    }

    // Wait for reader to mount
    await new Promise(r => setTimeout(r, 2500));
    await page.screenshot({ path: 'scratch/03_reader_view.png' });
    console.log('📸 Captured 03_reader_view.png');

    // 4. Open Settings and change theme to Sepia
    console.log('📍 4. Opening Reader Settings & Customization...');
    const settingsBtn = await page.$('button[title*="Reader Customization"], button[title*="Settings"]');
    if (settingsBtn) {
      await settingsBtn.click();
      await new Promise(r => setTimeout(r, 500));
      await page.screenshot({ path: 'scratch/04_reader_settings_modal.png' });
      console.log('📸 Captured 04_reader_settings_modal.png');

      // Click Sepia theme button
      const sepiaBtn = await page.$('button::-p-text(Sepia)');
      if (sepiaBtn) {
        await sepiaBtn.click();
        console.log('🎨 Switched theme to Sepia');
      }

      // Close settings
      const closeBtn = await page.$('button::-p-text(X)');
      if (closeBtn) await closeBtn.click();
      else await page.keyboard.press('Escape');
    }

    // 5. Open Drawer and test Ambient Audio tab
    console.log('📍 5. Opening Reader Drawer & Ambient Soundscape...');
    const menuBtn = await page.$('button[title*="Table of Contents"], button[title*="TOC"]');
    if (menuBtn) {
      await menuBtn.click();
      await new Promise(r => setTimeout(r, 500));

      const audioTab = await page.$('button::-p-text(Audio)');
      if (audioTab) {
        await audioTab.click();
        await new Promise(r => setTimeout(r, 300));
        await page.screenshot({ path: 'scratch/05_drawer_ambient_soundscapes.png' });
        console.log('📸 Captured 05_drawer_ambient_soundscapes.png');

        // Click Rain on Window button
        const rainBtn = await page.$('button::-p-text(Rain Window)');
        if (rainBtn) {
          await rainBtn.click();
          console.log('🌧️ Enabled Rain soundscape');
        }
      }
      await page.keyboard.press('Escape');
    }

    // 6. Launch RSVP Speed Reader (Spritz Mode)
    console.log('📍 6. Launching RSVP Speed Reader...');
    const rsvpBtn = await page.$('button[title*="RSVP Speed Reader"]');
    if (rsvpBtn) {
      await rsvpBtn.click();
      await new Promise(r => setTimeout(r, 1000));
      await page.screenshot({ path: 'scratch/06_rsvp_speed_reader.png' });
      console.log('📸 Captured 06_rsvp_speed_reader.png');
      await page.keyboard.press('Escape');
    }

    // 7. Exit Reader and verify Continue Reading / Last Read hero card
    console.log('📍 7. Exiting Reader to verify Last Read Resume card...');
    const exitBtn = await page.$('button[title*="Exit Reader"], button::-p-text(Library)');
    if (exitBtn) {
      await exitBtn.click();
      await new Promise(r => setTimeout(r, 1500));
      await page.screenshot({ path: 'scratch/07_ebook_catalog_resume_hero.png' });
      console.log('📸 Captured 07_ebook_catalog_resume_hero.png');
    }

    console.log('✨ All browser interactions completed successfully!');
  } catch (err) {
    console.error('Interaction error:', err);
  } finally {
    await browser.close();
  }
}

runInteraction();
