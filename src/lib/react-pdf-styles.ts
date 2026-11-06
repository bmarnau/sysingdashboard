// react-pdf-Stylesheets als unveränderte Kopie aus public/ laden, nicht per CSS-Import.
// Grund: Der Import lief durch die Tailwind-Verarbeitung und brach in der Lovable-Vorschau
// mit "reading 'devSourcemap'" ab. Kopien bei react-pdf-Updates erneuern
// (Abgleich: src/__tests__/components/PdfCanvasViewer.styles.test.ts).
export const REACT_PDF_STYLESHEETS = [
  "/vendor/react-pdf/AnnotationLayer.css",
  "/vendor/react-pdf/TextLayer.css",
] as const;

export function ensureReactPdfStylesheets(doc: Document = document): void {
  for (const href of REACT_PDF_STYLESHEETS) {
    if (doc.head.querySelector(`link[data-react-pdf-css="${href}"]`)) continue;
    const link = doc.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    link.dataset.reactPdfCss = href;
    doc.head.appendChild(link);
  }
}
