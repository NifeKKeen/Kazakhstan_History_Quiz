import path from "node:path";
import fs from "node:fs";
import { compressQuizText } from "./util.mjs";

let objsTxt = "";
const textPath = path.resolve("./texts");

const textFilesDir = fs.readdirSync(textPath);

for (let fileName of textFilesDir) {
    if (!path.parse(fileName).ext) { // isDirectory
        continue;
    }
    let data = fs.readFileSync(`${textPath}/${fileName}`, "utf-8");
    data = compressQuizText(data);

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