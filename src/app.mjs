import { shuffle } from "./util.mjs";
export class App {
    /*
    render re-renders DOM according to app's properties, they do not receive any argument
    render functions do not affect internal properties

    change functions affects only to internal app properties

    create functions return app-independent DOM elements



    handlers will return true if they are finished, false otherwise
     */
    curQuiz = null;
    curTicketCount = 0;
    curTicketLeftBound = 0;
    curTicketRightBound = 0;

    curCorrect = ""; // correct variant text
    firstTry = null;

    errorTimeoutId = -1;
    successTimeoutId = -1;
    constructor(htmlEl, quizes) {
        this.testSectionEl = htmlEl.querySelector(".main__section__test");
        this.quizes = quizes;

        this.chooseListEl = htmlEl.querySelector(".header__choose__list");

        this.statsResultEl = htmlEl.querySelector(".main__stats-result");
        this.statsResetBtn = htmlEl.querySelector(".main__reset-btn");

        this.ticketRangeEl = this.testSectionEl.querySelector(".main__ticket-range");
        this.ticketRangeLeftInput = this.ticketRangeEl.querySelector(".main__ticket-range-input-left");
        this.ticketRangeRightInput = this.ticketRangeEl.querySelector(".main__ticket-range-input-right");
        this.ticketRangeSubmitBtn = this.testSectionEl.querySelector(".main__submit-range");

        this.testQuestionEl = this.testSectionEl.querySelector(".main__question");
        this.testFormEl = this.testSectionEl.querySelector(".main__form");
        this.ticketLabelEl = this.testSectionEl.querySelector(".main__ticket__label");

        this.testCheckBtn = this.testSectionEl.querySelector(".main__submit-check");
        this.testSkipBtn = this.testSectionEl.querySelector(".main__submit-skip");
        this.testStatusEl = this.testSectionEl.querySelector(".main__status");

        this.statsResetBtn.addEventListener("click", this.handleStatsReset.bind(this));
        this.ticketRangeSubmitBtn.addEventListener("click", this.handleTicketRangeChange.bind(this));
        this.testCheckBtn.addEventListener("click", this.handleSubmitCheck.bind(this));
        this.testSkipBtn.addEventListener("click", this.handleSubmitSkip.bind(this));
    }
    initializeApp() {
        setInterval(this.handleEyesBreak.bind(this), 1000 * 600);

        if (localStorage.getItem("Kanich-history")) {
            try {
                const metaObj = JSON.parse(localStorage.getItem("Kanich-history"));
                for (let [quizName, metaData] of Object.entries(metaObj)) {
                    Object.assign(this.quizes[quizName], metaData);
                }
            } catch (e) {
                localStorage.removeItem("Kanich-history");
            }
        }
        if (localStorage.getItem("lastTicket")) {
            this.changeTicket(localStorage.getItem("lastTicket"));
            this.curTicketLeftBound = +localStorage.getItem("lastLeftBound") || 1;
            this.curTicketRightBound = +localStorage.getItem("lastRightBound") || this.curTicketCount;

            this.changeTest();

            this.renderRangeInputs();
            this.renderStats();
            this.renderTest();
        }

        this.renderTestsMenu();
    }
    resetStats(leftBound, rightBound) {
        this.curQuiz.reset(leftBound, rightBound);
    }
    changeTest() {
        this.curTest = this.curQuiz.getNotWasRandomTest(this.curTicketLeftBound, this.curTicketRightBound);
        if (!this.curTest) {
            return false;
        }
        this.curCorrect = this.curTest["variants"].find(variant => variant["isCorrect"])["text"];
        this.firstTry = null;
        return true;
    }
    clearTest() {
        this.curTest = {
            question: "",
            variants: [],
            id: null
        };

        this.curCorrect = "";
        this.firstTry = null;
        return true;
    }
    changeTicket(quizName) {
        const quiz = this.quizes[quizName];

        if (!quiz) return false;
        this.curQuiz = quiz;
        this.curTicketCount = Object.keys(quiz.tickets).length;
        this.curTicketLeftBound = 1;
        this.curTicketRightBound = this.curTicketCount;
        return true;
    }
    changeTicketRange(leftBound = 1, rightBound = this.curTicketCount) {
        if (typeof leftBound !== "number" || typeof rightBound !== "number") {
            return false;
        }
        if (leftBound > 0 && leftBound <= this.curTicketCount) {
            this.curTicketLeftBound = leftBound;
        }
        else if (leftBound < 1) {
            this.curTicketLeftBound = 1;
        }
        else if (leftBound > this.curTicketCount) {
            this.curTicketLeftBound = this.curTicketCount;
        }
        else {
            return false;
        }
        if (rightBound > 0 && rightBound <= this.curTicketCount && rightBound >= this.curTicketLeftBound) {
            this.curTicketRightBound = rightBound;
        }
        else if (rightBound < this.curTicketLeftBound) {
            this.curTicketRightBound = this.curTicketLeftBound;
        }
        else if (rightBound > this.curTicketCount) {
            this.curTicketRightBound = this.curTicketCount;
        }
        else {
            return false;
        }
        return true;
    }
    handleTicketChange(ev) {
        const quizName = ev.currentTarget.textContent;
        if (!this.changeTicket(quizName)) {
            this.handleStatus("Қанат где-то лоханулся");
            return false;
        }

        this.changeTest();

        this.renderStats();
        this.renderTest();
        this.refreshLocalStorage();
        return true;
    }
    handleTicketRangeChange(ev) {
        ev.preventDefault();
        let leftBound = +this.ticketRangeLeftInput.value;
        let rightBound = +this.ticketRangeRightInput.value;

        if (!this.handleTicketWasChosen()) return false;
        if (!this.changeTicketRange(leftBound, rightBound)) {
            this.handleSetupError("ticketRange", `Нұсқа аралығы қате берілген`, 4000);
            return false;
        }

        this.changeTest();

        this.renderRangeInputs();
        this.renderTest();
        this.renderStats(this.curTicketLeftBound, this.curTicketRightBound);
        this.refreshLocalStorage();

        this.hideStatus();
        this.handleSetupSuccess("Айстан болды");
        return true;
    }
    handleSetupError(type = "ticketRange", text = "", liveTime = 2000) { // type: [ticketRange]
        if (type === "ticketRange") {
            if (this.errorTimeoutId !== -1) {
                clearTimeout(this.errorTimeoutId);
            }
            const warningEl = this.createTextPopup(text);
            warningEl.classList.add("popup-warning")
            warningEl.classList.add("popup-warning-weak");

            this.removeAllTextPopups();
            this.ticketLabelEl.append(warningEl);

            this.errorTimeoutId = setTimeout(
                () => {
                    warningEl ? warningEl.remove() : null;
                },
                liveTime
            );
            return true;
        }
        return false;
    }
    handleSetupSuccess(text = "", liveTime = 1000) {
        if (this.successTimeoutId !== -1) {
            clearTimeout(this.successTimeoutId);
        }
        const popupEl = this.createTextPopup(text);
        popupEl.classList.add("popup-success");

        this.removeAllTextPopups();
        this.ticketLabelEl.append(popupEl);

        this.successTimeoutId = setTimeout(
            () => popupEl ? popupEl.remove() : null,
            liveTime
        );
        return true;
    }
    handleTicketWasChosen() {
        if (this.curQuiz === null) {
            this.handleStatus("Алдымен тестті таңдаңыз!");
            return false;
        }
        return true;
    }
    handleVariantWasChosen() {
        if (!this.findCheckedVariantEl()) {
            this.handleStatus("Кем дегенде бір жауап таңдаңыз!");
            return false;
        }
        return true;
    }
    handleStatus(text) {
        this.testStatusEl.textContent = text;
        this.testStatusEl.style.display = "block";
        return true;
    }
    handleStatsReset() {
        const confirmPopup = this.createConfirmPopup(
            `Таңдалған нұсқалар аралығы үшін [${this.curTicketLeftBound}-${this.curTicketRightBound}] дұрыс жауаптар өшіріледі!`,
            this.resetStats.bind(this, this.curTicketLeftBound, this.curTicketRightBound)
        );
        document.body.append(confirmPopup);

        return true;
    }
    handleSubmitCheck(ev) {
        ev.preventDefault();
        if (!this.handleTicketWasChosen()) return false;
        if (!this.handleVariantWasChosen()) return false;
        this.hideStatus();

        const checkedVariantEl = this.findCheckedVariantEl();

        const checkedVariantText = checkedVariantEl.querySelector(".main__variants-text").textContent;

        const isCorrect = checkedVariantText === this.curCorrect;
        if (isCorrect) {
            checkedVariantEl.classList.add("correct");
        }
        else {
            checkedVariantEl.classList.add("incorrect");
        }
        checkedVariantEl.classList.remove(
            "pseudo-variant-checked",
            "pseudo-variant-focus"
        );

        if (this.firstTry === null && isCorrect) {
            this.firstTry = isCorrect;
            this.curQuiz.miss(this.curTest["id"]);
            this.renderStats();
            this.refreshLocalStorage();
        }
        else if (this.firstTry === null) {
            this.firstTry = isCorrect;
        }
        return true;
    }
    handleSubmitSkip(ev) {
        if (!this.handleTicketWasChosen()) return false;
        ev.preventDefault();

        this.clearTest();

        this.changeTest();

        this.renderTest();

        this.hideStatus();
        return true;
    }
    handleEyesBreak() {
        this.handleSetupError("ticketRange", "Перерыв для глаз!", 10000);
        return true;
    }
    renderTestsMenu() {
        this.chooseListEl.innerHTML = "";
        for (let quizName of Object.keys(this.quizes)) {
            const chooseItemEl = this.createTicketChooseItem(quizName);

            chooseItemEl.addEventListener("click", this.handleTicketChange.bind(this), {});
            this.chooseListEl.append(chooseItemEl);
        }
    }
    renderRangeInputs() {
        this.ticketRangeLeftInput.value = this.curTicketLeftBound;
        this.ticketRangeRightInput.value = this.curTicketRightBound;
    }
    renderStats() {
        const metaData = this.curQuiz.getMeta(this.curTicketLeftBound, this.curTicketRightBound);
        this.statsResultEl.textContent = `${metaData["totalCorrectCount"]} / ${metaData["totalVariantCount"]}`;
    }
    renderTest() {
        this.testFormEl.innerHTML = "";
        this.renderRangeInputs();

        if (!this.curTest || !this.curTest["id"]) {
            this.handleSetupSuccess("Осы тесттін нұсқа аралығы үшін сұрақтар бітті!", 5000);
            this.clearTest();
        }

        this.renderQuestionEl();
        this.renderVariantsEl();
        this.hideStatus();
    }
    renderQuestionEl() {
        this.testQuestionEl.innerHTML = "";
        this.testQuestionEl.append(this.createQuestion(this.curTest["question"]));
    }
    renderVariantsEl() {
        let index = 0;
        shuffle(this.curTest["variants"]);
        for (let variant of this.curTest["variants"]) {
            let text = variant["text"];
            let orderLetter = String.fromCharCode('A'.charCodeAt(0) + index);

            const variantEl = this.createVariant(text, orderLetter);
            this.testFormEl.append(variantEl);
            index++;
        }
    }
    refreshLocalStorage() {
        localStorage.setItem("lastLeftBound", String(this.curTicketLeftBound));
        localStorage.setItem("lastRightBound", String(this.curTicketRightBound));
        localStorage.setItem("lastTicket", this.curQuiz["name"]);
        const metaObj = {};
        for (let [quizName, quiz] of Object.entries(this.quizes)) {
            metaObj[quizName] = {
                leftTestIds: quiz["leftTestIds"]
            };
        }
        localStorage.setItem("Kanich-history", JSON.stringify(metaObj));
    }
    findCheckedVariantEl() {
        for (let variantEl of this.testFormEl.children) {
            const inputEl = variantEl.querySelector(".main__variants__input");
            if (!inputEl) continue;

            if (inputEl.checked) {
                return variantEl;
            }
        }
        return null;
    }
    hideStatus() {
        this.testStatusEl.style.display = "none";
        this.testStatusEl.textContent = "";
        return true;
    }
    removeAllTextPopups() {
        const popupClasses = ["popup-warning", "popup-success"];
        for (let className of popupClasses) {
            const popupEl = this.testSectionEl.querySelector(`.${className}`);
            if (popupEl) {
                popupEl.remove();
            }
        }
    }
    removeBackground() {
        document.body.querySelectorAll(".background").forEach(el => el.remove());
    }
    createTextPopup(text) {
        const popupEl = document.createElement("div");
        const popupTextEl = document.createElement("p");
        const popupCloseBtn = document.createElement("button");

        popupEl.classList.add("popup");

        popupTextEl.classList.add("popup-text");

        popupTextEl.textContent = text;

        popupCloseBtn.classList.add("popup-btn");
        popupCloseBtn.textContent = "Бопты";

        popupCloseBtn.addEventListener("click", () => popupEl.remove());

        popupEl.append(popupTextEl, popupCloseBtn);
        return popupEl;
    }
    createConfirmPopup(text, callback) {
        const popupEl = document.createElement("div");
        const popupInnerBlock = document.createElement("div");
        const textEl = document.createElement("p");
        const buttonsBlock = document.createElement("div");
        const yesBtn = document.createElement("button");
        const noBtn = document.createElement("button");

        popupInnerBlock.classList.add("popup-confirm");

        textEl.textContent = text;
        textEl.classList.add("popup-confirm-text");

        buttonsBlock.classList.add("popup-confirm__buttons");

        yesBtn.textContent = "Аха";
        yesBtn.classList.add("yes-btn");
        yesBtn.addEventListener("click", () => {
            callback();

            this.removeBackground();
            popupEl.remove();

            this.refreshLocalStorage();
            this.renderStats();
            this.changeTest();
            this.renderTest();
        });

        noBtn.textContent = "Передумал";
        noBtn.classList.add("no-btn");
        noBtn.addEventListener("click", () => {
            this.removeBackground();
            popupEl.remove();
        });

        popupEl.classList.add("background");

        buttonsBlock.append(noBtn, yesBtn);
        popupInnerBlock.append(textEl, buttonsBlock);
        popupEl.append(popupInnerBlock);

        return popupEl;
    }
    createVariant(variantText = "", orderLetter = null) {
        const variantLabelEl = document.createElement("label");
        const inputEl = document.createElement("input");
        const orderLetterEl = document.createElement("span");
        const variantTextEl = document.createElement("span");

        variantLabelEl.classList.add(
            "main__variants__label",
            "pseudo-variant-checked",
            "pseudo-variant-focus"
        );

        inputEl.type = "radio";
        inputEl.name = "variant";
        inputEl.classList.add("main__variants__input");

        orderLetterEl.classList.add("main__variants-letter");
        orderLetterEl.textContent = orderLetter + ")";

        variantTextEl.classList.add("main__variants-text");
        variantTextEl.textContent = variantText;

        variantLabelEl.append(inputEl, orderLetterEl, variantTextEl);
        return variantLabelEl;
    }
    createQuestion(questionText) {
        const questionEl = document.createElement("p");

        questionEl.classList.add("main__question-text");

        questionEl.append(questionText);
        return questionEl;
    }
    createTicketChooseBtn(text) {
        const chooseBtn = document.createElement("button");

        chooseBtn.classList.add("header__choose-btn");
        chooseBtn.textContent = text;

        return chooseBtn;
    }
    createTicketChooseItem(text) {
        const itemEl = document.createElement("li");
        const chooseBtn = this.createTicketChooseBtn(text);

        itemEl.classList.add("header__choose__item");

        itemEl.append(chooseBtn);

        return itemEl;
    }
}