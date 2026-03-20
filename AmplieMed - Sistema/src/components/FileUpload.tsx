/**
 * AmplieMed — FileUpload Component
 * ─────────────────────────────────────────────────────────────────────────────
 * Componente de upload de arquivos integrado ao Supabase Storage.
 *
 * Arquitetura:
 *   - Pré-visualização local via URL.createObjectURL (NUNCA base64)
 *   - Upload real para o Supabase Storage via storageService.uploadToStorage
 *   - Retorna StoredFileAttachment com storagePath — NUNCA base64
 *   - Suporte a drag & drop e seleção por clique
 *   - Validação de MIME e tamanho antes do upload
 *   - Indicador de progresso durante o upload
 *   - Exibição de arquivos já persistidos via URL dinâmica
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Upload, X, FileText, Image, File, CheckCircle, AlertTriangle, Eye, Loader2, Paperclip,
} from 'lucide-react';
import type { BucketType, StoredFileAttachment, LocalUploadFile } from '../utils/storageService';
import {
  uploadToStorage,
  validateFile,
  createLocalUploadFile,
  revokeLocalPreviewUrl,
  formatFileSize,
  resolveStorageUrl,
  BUCKET_CONFIG,
} from '../utils/storageService';

// ─── Re-export types so consumers can import from this file ──────────────────
export type { StoredFileAttachment, LocalUploadFile };

// ─── MIME → accept string mapping ────────────────────────────────────────────

const ACCEPT_BY_BUCKET: Record<BucketType, string> = {
  avatars:   'image/jpeg,image/png,image/webp,image/gif',
  media:     'image/jpeg,image/png,image/webp,image/gif,image/svg+xml',
  documents: 'application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/jpeg,image/png',
  chat:      'image/jpeg,image/png,image/webp,application/pdf,text/plain',
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface FileUploadProps {
  /** Target bucket — determines allowed types, size limits and URL strategy */
  bucketType: BucketType;
  /** Sub-folder inside the bucket, e.g. "patients/uuid" */
  folder: string;
  /** Called when a new file finishes uploading successfully */
  onUploadComplete?: (file: StoredFileAttachment) => void;
  /** Called when user requests removal of an already-persisted file */
  onRemove?: (id: string) => void;
  /** Already-persisted files to display */
  existingFiles?: StoredFileAttachment[];
  /** Label for the drop zone */
  label?: string;
  /** Description shown inside the drop zone */
  description?: string;
  /** Allow multiple file selection */
  multiple?: boolean;
  /** Override the accept attribute (defaults to bucket allowlist) */
  accept?: string;
  disabled?: boolean;
  /** Compact mode: shows a small button instead of the full drop zone */
  compact?: boolean;
  /** ID of the entity these files belong to */
  entityType?: StoredFileAttachment['entityType'];
  entityId?: string;
  /** Name of the uploader (stored in uploadedBy) */
  uploadedBy?: string;
}

// ─── Local upload state ───────────────────────────────────────────────────────

interface UploadingFile extends LocalUploadFile {
  progress: number;  // 0–100
  done: boolean;
  error?: string;
}

// ─── File icon helper ─────────────────────────────────────────────────────────

function FileIcon({ mimeType, className = 'w-4 h-4' }: { mimeType: string; className?: string }) {
  if (mimeType.startsWith('image/')) return <Image className={`${className} text-blue-600`} />;
  if (mimeType === 'application/pdf') return <FileText className={`${className} text-red-600`} />;
  return <File className={`${className} text-gray-600`} />;
}

// ─── StoredFile row (with dynamic URL resolution) ────────────────────────────

