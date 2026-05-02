import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
    base: './',
    root: 'src',
    publicDir: '../public',
    plugins: [react()],
    build: {
        outDir: '../dist',
        emptyOutDir: true,
        sourcemap: false,
        rollupOptions: {
            input: {
                popup: resolve(__dirname, 'src/popup.html'),
                panel: resolve(__dirname, 'src/panel.html'),
                studio: resolve(__dirname, 'src/studio.html'),
                transcript: resolve(__dirname, 'src/transcript.html'),
                background: resolve(__dirname, 'src/background.ts'),
                content: resolve(__dirname, 'src/content.ts'),
                promptBlueprint: resolve(__dirname, 'src/promptBlueprint.ts'),
            },
            output: {
                entryFileNames: '[name].js',
                chunkFileNames: 'chunks/[name]-[hash].js',
                assetFileNames: '[name].[ext]'
            }
        }
    }
});
