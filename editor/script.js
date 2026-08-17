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

const downloadFile = ({ filename, content }) => {
  const blob = new Blob([content], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

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

form.addEventListener('submit', (event) => {
  event.preventDefault();

  try {
    const formattedJson = JSON.stringify(parseJson(), null, 2);
    const { filename, path } = getFileInfo();
    downloadFile({ filename, content: `${formattedJson}\n` });
    setStatus(`Téléchargement prêt. Place le fichier dans ${path}.`, 'success');
  } catch (error) {
    setStatus(`Téléchargement bloqué : ${error.message}`, 'error');
  }
});

updatePathPreview();
