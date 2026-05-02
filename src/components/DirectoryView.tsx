import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Info, PawPrint, Search, User } from 'lucide-react';
import { ImageWithSkeleton } from './ImageWithSkeleton';
import { AboutModal } from './AboutModal';
import { Badge, Button, Card, EmptyState, Page, SectionTitle, TextInput } from './ui';

export function DirectoryView() {
  const { publicProfiles, allPets, setViewProfileId, setViewPetId } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'people' | 'pets'>('all');
  const [showAbout, setShowAbout] = useState(false);

  const filteredProfiles = publicProfiles.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredPets = allPets.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.breed && p.breed.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getFamilyMembers = (userId: string | undefined) => {
    if (!userId) return [];
    const userProfile = publicProfiles.find(p => p.uid === userId);
    const familyId = userProfile?.familyId || userProfile?.uid;
    return publicProfiles.filter(p => (p.familyId || p.uid) === familyId);
  };

  const getFamilyPets = (userId: string | undefined) => {
    const members = getFamilyMembers(userId);
    const memberIds = members.map(m => m.uid);
    return allPets.filter(p => memberIds.includes(p.ownerId));
  };

  return (
    <Page className="min-h-[calc(100vh-140px)]">

      {showAbout && <AboutModal onClose={() => setShowAbout(false)} />}

      {/* Banner Sobre */}
      <Card
        role="button"
        tabIndex={0}
        onClick={() => setShowAbout(true)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') setShowAbout(true);
        }}
        className="bg-brand-600 text-white p-4 mb-6 shadow-md shadow-brand-600/20 active:scale-95 transition-transform flex items-center gap-4 cursor-pointer border-brand-600"
      >
        <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
          <Info size={24} className="text-white" />
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-sm tracking-wide">Sobre o Pet Place</h3>
          <p className="text-xs text-brand-50 mt-1 leading-tight">Como surgiu nosso projeto, segurança e regras da nossa comunidade.</p>
        </div>
      </Card>

      <div className="mb-6 flex justify-between items-end">
        <div>
          <h2 className="text-xl font-bold text-ink-900">Comunidade</h2>
          <p className="text-sm text-ink-500">Quem participa do espaço</p>
        </div>
      </div>

      <div className="relative mb-6">
        <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-400" />
        <TextInput
          type="text"
          placeholder="Buscar..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-11"
        />
      </div>

      <div className="flex gap-2 mb-6">
        <Button
          onClick={() => setFilter('all')}
          variant={filter === 'all' ? 'primary' : 'secondary'}
          className="flex-1"
        >
          Todos
        </Button>
        <Button
          onClick={() => setFilter('people')}
          variant={filter === 'people' ? 'primary' : 'secondary'}
          className="flex-1"
        >
          Pessoas
        </Button>
        <Button
          onClick={() => setFilter('pets')}
          variant={filter === 'pets' ? 'primary' : 'secondary'}
          className="flex-1"
        >
          Pets
        </Button>
      </div>

      {filter !== 'pets' && (
        <div className="mb-8">
          {filter === 'all' && <SectionTitle className="mb-4">Pessoas</SectionTitle>}
          {filteredProfiles.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredProfiles.map(profile => {
                const familyPets = getFamilyPets(profile.uid);
                return (
                <Card
                  key={profile.uid}
                  className="p-4 flex items-center gap-4 cursor-pointer hover:border-brand-100 transition-colors"
                  onClick={() => setViewProfileId(profile.uid)}
                >
                  <div
                    className={`w-16 h-16 rounded-2xl overflow-hidden bg-brand-50 flex-shrink-0 flex items-center justify-center text-brand-500 ${profile.photoUrl ? 'hover:opacity-90 active:scale-95 transition-all' : ''}`}
                  >
                    {profile.photoUrl ? (
                      <ImageWithSkeleton src={profile.photoUrl} alt={profile.name} className="w-full h-full object-cover" containerClassName="w-full h-full" />
                    ) : (
                      <User size={32} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-ink-900 truncate">{profile.name}</h4>
                    {profile.role === 'admin' && (
                      <Badge tone="brand" className="rounded-md mt-1 px-2 py-0.5 capitalize">{profile.role}</Badge>
                    )}
                    {familyPets.length > 0 && (
                      <div className="mt-2 flex items-center gap-2">
                        <div className="text-xs text-ink-500 flex items-center bg-ink-50 rounded-lg px-2 py-1 w-max border border-ink-200">
                          <PawPrint size={12} className="mr-1.5 text-brand-500" />
                          <span className="truncate max-w-[120px] sm:max-w-[150px]">{familyPets.map(p => p.name).join(', ')}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              )})}
            </div>
          ) : (
            <EmptyState>
              Nenhuma pessoa encontrada
            </EmptyState>
          )}
        </div>
      )}

      {filter !== 'people' && (
        <div className="mb-8">
          {filter === 'all' && <SectionTitle className="mb-4">Pets</SectionTitle>}
          {filteredPets.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredPets.map(pet => {
                const responsiblePeople = getFamilyMembers(pet.ownerId);
                return (
                  <Card
                    key={pet.id}
                    className="p-4 flex items-center gap-4 cursor-pointer hover:border-warning-100 transition-colors"
                    onClick={() => setViewPetId(pet.id)}
                  >
                    <div
                      className={`w-16 h-16 rounded-full overflow-hidden bg-warning-50 flex-shrink-0 flex items-center justify-center text-warning-600 border-2 border-warning-100 p-0.5 ${pet.photoUrl ? 'hover:opacity-90 active:scale-95 transition-all' : ''}`}
                    >
                      {pet.photoUrl ? (
                        <ImageWithSkeleton src={pet.photoUrl} alt={pet.name} className="w-full h-full object-cover rounded-full" containerClassName="w-full h-full rounded-full" />
                      ) : (
                        <PawPrint size={30} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-ink-900 truncate">{pet.name}</h4>
                      {pet.breed && <p className="text-xs text-warning-600 font-medium mt-1">{pet.breed}</p>}
                      {responsiblePeople.length > 0 && (
                        <div className="mt-2 text-xs text-ink-500 flex items-center bg-ink-50 rounded-lg px-2 py-1 w-max border border-ink-200">
                          <User size={12} className="mr-1.5 text-brand-500" />
                          <span className="truncate max-w-[120px] sm:max-w-[150px]">{responsiblePeople.map(p => p.name).join(', ')}</span>
                        </div>
                      )}
                    </div>
                  </Card>
                )
              })}
            </div>
          ) : (
             <EmptyState>
               Nenhum pet encontrado
             </EmptyState>
          )}
        </div>
      )}
    </Page>
  );
}
