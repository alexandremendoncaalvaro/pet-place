import React, { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Heart, MessageCircle, MoreVertical, Trash, Edit2, Send, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { AppPost, PostComment } from '../lib/types';
import { togglePostLike, deletePost, updatePost, subscribeToComments, addComment, deleteComment } from '../services/api';
import { ImageWithSkeleton } from './ImageWithSkeleton';

export const PostItem: React.FC<{ post: AppPost }> = ({ post }) => {
  const { user, publicProfiles, allPets, isAdmin, setViewProfileId, setViewPetId, setFullscreenImage } = useApp();
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
  const [newComment, setNewComment] = useState('');
  
  useEffect(() => {
    let unsub: () => void;
    if (showComments) {
      unsub = subscribeToComments(post.id, setComments);
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
    setIsDeletingComment(commentId);
    await deleteComment(commentId);
    setIsDeletingComment(null);
  };

  return (
    <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
      <div className="p-4 flex items-center gap-3 relative">
        <button className="flex-shrink-0 relative outline-none focus:ring-2 focus:ring-blue-500 rounded-full hover:opacity-90 active:scale-95 transition-all" onClick={() => author && setViewProfileId(author.uid)}>
          <ImageWithSkeleton src={author?.photoUrl || `https://ui-avatars.com/api/?name=${author?.name || 'User'}&background=random`} alt={author?.name} className="w-10 h-10 rounded-full object-cover" containerClassName="w-10 h-10 rounded-full" />
        </button>
        <div className="flex-1 cursor-pointer" onClick={() => author && setViewProfileId(author.uid)}>
          <h3 className="text-sm font-semibold text-gray-800 hover:text-blue-600 transition-colors">{author?.name || 'Morador'}</h3>
          <p className="text-xs text-gray-400">{format(parseISO(post.createdAt), 'dd MMM HH:mm', { locale: ptBR })}</p>
        </div>
        {(user?.uid === post.authorId || isAdmin) && (
          <div>
            <button onClick={() => setShowMenu(!showMenu)} className="p-2 text-gray-400 hover:bg-gray-50 rounded-full">
              <MoreVertical size={18} />
            </button>
            {showMenu && (
              <div className="absolute right-4 top-12 bg-white rounded-xl shadow-lg border border-gray-100 py-1 w-32 z-10">
                {user?.uid === post.authorId && (
                  <button onClick={() => { setIsEditing(true); setShowMenu(false); }} className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                    <Edit2 size={14} /> Editar
                  </button>
                )}
                <button onClick={() => { setIsDeletingOverlay(true); setShowMenu(false); }} className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2">
                  <Trash size={14} /> Excluir
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {isDeletingOverlay && (
        <div className="absolute inset-0 z-20 bg-white/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-5 max-w-sm w-full">
            <h4 className="text-gray-900 font-bold mb-2 text-center text-lg">Excluir Publicação</h4>
            <p className="text-gray-600 text-sm mb-6 text-center">Tem certeza que deseja apagar? Esta ação não pode ser desfeita.</p>
            <div className="flex gap-3">
              <button disabled={isPerformingDelete} onClick={() => setIsDeletingOverlay(false)} className="flex-1 py-2.5 rounded-xl font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 transition-colors">
                Cancelar
              </button>
              <button disabled={isPerformingDelete} onClick={handleDelete} className="flex-1 py-2.5 rounded-xl font-medium flex justify-center items-center gap-2 text-white bg-red-500 hover:bg-red-600 disabled:opacity-50 transition-colors">
                {isPerformingDelete ? 'Apagando...' : 'Apagar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {post.mediaUrl && (
        <div 
          className={`w-full bg-gray-50 aspect-square flex items-center justify-center relative ${post.mediaType === 'image' ? 'cursor-pointer group' : ''}`}
          onClick={() => post.mediaType !== 'video' && setFullscreenImage({url: post.mediaUrl!, title: `Publicação de ${author?.name || 'Morador'}`})}
        >
          {post.mediaType === 'video' ? (
            <video src={post.mediaUrl} className="w-full h-full object-cover" controls muted playsInline />
          ) : (
            <>
               <ImageWithSkeleton src={post.mediaUrl} alt="Post media" className="w-full h-full object-cover" containerClassName="w-full h-full" />
               <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
            </>
          )}
        </div>
      )}

      <div className="p-4">
        <div className="flex items-center gap-4 mb-2">
          <button 
            onClick={() => togglePostLike(post.id, user!.uid, isLiked)}
            className="flex items-center gap-1 text-gray-500 active:scale-90 transition-transform"
          >
            <Heart size={22} className={isLiked ? "fill-red-500 text-red-500" : ""} />
            <span className="text-sm font-medium">{post.likedBy?.length || 0}</span>
          </button>
          <button onClick={() => setShowComments(!showComments)} className="text-gray-500 flex items-center gap-1">
            <MessageCircle size={22} className={showComments ? "text-blue-500" : ""} />
            <span className="text-sm font-medium">{comments.length > 0 ? comments.length : ''}</span>
          </button>
        </div>
        
        {isEditing ? (
          <div className="mt-2 text-left">
            <textarea 
              value={editContent}
              onChange={e => setEditContent(e.target.value)}
              className="w-full text-sm border rounded-xl p-3 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 resize-none"
              rows={3}
              disabled={isSavingEdit}
            />
            {showEditTagsSelector && (
              <div className="mt-2 p-3 border rounded-xl border-blue-100 bg-blue-50/50">
                <h4 className="text-xs font-semibold text-blue-800 uppercase tracking-wider mb-2">Marcar / Desmarcar</h4>
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
                        className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-colors ${isSelected ? 'bg-blue-600 text-white shadow-sm' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
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
                className={`text-xs px-3 py-1.5 rounded-lg transition-colors font-medium border ${showEditTagsSelector || editTags.length > 0 ? 'bg-blue-100 border-blue-200 text-blue-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
              >
                Marcar amigos ({editTags.length})
              </button>
              <div className="flex gap-2">
                <button disabled={isSavingEdit} onClick={() => { 
                  setIsEditing(false); 
                  setEditContent(post.content); 
                  setEditTags(post.tags || []);
                  setShowEditTagsSelector(false);
                }} className="text-xs px-3 py-1.5 text-gray-500 hover:bg-gray-100 rounded-lg disabled:opacity-50 font-medium">Cancelar</button>
                <button disabled={isSavingEdit} onClick={handleEdit} className="text-xs px-4 py-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 font-medium">
                  {isSavingEdit ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          post.content && (
            <p className="text-sm text-gray-800">
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
                  className="text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded-md transition-colors"
                >
                  @{name}
                </button>
              );
            })}
          </div>
        )}

        {showComments && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <h4 className="text-xs font-bold text-gray-400 mb-3 uppercase tracking-wider">Comentários</h4>
            <div className="space-y-3 mb-3">
              {comments.map(comment => {
                const cAuthor = publicProfiles.find(p => p.uid === comment.authorId);
                return (
                  <div key={comment.id} className="flex gap-2 group">
                    <button className="flex-shrink-0" onClick={() => cAuthor && setViewProfileId(cAuthor.uid)}>
                       <img src={cAuthor?.photoUrl || `https://ui-avatars.com/api/?name=${cAuthor?.name || 'User'}&background=random`} className="w-6 h-6 rounded-full object-cover mt-0.5 hover:opacity-80" />
                    </button>
                    <div className="flex-1 bg-gray-50 px-3 py-2 rounded-2xl rounded-tl-none">
                      <div className="flex justify-between items-center mb-0.5">
                        <button className="text-xs font-semibold text-gray-800 hover:underline" onClick={() => cAuthor && setViewProfileId(cAuthor.uid)}>{cAuthor?.name}</button>
                        {(user?.uid === comment.authorId || user?.uid === post.authorId || isAdmin) && (
                          <button disabled={isDeletingComment === comment.id} onClick={() => handleDeleteComment(comment.id)} className="text-gray-400 hover:text-red-500 disabled:opacity-50">
                            {isDeletingComment === comment.id ? <span className="text-[10px]">...</span> : <X size={12} />}
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-gray-700">{comment.content}</p>
                    </div>
                  </div>
                )
              })}
              {comments.length === 0 && <p className="text-xs text-gray-400 italic">Nenhum comentário ainda.</p>}
            </div>
            
            <form onSubmit={handleAddComment} className="flex gap-2 relative">
              <input 
                type="text" 
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                placeholder="Adicionar um comentário..."
                className="flex-1 bg-gray-50 border border-gray-200 text-sm rounded-full pl-4 pr-10 py-2 focus:outline-none focus:border-blue-300"
              />
              <button disabled={!newComment.trim()} type="submit" className="absolute right-2 top-2 text-blue-500 disabled:text-gray-300">
                <Send size={18} />
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
