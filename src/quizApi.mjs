import { randNum } from "./util.mjs";

export class Quiz {
    /*
    tickets: {
        ticketId: {
            testId: {
                question: text,
                variant: VariantObject
            }
        }
    }
     */
    tickets = {};
    leftTestIdsMap = {}; // ticketId: [ testId ] // not used tests
    testIdToTicketIdMap = {}; // testId: ticketId
    totalTicketCount = 0;

    curTicketCount = 0;
    curTestCount = 0;
    constructor(text, name, { ticketKeyword, correctKeyword, lineBreak } = {}) {
        this.name = name;
        this.TICKET_KEYWORD = ticketKeyword ?? "%_V%";
        this.CORRECT_KEYWORD = correctKeyword ?? "%_C%";
        this.LINE_BREAK = lineBreak ?? "\n";

        this.propagatePlainText(text);
        this.totalTicketCount = Object.keys(this.tickets).length;
    }
    getNotWasRandomTest(ticketLeftBound = 1, ticketRightBound = this.totalTicketCount) {
        const possibleTickets = [];
        for (let id = ticketLeftBound; id <= ticketRightBound; ++id) {
            if (this.leftTestIdsMap[id].length > 0) {
                possibleTickets.push(this.leftTestIdsMap[id]);
            }
        }
        if (possibleTickets.length === 0) return null;

        const index = randNum(0, possibleTickets.length);

        const chosenTestId = possibleTickets[index][randNum(0, possibleTickets[index].length)];
        const chosenTicketId = this.testIdToTicketIdMap[chosenTestId];

        return { ...this.tickets[chosenTicketId][chosenTestId], id: chosenTestId };
    }
    getRandomTest(ticketLeftBound = 1, ticketRightBound = this.totalTicketCount) {
        const chosenTicket = this.tickets[randNum(ticketLeftBound, ticketRightBound + 1)];
        if (!chosenTicket) return null;

        const chosenTestId = Object.keys(chosenTicket)[randNum(0, Object.keys(chosenTicket).length)];
        const chosenTest = chosenTicket[chosenTestId];
        if (!chosenTest) return null;

        return { ...chosenTest, id: chosenTestId };
    }
    getMeta(ticketLeftBound = 1, ticketRightBound = this.totalTicketCount) {
        const res = {
            totalVariantCount: 0,
            totalCorrectCount: 0,
        };
        for (let id = ticketLeftBound; id <= ticketRightBound; ++id) {
            let testCount = Object.values(this.tickets[id]).length;
            res["totalVariantCount"] += testCount;
            res["totalCorrectCount"] += testCount - this.leftTestIdsMap[id].length;
        }
        return res;
    }
    miss(testId) {
        testId = String(testId);
        if (!testId) {
            throw new Error("Null id is not acceptable!");
        }
        const ticketId = this.testIdToTicketIdMap[testId];
        let indexOfTestId = this.leftTestIdsMap[ticketId].indexOf(testId);
        if (indexOfTestId === -1) return false;

        this.leftTestIdsMap[ticketId]
            .splice(indexOfTestId, 1);
        return true;
    }
    reset(ticketLeftBound = 1, ticketRightBound = this.totalTicketCount) {
        for (let id = ticketLeftBound; id <= ticketRightBound; ++id) {
            this.leftTestIdsMap[id].length = 0;
            for (let testId of Object.keys(this.tickets[id])) {
                this.leftTestIdsMap[id].push(String(testId));
            }
        }
        return true;
    }
    propagatePlainText(text) {
        this.curTicketCount = 0;
        const rows = text.split(this.LINE_BREAK);

        let currInnerTicketText = "";
        for (let row of rows) {
            row = row.trim();
            if (!row) continue;

            if (row.includes(this.TICKET_KEYWORD)) {
                if (!currInnerTicketText) continue;
                this.curTicketCount++;
                this.propagateTicket(currInnerTicketText, this.curTicketCount);
                currInnerTicketText = "";
            }
            else {
                currInnerTicketText += row + this.LINE_BREAK;
            }
        }
        if (currInnerTicketText) {
            this.curTicketCount++;
            this.propagateTicket(currInnerTicketText, this.curTicketCount);
        }
    }
    propagateTicket(text, ticketId) {
        if (!ticketId) {
            throw new Error("Null ticket id is not acceptable!");
        }
        this.tickets[ticketId] = {};
        // ticket text -> array of parsed tests
        // NOTE: we assume that ticket does not start with a variant and
        //       every variant of respective question is on one row

        const rows = text.split(this.LINE_BREAK);
        let isPreviousWasVariant = false;

        let curTestChunk = "";
        for (let row of rows) {
            row = row.trim();
            if (!row) continue;

            if (this.isStartOfVariant(row)) {
                isPreviousWasVariant = true;
            }
            else {
                if (isPreviousWasVariant) {
                    // current line is not variant and previous is variant: making new test chunk
                    this.curTestCount++;
                    this.propagateTestChunk(curTestChunk, ticketId, this.curTestCount);
                    curTestChunk = "";
                }
                isPreviousWasVariant = false;
            }
            curTestChunk += row + this.LINE_BREAK;
        }
        if (curTestChunk.trim()) {
            this.curTestCount++;
            if (this.getVariantsArray(curTestChunk).length) {
                this.propagateTestChunk(curTestChunk, ticketId, this.curTestCount);
            }
        }
    }
    propagateTestChunk(testChunk, ticketId, testId) {
        ticketId = String(ticketId);
        testId = String(testId);
        if (!ticketId || !testId) {
            throw new Error("Null id ticket or test is not acceptable!");
        }
        this.testIdToTicketIdMap[testId] = ticketId;
        if (!this.leftTestIdsMap[ticketId]) {
            this.leftTestIdsMap[ticketId] = [];
        }
        this.leftTestIdsMap[ticketId].push(testId);
        this.tickets[ticketId][testId] = ({
            question: this.getQuestion(testChunk),
            variants: this.getVariantsArray(testChunk)
        });
    }
    pushVariant(arr, text, isCorrect) {
        arr.push({
            text: text,
            isCorrect: isCorrect,
        });
    }
    getQuestion(testChunk) {
        if (!testChunk) return "";
        let res = "";
        const rows = testChunk.split(this.LINE_BREAK);

        for (let row of rows) {
            row = row.trim();
            if (!row) continue;
            if (this.isStartOfVariant(row)) {
                return this.trimQuestion(res);
            }
            res += row + " ";
        }
        return this.trimQuestion(res);
    }
    getVariantsArray(testChunk) {
        const res = [];

        if (!testChunk) return res;

        let variantsCount = 0;
        let correctVariantsCount = 0;
        let isVariantsStarted = false; // we started to handle variants

        let curVariant = ""; // variant text
        let isCurVariantCorrect = false; // cur checked variant is correct

        const rows = testChunk.split(this.LINE_BREAK);

        for (let row of rows) {
            row = row.trim();
            if (!row) continue;

            if (this.isStartOfVariant(row)) {
                isVariantsStarted = true;
                variantsCount++;

                if (curVariant) { // variant is processed before
                    curVariant = this.trimVariant(curVariant);
                    this.pushVariant(
                        res,
                        curVariant,
                        isCurVariantCorrect
                    );
                    curVariant = "";
                    isCurVariantCorrect = false;
                }
            }
            if (!isVariantsStarted) continue;

            curVariant += row + " ";

            if (row.includes(this.CORRECT_KEYWORD)) {
                isCurVariantCorrect = true;
                correctVariantsCount++;
            }
        }
        if (isVariantsStarted && curVariant) { // variant is not processed yet
            curVariant = this.trimVariant(curVariant);
            this.pushVariant(
                res,
                curVariant,
                isCurVariantCorrect
            );
        }
        return res;
    }
    isStartOfVariant(text) {
        return /^[a-zA-Zа-яА-Я] *\)/.test(text); // "[letter])..." template
    }
    trimQuestion(question) {
        let it = 0; // iterator
        let flag = false; // to find out if question has "."
        for (let char of question) {
            it++;
            if (char === ".") { // end of question numeric
                flag = true;
                break;
            }
        }
        if (!flag) return question;
        return question.substring(it).trim();
    }
    trimVariant(variant) {
        let it = 0; // iterator
        let flag = false; // to find out if variant has ")"
        for (let letter of variant) {
            it++;
            if (letter === ")") { // end of order letter
                flag = true;
                break;
            }
        }

        let startOfCORRECT = variant.indexOf(this.CORRECT_KEYWORD);
        if (startOfCORRECT !== -1)
            variant = variant.substring(0, startOfCORRECT) +
                variant.substring(startOfCORRECT + this.CORRECT_KEYWORD.length); // cutting correct keyword

        if (!flag) return variant;
        return variant.substring(it).trim();
    }
}