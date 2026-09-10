import { readFile, writeFile } from 'node:fs/promises';
const source = await readFile(new URL('./slides.md', import.meta.url), 'utf8');
const css = await readFile(new URL('./style.css', import.meta.url), 'utf8');
const slides = source.replace(/^---[\s\S]*?\n---\n/, '').split(/\n---\n/).map(s => s.replace(/<!--[\s\S]*?-->/g, '').trim());
const html = '<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>ZK Policy — Slide Preview</title><style>' + css + 'body{margin:0;background:#09080d;display:flex;flex-direction:column;align-items:center;gap:30px;padding:30px} .slide{flex-shrink:0} @media print{body{padding:0;gap:0}.slide{break-after:page}@page{size:980px 551.25px;margin:0}}</style>' + slides.join('') + '</html>';
await writeFile(new URL('./preview.html', import.meta.url), html);
console.log(slides.length + ' slides exported to preview.html');
