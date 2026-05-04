import React, { useState, useEffect, useRef } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Heart, MessageCircle, MoreVertical, Trash, Edit2, Send, X, Eye } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { AppPost, PostComment } from '../lib/types';
import { resolveMentionNotificationTargets } from '../lib/mentions';
import { togglePostLike, deletePost, updatePost, subscribeToComments, addComment, deleteComment, addNotification } from '../services/api';
import { ImageWithSkeleton } from './ImageWithSkeleton';
import { useFeedback } from './Feedback';
import { Button, Card, IconButton, TextInput } from './ui';

export const PostItem: React.FC<{ post: AppPost }> = ({ post }) => {
  const { user, publicProfiles, allPets, isAdmin, setViewProfileId, setViewPetId, setFullscreenImage } = useApp();
  const { toast } = useFeedback();
  const author = publicProfiles.find(p => p.uid === post.authorId);
  const isLiked = user ? post.likedBy?.includes(user.uid) : false;
  
  const [showMenu, setShowMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isDeletingOverlay, setIsDeletingOverlay] = useState(false);
  const [isPerformingDelete, setIsPerformingDelete] = useState(false);
  const [editContent, setEditContent] = useState(post.content);
  const [editTags, setEditTags] = useState<string[]>(post.tags || []);
  const [showEditTagsSelector, setShowEditTagsSelector] = useState(false);

  // Comments
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<PostComment[]>([]);
  const [commentsLoaded, setCommentsLoaded] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [showLikes, setShowLikes] = useState(false);
  const [hasVideoError, setHasVideoError] = useState(false);
  const [videoSrc, setVideoSrc] = useState<string | undefined>(post.mediaType === 'video' ? undefined : post.mediaUrl);
  const [isPreparingVideo, setIsPreparingVideo] = useState(post.mediaType === 'video' && !!post.mediaUrl);
  const videoBlobUrlRef = useRef<string | null>(null);
  const visibleCommentCount = showComments && commentsLoaded ? comments.length : post.commentCount || 0;

  useEffect(() => {
    let cancelled = false;
    if (videoBlobUrlRef.current) URL.revokeObjectURL(videoBlobUrlRef.current);
    videoBlobUrlRef.current = null;
    setHasVideoError(false);
    setVideoSrc(post.mediaType === 'video' ? undefined : post.mediaUrl);
    setIsPreparingVideo(post.mediaType === 'video' && !!post.mediaUrl);

    if (post.mediaType === 'video' && post.mediaUrl) {
      prepareAuthenticatedVideo(post.mediaUrl).then((result) => {
        if (cancelled) {
          if (result.blobUrl) URL.revokeObjectURL(result.blobUrl);
          return;
        }
        if (!result.blobUrl) {
          setHasVideoError(true);
          setIsPreparingVideo(false);
          return;
        }
        videoBlobUrlRef.current = result.blobUrl;
        setVideoSrc(result.blobUrl);
        setIsPreparingVideo(false);
      });
    }

    return () => {
      cancelled = true;
      if (videoBlobUrlRef.current) URL.revokeObjectURL(videoBlobUrlRef.current);
      videoBlobUrlRef.current = null;
    };
  }, [post.mediaType, post.mediaUrl, post.id]);
  
  useEffect(() => {
    let unsub: () => void;
    if (showComments) {
      setCommentsLoaded(false);
      unsub = subscribeToComments(post.id, (nextComments) => {
        setComments(nextComments);
        setCommentsLoaded(true);
      });
    }
    return () => {
      if (unsub) unsub();
    }
  }, [showComments, post.id]);

  const handleDelete = async () => {
    try {
      setIsPerformingDelete(true);
      await deletePost(post.id);
    } catch (e) {
      setIsPerformingDelete(false);
      setIsDeletingOverlay(false);
    }
  };

  const handleEdit = async () => {
    if (!editContent.trim()) return;
    setIsSavingEdit(true);
    await updatePost(post.id, editContent, editTags);
    
    // Check if new tags were added
    const newTags = editTags.filter(t => !(post.tags || []).includes(t));
    if (newTags.length > 0 && user) {
      const targetUids = resolveMentionNotificationTargets(newTags, user.uid, publicProfiles, allPets);
      targetUids.forEach(uid => {
        addNotification({
          userId: uid,
          title: 'Nova Menção!',
          message: `${user.name} marcou você ou seu pet na alteração de uma publicação.`,
        }).catch(e => console.error(e));
      });
    }
    
    setIsSavingEdit(false);
    setIsEditing(false);
    setShowEditTagsSelector(false);
  };
  
  const [isDeletingComment, setIsDeletingComment] = useState<string | null>(null);
  
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !user) return;
    await addComment(post.id, user.uid, newComment);
    setNewComment('');
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      setIsDeletingComment(commentId);
      await deleteComment(commentId);
    } catch(e: any) {
      toast(e.message || 'Erro ao deletar comentário.', 'error');
    } finally {
      setIsDeletingComment(null);
    }
  };

  return (
    <Card className="overflow-hidden">
      <div className="p-4 flex items-center gap-3 relative">
        <button className="flex-shrink-0 relative outline-none focus:ring-2 focus:ring-brand-500 rounded-full hover:opacity-90 active:scale-95 transition-all" onClick={() => author && setViewProfileId(author.uid)}>
          <ImageWithSkeleton src={author?.photoUrl || `https://ui-avatars.com/api/?name=${author?.name || 'User'}&background=random`} alt={author?.name} className="w-10 h-10 rounded-full object-cover" containerClassName="w-10 h-10 rounded-full" />
        </button>
        <div className="flex-1 cursor-pointer" onClick={() => author && setViewProfileId(author.uid)}>
          <h3 className="text-sm font-semibold text-ink-900 hover:text-brand-600 transition-colors">{author?.name || 'Participante'}</h3>
          <p className="text-xs text-ink-400">{format(parseISO(post.createdAt), 'dd MMM HH:mm', { locale: ptBR })}</p>
        </div>
        {(user?.uid === post.authorId || isAdmin) && (
          <div>
            <IconButton onClick={() => setShowMenu(!showMenu)} className="text-ink-400 hover:bg-ink-50">
              <MoreVertical size={18} />
            </IconButton>
            {showMenu && (
              <div className="absolute right-4 top-12 bg-white rounded-xl shadow-lg border border-ink-100 py-1 w-32 z-10">
                {user?.uid === post.authorId && (
                  <button onClick={() => { setIsEditing(true); setShowMenu(false); }} className="w-full px-4 py-2 text-left text-sm text-ink-700 hover:bg-ink-50 flex items-center gap-2">
                    <Edit2 size={14} /> Editar
                  </button>
                )}
                <button onClick={() => { setIsDeletingOverlay(true); setShowMenu(false); }} className="w-full px-4 py-2 text-left text-sm text-danger-600 hover:bg-danger-50 flex items-center gap-2">
                  <Trash size={14} /> Excluir
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {isDeletingOverlay && (
        <div className="absolute inset-0 z-20 bg-white/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-ink-100 p-5 max-w-sm w-full">
            <h4 className="text-ink-900 font-bold mb-2 text-center text-lg">Excluir Publicação</h4>
            <p className="text-ink-700 text-sm mb-6 text-center">Tem certeza que deseja apagar? Esta ação não pode ser desfeita.</p>
            <div className="flex gap-3">
              <Button disabled={isPerformingDelete} onClick={() => setIsDeletingOverlay(false)} variant="secondary" className="flex-1">
                Cancelar
              </Button>
              <Button disabled={isPerformingDelete} onClick={handleDelete} variant="danger" className="flex-1 bg-danger-600 text-white hover:bg-danger-600">
                {isPerformingDelete ? 'Apagando...' : 'Apagar'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {post.mediaUrl && (
        <div 
          className={`w-full bg-ink-50 aspect-square flex items-center justify-center relative ${post.mediaType === 'image' ? 'cursor-pointer group' : ''}`}
          onClick={() => post.mediaType !== 'video' && setFullscreenImage({url: post.mediaUrl!, title: `Publicação de ${author?.name || 'Participante'}`})}
        >
          {post.mediaType === 'video' ? (
            <>
              {videoSrc ? (
                <video
                  src={videoSrc}
                  poster={post.posterUrl}
                  className="w-full h-full object-cover"
                  controls
                  muted
                  playsInline
                  preload="metadata"
                  onCanPlay={() => setHasVideoError(false)}
                  onError={(event) => {
                    const video = event.currentTarget;
                    console.error('Video blob playback error', {
                      postId: post.id,
                      mediaUrl: post.mediaUrl,
                      errorCode: video.error?.code,
                      networkState: video.networkState,
                      readyState: video.readyState,
                    });
                    setHasVideoError(true);
                  }}
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-black">
                  {post.posterUrl && <img src={post.posterUrl} alt="" className="absolute inset-0 h-full w-full object-cover opacity-70" />}
                  <div className="relative rounded-full bg-white/90 px-4 py-2 text-sm font-semibold text-ink-900 shadow">
                    {isPreparingVideo ? 'Preparando vídeo...' : 'Vídeo indisponível'}
                  </div>
                </div>
              )}
              {hasVideoError && (
                <div className="absolute inset-x-4 bottom-4 rounded-xl bg-ink-900/85 px-4 py-3 text-sm font-medium text-white shadow-lg">
                  Não consegui carregar este vídeo neste aparelho.
                </div>
              )}
            </>
          ) : (
            <>
               <ImageWithSkeleton src={post.mediaUrl} alt="Post media" className="w-full h-full object-cover" containerClassName="w-full h-full" />
               <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
            </>
          )}
        </div>
      )}

      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => togglePostLike(post.id, user!.uid, isLiked)}
              aria-label={isLiked ? 'Remover curtida' : 'Curtir publicação'}
              className="flex items-center gap-1 text-ink-500 active:scale-90 transition-transform"
            >
              <Heart size={22} className={isLiked ? "fill-danger-600 text-danger-600" : ""} />
              <span className="text-sm font-medium">{post.likedBy?.length || 0}</span>
            </button>
            <button onClick={() => setShowComments(!showComments)} aria-label="Comentários da publicação" className="text-ink-500 flex items-center gap-1 active:scale-95 transition-transform">
              <MessageCircle size={22} className={showComments ? "text-brand-500" : ""} />
              <span className="text-sm font-medium">{visibleCommentCount > 0 ? visibleCommentCount : ''}</span>
            </button>
          </div>
          {(post.likedBy?.length || 0) > 0 && (
            <button onClick={() => setShowLikes(!showLikes)} aria-label="Ver curtidas" className="text-ink-400 hover:text-ink-600 transition-colors">
              <Eye size={20} className={showLikes ? "text-brand-500" : ""} />
            </button>
          )}
        </div>

        {showLikes && (post.likedBy?.length || 0) > 0 && (
          <div className="mb-3 flex flex-wrap gap-1 bg-ink-50 p-2 rounded-xl border border-ink-100">
            {post.likedBy?.map(uid => {
              const p = publicProfiles.find(x => x.uid === uid);
              if (!p) return null;
              return (
                <div key={uid} onClick={() => setViewProfileId(uid)} className="w-8 h-8 rounded-full overflow-hidden bg-ink-200 cursor-pointer hover:ring-2 hover:ring-brand-500 transition-all" title={p.name}>
                  {p.photoUrl ? (
                    <ImageWithSkeleton src={p.photoUrl} alt={p.name} className="w-full h-full object-cover" containerClassName="w-full h-full" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs font-bold text-ink-500 bg-ink-200">
                      {p.name.charAt(0)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        
        {isEditing ? (
          <div className="mt-2 text-left">
            <textarea 
              value={editContent}
              onChange={e => setEditContent(e.target.value)}
              className="w-full text-sm border border-ink-200 rounded-xl p-3 bg-ink-50 focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-50 resize-none"
              rows={3}
              disabled={isSavingEdit}
            />
            {showEditTagsSelector && (
              <div className="mt-2 p-3 border rounded-xl border-brand-100 bg-brand-50/50">
                <h4 className="text-xs font-semibold text-brand-700 uppercase tracking-wider mb-2">Marcar / Desmarcar</h4>
                <div className="flex flex-wrap gap-2">
                  {[...publicProfiles, ...allPets].filter(p => !('uid' in p) || p.uid !== user?.uid).map(entity => {
                    const id = 'uid' in entity ? entity.uid : (entity as any).id;
                    const name = 'name' in entity ? entity.name : '';
                    const isSelected = editTags.includes(id);
                    return (
                      <button
                        key={id}
                        onClick={() => {
                          if (isSelected) setEditTags(editTags.filter(t => t !== id));
                          else setEditTags([...editTags, id]);
                        }}
                        className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-colors ${isSelected ? 'bg-brand-600 text-white shadow-sm' : 'bg-white text-ink-600 border border-ink-200 hover:bg-ink-50'}`}
                      >
                        @{name}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
            <div className="flex justify-between items-center mt-2">
              <button 
                disabled={isSavingEdit} 
                onClick={() => setShowEditTagsSelector(!showEditTagsSelector)} 
                className={`text-xs px-3 py-1.5 rounded-lg transition-colors font-medium border ${showEditTagsSelector || editTags.length > 0 ? 'bg-brand-100 border-brand-100 text-brand-700' : 'bg-white border-ink-200 text-ink-600 hover:bg-ink-50'}`}
              >
                Marcar amigos ({editTags.length})
              </button>
              <div className="flex gap-2">
                <button disabled={isSavingEdit} onClick={() => { 
                  setIsEditing(false); 
                  setEditContent(post.content); 
                  setEditTags(post.tags || []);
                  setShowEditTagsSelector(false);
                }} className="text-xs px-3 py-1.5 text-ink-500 hover:bg-ink-100 rounded-lg disabled:opacity-50 font-medium">Cancelar</button>
                <button disabled={isSavingEdit} onClick={handleEdit} className="text-xs px-4 py-1.5 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 font-medium">
                  {isSavingEdit ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          post.content && (
            <p className="text-sm text-ink-900">
              <button onClick={() => author && setViewProfileId(author.uid)} className="font-semibold mr-2 hover:underline">{author?.name}</button>
              {post.content}
            </p>
          )
        )}
        
        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {post.tags.map(tagId => {
              const profile = publicProfiles.find(p => p.uid === tagId);
              const pet = allPets.find(p => p.id === tagId);
              const tagEntity = profile || pet;
              if (!tagEntity) return null;
              const name = profile ? profile.name : pet?.name;
              return (
                <button 
                  key={tagId} 
                  onClick={() => profile ? setViewProfileId(profile.uid) : setViewPetId(pet!.id)}
                  className="text-xs font-medium text-brand-600 bg-brand-50 hover:bg-brand-100 px-2 py-0.5 rounded-md transition-colors"
                >
                  @{name}
                </button>
              );
            })}
          </div>
        )}

        {showComments && (
          <div className="mt-4 pt-4 border-t border-ink-100">
            <h4 className="text-xs font-bold text-ink-400 mb-3 uppercase tracking-wider">Comentários</h4>
            <div className="space-y-3 mb-3">
              {comments.map(comment => {
                const cAuthor = publicProfiles.find(p => p.uid === comment.authorId);
                return (
                  <div key={comment.id} className="flex gap-2 group">
                    <button className="flex-shrink-0" onClick={() => cAuthor && setViewProfileId(cAuthor.uid)}>
                       <img src={cAuthor?.photoUrl || `https://ui-avatars.com/api/?name=${cAuthor?.name || 'User'}&background=random`} className="w-6 h-6 rounded-full object-cover mt-0.5 hover:opacity-80" />
                    </button>
                    <div className="flex-1 bg-ink-50 px-3 py-2 rounded-2xl rounded-tl-none">
                      <div className="flex justify-between items-center mb-0.5">
                        <button className="text-xs font-semibold text-ink-900 hover:underline" onClick={() => cAuthor && setViewProfileId(cAuthor.uid)}>{cAuthor?.name}</button>
                        {(user?.uid === comment.authorId || user?.uid === post.authorId || isAdmin) && (
                          <button disabled={isDeletingComment === comment.id} onClick={() => handleDeleteComment(comment.id)} className="text-ink-400 hover:text-danger-600 disabled:opacity-50">
                            {isDeletingComment === comment.id ? <span className="text-[10px]">...</span> : <X size={12} />}
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-ink-700">{comment.content}</p>
                    </div>
                  </div>
                )
              })}
              {comments.length === 0 && <p className="text-xs text-ink-400 italic">Nenhum comentário ainda.</p>}
            </div>
            
            <form onSubmit={handleAddComment} className="flex gap-2 relative">
              <TextInput
                type="text" 
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                placeholder="Adicionar um comentário..."
                className="flex-1 text-sm rounded-full pl-4 pr-10 py-2"
              />
              <button disabled={!newComment.trim()} type="submit" aria-label="Enviar comentário" className="absolute right-2 top-2 text-brand-500 disabled:text-ink-300">
                <Send size={18} />
              </button>
            </form>
          </div>
        )}
      </div>
    </Card>
  );
}

async function prepareAuthenticatedVideo(mediaUrl: string): Promise<{ blobUrl?: string }> {
  try {
    const response = await fetch(mediaUrl, {
      credentials: 'include',
      cache: 'no-store',
    });
    const headers = {
      status: response.status,
      contentType: response.headers.get('content-type'),
      contentLength: response.headers.get('content-length'),
      contentRange: response.headers.get('content-range'),
      acceptRanges: response.headers.get('accept-ranges'),
    };
    if (!response.ok) {
      console.error('Video fetch failed', { mediaUrl, ...headers });
      return {};
    }
    const blob = await response.blob();
    console.info('Video fetch succeeded', { mediaUrl, ...headers, blobType: blob.type, blobSize: blob.size });
    return { blobUrl: URL.createObjectURL(blob) };
  } catch (error) {
    console.error('Video fetch crashed', { mediaUrl, error });
    return {};
  }
}
