export function hideLoading() {
  const ov = document.getElementById('ldOv');
  if (ov) {
    ov.style.opacity = '0';
    setTimeout(() => {
      ov.style.display = 'none';
    }, 400);
  }
}
