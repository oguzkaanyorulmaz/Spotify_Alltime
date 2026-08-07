import { useState, useEffect } from 'react'
import { UserSession } from '../App'
import { ApiService, TrackDto, CurrentlyPlayingDto, YearlyWrappedDto, PagedResultDto, WrappedTrackDto, WrappedArtistDto, SpotifyPlaylistDto } from '../Services/ApiService'
import DashboardGrid from '../Components/DashboardGrid'
import HistoryChart from '../Components/HistoryChart'
import ChromaGrid from '../Components/ChromaGrid'
import '../Components/CustomSelect.css'
import {
    Box,
    Button,
    Flex,
    Heading,
    Icon,
    Input,
    SimpleGrid,
    Text,
    VStack,
    useToast,
    Card,
    CardBody,
    Spinner,
    Progress,
    HStack,
    Avatar,
    Skeleton,
    SkeletonCircle,
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalFooter,
    ModalBody,
    ModalCloseButton,
    useDisclosure,
    FormControl,
    FormLabel,
    FormHelperText,
    Checkbox,
    Collapse,
    Select,
    Badge,
    IconButton,
    InputGroup,
    InputLeftElement
} from '@chakra-ui/react'
import { FaUpload, FaMusic, FaFilter, FaTrophy, FaHistory, FaStepBackward, FaStepForward, FaPlay, FaPause, FaSearch, FaBell, FaEllipsisH, FaChartBar, FaPlus, FaCompass } from 'react-icons/fa'

interface LazyArtistAvatarProps {
    spotifyUserId: string;
    artistName: string;
    initialImageUrl?: string;
    size?: string;
    w?: string;
    h?: string;
    border?: string;
}

function LazyArtistAvatar({ spotifyUserId, artistName, initialImageUrl, size, w, h, border }: LazyArtistAvatarProps) {
    const [imageUrl, setImageUrl] = useState<string | undefined>(initialImageUrl);

    useEffect(() => {
        setImageUrl(initialImageUrl);
        if (!initialImageUrl) {
            let isMounted = true;
            ApiService.getLazyArtistImage(spotifyUserId, artistName)
                .then(res => {
                    if (isMounted && res.imageUrl) {
                        setImageUrl(res.imageUrl);
                    }
                })
                .catch(() => {});
            return () => { isMounted = false; };
        }
    }, [initialImageUrl, artistName, spotifyUserId]);

    return (
        <Avatar
            src={imageUrl}
            name={artistName}
            size={size}
            w={w}
            h={h}
            border={border}
        />
    );
}

interface CustomPlaylistModalProps {
    isOpen: boolean;
    onClose: () => void;
    session: any;
}

function CustomPlaylistForm({ isOpen, onClose, session }: CustomPlaylistModalProps) {
    const [customPlaylistName, setCustomPlaylistName] = useState("");
    const [startYear, setStartYear] = useState<string>("");
    const [endYear, setEndYear] = useState<string>("");
    const [includedArtists, setIncludedArtists] = useState("");
    const [excludedArtists, setExcludedArtists] = useState("");
    const [trackCount, setTrackCount] = useState(50);
    const [creatingCustom, setCreatingCustom] = useState(false);
    const [availableYears, setAvailableYears] = useState<number[]>([]);
    const [fillMissing, setFillMissing] = useState(false);
    const [useRandom, setUseRandom] = useState(false);

    const toast = useToast();

    const fetchAvailableYears = async () => {
        try {
            const years = await ApiService.getAvailableYears(session.spotifyUserId);
            setAvailableYears(years);
        } catch (err) {
            console.error("Yıl listesi çekilemedi:", err);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchAvailableYears();
            setCustomPlaylistName("");
            setStartYear("");
            setEndYear("");
            setIncludedArtists("");
            setExcludedArtists("");
            setTrackCount(50);
            setFillMissing(false);
            setUseRandom(false);
        }
    }, [isOpen]);

    const handleCreateCustomPlaylist = async () => {
        const trimmedName = customPlaylistName.trim();
        if (!trimmedName) {
            toast({
                title: "Çalma Listesi İsmi Gerekli",
                description: "Çalma listesi adı boş bırakılamaz.",
                status: "warning",
                duration: 4000,
                isClosable: true,
            });
            return;
        }

        if (trimmedName.length > 100) {
            toast({
                title: "Geçersiz Çalma Listesi İsmi",
                description: "Spotify çalma listesi adı en fazla 100 karakter olabilir.",
                status: "warning",
                duration: 4000,
                isClosable: true,
            });
            return;
        }

        try {
            setCreatingCustom(true);

            const includedList = includedArtists
                ? includedArtists.split(",").map(x => x.trim()).filter(Boolean)
                : undefined;
            const excludedList = excludedArtists
                ? excludedArtists.split(",").map(x => x.trim()).filter(Boolean)
                : undefined;

            const res = await ApiService.createCustomPlaylist(session.spotifyUserId, {
                playlistName: trimmedName,
                startYear: startYear ? parseInt(startYear) : undefined,
                endYear: endYear ? parseInt(endYear) : undefined,
                includedArtists: includedList,
                excludedArtists: excludedList,
                trackCount: trackCount,
                fillMissing: fillMissing,
                useRandom: useRandom
            });

            toast({
                title: "Özel Çalma Listesi Oluşturuldu",
                description: (
                    <span>
                        "{trimmedName}" çalma listeniz başarıyla oluşturuldu.{" "}
                        <a
                            href={res.playlistUrl.replace("https://open.spotify.com/playlist/", "spotify:playlist:")}
                            style={{ textDecoration: 'underline', fontWeight: 'bold', color: '#1DB954' }}
                        >
                            Uygulamada Aç ➜
                        </a>
                        {" veya "}
                        <a
                            href={res.playlistUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ textDecoration: 'underline', fontWeight: 'bold', color: '#1DB954' }}
                        >
                            Tarayıcıda Aç ➜
                        </a>
                    </span>
                ),
                status: "success",
                duration: 10000,
                isClosable: true,
            });
            onClose();
        } catch (err: any) {
            toast({
                title: "Hata Oluştu",
                description: err.message || "Özel çalma listesi oluşturulamadı.",
                status: "error",
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setCreatingCustom(false);
        }
    };

    const inputStyle = {
        bg: '#f8f8f5',
        borderColor: 'rgba(0,0,0,0.08)',
        color: '#1a1a2e',
        borderRadius: 'xl',
        _hover: { borderColor: '#1DB954' },
        _focus: { borderColor: '#1DB954', boxShadow: '0 0 0 1px #1DB954' },
        _placeholder: { color: '#9ca3af' },
        fontSize: 'sm',
        h: '42px',
    };

    return (
        <Collapse in={isOpen} animateOpacity>
            <Box
                bg="#ffffff"
                border="1px solid rgba(0,0,0,0.06)"
                color="#1a1a2e"
                borderRadius="2xl"
                boxShadow="0 4px 20px rgba(0,0,0,0.05)"
                p={6}
                mb={8}
            >
                <Flex justify="space-between" align="center" borderBottom="1px solid rgba(0,0,0,0.06)" pb={3} mb={5}>
                    <Heading size="xs" fontWeight="bold" color="#1a1a2e">
                        Özel Çalma Listesi Tasarla
                    </Heading>
                    <Button
                        size="xs"
                        variant="ghost"
                        color="#6b7280"
                        _hover={{ bg: "rgba(0,0,0,0.04)" }}
                        onClick={onClose}
                    >
                        Kapat
                    </Button>
                </Flex>

                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={8} mb={6}>
                    {/* Sol Sütun */}
                    <VStack spacing={5} align="stretch">
                        <FormControl isRequired>
                            <FormLabel fontSize="xs" fontWeight="bold" textTransform="uppercase" letterSpacing="wider" color="#6b7280" mb={1.5}>Çalma Listesi Adı</FormLabel>
                            <Input
                                value={customPlaylistName}
                                onChange={(e) => setCustomPlaylistName(e.target.value)}
                                placeholder="Örn: Benim Harika Çalma Listem"
                                maxLength={100}
                                {...inputStyle}
                            />
                        </FormControl>

                        <SimpleGrid columns={2} spacing={4} w="full">
                            <FormControl>
                                <FormLabel fontSize="xs" fontWeight="bold" textTransform="uppercase" letterSpacing="wider" color="#6b7280" mb={1.5}>Başlangıç Yılı</FormLabel>
                                <Input
                                    type="number"
                                    value={startYear}
                                    onChange={(e) => setStartYear(e.target.value)}
                                    placeholder="Örn: 2021"
                                    {...inputStyle}
                                />
                            </FormControl>
                            <FormControl>
                                <FormLabel fontSize="xs" fontWeight="bold" textTransform="uppercase" letterSpacing="wider" color="#6b7280" mb={1.5}>Bitiş Yılı</FormLabel>
                                <Input
                                    type="number"
                                    value={endYear}
                                    onChange={(e) => setEndYear(e.target.value)}
                                    placeholder="Örn: 2025"
                                    {...inputStyle}
                                />
                            </FormControl>
                        </SimpleGrid>

                        <FormControl>
                            <FormLabel fontSize="xs" fontWeight="bold" textTransform="uppercase" letterSpacing="wider" color="#6b7280" mb={1.5}>Maksimum Şarkı Sayısı</FormLabel>
                            <Input
                                type="number"
                                min={5}
                                max={1000}
                                value={trackCount}
                                onChange={(e) => setTrackCount(parseInt(e.target.value) || 5)}
                                {...inputStyle}
                            />
                        </FormControl>

                        {availableYears.length > 0 && (
                            <Box bg="#f8f8f5" p={3.5} borderRadius="xl" border="1px solid rgba(0,0,0,0.06)">
                                <Text fontSize="11px" color="#9ca3af" mb={1}>Veritabanındaki dinleme yılları:</Text>
                                <Text fontSize="xs" fontWeight="semibold" color="#1DB954">{availableYears.join(", ")}</Text>
                            </Box>
                        )}
                    </VStack>

                    {/* Sağ Sütun */}
                    <VStack spacing={5} align="stretch">
                        <FormControl>
                            <FormLabel fontSize="xs" fontWeight="bold" textTransform="uppercase" letterSpacing="wider" color="#6b7280" mb={1.5}>Dahil Edilecek Sanatçılar</FormLabel>
                            <Input
                                value={includedArtists}
                                onChange={(e) => setIncludedArtists(e.target.value)}
                                placeholder="Eminem, Paramore, Muse (Virgülle ayırın)"
                                {...inputStyle}
                            />
                            <FormHelperText color="#9ca3af" fontSize="11px" mt={1.5}>Sadece bu şarkıcıları kapsar. Boş bırakırsanız tümü dahil edilir.</FormHelperText>
                        </FormControl>

                        <FormControl>
                            <FormLabel fontSize="xs" fontWeight="bold" textTransform="uppercase" letterSpacing="wider" color="#6b7280" mb={1.5}>Hariç Tutulacak Sanatçılar</FormLabel>
                            <Input
                                value={excludedArtists}
                                onChange={(e) => setExcludedArtists(e.target.value)}
                                placeholder="Coldplay, Taylor Swift (Virgülle ayırın)"
                                {...inputStyle}
                            />
                            <FormHelperText color="#9ca3af" fontSize="11px" mt={1.5}>Bu sanatçıların şarkıları listenin dışında bırakılır.</FormHelperText>
                        </FormControl>

                        <VStack spacing={4} align="stretch" pt={2}>
                            <FormControl>
                                <Checkbox
                                    isChecked={fillMissing}
                                    onChange={(e) => setFillMissing(e.target.checked)}
                                    colorScheme="green"
                                    color="#1a1a2e"
                                    size="md"
                                >
                                    <Text fontSize="xs" fontWeight="bold" color="#374151">{useRandom ? "Eksiği Rastgele Şarkılarla Doldur" : "Eksiği Popüler Şarkılarla Doldur"}</Text>
                                </Checkbox>
                                <FormHelperText color="#9ca3af" fontSize="10px" mt={1} pl={6}>
                                    {useRandom
                                        ? "Dahil edilen şarkı sayısı limitin altında kalırsa, eksik kısım o yıllardaki diğer rastgele şarkılarınızla tamamlanır."
                                        : "Dahil edilen şarkı sayısı limitin altında kalırsa, eksik kısım en popüler diğer şarkılarınızla tamamlanır."
                                    }
                                </FormHelperText>
                            </FormControl>

                            <FormControl>
                                <Checkbox
                                    isChecked={useRandom}
                                    onChange={(e) => setUseRandom(e.target.checked)}
                                    colorScheme="green"
                                    color="#1a1a2e"
                                    size="md"
                                >
                                    <Text fontSize="xs" fontWeight="bold" color="#374151">Rastgele Şarkı Seç (Sıralamayı Önemseme)</Text>
                                </Checkbox>
                                <FormHelperText color="#9ca3af" fontSize="10px" mt={1} pl={6}>
                                    Sıralama yerine filtrelere uyan şarkılar arasından rastgele seçim yapılır.
                                </FormHelperText>
                            </FormControl>
                        </VStack>
                    </VStack>
                </SimpleGrid>

                <Flex justify="flex-end" borderTop="1px solid rgba(0,0,0,0.06)" pt={4}>
                    <Button
                        variant="ghost"
                        mr={3}
                        onClick={onClose}
                        color="#6b7280"
                        _hover={{ bg: "rgba(0,0,0,0.04)", color: "#1a1a2e" }}
                        borderRadius="xl"
                        fontSize="sm"
                    >
                        İptal
                    </Button>
                    <Button
                        bg="#1a1a2e"
                        color="white"
                        fontWeight="bold"
                        _hover={{ bg: "#2d2d4e" }}
                        _active={{ transform: "scale(0.97)" }}
                        isLoading={creatingCustom}
                        loadingText="Oluşturuluyor..."
                        onClick={handleCreateCustomPlaylist}
                        borderRadius="xl"
                        px={6}
                        fontSize="sm"
                    >
                        Çalma Listesini Oluştur ve Eşitle
                    </Button>
                </Flex>
            </Box>
        </Collapse>
    );
}

