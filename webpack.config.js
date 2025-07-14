const path = require("path");
const fs = require("fs");
const CopyWebpackPlugin = require("copy-webpack-plugin");

// Webpack entry points. Mapping from resulting bundle name to the source file entry.
const entries = {};

// Loop through subfolders in the "src" folder and add an entry for each one
const srcDir = path.join(__dirname, "src");
fs.readdirSync(srcDir).filter(dir => {
    if (fs.statSync(path.join(srcDir, dir)).isDirectory() && dir !== 'img' && dir !== 'ScreenShot') {
        entries[dir] = "./" + path.relative(process.cwd(), path.join(srcDir, dir, dir));
    }
});

// Add styles.css as a separate entry point
entries['styles'] = './src/styles/styles.css';

module.exports = (env, argv) => ({
    entry: entries,
    output: {
        //path: path.resolve(__dirname, 'dist'), // Ensures output points to the correct directory
        publicPath: "/dist/", // Ensures files are served correctly
        filename: "[name]/[name].js"
    },
    resolve: {
        extensions: [".ts", ".tsx", ".js"],
        alias: {
            "azure-devops-extension-sdk": path.resolve("node_modules/azure-devops-extension-sdk")
        },
    },
    stats: {
        warnings: false
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                loader: "ts-loader"
            },
            {
                test: /\.scss$/,
                use: ["style-loader", "css-loader", "sass-loader"],
            },
            {
                test: /\.css$/,
                use: ["style-loader", "css-loader"],
            },
            {
                test: /\.(woff|woff2|eot|ttf|otf)$/,
                type: 'asset/inline'
            },
            {
                test: /\.html$/,
                type: 'asset/resource'
            }
        ]
    },
    plugins: [
        new CopyWebpackPlugin({
            patterns: [
                { from: "**/*.html", context: "src" },
                { from: "img/**/*", context: "src" } , 
                // { from: "ScreenShot/**/*", context: "src" }
            ]
        })
    ],
    ...(env.WEBPACK_SERVE
        ? {
            devtool: 'inline-source-map',
            devServer: {
                server: 'https',
                port: 3000,
                // static: [
                //     {
                //         directory: path.resolve(__dirname, 'dist/img'),
                //         publicPath: '/dist/img'
                //     }
                // ],
                // headers: {
                //     "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-eval'; connect-src 'self' https://dev.azure.com/agile-coaching-solutions; img-src 'self' data: https:; style-src 'self' 'unsafe-inline';",
                // },
                // setupMiddlewares: (middlewares, devServer) => {
                //     if (!devServer) return middlewares;

                //     // Middleware to ensure correct MIME type for .png files
                //     devServer.app.use((req, res, next) => {
                //         if (req.url.endsWith('.png')) {
                //             res.setHeader('Content-Type', 'image/png');
                //         }
                //         next();
                //     });

                //     return middlewares;
                // }
            }
        }
        : {})
});