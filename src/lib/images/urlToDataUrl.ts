export async function urlToDataUrl(url: string | null | undefined): Promise<string | null> {
  if (!url) return null;
  if (url.startsWith('data:')) return url;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`asset_http_${response.status}`);
  }

  const blob = await response.blob();

  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error || new Error('asset_data_url_read_failed'));
    reader.readAsDataURL(blob);
  });
}