// Widget Management Modal
function WidgetManageModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    const widgets = [
        { id: 'stats', label: 'İstatistik Kartları', enabled: true },
        { id: 'tracks', label: 'Şarkı Listesi', enabled: true },
        { id: 'artists', label: 'Sanatçılar', enabled: true },
        { id: 'genres', label: 'Tür Dağılımı', enabled: true },
        { id: 'chart', label: 'Dinleme Grafiği', enabled: true },
        { id: 'mood', label: 'Ruh Hali Analizi', enabled: false },
        { id: 'recommendations', label: 'Öneriler', enabled: false },
    ];

    return (
        <Modal isOpen={isOpen} onClose={onClose} isCentered size="md">
            <ModalOverlay bg="rgba(0, 0, 0, 0.3)" backdropFilter="blur(8px)" />
            <ModalContent bg="white" borderRadius="2xl" boxShadow="0 25px 60px rgba(0,0,0,0.12)">
                <ModalHeader fontSize="md" fontWeight="bold" color="#1a1a2e" borderBottom="1px solid rgba(0,0,0,0.06)">
                    Widget'ları Yönet
                </ModalHeader>
                <ModalCloseButton />
                <ModalBody py={4}>
                    <VStack spacing={2} align="stretch">
                        {widgets.map(w => (
                            <Flex
                                key={w.id}
                                align="center"
                                justify="space-between"
                                p={3}
                                borderRadius="xl"
                                bg={w.enabled ? 'rgba(30, 215, 96, 0.06)' : '#f8f8f5'}
                                border={`1px solid ${w.enabled ? 'rgba(30, 215, 96, 0.15)' : 'rgba(0,0,0,0.04)'}`}
                                cursor="pointer"
                                _hover={{ bg: w.enabled ? 'rgba(30, 215, 96, 0.1)' : 'rgba(0,0,0,0.03)' }}
                                transition="all 0.2s"
                            >
                                <HStack spacing={3}>
                                    <Box w="8px" h="8px" borderRadius="full" bg={w.enabled ? '#1DB954' : '#d1d5db'} />
                                    <Text fontSize="sm" fontWeight="600" color="#1a1a2e">{w.label}</Text>
                                </HStack>
                                <Checkbox isChecked={w.enabled} colorScheme="green" isReadOnly />
                            </Flex>
                        ))}
                    </VStack>
                </ModalBody>
                <ModalFooter borderTop="1px solid rgba(0,0,0,0.06)">
                    <Button size="sm" bg="#1a1a2e" color="white" borderRadius="xl" _hover={{ bg: '#2d2d4e' }} onClick={onClose}>
                        Kaydet
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}

interface DashboardProps {
    session: UserSession;
    activeTab?: string;
}

