const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

// Configuration conditionnelle selon l'environnement
const isDevelopment = process.env.NODE_ENV !== 'production';
const publicPath = isDevelopment ? '/dist/' : './';

module.exports = {
    mode: isDevelopment ? 'development' : 'production',
    entry: {
        index: './src/index.tsx',
        widget: './src/widget.tsx'
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            },
            {
                test: /\.css$/i,
                use: ['style-loader', 'css-loader'],
            },
            // Ajout pour les assets (images, fonts)
            {
                test: /\.(png|svg|jpg|jpeg|gif)$/i,
                type: 'asset/resource',
            },
            {
                test: /\.(png|svg|jpg|jpeg|gif)$/i,
                type: 'public/images',
            },

        ],
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.js'],
        alias: {
            // Alias pour faciliter les imports
            '@': path.resolve(__dirname, 'src'),
        }
    },
    output: {
        filename: '[name].js',
        path: path.resolve(__dirname, 'dist'),
        publicPath: publicPath,
        clean: true,
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: './src/public/dashboard-pdf-page.html',
            filename: 'dashboard-pdf-page.html',
            chunks: ['index']
        }),
        new HtmlWebpackPlugin({
            template: './src/public/dashboard-pdf-widget.html',
            filename: 'dashboard-pdf-widget.html',
            chunks: ['widget']
        }),
        new CopyWebpackPlugin({
            patterns: [
                { 
                    from: './src/public/images', 
                    to: 'images',
                    noErrorOnMissing: true // Évite les erreurs si le dossier n'existe pas
                }
            ]
        })
    ],
    devServer: {
        static: {
            directory: path.join(__dirname, 'dist'),
            publicPath: '/dist/'
        },
        compress: true,
        port: 3000,
        hot: true,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
            'Access-Control-Allow-Headers': 'X-Requested-With, content-type, Authorization'
        },
        allowedHosts: 'all',
        // Gestion des erreurs et overlay
        client: {
            overlay: {
                errors: true,
                warnings: false,
            },
        },
    },
    devtool: isDevelopment ? 'inline-source-map' : 'source-map',
    
    // Optimisations pour la production
    optimization: {
        splitChunks: {
            chunks: 'all',
        },
    },
};