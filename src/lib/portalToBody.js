/**
 * Move node to `document.body` so it escapes ancestor stacking (e.g. basemap menu vs postcard).
 * @param {HTMLElement} node
 */
export function portalToBody(node) {
  document.body.appendChild(node);
  return {
    destroy() {
      if (node.parentNode) {
        node.parentNode.removeChild(node);
      }
    }
  };
}
