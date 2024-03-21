import {defineConfig} from 'vite'
import dts from 'vite-plugin-dts'

export default defineConfig({
    build:{
        outDir:"./out"
    },
    plugins: [
        dts({
            tsconfigPath: 'tsconfig.json',
        }),
    ],
})
