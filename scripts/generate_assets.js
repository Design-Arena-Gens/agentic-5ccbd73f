const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const PImage = require('pureimage');
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');

const ROOT = __dirname + '/..';
const phpDir = path.join(ROOT, 'php');
const outputsDir = path.join(ROOT, 'outputs');
const publicDir = path.join(ROOT, 'public');
const imagesDir = path.join(publicDir, 'images');
const assetsDir = path.join(ROOT, 'assets');

function ensureDirs() {
  [outputsDir, imagesDir, publicDir].forEach((d) => {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  });
}

function tryRegisterMonospaceFont() {
  const candidates = [
    '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf',
    '/usr/share/fonts/dejavu/DejaVuSansMono.ttf',
    '/usr/share/fonts/truetype/liberation/LiberationMono-Regular.ttf',
    '/usr/share/fonts/liberation/LiberationMono-Regular.ttf',
  ];
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) {
        const f = PImage.registerFont(p, 'Mono');
        f.loadSync();
        return 'Mono';
      }
    } catch {}
  }
  return null;
}

function runPhpScript(scriptName, inputLines) {
  const scriptPath = path.join(phpDir, scriptName);
  const input = Array.isArray(inputLines) ? inputLines.join('\n') + '\n' : String(inputLines) + '\n';
  const out = execFileSync('php', [scriptPath], { input, encoding: 'utf8' });
  return out;
}

async function renderTerminalImage(text, outPath) {
  const width = 900;
  const height = 360;
  const img = PImage.make(width, height);
  const ctx = img.getContext('2d');
  const family = tryRegisterMonospaceFont();

  // Background
  ctx.fillStyle = '#0c0f14';
  ctx.fillRect(0, 0, width, height);

  // Header bar
  ctx.fillStyle = '#151a21';
  ctx.fillRect(0, 0, width, 46);

  // Traffic lights
  const lights = [ '#ff5f56', '#ffbd2e', '#27c93f' ];
  [20, 45, 70].forEach((x, i) => {
    ctx.fillStyle = lights[i];
    ctx.beginPath();
    ctx.arc(x, 23, 8, 0, Math.PI * 2, true);
    ctx.fill();
  });

  // Title
  ctx.fillStyle = '#cfd6dd';
  ctx.font = family ? `20pt '${family}'` : '20pt sans-serif';
  ctx.fillText('bash ? php output', 110, 30);

  // Body text
  ctx.fillStyle = '#e6edf3';
  ctx.font = family ? `16pt '${family}'` : '16pt sans-serif';

  const margin = 18;
  const lineHeight = 24;
  const contentTop = 60;
  const maxWidth = width - margin * 2;

  // Simple wrapping by characters (pureimage lacks measureText width precision)
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  let y = contentTop;
  for (const line of lines) {
    let buf = '';
    for (const ch of line) {
      // crude wrap at ~100 chars
      if (buf.length >= 100) {
        ctx.fillText(buf, margin, y);
        y += lineHeight;
        buf = '';
      }
      buf += ch;
    }
    ctx.fillText(buf, margin, y);
    y += lineHeight;
    if (y > height - margin) break;
  }

  await PImage.encodePNGToStream(img, fs.createWriteStream(outPath));
}

