import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { useEffect, useState } from 'react';

import { m } from '../../i18n';
import { ErrorState } from '../../ui/ErrorState';
import { Skeleton } from '../../ui/Skeleton';
import { TextField } from '../../ui/TextField';
import { PeopleList } from './PeopleList';
import { searchQuery } from './queries';

const t = m.social.search;

/** Màn Tìm người (F-07): gõ xong 300 ms mới tìm; kết quả có nút Theo dõi tại chỗ. */
export function SearchScreen() {
  const [text, setText] = useState('');
  const [term, setTerm] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => {
      setTerm(text.trim().slice(0, 30));
    }, 300);
    return () => {
      clearTimeout(timer);
    };
  }, [text]);
  const results = useQuery({ ...searchQuery(term), enabled: term.length > 0 });

  return (
    <div className="mx-auto flex w-full max-w-[760px] flex-col gap-4">
      <h1 className="text-h1">{t.title}</h1>
      <div className="relative">
        <TextField
          label={t.label}
          type="search"
          autoFocus
          autoCapitalize="none"
          spellCheck={false}
          maxLength={30}
          placeholder={t.placeholder}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
          }}
        />
        <Search size={18} aria-hidden className="text-text-muted absolute right-3 bottom-3.5" />
      </div>
      {term.length === 0 ? (
        <p className="text-small text-text-muted">{t.hint}</p>
      ) : results.isPending ? (
        <div aria-busy="true" className="flex flex-col gap-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-14" />
          ))}
        </div>
      ) : results.isError ? (
        <ErrorState kind="server" onRetry={() => void results.refetch()} />
      ) : results.data.length === 0 ? (
        <p className="text-body text-text-muted py-6 text-center">{t.empty(term)}</p>
      ) : (
        <section aria-live="polite" className="bg-surface shadow-card rounded-lg px-4 py-1">
          <PeopleList people={results.data} />
        </section>
      )}
    </div>
  );
}
