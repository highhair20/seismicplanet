import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Serve pipeline-exported JSON from web/public/data/ at /data/YYYY.json
  publicDir: 'public',
})
