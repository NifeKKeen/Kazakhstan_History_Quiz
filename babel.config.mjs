const isDev = (process.env.NODE_ENV ?? "development") === "development";
const presets = [
    [
        "@babel/preset-env",
        {
            targets: {
                edge: "17",
                firefox: "60",
                chrome: "67",
                safari: "11.1",
            },
            useBuiltIns: "usage",
            corejs: "3.6.4",
        },
    ],
];
if (isDev) {
    presets.push([ // when running in devServer it breaks everything
        "minify",
        {
            keepFnName: false
        }
    ]);
}

export default { presets };