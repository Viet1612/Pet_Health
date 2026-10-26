import { Link } from '@tanstack/react-router';

import { m } from '../../i18n';
import { UnblockButton } from './BlockControls';
import { FollowButton } from './FollowButton';
import type { Person } from './queries';
import { UserAvatar } from './UserAvatar';

/** Một người trong danh sách (tìm kiếm, người theo dõi): avatar, tên, @username, nút Theo dõi. */
export function PersonRow({ person }: { person: Person }) {
  return (
    <li className="flex items-center gap-3 py-2">
      <Link
        to="/u/$username"
        params={{ username: person.username }}
        className="flex min-h-11 min-w-0 flex-1 items-center gap-3"
      >
        <UserAvatar profile={person} size={40} />
        <span className="min-w-0">
          <span className="text-body block truncate font-semibold">{person.displayName}</span>
          <span className="text-small text-text-muted block truncate">@{person.username}</span>
        </span>
      </Link>
      {person.isMe ? (
        <span className="text-small text-text-muted shrink-0">{m.social.follow.you}</span>
      ) : person.blockedByMe ? (
        // Người mình đã chặn vẫn hiện trong tìm kiếm để bỏ chặn (F-12).
        <UnblockButton username={person.username} />
      ) : (
        <FollowButton username={person.username} following={person.followedByMe} size="sm" />
      )}
    </li>
  );
}

export function PeopleList({ people }: { people: Person[] }) {
  return (
    <ul className="divide-divider m-0 flex list-none flex-col divide-y p-0">
      {people.map((p) => (
        <PersonRow key={p.username} person={p} />
      ))}
    </ul>
  );
}