function StoredFileRow({
  file,
  onRemove,
}: {
  file: StoredFileAttachment;
  onRemove?: (id: string) => void;
}) {
  const [displayUrl, setDisplayUrl] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    resolveStorageUrl(file.storagePath, file.bucketType ?? 'documents')
      .then((url) => { if (!cancelled) setDisplayUrl(url); })
      .catch((err) => console.error('[FileUpload] URL resolution error:', err));
    return () => { cancelled = true; };
  }, [file.storagePath, file.bucketType]);

  const canPreview = file.type.startsWith('image/') || file.type === 'application/pdf';

  return (
    <>
      <div className="flex items-center gap-3 p-3 bg-white border border-gray-200 hover:border-gray-300 transition-colors">
        <div className="w-8 h-8 bg-gray-100 flex items-center justify-center flex-shrink-0">
          <FileIcon mimeType={file.type} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-800 truncate">{file.name}</p>
          <p className="text-xs text-gray-500">
            {formatFileSize(file.size)} · {new Date(file.uploadedAt).toLocaleDateString('pt-BR')}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <CheckCircle className="w-4 h-4 text-green-600" />
          {canPreview && displayUrl && (
            <button
              onClick={() => setPreviewOpen(true)}
              className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
              title="Visualizar"
            >
              <Eye className="w-4 h-4" />
            </button>
          )}
          {onRemove && (
            <button
              onClick={() => onRemove(file.id)}
              className="p-1 text-gray-400 hover:text-red-600 transition-colors"
              title="Remover"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Preview modal */}
      {previewOpen && displayUrl && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          onClick={() => setPreviewOpen(false)}
        >
          <div
            className="bg-white max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <span className="text-sm font-medium text-gray-900">{file.name}</span>
              <button onClick={() => setPreviewOpen(false)}>
                <X className="w-5 h-5 text-gray-500 hover:text-gray-700" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-gray-100">
              {file.type.startsWith('image/') ? (
                <img src={displayUrl} alt={file.name} className="max-w-full max-h-full object-contain" />
              ) : file.type === 'application/pdf' ? (
                <iframe src={displayUrl} className="w-full h-[60vh]" title={file.name} />
              ) : (
                <p className="text-gray-500 text-sm">Pré-visualização não disponível</p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function FileUpload({
  bucketType,
  folder,
  onUploadComplete,
  onRemove,
  existingFiles = [],
  label = 'Enviar arquivo',
  description,
  multiple = false,
  accept,
  disabled = false,
  compact = false,
  entityType = 'patient',
  entityId = '',
  uploadedBy = '',
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [errors, setErrors] = useState<string[]>([]);

  const cfg = BUCKET_CONFIG[bucketType];
  const acceptAttr = accept ?? ACCEPT_BY_BUCKET[bucketType];

  // Cleanup object URLs when component unmounts
  useEffect(() => {
    return () => {
      uploadingFiles.forEach((f) => revokeLocalPreviewUrl(f.previewUrl));
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const processFiles = useCallback(
    async (fileList: FileList | null) => {
      if (!fileList?.length || disabled) return;
      setErrors([]);

      const newErrors: string[] = [];
      const toUpload: File[] = [];

      for (const file of Array.from(fileList)) {
        const err = validateFile(file, bucketType);
        if (err) {
          newErrors.push(`${file.name}: ${err.message}`);
        } else {
          toUpload.push(file);
        }
      }

      if (newErrors.length > 0) setErrors(newErrors);
      if (!toUpload.length) return;

      // Create local upload entries with preview URLs
      const localFiles: UploadingFile[] = toUpload.map((file) => ({
        ...createLocalUploadFile(file),
        progress: 0,
        done: false,
      }));

      setUploadingFiles((prev) => [...prev, ...localFiles]);

      // Upload each file
      for (const localFile of localFiles) {
        try {
          const result = await uploadToStorage(
            localFile.file,
            bucketType,
            folder,
            (pct) => {
              setUploadingFiles((prev) =>
                prev.map((f) =>
                  f.localId === localFile.localId ? { ...f, progress: pct } : f,
                ),
              );
            },
          );

          const stored: StoredFileAttachment = {
            id: crypto.randomUUID(),
            entityType,
            entityId,
            name: localFile.name,
            type: localFile.type,
            size: localFile.size,
            storagePath: result.storagePath,
            bucketType: result.bucketType,
            uploadedBy,
            uploadedAt: new Date().toISOString(),
          };

          // Mark as done in local state
          setUploadingFiles((prev) =>
            prev.map((f) =>
              f.localId === localFile.localId ? { ...f, progress: 100, done: true } : f,
            ),
          );

          // Revoke preview URL after a delay (give time for UI update)
          setTimeout(() => {
            revokeLocalPreviewUrl(localFile.previewUrl);
            setUploadingFiles((prev) => prev.filter((f) => f.localId !== localFile.localId));
          }, 1500);

          onUploadComplete?.(stored);
        } catch (err: any) {
          const msg = err?.message || 'Erro desconhecido no upload';
          console.error('[FileUpload] Upload error:', err);
          setUploadingFiles((prev) =>
            prev.map((f) =>
              f.localId === localFile.localId ? { ...f, error: msg } : f,
            ),
          );
          setErrors((prev) => [...prev, `${localFile.name}: ${msg}`]);
        }
      }
    },
    [bucketType, disabled, entityId, entityType, folder, onUploadComplete, uploadedBy],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      processFiles(e.dataTransfer.files);
    },
    [processFiles],
  );

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setDragging(true);
  };

  const onDragLeave = () => setDragging(false);
  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    processFiles(e.target.files);
    // Reset input so same file can be re-selected
    e.target.value = '';
  };

  // ─── Compact mode ───────────────────────────────────────────────────────────

  if (compact) {
    return (
      <div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => !disabled && inputRef.current?.click()}
            disabled={disabled || uploadingFiles.some((f) => !f.done && !f.error)}
            className="flex items-center gap-2 px-3 py-1.5 text-xs border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            {uploadingFiles.some((f) => !f.done && !f.error) ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Paperclip className="w-3.5 h-3.5" />
            )}
            {uploadingFiles.some((f) => !f.done && !f.error) ? 'Enviando...' : label}
          </button>

          {/* In-flight files */}
          {uploadingFiles.map((f) => (
            <div
              key={f.localId}
              className={`flex items-center gap-1 px-2 py-1 border text-xs ${
                f.error
                  ? 'bg-red-50 border-red-200 text-red-700'
                  : f.done
                  ? 'bg-green-50 border-green-200 text-green-700'
                  : 'bg-blue-50 border-blue-200 text-blue-700'
              }`}
            >
              {f.done ? (
                <CheckCircle className="w-3 h-3" />
              ) : f.error ? (
                <AlertTriangle className="w-3 h-3" />
              ) : (
                <Loader2 className="w-3 h-3 animate-spin" />
              )}
              <span className="max-w-[100px] truncate">{f.name}</span>
            </div>
          ))}

          {/* Persisted files */}
          {existingFiles.map((f) => (
            <div
              key={f.id}
              className="flex items-center gap-1 px-2 py-1 bg-blue-50 border border-blue-200 text-xs"
            >
              <FileIcon mimeType={f.type} className="w-3 h-3" />
              <span className="text-blue-700 max-w-[120px] truncate">{f.name}</span>
              {onRemove && (
                <button onClick={() => onRemove(f.id)} className="text-blue-400 hover:text-red-500">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={acceptAttr}
          multiple={multiple}
          className="hidden"
          onChange={onChange}
        />
        {errors.map((e, i) => (
          <p key={i} className="text-xs text-red-600 mt-1">{e}</p>
        ))}
      </div>
    );
  }

  // ─── Full drop zone mode ────────────────────────────────────────────────────

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onClick={() => !disabled && inputRef.current?.click()}
        className={[
          'border-2 border-dashed p-6 text-center cursor-pointer transition-all',
          dragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50',
          disabled ? 'opacity-50 cursor-not-allowed' : '',
        ].join(' ')}
      >
        <div className="flex flex-col items-center gap-2">
          <div className={`w-12 h-12 flex items-center justify-center ${dragging ? 'bg-blue-100' : 'bg-gray-100'}`}>
            <Upload className={`w-6 h-6 ${dragging ? 'text-blue-600' : 'text-gray-400'}`} />
          </div>
          <div>
            <p className="text-sm text-gray-700 font-medium">
              {uploadingFiles.some((f) => !f.done && !f.error) ? 'Enviando...' : label}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              {description || `Arraste aqui ou clique para selecionar · Máx. ${cfg.maxMB}MB`}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {cfg.isPublic ? 'Arquivo público' : 'Arquivo privado (acesso seguro)'}
            </p>
          </div>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={acceptAttr}
          multiple={multiple}
          className="hidden"
          onChange={onChange}
          disabled={disabled}
        />
      </div>

      {/* Errors */}
      {errors.length > 0 && (
        <div className="space-y-1">
          {errors.map((e, i) => (
            <div key={i} className="flex items-center gap-2 text-xs text-red-700 bg-red-50 border border-red-200 px-3 py-2">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
              {e}
            </div>
          ))}
        </div>
      )}

      {/* In-flight uploads */}
      {uploadingFiles.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">
            Enviando ({uploadingFiles.filter((f) => !f.done && !f.error).length})
          </p>
          {uploadingFiles.map((f) => (
            <div
              key={f.localId}
              className="flex items-center gap-3 p-3 bg-white border border-gray-200"
            >
              {/* Local preview */}
              {f.type.startsWith('image/') ? (
                <img
                  src={f.previewUrl}
                  alt={f.name}
                  className="w-8 h-8 object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-8 h-8 bg-gray-100 flex items-center justify-center flex-shrink-0">
                  <FileIcon mimeType={f.type} />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-800 truncate">{f.name}</p>
                {f.error ? (
                  <p className="text-xs text-red-600">{f.error}</p>
                ) : f.done ? (
                  <p className="text-xs text-green-600">Enviado com sucesso</p>
                ) : (
                  <div className="mt-1">
                    <div className="w-full bg-gray-200 h-1">
                      <div
                        className="bg-blue-600 h-1 transition-all duration-300"
                        style={{ width: `${f.progress}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{f.progress}%</p>
                  </div>
                )}
              </div>
              <div className="flex-shrink-0">
                {f.done ? (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                ) : f.error ? (
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                ) : (
                  <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Persisted files */}
      {existingFiles.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">
            Arquivos ({existingFiles.length})
          </p>
          {existingFiles.map((f) => (
            <StoredFileRow key={f.id} file={f} onRemove={onRemove} />
          ))}
        </div>
      )}
    </div>
  );
}
