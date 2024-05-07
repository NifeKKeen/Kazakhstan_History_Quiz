import { shuffle } from "./util.mjs";
export class App {
    /*
    render re-renders DOM according to app's properties, they do not receive any argument
    render functions do not affect internal properties

    change functions affects only to internal app properties

    create functions return app-independent DOM elements



    handlers will return true if they are finished, false otherwise
     */
    APP_VERSION = "1.2.0";
    curTheme = "white";

    curQuiz = null;
    curTicketCount = 0;
    curTicketLeftBound = 0;
    curTicketRightBound = 0;

    curCorrect = ""; // correct variant text
    curTicketId = "";
    firstTry = null; // result of first try of guessing

    errorTimeoutId = -1;
    successTimeoutId = -1;
    constructor(rootEl, quizes) {
        this.rootEl = rootEl;
        this.testSectionEl = rootEl.querySelector(".main__section__test");
        this.quizes = quizes;

        this.chooseListEl = rootEl.querySelector(".header__choose__list");
        this.themeSwitchInputEl = rootEl.querySelector(".header__theme-switch input[name=theme-switch]");

        this.statsResultEl = rootEl.querySelector(".main__stats-result");
        this.statsAccuracyEl = rootEl.querySelector(".main__stats-accuracy");
        this.statsResetBtn = rootEl.querySelector(".main__reset-btn");

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

        this.themeSwitchInputEl.addEventListener("change", this.handleThemeChange.bind(this));
        this.statsResetBtn.addEventListener("click", this.handleStatsReset.bind(this));
        this.ticketRangeSubmitBtn.addEventListener("click", this.handleTicketRangeChange.bind(this));
        this.testCheckBtn.addEventListener("click", this.handleSubmitCheck.bind(this));
        this.testSkipBtn.addEventListener("click", this.handleSubmitSkip.bind(this));
        this.rootEl.addEventListener("keydown", ev => {
            if (ev.key.toLowerCase() === " ") {
                this.handleSubmitSkip();
                const variantEl = this.testFormEl.querySelector(".main__variants__label");
                if (!variantEl) return;
                variantEl.focus();
            }
        });
    }
    initializeApp() {
        setInterval(this.handleEyesBreak.bind(this), 1000 * 600);

        if (!localStorage.getItem("Kanich-version") ||
            /^1\.[0-1]\./.test(localStorage.getItem("Kanich-version"))) {
            localStorage.removeItem("history");
            localStorage.removeItem("Kanich-history");
        }
        localStorage.setItem("Kanich-version", this.APP_VERSION);

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
        if (localStorage.getItem("Kanich-theme")) {
            this.curTheme = localStorage.getItem("Kanich-theme");
            if (this.curTheme === "theme-black") {
                this.themeSwitchInputEl.checked = "true";
            }
            this.switchTheme(this.curTheme);
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
        this.curTicketId = this.curQuiz.testIdToTicketId(this.curTest.id);
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
        if (!this.curQuiz) return;

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

        if (this.firstTry === null && isCorrect) { // counting as correct guess
            this.firstTry = isCorrect;
            this.curQuiz.miss(this.curTest["id"]);
            this.curQuiz.makeGuess(this.curTicketId, true);
        }
        else if (this.firstTry === null && !isCorrect) { // counting as incorrect guess
            this.firstTry = isCorrect;
            this.curQuiz.makeGuess(this.curTicketId, false);
        }
        this.renderStats();
        this.refreshLocalStorage();

        return true;
    }
    handleSubmitSkip() {
        if (!this.handleTicketWasChosen()) return false;

        this.clearTest();

        this.changeTest();

        this.renderTest();

        this.hideStatus();
        return true;
    }
    handleThemeChange(ev) {
        let newTheme;
        if (!ev.target.checked) {
            newTheme = "theme-white";
            this.curTheme = newTheme;
            this.switchTheme(newTheme);
        } else {
            newTheme = "theme-black";
            this.curTheme = newTheme;
            this.switchTheme(newTheme);
        }
        this.refreshLocalStorage();
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
        let correctCount = metaData.totalCorrectCount;
        let totalCount = metaData.totalTestCount;
        let answeredCount = metaData.answeredCount;
        let correctAnsweredCount = metaData.correctAnsweredCount;

        let correctAnsweredRelation;
        if (answeredCount !== 0) {
            correctAnsweredRelation = Math.round(correctAnsweredCount / answeredCount * 1e4) / 1e2;
        } else {
            correctAnsweredRelation = 0;
        }
        this.statsResultEl.textContent = `${correctCount} / ${totalCount}`;
        this.statsAccuracyEl.textContent = `${correctAnsweredRelation}%`
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
        if (this.curTicketLeftBound)
            localStorage.setItem("lastLeftBound", String(this.curTicketLeftBound));
        if (this.curTicketRightBound)
            localStorage.setItem("lastRightBound", String(this.curTicketRightBound));
        if (this.curQuiz && this.curQuiz.name)
            localStorage.setItem("lastTicket", this.curQuiz.name);
        const metaObj = {};
        if (this.quizes) {
            for (let [quizName, quiz] of Object.entries(this.quizes)) {
                metaObj[quizName] = {
                    leftTestIds: quiz.leftTestIds,
                    answered: quiz.answered,
                    correctAnswered: quiz.correctAnswered
                };
            }
        }
        if (this.curTheme)
            localStorage.setItem("Kanich-theme", this.curTheme);
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

        inputEl.addEventListener("focus", ev => {
            ev.target.checked = true;
        });
        variantLabelEl.addEventListener("keydown", ev => {
            if (ev.key.toLowerCase() === "enter") {
                this.handleSubmitCheck(ev);
            }
        });

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
    switchTheme(classNameTemplate) {
        const postFixMain = "-main";
        const postFixSub = "-sub";
        const postFixInput = "-input";
        [
            this.rootEl, this.ticketLabelEl
        ].forEach(element => {
            if (!element) return;
            element.classList.forEach(elClassName => elClassName.startsWith("theme") ? element.classList.remove(elClassName) : null);
            element.classList.add(classNameTemplate + postFixMain);
        });
        [
            this.rootEl.querySelector("header"), this.rootEl.querySelector("footer")
        ].forEach(element => {
            if (!element) return;
            element.classList.forEach(elClassName => elClassName.startsWith("theme") ? element.classList.remove(elClassName) : null);
            element.classList.add(classNameTemplate + postFixSub);
        });
        [
            this.ticketRangeEl
        ].forEach(element => {
            if (!element) return;
            element.classList.forEach(elClassName => elClassName.startsWith("theme") ? element.classList.remove(elClassName) : null);
            element.classList.add(classNameTemplate + postFixInput);
        });
    }
}