import sharp from "sharp";
import { readFileSync, writeFileSync } from "fs";

const svg = readFileSync("packages/client/public/favicon.svg", "utf-8");

[192, 512, 180].forEach(async (s) => {
  await sharp(Buffer.from(svg)).resize(s, s).png().toFile(`packages/client/public/icons/icon-${s}.png`);
  console.log(`icon-${s}.png done`);
});
