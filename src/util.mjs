export function randNum(l, r) {
    return r - Math.floor(Math.random() * (r - l) + 1);
}
export function shuffle(arr) {
    for (let i = 1; i < arr.length; ++i) {
        let rIndex = randNum(0, i);
        [arr[i], arr[rIndex]] = [arr[rIndex], arr[i]];
    }
}