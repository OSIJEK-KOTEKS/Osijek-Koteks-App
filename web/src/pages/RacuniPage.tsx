import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { useNavigate } from "react-router-dom";
import * as S from "../components/styled/Common";
import Logo from "../components/Logo";
import { useAuth } from "../contexts/AuthContext";
import { apiService } from "../utils/api";
import { Bill, Item } from "../types";

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

const HeaderActions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.medium};

  & > button,
  & button {
    padding: 0.638rem 0.85rem !important;
    font-size: 0.935rem !important;
    width: auto;
    min-width: 0;
  }

  & > ${S.Button}, & ${S.Button} {
    padding: 0.638rem 0.85rem !important;
    font-size: 0.935rem !important;
    width: auto;
    min-width: 0;
  }
`;

const DashboardContainer = styled.div`
  background: ${({ theme }) => theme.colors.white};
  border-radius: ${({ theme }) => theme.borderRadius};
  box-shadow: ${({ theme }) => theme.shadows.main};
`;

const EmptyMessage = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.spacing.large};
  color: ${({ theme }) => theme.colors.text};
  background: ${({ theme }) => theme.colors.white};
  border-radius: ${({ theme }) => theme.borderRadius};
  box-shadow: ${({ theme }) => theme.shadows.main};
`;

const ContentGrid = styled.div`
  display: grid;
  grid-template-columns: 1.1fr 0.9fr;
  gap: ${({ theme }) => theme.spacing.large};

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

const Card = styled.div`
  background: ${({ theme }) => theme.colors.white};
  border-radius: ${({ theme }) => theme.borderRadius};
  box-shadow: ${({ theme }) => theme.shadows.main};
  padding: ${({ theme }) => theme.spacing.large};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.medium};
`;

const SectionTitle = styled.h3`
  margin: 0;
  color: ${({ theme }) => theme.colors.text};
`;

const Input = styled.input`
  width: 100%;
  padding: ${({ theme }) => theme.spacing.medium};
  border: 1px solid ${({ theme }) => theme.colors.gray};
  border-radius: ${({ theme }) => theme.borderRadius};
  font-size: 1rem;
`;

const TextArea = styled.textarea`
  width: 100%;
  padding: ${({ theme }) => theme.spacing.medium};
  border: 1px solid ${({ theme }) => theme.colors.gray};
  border-radius: ${({ theme }) => theme.borderRadius};
  font-size: 1rem;
  min-height: 100px;
  resize: vertical;
`;

const ItemsList = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: ${({ theme }) => theme.spacing.small};
  max-height: 280px;
  overflow: auto;
  padding: ${({ theme }) => theme.spacing.small};
  border: 1px solid ${({ theme }) => theme.colors.gray};
  border-radius: ${({ theme }) => theme.borderRadius};
  background: ${({ theme }) => theme.colors.white};
`;

const ItemRow = styled.label`
  display: flex;
  gap: ${({ theme }) => theme.spacing.small};
  align-items: flex-start;
  padding: ${({ theme }) => theme.spacing.small};
  border: 1px solid ${({ theme }) => theme.colors.gray};
  border-radius: ${({ theme }) => theme.borderRadius};
  background: ${({ theme }) => theme.colors.white};
`;

const BillList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.small};
`;

const BillCard = styled.div`
  border: 1px solid ${({ theme }) => theme.colors.gray};
  border-radius: ${({ theme }) => theme.borderRadius};
  padding: ${({ theme }) => theme.spacing.medium};
  background: ${({ theme }) => theme.colors.white};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.small};
`;

const Muted = styled.span`
  color: ${({ theme }) => theme.colors.text};
  opacity: 0.8;
`;

const Chip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.small};
  padding: 4px 8px;
  border-radius: 999px;
  background: ${({ theme }) => theme.colors.gray};
  font-size: 0.85rem;
`;

const StatusBadge = styled.span<{ $status: Item["approvalStatus"] }>`
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 0.8rem;
  background: ${({ theme, $status }) =>
    $status === "odobreno"
      ? theme.colors.success
      : $status === "odbijen"
      ? theme.colors.error
      : theme.colors.gray};
  color: ${({ theme, $status }) =>
    $status === "odobreno" || $status === "odbijen" ? theme.colors.white : theme.colors.text};
`;

