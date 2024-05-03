import { randNum } from "./util.mjs";

export class Quiz {
    /*
    tickets: {
        ticketId: {
            testId: {
                question: string,
                variant: VariantObject,
            }
        }
    }
    VariantObject: {
        text: string,
        isCorrect: Boolean,
        id: string
    }
    leftTestIds: {
        ticketId: testId[]
    }
     */
    tickets = {};
    leftTestIds = {}; // not used tests
    totalTicketCount = null;

    constructor(text, name, {
        ticketKeyword = "%_V%",
        correctKeyword = "%_C%",
        lineBreak = "\n",
    } = {}) {
        this.name = name;
        this.TICKET_KEYWORD = ticketKeyword;
        this.CORRECT_KEYWORD = correctKeyword;
        this.LINE_BREAK = lineBreak;
        this.TICKET_START = 1;

        this.propagatePlainText(text);

        this.totalTicketCount = Object.keys(this.tickets).length;

        this.TICKET_END = this.TICKET_START + this.totalTicketCount - 1;
    }
    getNotWasRandomTest(ticketLeftBound = this.TICKET_START, ticketRightBound = this.TICKET_END) {
        const possibleTickets = [];
        for (let index = ticketLeftBound; index <= ticketRightBound; ++index) {
            let id = index;
            if (this.leftTestIds[id].length > 0) {
                possibleTickets.push(this.leftTestIds[id]);
            }
        }
        if (possibleTickets.length === 0) return null;

        const index = randNum(0, possibleTickets.length);

        const chosenTestId = possibleTickets[index][randNum(0, possibleTickets[index].length)];
        const chosenTicketId = this.testIdToTicketIdMap(chosenTestId);
        const chosenTest = this.tickets[chosenTicketId][chosenTestId];
        if (!chosenTest) return null;

        return { ...this.tickets[chosenTicketId][chosenTestId], id: chosenTestId };
    }
    getRandomTest(ticketLeftBound = this.TICKET_START, ticketRightBound = this.TICKET_END) {
        const chosenTicket = this.tickets[randNum(ticketLeftBound, ticketRightBound + 1)];
        if (!chosenTicket) return null;

        const chosenTestId = Object.keys(chosenTicket)[randNum(0, Object.keys(chosenTicket).length)];
        const chosenTest = chosenTicket[chosenTestId];
        if (!chosenTest) return null;

        return { ...chosenTest, id: chosenTestId };
    }
    getMeta(ticketLeftBound = this.TICKET_START, ticketRightBound = this.TICKET_END) {
        const res = {
            totalVariantCount: 0,
            totalCorrectCount: 0,
        };
        for (let index = ticketLeftBound; index <= ticketRightBound; ++index) {
            let id = index;
            let testCount = Object.values(this.tickets[id]).length;
            if (id.toString() === "1") {
                console.log(testCount);
                console.log(this.leftTestIds[id].length)
            }
            res["totalVariantCount"] += testCount;
            res["totalCorrectCount"] += testCount - this.leftTestIds[id].length;
        }
        return res;
    }
    miss(testId) {
        if (!testId) {
            throw new Error("Null id is not acceptable!");
        }
        const ticketId = this.testIdToTicketIdMap(testId);
        let indexOfTestId = this.leftTestIds[ticketId].indexOf(testId);
        if (indexOfTestId === -1) return false;

        this.leftTestIds[ticketId]
            .splice(indexOfTestId, 1);
        return true;
    }
    reset(ticketLeftBound = this.TICKET_START, ticketRightBound = this.TICKET_END) {
        for (let id = ticketLeftBound; id <= ticketRightBound; ++id) {
            this.leftTestIds[id].length = 0;
            for (let testId of Object.keys(this.tickets[id])) {
                this.leftTestIds[id].push(String(testId));
            }
        }
        return true;
    }
    propagatePlainText(text) {
        let curTicketCount = 0;
        let curTicketIndex = 0;
        let isStartOfPlainText = true;

        const rows = text.split(this.LINE_BREAK);

        let currInnerTicketText = "";
        for (let row of rows) {
            row = row.trim();
            if (!row) continue;

            if (isStartOfPlainText) {

            }
            isStartOfPlainText = false;

            if (row.includes(this.TICKET_KEYWORD)) {
                if (!currInnerTicketText) continue;

                curTicketCount++;

                curTicketIndex = this.TICKET_START + curTicketCount - 1;
                this.propagateTicket(currInnerTicketText, curTicketIndex);
                currInnerTicketText = "";
            }
            else {
                currInnerTicketText += row + this.LINE_BREAK;
            }
        }
        if (currInnerTicketText) {
            curTicketCount++;

            curTicketIndex = this.TICKET_START + curTicketCount - 1;
            this.propagateTicket(currInnerTicketText, curTicketIndex);
        }
    }
    propagateTicket(text, ticketIndex) {
        if (!ticketIndex) {
            throw new Error("Null ticket id is not acceptable!");
        }
        this.tickets[ticketIndex] = {};
        let curTestIndex = 0;
        // ticket text -> array of parsed tests
        // NOTE: we assume that ticket does not start with a variant line and
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
                    curTestIndex++;

                    this.propagateTestChunk(curTestChunk, ticketIndex, curTestIndex);
                    curTestChunk = "";
                }
                isPreviousWasVariant = false;
            }
            curTestChunk += row + this.LINE_BREAK;
        }
        if (curTestChunk.trim()) {
            if (!this.getVariantsArray(curTestChunk).length) return;

            curTestIndex++;

            this.propagateTestChunk(curTestChunk, ticketIndex, curTestIndex);
        }
    }
    propagateTestChunk(testChunk, ticketIndex, testIndex) {
        if (!ticketIndex || !testIndex) {
            throw new Error("Null id ticket or test is not acceptable!");
        }
        let ticketId = String(ticketIndex);
        let testId = `${ticketIndex}-${testIndex}`;
        if (!this.leftTestIds[ticketId]) {
            this.leftTestIds[ticketId] = [];
        }
        this.leftTestIds[ticketId].push(testId);
        this.tickets[ticketId][testId] = ({
            question: this.getQuestion(testChunk),
            variants: this.getVariantsArray(testChunk)
        });
    }
    testIdToTicketIdMap(testId) {
        return testId.slice(0, testId.indexOf("-"));
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