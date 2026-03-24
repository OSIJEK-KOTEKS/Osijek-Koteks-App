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

const Tr = styled.tr`
  &:last-child td {
    border-bottom: none;
  }
  &:hover {
    background: ${({ theme }) => theme.colors.background};
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

const SmallButton = styled.button<{ variant?: 'danger' | 'success' | 'secondary' }>`
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

// ─── Types ───────────────────────────────────────────────────────────────────

interface CodeMappingEntry {
  _id: string;
  code: string;
  name: string;
  updatedAt: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

const CodeMappingPage: React.FC = () => {
  const navigate = useNavigate();

  const [mappings, setMappings] = useState<CodeMappingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<{ message: string; isError: boolean } | null>(null);

  const [searchQuery, setSearchQuery] = useState('');

  // Inline editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  // New row state
  const [isAdding, setIsAdding] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');

  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);

  // ── Fetch ───────────────────────────────────────────────────────────────────
  const fetchMappings = async () => {
    try {
      setLoading(true);
      const data = await apiService.getCodeMappings();
      setMappings(data);
    } catch {
      setStatus({ message: 'Greška pri dohvaćanju mapiranja kodova.', isError: true });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMappings();
  }, []);

  // ── Filtered list ───────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase();
    if (!q) return mappings;
    return mappings.filter(
      (m) => m.code.toLowerCase().includes(q) || m.name.toLowerCase().includes(q)
    );
  }, [mappings, searchQuery]);

  // ── Show status briefly ─────────────────────────────────────────────────────
  const showStatus = (message: string, isError = false) => {
    setStatus({ message, isError });
    setTimeout(() => setStatus(null), 3500);
  };

  // ── Editing ─────────────────────────────────────────────────────────────────
  const startEdit = (m: CodeMappingEntry) => {
    setEditingId(m._id);
    setEditingName(m.name);
    setIsAdding(false);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingName('');
  };

  const saveEdit = async (id: string) => {
    if (!editingName.trim()) return;
    setSaving(true);
    try {
      const updated = await apiService.updateCodeMapping(id, editingName.trim());
      setMappings((prev) => prev.map((m) => (m._id === id ? updated : m)));
      setEditingId(null);
      showStatus('Naziv uspješno ažuriran.');
    } catch {
      showStatus('Greška pri ažuriranju.', true);
    } finally {
      setSaving(false);
    }
  };

  // ── Adding ──────────────────────────────────────────────────────────────────
  const startAdd = () => {
    setIsAdding(true);
    setNewCode('');
    setNewName('');
    setEditingId(null);
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
      // saveCodeMapping returns the upserted doc
      setMappings((prev) => {
        const exists = prev.find((m) => m._id === created._id);
        if (exists) return prev.map((m) => (m._id === created._id ? created : m));
        return [...prev, created].sort((a, b) => a.code.localeCompare(b.code));
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
  const handleDelete = async (id: string, code: string) => {
    if (!window.confirm(`Obrisati mapiranje za kod "${code}"?`)) return;
    try {
      await apiService.deleteCodeMapping(id);
      setMappings((prev) => prev.filter((m) => m._id !== id));
      showStatus(`Kod "${code}" obrisan.`);
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
      await fetchMappings();
      showStatus(
        `Uvoz završen: ${result.upserted} novih, ${result.modified} ažuriranih.`
      );
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
          <Logo size="small" onClick={() => navigate('/dashboard')} style={{ cursor: 'pointer' }} />
          <HeaderTitle>
            Mapiranje kodova
            {!loading && <CountBadge>{mappings.length}</CountBadge>}
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
        <ButtonGroup>
          <SmallButton onClick={startAdd} disabled={isAdding}>
            + Dodaj novi kod
          </SmallButton>
          <SmallButton
            onClick={handleSeedFromFile}
            disabled={seeding}
            variant="secondary"
            title="Uveze sve kodove iz statičke datoteke codeMapping.ts u bazu podataka"
          >
            {seeding ? 'Uvoz…' : '⬆ Uvezi iz datoteke'}
          </SmallButton>
        </ButtonGroup>
      </Toolbar>

      {loading ? (
        <LoadingState>Učitavanje…</LoadingState>
      ) : mappings.length === 0 && !isAdding ? (
        <EmptyState>
          <p>Nema mapiranja kodova u bazi.</p>
          <p>
            Kliknite <strong>Uvezi iz datoteke</strong> da uvezete sve kodove iz{' '}
            <code>codeMapping.ts</code>, ili dodajte ručno.
          </p>
        </EmptyState>
      ) : (
        <Table>
          <thead>
            <tr>
              <Th style={{ width: '160px' }}>Kod</Th>
              <Th>Naziv</Th>
              <Th style={{ width: '200px' }}>Akcije</Th>
            </tr>
          </thead>
          <tbody>
            {/* New-entry row */}
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

            {/* Existing entries */}
            {filtered.map((m) => (
              <Tr key={m._id}>
                <Td>
                  <strong>{m.code}</strong>
                </Td>
                <Td>
                  {editingId === m._id ? (
                    <InlineInput
                      autoFocus
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveEdit(m._id);
                        if (e.key === 'Escape') cancelEdit();
                      }}
                    />
                  ) : (
                    m.name
                  )}
                </Td>
                <Td>
                  {editingId === m._id ? (
                    <ButtonGroup>
                      <SmallButton
                        variant="success"
                        onClick={() => saveEdit(m._id)}
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
                      <SmallButton onClick={() => startEdit(m)}>Uredi</SmallButton>
                      <SmallButton
                        variant="danger"
                        onClick={() => handleDelete(m._id, m.code)}
                      >
                        Obriši
                      </SmallButton>
                    </ButtonGroup>
                  )}
                </Td>
              </Tr>
            ))}

            {filtered.length === 0 && !isAdding && (
              <Tr>
                <Td colSpan={3} style={{ textAlign: 'center', color: '#888' }}>
                  Nema rezultata za "{searchQuery}"
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
