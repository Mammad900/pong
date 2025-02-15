import fs from 'fs';
const out = await Bun.build({
    entrypoints: ['script.ts'],
    minify: true
})
const jsCompiled = await out.outputs[0].text();
const html = await fs.promises.readFile('pong.html');
const css = await fs.promises.readFile('style.css');
const outHTML = html.toString()
    .replace(`/*STYLE*/`, css.toString())
    .replace(`/*SCRIPT*/`, jsCompiled);
await fs.promises.writeFile('index.html', outHTML)