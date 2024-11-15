import { shuffle } from "./util.mjs";
export class App {
    /*
    set functions change object's state

    render re-renders DOM according to app's properties, they do not receive any argument
    render functions do not affect internal properties

    change functions affects only to internal app properties

    create functions return app-independent DOM elements



    handlers will return true if they are finished, false otherwise
     */
    APP_VERSION = "1.3.0";
    curTheme = "white";

    curQuiz = null;
    curTicketCount = 0;
    curTicketLeftBound = 0;
    curTicketRightBound = 0;
    curLang = "kz";

    curCorrectElOrder = null;
    curTicketId = "";
    firstTry = null;  // result of first try of guessing

    lastFocusedEl = null;

    errorTimeoutId = -1;
    successTimeoutId = -1;
    constructor(rootEl, quizzes) {
        this.rootEl = rootEl;
        this.testSectionEl = rootEl.querySelector(".main__section__test");
        this.quizzes = quizzes;

        this.chooseListEl = rootEl.querySelector(".header__choose__list");
        this.themeSwitchInputEl = rootEl.querySelector(".header__theme-switch input[name=theme-switch]");

        this.statsResultEl = rootEl.querySelector(".main__stats-result");
        this.statsAccuracyEl = rootEl.querySelector(".main__stats-accuracy");
        this.statsResetBtn = rootEl.querySelector(".main__reset-btn");

        this.ticketLabelEl = rootEl.querySelector(".main__ticket__label");
        this.ticketRangeEl = rootEl.querySelector(".main__ticket-range");
        this.ticketRangeLeftInput = rootEl.querySelector(".main__ticket-range-input-left");
        this.ticketRangeRightInput = rootEl.querySelector(".main__ticket-range-input-right");
        this.ticketRangeSubmitBtn = rootEl.querySelector(".main__submit-range");

        this.testQuestionEl = this.testSectionEl.querySelector(".main__question");
        this.testFormEl = this.testSectionEl.querySelector(".main__form");

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
        this.rootEl.addEventListener("focusin", ev => {
            if (!ev.target || ev.target.getAttribute("data-ignore-last-focus")) {
                return;
            }
            this.saveAsLastFocusEl(ev.target);
        });
    }
    initializeApp() {
        setInterval(this.handleEyesBreak.bind(this), 1000 * 60 * 10);

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
                    Object.assign(this.quizzes[quizName], metaData);
                }
            } catch (e) {
                localStorage.removeItem("Kanich-history");
            }
        }
        if (localStorage.getItem("lastTicket")) {
            this.setChangeTicket(localStorage.getItem("lastTicket"));
            this.curTicketLeftBound = +localStorage.getItem("lastLeftBound") || 1;
            this.curTicketRightBound = +localStorage.getItem("lastRightBound") || this.curTicketCount;

            this.handleTestChange();

            this.renderRangeInputs();
            this.renderStats();
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
    setResetStats(leftBound, rightBound) {
        this.curQuiz.reset(leftBound, rightBound);
    }
    setChangeTest() {
        this.curTest = this.curQuiz.getNotWasRandomTest(this.curTicketLeftBound, this.curTicketRightBound);
        if (!this.curTest) {
            return false;
        }

        this.curTicketId = this.curQuiz.testIdToTicketId(this.curTest.id);

        return true;
    }
    setCorrectEl() {  // depends on content of testFormEl
        let correctText = this.curTest["variants"].find(variant => variant["isCorrect"])["text"];
        for (let labelEl of this.testFormEl.querySelectorAll(".main__variants__label")) {
            let variantTextSpanEl = labelEl.querySelector(".main__variants-text");
            if (variantTextSpanEl.textContent === correctText) {
                this.curCorrectElOrder = labelEl.dataset.order;
                break;
            }
        }
    }
    setClearTest() {
        this.curTest = {
            question: "",
            variants: [],
            id: null
        };

        this.curCorrectElOrder = null;
        this.firstTry = null;
        return true;
    }
    setChangeTicket(quizName) {
        const quiz = this.quizzes[quizName];

        if (!quiz) return false;
        this.curQuiz = quiz;
        this.curTicketCount = Object.keys(quiz.tickets).length;
        this.curTicketLeftBound = 1;
        this.curTicketRightBound = this.curTicketCount;
        this.curLang = this.curQuiz.lang ?? "kz";
        return true;
    }
    setChangeTicketRange(leftBound = 1, rightBound = this.curTicketCount) {
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
        const quizName = ev.currentTarget.dataset.quizName;
        if (!this.setChangeTicket(quizName)) {
            this.handleStatus("Қанат где-то лоханулся");
            return false;
        }

        this.handleTestChange();

        this.renderStats();
        this.refreshLocalStorage();
        return true;
    }
    handleTestChange() {
        this.setClearTest();
        this.setChangeTest();
        this.renderTest();
        this.setCorrectEl();
        return true;
    }
    handleTicketRangeChange(ev) {
        ev.preventDefault();
        let leftBound = +this.ticketRangeLeftInput.value;
        let rightBound = +this.ticketRangeRightInput.value;

        if (!this.handleTicketWasChosen()) return false;
        if (!this.setChangeTicketRange(leftBound, rightBound)) {
            this.handleSetupError("warn", `Нұсқа аралығы қате берілген`, 4000);
            return false;
        }

        this.handleTestChange();

        this.renderRangeInputs();
        this.renderStats(this.curTicketLeftBound, this.curTicketRightBound);
        this.refreshLocalStorage();

        this.hideStatus();
        this.handleSetupSuccess("Айстан болды");
        return true;
    }
    handleSetupError(type = "warn", text = "", liveTime = 2000) {  // type: [warn]
        if (type === "warn") {
            if (this.errorTimeoutId !== -1) {
                clearTimeout(this.errorTimeoutId);
            }
            const warningEl = this.createTextPopup(text);
            warningEl.classList.add("popup-warning")
            warningEl.classList.add("popup-warning-weak");

            this.removeAllTextPopups();
            this.ticketLabelEl.append(warningEl);
            warningEl.querySelector("button").focus();

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
            this.setResetStats.bind(this, this.curTicketLeftBound, this.curTicketRightBound)
        );
        document.body.append(confirmPopup);
        confirmPopup.querySelector("button").focus();

        return true;
    }
    handleSubmitCheck(ev) {
        ev.preventDefault();
        if (!this.handleTicketWasChosen()) return false;
        if (!this.handleVariantWasChosen()) return false;
        this.hideStatus();

        const checkedVariantEl = this.findCheckedVariantEl();

        const isCorrect = (checkedVariantEl.dataset.order === this.curCorrectElOrder);
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

        if (this.firstTry === null && isCorrect) {  // counting as correct guess
            this.firstTry = isCorrect;
            this.curQuiz.miss(this.curTest["id"]);
            this.curQuiz.makeGuess(this.curTicketId, true);
        }
        else if (this.firstTry === null && !isCorrect) {  // counting as incorrect guess
            this.firstTry = isCorrect;
            this.curQuiz.makeGuess(this.curTicketId, false);
        }
        this.renderStats();
        this.refreshLocalStorage();

        return true;
    }
    handleSubmitSkip() {
        if (!this.handleTicketWasChosen()) return false;

        this.handleTestChange();

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
        this.handleSetupError("warn", "Перерыв для глаз!", 20000);
        return true;
    }
    renderTestsMenu() {
        this.chooseListEl.innerHTML = "";
        for (let quizName of Object.keys(this.quizzes)) {
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
        this.testQuestionEl.lang = this.curLang;
        this.testFormEl.lang = this.curLang;
        this.renderRangeInputs();

        if (!this.curTest || !this.curTest["id"]) {
            this.handleSetupSuccess("Осы тесттін нұсқа аралығы үшін сұрақтар бітті!", 5000);
            this.setClearTest();
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
        this.curTest["variants"].forEach((variant, i) => {
            let text = variant["text"];
            let orderLetter = String.fromCharCode('A'.charCodeAt(0) + index);

            const variantEl = this.createVariant(text, orderLetter);
            variantEl.dataset.order = String(i);
            this.testFormEl.append(variantEl);
            index++;
        });
    }
    refreshLocalStorage() {
        if (this.curTicketLeftBound)
            localStorage.setItem("lastLeftBound", String(this.curTicketLeftBound));
        if (this.curTicketRightBound)
            localStorage.setItem("lastRightBound", String(this.curTicketRightBound));
        if (this.curQuiz && this.curQuiz.name)
            localStorage.setItem("lastTicket", this.curQuiz.name);
        const metaObj = {};
        if (this.quizzes) {
            for (let [quizName, quiz] of Object.entries(this.quizzes)) {
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
    saveAsLastFocusEl(el) {
        this.lastFocusedEl = el;
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
        popupCloseBtn.setAttribute("data-ignore-last-focus", "true");

        popupCloseBtn.addEventListener("click", ev => {
            ev.preventDefault();
            popupEl.remove()
            if (this.lastFocusedEl) {
                this.lastFocusedEl.focus();
            }
        });

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
        yesBtn.addEventListener("click", ev => {
            ev.preventDefault();
            callback();

            this.removeBackground();
            popupEl.remove();

            this.refreshLocalStorage();
            this.renderStats();
            this.handleTestChange();
            this.lastFocusedEl.focus();
        });
        yesBtn.setAttribute("data-ignore-last-focus", "true");

        noBtn.textContent = "Передумал";
        noBtn.classList.add("no-btn");
        noBtn.addEventListener("click", ev => {
            ev.preventDefault();
            this.removeBackground();
            popupEl.remove();
            this.lastFocusedEl.focus();
        });
        noBtn.setAttribute("data-ignore-last-focus", "true");

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

        inputEl.addEventListener("focusin", ev => {
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
    createTicketChooseItem(text, quizName = text) {
        const itemEl = document.createElement("li");
        const chooseBtn = this.createTicketChooseBtn(text);

        itemEl.classList.add("header__choose__item");
        itemEl.dataset.quizName = quizName;

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