export default function Dashboard({ session, activeTab = 'dashboard' }: DashboardProps) {
    const [tracks, setTracks] = useState<TrackDto[]>([]);
    const [loadingTracks, setLoadingTracks] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [syncingPlaylist, setSyncingPlaylist] = useState(false);
    const [userPlaylists, setUserPlaylists] = useState<SpotifyPlaylistDto[]>([]);
    const [loadingPlaylists, setLoadingPlaylists] = useState(false);
    const [currentlyPlaying, setCurrentlyPlaying] = useState<CurrentlyPlayingDto | null>(null);
    const [selectedYear, setSelectedYear] = useState<number | undefined>(undefined);
    const [wrappedData, setWrappedData] = useState<YearlyWrappedDto | null>(null);
    const [tracksPageData, setTracksPageData] = useState<PagedResultDto<WrappedTrackDto> | null>(null);
    const [artistsPageData, setArtistsPageData] = useState<PagedResultDto<WrappedArtistDto> | null>(null);
    const [trackPage, setTrackPage] = useState(1);
    const [artistPage, setArtistPage] = useState(1);
    const [trackPageInput, setTrackPageInput] = useState("1");
    const [artistPageInput, setArtistPageInput] = useState("1");

    useEffect(() => {
        setTrackPageInput(trackPage.toString());
    }, [trackPage]);

    useEffect(() => {
        setArtistPageInput(artistPage.toString());
    }, [artistPage]);
    const [trackSortBy, setTrackSortBy] = useState<"playcount" | "duration">("playcount");
    const [artistSortBy, setArtistSortBy] = useState<"playcount" | "duration">("playcount");
    const [playlistSortBy, setPlaylistSortBy] = useState<"name-asc" | "name-desc" | "tracks-desc" | "tracks-asc" | "owner" | "manual">("name-asc");
    const [manualPlaylistsOrder, setManualPlaylistsOrder] = useState<string[]>([]);
    const [pinnedPlaylistIds, setPinnedPlaylistIds] = useState<string[]>(() => {
        const stored = localStorage.getItem('pinned_playlists');
        return stored ? JSON.parse(stored) : [];
    });

    const handlePinToggle = (playlistId: string) => {
        setPinnedPlaylistIds(prev => {
            const updated = prev.includes(playlistId)
                ? prev.filter(id => id !== playlistId)
                : [...prev, playlistId];
            localStorage.setItem('pinned_playlists', JSON.stringify(updated));
            return updated;
        });
    };

    const [periodType, setPeriodType] = useState<"all" | "year" | "custom">("all");
    const [customStartDate, setCustomStartDate] = useState<string>("");
    const [customEndDate, setCustomEndDate] = useState<string>("");
    const [analysisModalOpen, setAnalysisModalOpen] = useState(false);
    const [analysisTarget, setAnalysisTarget] = useState<{ type: 'track' | 'artist'; name: string; uriOrName: string } | null>(null);
    const [analysisData, setAnalysisData] = useState<{ label: string; value: number }[]>([]);
    const [loadingAnalysis, setLoadingAnalysis] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);

    const toast = useToast();
    const { isOpen: isCustomOpen, onOpen: onCustomOpen, onClose: onCustomClose } = useDisclosure();
    const { isOpen: isWidgetOpen, onOpen: onWidgetOpen, onClose: onWidgetClose } = useDisclosure();
    const [availableYears, setAvailableYears] = useState<number[]>([]);

    const sortOptions = [
        { value: 'name-asc', label: 'İsim A-Z ↑' },
        { value: 'name-desc', label: 'İsim Z-A ↓' },
        { value: 'tracks-asc', label: 'Şarkı Sayısı Azdan Çoğa ↑' },
        { value: 'tracks-desc', label: 'Şarkı Sayısı Çoktan Aza ↓' },
        { value: 'owner', label: 'Sahibine Göre' },
        { value: 'manual', label: 'Özel' }
    ] as const;

    useEffect(() => {
        if (userPlaylists.length > 0 && manualPlaylistsOrder.length === 0) {
            setManualPlaylistsOrder(userPlaylists.map(p => p.id));
        }
    }, [userPlaylists]);

    const sortedPlaylists = [...userPlaylists].sort((a, b) => {
        const isPinnedA = pinnedPlaylistIds.includes(a.id);
        const isPinnedB = pinnedPlaylistIds.includes(b.id);

        if (isPinnedA && !isPinnedB) return -1;
        if (!isPinnedA && isPinnedB) return 1;

        if (playlistSortBy === 'manual') {
            const orderMap = new Map(manualPlaylistsOrder.map((id, index) => [id, index]));
            const indexA = orderMap.has(a.id) ? orderMap.get(a.id)! : 9999;
            const indexB = orderMap.has(b.id) ? orderMap.get(b.id)! : 9999;
            return indexA - indexB;
        }
        if (playlistSortBy === 'name-asc') {
            return a.name.localeCompare(b.name, 'tr');
        }
        if (playlistSortBy === 'name-desc') {
            return b.name.localeCompare(a.name, 'tr');
        }
        if (playlistSortBy === 'tracks-desc') {
            return b.trackCount - a.trackCount;
        }
        if (playlistSortBy === 'tracks-asc') {
            return a.trackCount - b.trackCount;
        }
        if (playlistSortBy === 'owner') {
            return a.ownerName.localeCompare(b.ownerName, 'tr');
        }
        return 0;
    });

    const fetchAvailableYears = async () => {
        try {
            const years = await ApiService.getAvailableYears(session.spotifyUserId);
            setAvailableYears(years);
        } catch (err) {
            console.error("Yıl listesi çekilemedi:", err);
        }
    };

    const fetchCurrentlyPlaying = async () => {
        try {
            const data = await ApiService.getCurrentlyPlaying(session.spotifyUserId);
            setCurrentlyPlaying(data);
        } catch (err) {
            console.error("Şuan çalıyor bilgisi alınamadı:", err);
        }
    };

    const handleNextTrack = async () => {
        try {
            await ApiService.playerNext(session.spotifyUserId);
            setTimeout(fetchCurrentlyPlaying, 500);
        } catch (err) {
            console.error("Şarkı geçilemedi:", err);
        }
    };

    const handlePreviousTrack = async () => {
        try {
            await ApiService.playerPrevious(session.spotifyUserId);
            setTimeout(fetchCurrentlyPlaying, 500);
        } catch (err) {
            console.error("Önceki şarkıya geçilemedi:", err);
        }
    };

    const handleTogglePlay = async () => {
        if (!currentlyPlaying) return;
        try {
            if (currentlyPlaying.isPlaying) {
                await ApiService.playerPause(session.spotifyUserId);
            } else {
                await ApiService.playerResume(session.spotifyUserId);
            }
            setTimeout(fetchCurrentlyPlaying, 500);
        } catch (err) {
            console.error("Oynatma durumu değiştirilemedi:", err);
        }
    };

    useEffect(() => {
        fetchCurrentlyPlaying();
        const interval = setInterval(fetchCurrentlyPlaying, 20000);
        return () => clearInterval(interval);
    }, [session.spotifyUserId]);

    useEffect(() => {
        if (activeTab === 'playlists') {
            const fetchPlaylists = async () => {
                try {
                    setLoadingPlaylists(true);
                    const playlists = await ApiService.getUserPlaylists(session.spotifyUserId);
                    setUserPlaylists(playlists);
                } catch (err) {
                    console.error("Çalma listeleri yüklenemedi:", err);
                } finally {
                    setLoadingPlaylists(false);
                }
            };
            fetchPlaylists();
        }
    }, [activeTab, session.spotifyUserId]);

    const syncData = async () => {
        try {
            await ApiService.syncRecentlyPlayed(session.spotifyUserId);
            fetchAvailableYears();
        } catch (syncErr) {
            console.warn("Son dinlemeler eşitlenemedi:", syncErr);
        }
    };

    const [loadingTracksPage, setLoadingTracksPage] = useState(false);
    const [loadingArtistsPage, setLoadingArtistsPage] = useState(false);

    const getActiveDates = () => {
        let start: string | undefined = undefined;
        let end: string | undefined = undefined;

        if (periodType === "year" && selectedYear) {
            start = `${selectedYear}-01-01T00:00:00`;
            end = `${selectedYear}-12-31T23:59:59`;
        } else if (periodType === "custom") {
            if (customStartDate) start = `${customStartDate}T00:00:00`;
            if (customEndDate) end = `${customEndDate}T23:59:59`;
        }
        return { start, end };
    };

    const loadTracks = async () => {
        try {
            setLoadingTracks(true);
            const { start, end } = getActiveDates();
            if (periodType === "custom" && (!customStartDate || !customEndDate)) {
                setLoadingTracks(false);
                return;
            }
            const data = await ApiService.getYearlyWrapped(session.spotifyUserId, start, end);
            setWrappedData(data);
        } catch (err: any) {
            toast({
                title: "Veri Yükleme Hatası",
                description: err.message || "Analiz verileri alınamadı.",
                status: "error",
                duration: 3000,
                isClosable: true,
            });
        } finally {
            setLoadingTracks(false);
        }
    };

    const loadTracksPage = async () => {
        try {
            setLoadingTracksPage(true);
            const { start, end } = getActiveDates();
            if (periodType === "custom" && (!customStartDate || !customEndDate)) {
                setLoadingTracksPage(false);
                return;
            }
            const data = await ApiService.getTopTracksPaged(session.spotifyUserId, start, end, trackPage, 50, trackSortBy);
            setTracksPageData(data);
            setTracks(data.items);
        } catch (err: any) {
            console.error("Şarkı listesi yüklenemedi:", err);
        } finally {
            setLoadingTracksPage(false);
        }
    };

    const loadArtistsPage = async () => {
        try {
            setLoadingArtistsPage(true);
            const { start, end } = getActiveDates();
            if (periodType === "custom" && (!customStartDate || !customEndDate)) {
                setLoadingArtistsPage(false);
                return;
            }
            const data = await ApiService.getTopArtistsPaged(session.spotifyUserId, start, end, artistPage, 10, artistSortBy);
            setArtistsPageData(data);
        } catch (err: any) {
            console.error("Sanatçı listesi yüklenemedi:", err);
        } finally {
            setLoadingArtistsPage(false);
        }
    };

    useEffect(() => {
        syncData();
        fetchAvailableYears();
    }, []);

    useEffect(() => {
        setTrackPage(1);
        setArtistPage(1);
        loadTracks();
    }, [periodType, selectedYear, customStartDate, customEndDate]);

    useEffect(() => {
        loadTracksPage();
    }, [periodType, selectedYear, customStartDate, customEndDate, trackPage, trackSortBy]);

    useEffect(() => {
        loadArtistsPage();
    }, [periodType, selectedYear, customStartDate, customEndDate, artistPage, artistSortBy]);


    const handleOpenTrackAnalysis = async (track: WrappedTrackDto) => {
        try {
            setAnalysisTarget({ type: 'track', name: `${track.title} - ${track.artist}`, uriOrName: `spotify:track:${track.spotifyTrackId}` });
            setAnalysisData([]);
            setLoadingAnalysis(true);
            setAnalysisModalOpen(true);
            const history = await ApiService.getTrackPlayHistory(session.spotifyUserId, `spotify:track:${track.spotifyTrackId}`);
            setAnalysisData(history.map(h => ({ label: h.period, value: h.playCount })));
        } catch (err: any) {
            console.error("Şarkı analiz verisi yüklenemedi:", err);
        } finally {
            setLoadingAnalysis(false);
        }
    };

    const handleOpenArtistAnalysis = async (artistName: string) => {
        try {
            setAnalysisTarget({ type: 'artist', name: artistName, uriOrName: artistName });
            setAnalysisData([]);
            setLoadingAnalysis(true);
            setAnalysisModalOpen(true);
            const history = await ApiService.getArtistPlayHistory(session.spotifyUserId, artistName);
            setAnalysisData(history.map(h => ({ label: h.period, value: h.playCount })));
        } catch (err: any) {
            console.error("Sanatçı analiz verisi yüklenemedi:", err);
        } finally {
            setLoadingAnalysis(false);
        }
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || files.length === 0) return;

        setUploading(true);
        let successCount = 0;
        let failedCount = 0;

        for (let i = 0; i < files.length; i++) {
            try {
                await ApiService.uploadHistory(session.spotifyUserId, files[i]);
                successCount++;
            } catch (err) {
                failedCount++;
            }
        }

        setUploading(false);
        toast({
            title: "Yükleme Tamamlandı",
            description: `${successCount} dosya başarıyla yüklendi.${failedCount > 0 ? ` ${failedCount} dosya hata verdi.` : ""}`,
            status: successCount > 0 ? "success" : "error",
            duration: 5000,
            isClosable: true,
        });

        loadTracks();
    };

    const handlePlaylistSync = async () => {
        try {
            setSyncingPlaylist(true);
            const { start, end } = getActiveDates();

            if (periodType === "custom" && (!customStartDate || !customEndDate)) {
                toast({
                    title: "Tarih Seçimi Eksik",
                    description: "Lütfen özel tarih aralığını belirleyin.",
                    status: "warning",
                    duration: 3000,
                    isClosable: true,
                });
                setSyncingPlaylist(false);
                return;
            }

            const res = await ApiService.triggerPlaylistSync(session.spotifyUserId, start, end);

            let listTypeLabel = "All-Time Top 100";
            if (periodType === "year" && selectedYear) {
                listTypeLabel = `${selectedYear} Yılı Top 100`;
            } else if (periodType === "custom") {
                listTypeLabel = "Özel Dönem Top 100";
            }

            toast({
                title: "Senkronizasyon Başarılı",
                description: (
                    <span>
                        {listTypeLabel} listeniz Spotify profilinize aktarıldı.{" "}
                        <a
                            href={res.playlistUrl.replace("https://open.spotify.com/playlist/", "spotify:playlist:")}
                            style={{ textDecoration: 'underline', fontWeight: 'bold', color: '#1DB954' }}
                        >
                            Uygulamada Aç ➜
                        </a>
                        {" veya "}
                        <a
                            href={res.playlistUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ textDecoration: 'underline', fontWeight: 'bold', color: '#1DB954' }}
                        >
                            Tarayıcıda Aç ➜
                        </a>
                    </span>
                ),
                status: "success",
                duration: 8000,
                isClosable: true,
            });
        } catch (err: any) {
            toast({
                title: "Senkronizasyon Hatası",
                description: err.message || "Spotify çalma listesi senkronizasyonu başarısız oldu.",
                status: "error",
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setSyncingPlaylist(false);
        }
    };

    // Discover Page Placeholder
    if (activeTab === 'discover') {
        return (
            <Box p={8}>
                <Flex
                    direction="column"
                    align="center"
                    justify="center"
                    minH="60vh"
                    bg="white"
                    borderRadius="2xl"
                    border="1px solid rgba(0,0,0,0.06)"
                    boxShadow="0 2px 12px rgba(0,0,0,0.04)"
                    p={12}
                >
                    <Flex
                        w="80px"
                        h="80px"
                        borderRadius="full"
                        bg="rgba(244, 162, 97, 0.1)"
                        align="center"
                        justify="center"
                        mb={6}
                    >
                        <Icon as={FaCompass} w={8} h={8} color="#f4a261" />
                    </Flex>
                    <Heading size="lg" color="#1a1a2e" mb={3} fontWeight="800">Yakında Geliyor</Heading>
                    <Text color="#6b7280" fontSize="md" textAlign="center" maxW="400px" lineHeight="tall">
                        Dinleme alışkanlıklarınıza göre yeni müzik önerileri ve keşif listeleri burada olacak.
                    </Text>
                    <Badge mt={4} bg="rgba(244, 162, 97, 0.15)" color="#f4a261" fontSize="xs" px={3} py={1} borderRadius="full">
                        Geliştirme Aşamasında
                    </Badge>
                </Flex>
            </Box>
        );
    }

    // History Page (reuses existing data with different view)
    if (activeTab === 'history') {
        return (
            <Box p={8}>
                <Heading size="md" color="#1a1a2e" mb={6} fontWeight="800">Dinleme Geçmişi</Heading>
                <Box bg="white" borderRadius="2xl" border="1px solid rgba(0,0,0,0.06)" boxShadow="0 2px 12px rgba(0,0,0,0.04)" p={6}>
                    <Text color="#6b7280" mb={4}>Son dinlemeleriniz ve geçmiş verileriniz burada listelenir.</Text>
                    {tracks.length > 0 ? (
                        <DashboardGrid
                            tracks={tracks}
                            spotifyUserId={session.spotifyUserId}
                            startRank={(trackPage - 1) * 50 + 1}
                            onOpenAnalysis={handleOpenTrackAnalysis}
                            isLoading={loadingTracksPage}
                        />
                    ) : (
                        <Flex justify="center" align="center" py={12}>
                            <VStack spacing={2}>
                                <Icon as={FaHistory} w={8} h={8} color="#d1d5db" />
                                <Text color="#6b7280" fontSize="sm">Henüz geçmiş verisi yok.</Text>
                            </VStack>
                        </Flex>
                    )}
                </Box>
            </Box>
        );
    }

    // Playlists Page
    if (activeTab === 'playlists') {
        return (
            <Box p={8}>
                <Flex justify="space-between" align="center" mb={6}>
                    <Heading size="md" color="#1a1a2e" fontWeight="800">Çalma Listeleri</Heading>
                    <Button
                        size="sm"
                        bg="#1a1a2e"
                        color="white"
                        borderRadius="xl"
                        leftIcon={<FaPlus />}
                        _hover={{ bg: '#2d2d4e' }}
                        onClick={onCustomOpen}
                    >
                        Yeni Liste
                    </Button>
                </Flex>

                <CustomPlaylistForm
                    isOpen={isCustomOpen}
                    onClose={onCustomClose}
                    session={session}
                />

                <Box mt={4}>
                    <Flex justify="space-between" align="center" mb={4} wrap="wrap" gap={2}>
                        <Heading size="sm" color="#1a1a2e" fontWeight="800">
                            Spotify Çalma Listelerim
                        </Heading>
                        {userPlaylists.length > 0 && (
                            <HStack spacing={2}>
                                <Text fontSize="xs" fontWeight="bold" color="gray.500" whiteSpace="nowrap">Sırala:</Text>
                                <div className="custom-select-wrapper">
                                    <div className="select">
                                        <div className="selected">
                                            {sortOptions.find(opt => opt.value === playlistSortBy)?.label || 'Sırala'}
                                            <svg className="arrow" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                                                <path d="M7 10l5 5 5-5H7z" fill="white" />
                                            </svg>
                                        </div>
                                        <div className="options">
                                            {sortOptions.filter(opt => opt.value !== playlistSortBy).map((opt) => (
                                                <div
                                                    key={opt.value}
                                                    className="option"
                                                    onClick={() => setPlaylistSortBy(opt.value as any)}
                                                >
                                                    {opt.label}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </HStack>
                        )}
                    </Flex>
                    {loadingPlaylists ? (
                        <Flex justify="center" align="center" py={10}>
                            <Spinner size="lg" color="#1DB954" speed="0.8s" />
                            <Text ml={3} color="gray.500" fontSize="sm">Listeleriniz yükleniyor...</Text>
                        </Flex>
                    ) : userPlaylists.length === 0 ? (
                        <Card bg="white" border="1px solid rgba(0,0,0,0.06)" borderRadius="2xl" p={8} textAlign="center">
                            <Icon as={FaMusic} color="gray.300" w={10} h={10} mb={3} />
                            <Text color="gray.500" fontSize="sm">Henüz çalma listeniz bulunmuyor.</Text>
                        </Card>
                    ) : (
                        <ChromaGrid
                            items={sortedPlaylists.map(playlist => ({
                                id: playlist.id,
                                image: playlist.imageUrl || 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=300&auto=format&fit=crop',
                                title: playlist.name,
                                subtitle: playlist.ownerName ? `Sahibi: ${playlist.ownerName}` : 'Bilinmeyen Sahip',
                                handle: `${playlist.trackCount} ŞARKI`,
                                borderColor: '#1DB954',
                                gradient: 'linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,1) 100%)',
                                url: playlist.externalUrl
                            }))}
                            pinnedIds={pinnedPlaylistIds}
                            onPinToggle={handlePinToggle}
                            onItemClick={(item) => {
                                if (item.url) {
                                    const deepLink = item.url.replace("https://open.spotify.com/playlist/", "spotify:playlist:");
                                    window.location.href = deepLink;
                                }
                            }}
                            onReorder={(newItems) => {
                                setManualPlaylistsOrder(newItems.map(item => item.id));
                                setPlaylistSortBy("manual");
                            }}
                        />
                    )}
                </Box>
            </Box>
        );
    }

    // Main Dashboard
    return (
        <Box bg="#f5f5f0" minH="100vh" pb={8}>
            {/* Top Bar */}
            <Flex
                px={8}
                py={4}
                align="center"
                justify="space-between"
                bg="rgba(245,245,240,0.8)"
                backdropFilter="blur(12px)"
                position="sticky"
                top={0}
                zIndex={50}
                borderBottom="1px solid rgba(0,0,0,0.04)"
            >
                {/* Search */}
                <InputGroup maxW="400px" className="search-bar">
                    <InputLeftElement pointerEvents="none">
                        <Icon as={FaSearch} color="#9ca3af" w={3.5} h={3.5} />
                    </InputLeftElement>
                    <Input
                        placeholder="Şarkı, sanatçı veya albüm ara..."
                        bg="white"
                        border="1px solid rgba(0,0,0,0.08)"
                        borderRadius="14px"
                        color="#1a1a2e"
                        _placeholder={{ color: '#9ca3af' }}
                        _hover={{ borderColor: 'rgba(0,0,0,0.15)' }}
                        _focus={{ borderColor: '#1DB954', boxShadow: '0 0 0 1px #1DB954' }}
                        fontSize="sm"
                        h="42px"
                    />
                    <Flex position="absolute" right={3} top="50%" transform="translateY(-50%)" align="center" gap={1}>
                        <Box bg="#f0f0eb" px={1.5} py={0.5} borderRadius="6px">
                            <Text fontSize="10px" color="#9ca3af" fontWeight="600">⌘ F</Text>
                        </Box>
                    </Flex>
                </InputGroup>

                {/* Right Actions */}
                <HStack spacing={3}>
                    {/* Notification Bell */}
                    <Box position="relative">
                        <IconButton
                            aria-label="Bildirimler"
                            icon={<FaBell />}
                            variant="ghost"
                            color="#6b7280"
                            fontSize="md"
                            borderRadius="12px"
                            w="40px"
                            h="40px"
                            _hover={{ bg: 'rgba(0,0,0,0.04)', color: '#1a1a2e' }}
                            onClick={() => setShowNotifications(!showNotifications)}
                        />
                        <Box
                            position="absolute"
                            top="8px"
                            right="10px"
                            w="7px"
                            h="7px"
                            bg="#ef4444"
                            borderRadius="full"
                            border="2px solid #f5f5f0"
                        />

                        {/* Notification Dropdown */}
                        {showNotifications && (
                            <Box
                                position="absolute"
                                right={0}
                                top="48px"
                                w="320px"
                                bg="white"
                                borderRadius="xl"
                                boxShadow="0 10px 40px rgba(0,0,0,0.12)"
                                border="1px solid rgba(0,0,0,0.06)"
                                zIndex={100}
                                overflow="hidden"
                            >
                                <Flex px={4} py={3} borderBottom="1px solid rgba(0,0,0,0.06)" align="center" justify="space-between">
                                    <Text fontSize="sm" fontWeight="700" color="#1a1a2e">Bildirimler</Text>
                                    <Badge bg="rgba(30, 215, 96, 0.1)" color="#1DB954" fontSize="10px" borderRadius="full">3 yeni</Badge>
                                </Flex>
                                <VStack spacing={0} align="stretch">
                                    {[
                                        { title: 'Çalma listesi güncellendi', desc: 'All-Time Top 100 başarıyla eşitlendi.', time: '2 dk önce', icon: FaMusic },
                                        { title: 'Yeni veri yüklendi', desc: '3 JSON dosyası işlendi.', time: '1 saat önce', icon: FaUpload },
                                        { title: 'Yeni ayın verileri', desc: 'Ağustos 2026 dinleme verileri hazır.', time: '3 saat önce', icon: FaChartBar },
                                    ].map((notif, i) => (
                                        <Flex
                                            key={i}
                                            px={4}
                                            py={3}
                                            gap={3}
                                            align="start"
                                            _hover={{ bg: 'rgba(0,0,0,0.02)' }}
                                            cursor="pointer"
                                            borderBottom={i < 2 ? '1px solid rgba(0,0,0,0.04)' : 'none'}
                                        >
                                            <Flex
                                                w="32px"
                                                h="32px"
                                                borderRadius="10px"
                                                bg="rgba(30, 215, 96, 0.08)"
                                                align="center"
                                                justify="center"
                                                flexShrink={0}
                                                mt={0.5}
                                            >
                                                <Icon as={notif.icon} color="#1DB954" w={3.5} h={3.5} />
                                            </Flex>
                                            <Box flex={1}>
                                                <Text fontSize="xs" fontWeight="600" color="#1a1a2e">{notif.title}</Text>
                                                <Text fontSize="11px" color="#9ca3af">{notif.desc}</Text>
                                                <Text fontSize="10px" color="#c4c4c0" mt={0.5}>{notif.time}</Text>
                                            </Box>
                                        </Flex>
                                    ))}
                                </VStack>
                            </Box>
                        )}
                    </Box>

                    {/* Profile Avatar in top bar */}
                    <Flex
                        w="36px"
                        h="36px"
                        borderRadius="full"
                        bg="linear-gradient(135deg, #1DB954, #064e3b)"
                        align="center"
                        justify="center"
                        cursor="pointer"
                    >
                        <Text fontSize="sm" fontWeight="800" color="white">
                            {session.displayName.charAt(0).toUpperCase()}
                        </Text>
                    </Flex>
                </HStack>
            </Flex>

            {/* Dashboard Content */}
            <Box px={8} pt={6}>
                {/* Period Selection */}
                <Flex direction={{ base: "column", lg: "row" }} justify="space-between" align={{ base: "start", lg: "center" }} gap={4} mb={6}>
                    <VStack align="start" spacing={0.5}>
                        <Heading as="h2" size="lg" fontWeight="800" color="#1a1a2e" letterSpacing="-0.02em">
                            {periodType === "all"
                                ? "Dashboard"
                                : periodType === "year" && selectedYear
                                    ? `${selectedYear} Yılı`
                                    : "Özel Dönem"}
                        </Heading>
                        <Text fontSize="sm" color="#9ca3af">
                            {periodType === "all"
                                ? "Tüm zamanlara ait dinleme analiziniz"
                                : periodType === "year" && selectedYear
                                    ? `${selectedYear} yılına ait özet verileriniz`
                                    : `${customStartDate || '...'} – ${customEndDate || '...'} arası`}
                        </Text>
                    </VStack>
                    <HStack spacing={3} flexWrap="wrap">
                        <Select
                            value={periodType}
                            onChange={(e) => {
                                const val = e.target.value as "all" | "year" | "custom";
                                setPeriodType(val);
                                if (val === "all") {
                                    setSelectedYear(undefined);
                                } else if (val === "year" && !selectedYear && availableYears.length > 0) {
                                    setSelectedYear(availableYears[0]);
                                }
                            }}
                            size="sm"
                            borderRadius="12px"
                            bg="white"
                            borderColor="rgba(0,0,0,0.08)"
                            color="#1a1a2e"
                            _hover={{ borderColor: '#1DB954' }}
                            _focus={{ borderColor: '#1DB954', boxShadow: '0 0 0 1px #1DB954' }}
                            w="150px"
                            h="38px"
                            fontWeight="600"
                        >
                            <option value="all">Tüm Zamanlar</option>
                            <option value="year">Yıllar</option>
                            <option value="custom">Özel Takvim...</option>
                        </Select>

                        {periodType === "year" && (
                            <Select
                                value={selectedYear || ""}
                                onChange={(e) => setSelectedYear(e.target.value ? parseInt(e.target.value) : undefined)}
                                size="sm"
                                borderRadius="12px"
                                bg="white"
                                borderColor="rgba(0,0,0,0.08)"
                                color="#1a1a2e"
                                _hover={{ borderColor: '#1DB954' }}
                                _focus={{ borderColor: '#1DB954', boxShadow: '0 0 0 1px #1DB954' }}
                                w="100px"
                                h="38px"
                                fontWeight="600"
                            >
                                {availableYears.map((year) => (
                                    <option key={year} value={year}>
                                        {year}
                                    </option>
                                ))}
                            </Select>
                        )}

                        {periodType === "custom" && (
                            <HStack spacing={2}>
                                <Input
                                    type="date"
                                    size="sm"
                                    value={customStartDate}
                                    onChange={(e) => setCustomStartDate(e.target.value)}
                                    borderRadius="12px"
                                    bg="white"
                                    borderColor="rgba(0,0,0,0.08)"
                                    color="#1a1a2e"
                                    _focus={{ borderColor: '#1DB954', boxShadow: '0 0 0 1px #1DB954' }}
                                    w="140px"
                                    h="38px"
                                />
                                <Text fontSize="xs" color="#9ca3af">–</Text>
                                <Input
                                    type="date"
                                    size="sm"
                                    value={customEndDate}
                                    onChange={(e) => setCustomEndDate(e.target.value)}
                                    borderRadius="12px"
                                    bg="white"
                                    borderColor="rgba(0,0,0,0.08)"
                                    color="#1a1a2e"
                                    _focus={{ borderColor: '#1DB954', boxShadow: '0 0 0 1px #1DB954' }}
                                    w="140px"
                                    h="38px"
                                />
                            </HStack>
                        )}
                    </HStack>
                </Flex>

                {/* Main Grid Layout — Payflow Style */}
                <SimpleGrid columns={{ base: 1, xl: 4 }} spacing={6} alignItems="start">
                    {/* Left Column (3/4 width) */}
                    <Box gridColumn={{ xl: "span 3" }}>
                        {/* Top Cards Row */}
                        <SimpleGrid columns={{ base: 1, md: 3 }} spacing={5} mb={6}>
                            {/* Total Balance Card — Dark Accent */}
                            <Card
                                bg="#1a1a2e"
                                borderRadius="2xl"
                                boxShadow="0 8px 30px rgba(26,26,46,0.15)"
                                className="dashboard-card"
                                overflow="hidden"
                                position="relative"
                            >
                                <Box
                                    position="absolute"
                                    top="-30px"
                                    right="-30px"
                                    w="100px"
                                    h="100px"
                                    borderRadius="full"
                                    bg="rgba(30, 215, 96, 0.08)"
                                    filter="blur(20px)"
                                />
                                <CardBody p={6}>
                                    <Flex justify="space-between" align="start" mb={4}>
                                        <Text fontSize="xs" fontWeight="600" color="rgba(255,255,255,0.5)" textTransform="uppercase" letterSpacing="wider">
                                            Toplam Dinleme
                                        </Text>
                                        <Badge bg="rgba(30, 215, 96, 0.15)" color="#1DB954" fontSize="10px" borderRadius="full" px={2}>
                                            {periodType === "all" ? "All-Time" : periodType === "year" && selectedYear ? `${selectedYear}` : "Özel"}
                                        </Badge>
                                    </Flex>
                                    <VStack align="start" spacing={1} mb={5}>
                                        <Heading size="xl" color="white" fontWeight="900" letterSpacing="-0.03em">
                                            {wrappedData ? `${wrappedData.totalMinutesPlayed.toLocaleString('tr-TR')}` : '—'}
                                        </Heading>
                                        <Text fontSize="sm" color="rgba(255,255,255,0.4)">dakika dinleme</Text>
                                    </VStack>
                                    <SimpleGrid columns={2} spacing={3}>
                                        <Box w="full">
                                            <Input
                                                type="file"
                                                id="file-upload"
                                                accept=".json"
                                                multiple
                                                onChange={handleFileUpload}
                                                display="none"
                                            />
                                            <Button
                                                as="label"
                                                htmlFor="file-upload"
                                                size="sm"
                                                w="full"
                                                bg="rgba(255,255,255,0.08)"
                                                color="white"
                                                borderRadius="xl"
                                                _hover={{ bg: 'rgba(255,255,255,0.15)' }}
                                                leftIcon={<FaUpload />}
                                                isLoading={uploading}
                                                loadingText="..."
                                                cursor="pointer"
                                                fontWeight="600"
                                                fontSize="xs"
                                            >
                                                Yükle
                                            </Button>
                                        </Box>
                                        <Button
                                            size="sm"
                                            w="full"
                                            bg="rgba(255,255,255,0.08)"
                                            color="white"
                                            borderRadius="xl"
                                            _hover={{ bg: 'rgba(255,255,255,0.15)' }}
                                            leftIcon={<FaMusic />}
                                            isLoading={syncingPlaylist}
                                            loadingText="..."
                                            onClick={handlePlaylistSync}
                                            fontWeight="600"
                                            fontSize="xs"
                                        >
                                            Eşitle
                                        </Button>
                                    </SimpleGrid>
                                </CardBody>
                            </Card>

                            {/* Recent Top Artists — Like "Recent Contacts" */}
                            <Card bg="white" borderRadius="2xl" border="1px solid rgba(0,0,0,0.06)" boxShadow="0 2px 12px rgba(0,0,0,0.04)" className="dashboard-card" gridColumn={{ md: "span 2" }}>
                                <CardBody p={5}>
                                    <Flex justify="space-between" align="center" mb={4}>
                                        <Box>
                                            <Text fontSize="sm" fontWeight="700" color="#1a1a2e">Favori Sanatçılar</Text>
                                            <Text fontSize="xs" color="#9ca3af">En çok dinlediğiniz sanatçılar</Text>
                                        </Box>
                                        <IconButton
                                            aria-label="Tümünü gör"
                                            icon={<FaEllipsisH />}
                                            variant="ghost"
                                            size="sm"
                                            color="#9ca3af"
                                            _hover={{ color: '#1a1a2e' }}
                                            borderRadius="10px"
                                        />
                                    </Flex>
                                    <Flex gap={4} overflowX="auto" pb={2}>
                                        {artistsPageData?.items?.slice(0, 6).map((artist, idx) => (
                                            <VStack key={artist.artistName + idx} spacing={2} minW="60px" cursor="pointer" onClick={() => handleOpenArtistAnalysis(artist.artistName)}>
                                                <LazyArtistAvatar
                                                    spotifyUserId={session.spotifyUserId}
                                                    artistName={artist.artistName}
                                                    initialImageUrl={artist.imageUrl}
                                                    w="52px"
                                                    h="52px"
                                                    border="2px solid rgba(30,215,96,0.2)"
                                                />
                                                <Text fontSize="10px" fontWeight="600" color="#374151" isTruncated maxW="64px" textAlign="center">
                                                    {artist.artistName}
                                                </Text>
                                            </VStack>
                                        ))}
                                        {(!artistsPageData?.items || artistsPageData.items.length === 0) && (
                                            [...Array(6)].map((_, i) => (
                                                <VStack key={i} spacing={2} minW="60px">
                                                    <SkeletonCircle size="52px" />
                                                    <Skeleton h="10px" w="50px" borderRadius="md" />
                                                </VStack>
                                            ))
                                        )}
                                    </Flex>
                                    <Flex mt={3} gap={3}>
                                        <Button
                                            size="sm"
                                            bg="#1a1a2e"
                                            color="white"
                                            borderRadius="full"
                                            _hover={{ bg: '#2d2d4e' }}
                                            leftIcon={<FaPlus />}
                                            onClick={onCustomOpen}
                                            fontWeight="600"
                                            fontSize="xs"
                                            px={5}
                                        >
                                            Yeni Liste
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            color="#6b7280"
                                            borderRadius="full"
                                            _hover={{ bg: 'rgba(0,0,0,0.04)' }}
                                            fontWeight="600"
                                            fontSize="xs"
                                            onClick={onCustomOpen}
                                        >
                                            Filtreli Liste
                                        </Button>
                                    </Flex>
                                </CardBody>
                            </Card>
                        </SimpleGrid>

                        {/* Tracks Table — Like "Transactions" */}
                        {loadingTracks ? (
                            <Flex justify="center" align="center" py={20}>
                                <VStack spacing={3}>
                                    <Spinner color="#1DB954" />
                                    <Text color="#9ca3af" fontSize="sm">Liste yükleniyor...</Text>
                                </VStack>
                            </Flex>
                        ) : tracks.length > 0 ? (
                            <Box>
                                <Flex align="center" justify="space-between" mb={4}>
                                    <Box>
                                        <Heading as="h3" size="sm" fontWeight="700" color="#1a1a2e">
                                            En Çok Dinlenen Şarkılar
                                        </Heading>
                                        <Text fontSize="xs" color="#9ca3af" mt={0.5}>Dinleme geçmişinizi görüntüleyin</Text>
                                    </Box>
                                    <HStack spacing={2}>
                                        <HStack spacing={1} bg="white" p={1} borderRadius="12px" border="1px solid rgba(0,0,0,0.06)">
                                            <Button
                                                size="xs"
                                                variant={trackSortBy === "playcount" ? "solid" : "ghost"}
                                                bg={trackSortBy === "playcount" ? "#1a1a2e" : "transparent"}
                                                color={trackSortBy === "playcount" ? "white" : "#9ca3af"}
                                                onClick={() => { setTrackPage(1); setTrackSortBy("playcount"); }}
                                                _hover={{ bg: trackSortBy === "playcount" ? "#1a1a2e" : "rgba(0,0,0,0.04)" }}
                                                borderRadius="10px"
                                                px={3}
                                                fontWeight="600"
                                            >
                                                Dinlenme
                                            </Button>
                                            <Button
                                                size="xs"
                                                variant={trackSortBy === "duration" ? "solid" : "ghost"}
                                                bg={trackSortBy === "duration" ? "#1a1a2e" : "transparent"}
                                                color={trackSortBy === "duration" ? "white" : "#9ca3af"}
                                                onClick={() => { setTrackPage(1); setTrackSortBy("duration"); }}
                                                _hover={{ bg: trackSortBy === "duration" ? "#1a1a2e" : "rgba(0,0,0,0.04)" }}
                                                borderRadius="10px"
                                                px={3}
                                                fontWeight="600"
                                            >
                                                Süre
                                            </Button>
                                        </HStack>
                                        <IconButton
                                            aria-label="Filtre"
                                            icon={<FaFilter />}
                                            variant="ghost"
                                            size="sm"
                                            color="#9ca3af"
                                            _hover={{ color: '#1a1a2e', bg: 'rgba(0,0,0,0.04)' }}
                                            borderRadius="10px"
                                        />
                                    </HStack>
                                </Flex>

                                <Box opacity={loadingTracksPage ? 0.6 : 1} transition="opacity 0.2s">
                                    <DashboardGrid
                                        tracks={tracks}
                                        spotifyUserId={session.spotifyUserId}
                                        startRank={(trackPage - 1) * 50 + 1}
                                        onOpenAnalysis={handleOpenTrackAnalysis}
                                        isLoading={loadingTracksPage}
                                    />
                                </Box>

                                {tracksPageData && tracksPageData.totalPages > 1 && (
                                    <Flex align="center" justify="space-between" mt={4} px={1}>
                                        <Text fontSize="xs" color="#9ca3af">
                                            {((trackPage - 1) * 50 + 1)}-{Math.min(trackPage * 50, tracksPageData.totalCount)} / {tracksPageData.totalCount.toLocaleString('tr-TR')} şarkı
                                        </Text>
                                        <HStack spacing={2}>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                borderColor="rgba(0,0,0,0.08)"
                                                bg="white"
                                                color="#1a1a2e"
                                                _hover={{ bg: 'rgba(30, 215, 96, 0.06)', borderColor: '#1DB954' }}
                                                isDisabled={trackPage === 1}
                                                onClick={() => setTrackPage(prev => Math.max(prev - 1, 1))}
                                                borderRadius="10px"
                                                fontWeight="600"
                                            >
                                                Önceki
                                            </Button>
                                            <HStack spacing={1.5} align="center">
                                                <Input
                                                    value={trackPageInput}
                                                    onChange={(e) => setTrackPageInput(e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            const val = parseInt(trackPageInput);
                                                            if (!isNaN(val) && val >= 1 && val <= tracksPageData.totalPages) {
                                                                setTrackPage(val);
                                                            } else {
                                                                setTrackPageInput(trackPage.toString());
                                                            }
                                                        }
                                                    }}
                                                    onBlur={() => {
                                                        const val = parseInt(trackPageInput);
                                                        if (!isNaN(val) && val >= 1 && val <= tracksPageData.totalPages) {
                                                            setTrackPage(val);
                                                        } else {
                                                            setTrackPageInput(trackPage.toString());
                                                        }
                                                    }}
                                                    w="45px"
                                                    h="32px"
                                                    textAlign="center"
                                                    fontSize="sm"
                                                    fontWeight="600"
                                                    color="#1a1a2e"
                                                    bg="white"
                                                    border="1px solid rgba(0,0,0,0.08)"
                                                    borderRadius="8px"
                                                    _focus={{ borderColor: '#1DB954', boxShadow: '0 0 0 1px #1DB954' }}
                                                    px={1}
                                                />
                                                <Text fontSize="sm" fontWeight="600" color="#9ca3af">
                                                    / {tracksPageData.totalPages}
                                                </Text>
                                            </HStack>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                borderColor="rgba(0,0,0,0.08)"
                                                bg="white"
                                                color="#1a1a2e"
                                                _hover={{ bg: 'rgba(30, 215, 96, 0.06)', borderColor: '#1DB954' }}
                                                isDisabled={trackPage >= tracksPageData.totalPages}
                                                onClick={() => setTrackPage(prev => Math.min(prev + 1, tracksPageData.totalPages))}
                                                borderRadius="10px"
                                                fontWeight="600"
                                            >
                                                Sonraki
                                            </Button>
                                        </HStack>
                                    </Flex>
                                )}

                                {/* Widget Manager Button */}
                                <Flex justify="center" mt={6}>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        color="#9ca3af"
                                        leftIcon={<FaPlus />}
                                        _hover={{ color: '#1a1a2e', bg: 'rgba(0,0,0,0.04)' }}
                                        borderRadius="xl"
                                        fontWeight="600"
                                        onClick={onWidgetOpen}
                                    >
                                        Widget Ekle veya Yönet
                                    </Button>
                                </Flex>
                            </Box>
                        ) : (
                            <Flex justify="center" align="center" py={20} border="2px dashed rgba(0,0,0,0.08)" borderRadius="2xl" bg="white">
                                <VStack spacing={3}>
                                    <Flex w="64px" h="64px" borderRadius="full" bg="rgba(30,215,96,0.08)" align="center" justify="center">
                                        <Icon as={FaMusic} w={6} h={6} color="#1DB954" />
                                    </Flex>
                                    <Text color="#1a1a2e" fontWeight="600">Henüz veri yok.</Text>
                                    <Text color="#9ca3af" fontSize="xs">Yukarıdan bir geçmiş dosyası yükleyin.</Text>
                                </VStack>
                            </Flex>
                        )}
                    </Box>

                    {/* Right Column (1/4 width) — Stats Panel */}
                    <Box>
                        {/* Stats Summary Cards */}
                        {wrappedData && !loadingTracks && (
                            <VStack spacing={5} align="stretch">
                                {/* Total Listening Card */}
                                <Card bg="white" borderRadius="2xl" border="1px solid rgba(0,0,0,0.06)" boxShadow="0 2px 12px rgba(0,0,0,0.04)" className="dashboard-card">
                                    <CardBody p={5}>
                                        <Flex justify="space-between" align="start" mb={3}>
                                            <Text fontSize="xs" fontWeight="700" color="#1a1a2e" textTransform="uppercase" letterSpacing="wider">
                                                Benzersiz Şarkılar
                                            </Text>
                                            <Badge bg="rgba(30, 215, 96, 0.1)" color="#1DB954" fontSize="9px" borderRadius="full">
                                                Toplam
                                            </Badge>
                                        </Flex>
                                        <Heading size="lg" color="#1a1a2e" fontWeight="900" mb={1}>
                                            {wrappedData.uniqueTracksCount.toLocaleString('tr-TR')}
                                        </Heading>
                                        <Text fontSize="xs" color="#9ca3af">farklı şarkı dinlediniz</Text>
                                    </CardBody>
                                </Card>

                                {/* Top Artist Income-like Card */}
                                <Card bg="white" borderRadius="2xl" border="1px solid rgba(0,0,0,0.06)" boxShadow="0 2px 12px rgba(0,0,0,0.04)" className="dashboard-card">
                                    <CardBody p={5}>
                                        <Flex justify="space-between" align="start" mb={3}>
                                            <Text fontSize="xs" fontWeight="700" color="#1a1a2e" textTransform="uppercase" letterSpacing="wider">
                                                Favori Sanatçı
                                            </Text>
                                        </Flex>
                                        <Heading size="md" color="#1a1a2e" fontWeight="800" mb={0.5} isTruncated>
                                            {wrappedData.topArtistName}
                                        </Heading>
                                        <HStack spacing={1}>
                                            <Text fontSize="sm" color="#1DB954" fontWeight="700">
                                                {wrappedData.topArtistPlayCount.toLocaleString('tr-TR')}
                                            </Text>
                                            <Text fontSize="xs" color="#9ca3af">kez dinlediniz</Text>
                                        </HStack>
                                    </CardBody>
                                </Card>

                                {/* Top Track */}
                                <Card bg="white" borderRadius="2xl" border="1px solid rgba(0,0,0,0.06)" boxShadow="0 2px 12px rgba(0,0,0,0.04)" className="dashboard-card">
                                    <CardBody p={5}>
                                        <Flex justify="space-between" align="start" mb={3}>
                                            <Text fontSize="xs" fontWeight="700" color="#1a1a2e" textTransform="uppercase" letterSpacing="wider">
                                                Favori Şarkı
                                            </Text>
                                            <Icon as={FaTrophy} color="#f4a261" w={4} h={4} />
                                        </Flex>
                                        <Text fontSize="md" color="#1a1a2e" fontWeight="800" mb={0.5} isTruncated>
                                            {wrappedData.topTrackTitle || 'Bilinmiyor'}
                                        </Text>
                                        <Text fontSize="xs" color="#9ca3af" isTruncated>
                                            {wrappedData.topTrackArtistName} • {wrappedData.topTrackMinutesPlayed} dk
                                        </Text>
                                    </CardBody>
                                </Card>

                                {/* Artists List */}
                                {artistsPageData?.items && artistsPageData.items.length > 0 && (
                                    <Card bg="white" borderRadius="2xl" border="1px solid rgba(0,0,0,0.06)" boxShadow="0 2px 12px rgba(0,0,0,0.04)">
                                        <CardBody p={4}>
                                            <Flex align="center" justify="space-between" mb={3}>
                                                <Text fontSize="xs" fontWeight="700" color="#1a1a2e" textTransform="uppercase" letterSpacing="wider">
                                                    Sanatçılar
                                                </Text>
                                                <HStack spacing={1} bg="#f8f8f5" p={0.5} borderRadius="10px">
                                                    <Button
                                                        size="xs"
                                                        variant={artistSortBy === "playcount" ? "solid" : "ghost"}
                                                        bg={artistSortBy === "playcount" ? "#1a1a2e" : "transparent"}
                                                        color={artistSortBy === "playcount" ? "white" : "#9ca3af"}
                                                        onClick={() => { setArtistPage(1); setArtistSortBy("playcount"); }}
                                                        _hover={{ bg: artistSortBy === "playcount" ? "#1a1a2e" : "rgba(0,0,0,0.04)" }}
                                                        borderRadius="8px"
                                                        px={2.5}
                                                        fontSize="10px"
                                                        fontWeight="600"
                                                    >
                                                        Adet
                                                    </Button>
                                                    <Button
                                                        size="xs"
                                                        variant={artistSortBy === "duration" ? "solid" : "ghost"}
                                                        bg={artistSortBy === "duration" ? "#1a1a2e" : "transparent"}
                                                        color={artistSortBy === "duration" ? "white" : "#9ca3af"}
                                                        onClick={() => { setArtistPage(1); setArtistSortBy("duration"); }}
                                                        _hover={{ bg: artistSortBy === "duration" ? "#1a1a2e" : "rgba(0,0,0,0.04)" }}
                                                        borderRadius="8px"
                                                        px={2.5}
                                                        fontSize="10px"
                                                        fontWeight="600"
                                                    >
                                                        Süre
                                                    </Button>
                                                </HStack>
                                            </Flex>
                                            <VStack align="stretch" spacing={1.5} opacity={loadingArtistsPage ? 0.6 : 1} transition="opacity 0.2s">
                                                {loadingArtistsPage ? (
                                                    [...Array(10)].map((_, i) => (
                                                        <Flex key={i} align="center" justify="space-between" p={2}>
                                                            <HStack spacing={3}>
                                                                <Skeleton w="20px" h="20px" borderRadius="md" />
                                                                <SkeletonCircle size="28px" />
                                                                <Skeleton h="12px" w="80px" borderRadius="md" />
                                                            </HStack>
                                                        </Flex>
                                                    ))
                                                ) : (
                                                    artistsPageData.items.map((artist, idx) => {
                                                        const currentRank = (artistPage - 1) * 10 + idx + 1;
                                                        return (
                                                            <Flex
                                                                key={artist.artistName + idx}
                                                                align="center"
                                                                justify="space-between"
                                                                p={2}
                                                                borderRadius="12px"
                                                                _hover={{ bg: "rgba(30, 215, 96, 0.04)" }}
                                                                transition="background 0.2s"
                                                            >
                                                                <HStack spacing={2.5}>
                                                                    <Badge
                                                                        variant="solid"
                                                                        bg={currentRank === 1 ? "#1DB954" : currentRank === 2 ? "#065f46" : currentRank === 3 ? "#064e3b" : "rgba(0,0,0,0.06)"}
                                                                        color={currentRank <= 3 ? "white" : "#6b7280"}
                                                                        fontSize="9px"
                                                                        borderRadius="md"
                                                                        w="20px"
                                                                        h="20px"
                                                                        display="flex"
                                                                        alignItems="center"
                                                                        justifyContent="center"
                                                                    >
                                                                        #{currentRank}
                                                                    </Badge>
                                                                    <LazyArtistAvatar
                                                                        spotifyUserId={session.spotifyUserId}
                                                                        artistName={artist.artistName}
                                                                        initialImageUrl={artist.imageUrl}
                                                                        w="28px"
                                                                        h="28px"
                                                                        border="1px solid rgba(0,0,0,0.06)"
                                                                    />
                                                                    <HStack spacing={1} align="center">
                                                                        <a
                                                                            href={`spotify:search:${encodeURIComponent(artist.artistName)}`}
                                                                            style={{ textDecoration: 'none' }}
                                                                        >
                                                                            <Text
                                                                                fontSize="xs"
                                                                                fontWeight="600"
                                                                                color="#1a1a2e"
                                                                                isTruncated
                                                                                maxW="90px"
                                                                                _hover={{ color: '#1DB954', textDecoration: 'underline' }}
                                                                                transition="color 0.2s"
                                                                                cursor="pointer"
                                                                            >
                                                                                {artist.artistName}
                                                                            </Text>
                                                                        </a>
                                                                        <IconButton
                                                                            aria-label="Analiz"
                                                                            icon={<FaHistory />}
                                                                            size="xs"
                                                                            variant="ghost"
                                                                            color="#d1d5db"
                                                                            _hover={{ color: "#1DB954", bg: "rgba(30, 215, 96, 0.08)" }}
                                                                            onClick={() => handleOpenArtistAnalysis(artist.artistName)}
                                                                            h="16px"
                                                                            w="16px"
                                                                            minW="16px"
                                                                        />
                                                                    </HStack>
                                                                </HStack>
                                                                <VStack align="end" spacing={0} flexShrink={0}>
                                                                    <Text fontSize="xs" fontWeight="700" color="#1a1a2e">
                                                                        {artist.playCount}
                                                                    </Text>
                                                                    <Text fontSize="9px" color="#9ca3af">
                                                                        {artist.totalMinutesPlayed.toLocaleString('tr-TR')} dk
                                                                    </Text>
                                                                </VStack>
                                                            </Flex>
                                                        );
                                                    })
                                                )}
                                            </VStack>

                                            {artistsPageData.totalPages > 1 && (
                                                <Flex align="center" justify="space-between" mt={3} pt={3} borderTop="1px solid rgba(0,0,0,0.06)">
                                                    <Button
                                                        size="xs"
                                                        variant="outline"
                                                        borderColor="rgba(0,0,0,0.08)"
                                                        color="#1a1a2e"
                                                        _hover={{ bg: "rgba(30, 215, 96, 0.06)", borderColor: "#1DB954" }}
                                                        isDisabled={artistPage === 1}
                                                        onClick={() => setArtistPage(prev => Math.max(prev - 1, 1))}
                                                        borderRadius="8px"
                                                    >
                                                        Geri
                                                    </Button>
                                                    <HStack spacing={1.5} align="center">
                                                        <Input
                                                            value={artistPageInput}
                                                            onChange={(e) => setArtistPageInput(e.target.value)}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') {
                                                                    const val = parseInt(artistPageInput);
                                                                    if (!isNaN(val) && val >= 1 && val <= artistsPageData.totalPages) {
                                                                        setArtistPage(val);
                                                                    } else {
                                                                        setArtistPageInput(artistPage.toString());
                                                                    }
                                                                }
                                                            }}
                                                            onBlur={() => {
                                                                const val = parseInt(artistPageInput);
                                                                if (!isNaN(val) && val >= 1 && val <= artistsPageData.totalPages) {
                                                                    setArtistPage(val);
                                                                } else {
                                                                    setArtistPageInput(artistPage.toString());
                                                                }
                                                            }}
                                                            w="45px"
                                                            h="28px"
                                                            textAlign="center"
                                                            fontSize="xs"
                                                            fontWeight="600"
                                                            color="#1a1a2e"
                                                            bg="white"
                                                            border="1px solid rgba(0,0,0,0.08)"
                                                            borderRadius="8px"
                                                            _focus={{ borderColor: '#1DB954', boxShadow: '0 0 0 1px #1DB954' }}
                                                        />
                                                        <Text fontSize="xs" fontWeight="600" color="#9ca3af">
                                                            / {artistsPageData.totalPages}
                                                        </Text>
                                                    </HStack>
                                                    <Button
                                                        size="xs"
                                                        variant="outline"
                                                        borderColor="rgba(0,0,0,0.08)"
                                                        color="#1a1a2e"
                                                        _hover={{ bg: "rgba(30, 215, 96, 0.06)", borderColor: "#1DB954" }}
                                                        isDisabled={artistPage >= artistsPageData.totalPages}
                                                        onClick={() => setArtistPage(prev => Math.min(prev + 1, artistsPageData.totalPages))}
                                                        borderRadius="8px"
                                                    >
                                                        İleri
                                                    </Button>
                                                </Flex>
                                            )}
                                        </CardBody>
                                    </Card>
                                )}

                                {/* Genre Distribution — Like "Exchange" */}
                                {wrappedData?.topGenres && wrappedData.topGenres.length > 0 && (
                                    <Card bg="white" borderRadius="2xl" border="1px solid rgba(0,0,0,0.06)" boxShadow="0 2px 12px rgba(0,0,0,0.04)" className="dashboard-card">
                                        <CardBody p={5}>
                                            <Text fontSize="xs" fontWeight="700" color="#1a1a2e" textTransform="uppercase" letterSpacing="wider" mb={4}>
                                                Tür Dağılımı
                                            </Text>
                                            <VStack spacing={3} align="stretch">
                                                {wrappedData.topGenres.slice(0, 7).map((genreCount, index) => {
                                                    const maxPlayCount = wrappedData.topGenres[0].playCount || 1;
                                                    const percentage = (genreCount.playCount / maxPlayCount) * 100;

                                                    return (
                                                        <Box key={genreCount.genre} w="full">
                                                            <Flex justify="space-between" align="center" mb={1}>
                                                                <Text fontSize="xs" fontWeight="600" color="#374151">
                                                                    {index + 1}. {genreCount.genre}
                                                                </Text>
                                                                <Text fontSize="10px" fontWeight="600" color="#9ca3af">
                                                                    {genreCount.playCount.toLocaleString('tr-TR')}
                                                                </Text>
                                                            </Flex>
                                                            <Progress
                                                                value={percentage}
                                                                size="xs"
                                                                borderRadius="full"
                                                                bg="rgba(0,0,0,0.04)"
                                                                sx={{
                                                                    '& > div': {
                                                                        bg: index === 0 ? '#1DB954' : index === 1 ? '#34d399' : '#6ee7b7',
                                                                        borderRadius: 'full',
                                                                    }
                                                                }}
                                                            />
                                                        </Box>
                                                    );
                                                })}
                                            </VStack>
                                        </CardBody>
                                    </Card>
                                )}
                            </VStack>
                        )}
                    </Box>
                </SimpleGrid>
            </Box>

            {/* Custom Playlist Creator inline collapse */}
            <CustomPlaylistForm
                isOpen={isCustomOpen}
                onClose={onCustomClose}
                session={session}
            />

            {/* Widget Management Modal */}
            <WidgetManageModal isOpen={isWidgetOpen} onClose={onWidgetClose} />

            {/* Dinleme Sıklığı Analiz Modalı */}
            <Modal isOpen={analysisModalOpen} onClose={() => setAnalysisModalOpen(false)} size="4xl" isCentered>
                <ModalOverlay bg="rgba(0, 0, 0, 0.3)" backdropFilter="blur(8px)" />
                <ModalContent bg="white" border="1px solid rgba(0,0,0,0.06)" color="#1a1a2e" borderRadius="2xl" mx={4} boxShadow="0 25px 60px rgba(0,0,0,0.15)">
                    <ModalHeader borderBottom="1px solid rgba(0,0,0,0.06)" py={5} px={6}>
                        <Flex align="center" justify="space-between">
                            <VStack align="start" spacing={1}>
                                <HStack spacing={2}>
                                    <Box w="3px" h="18px" bg="#1DB954" borderRadius="full" />
                                    <Text fontSize="xs" fontWeight="bold" textTransform="uppercase" letterSpacing="widest" color="#1DB954">
                                        Dinleme Sıklığı Analizi
                                    </Text>
                                </HStack>
                                <Text fontSize="lg" fontWeight="bold" color="#1a1a2e" isTruncated maxW="600px">
                                    {analysisTarget?.name}
                                </Text>
                            </VStack>
                        </Flex>
                    </ModalHeader>
                    <ModalCloseButton color="#9ca3af" _hover={{ color: "#1a1a2e", bg: "rgba(0,0,0,0.04)" }} borderRadius="lg" />
                    <ModalBody py={6} px={6} bg="#f8f8f5" borderBottomRadius="2xl">
                        {loadingAnalysis ? (
                            <Flex justify="center" align="center" h="400px">
                                <VStack spacing={4}>
                                    <Spinner size="xl" color="#1DB954" thickness="3px" speed="0.8s" />
                                    <Text color="#9ca3af" fontSize="sm">Analiz verileri yükleniyor...</Text>
                                </VStack>
                            </Flex>
                        ) : (
                            <HistoryChart data={analysisData} title={analysisTarget?.name || ""} />
                        )}
                    </ModalBody>
                    <ModalFooter borderTop="1px solid rgba(0,0,0,0.06)" py={3} px={6}>
                        <Button
                            variant="ghost"
                            color="#9ca3af"
                            _hover={{ color: "#1a1a2e", bg: "rgba(0,0,0,0.04)" }}
                            onClick={() => setAnalysisModalOpen(false)}
                            borderRadius="lg"
                            size="sm"
                        >
                            Kapat
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>

            {/* Floating Now Playing */}
            {currentlyPlaying && (
                <Box
                    position="fixed"
                    bottom="6"
                    right="6"
                    zIndex={999}
                    transition="all 0.3s ease"
                    _hover={{ transform: "translateY(-3px)" }}
                >
                    <Box
                        w="300px"
                        h="120px"
                        bg="#1a1a2e"
                        borderRadius="20px"
                        border="1px solid rgba(30, 215, 96, 0.2)"
                        p="3.5"
                        color="white"
                        boxShadow="0 12px 40px rgba(0,0,0,0.2)"
                        userSelect="none"
                    >
                        {/* Header */}
                        <Flex justify="space-between" align="center" mb={2}>
                            <Flex align="center">
                                <svg height="18px" width="18px" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
                                    <linearGradient gradientUnits="userSpaceOnUse" gradientTransform="translate(0 -534)" y2="590.253" y1="530.096" x2="32" x1="32" id="dbSpGreen"><stop stopColor="#42d778" offset="0"></stop><stop stopColor="#3dca76" offset=".428"></stop><stop stopColor="#34b171" offset="1"></stop></linearGradient>
                                    <path d="M57,32c0,12.837-9.663,23.404-22.115,24.837C33.942,56.942,32.971,57,32,57	c-1.644,0-3.25-0.163-4.808-0.471C15.683,54.298,7,44.163,7,32C7,18.192,18.192,7,32,7S57,18.192,57,32z" fill="url(#dbSpGreen)"></path>
                                    <path d="M41.683,44.394c-0.365,0-0.731-0.181-1.096-0.365c-3.471-2.009-7.674-3.105-12.24-3.105	c-2.559,0-5.116,0.364-7.491,0.912c-0.365,0-0.914,0.183-1.096,0.183c-0.914,0-1.461-0.732-1.461-1.462	c0-0.913,0.547-1.463,1.279-1.643c2.923-0.732,5.846-1.096,8.951-1.096c5.116,0,9.866,1.276,13.885,3.655	c0.548,0.364,0.914,0.73,0.914,1.642C43.145,43.847,42.414,44.394,41.683,44.394z" fill="#fff"></path>
                                </svg>
                                <Text ml={1.5} fontWeight="bold" fontSize="10px" color="#1DB954" letterSpacing="widest">ŞUAN DİNLENİYOR</Text>
                            </Flex>
                        </Flex>

                        {/* Main Player Area */}
                        <Flex align="center" gap={3} mt={1}>
                            {/* Album Cover */}
                            <Box cursor="pointer" onClick={handleTogglePlay}>
                                {currentlyPlaying.imageUrl ? (
                                    <Box
                                        w="70px"
                                        h="70px"
                                        borderRadius="12px"
                                        backgroundImage={`url(${currentlyPlaying.imageUrl})`}
                                        backgroundSize="cover"
                                        backgroundPosition="center"
                                        boxShadow="0 4px 12px rgba(0,0,0,0.3)"
                                        transition="transform 0.2s ease"
                                        _hover={{ transform: 'scale(1.03)' }}
                                    />
                                ) : (
                                    <Flex
                                        w="70px"
                                        h="70px"
                                        bg="gray.700"
                                        borderRadius="12px"
                                        align="center"
                                        justify="center"
                                        boxShadow="0 4px 12px rgba(0,0,0,0.3)"
                                    >
                                        <Icon as={FaMusic} color="gray.500" w={5} h={5} />
                                    </Flex>
                                )}
                            </Box>

                            {/* Song and Controls */}
                            <Flex direction="column" flex={1} minW={0} justify="center">
                                <Text
                                    fontWeight="700"
                                    fontSize="13px"
                                    color="white"
                                    noOfLines={1}
                                    mb={0.5}
                                >
                                    {currentlyPlaying.title}
                                </Text>
                                <Text
                                    fontSize="11px"
                                    color="gray.400"
                                    noOfLines={1}
                                    mb={2.5}
                                >
                                    {currentlyPlaying.artist}
                                </Text>

                                {/* Playback Controls */}
                                <HStack spacing={3} align="center">
                                    <IconButton
                                        aria-label="Önceki"
                                        icon={<FaStepBackward />}
                                        size="xs"
                                        variant="ghost"
                                        color="gray.400"
                                        _hover={{ color: "#1DB954", bg: "transparent" }}
                                        onClick={handlePreviousTrack}
                                        p={0}
                                        minW="auto"
                                        h="auto"
                                        fontSize="10px"
                                    />
                                    <IconButton
                                        aria-label={currentlyPlaying.isPlaying ? "Durdur" : "Başlat"}
                                        icon={currentlyPlaying.isPlaying ? <FaPause size="10" /> : <FaPlay size="10" style={{ transform: 'translateX(1px)' }} />}
                                        size="xs"
                                        colorScheme="green"
                                        bg="#1db954"
                                        color="white"
                                        borderRadius="full"
                                        _hover={{ bg: "#1ed760", transform: 'scale(1.08)' }}
                                        _active={{ transform: 'scale(0.95)' }}
                                        onClick={handleTogglePlay}
                                        w="26px"
                                        h="26px"
                                        minW="auto"
                                    />
                                    <IconButton
                                        aria-label="Sonraki"
                                        icon={<FaStepForward />}
                                        size="xs"
                                        variant="ghost"
                                        color="gray.400"
                                        _hover={{ color: "#1DB954", bg: "transparent" }}
                                        onClick={handleNextTrack}
                                        p={0}
                                        minW="auto"
                                        h="auto"
                                        fontSize="10px"
                                    />
                                </HStack>
                            </Flex>

                            {/* Equalizer animation */}
                            <Flex h="20px" align="center" pr={1}>
                                {currentlyPlaying.isPlaying && (
                                    <HStack spacing="2px" h="16px" align="flex-end">
                                        <Box w="2px" bg="#1DB954" borderRadius="1px" animation="1s moveEqualizer infinite alternate" style={{ animationDelay: '0.1s' }} />
                                        <Box w="2px" bg="#1DB954" borderRadius="1px" animation="1.2s moveEqualizer infinite alternate" style={{ animationDelay: '0.3s' }} />
                                        <Box w="2px" bg="#1DB954" borderRadius="1px" animation="0.8s moveEqualizer infinite alternate" style={{ animationDelay: '0.5s' }} />
                                    </HStack>
                                )}
                            </Flex>
                        </Flex>
                    </Box>
                </Box>
            )}
        </Box>
    );
}
