import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Search, User, PawPrint, X, Users, Image as ImageIcon } from 'lucide-react';
import { UserProfile, Pet } from '../lib/types';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PostItem } from './PostItem';

export function DirectoryView() {
  const { publicProfiles, allPets, setViewProfileId, setViewPetId } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'people' | 'pets'>('all');

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
    <div className="p-6 bg-gray-50 min-h-[calc(100vh-140px)]">
      <div className="mb-6 flex justify-between items-end">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Comunidade</h2>
          <p className="text-sm text-gray-500">Quem participa do espaço</p>
        </div>
      </div>

      <div className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 mb-6 flex items-center">
        <Search size={20} className="text-gray-400 ml-2" />
        <input 
          type="text" 
          placeholder="Buscar..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-transparent border-none focus:ring-0 text-sm ml-2 outline-none p-1"
        />
      </div>

      <div className="flex gap-2 mb-6">
        <button 
          onClick={() => setFilter('all')}
          className={`flex-1 py-2 text-xs sm:text-sm font-medium rounded-xl transition-all ${filter === 'all' ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20' : 'bg-white text-gray-600 border border-gray-200'}`}
        >
          Todos
        </button>
        <button 
          onClick={() => setFilter('people')}
          className={`flex-1 py-2 text-xs sm:text-sm font-medium rounded-xl transition-all ${filter === 'people' ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20' : 'bg-white text-gray-600 border border-gray-200'}`}
        >
          Pessoas
        </button>
        <button 
          onClick={() => setFilter('pets')}
          className={`flex-1 py-2 text-xs sm:text-sm font-medium rounded-xl transition-all ${filter === 'pets' ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20' : 'bg-white text-gray-600 border border-gray-200'}`}
        >
          Pets
        </button>
      </div>

      {filter !== 'pets' && (
        <div className="mb-8">
          {filter === 'all' && <h3 className="text-sm font-bold text-gray-400 mb-4 uppercase tracking-wider">Pessoas</h3>}
          {filteredProfiles.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredProfiles.map(profile => {
                const familyPets = getFamilyPets(profile.uid);
                return (
                <div 
                  key={profile.uid} 
                  className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-4 cursor-pointer hover:border-blue-200 transition-colors"
                  onClick={() => setViewProfileId(profile.uid)}
                >
                  <div 
                    className={`w-16 h-16 rounded-2xl overflow-hidden bg-blue-50 flex-shrink-0 flex items-center justify-center text-blue-300 ${profile.photoUrl ? 'hover:opacity-90 active:scale-95 transition-all' : ''}`}
                  >
                    {profile.photoUrl ? (
                      <img src={profile.photoUrl} alt={profile.name} className="w-full h-full object-cover" />
                    ) : (
                      <User size={32} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-gray-800 truncate">{profile.name}</h4>
                    <p className="text-xs text-blue-600 font-medium capitalize mt-1 border border-blue-100 bg-blue-50 px-2 py-0.5 rounded-md w-max">{profile.role}</p>
                    {familyPets.length > 0 && (
                      <div className="mt-2 flex items-center gap-2">
                        <div className="text-xs text-gray-500 flex items-center bg-gray-50 rounded-lg px-2 py-1 w-max border border-gray-200">
                          <PawPrint size={12} className="mr-1.5 text-blue-500" />
                          <span className="truncate max-w-[120px] sm:max-w-[150px]">{familyPets.map(p => p.name).join(', ')}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )})}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400 text-sm bg-white rounded-3xl border border-dashed border-gray-200">
              Nenhuma pessoa encontrada
            </div>
          )}
        </div>
      )}

      {filter !== 'people' && (
        <div className="mb-8">
          {filter === 'all' && <h3 className="text-sm font-bold text-gray-400 mb-4 uppercase tracking-wider">Pets</h3>}
          {filteredPets.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredPets.map(pet => {
                const responsiblePeople = getFamilyMembers(pet.ownerId);
                return (
                  <div 
                    key={pet.id} 
                    className="bg-white p-4 rounded-3xl shadow-sm border border-orange-100 flex items-center gap-4 cursor-pointer hover:border-orange-300 transition-colors"
                    onClick={() => setViewPetId(pet.id)}
                  >
                    <div 
                      className={`w-16 h-16 rounded-full overflow-hidden bg-orange-50 flex-shrink-0 flex items-center justify-center text-orange-300 border-2 border-orange-100 p-0.5 ${pet.photoUrl ? 'hover:opacity-90 active:scale-95 transition-all' : ''}`}
                    >
                      {pet.photoUrl ? (
                        <img src={pet.photoUrl} alt={pet.name} className="w-full h-full object-cover rounded-full" />
                      ) : (
                        <PawPrint size={30} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-800 truncate">{pet.name}</h4>
                      {pet.breed && <p className="text-xs text-orange-600 font-medium mt-1">{pet.breed}</p>}
                      {responsiblePeople.length > 0 && (
                        <div className="mt-2 text-xs text-gray-500 flex items-center bg-gray-50 rounded-lg px-2 py-1 w-max border border-gray-200">
                          <User size={12} className="mr-1.5 text-blue-500" />
                          <span className="truncate max-w-[120px] sm:max-w-[150px]">{responsiblePeople.map(p => p.name).join(', ')}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
             <div className="text-center py-8 text-gray-400 text-sm bg-white rounded-3xl border border-dashed border-gray-200">
               Nenhum pet encontrado
             </div>
          )}
        </div>
      )}
    </div>
  );
}
