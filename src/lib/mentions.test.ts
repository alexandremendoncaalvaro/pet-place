import { describe, expect, it } from 'vitest';
import { buildMentionEntities, filterMentionEntities, resolveMentionNotificationTargets } from './mentions';
import { Pet, UserProfile } from './types';

const profiles: UserProfile[] = [
  profile('author', 'Tutor Azul', 'fam_a'),
  profile('family_member', 'Tutor Verde', 'fam_a'),
  profile('other', 'Tutor Laranja', 'fam_b'),
];

const pets: Pet[] = [
  { id: 'pet_sol', ownerId: 'author', name: 'Pet Sol', photoUrl: '', breed: '', createdAt: '2026-05-03T00:00:00.000Z' },
  { id: 'pet_lua', ownerId: 'other', name: 'Pet Lua', photoUrl: '', breed: '', createdAt: '2026-05-03T00:00:00.000Z' },
];

describe('mentions', () => {
  it('builds searchable people and pet options including the current user profile', () => {
    const entities = buildMentionEntities(profiles, pets, 'author');

    expect(entities.map((entity) => entity.id)).toContain('author');
    expect(filterMentionEntities(entities, 'sol', [])).toMatchObject([{ id: 'pet_sol', kind: 'pet' }]);
    expect(filterMentionEntities(entities, 'ver', [])).toMatchObject([{ id: 'family_member', kind: 'profile' }]);
  });

  it('notifies only the tagged person when a profile is mentioned', () => {
    expect(resolveMentionNotificationTargets(['other'], 'author', profiles, pets)).toEqual(['other']);
  });

  it('notifies other family members when a pet owned by the author family is mentioned', () => {
    expect(resolveMentionNotificationTargets(['pet_sol'], 'author', profiles, pets)).toEqual(['family_member']);
  });

  it('notifies the whole owner family when a pet from another family is mentioned', () => {
    expect(resolveMentionNotificationTargets(['pet_lua'], 'author', profiles, pets)).toEqual(['other']);
  });
});

function profile(uid: string, name: string, familyId: string): UserProfile {
  return {
    uid,
    name,
    familyId,
    phone: '',
    dogName: '',
    role: 'resident',
    email: `${uid}@example.com`,
    createdAt: '2026-05-03T00:00:00.000Z',
  };
}
