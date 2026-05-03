import React, { useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { X, ImagePlus, AtSign, FileVideo } from 'lucide-react';
import { addPost, addNotification } from '../services/api';
import { buildMentionEntities, filterMentionEntities, resolveMentionNotificationTargets, MentionEntity } from '../lib/mentions';
import { classifyUploadMedia, createVideoPoster, getUploadMimeType, normalizeUploadFile, validateVideoForUpload } from '../services/uploads';
import { ImageWithSkeleton } from './ImageWithSkeleton';
import { useFeedback } from './Feedback';
import { Badge, Button, IconButton, ModalSurface } from './ui';

interface CreatePostModalProps {
  onClose: () => void;
}

export function CreatePostModal({ onClose }: CreatePostModalProps) {
  const { user, publicProfiles, allPets } = useApp();
  const { toast } = useFeedback();

  const [postContent, setPostContent] = useState('');
  const [postFile, setPostFile] = useState<File | null>(null);
  const [postTags, setPostTags] = useState<string[]>([]);
  const [showTagSelector, setShowTagSelector] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [isValidatingMedia, setIsValidatingMedia] = useState(false);
  const [isPreparingPoster, setIsPreparingPoster] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [postVideoPosterUrl, setPostVideoPosterUrl] = useState<string | null>(null);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionStart, setMentionStart] = useState<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const postFileKind = postFile ? classifyUploadMedia(postFile) : 'unknown';
  const mentionEntities = React.useMemo(() => buildMentionEntities(publicProfiles, allPets, user?.uid), [publicProfiles, allPets, user?.uid]);
  const mentionSuggestions = React.useMemo(
    () => mentionQuery === null ? [] : filterMentionEntities(mentionEntities, mentionQuery, postTags),
    [mentionEntities, mentionQuery, postTags],
  );
  const postFilePreviewUrl = React.useMemo(
    () => postFile ? URL.createObjectURL(normalizeUploadFile(postFile, postFileKind)) : null,
    [postFile, postFileKind],
  );

  React.useEffect(() => () => {
    if (postFilePreviewUrl) URL.revokeObjectURL(postFilePreviewUrl);
  }, [postFilePreviewUrl]);

  React.useEffect(() => () => {
    if (postVideoPosterUrl) URL.revokeObjectURL(postVideoPosterUrl);
  }, [postVideoPosterUrl]);

  const handleMediaSelected = async (file: File | undefined) => {
    if (!file) return;
    setIsValidatingMedia(true);
    setMediaError(null);
    setPostVideoPosterUrl(null);
    try {
      const mediaKind = classifyUploadMedia(file);
      if (mediaKind === 'video') {
        const validationError = await validateVideoForUpload(file);
        if (validationError) {
          setMediaError(`${validationError} Arquivo selecionado: ${file.name || 'sem nome'} (${getUploadMimeType(file, mediaKind)}).`);
          toast(validationError, 'error');
          return;
        }
      } else if (mediaKind === 'image' && file.size > 15 * 1024 * 1024) {
        toast('A imagem não pode passar de 15MB.', 'error');
        return;
      } else if (mediaKind === 'unknown') {
        toast('Use uma imagem ou um vídeo MP4.', 'error');
        return;
      }

      setPostFile(file);
      if (mediaKind === 'video') void prepareVideoPoster(file);
    } finally {
      setIsValidatingMedia(false);
    }
  };

  const prepareVideoPoster = async (file: File) => {
    setIsPreparingPoster(true);
    try {
      const poster = await createVideoPoster(file);
      if (!poster) return;
      const posterUrl = URL.createObjectURL(poster);
      setPostVideoPosterUrl((previous) => {
        if (previous) URL.revokeObjectURL(previous);
        return posterUrl;
      });
    } finally {
      setIsPreparingPoster(false);
    }
  };

  const clearPostFile = () => {
    setPostFile(null);
    setMediaError(null);
    setPostVideoPosterUrl((previous) => {
      if (previous) URL.revokeObjectURL(previous);
      return null;
    });
  };

  const syncMentionQuery = (value: string, cursor: number) => {
    const beforeCursor = value.slice(0, cursor);
    const match = beforeCursor.match(/(^|\s)@([\p{L}\p{N}._-]{0,32})$/u);
    if (!match) {
      setMentionQuery(null);
      setMentionStart(null);
      return;
    }
    setMentionQuery(match[2]);
    setMentionStart(cursor - match[2].length - 1);
  };

  const handleContentChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const nextValue = event.target.value;
    setPostContent(nextValue);
    syncMentionQuery(nextValue, event.target.selectionStart);
  };

  const applyMention = (entity: MentionEntity) => {
    const cursor = textareaRef.current?.selectionStart ?? postContent.length;
    const start = mentionStart ?? cursor;
    const beforeMention = postContent.slice(0, start);
    const afterMention = postContent.slice(cursor);
    const mentionLabel = `@${entity.name}`;
    const nextValue = `${beforeMention}${mentionLabel} ${afterMention.replace(/^\s*/, '')}`;
    const nextCursor = beforeMention.length + mentionLabel.length + 1;

    setPostContent(nextValue);
    setPostTags((current) => current.includes(entity.id) ? current : [...current, entity.id]);
    setMentionQuery(null);
    setMentionStart(null);

    window.setTimeout(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(nextCursor, nextCursor);
    }, 0);
  };

  const toggleTag = (id: string) => {
    setPostTags((current) => current.includes(id) ? current.filter((tag) => tag !== id) : [...current, id]);
  };

  const handleCreatePost = async () => {
    if (!postContent.trim() && !postFile) return;
    setIsPosting(true);
    try {
      const postData: any = {
        authorId: user!.uid,
        content: postContent,
        tags: postTags,
      };
      if (postFile) {
        postData.mediaType = classifyUploadMedia(postFile) === 'video' ? 'video' : 'image';
      }
      await addPost(postData, postFile || undefined);

      if (postTags.length > 0) {
        const targetUids = resolveMentionNotificationTargets(postTags, user!.uid, publicProfiles, allPets);
        targetUids.forEach(uid => {
          addNotification({
            userId: uid,
            title: 'Nova Menção!',
            message: `${user!.name} marcou você ou seu pet em uma publicação recente.`,
          }).catch(e => console.error(e));
        });
      }

      onClose();
    } catch(e) {
      toast('Erro ao postar. Tente novamente.', 'error');
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col justify-end sm:items-center sm:justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <ModalSurface className="flex h-[85vh] flex-col p-0 sm:h-auto sm:max-h-[85vh] sm:max-w-lg animate-in slide-in-from-bottom-full sm:zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-4 border-b border-ink-100">
          <IconButton onClick={onClose} className="-ml-2 text-ink-500">
            <X size={24} />
          </IconButton>
          <h2 className="text-lg font-bold text-ink-900">Nova Publicação</h2>
          <Button
            onClick={handleCreatePost}
            disabled={isPosting || isValidatingMedia || (!postContent.trim() && !postFile)}
            className="rounded-full"
            size="sm"
          >
            {isPosting ? 'Postando...' : isValidatingMedia ? 'Lendo...' : 'Postar'}
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 hide-scrollbar">
          <div className="flex gap-3">
            <ImageWithSkeleton src={user?.photoUrl || `https://ui-avatars.com/api/?name=${user?.name}&background=random`} alt={user?.name} className="w-10 h-10 rounded-full object-cover shrink-0" containerClassName="w-10 h-10 shrink-0 rounded-full" />
            <div className="flex-1">
              <textarea
                ref={textareaRef}
                autoFocus
                placeholder="O que está acontecendo?"
                className="w-full bg-transparent resize-none outline-none text-ink-900 placeholder-ink-400 text-lg min-h-[120px]"
                value={postContent}
                onChange={handleContentChange}
                onKeyUp={(event) => syncMentionQuery(event.currentTarget.value, event.currentTarget.selectionStart)}
                onClick={(event) => syncMentionQuery(event.currentTarget.value, event.currentTarget.selectionStart)}
              />

              {mentionSuggestions.length > 0 && (
                <div className="mb-3 overflow-hidden rounded-card border border-ink-100 bg-white shadow-card">
                  {mentionSuggestions.map((entity) => (
                    <button
                      key={`${entity.kind}:${entity.id}`}
                      type="button"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => applyMention(entity)}
                      className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-ink-50 active:bg-ink-100"
                    >
                      <MentionAvatar entity={entity} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-ink-900">{entity.name}</span>
                        <span className="block text-xs text-ink-400">{entity.kind === 'pet' ? `Pet de ${entity.owner?.name || 'participante'}` : 'Pessoa'}</span>
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {postFile && (
                <div className="relative inline-block mt-2 max-w-full">
                  {postFileKind === 'video' ? (
                    <div className="overflow-hidden rounded-2xl border border-ink-100 bg-black">
                      <video
                        key={postFilePreviewUrl}
                        className="w-full max-h-[40vh] bg-black object-contain"
                        controls
                        playsInline
                        preload="metadata"
                        poster={postVideoPosterUrl || undefined}
                      >
                        {postFilePreviewUrl && <source src={postFilePreviewUrl} type={getUploadMimeType(postFile, postFileKind)} />}
                      </video>
                      <div className="flex items-center gap-2 bg-ink-900 px-3 py-2 text-xs font-medium text-white">
                        <FileVideo size={14} />
                        <span className="min-w-0 flex-1 truncate">{postFile.name}</span>
                        <span className="shrink-0 text-white/70">{formatBytes(postFile.size)}</span>
                      </div>
                      {isPreparingPoster && <p className="bg-ink-900 px-3 pb-2 text-xs text-white/60">Preparando capa do vídeo...</p>}
                    </div>
                  ) : (
                    <ImageWithSkeleton src={postFilePreviewUrl || ''} alt="preview" className="w-full max-h-[40vh] rounded-2xl object-cover bg-ink-100" containerClassName="w-full max-h-[40vh]" />
                  )}
                  <IconButton
                    onClick={clearPostFile}
                    className="absolute top-2 right-2 bg-ink-900/80 text-white backdrop-blur-md hover:bg-black"
                  >
                    <X size={16}/>
                  </IconButton>
                </div>
              )}

              {mediaError && (
                <div className="mt-3 rounded-control border border-danger-100 bg-danger-50 px-3 py-2 text-sm font-medium text-danger-600">
                  {mediaError}
                </div>
              )}

              {postTags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {postTags.map((tagId) => {
                    const entity = mentionEntities.find((item) => item.id === tagId);
                    if (!entity) return null;
                    return (
                      <button
                        key={tagId}
                        type="button"
                        onClick={() => toggleTag(tagId)}
                        className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700"
                      >
                        @{entity.name}
                        <X size={12} />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {showTagSelector && (
            <div className="mt-4 p-4 border rounded-2xl border-brand-100 bg-brand-50/50">
              <h4 className="text-xs font-semibold text-brand-700 uppercase tracking-wider mb-3">Marcar na publicação</h4>
              <div className="flex flex-wrap gap-2">
                {mentionEntities.map(entity => {
                  const isSelected = postTags.includes(entity.id);
                  return (
                    <Badge
                      key={entity.id}
                      as="button"
                      onClick={() => toggleTag(entity.id)}
                      tone={isSelected ? 'brand' : 'neutral'}
                      className={`flex whitespace-nowrap items-center gap-1.5 border transition-colors ${isSelected ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-ink-700 border-ink-200'}`}
                    >
                      @{entity.name}
                    </Badge>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="p-2 px-4 border-t border-ink-100 flex items-center justify-between bg-white pb-safe">
          <div className="flex items-center gap-1 text-brand-600">
            <label
              htmlFor="post-media-input"
              className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-full transition-all active:scale-[0.98] hover:bg-brand-50"
              aria-label="Adicionar mídia"
            >
              <ImagePlus size={22} />
            </label>
            <IconButton
              onClick={() => setShowTagSelector(!showTagSelector)}
              className={showTagSelector || postTags.length > 0 ? 'bg-brand-100 text-brand-700' : 'hover:bg-brand-50'}
              aria-label="Marcar pessoas ou pets"
            >
              <AtSign size={22} />
            </IconButton>
          </div>

          <span className={`text-xs font-medium ${postContent.length > 1800 ? 'text-danger-600' : 'text-ink-400'}`}>
            {postContent.length}/2000
          </span>

          <input
            id="post-media-input"
            type="file"
            accept="image/*,video/*,.mp4"
            className="absolute h-px w-px overflow-hidden whitespace-nowrap border-0 p-0 opacity-0"
            onChange={e => {
              const file = e.target.files?.[0];
              e.currentTarget.value = '';
              void handleMediaSelected(file);
            }}
          />
        </div>
      </ModalSurface>
    </div>
  );
}

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function MentionAvatar({ entity }: { entity: MentionEntity }) {
  const imageUrl = entity.kind === 'profile' ? entity.profile.photoUrl : entity.pet.photoUrl;
  const fallback = entity.name.charAt(0).toUpperCase();

  if (imageUrl) {
    return (
      <ImageWithSkeleton
        src={imageUrl}
        alt={entity.name}
        className="h-9 w-9 rounded-full object-cover"
        containerClassName="h-9 w-9 shrink-0 rounded-full"
      />
    );
  }

  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink-100 text-sm font-bold text-ink-500">
      {fallback}
    </span>
  );
}
