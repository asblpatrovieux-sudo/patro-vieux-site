import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const ALLOWED_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/png",
  "image/jpeg",
]);
const IMAGE_TYPES = new Set(["image/png", "image/jpeg"]);
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;
const PRESIGN_SECONDS = 5 * 60;

function json(data, status = 200, origin = "") {
  const headers = new Headers({
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });
  if (origin) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Headers", "Authorization, Content-Type");
    headers.set("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
    headers.set("Vary", "Origin");
  }
  return new Response(JSON.stringify(data), { status, headers });
}

function normalizeOrigin(value = "") {
  return value.trim().replace(/\/$/, "");
}

function isAllowedOrigin(request, env) {
  const origin = normalizeOrigin(request.headers.get("Origin") || "");
  if (!origin) return true;

  const requestOrigin = normalizeOrigin(new URL(request.url).origin);
  const configuredOrigin = normalizeOrigin(env.ALLOWED_ORIGIN || "");
  const isLocalDevelopment = origin === "http://localhost:5173";

  return origin === requestOrigin || origin === configuredOrigin || isLocalDevelopment;
}

function getAllowedOrigin(request, env) {
  const origin = normalizeOrigin(request.headers.get("Origin") || "");
  if (origin && isAllowedOrigin(request, env)) return origin;
  return normalizeOrigin(new URL(request.url).origin);
}

function getBearer(request) {
  const authorization = request.headers.get("Authorization") || "";
  return authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
}

function decodeJwtPayload(token) {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

function cleanBaseUrl(value) {
  return value.replace(/\/$/, "");
}

async function dataApi(env, token, path, options = {}) {
  const headers = new Headers(options.headers || {});
  headers.set("Authorization", `Bearer ${token}`);
  headers.set("Accept", "application/json");
  if (options.body) headers.set("Content-Type", "application/json");
  return fetch(`${cleanBaseUrl(env.NEON_DATA_API_URL)}${path}`, {
    ...options,
    headers,
  });
}

async function requireProfile(request, env, { admin = false } = {}) {
  const token = getBearer(request);
  if (!token) throw new HttpError(401, "Authentification requise.");

  const payload = decodeJwtPayload(token);
  const userId = payload?.sub;
  if (!userId) throw new HttpError(401, "Jeton d’authentification invalide.");

  // La Data API valide réellement le JWT et RLS décide si la ligne est visible.
  const response = await dataApi(
    env,
    token,
    `/profiles?id=eq.${encodeURIComponent(userId)}&select=id,role,status&limit=1`,
  );
  if (!response.ok) throw new HttpError(401, "Session invalide ou expirée.");

  const rows = await response.json();
  const profile = rows?.[0];
  if (!profile || profile.id !== userId || profile.status !== "actif") {
    throw new HttpError(403, "Compte actif requis.");
  }
  if (admin && profile.role !== "administrateur") {
    throw new HttpError(403, "Droits administrateur requis.");
  }
  return { token, userId, profile };
}

function s3Client(env) {
  return new S3Client({
    region: env.AWS_REGION,
    endpoint: env.AWS_ENDPOINT_URL_S3,
    forcePathStyle: true,
    credentials: {
      accessKeyId: env.AWS_ACCESS_KEY_ID,
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    },
  });
}

function sanitizeFilename(filename) {
  const extension = filename.includes(".") ? `.${filename.split(".").pop().toLowerCase()}` : "";
  const stem = filename
    .slice(0, extension ? -extension.length : undefined)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120) || "document";
  return `${stem}${extension}`;
}

function assertUuid(value, label) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value || "")) {
    throw new HttpError(400, `${label} invalide.`);
  }
}

function assertFileMetadata({ original_name, mime_type, size_bytes }) {
  if (typeof original_name !== "string" || !original_name.trim() || original_name.length > 255 || /[/\\]|\.\./.test(original_name)) {
    throw new HttpError(400, "Nom de fichier invalide.");
  }
  if (!ALLOWED_TYPES.has(mime_type)) throw new HttpError(415, "Type de fichier non autorisé.");
  if (!Number.isSafeInteger(size_bytes) || size_bytes <= 0) throw new HttpError(400, "Taille de fichier invalide.");
  const maximum = IMAGE_TYPES.has(mime_type) ? MAX_IMAGE_BYTES : MAX_DOCUMENT_BYTES;
  if (size_bytes > maximum) throw new HttpError(413, "Fichier trop volumineux.");
}

