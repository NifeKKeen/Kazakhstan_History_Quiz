import path from "node:path";
import fs from "node:fs";
let objsTxt = "";
const textPath = path.resolve("./texts");

const textFilesDir = fs.readdirSync(textPath);

for (let fileName of textFilesDir) {
    if (!path.parse(fileName).ext) { // isDirectory
        continue;
    }
    const data = fs.readFileSync(`${textPath}/${fileName}`);

    objsTxt += `{ 
        content:\`${data}\`, 
        name: \"${path.parse(fileName).name}\"
    }, `
    console.log(`${fileName} was processed`);
}

const textsJs = `
export const texts = [${objsTxt}].flat();
`

fs.writeFileSync("./texts.mjs", textsJs);