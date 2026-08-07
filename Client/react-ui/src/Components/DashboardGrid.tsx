import { useState, useEffect, memo } from 'react'
import { TrackDto, WrappedTrackDto, ApiService } from '../Services/ApiService'
import {
    Table,
    Thead,
    Tbody,
    Tr,
    Th,
    Td,
    Box,
    Badge,
    Text,
    Flex,
    Image,
    IconButton,
    HStack,
    Icon,
    Skeleton
} from '@chakra-ui/react'
import { FaMusic, FaHistory, FaSpotify } from 'react-icons/fa'

interface DashboardGridProps {
    tracks: (TrackDto | WrappedTrackDto)[];
    spotifyUserId: string;
    startRank?: number;
    onOpenAnalysis?: (track: any) => void;
    isLoading?: boolean;
}

interface LazyTrackImageProps {
    spotifyUserId: string;
    trackId: string;
    title: string;
    initialImageUrl?: string;
    w?: string;
    h?: string;
    borderRadius?: string;
}

function LazyTrackImage({ spotifyUserId, trackId, title, initialImageUrl, w, h, borderRadius }: LazyTrackImageProps) {
    const [imageUrl, setImageUrl] = useState<string | undefined>(initialImageUrl);

    useEffect(() => {
        setImageUrl(initialImageUrl);

        if (!initialImageUrl) {
            let isMounted = true;
            ApiService.getLazyTrackImage(spotifyUserId, trackId)
                .then(res => {
                    if (isMounted) {
                        if (res.imageUrl) {
                            setImageUrl(res.imageUrl);
                        }
                    }
                })
                .catch(() => {
                });
            return () => { isMounted = false; };
        }
    }, [initialImageUrl, trackId, spotifyUserId]);

    if (imageUrl) {
        return (
            <Image
                src={imageUrl}
                alt={title}
                w={w}
                h={h}
                borderRadius={borderRadius}
                objectFit="cover"
            />
        );
    }

    return (
        <Flex
            w={w}
            h={h}
            bg="#f0f0eb"
            borderRadius={borderRadius}
            align="center"
            justify="center"
            border="1px solid rgba(0,0,0,0.04)"
        >
            <Icon as={FaMusic} color="#d1d5db" />
        </Flex>
    );
}

