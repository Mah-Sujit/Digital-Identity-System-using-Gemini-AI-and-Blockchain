export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result); // data:image/...;base64,...
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}