import path from 'path';
import HtmlWebpackPlugin from "html-webpack-plugin";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const devMode = process.env.NODE_ENV ?? "development",
      isDev = devMode === "development";

export default {
    entry: './src/index.mjs',
    output: {
        filename: '[name].[contenthash].js',
        path: path.resolve(__dirname, 'dist'),
        clean: true
    },
    mode: devMode,

    module: {
        rules: [
            // {
            //     test: /\.html$/i,
            //     loader: "html-loader",
            //     options: {
            //         // sources: false,
            //     },
            // },
            {
                test: /\.(?:js|mjs|cjs)$/,
                exclude: /node_modules/,
                use: {
                    loader: "babel-loader",
                    options: {
                        presets: [
                            ['@babel/preset-env'],
                        ],
                        plugins: [
                            ['@babel/plugin-transform-runtime']
                        ]
                    },
                },
            },
            // {
            //     test: /\.tsx?/,
            //     use: ["ts-loader"],
            //     exclude: /node_modules/,
            // },
            {
                test: /\.css$/i,
                use: ['style-loader', 'css-loader'],
            },
            {
                test: /\.s[ac]ss$/i,
                use: [
                    "style-loader",
                    "css-loader",
                    "sass-loader",
                ]
            },
            // {
            //     test: /\.(png|jpe?g|gif|ico)$/i,
            //     loader: 'file-loader',
            // },
        ]
    },
    resolve: {
        extensions: [".ts", ".tsx", ".mjs", ".cjs", ".js", ".jsx"],
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: "./src/index.html",
            filename: "index.html",
            inject: "body",
            minify: true,
        }),
    ],
    devServer: isDev ? {
        port: 8000,
        open: true,
    } : undefined,
};