async function makePdf({ task1Out, task2Out }) {
  const pdfDoc = await PDFDocument.create();
  const courier = await pdfDoc.embedFont(StandardFonts.Courier);
  const helv = await pdfDoc.embedFont(StandardFonts.Helvetica);

  // If assets/cover.pdf exists, import its pages first
  const coverPath = path.join(assetsDir, 'cover.pdf');
  if (fs.existsSync(coverPath)) {
    const coverBytes = fs.readFileSync(coverPath);
    const coverDoc = await PDFDocument.load(coverBytes);
    const coverPages = await pdfDoc.copyPages(coverDoc, coverDoc.getPageIndices());
    coverPages.forEach((p) => pdfDoc.addPage(p));
  } else {
    // Generate a simple cover page
    const page = pdfDoc.addPage([595.28, 841.89]); // A4
    const { width, height } = page.getSize();
    page.drawRectangle({ x: 0, y: 0, width, height, color: rgb(0.95, 0.97, 1) });
    page.drawText('PHP Mini Project', { x: 60, y: height - 140, size: 36, font: helv, color: rgb(0.1, 0.12, 0.2) });
    page.drawText('Tasks:', { x: 60, y: height - 190, size: 18, font: helv });
    page.drawText('1) Largest of Three Numbers (Nested if)', { x: 80, y: height - 220, size: 14, font: helv });
    page.drawText('2) Reverse a String using strrev()', { x: 80, y: height - 240, size: 14, font: helv });
  }

  function addTitle(page, text, y) {
    page.drawText(text, { x: 60, y, size: 22, font: helv, color: rgb(0, 0, 0) });
  }
  function addSubtitle(page, text, y) {
    page.drawText(text, { x: 60, y, size: 15, font: helv, color: rgb(0.1, 0.1, 0.1) });
  }
  function addWrappedText(page, text, x, y, maxWidth, font, size, lineGap = 12) {
    const words = text.split(/\s+/);
    let line = '';
    let cursorY = y;
    for (const w of words) {
      const test = line ? line + ' ' + w : w;
      const width = font.widthOfTextAtSize(test, size);
      if (width > maxWidth && line) {
        page.drawText(line, { x, y: cursorY, size, font });
        cursorY -= size + lineGap;
        line = w;
      } else {
        line = test;
      }
    }
    if (line) {
      page.drawText(line, { x, y: cursorY, size, font });
      cursorY -= size + lineGap;
    }
    return cursorY;
  }
  function addCodeBlock(page, code, x, y) {
    const maxWidth = 475;
    const size = 11;
    const bgPadding = 8;
    const lines = code.replace(/\r\n/g, '\n').split('\n');
    let cursorY = y;

    // background rectangle height estimation
    const rectHeight = (lines.length * (size + 6)) + bgPadding * 2;
    page.drawRectangle({ x: x - bgPadding, y: cursorY - rectHeight + size, width: maxWidth + bgPadding * 2, height: rectHeight, color: rgb(0.97, 0.97, 0.97) });

    for (const line of lines) {
      page.drawText(line, { x, y: cursorY, size, font: courier, color: rgb(0.12, 0.12, 0.12) });
      cursorY -= size + 6;
      if (cursorY < 80) break;
    }
    return cursorY - 10;
  }

  // Load resources
  const task1Code = fs.readFileSync(path.join(phpDir, 'task1_largest.php'), 'utf8');
  const task2Code = fs.readFileSync(path.join(phpDir, 'task2_strrev.php'), 'utf8');
  const task1Png = fs.readFileSync(path.join(imagesDir, 'task1_output.png'));
  const task2Png = fs.readFileSync(path.join(imagesDir, 'task2_output.png'));

  // Task 1 page
  let page = pdfDoc.addPage([595.28, 841.89]); // A4
  let y = 800;
  addTitle(page, 'Task 1: Largest of Three Numbers (Nested if)', y); y -= 30;
  addSubtitle(page, 'AIM', y); y -= 18;
  y = addWrappedText(page, 'To write a PHP program that determines the largest of three numbers using nested if statements.', 60, y, 475, helv, 12);
  addSubtitle(page, 'Problem Statement', y); y -= 18;
  y = addWrappedText(page, 'Given three numeric inputs, compare values using nested conditional statements to compute and print the largest number.', 60, y, 475, helv, 12);
  addSubtitle(page, 'Constraints', y); y -= 18;
  y = addWrappedText(page, 'Inputs are real numbers. Use nested if (not built-in max). Handle equal values deterministically.', 60, y, 475, helv, 12);
  addSubtitle(page, 'Procedure', y); y -= 18;
  y = addWrappedText(page, '1) Read three numbers from standard input. 2) Use nested if to compare pairs and track the current largest. 3) Print the largest number.', 60, y, 475, helv, 12);
  addSubtitle(page, 'Program', y); y -= 18;
  y = addCodeBlock(page, task1Code, 60, y);
  addSubtitle(page, 'Output (sandbox run)', y); y -= 190;
  const png1 = await pdfDoc.embedPng(task1Png);
  page.drawImage(png1, { x: 60, y: y, width: 475, height: 180 });
  y -= 200;
  addSubtitle(page, 'Conclusion', y); y -= 18;
  y = addWrappedText(page, 'The program correctly identifies the largest value among three inputs using nested if statements and prints the result.', 60, y, 475, helv, 12);

  // Task 2 page (new page)
  page = pdfDoc.addPage([595.28, 841.89]);
  y = 800;
  addTitle(page, 'Task 2: Reverse a String using strrev()', y); y -= 30;
  addSubtitle(page, 'AIM', y); y -= 18;
  y = addWrappedText(page, 'To write a PHP program that reverses a given string using the built-in function strrev().', 60, y, 475, helv, 12);
  addSubtitle(page, 'Problem Statement', y); y -= 18;
  y = addWrappedText(page, 'Read a line of text from input and display both the original string and its reversed form using strrev().', 60, y, 475, helv, 12);
  addSubtitle(page, 'Constraints', y); y -= 18;
  y = addWrappedText(page, 'Input is a UTF-8 string. Use strrev() directly for reversal. Whitespace should be preserved as entered.', 60, y, 475, helv, 12);
  addSubtitle(page, 'Procedure', y); y -= 18;
  y = addWrappedText(page, '1) Read a string from standard input. 2) Apply strrev() to obtain the reversed string. 3) Print the original and reversed strings.', 60, y, 475, helv, 12);
  addSubtitle(page, 'Program', y); y -= 18;
  y = addCodeBlock(page, task2Code, 60, y);
  addSubtitle(page, 'Output (sandbox run)', y); y -= 190;
  const png2 = await pdfDoc.embedPng(task2Png);
  page.drawImage(png2, { x: 60, y: y, width: 475, height: 180 });
  y -= 200;
  addSubtitle(page, 'Conclusion', y); y -= 18;
  y = addWrappedText(page, 'The program leverages PHP\'s strrev() to reverse the input string and displays both the original and reversed outputs.', 60, y, 475, helv, 12);

  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync(path.join(publicDir, 'report.pdf'), pdfBytes);
}

(async () => {
  ensureDirs();

  // Run PHP programs with specific inputs
  const task1Out = runPhpScript('task1_largest.php', ['12', '45', '27']);
  const task2Out = runPhpScript('task2_strrev.php', 'Hello, World!');

  fs.writeFileSync(path.join(outputsDir, 'task1.txt'), task1Out, 'utf8');
  fs.writeFileSync(path.join(outputsDir, 'task2.txt'), task2Out, 'utf8');

  // Render images
  await renderTerminalImage(task1Out, path.join(imagesDir, 'task1_output.png'));
  await renderTerminalImage(task2Out, path.join(imagesDir, 'task2_output.png'));

  // Generate PDF
  await makePdf({ task1Out, task2Out });

  console.log('Assets generated: public/report.pdf and images.');
})();
