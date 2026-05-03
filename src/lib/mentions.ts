import { Pet, UserProfile } from './types';

export type MentionEntity =
  | { id: string; kind: 'profile'; name: string; searchText: string; profile: UserProfile }
  | { id: string; kind: 'pet'; name: string; searchText: string; pet: Pet; owner?: UserProfile };

export function buildMentionEntities(profiles: UserProfile[], pets: Pet[], _currentUserId?: string): MentionEntity[] {
  const profileEntities: MentionEntity[] = profiles
    .map((profile) => ({
      id: profile.uid,
      kind: 'profile',
      name: profile.name,
      searchText: normalizeMentionText(`${profile.name} ${profile.email || ''} ${profile.dogName || ''}`),
      profile,
    }));

  const petEntities: MentionEntity[] = pets.map((pet) => {
    const owner = profiles.find((profile) => profile.uid === pet.ownerId);
    return {
      id: pet.id,
      kind: 'pet',
      name: pet.name,
      searchText: normalizeMentionText(`${pet.name} ${pet.breed || ''} ${owner?.name || ''}`),
      pet,
      owner,
    };
  });

  return [...profileEntities, ...petEntities].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
}

export function filterMentionEntities(entities: MentionEntity[], query: string, selectedIds: string[], limit = 6) {
  const normalizedQuery = normalizeMentionText(query);
  return entities
    .filter((entity) => !selectedIds.includes(entity.id))
    .filter((entity) => !normalizedQuery || entity.searchText.includes(normalizedQuery))
    .slice(0, limit);
}

export function resolveMentionNotificationTargets(
  tagIds: string[],
  actorUid: string,
  profiles: UserProfile[],
  pets: Pet[],
) {
  const targetUids = new Set<string>();

  tagIds.forEach((tagId) => {
    const taggedUser = profiles.find((profile) => profile.uid === tagId);
    if (taggedUser) {
      targetUids.add(taggedUser.uid);
      return;
    }

    const taggedPet = pets.find((pet) => pet.id === tagId);
    if (!taggedPet) return;

    const owner = profiles.find((profile) => profile.uid === taggedPet.ownerId);
    if (!owner) {
      targetUids.add(taggedPet.ownerId);
      return;
    }

    const familyId = owner.familyId || owner.uid;
    profiles
      .filter((profile) => (profile.familyId || profile.uid) === familyId)
      .forEach((profile) => targetUids.add(profile.uid));
  });

  targetUids.delete(actorUid);
  return [...targetUids];
}

export function normalizeMentionText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}