function DashboardGrid({ tracks, spotifyUserId, startRank = 1, onOpenAnalysis, isLoading = false }: DashboardGridProps) {
    const getRankBadge = (rank: number) => {
        if (rank === 1) return <Badge variant="solid" bg="#1DB954" color="white" fontSize="xs" borderRadius="md">#1</Badge>;
        if (rank === 2) return <Badge variant="solid" bg="#065f46" color="white" fontSize="xs" borderRadius="md">#2</Badge>;
        if (rank === 3) return <Badge variant="solid" bg="#064e3b" color="white" fontSize="xs" borderRadius="md">#3</Badge>;
        return <Text color="#9ca3af" fontSize="sm" fontWeight="bold" textAlign="center" whiteSpace="nowrap">#{rank}</Text>;
    };

    return (
        <Box
            borderRadius="2xl"
            bg="white"
            border="1px solid rgba(0,0,0,0.06)"
            overflowX="auto"
            overflowY="hidden"
            boxShadow="0 2px 12px rgba(0,0,0,0.04)"
        >
            <Table variant="simple" sx={{ tableLayout: 'fixed' }}>
                <Thead bg="#f8f8f5">
                    <Tr>
                        <Th w="60px" textAlign="center" borderColor="rgba(0,0,0,0.06)" color="#9ca3af" px={2} fontSize="10px">Sıra</Th>
                        <Th w="60px" borderColor="rgba(0,0,0,0.06)" color="#9ca3af" px={1} whiteSpace="nowrap" fontSize="10px">Kapak</Th>
                        <Th borderColor="rgba(0,0,0,0.06)" color="#9ca3af" fontSize="10px">Şarkı</Th>
                        <Th w="15%" borderColor="rgba(0,0,0,0.06)" color="#9ca3af" fontSize="10px">Sanatçı</Th>
                        <Th w="18%" borderColor="rgba(0,0,0,0.06)" color="#9ca3af" fontSize="10px">Albüm</Th>
                        <Th w="120px" isNumeric borderColor="rgba(0,0,0,0.06)" color="#9ca3af" whiteSpace="nowrap" fontSize="10px">Dinlenme</Th>
                        {tracks[0] && 'totalMinutesPlayed' in tracks[0] && (
                            <Th w="110px" isNumeric borderColor="rgba(0,0,0,0.06)" color="#9ca3af" whiteSpace="nowrap" fontSize="10px">Süre</Th>
                        )}
                    </Tr>
                </Thead>
                <Tbody>
                    {isLoading ? (
                        [...Array(10)].map((_, i) => (
                            <Tr key={i}>
                                <Td borderColor="rgba(0,0,0,0.04)" px={2}>
                                    <Flex justify="center" align="center">
                                        <Skeleton w="22px" h="18px" borderRadius="md" startColor="#f0f0eb" endColor="#e5e5e0" />
                                    </Flex>
                                </Td>
                                <Td borderColor="rgba(0,0,0,0.04)" px={1}>
                                    <Skeleton w="38px" h="38px" borderRadius="8px" startColor="#f0f0eb" endColor="#e5e5e0" />
                                </Td>
                                <Td borderColor="rgba(0,0,0,0.04)">
                                    <Skeleton h="14px" w="80%" borderRadius="md" startColor="#f0f0eb" endColor="#e5e5e0" />
                                </Td>
                                <Td borderColor="rgba(0,0,0,0.04)">
                                    <Skeleton h="14px" w="60%" borderRadius="md" startColor="#f0f0eb" endColor="#e5e5e0" />
                                </Td>
                                <Td borderColor="rgba(0,0,0,0.04)">
                                    <Skeleton h="14px" w="70%" borderRadius="md" startColor="#f0f0eb" endColor="#e5e5e0" />
                                </Td>
                                <Td borderColor="rgba(0,0,0,0.04)" isNumeric>
                                    <Skeleton h="14px" w="50px" display="inline-block" borderRadius="md" startColor="#f0f0eb" endColor="#e5e5e0" />
                                </Td>
                                {tracks[0] && 'totalMinutesPlayed' in tracks[0] && (
                                    <Td borderColor="rgba(0,0,0,0.04)" isNumeric>
                                        <Skeleton h="14px" w="40px" display="inline-block" borderRadius="md" startColor="#f0f0eb" endColor="#e5e5e0" />
                                    </Td>
                                )}
                            </Tr>
                        ))
                    ) : (
                        tracks.map((track, index) => {
                            const wt = track as WrappedTrackDto;
                            const hasDuration = wt.totalMinutesPlayed !== undefined;

                            return (
                                <Tr
                                    key={track.spotifyTrackId + index}
                                    _hover={{ bg: "rgba(30, 215, 96, 0.03)" }}
                                    transition="background 0.2s"
                                >
                                    <Td borderColor="rgba(0,0,0,0.04)" px={2}>
                                        <Flex justify="center" align="center">
                                            {getRankBadge(startRank + index)}
                                        </Flex>
                                    </Td>
                                    <Td borderColor="rgba(0,0,0,0.04)" px={1}>
                                        <LazyTrackImage
                                            spotifyUserId={spotifyUserId}
                                            trackId={track.spotifyTrackId}
                                            title={track.title}
                                            initialImageUrl={track.imageUrl}
                                            w="38px"
                                            h="38px"
                                            borderRadius="8px"
                                        />
                                    </Td>
                                    <Td borderColor="rgba(0,0,0,0.04)" fontWeight="600" color="#1a1a2e">
                                        <Flex justify="space-between" align="center" gap={1}>
                                            <a
                                                href={`spotify:track:${track.spotifyTrackId}`}
                                                style={{ textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0, flex: 1 }}
                                            >
                                                <Text
                                                    _hover={{ color: '#1DB954', textDecoration: 'underline' }}
                                                    transition="color 0.2s"
                                                    cursor="pointer"
                                                    isTruncated
                                                    fontSize="sm"
                                                >
                                                    {track.title}
                                                </Text>
                                            </a>
                                            <HStack spacing={0.5} flexShrink={0}>
                                                <IconButton
                                                    aria-label="Dinleme Analizi"
                                                    icon={<FaHistory />}
                                                    size="xs"
                                                    variant="ghost"
                                                    color="#d1d5db"
                                                    _hover={{ color: "#1DB954", bg: "rgba(30, 215, 96, 0.08)" }}
                                                    onClick={() => onOpenAnalysis && onOpenAnalysis(track)}
                                                    borderRadius="8px"
                                                />
                                                <IconButton
                                                    aria-label="Spotify'da Aç"
                                                    icon={<FaSpotify />}
                                                    size="xs"
                                                    variant="ghost"
                                                    color="#d1d5db"
                                                    _hover={{ color: "#1DB954", bg: "rgba(30, 215, 96, 0.08)" }}
                                                    as="a"
                                                    href={`spotify:track:${track.spotifyTrackId}`}
                                                    borderRadius="8px"
                                                />
                                            </HStack>
                                        </Flex>
                                    </Td>
                                    <Td borderColor="rgba(0,0,0,0.04)" color="#6b7280">
                                        <a
                                            href={`spotify:search:${encodeURIComponent(track.artist)}`}
                                            style={{ textDecoration: 'none' }}
                                        >
                                            <Text
                                                _hover={{ color: '#1DB954', textDecoration: 'underline' }}
                                                transition="color 0.2s"
                                                cursor="pointer"
                                                isTruncated
                                                fontSize="sm"
                                            >
                                                {track.artist}
                                            </Text>
                                        </a>
                                    </Td>
                                    <Td borderColor="rgba(0,0,0,0.04)" color="#9ca3af">
                                        <a
                                            href={`spotify:search:${encodeURIComponent(track.album + " " + track.artist)}`}
                                            style={{ textDecoration: 'none' }}
                                        >
                                            <Text
                                                _hover={{ color: '#1DB954', textDecoration: 'underline' }}
                                                transition="color 0.2s"
                                                cursor="pointer"
                                                isTruncated
                                                fontSize="sm"
                                            >
                                                {track.album || "Bilinmiyor"}
                                            </Text>
                                        </a>
                                    </Td>
                                    <Td borderColor="rgba(0,0,0,0.04)" isNumeric fontWeight="800" color="#1a1a2e" whiteSpace="nowrap" fontSize="sm">
                                        {track.playCount.toLocaleString('tr-TR')} kez
                                    </Td>
                                    {hasDuration && (
                                        <Td borderColor="rgba(0,0,0,0.04)" isNumeric fontWeight="800" color="#1DB954" whiteSpace="nowrap" fontSize="sm">
                                            {wt.totalMinutesPlayed.toLocaleString('tr-TR')} dk
                                        </Td>
                                    )}
                                </Tr>
                            );
                        })
                    )}
                </Tbody>
            </Table>
        </Box>
    );
}

export default memo(DashboardGrid);
