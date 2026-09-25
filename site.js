fetch('./site-manifest.json')
  .then(response => response.ok ? response.json() : null)
  .then(manifest => {
    if (!manifest) return;
    const date = new Date(manifest.generated_at);
    const readable = Number.isNaN(date.valueOf()) ? '' : date.toLocaleDateString(undefined, {year:'numeric', month:'short', day:'numeric'});
    document.getElementById('build-note').textContent = `${manifest.explorers.length} interactive studies${readable ? ` · updated ${readable}` : ''}`;
  })
  .catch(() => {});