async function requireVisibleAttachment(env, token, attachmentId) {
  assertUuid(attachmentId, "Identifiant de pièce jointe");
  const response = await dataApi(
    env,
    token,
    `/post_attachments?id=eq.${encodeURIComponent(attachmentId)}&select=id,post_id,storage_key,original_name,display_name,mime_type,size_bytes&limit=1`,
  );
  if (!response.ok) throw new HttpError(403, "Accès à la pièce jointe refusé.");
  const rows = await response.json();
  if (!rows?.[0]) throw new HttpError(404, "Pièce jointe introuvable.");
  return rows[0];
}

async function createUploadUrl(request, env) {
  const { token, userId } = await requireProfile(request, env, { admin: true });
  const body = await request.json();
  const postId = body.post_id;
  assertUuid(postId, "Publication");
  assertFileMetadata(body);

  const postResponse = await dataApi(env, token, `/posts?id=eq.${encodeURIComponent(postId)}&select=id&limit=1`);
  if (!postResponse.ok || !(await postResponse.json())?.[0]) {
    throw new HttpError(404, "Publication introuvable.");
  }

  const safeName = sanitizeFilename(body.original_name);
  const storageKey = `posts/${postId}/${crypto.randomUUID()}-${safeName}`;
  const command = new PutObjectCommand({
    Bucket: env.NEON_STORAGE_BUCKET,
    Key: storageKey,
    ContentType: body.mime_type,
    ContentLength: body.size_bytes,
    Metadata: { "uploaded-by": userId, "post-id": postId },
  });
  const uploadUrl = await getSignedUrl(s3Client(env), command, { expiresIn: PRESIGN_SECONDS });

  return {
    upload_url: uploadUrl,
    method: "PUT",
    headers: { "Content-Type": body.mime_type },
    storage_key: storageKey,
    expires_in: PRESIGN_SECONDS,
  };
}

function wait(milliseconds) {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}

async function headObjectWithRetry(env, storageKey) {
  const delays = [0, 250, 500, 1000];
  let lastError;
  for (const delay of delays) {
    if (delay) await wait(delay);
    try {
      return await s3Client(env).send(new HeadObjectCommand({
        Bucket: env.NEON_STORAGE_BUCKET,
        Key: storageKey,
      }));
    } catch (error) {
      lastError = error;
    }
  }
  console.error("HeadObject failed after retries", {
    name: lastError?.name,
    message: lastError?.message,
    status: lastError?.$metadata?.httpStatusCode,
  });
  throw lastError;
}

async function completeUpload(request, env) {
  const { token, userId } = await requireProfile(request, env, { admin: true });
  const body = await request.json();
  const postId = body.post_id;
  assertUuid(postId, "Publication");
  assertFileMetadata(body);
  if (typeof body.storage_key !== "string" || !body.storage_key.startsWith(`posts/${postId}/`) || body.storage_key.includes("..")) {
    throw new HttpError(400, "Clé de stockage invalide.");
  }

  let object;
  try {
    object = await headObjectWithRetry(env, body.storage_key);
  } catch {
    throw new HttpError(409, "Le fichier envoyé n’a pas été trouvé dans le stockage après plusieurs vérifications.");
  }
  if (Number(object.ContentLength) !== body.size_bytes || object.ContentType !== body.mime_type) {
    throw new HttpError(409, "Le fichier reçu ne correspond pas aux métadonnées annoncées.");
  }

  const insertResponse = await dataApi(env, token, "/post_attachments", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      post_id: postId,
      storage_key: body.storage_key,
      original_name: body.original_name,
      display_name: body.display_name?.trim() || null,
      mime_type: body.mime_type,
      size_bytes: body.size_bytes,
      display_order: Number.isInteger(body.display_order) && body.display_order >= 0 ? body.display_order : 0,
      uploaded_by: userId,
    }),
  });
  if (!insertResponse.ok) {
    await s3Client(env).send(new DeleteObjectCommand({ Bucket: env.NEON_STORAGE_BUCKET, Key: body.storage_key })).catch(() => {});
    const details = await insertResponse.text();
    throw new HttpError(400, "Métadonnées refusées par la base de données.", details);
  }
  return { attachment: (await insertResponse.json())?.[0] };
}

