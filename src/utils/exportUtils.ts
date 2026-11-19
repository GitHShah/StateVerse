function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportElementAsSVG(containerElement: HTMLElement | null, filename = 'StateVerse-automaton.svg') {
  if (!containerElement) return;
  const svg = containerElement.querySelector('svg');
  if (!svg) {
    alert('No SVG canvas found to export.');
    return;
  }
  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(svg);
  downloadFile(svgString, filename, 'image/svg+xml;charset=utf-8');
}
