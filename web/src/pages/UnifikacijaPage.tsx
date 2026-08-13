import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { apiService } from '../utils/api';
import { CanonicalCarrier, PendingCarrier, CarrierAlias } from '../types';
import * as S from '../components/styled/Common';
import Logo from '../components/Logo';

// ─── Styled Components ────────────────────────────────────────────────────────

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${({ theme }) => theme.spacing.large};
  width: 100%;
`;

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.medium};
`;

const HeaderTitle = styled.h1`
  margin: 0;
  color: ${({ theme }) => theme.colors.text};
  font-size: 1.5rem;
`;

const Tabs = styled.div`
  display: flex;
  gap: 4px;
  margin-bottom: 16px;
  border-bottom: 2px solid ${({ theme }) => theme.colors.gray};
`;

const Tab = styled.button<{ active?: boolean }>`
  padding: 10px 18px;
  border: none;
  background: ${({ active, theme }) => (active ? theme.colors.primary : 'transparent')};
  color: ${({ active, theme }) => (active ? 'white' : theme.colors.text)};
  border-radius: 4px 4px 0 0;
  cursor: pointer;
  font-size: 0.95rem;
  font-weight: ${({ active }) => (active ? 600 : 500)};
  margin-bottom: -2px;

  &:hover {
    background: ${({ active, theme }) => (active ? theme.colors.primary : theme.colors.background)};
  }
`;

const Toolbar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
`;

const SearchInput = styled.input`
  padding: 8px 12px;
  border-radius: 4px;
  border: 1px solid ${({ theme }) => theme.colors.gray};
  background-color: ${({ theme }) => theme.colors.white};
  font-size: 1rem;
  flex: 1;
  min-width: 200px;
  max-width: 400px;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
  }
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  background: ${({ theme }) => theme.colors.white};
  border-radius: ${({ theme }) => theme.borderRadius};
  box-shadow: ${({ theme }) => theme.shadows.main};
  overflow: hidden;
`;

const Th = styled.th`
  text-align: left;
  padding: 12px 16px;
  background: ${({ theme }) => theme.colors.primary};
  color: white;
  font-weight: 600;
  font-size: 0.9rem;
`;

const Td = styled.td`
  padding: 10px 16px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.gray};
  color: ${({ theme }) => theme.colors.text};
  font-size: 0.95rem;
  vertical-align: middle;