async function completeReplacement(request, env) {
  const { token } = await requireProfile(request, env, { admin: true });
  const body = await request.json();
  assertUuid(body.attachment_id, "Pièce jointe");
  assertUuid(body.post_id, "Publication");
  assertFileMetadata(body);
  if (typeof body.storage_key !== "string" || !body.storage_key.startsWith(`posts/${body.post_id}/`) || body.storage_key.includes("..")) {
    throw new HttpError(400, "Clé de stockage invalide.");
  }

  const previous = await requireVisibleAttachment(env, token, body.attachment_id);
  if (previous.post_id !== body.post_id) throw new HttpError(400, "Publication incohérente.");

  let object;
  try {
    object = await headObjectWithRetry(env, body.storage_key);
  } catch {
    throw new HttpError(409, "Le nouveau fichier n’a pas été trouvé dans le stockage après plusieurs vérifications.");
  }
  if (Number(object.ContentLength) !== body.size_bytes || object.ContentType !== body.mime_type) {
    throw new HttpError(409, "Le nouveau fichier ne correspond pas aux métadonnées annoncées.");
  }

  const updateResponse = await dataApi(env, token, `/post_attachments?id=eq.${encodeURIComponent(body.attachment_id)}`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      storage_key: body.storage_key,
      original_name: body.original_name,
      display_name: body.display_name?.trim() || null,
      mime_type: body.mime_type,
      size_bytes: body.size_bytes,
      updated_at: new Date().toISOString(),
    }),
  });
  if (!updateResponse.ok) {
    await s3Client(env).send(new DeleteObjectCommand({ Bucket: env.NEON_STORAGE_BUCKET, Key: body.storage_key })).catch(() => {});
    throw new HttpError(400, "Le remplacement a été refusé par la base de données.");
  }

  try {
    await s3Client(env).send(new DeleteObjectCommand({ Bucket: env.NEON_STORAGE_BUCKET, Key: previous.storage_key }));
  } catch {
    console.error("Old attachment cleanup failed", previous.storage_key);
  }
  return { attachment: (await updateResponse.json())?.[0] };
}

async function createDownloadUrl(request, env) {
  const { token } = await requireProfile(request, env);
  const { attachment_id: attachmentId } = await request.json();
  const attachment = await requireVisibleAttachment(env, token, attachmentId);
  const filename = attachment.display_name || attachment.original_name;
  const command = new GetObjectCommand({
    Bucket: env.NEON_STORAGE_BUCKET,
    Key: attachment.storage_key,
    ResponseContentType: attachment.mime_type,
    ResponseContentDisposition: `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
  });
  return {
    download_url: await getSignedUrl(s3Client(env), command, { expiresIn: PRESIGN_SECONDS }),
    expires_in: PRESIGN_SECONDS,
  };
}

async function deleteAttachment(request, env) {
  const { token } = await requireProfile(request, env, { admin: true });
  const attachmentId = new URL(request.url).searchParams.get("id");
  const attachment = await requireVisibleAttachment(env, token, attachmentId);

  const deleteDb = await dataApi(env, token, `/post_attachments?id=eq.${encodeURIComponent(attachmentId)}`, {
    method: "DELETE",
    headers: { Prefer: "return=representation" },
  });
  if (!deleteDb.ok) throw new HttpError(400, "Suppression des métadonnées refusée.");

  try {
    await s3Client(env).send(new DeleteObjectCommand({ Bucket: env.NEON_STORAGE_BUCKET, Key: attachment.storage_key }));
  } catch {
    throw new HttpError(500, "Métadonnées supprimées, mais nettoyage du fichier à relancer.");
  }
  return { deleted: true };
}

class HttpError extends Error {
  constructor(status, message, details = "") {
    super(message);
    this.status = status;
    this.details = details;
  }
}

async function handleApi(request, env) {
  const origin = getAllowedOrigin(request, env);
  if (!isAllowedOrigin(request, env)) return json({ error: "Origine non autorisée." }, 403);
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  }});

  const path = new URL(request.url).pathname;
  try {
    let result;
    if (path === "/api/attachments/health" && request.method === "GET") result = { ok: true };
    else if (path === "/api/attachments/upload-url" && request.method === "POST") result = await createUploadUrl(request, env);
    else if (path === "/api/attachments/complete" && request.method === "POST") result = await completeUpload(request, env);
    else if (path === "/api/attachments/replace-complete" && request.method === "POST") result = await completeReplacement(request, env);
    else if (path === "/api/attachments/download-url" && request.method === "POST") result = await createDownloadUrl(request, env);
    else if (path === "/api/attachments" && request.method === "DELETE") result = await deleteAttachment(request, env);
    else return json({ error: "Route API introuvable." }, 404, origin);
    return json(result, 200, origin);
  } catch (error) {
    if (error instanceof HttpError) return json({ error: error.message, details: error.details || undefined }, error.status, origin);
    console.error("Attachment API error", error);
    return json({ error: "Erreur interne du service de fichiers." }, 500, origin);
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) return handleApi(request, env);
    return env.ASSETS.fetch(request);
  },
};
