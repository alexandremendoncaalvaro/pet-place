import { describe, expect, it } from 'vitest';
import { buildMentionEntities, filterMentionEntities, resolveMentionNotificationTargets } from './mentions';
import { Pet, UserProfile } from './types';

const profiles: UserProfile[] = [
  profile('author', 'Alexandre', 'fam_a'),
  profile('mother', 'Marielle', 'fam_a'),
  profile('other', 'Bruna', 'fam_b'),
];

const pets: Pet[] = [
  { id: 'pet_francisca', ownerId: 'author', name: 'Francisca', photoUrl: '', breed: '', createdAt: '2026-05-03T00:00:00.000Z' },
  { id: 'pet_luna', ownerId: 'other', name: 'Luna', photoUrl: '', breed: '', createdAt: '2026-05-03T00:00:00.000Z' },
];

describe('mentions', () => {
  it('builds searchable people and pet options without the current user profile', () => {
    const entities = buildMentionEntities(profiles, pets, 'author');

    expect(entities.map((entity) => entity.id)).not.toContain('author');
    expect(filterMentionEntities(entities, 'fran', [])).toMatchObject([{ id: 'pet_francisca', kind: 'pet' }]);
    expect(filterMentionEntities(entities, 'mari', [])).toMatchObject([{ id: 'mother', kind: 'profile' }]);
  });

  it('notifies only the tagged person when a profile is mentioned', () => {
    expect(resolveMentionNotificationTargets(['other'], 'author', profiles, pets)).toEqual(['other']);
  });

  it('notifies other family members when a pet owned by the author family is mentioned', () => {
    expect(resolveMentionNotificationTargets(['pet_francisca'], 'author', profiles, pets)).toEqual(['mother']);
  });

  it('notifies the whole owner family when a pet from another family is mentioned', () => {
    expect(resolveMentionNotificationTargets(['pet_luna'], 'author', profiles, pets)).toEqual(['other']);
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
