import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { updateProfile, addPet, updatePet, deletePet } from '../services/api';
import { User, Phone, Save, Loader2, Camera, Trash2, Plus, Edit2 } from 'lucide-react';

export function ProfileView() {
  const { user, myPets } = useApp();
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [userPhoto, setUserPhoto] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const userFileInputRef = useRef<HTMLInputElement>(null);

  // Pet form state
  const [showPetForm, setShowPetForm] = useState(false);
  const [editingPetId, setEditingPetId] = useState<string | null>(null);
  const [petName, setPetName] = useState('');
  const [petBreed, setPetBreed] = useState('');
  const [petFile, setPetFile] = useState<File | null>(null);
  const [petLoading, setPetLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    try {
      await updateProfile(user.uid, { name, phone }, userPhoto || undefined);
      alert('Perfil atualizado com sucesso!');
      setUserPhoto(null);
    } catch (err: any) {
      alert(`Erro ao atualizar perfil: ${err?.message || err}`);
    } finally {
      setLoading(false);
    }
  };

  const startEditPet = (pet: any) => {
    setEditingPetId(pet.id);
    setPetName(pet.name);
    setPetBreed(pet.breed);
    setPetFile(null);
    setShowPetForm(true);
  };

  const handleSavePet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setPetLoading(true);
    try {
      if (editingPetId) {
        await updatePet(editingPetId, { name: petName, breed: petBreed }, petFile || undefined);
      } else {
        await addPet({
          ownerId: user.uid,
          name: petName,
          breed: petBreed,
          photoUrl: ''
        }, petFile || undefined);
      }
      setShowPetForm(false);
      setEditingPetId(null);
      setPetName('');
      setPetBreed('');
      setPetFile(null);
    } catch (e) {
      alert(`Erro ao salvar pet: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setPetLoading(false);
    }
  };

  const handleDeletePet = async (id: string, pName: string) => {
    if(confirm(`Tem certeza que deseja remover ${pName}?`)) {
      await deletePet(id);
    }
  };

  return (
    <div className="p-6 max-w-lg mx-auto pb-24 space-y-6">
      <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex flex-col items-center text-center">
        <div className="relative mb-4 group cursor-pointer" onClick={() => userFileInputRef.current?.click()}>
          <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-2xl font-bold uppercase overflow-hidden border-2 border-white shadow-sm ring-2 ring-gray-100">
            {userPhoto ? (
              <img src={URL.createObjectURL(userPhoto)} alt="preview" className="w-full h-full object-cover" />
            ) : user?.photoUrl ? (
              <img src={user.photoUrl} alt="preview" className="w-full h-full object-cover" />
            ) : (
              user?.name.charAt(0) || 'U'
            )}
          </div>
          <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <Camera size={20} className="text-white" />
          </div>
        </div>
        <input type="file" accept="image/*" ref={userFileInputRef} onChange={e => setUserPhoto(e.target.files?.[0] || null)} className="hidden" />
        <h2 className="text-xl font-semibold text-gray-800">{user?.name}</h2>
        <p className="text-gray-500 text-sm capitalize">{user?.role === 'admin' ? 'Administrador' : 'Morador'}</p>
        <p className="text-gray-400 text-xs mt-1">{user?.email}</p>
      </div>

      <form onSubmit={handleSave} className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
        <h3 className="font-semibold text-gray-800 text-lg mb-2">Editar Dados</h3>
        <div>
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 flex items-center">
            <User size={14} className="mr-1" /> Nome de Exibição
          </label>
          <input 
            required
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-gray-700"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 flex items-center">
            <Phone size={14} className="mr-1" /> Celular (WhatsApp)
          </label>
          <input 
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="ex: 11999999999"
            className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-gray-700"
          />
        </div>
        <button 
          disabled={loading}
          type="submit"
          className="w-full mt-4 bg-gray-900 active:bg-black text-white py-4 rounded-2xl font-medium flex items-center justify-center transition-all disabled:opacity-50"
        >
          {loading ? <Loader2 size={20} className="animate-spin" /> : <><Save size={20} className="mr-2" /> Salvar Perfil</>}
        </button>
      </form>

      {/* Pets Section */}
      <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-semibold text-gray-800 text-lg">Meus Pets</h3>
          {!showPetForm && (
            <button onClick={() => setShowPetForm(true)} className="text-blue-600 bg-blue-50 p-2 rounded-xl active:scale-95 transition-transform">
              <Plus size={18} />
            </button>
          )}
        </div>

        {myPets.length === 0 && !showPetForm && (
          <p className="text-gray-500 text-sm italic">Nenhum pet cadastrado.</p>
        )}

        <div className="space-y-3">
          {myPets.map(p => (
            <div key={p.id} className="flex items-center gap-4 bg-gray-50 p-3 rounded-2xl border border-gray-100">
              <div className="w-12 h-12 bg-gray-200 rounded-full overflow-hidden flex-shrink-0 flex justify-center items-center">
                {p.photoUrl ? (
                  <img src={p.photoUrl} alt={p.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xl text-gray-400 text-center w-full">🐾</span>
                )}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-800">{p.name}</p>
                <p className="text-xs text-gray-500">{p.breed || 'Sem raça'}</p>
              </div>
              <button type="button" onClick={() => startEditPet(p)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-xl transition-colors">
                <Edit2 size={18} />
              </button>
              <button type="button" onClick={() => handleDeletePet(p.id, p.name)} className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors">
                <Trash2 size={18} />
              </button>
            </div>
          ))}
        </div>

        {showPetForm && (
          <form onSubmit={handleSavePet} className="mt-4 pt-4 border-t border-gray-100 space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 block">Nome do Pet</label>
              <input required value={petName} onChange={e => setPetName(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 block">Raça</label>
              <input value={petBreed} onChange={e => setPetBreed(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 block">Foto (opcional)</label>
              <input type="file" accept="image/*" ref={fileInputRef} onChange={e => setPetFile(e.target.files?.[0] || null)} className="hidden" />
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => fileInputRef.current?.click()} className="bg-gray-100 text-gray-700 px-3 py-2 border border-gray-200 rounded-xl text-sm flex items-center shadow-sm">
                  <Camera size={16} className="mr-2" /> Escolher Foto
                </button>
                <span className="text-xs text-gray-500 truncate max-w-[150px]">{petFile?.name || 'Nenhuma selecionada'}</span>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => { setShowPetForm(false); setEditingPetId(null); }} className="flex-1 text-sm bg-gray-100 text-gray-600 py-2.5 rounded-xl font-medium">Cancelar</button>
              <button disabled={petLoading} type="submit" className="flex-1 text-sm bg-blue-600 text-white py-2.5 rounded-xl font-medium flex items-center justify-center disabled:opacity-50">
                {petLoading ? <Loader2 size={16} className="animate-spin" /> : (editingPetId ? 'Salvar Pet' : 'Adicionar Pet')}
              </button>
            </div>
          </form>
        )}
      </div>

    </div>
  );
}
