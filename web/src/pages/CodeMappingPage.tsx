import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { apiService } from '../utils/api';
import { codeToTextMapping } from '../utils/codeMapping';
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

const Tr = styled.tr<{ unmapped?: boolean }>`
  background: ${({ unmapped }) => (unmapped ? '#fffde7' : 'transparent')};
  &:last-child td {
    border-bottom: none;
  }
  &:hover {
    background: ${({ unmapped, theme }) => (unmapped ? '#fff9c4' : theme.colors.background)};
  }
`;

const InlineInput = styled.input`
  width: 100%;
  padding: 6px 10px;
  border-radius: 4px;
  border: 1px solid ${({ theme }) => theme.colors.primary};
  font-size: 0.95rem;
  &:focus {
    outline: none;
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 8px;
`;

const SmallButton = styled.button<{ variant?: 'danger' | 'success' | 'secondary' | 'add' }>`
  padding: 5px 12px;
  border-radius: 4px;
  border: none;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 500;
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
  color: ${({ variant, theme }) =>
    variant === 'secondary' ? theme.colors.text : 'white'};
  transition: opacity 0.2s;

  &:hover {
    opacity: 0.85;
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const NewRow = styled.tr`
  background: #f0f7ff;
`;

const UnmappedTag = styled.span`
  font-size: 0.75rem;
  color: #f57f17;
  background: #fff9c4;
  border: 1px solid #f9a825;
  border-radius: 4px;
  padding: 1px 6px;
  margin-left: 6px;
`;

const StaticName = styled.span`
  color: #888;
  font-style: italic;
`;

const StaticTag = styled.span`
  font-size: 0.72rem;
  color: #888;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 1px 5px;
  margin-left: 8px;
  vertical-align: middle;
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

const StatusMessage = styled.div<{ isError?: boolean }>`
  padding: 10px 16px;
  border-radius: 4px;
  margin-bottom: 16px;
  background-color: ${({ isError }) => (isError ? '#fdecea' : '#e8f5e9')};
  color: ${({ isError }) => (isError ? '#c62828' : '#2e7d32')};
  font-size: 0.9rem;
`;

const CountBadge = styled.span`
  background: ${({ theme }) => theme.colors.primary};
  color: white;
  border-radius: 12px;
  padding: 2px 10px;
  font-size: 0.8rem;
  margin-left: 8px;
`;

