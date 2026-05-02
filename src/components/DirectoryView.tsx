import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Search, User, PawPrint, X } from 'lucide-react';

export function DirectoryView() {
  const { publicProfiles, allPets } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'people' | 'pets'>('all');
  const [fullscreenImage, setFullscreenImage] = useState<{url: string, title: string} | null>(null);

  const filteredProfiles = publicProfiles.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredPets = allPets.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.breed && p.breed.toLowerCase().includes(searchTerm.toLowerCase()))
  );

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
          {filter === 'all' && <h3 className="text-sm font-bold text-gray-400 mb-4 uppercase tracking-wider">Moradores</h3>}
          {filteredProfiles.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredProfiles.map(profile => (
                <div key={profile.uid} className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-4">
                  <div 
                    className={`w-16 h-16 rounded-2xl overflow-hidden bg-blue-50 flex-shrink-0 flex items-center justify-center text-blue-300 ${profile.photoUrl ? 'cursor-pointer hover:opacity-90 active:scale-95 transition-all' : ''}`}
                    onClick={() => profile.photoUrl && setFullscreenImage({url: profile.photoUrl, title: profile.name})}
                  >
                    {profile.photoUrl ? (
                      <img src={profile.photoUrl} alt={profile.name} className="w-full h-full object-cover" />
                    ) : (
                      <User size={32} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-gray-800 truncate">{profile.name}</h4>
                    <p className="text-xs text-blue-600 font-medium capitalize mt-1">{profile.role}</p>
                    {profile.dogName && (
                      <div className="mt-2 text-xs text-gray-500 flex items-center bg-gray-50 rounded-lg px-2 py-1 w-max">
                        <PawPrint size={12} className="mr-1.5" />
                        Tutor de: <strong className="ml-1 text-gray-700">{profile.dogName}</strong>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400 text-sm bg-white rounded-3xl border border-dashed border-gray-200">
              Nenhuma pessoa encontrada
            </div>
          )}
        </div>
      )}

      {filter !== 'people' && (
        <div>
          {filter === 'all' && <h3 className="text-sm font-bold text-gray-400 mb-4 uppercase tracking-wider">Pets</h3>}
          {filteredPets.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredPets.map(pet => {
                const owner = publicProfiles.find(p => p.uid === pet.ownerId);
                return (
                  <div key={pet.id} className="bg-white p-4 rounded-3xl shadow-sm border border-orange-100 flex items-center gap-4">
                    <div 
                      className={`w-16 h-16 rounded-full overflow-hidden bg-orange-50 flex-shrink-0 flex items-center justify-center text-orange-300 border-2 border-orange-100 p-0.5 ${pet.photoUrl ? 'cursor-pointer hover:opacity-90 active:scale-95 transition-all' : ''}`}
                      onClick={() => pet.photoUrl && setFullscreenImage({url: pet.photoUrl, title: pet.name})}
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
                      {owner && (
                        <div className="mt-2 text-xs text-gray-500 flex items-center bg-gray-50 rounded-lg px-2 py-1 w-max">
                          <User size={12} className="mr-1.5" />
                          Tutor: <strong className="ml-1 text-gray-700">{owner.name}</strong>
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

      {fullscreenImage && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setFullscreenImage(null)}
        >
          <button 
            className="absolute top-4 right-4 p-2 text-white/70 hover:text-white bg-black/50 rounded-full transition-colors"
            onClick={() => setFullscreenImage(null)}
          >
            <X size={24} />
          </button>
          <div className="max-w-4xl w-full max-h-[90vh] flex flex-col items-center gap-4" onClick={e => e.stopPropagation()}>
            <img 
              src={fullscreenImage.url} 
              alt={fullscreenImage.title} 
              className="max-w-full max-h-[85vh] object-contain rounded-lg"
            />
            <p className="text-white font-medium bg-black/50 px-4 py-2 rounded-full">{fullscreenImage.title}</p>
          </div>
        </div>
      )}
    </div>
  );
}
