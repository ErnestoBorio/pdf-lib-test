import fs from 'fs';
import { exec } from 'child_process';
import {
  PDFDocument,
  PDFPage,
  PDFPageDrawSVGOptions,
  Color,
  cmyk,
  rgb
} from '@ecervo/pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { DOMParser } from '@xmldom/xmldom';
import { parse as cssParse, Rule, Declaration } from 'css';

const WaterMelonPath =
  'assets/Kindergarten-labels-pack/Watermelon/SVGs with bleed/rectangle-name-labels-watermelon-pretty.svg';

(async () => {
  const template = fs.readFileSync('assets/template.pdf');
  const pdf = await PDFDocument.load(template);
  pdf.registerFontkit(fontkit);
  const fontHappyMonkey = await pdf.embedFont(
    fs.readFileSync('assets/fonts/HappyMonkey-Regular.ttf')
  );
  const page = pdf.getPage(0);

  const sepCutContour = pdf.embedSeparation('CutContour', cmyk(0, 1, 0, 0));
  const spotCutContour = page.getSeparationColor(sepCutContour, 1);

  PageAddSVG(
    page,
    fs.readFileSync(WaterMelonPath).toString(),
    spotCutContour,
    70,
    500
  );

  page.drawText('Timmy', {
    font: fontHappyMonkey,
    color: rgb(1, 1, 1),
    x: 130,
    y: 470
  });

  const pdfBytes = await pdf.save();
  fs.writeFileSync('out2print.pdf', pdfBytes);
  exec('open out2print.pdf');
})();

function PageAddSVG(
  page: PDFPage,
  svg: string,
  cutContour: Color,
  x: number,
  y: number
) {
  const dom = new DOMParser().parseFromString(svg, 'image/svg+xml');
  const paths = dom.getElementsByTagName('path');
  for (let i = 0; i < paths.length; i++) {
    const path = paths.item(i);
    const id = path!.getAttribute('id');
    const data = path!.getAttribute('d');
    const style = path!.getAttribute('style');
    const css = cssParse(`*{${style}}`);
    const opt: PDFPageDrawSVGOptions = { x, y };
    css.stylesheet!.rules.forEach(rule => {
      if (rule.type === 'rule') {
        (rule as Rule).declarations!.forEach(decl => {
          if (decl.type === 'declaration') {
            const prop = (decl as Declaration).property!;
            const value = (decl as Declaration).value!;
            switch (prop) {
              case 'fill':
                if (value !== 'none') {
                  opt.color = parseHexRGB(value);
                }
                break;
              case 'stroke':
                opt.borderColor = parseHexRGB(value);
                break;
              case 'stroke-width':
                opt.borderWidth = parseInt(value);
                break;
            }
          }
        });
      }
    });
    if (id?.startsWith('dyeCut_')) {
      opt.borderColor = cutContour;
    }
    page.drawSvgPath(data!, opt);
  }
}

function parseHexRGB(hex: string): Color {
  const regex = /^#([a-f0-9]{6})$/i;
  const match = hex.match(regex);
  const red = parseInt(match![1].substring(0, 2), 16) / 255;
  const green = parseInt(match![1].substring(2, 4), 16) / 255;
  const blue = parseInt(match![1].substring(4, 6), 16) / 255;
  return rgb(red, green, blue);
}