const ItemContent = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  gap: ${({ theme }) => theme.spacing.small};
`;

const RacuniPage: React.FC = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [itemsLoading, setItemsLoading] = useState(false);

  const fetchItemsList = async (query?: string) => {
    const perPage = 100;
    let page = 1;
    let hasMore = true;
    const allItems: Item[] = [];
    const trimmedQuery = query?.trim();

    while (hasMore) {
      const response = await apiService.getItems(
        page,
        perPage,
        trimmedQuery ? { searchTitle: trimmedQuery } : undefined
      );
      allItems.push(...response.items);

      if (response.items.length === 0) {
        break;
      }

      const pagination = response.pagination;
      hasMore =
        (pagination && pagination.hasMore) || (!pagination && response.items.length === perPage);
      page += 1;
    }

    return allItems;
  };

  const handleLogout = async () => {
    try {
      await signOut();
      navigate("/login");
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  const handleNavigateToDashboard = () => {
    navigate("/dashboard");
  };

  const toggleItemSelection = (id: string) => {
    setSelectedItemIds(prev =>
      prev.includes(id) ? prev.filter(itemId => itemId !== id) : [...prev, id]
    );
  };

  const handleSearch = async (value: string) => {
    setSearchTerm(value);
    setItemsLoading(true);
    try {
      const itemsResult = await fetchItemsList(value);
      setItems(itemsResult);
      setError("");
    } catch (err) {
      console.error("Error searching items:", err);
      setError("Neuspjesno ucitavanje dokumenata.");
    } finally {
      setItemsLoading(false);
    }
  };


  const fetchData = async () => {
    setLoading(true);
    setItemsLoading(true);
    setError("");
    try {
      const [itemsResult, billsResponse] = await Promise.all([
        fetchItemsList(),
        apiService.getBills(),
      ]);
      setItems(itemsResult);
      setBills(billsResponse);
    } catch (err) {
      console.error("Error loading bills:", err);
      setError("Neuspjesno ucitavanje racuna ili dokumenata.");
    } finally {
      setLoading(false);
      setItemsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateBill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || selectedItemIds.length === 0) {
      setError("Unesite naslov i odaberite barem jedan dokument");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const newBill = await apiService.createBill({
        title: title.trim(),
        description: description.trim(),
        itemIds: selectedItemIds,
      });
      setBills(prev => [newBill, ...prev]);
      setTitle("");
      setDescription("");
      setSelectedItemIds([]);
    } catch (err) {
      console.error("Error creating bill:", err);
      setError("Neuspješno spremanje računa.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <S.PageContainer>
      <Header>
        <HeaderLeft>
          <Logo />
        </HeaderLeft>
        <HeaderActions>
          <S.Button onClick={handleNavigateToDashboard}>Početna</S.Button>
          <S.Button onClick={handleLogout}>Odjava</S.Button>
        </HeaderActions>
      </Header>

      <DashboardContainer>
        <ContentGrid>
          <Card>
            <SectionTitle>Kreiraj račun</SectionTitle>
            <form onSubmit={handleCreateBill}>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div>
                  <Input
                    type="text"
                    placeholder="Naslov računa"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                  />
                </div>
                <div>
                  <TextArea
                    placeholder="Opis (opcionalno)"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                  />
                </div>
                <div>
                  <Muted>Dodajte dokumente na račun</Muted>
                  <Input
                    type="text"
                    placeholder="Pretrazi po broju otpremnice"
                    value={searchTerm}
                    onChange={e => handleSearch(e.target.value)}
                    style={{ marginTop: 8 }}
                  />
                  <ItemsList>
                    {items.length === 0 && (
                      <Muted>
                        {searchTerm.trim()
                          ? "Nema dokumenata za zadani upit."
                          : "Nema dostupnih dokumenata."}
                      </Muted>
                    )}
                    {items.map(item => (
                      <ItemRow key={item._id}>
                        <input
                          type="checkbox"
                          checked={selectedItemIds.includes(item._id)}
                          onChange={() => toggleItemSelection(item._id)}
                        />
                        <ItemContent>
                          <div>
                            <div>{item.title}</div>
                            <Muted>RN: {item.code}</Muted>
                          </div>
                          <StatusBadge $status={item.approvalStatus}>
                            {item.approvalStatus === "odobreno"
                              ? "Odobreno"
                              : item.approvalStatus === "odbijen"
                              ? "Odbijen"
                              : "Na cekanju"}
                          </StatusBadge>
                        </ItemContent>
                      </ItemRow>
                    ))}
                  </ItemsList>
                </div>
                {error && <S.ErrorMessage>{error}</S.ErrorMessage>}
                <S.Button type="submit" disabled={submitting}>
                  {submitting ? "Spremanje..." : "Spremi račun"}
                </S.Button>
              </div>
            </form>
          </Card>

          <Card>
            <SectionTitle>Računi</SectionTitle>
            {loading ? (
              <Muted>Učitavanje...</Muted>
            ) : bills.length === 0 ? (
              <EmptyMessage>Nema kreiranih računa.</EmptyMessage>
            ) : (
              <BillList>
                {bills.map(bill => (
                  <BillCard key={bill._id}>
                    <div>
                      <strong>{bill.title}</strong>
                      {bill.description && <div>{bill.description}</div>}
                    </div>
                    <div>
                      <Muted>Priloženi dokumenti:</Muted>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: 6 }}>
                        {bill.items.map(item => (
                          <Chip key={item._id}>
                            {item.title} ({item.code})
                          </Chip>
                        ))}
                      </div>
                    </div>
                    <Muted>
                      Kreirao: {bill.createdBy?.firstName} {bill.createdBy?.lastName}
                    </Muted>
                  </BillCard>
                ))}
              </BillList>
            )}
          </Card>
        </ContentGrid>
      </DashboardContainer>
    </S.PageContainer>
  );
};

export default RacuniPage;
