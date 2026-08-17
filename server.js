const http = require('node:http');
const { readFile, mkdir, writeFile } = require('node:fs/promises');
const path = require('node:path');

const PORT = Number.parseInt(process.env.PORT || '3000', 10);
const ROOT_DIR = __dirname;
const EDITOR_DIR = path.join(ROOT_DIR, 'editor');
const PROJECTS_DIR = path.join(ROOT_DIR, 'projects');
const MAX_BODY_SIZE = 1024 * 1024;

const MIME_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

const sanitizeSegment = (value, fallback) => {
  const cleaned = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\.json$/i, '')
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return cleaned || fallback;
};

const send = (response, statusCode, body, contentType = 'application/json; charset=utf-8') => {
  response.writeHead(statusCode, { 'Content-Type': contentType });
  response.end(body);
};

const sendJson = (response, statusCode, payload) => {
  send(response, statusCode, JSON.stringify(payload), 'application/json; charset=utf-8');
};

const readRequestBody = (request) =>
  new Promise((resolve, reject) => {
    let body = '';

    request.on('data', (chunk) => {
      body += chunk;

      if (body.length > MAX_BODY_SIZE) {
        reject(new Error('Le JSON est trop volumineux.'));
        request.destroy();
      }
    });

    request.on('end', () => resolve(body));
    request.on('error', reject);
  });

const handleSaveProject = async (request, response) => {
  const rawBody = await readRequestBody(request);
  const payload = JSON.parse(rawBody || '{}');
  const pseudo = sanitizeSegment(payload.pseudo, 'pseudo');
  const filename = `${sanitizeSegment(payload.filename, 'nomdujson')}.json`;
  const parsedJson = JSON.parse(String(payload.content || ''));
  const projectDirectory = path.join(PROJECTS_DIR, pseudo);
  const outputPath = path.join(projectDirectory, filename);
  const publicPath = `/projects/${pseudo}/${filename}`;

  await mkdir(projectDirectory, { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(parsedJson, null, 2)}\n`, 'utf8');

  sendJson(response, 201, {
    message: 'Fichier JSON sauvegardé sur le site.',
    path: publicPath,
  });
};

const serveFileFromDirectory = async (request, response, baseUrl, baseDirectory, defaultFile = '') => {
  const requestUrl = new URL(request.url, `http://${request.headers.host}`);
  const pathname = requestUrl.pathname;
  const requestedPath = pathname.replace(new RegExp(`^${baseUrl}/?`), '');
  const relativePath = !requestedPath && defaultFile ? defaultFile : requestedPath;
  const filePath = path.join(baseDirectory, relativePath);

  if (!filePath.startsWith(baseDirectory)) {
    send(response, 403, 'Accès interdit.', 'text/plain; charset=utf-8');
    return;
  }

  const extension = path.extname(filePath);
  const content = await readFile(filePath);
  send(response, 200, content, MIME_TYPES[extension] || 'application/octet-stream');
};

const serveEditorFile = async (request, response) => {
  const requestUrl = new URL(request.url, `http://${request.headers.host}`);
  const pathname = requestUrl.pathname === '/' ? '/editor/' : requestUrl.pathname;
  request.url = pathname;
  await serveFileFromDirectory(request, response, '/editor', EDITOR_DIR, 'index.html');
};

const server = http.createServer(async (request, response) => {
  try {
    if (request.method === 'POST' && request.url === '/api/projects') {
      await handleSaveProject(request, response);
      return;
    }

    if ((request.method === 'GET' || request.method === 'HEAD') && (request.url === '/' || request.url.startsWith('/editor'))) {
      await serveEditorFile(request, response);
      return;
    }

    if ((request.method === 'GET' || request.method === 'HEAD') && request.url.startsWith('/projects')) {
      await serveFileFromDirectory(request, response, '/projects', PROJECTS_DIR);
      return;
    }

    sendJson(response, 404, { message: 'Page introuvable.' });
  } catch (error) {
    const statusCode = error instanceof SyntaxError ? 400 : 500;
    sendJson(response, statusCode, { message: error.message });
  }
});

server.listen(PORT, () => {
  console.log(`Éditeur JSON disponible sur http://localhost:${PORT}/editor/`);
});
