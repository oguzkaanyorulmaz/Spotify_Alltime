import { useState, useEffect } from 'react';
import { ApiService, CurrentlyPlayingDto } from '../Services/ApiService';
import { UserSession } from '../App';
import { Box, Flex, Text, IconButton, HStack, Icon, Spinner } from '@chakra-ui/react';
import { FaMusic, FaStepBackward, FaStepForward, FaPlay, FaPause, FaExternalLinkAlt, FaTimes } from 'react-icons/fa';

interface MiniPlayerProps {
    session: UserSession;
}

export default function MiniPlayer({ session }: MiniPlayerProps) {
    const [currentlyPlaying, setCurrentlyPlaying] = useState<CurrentlyPlayingDto | null>(null);
    const [loading, setLoading] = useState(true);

    // Geçtiğimiz şarkıyı hafızada tutacak yeni state
    const [localPrevious, setLocalPrevious] = useState<{
        spotifyTrackId?: string;
        title: string;
        artist: string;
        imageUrl?: string;
    } | null>(null);

    const fetchCurrentlyPlaying = async () => {
        try {
            const data = await ApiService.getCurrentlyPlaying(session.spotifyUserId);

            // Eğer API'den gelen şarkı şu anki şarkıdan farklıysa, eskiyi Önceki olarak kaydet
            if (currentlyPlaying && data && currentlyPlaying.title !== data.title) {
                setLocalPrevious({
                    title: currentlyPlaying.title,
                    artist: currentlyPlaying.artist,
                    imageUrl: currentlyPlaying.imageUrl
                });
            }

            setCurrentlyPlaying(data);
        } catch (err) {
            console.error("Mini oynatıcı veri hatası:", err);
            setCurrentlyPlaying(null);
        } finally {
            setLoading(false);
        }
    };


    const handleNextTrack = async () => {
        try {
            const nextSong = (currentlyPlaying && currentlyPlaying.queue && currentlyPlaying.queue.length > 0)
                ? currentlyPlaying.queue[0]
                : null;

            if (currentlyPlaying) {
                // Mevcut çalan şarkıyı anında ÖNCEKİ durumuna al
                setLocalPrevious({
                    title: currentlyPlaying.title,
                    artist: currentlyPlaying.artist,
                    imageUrl: currentlyPlaying.imageUrl
                });

                // Eğer sırada bir şarkı varsa, onu anında ŞUAN DİNLENİYOR durumuna al
                if (nextSong) {
                    setCurrentlyPlaying({
                        ...currentlyPlaying,
                        isPlaying: true,
                        title: nextSong.title,
                        artist: nextSong.artist,
                        imageUrl: nextSong.imageUrl,
                        queue: currentlyPlaying.queue ? currentlyPlaying.queue.slice(1) : []
                    });
                }
            }

            await ApiService.playerNext(session.spotifyUserId);
            // Spotify sunucularının güncellenmesi için bekleme süresini 1.5 saniyeye (1500ms) çıkarıyoruz
            setTimeout(fetchCurrentlyPlaying, 1500);
        } catch (err) {
            console.error("Şarkı geçilemedi:", err);
        }
    };



    const handlePreviousTrack = async () => {
        try {
            const prevSong = localPrevious || (currentlyPlaying && currentlyPlaying.previous);

            if (currentlyPlaying && prevSong) {
                // Arayüzü anında geri yükle (Optimistic Update)
                setCurrentlyPlaying({
                    ...currentlyPlaying,
                    isPlaying: true,
                    title: prevSong.title,
                    artist: prevSong.artist,
                    imageUrl: prevSong.imageUrl,
                    // Mevcut şarkıyı sıranın (kuyruğun) başına geri ekle
                    queue: [
                        {
                            spotifyTrackId: '',
                            title: currentlyPlaying.title,
                            artist: currentlyPlaying.artist,
                            imageUrl: currentlyPlaying.imageUrl
                        },
                        ...(currentlyPlaying.queue || [])
                    ]
                });

                // Geçici olarak yerel geçmişi temizle, API 1.5 sn sonra doğrusunu getirecektir
                setLocalPrevious(null);
            }

            await ApiService.playerPrevious(session.spotifyUserId);
            // Güncelleme gecikmesi için bekleme süresini 1.5 saniyeye (1500ms) çıkarıyoruz
            setTimeout(fetchCurrentlyPlaying, 1500);
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
        const interval = setInterval(fetchCurrentlyPlaying, 5000); // 5 saniyede bir güncelle
        return () => clearInterval(interval);
    }, [session.spotifyUserId]);

    const handleRestore = () => {
        // @ts-ignore
        if (window.electronAPI) window.electronAPI.restoreMain();
    };

    const handleClose = () => {
        // @ts-ignore
        if (window.electronAPI) window.electronAPI.closeApp();
    };

    return (
        <Box
            w="300px"
            h="150px"
            bg="#0b0f19"
            borderRadius="20px"
            border="1px solid rgba(30, 215, 96, 0.25)"
            p="3.5"
            color="white"
            boxShadow="0 12px 30px rgba(0,0,0,0.6)"
            style={{ WebkitAppRegion: 'drag' } as any}
            userSelect="none"
        >
            {/* Header (Drag area + Window controls) */}
            <Flex justify="space-between" align="center" mb={2}>
                <Flex align="center">
                    <svg height="18px" width="18px" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
                        <linearGradient gradientUnits="userSpaceOnUse" gradientTransform="translate(0 -534)" y2="590.253" y1="530.096" x2="32" x1="32" id="miniSpGreen"><stop stopColor="#42d778" offset="0"></stop><stop stopColor="#3dca76" offset=".428"></stop><stop stopColor="#34b171" offset="1"></stop></linearGradient>
                        <path d="M57,32c0,12.837-9.663,23.404-22.115,24.837C33.942,56.942,32.971,57,32,57	c-1.644,0-3.25-0.163-4.808-0.471C15.683,54.298,7,44.163,7,32C7,18.192,18.192,7,32,7S57,18.192,57,32z" fill="url(#miniSpGreen)"></path>
                        <path d="M41.683,44.394c-0.365,0-0.731-0.181-1.096-0.365c-3.471-2.009-7.674-3.105-12.24-3.105	c-2.559,0-5.116,0.364-7.491,0.912c-0.365,0-0.914,0.183-1.096,0.183c-0.914,0-1.461-0.732-1.461-1.462	c0-0.913,0.547-1.463,1.279-1.643c2.923-0.732,5.846-1.096,8.951-1.096c5.116,0,9.866,1.276,13.885,3.655	c0.548,0.364,0.914,0.73,0.914,1.642C43.145,43.847,42.414,44.394,41.683,44.394z" fill="#fff"></path>
                    </svg>
                    <Text ml={1.5} fontWeight="bold" fontSize="10px" color="#1DB954" letterSpacing="widest">
                        {currentlyPlaying ? "ŞUAN DİNLENİYOR" : "SPOTIFY"}
                    </Text>
                </Flex>
                <HStack spacing={1} style={{ WebkitAppRegion: 'no-drag' } as any}>
                    <IconButton
                        aria-label="Geri Yükle"
                        icon={<FaExternalLinkAlt />}
                        size="xs"
                        variant="ghost"
                        color="gray.500"
                        _hover={{ color: "white", bg: "rgba(255,255,255,0.06)" }}
                        onClick={handleRestore}
                    />
                    <IconButton
                        aria-label="Kapat"
                        icon={<FaTimes />}
                        size="xs"
                        variant="ghost"
                        color="gray.500"
                        _hover={{ color: "red.500", bg: "rgba(255,255,255,0.06)" }}
                        onClick={handleClose}
                    />
                </HStack>
            </Flex>

            {loading && !currentlyPlaying ? (
                <Flex align="center" justify="center" h="100px" direction="column" gap={2}>
                    <Spinner size="sm" color="#1DB954" speed="0.8s" />
                    <Text fontSize="xs" color="gray.400">Şarkı bilgisi yükleniyor...</Text>
                </Flex>
            ) : !currentlyPlaying ? (
                <Flex align="center" justify="center" h="100px" direction="column" textAlign="center" px={2}>
                    <Icon as={FaMusic} color="gray.600" w={6} h={6} mb={1.5} />
                    <Text fontSize="xs" fontWeight="700" color="gray.300">
                        Aktif Çalma Bilgisi Yok
                    </Text>
                    <Text fontSize="10px" color="gray.500" mt={0.5}>
                        Spotify'da müzik çalın veya bağlantıyı kontrol edin
                    </Text>
                </Flex>
            ) : (
                /* Main Player Area */
                <Flex align="center" gap={3} mt={1}>
                    {/* Album Cover */}
                    <Box style={{ WebkitAppRegion: 'no-drag' } as any} cursor="pointer" onClick={handleTogglePlay}>
                        {currentlyPlaying.imageUrl ? (
                            <Box
                                w="70px"
                                h="70px"
                                borderRadius="12px"
                                backgroundImage={`url(${currentlyPlaying.imageUrl})`}
                                backgroundSize="cover"
                                backgroundPosition="center"
                                boxShadow="0 4px 12px rgba(0,0,0,0.4)"
                                transition="transform 0.2s ease"
                                _hover={{ transform: 'scale(1.03)' }}
                            />
                        ) : (
                            <Flex
                                w="70px"
                                h="70px"
                                bg="gray.800"
                                borderRadius="12px"
                                align="center"
                                justify="center"
                                boxShadow="0 4px 12px rgba(0,0,0,0.4)"
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
                        <HStack spacing={3} align="center" style={{ WebkitAppRegion: 'no-drag' } as any}>
                            <IconButton
                                aria-label="Önceki"
                                icon={<FaStepBackward />}
                                size="xs"
                                variant="ghost"
                                color="gray.400"
                                _hover={{ color: "#1DB954" }}
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
                                _hover={{ color: "#1DB954" }}
                                onClick={handleNextTrack}
                                p={0}
                                minW="auto"
                                h="auto"
                                fontSize="10px"
                            />
                        </HStack>
                    </Flex>

                    {/* Equalizer animation */}
                    <Flex h="20px" align="center" style={{ WebkitAppRegion: 'no-drag' } as any} pr={1}>
                        {currentlyPlaying.isPlaying && (
                            <HStack spacing="2px" h="16px" align="flex-end">
                                <Box w="2px" bg="#1DB954" borderRadius="1px" animation="1s moveEqualizer infinite alternate" style={{ animationDelay: '0.1s' }} />
                                <Box w="2px" bg="#1DB954" borderRadius="1px" animation="1.2s moveEqualizer infinite alternate" style={{ animationDelay: '0.3s' }} />
                                <Box w="2px" bg="#1DB954" borderRadius="1px" animation="0.8s moveEqualizer infinite alternate" style={{ animationDelay: '0.5s' }} />
                            </HStack>
                        )}
                    </Flex>
                </Flex>
            )}
        </Box>
    );
}
