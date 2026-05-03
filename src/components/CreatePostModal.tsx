import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { X, ImagePlus, AtSign } from 'lucide-react';
import { addPost, addNotification } from '../services/api';
import { validateVideoForUpload } from '../services/uploads';
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
  const postFileInputRef = useRef<HTMLInputElement>(null);

  const handleMediaSelected = async (file: File | undefined) => {
    if (!file) return;
    setIsValidatingMedia(true);
    try {
      if (file.type.startsWith('video/')) {
        const validationError = await validateVideoForUpload(file);
        if (validationError) {
          toast(validationError, 'error');
          return;
        }
      } else if (file.size > 15 * 1024 * 1024) {
        toast('A imagem não pode passar de 15MB.', 'error');
        return;
      }
      setPostFile(file);
    } finally {
      setIsValidatingMedia(false);
    }
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
        postData.mediaType = postFile.type.startsWith('video/') ? 'video' : 'image';
      }
      await addPost(postData, postFile || undefined);

      // Submit notifications for tags
      if (postTags.length > 0) {
        const targetUids = new Set<string>();

        postTags.forEach(tagId => {
          // Check if it's a person
          const taggedUser = publicProfiles.find(p => p.uid === tagId);
          if (taggedUser) {
            targetUids.add(taggedUser.uid);
          } else {
            // Check if it's a pet
            const taggedPet = allPets.find(p => p.id === tagId);
            if (taggedPet) {
              const owners = publicProfiles.filter(p => (p.familyId || p.uid) === taggedPet.familyId);
              owners.forEach(o => targetUids.add(o.uid));
            }
          }
        });

        // Remove author from notifications list
        targetUids.delete(user!.uid);

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
                autoFocus
                placeholder="O que está acontecendo?"
                className="w-full bg-transparent resize-none outline-none text-ink-900 placeholder-ink-400 text-lg min-h-[120px]"
                value={postContent}
                onChange={e => setPostContent(e.target.value)}
              />

              {postFile && (
                <div className="relative inline-block mt-2 max-w-full">
                  {postFile.type.startsWith('video/') ? (
                    <video src={URL.createObjectURL(postFile)} className="w-full max-h-[40vh] rounded-2xl object-cover bg-black" muted autoPlay loop playsInline preload="metadata" />
                  ) : (
                    <ImageWithSkeleton src={URL.createObjectURL(postFile)} alt="preview" className="w-full max-h-[40vh] rounded-2xl object-cover bg-ink-100" containerClassName="w-full max-h-[40vh]" />
                  )}
                  <IconButton
                    onClick={() => setPostFile(null)}
                    className="absolute top-2 right-2 bg-ink-900/80 text-white backdrop-blur-md hover:bg-black"
                  >
                    <X size={16}/>
                  </IconButton>
                </div>
              )}
            </div>
          </div>

          {showTagSelector && (
            <div className="mt-4 p-4 border rounded-2xl border-brand-100 bg-brand-50/50">
              <h4 className="text-xs font-semibold text-brand-700 uppercase tracking-wider mb-3">Marcar na publicação</h4>
              <div className="flex flex-wrap gap-2">
                {[...publicProfiles, ...allPets].filter(p => !('uid' in p) || p.uid !== user?.uid).map(entity => {
                  const id = 'uid' in entity ? entity.uid : (entity as any).id;
                  const name = 'uid' in entity ? entity.name : (entity as any).name;
                  const isSelected = postTags.includes(id);
                  return (
                    <Badge
                      key={id}
                      as="button"
                      onClick={() => {
                        setPostTags(prev => isSelected ? prev.filter(t => t !== id) : [...prev, id]);
                      }}
                      tone={isSelected ? 'brand' : 'neutral'}
                      className={`flex whitespace-nowrap items-center gap-1.5 border transition-colors ${isSelected ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-ink-700 border-ink-200'}`}
                    >
                      {name}
                    </Badge>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="p-2 px-4 border-t border-ink-100 flex items-center justify-between bg-white pb-safe">
          <div className="flex items-center gap-1 text-brand-600">
            <IconButton
              onClick={() => postFileInputRef.current?.click()}
              className="hover:bg-brand-50"
              aria-label="Adicionar mídia"
            >
              <ImagePlus size={22} />
            </IconButton>
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
            type="file"
            accept="image/*,video/mp4"
            className="hidden"
            ref={postFileInputRef}
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
