import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { useNavigate } from "react-router-dom";
import * as S from "../components/styled/Common";
import Logo from "../components/Logo";
import { useAuth } from "../contexts/AuthContext";
import { apiService, getImageUrl } from "../utils/api";
import { buildBillPrintPdf } from "../utils/printBill";
import ImageViewerModal from "../components/ImageViewerModal";
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
    padding: 1.152rem 1.536rem !important;
    font-size: 0.935rem !important;
    width: auto;
    min-width: 0;
  }

  & > ${S.Button}, & ${S.Button} {
    padding: 1.152rem 1.536rem !important;
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
  grid-template-columns: repeat(auto-fit, minmax(520px, 1fr));
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

const Select = styled.select`
  width: 100%;
  padding: ${({ theme }) => theme.spacing.medium};
  border: 1px solid ${({ theme }) => theme.colors.gray};
  border-radius: ${({ theme }) => theme.borderRadius};
  font-size: 1rem;
  background: ${({ theme }) => theme.colors.white};
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
  max-height: 400px;
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
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease;

  &:hover {
    background: ${({ theme }) => theme.colors.gray};
    border-color: ${({ theme }) => theme.colors.text};
  }
`;

const BillList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.small};
  max-height: 700px;
  overflow: auto;
  padding-right: ${({ theme }) => theme.spacing.small};
`;

const BillCard = styled.div`
  border: 1px solid ${({ theme }) => theme.colors.gray};
  border-radius: ${({ theme }) => theme.borderRadius};
  padding: ${({ theme }) => theme.spacing.medium};
  background: ${({ theme }) => theme.colors.white};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.small};
  cursor: pointer;
`;

const BillHeaderRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.medium};
`;

const PrintBillButton = styled(S.Button)`
  padding: 0.45rem !important;
  min-width: 0;
  width: 40px;
  height: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.85rem !important;
  border-radius: 50%;

  svg {
    width: 18px;
    height: 18px;
  }
`;

const Muted = styled.span`
  color: ${({ theme }) => theme.colors.text};
  opacity: 0.8;
`;

const PdfLink = styled.a`
  color: ${({ theme }) => theme.colors.text};
  text-decoration: underline;
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

const RemoveButton = styled.button`
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 0.9rem;
  color: ${({ theme }) => theme.colors.text};
  padding: 0 4px;
  line-height: 1;
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

const formatMaterialWeight = (item: Item) => {
  if (typeof item.tezina === "number") return `${item.tezina} t`;
  if (typeof item.neto === "number") return `${item.neto} kg`;
  return "N/A";
};

const getGoogleDriveDownloadUrl = (url: string) => {
  const driveIdMatch =
    url.match(/\/d\/([a-zA-Z0-9_-]+)/) ||
    url.match(/[?&]id=([a-zA-Z0-9_-]+)/) ||
    url.match(/open\?id=([a-zA-Z0-9_-]+)/);

  if (driveIdMatch?.[1]) {
    return `https://drive.google.com/uc?export=download&id=${driveIdMatch[1]}`;
  }

  return url;
};

const getPdfDownloadUrl = (url?: string | null) => {
  if (!url) return "";

  const normalizedUrl = getImageUrl(url);
  if (normalizedUrl.includes("drive.google.com")) {
    return getGoogleDriveDownloadUrl(normalizedUrl);
  }

  return normalizedUrl;
};

const getBillPdfDownloadName = (attachment?: Bill["attachment"] | null) => {
  if (!attachment?.url) return undefined;

  const baseName =
    attachment.originalName ||
    attachment.url.split("/").pop() ||
    "bill-attachment";

  return baseName.toLowerCase().endsWith(".pdf") ? baseName : `${baseName}.pdf`;
};

const getItemPdfDownloadName = (item: Item) => {
  const baseName = item.title || item.code || "item-pdf";
  const normalized = baseName.trim().replace(/\s+/g, "-");
  return normalized.toLowerCase().endsWith(".pdf") ? normalized : `${normalized}.pdf`;
};

const formatApprovalLocation = (item: Item) => {
  const lat = item.approvalLocation?.coordinates?.latitude;
  const lon = item.approvalLocation?.coordinates?.longitude;
  if (typeof lat === "number" && typeof lon === "number") {
    return `Lat: ${lat.toFixed(5)}, Lon: ${lon.toFixed(5)}`;
  }
  return "N/A";
};