const UnmappedBadge = styled.span`
  background: #fb8c00;
  color: white;
  border-radius: 12px;
  padding: 2px 10px;
  font-size: 0.8rem;
  margin-left: 6px;
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

// ─── Types ───────────────────────────────────────────────────────────────────

interface CodeMappingEntry {
  _id: string;
  code: string;
  name: string;
  updatedAt: string;
}

interface MergedRow {
  code: string;
  mapping: CodeMappingEntry | null;
  staticName: string | null; // name from codeMapping.ts fallback
}

// ─── Component ───────────────────────────────────────────────────────────────

const CodeMappingPage: React.FC = () => {
  const navigate = useNavigate();

  const [mappings, setMappings] = useState<CodeMappingEntry[]>([]);
  const [itemCodes, setItemCodes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<{ message: string; isError: boolean } | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [showUnmappedOnly, setShowUnmappedOnly] = useState(false);

  // Inline editing state
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  // New row state (manual add)
  const [isAdding, setIsAdding] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');

  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);

  // ── Fetch ───────────────────────────────────────────────────────────────────
  const fetchAll = async () => {
    try {
      setLoading(true);
      const [mappingData, codesData] = await Promise.all([
        apiService.getCodeMappings(),
        apiService.getUniqueCodes(),
      ]);
      setMappings(mappingData);
      setItemCodes(codesData);
    } catch {
      setStatus({ message: 'Greška pri dohvaćanju podataka.', isError: true });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  // ── Merged rows: all item codes + any DB-only mappings ───────────────────────
  const allRows = useMemo((): MergedRow[] => {
    const mappingByCode = new Map<string, CodeMappingEntry>();
    mappings.forEach((m) => mappingByCode.set(m.code, m));

    // Start with all item codes — coerce to string in case API returns mixed types
    const codeSet = new Set(itemCodes.map(String));

    // Also include codes that are in DB mappings but not in items (legacy/extra)
    mappings.forEach((m) => codeSet.add(m.code));

    return Array.from(codeSet)
      .sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true }))
      .map((code) => ({
        code,
        mapping: mappingByCode.get(code) ?? null,
        staticName: codeToTextMapping[code] ?? null,
      }));
  }, [mappings, itemCodes]);

  const unmappedCount = useMemo(
    () => allRows.filter((r) => !r.mapping && !r.staticName).length,
    [allRows]
  );

  // ── Filtered list ───────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let rows = allRows;
    if (showUnmappedOnly) rows = rows.filter((r) => !r.mapping && !r.staticName);
    const q = searchQuery.toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.code.toLowerCase().includes(q) ||
        (r.mapping?.name ?? r.staticName ?? '').toLowerCase().includes(q)
    );
  }, [allRows, searchQuery, showUnmappedOnly]);

  // ── Show status briefly ─────────────────────────────────────────────────────
  const showStatus = (message: string, isError = false) => {
    setStatus({ message, isError });
    setTimeout(() => setStatus(null), 3500);
  };

  // ── Editing ─────────────────────────────────────────────────────────────────
  const startEdit = (row: MergedRow) => {
    setEditingCode(row.code);
    setEditingName(row.mapping?.name ?? row.staticName ?? '');
    setIsAdding(false);
  };

  const cancelEdit = () => {
    setEditingCode(null);
    setEditingName('');
  };

  const saveEdit = async (row: MergedRow) => {
    if (!editingName.trim()) return;
    setSaving(true);
    try {
      if (row.mapping) {
        // Update existing
        const updated = await apiService.updateCodeMapping(row.mapping._id, editingName.trim());
        setMappings((prev) => prev.map((m) => (m._id === updated._id ? updated : m)));
      } else {
        // Create new mapping for this item code
        const created = await apiService.saveCodeMapping(row.code, editingName.trim());
        setMappings((prev) => [...prev, created]);
      }
      setEditingCode(null);
      showStatus('Naziv uspješno spremljen.');
    } catch {
      showStatus('Greška pri spremanju.', true);
    } finally {
      setSaving(false);
    }
  };

  // ── Manual new row (for codes not in items) ─────────────────────────────────
  const startAdd = () => {
    setIsAdding(true);
    setNewCode('');
    setNewName('');
    setEditingCode(null);
  };

  const cancelAdd = () => {
    setIsAdding(false);
    setNewCode('');
    setNewName('');
  };

  const saveNew = async () => {
    if (!newCode.trim() || !newName.trim()) return;
    setSaving(true);
    try {
      const created = await apiService.saveCodeMapping(newCode.trim(), newName.trim());
      setMappings((prev) => {
        const exists = prev.find((m) => m._id === created._id);
        if (exists) return prev.map((m) => (m._id === created._id ? created : m));
        return [...prev, created];
      });
      setIsAdding(false);
      showStatus(`Kod "${created.code}" uspješno dodan/ažuriran.`);
    } catch {
      showStatus('Greška pri dodavanju koda.', true);
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ──────────────────────────────────────────────────────────────────
  const handleDelete = async (mapping: CodeMappingEntry) => {
    if (!window.confirm(`Obrisati naziv za kod "${mapping.code}"?`)) return;
    try {
      await apiService.deleteCodeMapping(mapping._id);
      setMappings((prev) => prev.filter((m) => m._id !== mapping._id));
      showStatus(`Naziv za kod "${mapping.code}" obrisan.`);
    } catch {
      showStatus('Greška pri brisanju.', true);
    }
  };

  // ── Seed from static file ───────────────────────────────────────────────────
  const handleSeedFromFile = async () => {
    if (
      !window.confirm(
        `Ovo će uvesti sva mapiranja iz statičke datoteke codeMapping.ts u bazu podataka.\n` +
          `Postoje li već isti kodovi, naziv će biti ažuriran.\n\nNastaviti?`
      )
    )
      return;

    setSeeding(true);
    try {
      const payload = Object.entries(codeToTextMapping).map(([code, name]) => ({ code, name }));
      const result = await apiService.bulkSeedCodeMappings(payload);
      await fetchAll();
      showStatus(`Uvoz završen: ${result.upserted} novih, ${result.modified} ažuriranih.`);
    } catch {
      showStatus('Greška pri uvozu iz datoteke.', true);
    } finally {
      setSeeding(false);
    }
  };

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <S.PageContainer>
      <Header>
        <HeaderLeft>
          <Logo />
          <HeaderTitle>
            Imenovanje Radnih Naloga
            {!loading && (
              <>
                <CountBadge>{allRows.length}</CountBadge>
                {unmappedCount > 0 && (
                  <UnmappedBadge title="Kodovi bez naziva">{unmappedCount} bez naziva</UnmappedBadge>
                )}
              </>
            )}
          </HeaderTitle>
        </HeaderLeft>
        <SmallButton onClick={() => navigate('/dashboard')} variant="secondary">
          ← Natrag
        </SmallButton>
      </Header>

      {status && (
        <StatusMessage isError={status.isError}>{status.message}</StatusMessage>
      )}

      <Toolbar>
        <SearchInput
          placeholder="Pretraži po kodu ili nazivu…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <FilterToggle>
          <input
            type="checkbox"
            checked={showUnmappedOnly}
            onChange={(e) => setShowUnmappedOnly(e.target.checked)}
          />
          Prikaži samo bez naziva
        </FilterToggle>
      </Toolbar>

      {loading ? (
        <LoadingState>Učitavanje…</LoadingState>
      ) : allRows.length === 0 && !isAdding ? (
        <EmptyState>
          <p>Nema kodova u sustavu.</p>
        </EmptyState>
      ) : (
        <Table>
          <thead>
            <tr>
              <Th style={{ width: '160px' }}>Kod</Th>
              <Th>Naziv</Th>
              <Th style={{ width: '220px' }}>Akcije</Th>
            </tr>
          </thead>
          <tbody>
            {/* Manual new-entry row */}
            {isAdding && (
              <NewRow>
                <Td>
                  <InlineInput
                    autoFocus
                    placeholder="npr. 26010"
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveNew();
                      if (e.key === 'Escape') cancelAdd();
                    }}
                  />
                </Td>
                <Td>
                  <InlineInput
                    placeholder="Naziv gradilišta"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveNew();
                      if (e.key === 'Escape') cancelAdd();
                    }}
                  />
                </Td>
                <Td>
                  <ButtonGroup>
                    <SmallButton
                      variant="success"
                      onClick={saveNew}
                      disabled={saving || !newCode.trim() || !newName.trim()}
                    >
                      {saving ? 'Sprema…' : 'Spremi'}
                    </SmallButton>
                    <SmallButton variant="secondary" onClick={cancelAdd}>
                      Odustani
                    </SmallButton>
                  </ButtonGroup>
                </Td>
              </NewRow>
            )}

            {/* Merged rows */}
            {filtered.map((row) => (
              <Tr key={row.code} unmapped={!row.mapping && !row.staticName}>
                <Td>
                  <strong>{row.code}</strong>
                  {!row.mapping && !row.staticName && <UnmappedTag>bez naziva</UnmappedTag>}
                </Td>
                <Td>
                  {editingCode === row.code ? (
                    <InlineInput
                      autoFocus
                      value={editingName}
                      placeholder="Unesite naziv…"
                      onChange={(e) => setEditingName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveEdit(row);
                        if (e.key === 'Escape') cancelEdit();
                      }}
                    />
                  ) : row.mapping ? (
                    row.mapping.name
                  ) : row.staticName ? (
                    <>
                      <StaticName>{row.staticName}</StaticName>
                      <StaticTag title="Naziv iz statičke datoteke, nije još spremljen u bazu">iz datoteke</StaticTag>
                    </>
                  ) : (
                    <span style={{ color: '#bbb', fontStyle: 'italic' }}>—</span>
                  )}
                </Td>
                <Td>
                  {editingCode === row.code ? (
                    <ButtonGroup>
                      <SmallButton
                        variant="success"
                        onClick={() => saveEdit(row)}
                        disabled={saving || !editingName.trim()}
                      >
                        {saving ? 'Sprema…' : 'Spremi'}
                      </SmallButton>
                      <SmallButton variant="secondary" onClick={cancelEdit}>
                        Odustani
                      </SmallButton>
                    </ButtonGroup>
                  ) : (
                    <ButtonGroup>
                      <SmallButton
                        variant={row.mapping ? undefined : 'add'}
                        onClick={() => startEdit(row)}
                      >
                        {row.mapping ? 'Uredi' : row.staticName ? 'Spremi u bazu' : '+ Dodaj naziv'}
                      </SmallButton>
                      {row.mapping && (
                        <SmallButton
                          variant="danger"
                          onClick={() => handleDelete(row.mapping!)}
                        >
                          Obriši
                        </SmallButton>
                      )}
                    </ButtonGroup>
                  )}
                </Td>
              </Tr>
            ))}

            {filtered.length === 0 && !isAdding && (
              <Tr>
                <Td colSpan={3} style={{ textAlign: 'center', color: '#888' }}>
                  Nema rezultata{searchQuery ? ` za "${searchQuery}"` : ''}.
                </Td>
              </Tr>
            )}
          </tbody>
        </Table>
      )}
    </S.PageContainer>
  );
};

export default CodeMappingPage;
