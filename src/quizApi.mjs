import {getFirstLines, MexStructure, randNum} from "./util.mjs";

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
    answered = {};
    correctAnswered = {};
    lang = "kz";

    constructor(text, name, {
        ticketKeyword = "%_V%",
        correctKeyword = "%_C%",
        lineBreak = "\n",
        lang = "kz",
    } = {}) {
        this.name = name;
        this.TICKET_KEYWORD = ticketKeyword;
        this.CORRECT_KEYWORD = correctKeyword;
        this.LINE_BREAK = lineBreak;
        this.lang = lang;
        this.TICKET_START = 1;

        this.propagatePlainText(text);

        this.totalTicketCount = Object.keys(this.tickets).length;

        this.TICKET_END = this.TICKET_START + this.totalTicketCount - 1;
    }
    makeGuess(ticketId, wasCorrect = false) {
        if (!this.answered[ticketId]) {
            this.answered[ticketId] = 0;
        }
        if (!this.correctAnswered[ticketId]) {
            this.correctAnswered[ticketId] = 0;
        }
        this.answered[ticketId]++;
        this.correctAnswered[ticketId] += Number(wasCorrect);
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
        const chosenTicketId = this.testIdToTicketId(chosenTestId);
        const chosenTest = this.tickets[chosenTicketId][chosenTestId];
        if (!chosenTest) return null;

        return {...this.tickets[chosenTicketId][chosenTestId], id: chosenTestId};
    }
    getRandomTest(ticketLeftBound = this.TICKET_START, ticketRightBound = this.TICKET_END) {
        const chosenTicket = this.tickets[randNum(ticketLeftBound, ticketRightBound + 1)];
        if (!chosenTicket) return null;

        const chosenTestId = Object.keys(chosenTicket)[randNum(0, Object.keys(chosenTicket).length)];
        const chosenTest = chosenTicket[chosenTestId];
        if (!chosenTest) return null;

        return {...chosenTest, id: chosenTestId};
    }
    getMeta(ticketLeftBound = this.TICKET_START, ticketRightBound = this.TICKET_END) {
        const res = {
            totalTestCount: 0,
            totalCorrectCount: 0,
            answeredCount: 0,
            correctAnsweredCount: 0
        };
        for (let ticketIndex = ticketLeftBound; ticketIndex <= ticketRightBound; ++ticketIndex) {
            let ticketId = ticketIndex;
            let testCount = Object.values(this.tickets[ticketId]).length;

            res.totalTestCount += testCount;
            res.totalCorrectCount += testCount - this.leftTestIds[ticketId].length;
            res.answeredCount += (this.answered[ticketId] ?? 0);
            res.correctAnsweredCount += (this.correctAnswered[ticketId] ?? 0);
        }
        return res;
    }
    miss(testId) {
        if (!testId) {
            throw new Error("Null id is not acceptable!");
        }
        const ticketId = this.testIdToTicketId(testId);
        let indexOfTestId = this.leftTestIds[ticketId].indexOf(testId);
        if (indexOfTestId === -1) return false;

        this.leftTestIds[ticketId]
            .splice(indexOfTestId, 1);
        return true;
    }
    reset(ticketLeftBound = this.TICKET_START, ticketRightBound = this.TICKET_END) {
        for (let ticketIndex = ticketLeftBound; ticketIndex <= ticketRightBound; ++ticketIndex) {
            let ticketId = String(ticketIndex);
            this.leftTestIds[ticketId].length = 0;
            for (let testId of Object.keys(this.tickets[ticketId])) {
                this.leftTestIds[ticketId].push(String(testId));
                this.answered[ticketId] = 0;
                this.correctAnswered[ticketId] = 0;
            }
        }
        return true;
    }

    propagatePlainText(text) {
        let curTicketCount = 0;
        let curTicketIndex = 0;
        let isStartOfPlainText = true;

        const rows = text.split(this.LINE_BREAK);

        let curInnerTicketText = "";
        for (let row of rows) {
            row = row.trim();
            if (!row) continue;

            if (isStartOfPlainText) {

            }
            isStartOfPlainText = false;

            if (row.includes(this.TICKET_KEYWORD)) {
                if (!curInnerTicketText) continue;

                curTicketCount++;

                curTicketIndex = this.TICKET_START + curTicketCount - 1;
                this.propagateTicket(curInnerTicketText, curTicketIndex);
                curInnerTicketText = "";
            } else {
                curInnerTicketText += row + this.LINE_BREAK;
            }
        }
        if (curInnerTicketText) {
            curTicketCount++;

            curTicketIndex = this.TICKET_START + curTicketCount - 1;
            this.propagateTicket(curInnerTicketText, curTicketIndex);
        }
    }
    propagateTicket(text, ticketIndex) {
        if (!ticketIndex) {
            throw new Error("Null ticket id is not acceptable!");
        }
        this.tickets[ticketIndex] = {};
        // ticket text -> array of parsed tests
        // NOTE: we assume that ticket does not start with a variant line and
        //       every variant of respective question is on one row

        const rows = text.split(this.LINE_BREAK);
        let isPreviousWasVariant = false;
        let curTestChunk = "";
        let mexStructre = new MexStructure(1);

        for (let row of rows) {
            row = row.trim();
            if (!row) continue;

            if (this.isStartOfVariant(row)) {
                isPreviousWasVariant = true;
            } else {
                if (isPreviousWasVariant) {
                    // current line is not variant and previous is variant: making new test chunk

                    this.propagateTestChunk(curTestChunk, ticketIndex, mexStructre);
                    curTestChunk = "";
                }
                isPreviousWasVariant = false;
            }
            curTestChunk += row + this.LINE_BREAK;
        }
        if (curTestChunk.trim()) {
            if (!this.getVariantsArray(curTestChunk).length) return;

            this.propagateTestChunk(curTestChunk, ticketIndex, mexStructre);
        }
    }
    propagateTestChunk(testChunk, ticketIndex, mexStructure = new MexStructure()) {
        let testChunkStartLine = getFirstLines(testChunk, 1, "\n");
        let quiestionIndex = this.getQuestionIndex(testChunkStartLine);
        let testIndex;

        if (quiestionIndex !== -1) {
            testIndex = quiestionIndex;
        } else {
            testIndex = 1;
        }
        testIndex = mexStructure.add(testIndex); // returns least available index from the set

        if (!ticketIndex || !testIndex) {
            throw new Error("Null id ticket or test is not acceptable!");
        }
        let ticketId = String(ticketIndex);
        let testId = `${ticketIndex}-${testIndex}`;
        if (!this.leftTestIds[ticketId]) {
            this.leftTestIds[ticketId] = [];
        }
        if (!this.answered[ticketId]) {
            this.answered[ticketId] = 0;
        }
        if (!this.correctAnswered[ticketId]) {
            this.correctAnswered[ticketId] = 0;
        }
        this.leftTestIds[ticketId].push(testId);
        this.tickets[ticketId][testId] = ({
            question: this.getQuestion(testChunk),
            variants: this.getVariantsArray(testChunk)
        });
    }
    testIdToTicketId(testId) {
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
    getQuestionIndex(line) {
        if (!/^ *\d+ *\./.test(line)) { // line does not match "  {digits}    .{*}"
            return -1;
        }
        let res = "";
        for (let ch of line) {
            if (ch === ".") {
                break;
            }
            if (ch === " ") {
                continue;
            }
            res += ch;
        }
        return Number(res);
    }
}