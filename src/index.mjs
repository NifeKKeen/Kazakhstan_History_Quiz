import { Quiz } from "./quizApi.mjs";
import { App } from "./app.mjs";
import { texts } from "./texts.mjs";
import "./styles.sass";

document.querySelector("link[rel=icon]").href = "data:image/png;base64,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";

const quizzes = {};
texts.forEach(textObj => {
    quizzes[textObj["name"]] = (new Quiz(
        textObj["content"],
        textObj["name"],
        {
            ticketKeyword: "%_V%",
            correctKeyword: "%_C%",
            lineBreak: "\n"
        })
    );
    texts["content"] = "";
});
const app = new App(document.body, quizzes);
app.initializeApp();

document.body.style.display = "block";