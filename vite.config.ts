import { defineConfig } from 'vite';

export default defineConfig({
    build: {
        lib: {
            entry: './src/main.ts',
            name: 'C1XWorkflow',
            fileName: (format: string) => `builder.${format}.js`
        }
    }
});