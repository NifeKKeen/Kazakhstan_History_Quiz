import { Quiz } from "./quizApi.mjs";
import { texts } from "./texts.mjs";
import {notStrictEqual, strictEqual, } from "assert";

const tests = [
    () => {
        const quizes = [];
        texts.forEach(textObj => {
            quizes.push(new Quiz(textObj["content"], textObj["name"], {lineBreak: "\n"}));
            texts["content"] = "";
        });

        quizes.forEach(quiz => {
            for (let [, ticket] of Object.entries(quiz.tickets)) {
                for (let [, test] of Object.entries(ticket)) {
                    notStrictEqual(test["variants"].filter(variant => variant["isCorrect"]).length, 0 , "Required at lease one correct variant");
                    strictEqual(test["variants"].filter(variant => variant["isCorrect"]).length, 1, "Multiple correct variants");
                }
            }
        });
    }, () => {

        let testTxt =
            `12. Question
            One more
            Question
    A) 1 %_C% . 1
    B) 2
    C) 3 C)
    D) 1da
    asd`;

        let quiz = new Quiz(testTxt, "name");

        let tickets = quiz.tickets;
        let ticket = tickets[1];
        let test = ticket[1];

        strictEqual(Object.keys(tickets).length, 1);
        strictEqual(Object.keys(ticket).length, 1);
        strictEqual(test["question"], "Question One more Question", "Question is wrong");
        strictEqual(test["variants"].length, 4, "Length of variants is wrong");
        notStrictEqual(test["variants"].filter(variant => variant["isCorrect"]).length, 0 , "Required at lease one correct variant");
        strictEqual(test["variants"].filter(variant => variant["isCorrect"]).length, 1, "Multiple correct variants");
    }];

tests.forEach(test => test());
console.log("Testing finished")