import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const getEnv = (key: string) => process.env[key] || env[key] || '';

  const MAX_BODY_BYTES = 64 * 1024; // 64KB limit for API dev middleware

  const apiDevMiddleware = () => ({
    name: 'api-dev-middleware',
    configureServer(server: any) {
      server.middlewares.use(async (req: any, res: any, next: any) => {
        const isDeleteRoute = req.url?.startsWith('/api/users/delete');
        const isRecoverRoute = req.url?.startsWith('/api/auth/recover');
        if (isDeleteRoute || isRecoverRoute) {
          try {
            let rawBody = '';
            let bodyBytes = 0;
            let aborted = false;
            req.on('data', (chunk: any) => {
              if (aborted) return;
              bodyBytes += Buffer.isBuffer(chunk) ? chunk.length : Buffer.byteLength(String(chunk));
              if (bodyBytes > MAX_BODY_BYTES) {
                aborted = true;
                res.statusCode = 413;
                res.setHeader('Content-Type', 'application/json; charset=utf-8');
                res.end(JSON.stringify({ error: 'حجم الطلب يتجاوز الحد المسموح به (64KB).' }));
                return;
              }
              rawBody += chunk;
            });
            req.on('end', async () => {
              if (aborted) return;
              try {
                req.body = rawBody ? JSON.parse(rawBody) : {};
              } catch {
                req.body = {};
              }
              try {
                const mod = isRecoverRoute
                  ? await import('./api/auth/recover')
                  : await import('./api/users/delete');
                await mod.default(req, res);
              } catch (handlerErr: any) {
                console.error('[API Dev Middleware] Handler error:', handlerErr);
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json; charset=utf-8');
                res.end(JSON.stringify({ error: 'حدث خطأ داخلي أثناء معالجة الطلب.' }));
              }
            });
          } catch (err: any) {
            console.error('[API Dev Middleware] Request error:', err);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify({ error: 'حدث خطأ داخلي في الخادم.' }));
          }
          return;
        }
        next();
      });
    },
  });

  return {
    base: './',
    plugins: [react(), tailwindcss(), apiDevMiddleware()],
    resolve: { alias: { '@': path.resolve(__dirname, '.') } },
    envPrefix: ['VITE_'],
    define: {
      'import.meta.env.VITE_FIREBASE_API_KEY': JSON.stringify(getEnv('VITE_FIREBASE_API_KEY') || getEnv('FIREBASE_API_KEY')),
      'import.meta.env.VITE_FIREBASE_AUTH_DOMAIN': JSON.stringify(getEnv('VITE_FIREBASE_AUTH_DOMAIN') || getEnv('FIREBASE_AUTH_DOMAIN')),
      'import.meta.env.VITE_FIREBASE_PROJECT_ID': JSON.stringify(getEnv('VITE_FIREBASE_PROJECT_ID') || getEnv('FIREBASE_PROJECT_ID')),
      'import.meta.env.VITE_FIREBASE_STORAGE_BUCKET': JSON.stringify(getEnv('VITE_FIREBASE_STORAGE_BUCKET') || getEnv('FIREBASE_STORAGE_BUCKET')),
      'import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID': JSON.stringify(getEnv('VITE_FIREBASE_MESSAGING_SENDER_ID') || getEnv('FIREBASE_MESSAGING_SENDER_ID')),
      'import.meta.env.VITE_FIREBASE_APP_ID': JSON.stringify(getEnv('VITE_FIREBASE_APP_ID') || getEnv('FIREBASE_APP_ID')),
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    build: {
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('firebase')) return 'vendor-firebase';
              if (id.includes('jspdf') || id.includes('html2canvas') || id.includes('qrcode')) return 'vendor-pdf';
              if (id.includes('react') || id.includes('lucide-react') || id.includes('motion')) return 'vendor-react';
            }
          },
        },
      },
    },
  };
});
