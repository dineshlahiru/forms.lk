import { defineConfig, Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import fs from 'fs'
import path from 'path'

// Plugin to save uploaded PDFs to /public/forms/
function saveFormsPlugin(): Plugin {
  return {
    name: 'save-forms-plugin',
    configureServer(server) {
      server.middlewares.use('/api/save-pdf', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end('Method not allowed');
          return;
        }

        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
          try {
            const { formId, language, pdfBase64 } = JSON.parse(body);

            // Create /public/forms/ directory if it doesn't exist
            const formsDir = path.resolve(__dirname, 'public/forms');
            if (!fs.existsSync(formsDir)) {
              fs.mkdirSync(formsDir, { recursive: true });
            }

            // Save PDF file
            const filename = `${formId}_${language}.pdf`;
            const filepath = path.join(formsDir, filename);

            // Remove data URL prefix if present
            const base64Data = pdfBase64.replace(/^data:application\/pdf;base64,/, '');
            fs.writeFileSync(filepath, Buffer.from(base64Data, 'base64'));

            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, path: `/forms/${filename}` }));
          } catch (error) {
            console.error('Error saving PDF:', error);
            res.statusCode = 500;
            res.end(JSON.stringify({ error: 'Failed to save PDF' }));
          }
        });
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), saveFormsPlugin()],
})