`;

const Tr = styled.tr<{ highlight?: boolean }>`
  background: ${({ highlight }) => (highlight ? '#fffde7' : 'transparent')};
  &:last-child td {
    border-bottom: none;
  }
  &:hover {
    background: ${({ highlight, theme }) => (highlight ? '#fff9c4' : theme.colors.background)};
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
`;

const SmallButton = styled.button<{ variant?: 'danger' | 'success' | 'secondary' | 'add' }>`
  padding: 5px 12px;
  border-radius: 4px;
  border: none;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 500;
  white-space: nowrap;
  background-color: ${({ variant, theme }) =>
    variant === 'danger'
      ? '#e53935'
      : variant === 'success'
      ? '#43a047'
      : variant === 'secondary'
      ? theme.colors.gray
      : variant === 'add'
      ? '#fb8c00'
      : theme.colors.primary};
  color: ${({ variant, theme }) => (variant === 'secondary' ? theme.colors.text : 'white')};
  transition: opacity 0.2s;

  &:hover {
    opacity: 0.85;
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const StatusMessage = styled.div<{ isError?: boolean }>`
  padding: 10px 16px;
  border-radius: 4px;
  margin-bottom: 16px;
  background-color: ${({ isError }) => (isError ? '#fdecea' : '#e8f5e9')};
  color: ${({ isError }) => (isError ? '#c62828' : '#2e7d32')};
  font-size: 0.9rem;
`;

const Badge = styled.span<{ tone?: 'ok' | 'warn' | 'info' }>`
  background: ${({ tone }) => (tone === 'ok' ? '#43a047' : tone === 'warn' ? '#fb8c00' : '#1565c0')};
  color: white;
  border-radius: 12px;
  padding: 2px 10px;
  font-size: 0.8rem;
  margin-left: 6px;
  white-space: nowrap;
`;

const Tag = styled.span<{ tone?: 'ok' | 'warn' | 'info' }>`
  font-size: 0.75rem;
  display: inline-block;
  border-radius: 4px;
  padding: 1px 6px;
  white-space: nowrap;
  color: ${({ tone }) => (tone === 'ok' ? '#2e7d32' : tone === 'warn' ? '#f57f17' : '#1565c0')};
  background: ${({ tone }) =>
    tone === 'ok' ? '#e8f5e9' : tone === 'warn' ? '#fff9c4' : '#e3f2fd'};
  border: 1px solid
    ${({ tone }) => (tone === 'ok' ? '#66bb6a' : tone === 'warn' ? '#f9a825' : '#64b5f6')};
`;

const Arrow = styled.span`
  color: #888;
  margin: 0 8px;
`;

const VariantList = styled.div`
  font-size: 0.78rem;
  color: #888;
  margin-top: 3px;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.spacing.large};
  color: ${({ theme }) => theme.colors.text};
  background: ${({ theme }) => theme.colors.white};
  border-radius: ${({ theme }) => theme.borderRadius};
  box-shadow: ${({ theme }) => theme.shadows.main};
`;

const LoadingState = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.spacing.large};
  color: ${({ theme }) => theme.colors.primary};
`;

const FilterToggle = styled.label`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.9rem;
  color: ${({ theme }) => theme.colors.text};
  cursor: pointer;
  white-space: nowrap;
`;

const Intro = styled.div`
  background: #e3f2fd;
  border: 1px solid #90caf9;
  border-radius: 4px;
  padding: 12px 16px;
  margin-bottom: 16px;
  font-size: 0.88rem;
  color: #0d47a1;
  line-height: 1.5;
`;

// ─── Searchable canonical-name picker ────────────────────────────────────────

const PickerWrap = styled.div`
  position: relative;
  min-width: 260px;
  flex: 1;
`;

const PickerInput = styled.input`
  width: 100%;
  padding: 6px 10px;
  border-radius: 4px;
  border: 1px solid ${({ theme }) => theme.colors.primary};
  font-size: 0.9rem;
  &:focus {
    outline: none;
  }
`;

const PickerList = styled.ul`
  position: absolute;
  z-index: 20;
  top: calc(100% + 2px);
  left: 0;
  right: 0;
  max-height: 260px;
  overflow-y: auto;
  margin: 0;
  padding: 0;
  list-style: none;
  background: white;
  border: 1px solid #bbb;
  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
`;

const PickerOption = styled.li<{ active?: boolean }>`
  padding: 7px 10px;
  font-size: 0.88rem;
  cursor: pointer;
  background: ${({ active }) => (active ? '#e3f2fd' : 'transparent')};
  &:hover {
    background: #e3f2fd;
  }
`;

const PickerEmpty = styled.li`
  padding: 7px 10px;
  font-size: 0.85rem;
  color: #888;
  font-style: italic;
`;

/** Fold Croatian diacritics so typing "GARIC" finds "GARIĆ". */
const fold = (value: string): string =>
  value
    .toUpperCase()
    .replace(/Č|Ć/g, 'C')
    .replace(/Š/g, 'S')
    .replace(/Ž/g, 'Z')
    .replace(/Đ/g, 'D')
    .replace(/\s+/g, ' ')
    .trim();

interface PickerProps {
  options: CanonicalCarrier[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const CanonicalPicker: React.FC<PickerProps> = ({ options, value, onChange, placeholder }) => {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Keep the text in sync when the parent resets the selection.
  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    const onDocMouseDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, []);

  const matches = useMemo(() => {
    const q = fold(query);
    if (!q) return options;
    return options.filter(o => fold(o.name).includes(q));
  }, [options, query]);

  const select = (name: string) => {
    setQuery(name);
    onChange(name);
    setOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActiveIndex(i => Math.min(i + 1, matches.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      if (open && matches[activeIndex]) {
        e.preventDefault();
        select(matches[activeIndex].name);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <PickerWrap ref={wrapRef}>
      <PickerInput
        value={query}
        placeholder={placeholder || 'Odaberite unificirani naziv…'}
        onChange={e => {
          setQuery(e.target.value);
          setActiveIndex(0);
          setOpen(true);
          // Typing invalidates the confirmed pick until an option is chosen.
          if (value) onChange('');
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
      />
      {open && (
        <PickerList>
          {matches.length === 0 ? (
            <PickerEmpty>Nema podudaranja na unificiranoj listi.</PickerEmpty>
          ) : (
            matches.slice(0, 100).map((o, i) => (
              <PickerOption
                key={o._id}
                active={i === activeIndex}
                onMouseEnter={() => setActiveIndex(i)}
                onMouseDown={e => {
                  // Pick before the input's blur can close the list.
                  e.preventDefault();
                  select(o.name);
                }}
              >
                {o.name}
              </PickerOption>
            ))
          )}
        </PickerList>
      )}
    </PickerWrap>
  );
};

// ─── Page ────────────────────────────────────────────────────────────────────

type TabKey = 'pending' | 'rules' | 'list';

const UnifikacijaPage: React.FC = () => {
  const navigate = useNavigate();

  const [tab, setTab] = useState<TabKey>('pending');
  const [pending, setPending] = useState<PendingCarrier[]>([]);
  const [aliases, setAliases] = useState<CarrierAlias[]>([]);
  const [canonicals, setCanonicals] = useState<CanonicalCarrier[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<{ message: string; isError: boolean } | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [showUnmappedOnly, setShowUnmappedOnly] = useState(true);

  // Chosen target per pending row, keyed by the row's carrier key.
  const [targets, setTargets] = useState<Record<string, string>>({});

  // "Unificirana lista" tab: manual add + rule editing
  const [newCanonical, setNewCanonical] = useState('');
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [editingRuleTarget, setEditingRuleTarget] = useState('');

  const showStatus = (message: string, isError = false) => {
    setStatus({ message, isError });
    setTimeout(() => setStatus(null), 5000);
  };

  const errorText = (err: any, fallback: string) =>
    err?.response?.data?.message || fallback;

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [pendingData, aliasData, canonicalData] = await Promise.all([
        apiService.getPendingCarriers(),
        apiService.getCarrierAliases(),
        apiService.getCanonicalCarriers(),
      ]);
      setPending(pendingData);
      setAliases(aliasData);
      setCanonicals(canonicalData);
    } catch (err) {
      showStatus(errorText(err, 'Greška pri dohvaćanju podataka.'), true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const unmappedCount = useMemo(
    () => pending.filter(p => p.status === 'unmapped').length,
    [pending]
  );
  const staleCount = useMemo(() => pending.filter(p => p.status === 'mapped').length, [pending]);

  const filteredPending = useMemo(() => {
    let rows = pending;
    if (showUnmappedOnly) rows = rows.filter(r => r.status !== 'canonical');
    const q = fold(searchQuery);
    if (!q) return rows;
    return rows.filter(
      r => fold(r.value).includes(q) || fold(r.mappedTo || r.canonicalName || '').includes(q)
    );
  }, [pending, searchQuery, showUnmappedOnly]);

  const filteredAliases = useMemo(() => {
    const q = fold(searchQuery);
    if (!q) return aliases;
    return aliases.filter(a => fold(a.from).includes(q) || fold(a.to).includes(q));
  }, [aliases, searchQuery]);

  const filteredCanonicals = useMemo(() => {
    const q = fold(searchQuery);
    if (!q) return canonicals;
    return canonicals.filter(c => fold(c.name).includes(q));
  }, [canonicals, searchQuery]);

  // ── Actions ─────────────────────────────────────────────────────────────────

  const handleUnify = async (row: PendingCarrier) => {
    const target = targets[row.key];
    if (!target) return;

    if (
      !window.confirm(
        `Sve stavke s Prijevoznik "${row.value}" (${row.count}) bit će promijenjene u "${target}".\n\n` +
          `Ubuduće će se svaka nova stavka s tim nazivom automatski preimenovati.\n\nNastaviti?`
      )
    )
      return;

    setBusyKey(row.key);
    try {
      const result = await apiService.createCarrierAlias(row.value, target);
      await fetchAll();
      setTargets(prev => {
        const next = { ...prev };
        delete next[row.key];
        return next;
      });
      showStatus(
        `"${row.value}" → "${target}". Ažurirano stavki: ${result.itemsUpdated}. Pravilo je aktivno.`
      );
    } catch (err) {
      showStatus(errorText(err, 'Greška pri unifikaciji.'), true);
    } finally {
      setBusyKey(null);
    }
  };

  const handleAddCurrentToList = async (row: PendingCarrier) => {
    if (
      !window.confirm(
        `Dodati "${row.value}" na unificiranu listu kao novi naziv?\n\n` +
          `Koristite ovo samo ako je to ispravan naziv prijevoznika koji još nije na listi.`
      )
    )
      return;

    setBusyKey(row.key);
    try {
      await apiService.addCanonicalCarrier(row.value);
      await fetchAll();
      showStatus(`"${row.value}" dodan na unificiranu listu.`);
    } catch (err) {
      showStatus(errorText(err, 'Greška pri dodavanju na listu.'), true);
    } finally {
      setBusyKey(null);
    }
  };

  const handleReapply = async (rule: CarrierAlias) => {
    setBusyKey(rule._id);
    try {
      const result = await apiService.applyCarrierAlias(rule._id);
      await fetchAll();
      showStatus(`Pravilo ponovno primijenjeno. Ažurirano stavki: ${result.itemsUpdated}.`);
    } catch (err) {
      showStatus(errorText(err, 'Greška pri primjeni pravila.'), true);
    } finally {
      setBusyKey(null);
    }
  };

  const handleSaveRuleTarget = async (rule: CarrierAlias) => {
    if (!editingRuleTarget) return;
    setBusyKey(rule._id);
    try {
      const result = await apiService.updateCarrierAlias(rule._id, editingRuleTarget);
      await fetchAll();
      setEditingRuleId(null);
      setEditingRuleTarget('');
      showStatus(
        `Pravilo promijenjeno u "${editingRuleTarget}". Ažurirano stavki: ${result.itemsUpdated}.`
      );
    } catch (err) {
      showStatus(errorText(err, 'Greška pri spremanju pravila.'), true);
    } finally {
      setBusyKey(null);
    }
  };

  const handleDeleteRule = async (rule: CarrierAlias) => {
    if (
      !window.confirm(
        `Obrisati pravilo "${rule.from}" → "${rule.to}"?\n\n` +
          `Već preimenovane stavke ostaju nepromijenjene, ali nove stavke s nazivom ` +
          `"${rule.from}" više se neće automatski preimenovati.`
      )
    )
      return;

    setBusyKey(rule._id);
    try {
      await apiService.deleteCarrierAlias(rule._id);
      await fetchAll();
      showStatus('Pravilo obrisano.');
    } catch (err) {
      showStatus(errorText(err, 'Greška pri brisanju pravila.'), true);
    } finally {
      setBusyKey(null);
    }
  };

  const handleAddCanonical = async () => {
    if (!newCanonical.trim()) return;
    setBusyKey('new-canonical');
    try {
      await apiService.addCanonicalCarrier(newCanonical.trim());
      setNewCanonical('');
      await fetchAll();
      showStatus('Naziv dodan na unificiranu listu.');
    } catch (err) {
      showStatus(errorText(err, 'Greška pri dodavanju naziva.'), true);
    } finally {
      setBusyKey(null);
    }
  };

  const handleDeleteCanonical = async (entry: CanonicalCarrier) => {
    if (!window.confirm(`Ukloniti "${entry.name}" s unificirane liste?`)) return;
    setBusyKey(entry._id);
    try {
      await apiService.deleteCanonicalCarrier(entry._id);
      await fetchAll();
      showStatus(`"${entry.name}" uklonjen s liste.`);
    } catch (err) {
      showStatus(errorText(err, 'Greška pri brisanju naziva.'), true);
    } finally {
      setBusyKey(null);
    }
  };

  const handleSeed = async () => {
    if (
      !window.confirm(
        'Ovo će dodati sve nazive iz datoteke carriers.json koji još nisu na listi.\n' +
          'Postojeći nazivi ostaju nepromijenjeni.\n\nNastaviti?'
      )
    )
      return;

    setBusyKey('seed');
    try {
      const result = await apiService.seedCanonicalCarriers();
      await fetchAll();
      showStatus(`Uvoz završen: ${result.inserted} novih. Ukupno na listi: ${result.total}.`);
    } catch (err) {
      showStatus(errorText(err, 'Greška pri uvozu liste.'), true);
    } finally {
      setBusyKey(null);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  const renderPendingTab = () => (
    <>
      <Intro>
        Ispod su svi nazivi prijevoznika koji se trenutno nalaze na stavkama. Za svaki naziv koji
        nije na unificiranoj listi odaberite ispravan naziv i kliknite <strong>Unificiraj</strong> —
        sve postojeće stavke bit će odmah preimenovane, a svaka nova stavka s tim nazivom
        automatski se preimenuje ubuduće.
      </Intro>

      <Toolbar>
        <SearchInput
          placeholder="Pretraži prijevoznike…"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
        <FilterToggle>
          <input
            type="checkbox"
            checked={showUnmappedOnly}
            onChange={e => setShowUnmappedOnly(e.target.checked)}
          />
          Sakrij već unificirane
        </FilterToggle>
      </Toolbar>

      {filteredPending.length === 0 ? (
        <EmptyState>
          <p>
            {pending.length === 0
              ? 'Nema stavki s upisanim prijevoznikom.'
              : 'Nema prijevoznika za unifikaciju — sve je usklađeno.'}
          </p>
        </EmptyState>
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Trenutni Prijevoznik</Th>
              <Th style={{ width: '90px' }}>Stavki</Th>
              <Th style={{ width: '46%' }}>Unificirati u</Th>
            </tr>
          </thead>
          <tbody>
            {filteredPending.map(row => (
              <Tr key={row.key} highlight={row.status === 'unmapped'}>
                <Td>
                  <strong>{row.value}</strong>
                  {row.status === 'canonical' && (
                    <>
                      {' '}
                      <Tag tone="ok">unificiran</Tag>
                    </>
                  )}
                  {row.status === 'mapped' && (
                    <>
                      {' '}
                      <Tag tone="info">pravilo postoji</Tag>
                    </>
                  )}
                  {row.variants.length > 1 && (
                    <VariantList>
                      Varijante: {row.variants.map(v => `${v.value} (${v.count})`).join(', ')}
                    </VariantList>
                  )}
                </Td>
                <Td>{row.count}</Td>
                <Td>
                  {row.status === 'canonical' ? (
                    <span style={{ color: '#2e7d32' }}>✓ Već je unificirani naziv</span>
                  ) : row.status === 'mapped' ? (
                    <ButtonGroup>
                      <span>
                        <Arrow>→</Arrow>
                        <strong>{row.mappedTo}</strong>
                      </span>
                      <SmallButton
                        variant="add"
                        disabled={busyKey === row.key}
                        onClick={() => {
                          const rule = aliases.find(a => a.fromKey === row.key);
                          if (rule) handleReapply(rule);
                        }}
                        title="Stavke s ovim nazivom još postoje — pokreni preimenovanje"
                      >
                        {busyKey === row.key ? 'Primjenjuje…' : 'Primijeni na stavke'}
                      </SmallButton>
                    </ButtonGroup>
                  ) : (
                    <ButtonGroup>
                      <CanonicalPicker
                        options={canonicals}
                        value={targets[row.key] || ''}
                        onChange={v => setTargets(prev => ({ ...prev, [row.key]: v }))}
                      />
                      <SmallButton
                        variant="success"
                        disabled={!targets[row.key] || busyKey === row.key}
                        onClick={() => handleUnify(row)}
                      >
                        {busyKey === row.key ? 'Radi…' : 'Unificiraj'}
                      </SmallButton>
                      <SmallButton
                        variant="secondary"
                        disabled={busyKey === row.key}
                        onClick={() => handleAddCurrentToList(row)}
                        title="Ovaj naziv je ispravan, samo nedostaje na listi"
                      >
                        + Na listu
                      </SmallButton>
                    </ButtonGroup>
                  )}
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      )}
    </>
  );

  const renderRulesTab = () => (
    <>
      <Intro>
        Aktivna pravila. Svaka nova stavka čiji Prijevoznik odgovara lijevoj strani automatski
        dobiva naziv s desne strane — bez obzira na velika/mala slova i točke.
      </Intro>

      <Toolbar>
        <SearchInput
          placeholder="Pretraži pravila…"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
      </Toolbar>

      {filteredAliases.length === 0 ? (
        <EmptyState>
          <p>Još nema pravila unifikacije.</p>
        </EmptyState>
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Stari naziv</Th>
              <Th style={{ width: '40%' }}>Unificirani naziv</Th>
              <Th style={{ width: '140px' }}>Zadnja primjena</Th>
              <Th style={{ width: '260px' }}>Akcije</Th>
            </tr>
          </thead>
          <tbody>
            {filteredAliases.map(rule => (
              <Tr key={rule._id}>
                <Td>
                  <strong>{rule.from}</strong>
                </Td>
                <Td>
                  {editingRuleId === rule._id ? (
                    <CanonicalPicker
                      options={canonicals}
                      value={editingRuleTarget}
                      onChange={setEditingRuleTarget}
                    />
                  ) : (
                    rule.to
                  )}
                </Td>
                <Td style={{ fontSize: '0.82rem', color: '#666' }}>
                  {rule.lastAppliedAt
                    ? `${new Date(rule.lastAppliedAt).toLocaleDateString('hr-HR')} (${
                        rule.itemsUpdated
                      })`
                    : '—'}
                </Td>
                <Td>
                  {editingRuleId === rule._id ? (
                    <ButtonGroup>
                      <SmallButton
                        variant="success"
                        disabled={!editingRuleTarget || busyKey === rule._id}
                        onClick={() => handleSaveRuleTarget(rule)}
                      >
                        {busyKey === rule._id ? 'Sprema…' : 'Spremi'}
                      </SmallButton>
                      <SmallButton
                        variant="secondary"
                        onClick={() => {
                          setEditingRuleId(null);
                          setEditingRuleTarget('');
                        }}
                      >
                        Odustani
                      </SmallButton>
                    </ButtonGroup>
                  ) : (
                    <ButtonGroup>
                      <SmallButton
                        onClick={() => {
                          setEditingRuleId(rule._id);
                          setEditingRuleTarget(rule.to);
                        }}
                      >
                        Uredi
                      </SmallButton>
                      <SmallButton
                        variant="add"
                        disabled={busyKey === rule._id}
                        onClick={() => handleReapply(rule)}
                      >
                        {busyKey === rule._id ? 'Radi…' : 'Primijeni'}
                      </SmallButton>
                      <SmallButton
                        variant="danger"
                        disabled={busyKey === rule._id}
                        onClick={() => handleDeleteRule(rule)}
                      >
                        Obriši
                      </SmallButton>
                    </ButtonGroup>
                  )}
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      )}
    </>
  );

  const renderListTab = () => (
    <>
      <Intro>
        Unificirana lista prijevoznika — ista lista koja se uvozi u vage. Samo nazivi s ove liste
        mogu biti odredište pravila unifikacije.
      </Intro>

      <Toolbar>
        <SearchInput
          placeholder="Pretraži listu…"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
        <ButtonGroup>
          <SearchInput
            placeholder="Novi naziv prijevoznika…"
            value={newCanonical}
            onChange={e => setNewCanonical(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') handleAddCanonical();
            }}
          />
          <SmallButton
            variant="success"
            disabled={!newCanonical.trim() || busyKey === 'new-canonical'}
            onClick={handleAddCanonical}
          >
            + Dodaj
          </SmallButton>
          <SmallButton variant="secondary" disabled={busyKey === 'seed'} onClick={handleSeed}>
            {busyKey === 'seed' ? 'Uvozi…' : 'Uvezi iz datoteke'}
          </SmallButton>
        </ButtonGroup>
      </Toolbar>

      {filteredCanonicals.length === 0 ? (
        <EmptyState>
          <p>Nema naziva na listi{searchQuery ? ` za "${searchQuery}"` : ''}.</p>
        </EmptyState>
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Unificirani naziv</Th>
              <Th style={{ width: '120px' }}>Akcije</Th>
            </tr>
          </thead>
          <tbody>
            {filteredCanonicals.map(entry => (
              <Tr key={entry._id}>
                <Td>{entry.name}</Td>
                <Td>
                  <SmallButton
                    variant="danger"
                    disabled={busyKey === entry._id}
                    onClick={() => handleDeleteCanonical(entry)}
                  >
                    Obriši
                  </SmallButton>
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      )}
    </>
  );

  return (
    <S.PageContainer>
      <Header>
        <HeaderLeft>
          <Logo />
          <HeaderTitle>
            Unifikacija Prijevoznika
            {!loading && (
              <>
                {unmappedCount > 0 && (
                  <Badge tone="warn" title="Nazivi koji čekaju odluku">
                    {unmappedCount} za obraditi
                  </Badge>
                )}
                {staleCount > 0 && (
                  <Badge tone="info" title="Pravilo postoji, ali stavke još nisu preimenovane">
                    {staleCount} za primijeniti
                  </Badge>
                )}
                {unmappedCount === 0 && staleCount === 0 && <Badge tone="ok">usklađeno</Badge>}
              </>
            )}
          </HeaderTitle>
        </HeaderLeft>
        <SmallButton onClick={() => navigate('/dashboard')} variant="secondary">
          ← Natrag
        </SmallButton>
      </Header>

      {status && <StatusMessage isError={status.isError}>{status.message}</StatusMessage>}

      <Tabs>
        <Tab active={tab === 'pending'} onClick={() => setTab('pending')}>
          Za unificirati ({pending.filter(p => p.status !== 'canonical').length})
        </Tab>
        <Tab active={tab === 'rules'} onClick={() => setTab('rules')}>
          Pravila ({aliases.length})
        </Tab>
        <Tab active={tab === 'list'} onClick={() => setTab('list')}>
          Unificirana lista ({canonicals.length})
        </Tab>
      </Tabs>

      {loading ? (
        <LoadingState>Učitavanje…</LoadingState>
      ) : tab === 'pending' ? (
        renderPendingTab()
      ) : tab === 'rules' ? (
        renderRulesTab()
      ) : (
        renderListTab()
      )}
    </S.PageContainer>
  );
};

export default UnifikacijaPage;
