import { Quiz } from "./quizApi.mjs";
import { App } from "./app.mjs";
import { texts } from "./texts.mjs";
import "./styles.sass";

const quizes = {};
texts.forEach(textObj => {
    quizes[textObj["name"]] = (new Quiz(
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
const app = new App(document, quizes);
app.initializeApp();

document.body.style.display = "block";