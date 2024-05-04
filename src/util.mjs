export function randNum(l, r) {
    return r - Math.floor(Math.random() * (r - l) + 1);
}
export function shuffle(arr) {
    for (let i = 1; i < arr.length; ++i) {
        let rIndex = randNum(0, i);
        [arr[i], arr[rIndex]] = [arr[rIndex], arr[i]];
    }
}
export function stripWhiteSpaceAround(text, pattern) {
    let lastIndex = text.length - 1;
    return text
        .split(pattern)
        .map((part, index) => {
            if (index === 0 && index !== lastIndex) {
                return part.trimEnd();
            }
            if (index !== 0 && index === lastIndex) {
                return part.trimStart();
            }
            if (index !== 0 && index !== lastIndex) {
                return part.trim();
            }
            return part;
        })
        .join(pattern);
}
export function typeofQuizLine(line, ticketKeyword = "%_V%") {
    if (/^[a-zA-Zа-яА-Я] *\)/.test(line)) {
        return "variant";
    } else if (line.includes(ticketKeyword)) {
        return "ticket";
    } else {
        return "question";
    }
}
export function compressQuizTicket(line, ticketKeyword = "%_V%") {
    return stripWhiteSpaceAround(line, ticketKeyword);
}
export function compressQuizVariant(line, correctKeyword = "%_C%") {
    line = line.trim();
    line = line
        .split(")", 2)
        .map((partLine, index) => {
            let res = "";
            if (index === 0) {
                for (let ch of partLine) {
                    if (ch === " ") continue;
                    res += ch;
                }
            }
            else if (index === 1) {
                partLine = line.split(")").slice(1).join(")"); // taking rest of split after ")"
                if (partLine.includes(correctKeyword)) {
                    res = stripWhiteSpaceAround(partLine, correctKeyword);
                } else {
                    res = partLine;
                }
            }
            return res.trim();
        })
        .join(")")
        .trim();
    return line;
}
export function compressQuizText(text, lineBreak = "\n") {
    return text
        .split(lineBreak)
        .map(line => {
            let type = typeofQuizLine(line);
            if (type === "ticket") {
                return compressQuizTicket(line);
            }
            else if (type === "question") {
                return line.trim();
            }
            else if (type === "variant") {
                return compressQuizVariant(line);
            }
        })
        .filter(line => line.length)
        .join(lineBreak);
}
export function getFirstLines(text, count = 1, lineBreak = "\n") {
    let res = "";
    let curCount = 0;
    for (let ch of text) {
        if (ch === lineBreak) {
            curCount++;
            if (curCount === count) {
                break;
            }
        }
        res += ch;
    }
    return res;
}
export class MexStructure {
    numSet = new Set();
    constructor(startExclusionFrom = 0) {
        this.startExclusionFrom = startExclusionFrom;
    }
    add(val) {
        if (this.numSet.has(val)) {
            val = this.mexFrom(val);
        }
        this.numSet.add(val);
        return val;
    }
    remove(val) {
        this.numSet.delete(val);
        return val;
    }
    mex() {
        let index = this.startExclusionFrom;
        while(this.numSet.has(index)) {
            index++;
        }
        return index;
    }
    mexFrom(startIndex) {
        let index = startIndex;
        while(this.numSet.has(index)) {
            index++;
        }
        return index;
    }
    clear() {
        this.numSet.clear();
    }
}