const DEFAULT_DOBAVLJAC: Bill["dobavljac"] = "VELIČKI KAMEN d.o.o.";

const DOBAVLJACI: Bill["dobavljac"][] = [
  "KAMEN - PSUNJ d.o.o.",
  "MOLARIS d.o.o.",
  DEFAULT_DOBAVLJAC,
];

const RacuniPage: React.FC = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [title, setTitle] = useState("");
  const [dobavljac, setDobavljac] = useState<Bill["dobavljac"]>(DEFAULT_DOBAVLJAC);
  const [description, setDescription] = useState("");
  const [billPdf, setBillPdf] = useState<File | null>(null);
  const [pdfInputKey, setPdfInputKey] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchCode, setSearchCode] = useState("");
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [selectedItemsCache, setSelectedItemsCache] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [itemsLoading, setItemsLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [expandedBillId, setExpandedBillId] = useState<string | null>(null);
  const [expandedItemIds, setExpandedItemIds] = useState<string[]>([]);
  const [billSearchTerm, setBillSearchTerm] = useState("");
  const [billSearchQuery, setBillSearchQuery] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [printingId, setPrintingId] = useState<string | null>(null);
  const [printError, setPrintError] = useState("");
  const token = localStorage.getItem("userToken") || "";
  const selectedItems = selectedItemIds
    .map(id => selectedItemsCache.find(item => item._id === id) || items.find(item => item._id === id))
    .filter((item): item is Item => Boolean(item));
  const hasItemSearch = searchTerm.trim() !== "" || searchCode.trim() !== "";

  const filteredBills = billSearchQuery
    ? bills.filter(bill => bill.title.toLowerCase().includes(billSearchQuery.toLowerCase()))
    : bills;

  const fetchItemsList = async (filters?: { title?: string; code?: string }) => {
    const perPage = 100;
    let page = 1;
    let hasMore = true;
    const allItems: Item[] = [];
    const trimmedTitle = filters?.title?.trim();
    const trimmedCode = filters?.code?.trim();

    while (hasMore) {
      const response = await apiService.getItems(
        page,
        perPage,
        trimmedTitle || trimmedCode
          ? {
              ...(trimmedTitle ? { searchTitle: trimmedTitle } : {}),
              ...(trimmedCode ? { code: trimmedCode } : {}),
            }
          : undefined
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

    setSelectedItemsCache(prev => {
      const isSelected = selectedItemIds.includes(id);
      if (isSelected) {
        return prev.filter(item => item._id !== id);
      }
      const itemToAdd = items.find(item => item._id === id) || prev.find(item => item._id === id);
      if (!itemToAdd) return prev;
      if (prev.find(item => item._id === id)) return prev;
      return [...prev, itemToAdd];
    });
  };

  const toggleBillExpand = (id: string) => {
    setExpandedBillId(prev => {
      const next = prev === id ? null : id;
      if (next !== prev) {
        setExpandedItemIds([]);
      }
      return next;
    });
  };

  const toggleItemExpand = (id: string) => {
    setExpandedItemIds(prev => (prev.includes(id) ? prev.filter(itemId => itemId !== id) : [...prev, id]));
  };

  const handleBillSearch = () => {
    setBillSearchQuery(billSearchTerm.trim());
  };

  const handleSearch = async () => {
    const trimmedSearchTerm = searchTerm.trim();
    const trimmedSearchCode = searchCode.trim();

    setHasSearched(true);
    setItemsLoading(true);
    setSearchLoading(true);
    try {
      const itemsResult = await fetchItemsList({
        title: trimmedSearchTerm || undefined,
        code: trimmedSearchCode || undefined,
      });
      setItems(itemsResult);
      setError("");
    } catch (err) {
      console.error("Error searching items:", err);
      setError("Neuspjesno ucitavanje dokumenata.");
    } finally {
      setItemsLoading(false);
      setSearchLoading(false);
    }
  };

  const handleBillPdfChange = (files: FileList | null) => {
    if (!files || files.length === 0) {
      setBillPdf(null);
      return;
    }

    const file = files[0];
    if (file.type !== "application/pdf") {
      setError("Dodajte PDF datoteku (format .pdf).");
      setBillPdf(null);
      return;
    }

    setError("");
    setBillPdf(file);
  };


  const loadBills = async () => {
    setLoading(true);
    setError("");
    try {
      const billsResponse = await apiService.getBills();
      setBills(billsResponse);
    } catch (err) {
      console.error("Error loading bills:", err);
      setError(prev => prev || "Neuspjesno ucitavanje racuna.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      setItemsLoading(true);
      setSearchLoading(false);
      await loadBills();
      setItemsLoading(false);
    };

    init();
  }, []);

  const handleItemPdfDownload = (item: Item, e: React.MouseEvent) => {
    e.stopPropagation();
    const downloadUrl = getPdfDownloadUrl(item.pdfUrl);
    if (!downloadUrl) return;

    const link = document.createElement("a");
    link.href = downloadUrl;
    link.target = "_blank";
    link.download = getItemPdfDownloadName(item);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintBill = async (bill: Bill, e: React.MouseEvent) => {
    e.stopPropagation();
    setPrintError("");

    if (!token) {
      setPrintError("Nedostaje token za ispis. Prijavite se ponovo.");
      return;
    }

    setPrintingId(bill._id);

    try {
      const blob = await buildBillPrintPdf(bill, token);
      const url = URL.createObjectURL(blob);
      const printWindow = window.open(url);

      if (printWindow) {
        printWindow.onload = () => {
          printWindow.focus();
          printWindow.print();
        };
      }

      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err) {
      console.error("Error printing bill:", err);
      setPrintError("Nije moguće generirati PDF za ispis.");
    } finally {
      setPrintingId(null);
    }
  };

  const handleCreateBill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || selectedItemIds.length === 0) {
      setError("Unesite naslov i odaberite barem jedan dokument");
      return;
    }

    if (!dobavljac) {
      setError("Odaberite dobavljača");
      return;
    }

    if (billPdf && billPdf.type !== "application/pdf") {
      setError("Dodajte PDF datoteku (format .pdf).");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const newBill = await apiService.createBill({
        title: title.trim(),
        description: description.trim(),
        dobavljac,
        itemIds: selectedItemIds,
        billPdf: billPdf || undefined,
      });
      setBills(prev => [newBill, ...prev]);
      setTitle("");
      setDobavljac(DEFAULT_DOBAVLJAC);
      setDescription("");
      setBillPdf(null);
      setPdfInputKey(prev => prev + 1);
      setSelectedItemIds([]);
      setSelectedItemsCache([]);
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
                  <Select value={dobavljac} onChange={e => setDobavljac(e.target.value as Bill["dobavljac"])}>
                    {DOBAVLJACI.map(option => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <TextArea
                    placeholder="Opis (opcionalno)"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                  />
                </div>
                <div>
                  <Muted>Priložite PDF (opcionalno)</Muted>
                  <Input
                    key={pdfInputKey}
                    type="file"
                    accept="application/pdf"
                    onChange={e => handleBillPdfChange(e.target.files)}
                  />
                  {billPdf && (
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: 6 }}>
                      <Chip>
                        {billPdf.name}
                        <RemoveButton
                          type="button"
                          onClick={() => {
                            setBillPdf(null);
                            setPdfInputKey(prev => prev + 1);
                          }}
                          aria-label="Ukloni PDF"
                        >
                          x
                        </RemoveButton>
                      </Chip>
                      <Muted>{(billPdf.size / (1024 * 1024)).toFixed(2)} MB</Muted>
                    </div>
                  )}
                </div>
                <div>
                  <Muted>Dodajte dokumente na račun</Muted>
                  <div style={{ display: "flex", gap: "8px", marginTop: 8 }}>
                    <Input
                      type="text"
                      placeholder="Broj otpremnice"
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                    />
                    <Input
                      type="text"
                      placeholder="Radni nalog"
                      value={searchCode}
                      onChange={e => setSearchCode(e.target.value)}
                    />
                    <S.Button type="button" onClick={handleSearch} disabled={searchLoading}>
                      {searchLoading ? "Traženje..." : "Traži"}
                    </S.Button>
                  </div>
                  <ItemsList>
                    {!hasSearched ? (
                      <Muted>Kliknite "Traži" za prikaz dokumenata</Muted>
                    ) : itemsLoading ? (
                      <Muted>Uitavanje...</Muted>
                    ) : items.length === 0 ? (
                      <Muted>
                        {hasItemSearch
                          ? "Nema dokumenata za zadani upit."
                          : "Nema dostupnih dokumenata."}
                      </Muted>
                    ) : (
                      items
                        .filter(item => !selectedItemIds.includes(item._id))
                        .map(item => (
                          <ItemRow
                            key={item._id}
                            role="button"
                            tabIndex={0}
                            onClick={() => toggleItemSelection(item._id)}
                            onKeyDown={e => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                toggleItemSelection(item._id);
                              }
                            }}
                          >
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
                        ))
                    )}
                  </ItemsList>
                </div>
                {selectedItemIds.length > 0 && (
                  <div>
                    <Muted>Odabrani dokumenti:</Muted>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: 6 }}>
                      {selectedItems.map(item => (
                        <Chip key={item._id}>
                          {item.title} ({item.code})
                          <RemoveButton type="button" onClick={() => toggleItemSelection(item._id)}>
                            ×
                          </RemoveButton>
                        </Chip>
                      ))}
                    </div>
                  </div>
                )}
                {error && <S.ErrorMessage>{error}</S.ErrorMessage>}
                <S.Button type="submit" disabled={submitting}>
                  {submitting ? "Spremanje..." : "Spremi račun"}
                </S.Button>
              </div>
            </form>
          </Card>

          <Card>
            <SectionTitle>Računi</SectionTitle>
            <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
              <Input
                type="text"
                placeholder="Pretrazi račune po naslovu"
                value={billSearchTerm}
                onChange={e => setBillSearchTerm(e.target.value)}
              />
              <S.Button type="button" onClick={handleBillSearch}>
                Traži
              </S.Button>
            </div>
            {loading ? (
              <Muted>Učitavanje...</Muted>
            ) : bills.length === 0 ? (
              <EmptyMessage>Nema kreiranih računa.</EmptyMessage>
            ) : (
              <BillList>
                {filteredBills.map(bill => (
                  <BillCard
                    key={bill._id}
                    onClick={() => toggleBillExpand(bill._id)}
                    onKeyDown={e => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        toggleBillExpand(bill._id);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    <BillHeaderRow>
                      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        <strong>{bill.title}</strong>
                      <Muted>Dobavljač: {bill.dobavljac || "N/A"}</Muted>
                      <Muted>
                        Kreirao: {bill.createdBy?.firstName} {bill.createdBy?.lastName}
                      </Muted>
                    </div>
                      <PrintBillButton
                        type="button"
                        onClick={e => handlePrintBill(bill, e)}
                        disabled={printingId === bill._id}
                        aria-label="Ispis računa"
                      >
                        {printingId === bill._id ? (
                          "..."
                        ) : (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polyline points="6 9 6 2 18 2 18 9" />
                            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                            <rect x="6" y="14" width="12" height="8" />
                          </svg>
                        )}
                      </PrintBillButton>
                    </BillHeaderRow>
                    {expandedBillId === bill._id && (
                      <>
                        {bill.description && <div>{bill.description}</div>}
                        <div>
                          <Muted>
                            Priloženi PDF:{" "}
                            {bill.attachment?.url ? (
                              <PdfLink
                                href={getPdfDownloadUrl(bill.attachment.url)}
                                download={getBillPdfDownloadName(bill.attachment)}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                {bill.attachment.originalName || "Otvori PDF"}
                              </PdfLink>
                            ) : null}
                          </Muted>
                        </div>
                        <div>
                          <Muted>Priloženi dokumenti:</Muted>
                          <div style={{ display: "flex", flexDirection: "column", gap: "2px", marginTop: 2 }}>
                            {bill.items.map(item => (
                              <div key={item._id} style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                                <div
                                  onClick={e => {
                                    e.stopPropagation();
                                    toggleItemExpand(item._id);
                                  }}
                                  onKeyDown={e => {
                                    if (e.key === "Enter" || e.key === " ") {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      toggleItemExpand(item._id);
                                    }
                                  }}
                                  role="button"
                                  tabIndex={0}
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    gap: "8px",
                                    border: "1px solid rgba(0,0,0,0.1)",
                                    borderRadius: "8px",
                                    padding: "6px 8px",
                                    background: "#f9fafb",
                                    cursor: "pointer",
                                  }}
                                >
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
                                </div>
                                {expandedItemIds.includes(item._id) && (
                                  <div
                                    onClick={e => e.stopPropagation()}
                                    style={{
                                      border: "1px solid rgba(0,0,0,0.08)",
                                      borderRadius: "8px",
                                      padding: "8px 10px",
                                      background: "#ffffff",
                                      display: "grid",
                                      gap: "6px",
                                    }}
                                  >
                                    <Muted>
                                      PDF:{" "}
                                      {item.pdfUrl ? (
                                        <span
                                          style={{
                                            display: "inline-flex",
                                            alignItems: "center",
                                            gap: "8px",
                                            marginLeft: "4px",
                                          }}
                                        >
                                          <PdfLink
                                            href={getPdfDownloadUrl(item.pdfUrl)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            download={getItemPdfDownloadName(item)}
                                            onClick={e => e.stopPropagation()}
                                          >
                                            Otvori PDF
                                          </PdfLink>
                                          <S.Button
                                            type="button"
                                            style={{
                                              width: "auto",
                                              minWidth: "0",
                                              padding: "4px 8px",
                                              fontSize: "0.82rem",
                                            }}
                                            onClick={e => handleItemPdfDownload(item, e)}
                                            aria-label={`Preuzmi PDF za ${item.title}`}
                                          >
                                            Preuzmi
                                          </S.Button>
                                        </span>
                                      ) : (
                                        "N/A"
                                      )}
                                    </Muted>
                                    <Muted>Registracija: {item.registracija || "N/A"}</Muted>
                                    <Muted>Prijevoznik: {item.prijevoznik || "N/A"}</Muted>
                                    <Muted>Materijal / težina: {formatMaterialWeight(item)}</Muted>
                                    {formatApprovalLocation(item) !== "N/A" && (
                                      <S.Button
                                        type="button"
                                        style={{
                                          width: "auto",
                                          minWidth: "0",
                                          padding: "6px 10px",
                                          fontSize: "0.85rem",
                                        }}
                                        onClick={e => {
                                          e.stopPropagation();
                                          const lat = item.approvalLocation?.coordinates?.latitude;
                                          const lon = item.approvalLocation?.coordinates?.longitude;
                                          if (typeof lat === "number" && typeof lon === "number") {
                                            window.open(`https://www.google.com/maps?q=${lat},${lon}`, "_blank");
                                          }
                                        }}
                                      >
                                        Otvori lokaciju
                                      </S.Button>
                                    )}
                                    <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                                      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                        <Muted>Slika (prednja):</Muted>
                                        {item.approvalPhotoFront?.url ? (
                                          <img
                                            src={getImageUrl(item.approvalPhotoFront.url)}
                                            alt="Prednja slika"
                                            style={{
                                              maxWidth: "140px",
                                              maxHeight: "140px",
                                              objectFit: "cover",
                                              cursor: "pointer",
                                            }}
                                            onClick={e => {
                                              e.stopPropagation();
                                              setSelectedImage(getImageUrl(item.approvalPhotoFront!.url!));
                                            }}
                                          />
                                        ) : (
                                          <Muted>N/A</Muted>
                                        )}
                                      </div>
                                      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                        <Muted>Slika (stražnja):</Muted>
                                        {item.approvalPhotoBack?.url ? (
                                          <img
                                            src={getImageUrl(item.approvalPhotoBack.url)}
                                            alt="Stražnja slika"
                                            style={{
                                              maxWidth: "140px",
                                              maxHeight: "140px",
                                              objectFit: "cover",
                                              cursor: "pointer",
                                            }}
                                            onClick={e => {
                                              e.stopPropagation();
                                              setSelectedImage(getImageUrl(item.approvalPhotoBack!.url!));
                                            }}
                                          />
                                        ) : (
                                          <Muted>N/A</Muted>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </BillCard>
                ))}
              </BillList>
            )}
            {printError && <S.ErrorMessage>{printError}</S.ErrorMessage>}
          </Card>
        </ContentGrid>
      </DashboardContainer>
      {selectedImage && token && (
        <ImageViewerModal imageUrl={selectedImage} onClose={() => setSelectedImage(null)} token={token} />
      )}
    </S.PageContainer>
  );
};

export default RacuniPage;
