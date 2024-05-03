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