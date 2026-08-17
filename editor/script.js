const form = document.querySelector('#editor-form');
const pseudoInput = document.querySelector('#pseudo');
const filenameInput = document.querySelector('#filename');
const editor = document.querySelector('#json-editor');
const targetPath = document.querySelector('#target-path');
const statusMessage = document.querySelector('#status');
const formatButton = document.querySelector('#format-json');
const saveDraftButton = document.querySelector('#save-draft');

const sanitizeSegment = (value, fallback) => {
  const cleaned = value
    .trim()
    .toLowerCase()
    .replace(/\.json$/i, '')
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return cleaned || fallback;
};

const getFileInfo = () => {
  const pseudo = sanitizeSegment(pseudoInput.value, 'pseudo');
  const filename = sanitizeSegment(filenameInput.value, 'nomdujson');

  return {
    pseudo,
    filename: `${filename}.json`,
    path: `/projects/${pseudo}/${filename}.json`,
    draftKey: `json-editor:/projects/${pseudo}/${filename}.json`,
  };
};

const setStatus = (message, type = '') => {
  statusMessage.textContent = message;
  statusMessage.className = `status ${type}`.trim();
};

const updatePathPreview = () => {
  targetPath.textContent = getFileInfo().path;
};

const parseJson = () => JSON.parse(editor.value);

const loadDraft = () => {
  const { draftKey, path } = getFileInfo();
  const draft = localStorage.getItem(draftKey);

  if (draft) {
    editor.value = draft;
    setStatus(`Brouillon chargé pour ${path}.`, 'success');
  }
};

[pseudoInput, filenameInput].forEach((input) => {
  input.addEventListener('input', updatePathPreview);
  input.addEventListener('change', loadDraft);
});

editor.addEventListener('input', () => {
  try {
    parseJson();
    setStatus('JSON valide.', 'success');
  } catch (error) {
    setStatus(`JSON invalide : ${error.message}`, 'error');
  }
});

formatButton.addEventListener('click', () => {
  try {
    editor.value = JSON.stringify(parseJson(), null, 2);
    setStatus('JSON formaté.', 'success');
  } catch (error) {
    setStatus(`Impossible de formatter : ${error.message}`, 'error');
  }
});

saveDraftButton.addEventListener('click', () => {
  const { draftKey, path } = getFileInfo();
  localStorage.setItem(draftKey, editor.value);
  setStatus(`Brouillon sauvegardé localement pour ${path}.`, 'success');
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  try {
    const parsedJson = parseJson();
    const { path } = getFileInfo();

    setStatus(`Sauvegarde de ${path} en cours...`);

    const response = await fetch('/api/projects', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        pseudo: pseudoInput.value,
        filename: filenameInput.value,
        content: JSON.stringify(parsedJson),
      }),
    });
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'La sauvegarde a échoué.');
    }

    setStatus(`Sauvegardé sur le site : ${result.path}.`, 'success');
  } catch (error) {
    setStatus(`Sauvegarde bloquée : ${error.message}`, 'error');
  }
});

updatePathPreview();
