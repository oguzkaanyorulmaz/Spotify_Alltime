import { useState, useEffect } from 'react'
import { UserSession } from '../App'
import { ApiService, TrackDto, CurrentlyPlayingDto, YearlyWrappedDto, PagedResultDto, WrappedTrackDto, WrappedArtistDto } from '../Services/ApiService'
import DashboardGrid from '../Components/DashboardGrid'
import HistoryChart from '../Components/HistoryChart'
import {
    Box,
    Button,
    Container,
    Flex,
    Heading,
    Icon,
    Image,
    Input,
    SimpleGrid,
    Text,
    VStack,
    useToast,
    Divider,
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
    Select,
    Badge,
    IconButton
} from '@chakra-ui/react'
import { FaSignOutAlt, FaUpload, FaMusic, FaFilter, FaClock, FaUser, FaTrophy, FaCalendarAlt, FaHistory } from 'react-icons/fa'

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


interface DashboardProps {
    session: UserSession;
    onLogout: () => void;
}

export default function Dashboard({ session, onLogout }: DashboardProps) {
    const [tracks, setTracks] = useState<TrackDto[]>([]);
    const [loadingTracks, setLoadingTracks] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [syncingPlaylist, setSyncingPlaylist] = useState(false);
    const [currentlyPlaying, setCurrentlyPlaying] = useState<CurrentlyPlayingDto | null>(null);
    const [selectedYear, setSelectedYear] = useState<number | undefined>(undefined);
    const [wrappedData, setWrappedData] = useState<YearlyWrappedDto | null>(null);
    const [tracksPageData, setTracksPageData] = useState<PagedResultDto<WrappedTrackDto> | null>(null);
    const [artistsPageData, setArtistsPageData] = useState<PagedResultDto<WrappedArtistDto> | null>(null);
    const [trackPage, setTrackPage] = useState(1);
    const [artistPage, setArtistPage] = useState(1);
    const [trackSortBy, setTrackSortBy] = useState<"playcount" | "duration">("playcount");
    const [artistSortBy, setArtistSortBy] = useState<"playcount" | "duration">("playcount");
    const [periodType, setPeriodType] = useState<"all" | "year" | "custom">("all");
    const [customStartDate, setCustomStartDate] = useState<string>("");
    const [customEndDate, setCustomEndDate] = useState<string>("");
    const [analysisModalOpen, setAnalysisModalOpen] = useState(false);
    const [analysisTarget, setAnalysisTarget] = useState<{ type: 'track' | 'artist'; name: string; uriOrName: string } | null>(null);
    const [analysisData, setAnalysisData] = useState<{ label: string; value: number }[]>([]);
    const [loadingAnalysis, setLoadingAnalysis] = useState(false);



    // Custom Playlist Generator States
    const { isOpen: isCustomOpen, onOpen: onCustomOpen, onClose: onCustomClose } = useDisclosure();
    const [customPlaylistName, setCustomPlaylistName] = useState("Kişisel All-Time Karması");
    const [isNameManuallyEdited, setIsNameManuallyEdited] = useState(false);
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
        if (isCustomOpen) {
            fetchAvailableYears();
            setIsNameManuallyEdited(false);
            setStartYear("");
            setEndYear("");
            setIncludedArtists("");
            setExcludedArtists("");
            setTrackCount(50);
            setFillMissing(false);
            setUseRandom(false);
        }
    }, [isCustomOpen]);

    useEffect(() => {
        if (!isNameManuallyEdited) {
            let name = "Kişisel All-Time Karması";
            const artists = includedArtists.trim();
            const start = startYear.trim();
            const end = endYear.trim();

            if (artists && (start || end)) {
                const primaryArtist = artists.split(",")[0].trim();
                const yearRange = start === end ? start : (start && end ? `${start}-${end}` : (start ? `${start}+` : `-${end}`));
                name = `${primaryArtist} Seçkisi (${yearRange})`;
            } else if (artists) {
                const artistList = artists.split(",").map(x => x.trim()).filter(Boolean);
                if (artistList.length === 1) {
                    name = `${artistList[0]} Özel Dinleme Listesi`;
                } else if (artistList.length > 1) {
                    name = `${artistList[0]} ve Diğerleri`;
                }
            } else if (start || end) {
                if (start && end) {
                    name = start === end ? `${start} Favori Şarkılarım` : `${start}-${end} Yılları En İyiler`;
                } else if (start) {
                    name = `${start} Yılından Beri En İyiler`;
                } else if (end) {
                    name = `${end} Yılına Kadar En İyiler`;
                }
            } else {
                name = "Kişisel All-Time Karması";
            }

            setCustomPlaylistName(name);
        }
    }, [startYear, endYear, includedArtists, isNameManuallyEdited]);

    const handleCreateCustomPlaylist = async () => {
        try {
            setCreatingCustom(true);

            const includedList = includedArtists
                ? includedArtists.split(",").map(x => x.trim()).filter(Boolean)
                : undefined;
            const excludedList = excludedArtists
                ? excludedArtists.split(",").map(x => x.trim()).filter(Boolean)
                : undefined;

            const res = await ApiService.createCustomPlaylist(session.spotifyUserId, {
                playlistName: customPlaylistName,
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
                        "{customPlaylistName}" çalma listeniz başarıyla oluşturuldu.{" "}
                        <a
                            href={res.playlistUrl.replace("https://open.spotify.com/playlist/", "spotify:playlist:")}
                            style={{ textDecoration: 'underline', fontWeight: 'bold', color: '#10b981' }}
                        >
                            Uygulamada Aç ➜
                        </a>
                        {" veya "}
                        <a
                            href={res.playlistUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ textDecoration: 'underline', fontWeight: 'bold', color: '#10b981' }}
                        >
                            Tarayıcıda Aç ➜
                        </a>
                    </span>
                ),
                status: "success",
                duration: 10000,
                isClosable: true,
            });
            onCustomClose();
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

    const fetchCurrentlyPlaying = async () => {
        try {
            const data = await ApiService.getCurrentlyPlaying(session.spotifyUserId);
            setCurrentlyPlaying(data);
        } catch (err) {
            console.error("Şuan çalıyor bilgisi alınamadı:", err);
        }
    };

    useEffect(() => {
        fetchCurrentlyPlaying();
        const interval = setInterval(fetchCurrentlyPlaying, 20000);
        return () => clearInterval(interval);
    }, [session.spotifyUserId]);

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
                            style={{ textDecoration: 'underline', fontWeight: 'bold', color: '#10b981' }}
                        >
                            Uygulamada Aç ➜
                        </a>
                        {" veya "}
                        <a
                            href={res.playlistUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ textDecoration: 'underline', fontWeight: 'bold', color: '#10b981' }}
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

    return (
        <Box bg="#F4F5F7" minH="100vh" py={8} px={{ base: 4, md: 8 }}>
            <Container maxW="container.2xl">
                {/* Header */}
                <Flex justify="space-between" align="center" mb={10}>
                    <VStack align="left" spacing={1}>
                        <Heading as="h1" size="lg" fontWeight="black" color="#111111">
                            Spotify True All-Time
                        </Heading>
                        <Text color="#718096" fontSize="sm">
                            Oturum açan kullanıcı: <strong>{session.displayName}</strong>
                        </Text>
                    </VStack>
                    <Button
                        size="sm"
                        colorScheme="red"
                        variant="ghost"
                        leftIcon={<FaSignOutAlt />}
                        onClick={onLogout}
                        _hover={{ bg: "rgba(224, 86, 86, 0.1)" }}
                    >
                        Çıkış Yap
                    </Button>
                </Flex>

                {/* Action Panel */}
                <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6} mb={10}>
                    {/* Card 1: Upload JSON */}
                    <Card bg="white" border="1px solid #E4E7EB" shadow="sm" transition="all 0.3s" _hover={{ shadow: "md" }}>
                        <CardBody>
                            <VStack align="start" spacing={4}>
                                <Flex p={3} bg="rgba(253, 187, 48, 0.1)" color="#FDBB30" borderRadius="lg">
                                    <Icon as={FaUpload} w={5} h={5} />
                                </Flex>
                                <Box>
                                    <Heading size="xs" color="#111111" mb={1}>Veri Yükleme</Heading>
                                    <Text fontSize="xs" color="#718096">Spotify'dan geçmiş JSON dosyalarını yükleyin.</Text>
                                </Box>
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
                                        bg="#111111"
                                        color="white"
                                        _hover={{ bg: "black" }}
                                        leftIcon={<FaUpload />}
                                        isLoading={uploading}
                                        loadingText="Yükleniyor..."
                                        cursor="pointer"
                                    >
                                        JSON Dosyası Seç
                                    </Button>
                                </Box>
                            </VStack>
                        </CardBody>
                    </Card>

                    {/* Card 3: Playlist Sync */}
                    <Card bg="white" border="1px solid #E4E7EB" shadow="sm" transition="all 0.3s" _hover={{ shadow: "md" }}>
                        <CardBody>
                            <VStack align="start" spacing={4}>
                                <Flex p={3} bg="rgba(253, 187, 48, 0.1)" color="#FDBB30" borderRadius="lg">
                                    <Icon as={FaMusic} w={5} h={5} />
                                </Flex>
                                <Box>
                                    <Heading size="xs" color="#111111" mb={1}>Çalma Listesi Eşitleme</Heading>
                                    <Text fontSize="xs" color="#718096">
                                        {periodType === "year" && selectedYear
                                            ? `Seçili ${selectedYear} yılı en çok dinlenen 100 şarkısını Spotify hesabınıza aktarın.`
                                            : periodType === "custom"
                                            ? "Seçili özel tarih aralığının en çok dinlenen 100 şarkısını Spotify hesabınıza aktarın."
                                            : "All-Time en çok dinlenen 100 şarkınızı Spotify hesabınıza eşitleyin."}
                                    </Text>
                                </Box>
                                <Button
                                    size="sm"
                                    w="full"
                                    bg="#111111"
                                    color="white"
                                    _hover={{ bg: "black" }}
                                    leftIcon={<FaMusic />}
                                    isLoading={syncingPlaylist}
                                    loadingText="Eşitleniyor..."
                                    onClick={handlePlaylistSync}
                                >
                                    Çalma Listesini Eşitle
                                </Button>
                            </VStack>
                        </CardBody>
                    </Card>

                    {/* Card 4: Custom Playlist Designer */}
                    <Card bg="white" border="1px solid #E4E7EB" shadow="sm" transition="all 0.3s" _hover={{ shadow: "md" }}>
                        <CardBody>
                            <VStack align="start" spacing={4}>
                                <Flex p={3} bg="rgba(253, 187, 48, 0.1)" color="#FDBB30" borderRadius="lg">
                                    <Icon as={FaFilter} w={5} h={5} />
                                </Flex>
                                <Box>
                                    <Heading size="xs" color="#111111" mb={1}>Özel Liste Tasarla</Heading>
                                    <Text fontSize="xs" color="#718096">Yıl, sanatçı ve limit filtreleriyle çalma listesi oluşturun.</Text>
                                </Box>
                                <Button
                                    size="sm"
                                    w="full"
                                    bg="#FDBB30"
                                    color="#111"
                                    _hover={{ bg: "#E5A520" }}
                                    fontWeight="bold"
                                    leftIcon={<FaFilter />}
                                    onClick={onCustomOpen}
                                >
                                    Filtreli Liste Oluştur
                                </Button>
                            </VStack>
                        </CardBody>
                    </Card>
                </SimpleGrid>

                <Divider borderColor="#E4E7EB" mb={8} />

                {/* Dönem Seçimi ve Başlık */}
                <Flex direction={{ base: "column", lg: "row" }} justify="space-between" align={{ base: "start", lg: "center" }} gap={4} mb={6}>
                    <VStack align="start" spacing={1}>
                        <Heading as="h2" size="md" fontWeight="bold" color="#111111">
                            {periodType === "all"
                                ? "Tüm Zamanlar Dinleme Analiziniz"
                                : periodType === "year" && selectedYear
                                    ? `${selectedYear} Yılı Dinleme Analiziniz`
                                    : "Özel Tarih Aralığı Analiziniz"}
                        </Heading>
                        <Text fontSize="xs" color="#718096">
                            {periodType === "all"
                                ? "Tüm zamanlara ait özet verileriniz ve en çok dinlediğiniz şarkılar."
                                : periodType === "year" && selectedYear
                                    ? `${selectedYear} yılına ait özet verileriniz ve en çok dinlediğiniz şarkılar.`
                                    : `${customStartDate || '...'} ile ${customEndDate || '...'} tarihleri arasındaki özet verileriniz.`}
                        </Text>
                    </VStack>
                    <HStack spacing={3} w={{ base: "full", lg: "auto" }} flexWrap="wrap" gap={2}>
                        <Flex align="center" gap={2}>
                            <Icon as={FaCalendarAlt} color="#FDBB30" />
                            <Text fontSize="sm" fontWeight="bold" whiteSpace="nowrap" color="#1A1D20">Dönem:</Text>
                        </Flex>

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
                            borderRadius="lg"
                            bg="white"
                            borderColor="#C5CBD3"
                            color="#1A1D20"
                            _hover={{ borderColor: "#FDBB30" }}
                            _focus={{ borderColor: "#FDBB30", boxShadow: "0 0 0 1px #FDBB30" }}
                            w="140px"
                        >
                            <option value="all" style={{ backgroundColor: 'white', color: '#1A1D20' }}>Tüm Zamanlar</option>
                            <option value="year" style={{ backgroundColor: 'white', color: '#1A1D20' }}>Yıllar</option>
                            <option value="custom" style={{ backgroundColor: 'white', color: '#1A1D20' }}>Özel Takvim...</option>
                        </Select>

                        {periodType === "year" && (
                            <Select
                                value={selectedYear || ""}
                                onChange={(e) => setSelectedYear(e.target.value ? parseInt(e.target.value) : undefined)}
                                size="sm"
                                borderRadius="lg"
                                bg="white"
                                borderColor="#C5CBD3"
                                color="#1A1D20"
                                _hover={{ borderColor: "#FDBB30" }}
                                _focus={{ borderColor: "#FDBB30", boxShadow: "0 0 0 1px #FDBB30" }}
                                w="100px"
                            >
                                {availableYears.map((year) => (
                                    <option key={year} value={year} style={{ backgroundColor: 'white', color: '#1A1D20' }}>
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
                                    borderRadius="lg"
                                    bg="white"
                                    borderColor="#C5CBD3"
                                    color="#1A1D20"
                                    _focus={{ borderColor: "#FDBB30", boxShadow: "0 0 0 1px #FDBB30" }}
                                    w="130px"
                                />
                                <Text fontSize="xs" color="#718096">ile</Text>
                                <Input
                                    type="date"
                                    size="sm"
                                    value={customEndDate}
                                    onChange={(e) => setCustomEndDate(e.target.value)}
                                    borderRadius="lg"
                                    bg="white"
                                    borderColor="#C5CBD3"
                                    color="#1A1D20"
                                    _focus={{ borderColor: "#FDBB30", boxShadow: "0 0 0 1px #FDBB30" }}
                                    w="130px"
                                />
                            </HStack>
                        )}

                        <Button
                            size="sm"
                            variant="outline"
                            borderColor="#E4E7EB"
                            color="#1A1D20"
                            _hover={{ bg: "#F8FAFC" }}
                            onClick={loadTracks}
                            isDisabled={loadingTracks}
                        >
                            Yenile
                        </Button>
                    </HStack>
                </Flex>

                {/* Analiz Kartları (Wrapped) */}
                {wrappedData && !loadingTracks && (
                    <SimpleGrid columns={{ base: 1, sm: 2, md: 5 }} spacing={4} mb={8}>
                        {/* Kart 1: Toplam Dinleme Süresi */}
                        <Card bg="white" border="1px solid #E4E7EB" shadow="sm">
                            <CardBody py={4}>
                                <Flex align="center">
                                    <Flex p={3} bg="rgba(16, 185, 129, 0.1)" color="#10b981" borderRadius="lg" mr={4}>
                                        <Icon as={FaClock} w={5} h={5} />
                                    </Flex>
                                    <Box>
                                        <Text fontSize="xs" color="#718096" fontWeight="medium">Toplam Dinleme</Text>
                                        <Heading size="sm" color="#111111" fontWeight="black" mt={0.5}>
                                            {wrappedData.totalMinutesPlayed.toLocaleString('tr-TR')} dk
                                        </Heading>
                                    </Box>
                                </Flex>
                            </CardBody>
                        </Card>

                        {/* Kart 2: Benzersiz Şarkı Sayısı */}
                        <Card bg="white" border="1px solid #E4E7EB" shadow="sm">
                            <CardBody py={4}>
                                <Flex align="center">
                                    <Flex p={3} bg="rgba(59, 130, 246, 0.1)" color="#3b82f6" borderRadius="lg" mr={4}>
                                        <Icon as={FaMusic} w={5} h={5} />
                                    </Flex>
                                    <Box>
                                        <Text fontSize="xs" color="#718096" fontWeight="medium">Benzersiz Şarkı</Text>
                                        <Heading size="sm" color="#111111" fontWeight="black" mt={0.5}>
                                            {wrappedData.uniqueTracksCount.toLocaleString('tr-TR')}
                                        </Heading>
                                    </Box>
                                </Flex>
                            </CardBody>
                        </Card>

                        {/* Kart 3: Benzersiz Sanatçı Sayısı */}
                        <Card bg="white" border="1px solid #E4E7EB" shadow="sm">
                            <CardBody py={4}>
                                <Flex align="center">
                                    <Flex p={3} bg="rgba(139, 92, 246, 0.1)" color="#8b5cf6" borderRadius="lg" mr={4}>
                                        <Icon as={FaUser} w={5} h={5} />
                                    </Flex>
                                    <Box>
                                        <Text fontSize="xs" color="#718096" fontWeight="medium">Benzersiz Sanatçı</Text>
                                        <Heading size="sm" color="#111111" fontWeight="black" mt={0.5}>
                                            {wrappedData.uniqueArtistsCount.toLocaleString('tr-TR')}
                                        </Heading>
                                    </Box>
                                </Flex>
                            </CardBody>
                        </Card>

                        {/* Kart 4: En Çok Dinlenen Sanatçı */}
                        <Card bg="white" border="1px solid #E4E7EB" shadow="sm">
                            <CardBody py={4}>
                                <Flex align="center" overflow="hidden">
                                    <Flex p={3} bg="rgba(253, 187, 48, 0.1)" color="#FDBB30" borderRadius="lg" mr={4} flexShrink={0}>
                                        <Icon as={FaUser} w={5} h={5} />
                                    </Flex>
                                    <Box overflow="hidden">
                                        <Text fontSize="xs" color="#718096" fontWeight="medium" isTruncated>
                                            Favori Sanatçı ({wrappedData.topArtistPlayCount} kez)
                                        </Text>
                                        <Heading size="sm" color="#111111" fontWeight="black" mt={0.5} isTruncated>
                                            {wrappedData.topArtistName}
                                        </Heading>
                                    </Box>
                                </Flex>
                            </CardBody>
                        </Card>

                        {/* Kart 5: En Çok Dinlenen Şarkı */}
                        <Card bg="white" border="1px solid #E4E7EB" shadow="sm">
                            <CardBody py={4}>
                                <Flex align="center" overflow="hidden">
                                    <Flex p={3} bg="rgba(251, 191, 36, 0.1)" color="#F59E0B" borderRadius="lg" mr={4} flexShrink={0}>
                                        <Icon as={FaTrophy} w={5} h={5} />
                                    </Flex>
                                    <Box overflow="hidden">
                                        <Text fontSize="xs" color="#718096" fontWeight="medium" isTruncated>
                                            Favori Şarkı {wrappedData.topTrackTitle && `(${wrappedData.topTrackMinutesPlayed} dk)`}
                                        </Text>
                                        <Heading size="sm" color="#111111" fontWeight="black" mt={0.5} isTruncated title={`${wrappedData.topTrackTitle} - ${wrappedData.topTrackArtistName}`}>
                                            {wrappedData.topTrackTitle || 'Bilinmiyor'}
                                        </Heading>
                                    </Box>
                                </Flex>
                            </CardBody>
                        </Card>
                    </SimpleGrid>
                )}

                {loadingTracks ? (
                    <Flex justify="center" align="center" py={20}>
                        <VStack spacing={3}>
                            <Spinner color="#FDBB30" />
                            <Text color="#718096" fontSize="sm">Liste yükleniyor...</Text>
                        </VStack>
                    </Flex>
                ) : tracks.length > 0 ? (
                    <SimpleGrid columns={{ base: 1, lg: 3 }} spacing={6} alignItems="start">
                        {/* Sol Taraf: Şarkı Listesi */}
                        <Box gridColumn={{ lg: "span 2" }} opacity={loadingTracksPage ? 0.6 : 1} transition="opacity 0.2s">
                            <Flex align="center" justify="space-between" mb={3}>
                                <Heading as="h3" size="xs" fontWeight="bold" color="#111111" textTransform="uppercase" letterSpacing="wider">
                                    En Çok Dinlenen Şarkılar
                                </Heading>
                                <HStack spacing={1} bg="gray.100" p={0.5} borderRadius="lg">
                                    <Button
                                        size="xs"
                                        variant={trackSortBy === "playcount" ? "solid" : "ghost"}
                                        bg={trackSortBy === "playcount" ? "white" : "transparent"}
                                        color={trackSortBy === "playcount" ? "#1A1D20" : "gray.500"}
                                        shadow={trackSortBy === "playcount" ? "sm" : "none"}
                                        onClick={() => { setTrackPage(1); setTrackSortBy("playcount"); }}
                                        _hover={{ bg: trackSortBy === "playcount" ? "white" : "gray.200" }}
                                        borderRadius="md"
                                        px={3}
                                    >
                                        Dinlenme Adedi
                                    </Button>
                                    <Button
                                        size="xs"
                                        variant={trackSortBy === "duration" ? "solid" : "ghost"}
                                        bg={trackSortBy === "duration" ? "white" : "transparent"}
                                        color={trackSortBy === "duration" ? "#1A1D20" : "gray.500"}
                                        shadow={trackSortBy === "duration" ? "sm" : "none"}
                                        onClick={() => { setTrackPage(1); setTrackSortBy("duration"); }}
                                        _hover={{ bg: trackSortBy === "duration" ? "white" : "gray.200" }}
                                        borderRadius="md"
                                        px={3}
                                    >
                                        Dinleme Süresi
                                    </Button>
                                </HStack>
                            </Flex>

                            <DashboardGrid
                                tracks={tracks}
                                spotifyUserId={session.spotifyUserId}
                                startRank={(trackPage - 1) * 50 + 1}
                                onOpenAnalysis={handleOpenTrackAnalysis}
                                isLoading={loadingTracksPage}
                            />

                            {tracksPageData && tracksPageData.totalPages > 1 && (
                                <Flex align="center" justify="space-between" mt={4} px={1}>
                                    <Text fontSize="xs" color="gray.500">
                                        {((trackPage - 1) * 50 + 1)}-{Math.min(trackPage * 50, tracksPageData.totalCount)} / {tracksPageData.totalCount.toLocaleString('tr-TR')} şarkı
                                    </Text>
                                    <HStack spacing={2}>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            borderColor="#E4E7EB"
                                            bg="white"
                                            color="#1A1D20"
                                            _hover={{ bg: "#F8FAFC" }}
                                            isDisabled={trackPage === 1}
                                            onClick={() => setTrackPage(prev => Math.max(prev - 1, 1))}
                                        >
                                            Önceki
                                        </Button>
                                        <Text fontSize="sm" fontWeight="medium" color="#1A1D20">
                                            Sayfa {trackPage} / {tracksPageData.totalPages}
                                        </Text>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            borderColor="#E4E7EB"
                                            bg="white"
                                            color="#1A1D20"
                                            _hover={{ bg: "#F8FAFC" }}
                                            isDisabled={trackPage >= tracksPageData.totalPages}
                                            onClick={() => setTrackPage(prev => Math.min(prev + 1, tracksPageData.totalPages))}
                                        >
                                            Sonraki
                                        </Button>
                                    </HStack>
                                </Flex>
                            )}
                        </Box>

                        {/* Sağ Taraf: En Çok Dinlenen Sanatçılar */}
                        <Box opacity={loadingArtistsPage ? 0.6 : 1} transition="opacity 0.2s">
                            {artistsPageData?.items && artistsPageData.items.length > 0 && (
                                <>
                                    <Flex align="center" justify="space-between" mb={3}>
                                        <Heading as="h3" size="xs" fontWeight="bold" color="#111111" textTransform="uppercase" letterSpacing="wider">
                                            Sanatçılar
                                        </Heading>
                                        <HStack spacing={1} bg="gray.100" p={0.5} borderRadius="lg">
                                            <Button
                                                size="xs"
                                                variant={artistSortBy === "playcount" ? "solid" : "ghost"}
                                                bg={artistSortBy === "playcount" ? "white" : "transparent"}
                                                color={artistSortBy === "playcount" ? "#1A1D20" : "gray.500"}
                                                shadow={artistSortBy === "playcount" ? "sm" : "none"}
                                                onClick={() => { setArtistPage(1); setArtistSortBy("playcount"); }}
                                                _hover={{ bg: artistSortBy === "playcount" ? "white" : "gray.200" }}
                                                borderRadius="md"
                                                px={3}
                                            >
                                                Adet
                                            </Button>
                                            <Button
                                                size="xs"
                                                variant={artistSortBy === "duration" ? "solid" : "ghost"}
                                                bg={artistSortBy === "duration" ? "white" : "transparent"}
                                                color={artistSortBy === "duration" ? "#1A1D20" : "gray.500"}
                                                shadow={artistSortBy === "duration" ? "sm" : "none"}
                                                onClick={() => { setArtistPage(1); setArtistSortBy("duration"); }}
                                                _hover={{ bg: artistSortBy === "duration" ? "white" : "gray.200" }}
                                                borderRadius="md"
                                                px={3}
                                            >
                                                Süre
                                            </Button>
                                        </HStack>
                                    </Flex>
                                    <Card bg="white" border="1px solid #E4E7EB" shadow="sm" borderRadius="xl">
                                        <CardBody p={4}>
                                            <VStack align="stretch" spacing={2.5}>
                                                {loadingArtistsPage ? (
                                                    [...Array(10)].map((_, i) => (
                                                        <Flex key={i} align="center" justify="space-between" p={2}>
                                                            <HStack spacing={3}>
                                                                <Skeleton w="22px" h="22px" borderRadius="md" />
                                                                <SkeletonCircle size="28px" />
                                                                <Skeleton h="14px" w="100px" borderRadius="md" />
                                                            </HStack>
                                                            <VStack align="end" spacing={1} flexShrink={0}>
                                                                <Skeleton h="12px" w="40px" borderRadius="md" />
                                                                <Skeleton h="10px" w="30px" borderRadius="md" />
                                                            </VStack>
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
                                                                borderRadius="lg"
                                                                _hover={{ bg: "#F8FAFC" }}
                                                                transition="background 0.2s"
                                                            >
                                                                <HStack spacing={3}>
                                                                    <Badge
                                                                        variant="solid"
                                                                        bg={currentRank === 1 ? "#FDBB30" : currentRank === 2 ? "#E2E8F0" : currentRank === 3 ? "#FEF3C7" : "gray.100"}
                                                                        color={currentRank === 1 ? "#111" : currentRank === 3 ? "#B45309" : "#1A1D20"}
                                                                        fontSize="10px"
                                                                        borderRadius="md"
                                                                        w="22px"
                                                                        h="22px"
                                                                        display="flex"
                                                                        alignItems="center"
                                                                        justifyContent="center"
                                                                    >
                                                                        #{currentRank}
                                                                    </Badge>
                                                                    {/* --- SANATÇI FOTOĞRAFI BAŞLANGIÇ --- */}
                                                                    <LazyArtistAvatar
                                                                        spotifyUserId={session.spotifyUserId}
                                                                        artistName={artist.artistName}
                                                                        initialImageUrl={artist.imageUrl}
                                                                        w="28px"
                                                                        h="28px"
                                                                        border="1px solid rgba(0,0,0,0.08)"
                                                                    />
                                                                    {/* --- SANATÇI FOTOĞRAFI BİTİŞ --- */}
                                                                    <HStack spacing={1.5} align="center">
                                                                        <a
                                                                            href={`spotify:search:${encodeURIComponent(artist.artistName)}`}
                                                                            style={{ textDecoration: 'none' }}
                                                                        >
                                                                            <Text
                                                                                fontSize="xs"
                                                                                fontWeight="semibold"
                                                                                color="#1A1D20"
                                                                                isTruncated
                                                                                maxW="110px"
                                                                                _hover={{ color: '#10b981', textDecoration: 'underline' }}
                                                                                transition="color 0.2s"
                                                                                cursor="pointer"
                                                                            >
                                                                                {artist.artistName}
                                                                            </Text>
                                                                        </a>
                                                                        <IconButton
                                                                            aria-label="Sanatçı Dinleme Analizi"
                                                                            icon={<FaHistory />}
                                                                            size="xs"
                                                                            variant="ghost"
                                                                            color="gray.400"
                                                                            _hover={{ color: "#10b981", bg: "rgba(16, 185, 129, 0.1)" }}
                                                                            onClick={() => handleOpenArtistAnalysis(artist.artistName)}
                                                                            h="18px"
                                                                            w="18px"
                                                                            minW="18px"
                                                                        />
                                                                    </HStack>
                                                                </HStack>
                                                                <VStack align="end" spacing={0} flexShrink={0}>
                                                                    <Text fontSize="xs" fontWeight="bold" color="#111111">
                                                                        {artist.playCount} kez
                                                                    </Text>
                                                                    <Text fontSize="9px" color="gray.400">
                                                                        {artist.totalMinutesPlayed.toLocaleString('tr-TR')} dk
                                                                    </Text>
                                                                </VStack>
                                                            </Flex>
                                                        );
                                                    })
                                                )}
                                            </VStack>

                                            {artistsPageData.totalPages > 1 && (
                                                <Flex align="center" justify="space-between" mt={4} pt={3} borderTop="1px solid #E4E7EB">
                                                    <Button
                                                        size="xs"
                                                        variant="outline"
                                                        borderColor="#E4E7EB"
                                                        bg="white"
                                                        color="#1A1D20"
                                                        _hover={{ bg: "#F8FAFC" }}
                                                        isDisabled={artistPage === 1}
                                                        onClick={() => setArtistPage(prev => Math.max(prev - 1, 1))}
                                                    >
                                                        Geri
                                                    </Button>
                                                    <Text fontSize="10px" fontWeight="medium" color="#718096">
                                                        {artistPage} / {artistsPageData.totalPages} ({artistsPageData.totalCount} sanatçı)
                                                    </Text>
                                                    <Button
                                                        size="xs"
                                                        variant="outline"
                                                        borderColor="#E4E7EB"
                                                        bg="white"
                                                        color="#1A1D20"
                                                        _hover={{ bg: "#F8FAFC" }}
                                                        isDisabled={artistPage >= artistsPageData.totalPages}
                                                        onClick={() => setArtistPage(prev => Math.min(prev + 1, artistsPageData.totalPages))}
                                                    >
                                                        İleri
                                                    </Button>
                                                </Flex>
                                            )}
                                        </CardBody>
                                    </Card>

                                    {/* --- EN ÇOK DİNLENEN TÜRLER BAŞLANGIÇ --- */}
                                    {wrappedData?.topGenres && wrappedData.topGenres.length > 0 && (
                                        <Card bg="white" border="1px solid #E4E7EB" shadow="sm" borderRadius="xl" mt={6}>
                                            <CardBody>
                                                <Heading as="h4" size="xs" fontWeight="bold" color="#111111" textTransform="uppercase" letterSpacing="wider" mb={4}>
                                                    En Çok Dinlenen Türler
                                                </Heading>
                                                <VStack spacing={4} align="stretch">
                                                    {wrappedData.topGenres.slice(0, 7).map((genreCount, index) => {
                                                        const maxPlayCount = wrappedData.topGenres[0].playCount || 1;
                                                        const percentage = (genreCount.playCount / maxPlayCount) * 100;
                                                        
                                                        return (
                                                            <Box key={genreCount.genre} w="full">
                                                                <Flex justify="space-between" align="center" mb={1}>
                                                                    <Text fontSize="xs" fontWeight="bold" color="#1A1D20">
                                                                        {index + 1}. {genreCount.genre}
                                                                    </Text>
                                                                    <Text fontSize="10px" fontWeight="semibold" color="gray.500">
                                                                        {genreCount.playCount.toLocaleString('tr-TR')} kez
                                                                    </Text>
                                                                </Flex>
                                                                <Progress 
                                                                    value={percentage} 
                                                                    size="xs" 
                                                                    borderRadius="full" 
                                                                    colorScheme="teal" 
                                                                    bg="gray.100"
                                                                />
                                                            </Box>
                                                        );
                                                    })}
                                                </VStack>
                                            </CardBody>
                                        </Card>
                                    )}
                                    {/* --- EN ÇOK DİNLENEN TÜRLER BİTİŞ --- */}
                                </>
                            )}
                        </Box>
                    </SimpleGrid>
                ) : (
                    <Flex justify="center" align="center" py={20} border="1px dashed #C5CBD3" borderRadius="xl" bg="white">
                        <VStack spacing={2}>
                            <Icon as={FaMusic} w={8} h={8} color="#718096" />
                            <Text color="#1A1D20" fontWeight="medium">Henüz veri yok.</Text>
                            <Text color="#718096" fontSize="xs">Test etmek için yukarıdan bir geçmiş dosyası yükleyebilirsiniz.</Text>
                        </VStack>
                    </Flex>
                )}

            </Container>

            {/* Custom Playlist Creator Modal */}
            <Modal isOpen={isCustomOpen} onClose={onCustomClose} isCentered size="md" motionPreset="none">
                <ModalOverlay bg="rgba(0, 0, 0, 0.4)" transition="none" />
                <ModalContent bg="white" border="1px solid #E4E7EB" color="#1A1D20" borderRadius="xl">
                    <ModalHeader borderBottom="1px solid #E4E7EB" fontSize="lg" fontWeight="bold" color="#111111">
                        Özel Çalma Listesi Tasarla
                    </ModalHeader>
                    <ModalCloseButton color="gray.600" />
                    <ModalBody py={6}>
                        <VStack spacing={4}>
                            <FormControl isRequired>
                                <FormLabel fontSize="sm" color="#1A1D20">Çalma Listesi Adı</FormLabel>
                                <Input
                                    value={customPlaylistName}
                                    onChange={(e) => {
                                        setCustomPlaylistName(e.target.value);
                                        setIsNameManuallyEdited(true);
                                    }}
                                    placeholder="Örn: Benim Harika Çalma Listem"
                                    bg="white"
                                    borderColor="#C5CBD3"
                                    color="#1A1D20"
                                    _hover={{ borderColor: "#FDBB30" }}
                                    _focus={{ borderColor: "#FDBB30", boxShadow: "0 0 0 1px #FDBB30" }}
                                />
                            </FormControl>

                            <SimpleGrid columns={2} spacing={4} w="full">
                                <FormControl>
                                    <FormLabel fontSize="sm" color="#1A1D20">Başlangıç Yılı</FormLabel>
                                    <Input
                                        type="number"
                                        value={startYear}
                                        onChange={(e) => setStartYear(e.target.value)}
                                        placeholder="Örn: 2021"
                                        bg="white"
                                        borderColor="#C5CBD3"
                                        color="#1A1D20"
                                        _hover={{ borderColor: "#FDBB30" }}
                                    />
                                </FormControl>
                                <FormControl>
                                    <FormLabel fontSize="sm" color="#1A1D20">Bitiş Yılı</FormLabel>
                                    <Input
                                        type="number"
                                        value={endYear}
                                        onChange={(e) => setEndYear(e.target.value)}
                                        placeholder="Örn: 2025"
                                        bg="white"
                                        borderColor="#C5CBD3"
                                        color="#1A1D20"
                                        _hover={{ borderColor: "#FDBB30" }}
                                    />
                                </FormControl>
                            </SimpleGrid>

                            {availableYears.length > 0 && (
                                <Text w="full" textAlign="left" fontSize="xs" color="#718096" bg="#F8FAFC" p={2} borderRadius="md" border="1px solid #E4E7EB">
                                    Veritabanındaki dinleme geçmişi yılları: <strong>{availableYears.join(", ")}</strong>
                                </Text>
                            )}



                            <FormControl>
                                <FormLabel fontSize="sm" color="#1A1D20">Dahil Edilecek Sanatçılar</FormLabel>
                                <Input
                                    value={includedArtists}
                                    onChange={(e) => setIncludedArtists(e.target.value)}
                                    placeholder="Eminem, Paramore, Muse (Virgülle ayırın)"
                                    bg="white"
                                    borderColor="#C5CBD3"
                                    color="#1A1D20"
                                    _hover={{ borderColor: "#FDBB30" }}
                                />
                                <FormHelperText color="#718096" fontSize="xs">Sadece bu şarkıcıları kapsar. Boş bırakırsanız tüm şarkıcılar dahil edilir.</FormHelperText>
                            </FormControl>

                            <FormControl>
                                <FormLabel fontSize="sm" color="#1A1D20">Hariç Tutulacak Sanatçılar</FormLabel>
                                <Input
                                    value={excludedArtists}
                                    onChange={(e) => setExcludedArtists(e.target.value)}
                                    placeholder="Coldplay, Taylor Swift (Virgülle ayırın)"
                                    bg="white"
                                    borderColor="#C5CBD3"
                                    color="#1A1D20"
                                    _hover={{ borderColor: "#FDBB30" }}
                                />
                                <FormHelperText color="#718096" fontSize="xs">Bu sanatçıların şarkıları listenin dışında bırakılır.</FormHelperText>
                            </FormControl>

                            <FormControl>
                                <FormLabel fontSize="sm" color="#1A1D20">Maksimum Şarkı Sayısı</FormLabel>
                                <Input
                                    type="number"
                                    min={5}
                                    max={1000}
                                    value={trackCount}
                                    onChange={(e) => setTrackCount(parseInt(e.target.value) || 5)}
                                    bg="white"
                                    borderColor="#C5CBD3"
                                    color="#1A1D20"
                                    _hover={{ borderColor: "#FDBB30" }}
                                    _focus={{ borderColor: "#FDBB30", boxShadow: "0 0 0 1px #FDBB30" }}
                                />
                            </FormControl>

                            <FormControl pt={2}>
                                <Checkbox
                                    isChecked={fillMissing}
                                    onChange={(e) => setFillMissing(e.target.checked)}
                                    colorScheme="yellow"
                                    color="#1A1D20"
                                    size="md"
                                >
                                    {useRandom ? "Eksiği Rastgele Şarkılarla Doldur" : "Eksiği Popüler Şarkılarla Doldur"}
                                </Checkbox>
                                <FormHelperText color="#718096" fontSize="xs">
                                    {useRandom
                                        ? "Dahil ettiğiniz sanatçılara ait şarkı sayısı limitin (örn. 50) altında kalırsa, çalma listesinin kalan kısmı o yıl aralığındaki diğer rastgele şarkılarınızla tamamlanır."
                                        : "Dahil ettiğiniz sanatçılara ait şarkı sayısı limitin (örn. 50) altında kalırsa, çalma listesinin kalan kısmı en popüler diğer şarkılarınızla tamamlanır. Seçilmezse sadece uyan şarkılar listelenir."
                                    }
                                </FormHelperText>
                            </FormControl>

                            <FormControl pt={2}>
                                <Checkbox
                                    isChecked={useRandom}
                                    onChange={(e) => setUseRandom(e.target.checked)}
                                    colorScheme="yellow"
                                    color="#1A1D20"
                                    size="md"
                                >
                                    Rastgele Şarkı Seç (Sıralamayı Önemseme)
                                </Checkbox>
                                <FormHelperText color="#718096" fontSize="xs">
                                    Filtrelere uyan şarkılar arasından en çok dinlenenler yerine rastgele seçim yapılır.
                                </FormHelperText>
                            </FormControl>
                        </VStack>
                    </ModalBody>
                    <ModalFooter borderTop="1px solid #E4E7EB">
                        <Button variant="ghost" mr={3} onClick={onCustomClose} colorScheme="gray" color="#718096">
                            İptal
                        </Button>
                        <Button
                            bg="#FDBB30"
                            color="#111"
                            _hover={{ bg: "#E5A520" }}
                            _active={{ bg: "#b45309" }}
                            isLoading={creatingCustom}
                            loadingText="Oluşturuluyor..."
                            onClick={handleCreateCustomPlaylist}
                        >
                            Çalma Listesini Oluştur ve Eşitle
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>

            {/* Dinleme Sıklığı Analiz Modalı */}
            <Modal isOpen={analysisModalOpen} onClose={() => setAnalysisModalOpen(false)} size="4xl" isCentered>
                <ModalOverlay bg="rgba(0, 0, 0, 0.4)" backdropFilter="blur(8px)" />
                <ModalContent bg="white" border="1px solid #E4E7EB" color="#1A1D20" borderRadius="2xl" mx={4} shadow="2xl">
                    <ModalHeader borderBottom="1px solid #E4E7EB" py={5} px={6}>
                        <Flex align="center" justify="space-between">
                            <VStack align="start" spacing={1}>
                                <HStack spacing={2}>
                                    <Box w="3px" h="18px" bg="#FDBB30" borderRadius="full" />
                                    <Text fontSize="xs" fontWeight="bold" textTransform="uppercase" letterSpacing="widest" color="#E5A520">
                                        Dinleme Sıklığı Analizi
                                    </Text>
                                </HStack>
                                <Text fontSize="lg" fontWeight="bold" color="#111111" isTruncated maxW="600px">
                                    {analysisTarget?.name}
                                </Text>
                            </VStack>
                        </Flex>
                    </ModalHeader>
                    <ModalCloseButton color="gray.400" _hover={{ color: "#111", bg: "#F8FAFC" }} borderRadius="lg" />
                    <ModalBody py={6} px={6} bg="#F4F5F7">
                        {loadingAnalysis ? (
                            <Flex justify="center" align="center" h="400px">
                                <VStack spacing={4}>
                                    <Spinner size="xl" color="#FDBB30" thickness="3px" speed="0.8s" />
                                    <Text color="#718096" fontSize="sm">Analiz verileri yükleniyor...</Text>
                                </VStack>
                            </Flex>
                        ) : (
                            <HistoryChart data={analysisData} title={analysisTarget?.name || ""} />
                        )}
                    </ModalBody>
                    <ModalFooter borderTop="1px solid #E4E7EB" py={3} px={6}>
                        <Button
                            variant="ghost"
                            color="#718096"
                            _hover={{ color: "#111", bg: "#F8FAFC" }}
                            onClick={() => setAnalysisModalOpen(false)}
                            borderRadius="lg"
                            size="sm"
                        >
                            Kapat
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>

            {currentlyPlaying && (
                <Flex
                    position="fixed"
                    bottom="6"
                    right="6"
                    bg="rgba(17, 24, 39, 0.85)"
                    border="1px solid rgba(255, 255, 255, 0.08)"
                    backdropFilter="blur(15px)"
                    borderRadius="xl"
                    p={3}
                    boxShadow="2xl"
                    align="center"
                    maxW="320px"
                    zIndex={999}
                    transition="all 0.3s ease"
                    _hover={{ transform: "translateY(-3px)", borderColor: currentlyPlaying.isPlaying ? "#10b981" : "gray.600" }}
                >
                    {currentlyPlaying.imageUrl ? (
                        <Box
                            borderRadius="md"
                            overflow="hidden"
                            w="50px"
                            h="50px"
                            mr={3}
                            boxShadow="lg"
                            flexShrink={0}
                        >
                            <img
                                src={currentlyPlaying.imageUrl}
                                alt={currentlyPlaying.title}
                                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                            />
                        </Box>
                    ) : (
                        <Flex
                            borderRadius="md"
                            w="50px"
                            h="50px"
                            bg="rgba(255, 255, 255, 0.05)"
                            align="center"
                            justify="center"
                            mr={3}
                            flexShrink={0}
                        >
                            <Icon as={FaMusic} color="gray.400" />
                        </Flex>
                    )}

                    <VStack align="start" spacing={0.5} pr={2} overflow="hidden" maxW="200px">
                        <HStack spacing={1.5} align="center">
                            <Box
                                w="8px"
                                h="8px"
                                borderRadius="full"
                                bg={currentlyPlaying.isPlaying ? "#10b981" : "gray.500"}
                                boxShadow={currentlyPlaying.isPlaying ? "0 0 8px #10b981" : "none"}
                            />
                            <Text fontSize="9px" fontWeight="bold" textTransform="uppercase" letterSpacing="wider" color={currentlyPlaying.isPlaying ? "#10b981" : "gray.400"}>
                                {currentlyPlaying.isPlaying ? "Şimdi Çalıyor" : "Son Dinlenen"}
                            </Text>
                        </HStack>
                        <Text fontSize="12px" fontWeight="bold" color="white" isTruncated w="full">
                            {currentlyPlaying.title}
                        </Text>
                        <Text fontSize="11px" color="gray.400" isTruncated w="full">
                            {currentlyPlaying.artist}
                        </Text>
                    </VStack>
                </Flex>
            )}
        </Box>
    );
}
