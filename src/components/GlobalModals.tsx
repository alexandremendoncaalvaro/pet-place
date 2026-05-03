import React from 'react';
import { useApp } from '../context/AppContext';
import { X, User, Users, PawPrint, Image as ImageIcon } from 'lucide-react';
import { PostItem } from './PostItem';
import { ImageWithSkeleton } from './ImageWithSkeleton';
import { Badge, Card, EmptyState, IconButton, ModalSurface } from './ui';

export function GlobalModals() {
  const { 
    publicProfiles, allPets, posts, 
    viewProfileId, setViewProfileId, 
    viewPetId, setViewPetId, 
    fullscreenImage, setFullscreenImage 
  } = useApp();

  const selectedPerson = viewProfileId ? publicProfiles.find(p => p.uid === viewProfileId) : null;
  const selectedPet = viewPetId ? allPets.find(p => p.id === viewPetId) : null;

  const getFamilyMembers = (uid: string) => {
    const person = publicProfiles.find(p => p.uid === uid);
    if (!person) return [];
    const famId = person.familyId || person.uid;
    return publicProfiles.filter(p => (p.familyId || p.uid) === famId);
  };

  const getFamilyPets = (uid: string) => {
    const person = publicProfiles.find(p => p.uid === uid);
    if (!person) return [];
    const famId = person.familyId || person.uid;
    const famMembers = publicProfiles.filter(p => (p.familyId || p.uid) === famId);
    return allPets.filter(p => famMembers.some(m => p.ownerId === m.uid) || p.ownerId === uid);
  };

  return (
    <>
      {fullscreenImage && (
        <div 
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setFullscreenImage(null)}
        >
          <IconButton
            className="absolute top-4 right-4 text-white/70 hover:text-white bg-black/50 transition-colors"
            onClick={() => setFullscreenImage(null)}
          >
            <X size={24} />
          </IconButton>
          <div className="max-w-4xl w-full max-h-[90vh] flex flex-col items-center gap-4" onClick={e => e.stopPropagation()}>
            <ImageWithSkeleton 
              src={fullscreenImage.url} 
              alt={fullscreenImage.title} 
              className="max-w-full max-h-[85vh] object-contain rounded-lg"
              containerClassName="w-full max-h-[85vh] flex justify-center"
            />
            {fullscreenImage.title && <p className="text-white font-medium bg-black/50 px-4 py-2 rounded-full">{fullscreenImage.title}</p>}
          </div>
        </div>
      )}

      {selectedPerson && (
        <div className="fixed inset-0 z-[90] bg-black/50 flex items-center justify-center p-4" onClick={() => setViewProfileId(null)}>
          <ModalSurface className="w-full max-w-sm overflow-hidden flex flex-col max-h-[90vh] p-0" onClick={e => e.stopPropagation()}>
            <div className="bg-brand-600 p-6 flex flex-col items-center text-white relative">
              <IconButton onClick={() => setViewProfileId(null)} className="absolute top-4 right-4 bg-black/20 hover:bg-black/30 text-white">
                <X size={20} />
              </IconButton>
              <div 
                className={`w-24 h-24 rounded-2xl overflow-hidden bg-brand-500 mb-3 border-4 border-white/20 shadow-lg ${selectedPerson.photoUrl ? 'cursor-pointer' : ''}`}
                onClick={() => selectedPerson.photoUrl && setFullscreenImage({url: selectedPerson.photoUrl, title: selectedPerson.name})}
              >
                {selectedPerson.photoUrl ? (
                  <img src={selectedPerson.photoUrl} alt={selectedPerson.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center"><User size={40} /></div>
                )}
              </div>
              <h3 className="text-xl font-bold">{selectedPerson.name}</h3>
              {selectedPerson.role === 'admin' && (
                <p className="text-brand-50 text-sm capitalize">{selectedPerson.role}</p>
              )}
            </div>
            
            <div className="p-6 overflow-y-auto">
              <h4 className="text-xs font-bold text-ink-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Users size={16} /> Grupo Familiar
              </h4>
              <div className="space-y-3 mb-6">
                {getFamilyMembers(selectedPerson.uid).map(m => (
                  <Card key={m.uid} tone="muted" className="flex items-center gap-3 p-3 shadow-none cursor-pointer hover:bg-ink-100" onClick={() => setViewProfileId(m.uid)}>
                     <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-500 flex items-center justify-center overflow-hidden">
                       {m.photoUrl ? <img src={m.photoUrl} alt={m.name} className="w-full h-full object-cover" /> : <User size={20} />}
                     </div>
                     <p className="font-semibold text-ink-700 text-sm">{m.name} {m.uid === selectedPerson.uid && '(Este)'}</p>
                  </Card>
                ))}
              </div>

              <h4 className="text-xs font-bold text-ink-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <PawPrint size={16} /> Pets Associados
              </h4>
              <div className="space-y-3">
                {getFamilyPets(selectedPerson.uid).length > 0 ? getFamilyPets(selectedPerson.uid).map(p => (
                  <Card key={p.id} tone="muted" className="flex items-center gap-3 p-3 shadow-none cursor-pointer hover:bg-warning-50" onClick={() => {setViewPetId(p.id); setViewProfileId(null);}}>
                     <div 
                        className="w-12 h-12 rounded-full overflow-hidden bg-warning-100 flex items-center justify-center text-warning-600 border-2 border-white"
                     >
                       {p.photoUrl ? <img src={p.photoUrl} alt={p.name} className="w-full h-full object-cover" /> : <PawPrint size={24} />}
                     </div>
                     <div>
                       <p className="font-semibold text-ink-900 text-sm">{p.name}</p>
                       <p className="text-xs text-warning-600">{p.breed}</p>
                     </div>
                  </Card>
                )) : (
                  <EmptyState className="p-4">Nenhum pet cadastrado.</EmptyState>
                )}
              </div>

              <h4 className="text-xs font-bold text-ink-400 uppercase tracking-wider mt-6 mb-4 flex items-center gap-2">
                <ImageIcon size={16} /> Publicações
              </h4>
              <div className="flex flex-col gap-3">
                {posts.filter(p => p.authorId === selectedPerson.uid || p.tags?.includes(selectedPerson.uid)).length > 0 ? (
                  posts.filter(p => p.authorId === selectedPerson.uid || p.tags?.includes(selectedPerson.uid)).map(post => (
                    <PostItem key={post.id} post={post} />
                  ))
                ) : (
                  <EmptyState className="p-4">Nenhuma publicação recente.</EmptyState>
                )}
              </div>
            </div>
          </ModalSurface>
        </div>
      )}

      {selectedPet && (
        <div className="fixed inset-0 z-[90] bg-black/50 flex items-center justify-center p-4" onClick={() => setViewPetId(null)}>
          <ModalSurface className="w-full max-w-sm overflow-hidden flex flex-col max-h-[90vh] p-0" onClick={e => e.stopPropagation()}>
            <div className="bg-warning-600 p-6 flex flex-col items-center text-white relative">
              <IconButton onClick={() => setViewPetId(null)} className="absolute top-4 right-4 bg-black/20 hover:bg-black/30 text-white">
                <X size={20} />
              </IconButton>
              <div 
                className={`w-24 h-24 rounded-full overflow-hidden bg-warning-100 mb-3 border-4 border-white/20 shadow-lg ${selectedPet.photoUrl ? 'cursor-pointer' : ''}`}
                onClick={() => selectedPet.photoUrl && setFullscreenImage({url: selectedPet.photoUrl, title: selectedPet.name})}
              >
                {selectedPet.photoUrl ? (
                  <img src={selectedPet.photoUrl} alt={selectedPet.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center"><PawPrint size={40} /></div>
                )}
              </div>
              <h3 className="text-xl font-bold">{selectedPet.name}</h3>
              <Badge tone="warning" className="mt-1 bg-white/20 text-white">{selectedPet.breed || 'Pet'}</Badge>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <p className="text-sm text-ink-700 mb-6 bg-ink-50 p-4 rounded-2xl italic leading-relaxed">
                "{selectedPet.bio || `Olá, eu sou o(a) ${selectedPet.name}!`}"
              </p>
              
              <h4 className="text-xs font-bold text-ink-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Users size={16} /> Tutores
              </h4>
              <div className="space-y-3 mb-6">
                {getFamilyMembers(selectedPet.ownerId).map(m => (
                  <Card key={m.uid} tone="muted" className="flex items-center gap-3 p-3 shadow-none cursor-pointer hover:bg-ink-100" onClick={() => {setViewProfileId(m.uid); setViewPetId(null);}}>
                     <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-500 flex items-center justify-center overflow-hidden">
                       {m.photoUrl ? <img src={m.photoUrl} alt={m.name} className="w-full h-full object-cover" /> : <User size={20} />}
                     </div>
                     <p className="font-semibold text-ink-700 text-sm">{m.name}</p>
                  </Card>
                ))}
              </div>

              <h4 className="text-xs font-bold text-ink-400 uppercase tracking-wider mt-6 mb-4 flex items-center gap-2">
                <ImageIcon size={16} /> Publicações com {selectedPet.name}
              </h4>
              <div className="flex flex-col gap-3">
                {posts.filter(p => p.tags?.includes(selectedPet.id)).length > 0 ? (
                  posts.filter(p => p.tags?.includes(selectedPet.id)).map(post => (
                    <PostItem key={post.id} post={post} />
                  ))
                ) : (
                  <EmptyState className="p-4">Nenhuma publicação recente.</EmptyState>
                )}
              </div>
            </div>
          </ModalSurface>
        </div>
      )}
    </>
  );
}
