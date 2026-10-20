// Builds public/samples/sample.docx (a tiny real Word file) for reviewers to test import.
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const JSZip = createRequire(require.resolve('mammoth'))('jszip');
const p = (text, { bold = false, style } = {}) =>
  `<w:p>${style ? `<w:pPr><w:pStyle w:val="${style}"/></w:pPr>` : ''}<w:r>${bold ? '<w:rPr><w:b/></w:rPr>' : ''}<w:t xml:space="preserve">${text}</w:t></w:r></w:p>`;
const body = [
  p('Quarterly planning notes', { style: 'Heading1' }),
  p('A sample Word document for testing import in Ajaia Docs.'),
  p('Goals', { style: 'Heading2' }),
  p('Ship sharing with view and edit roles.', { bold: true }),
  p('Keep every original version recoverable.'),
  p('Open questions', { style: 'Heading2' }),
  p('Do we need comments before suggestion mode?'),
].join('');
const zip = new JSZip();
zip.file('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
zip.file('_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
zip.file('word/document.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}</w:body></w:document>`);
writeFileSync('public/samples/sample.docx', await zip.generateAsync({ type: 'uint8array' }));
console.log('wrote public/samples/sample.docx');
