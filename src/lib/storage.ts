import { supabaseAdmin } from '@/lib/supabase/client';

export async function uploadFile(
  bucket: string,
  path: string,
  file: Buffer | Blob,
  contentType: string
) {
  const { data, error } = await supabaseAdmin.storage
    .from(bucket)
    .upload(path, file, {
      contentType,
      upsert: true,
    });

  if (error) throw error;

  const { data: urlData } = supabaseAdmin.storage
    .from(bucket)
    .getPublicUrl(path);

  return {
    path: data?.path,
    url: urlData?.publicUrl,
  };
}

export async function deleteFile(bucket: string, path: string) {
  const { error } = await supabaseAdmin.storage
    .from(bucket)
    .remove([path]);

  if (error) throw error;
}

export function getPublicUrl(bucket: string, path: string): string {
  const { data } = supabaseAdmin.storage
    .from(bucket)
    .getPublicUrl(path);
  return data.publicUrl;
}

export async function listFiles(
  bucket: string,
  prefix: string
) {
  const { data, error } = await supabaseAdmin.storage
    .from(bucket)
    .list(prefix);

  if (error) throw error;
  return data;
}

export async function downloadFile(bucket: string, path: string) {
  const { data, error } = await supabaseAdmin.storage
    .from(bucket)
    .download(path);

  if (error) throw error;
  return data;
}

export async function createZipArchive(
  bucket: string,
  files: Array<{ path: string; name: string }>,
  outputPath: string
) {
  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();

  for (const file of files) {
    const blob = await downloadFile(bucket, file.path);
    zip.file(file.name, blob);
  }

  const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });

  return uploadFile(
    bucket,
    outputPath,
    zipBuffer,
    'application/zip'
  );
}
