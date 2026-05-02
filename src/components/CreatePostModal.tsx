import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { X, ImagePlus, AtSign, Send, FileVideo } from 'lucide-react';
import { addPost, addNotification } from '../services/api';
import { ImageWithSkeleton } from './ImageWithSkeleton';
import { useFeedback } from './Feedback';

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
  const postFileInputRef = useRef<HTMLInputElement>(null);

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
      
      <div className="relative bg-white w-full sm:w-full sm:max-w-lg rounded-t-[2rem] sm:rounded-3xl shadow-2xl flex flex-col h-[85vh] sm:h-auto sm:max-h-[85vh] animate-in slide-in-from-bottom-full sm:zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <button onClick={onClose} className="p-2 -ml-2 text-gray-500 rounded-full active:bg-gray-100 transition-colors">
            <X size={24} />
          </button>
          <h2 className="text-lg font-bold text-gray-800">Nova Publicação</h2>
          <button 
            onClick={handleCreatePost}
            disabled={isPosting || (!postContent.trim() && !postFile)}
            className="bg-blue-600 text-white px-5 py-2 rounded-full text-sm font-semibold active:scale-95 transition-all disabled:opacity-50"
          >
            {isPosting ? 'Postando...' : 'Postar'}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 hide-scrollbar">
          <div className="flex gap-3">
            <ImageWithSkeleton src={user?.photoUrl || `https://ui-avatars.com/api/?name=${user?.name}&background=random`} alt={user?.name} className="w-10 h-10 rounded-full object-cover shrink-0" containerClassName="w-10 h-10 shrink-0 rounded-full" />
            <div className="flex-1">
              <textarea 
                autoFocus
                placeholder="O que está acontecendo?"
                className="w-full bg-transparent resize-none outline-none text-gray-800 placeholder-gray-400 text-lg min-h-[120px]"
                value={postContent}
                onChange={e => setPostContent(e.target.value)}
              />
              
              {postFile && (
                <div className="relative inline-block mt-2 max-w-full">
                  {postFile.type.startsWith('video/') ? (
                    <video src={URL.createObjectURL(postFile)} className="w-full max-h-[40vh] rounded-2xl object-cover bg-black" muted autoPlay loop />
                  ) : (
                    <ImageWithSkeleton src={URL.createObjectURL(postFile)} alt="preview" className="w-full max-h-[40vh] rounded-2xl object-cover bg-gray-100" containerClassName="w-full max-h-[40vh]" />
                  )}
                  <button 
                    onClick={() => setPostFile(null)} 
                    className="absolute top-2 right-2 bg-gray-900/80 text-white p-2 rounded-full backdrop-blur-md hover:bg-black transition-colors"
                  >
                    <X size={16}/>
                  </button>
                </div>
              )}
            </div>
          </div>
          
          {showTagSelector && (
            <div className="mt-4 p-4 border rounded-2xl border-blue-100 bg-blue-50/50">
              <h4 className="text-xs font-semibold text-blue-800 uppercase tracking-wider mb-3">Marcar na publicação</h4>
              <div className="flex flex-wrap gap-2">
                {[...publicProfiles, ...allPets].filter(p => !('uid' in p) || p.uid !== user?.uid).map(entity => {
                  const id = 'uid' in entity ? entity.uid : (entity as any).id;
                  const name = 'uid' in entity ? entity.name : (entity as any).name;
                  const isSelected = postTags.includes(id);
                  return (
                    <button
                      key={id}
                      onClick={() => {
                        setPostTags(prev => isSelected ? prev.filter(t => t !== id) : [...prev, id]);
                      }}
                      className={`flex whitespace-nowrap items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${isSelected ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-200'}`}
                    >
                      {name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        
        <div className="p-2 px-4 border-t border-gray-100 flex items-center justify-between bg-white pb-safe">
          <div className="flex items-center gap-1 text-blue-600">
            <button 
              onClick={() => postFileInputRef.current?.click()}
              className="p-2.5 rounded-full hover:bg-blue-50 transition-colors"
              aria-label="Adicionar mídia"
            >
              <ImagePlus size={22} />
            </button>
            <button 
              onClick={() => setShowTagSelector(!showTagSelector)}
              className={`p-2.5 rounded-full transition-colors ${showTagSelector || postTags.length > 0 ? 'bg-blue-100 text-blue-700' : 'hover:bg-blue-50'}`}
              aria-label="Marcar pessoas ou pets"
            >
              <AtSign size={22} />
            </button>
          </div>
          
          <span className={`text-xs font-medium ${postContent.length > 1800 ? 'text-red-500' : 'text-gray-400'}`}>
            {postContent.length}/2000
          </span>
          
          <input type="file" accept="image/*,video/mp4,video/quicktime" className="hidden" ref={postFileInputRef} onChange={e => {
            if(e.target.files?.[0]) {
              if (e.target.files[0].size > 15 * 1024 * 1024) {
                toast('O arquivo não pode passar de 15MB.', 'error');
                return;
              }
              setPostFile(e.target.files[0]);
            }
          }} />
        </div>
      </div>
    </div>
  );
}
