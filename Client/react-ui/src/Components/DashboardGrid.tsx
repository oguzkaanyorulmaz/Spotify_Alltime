import { useState, useEffect } from 'react'
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
    const [loading, setLoading] = useState(!initialImageUrl);

    useEffect(() => {
        setImageUrl(initialImageUrl);
        setLoading(!initialImageUrl);

        if (!initialImageUrl) {
            let isMounted = true;
            ApiService.getLazyTrackImage(spotifyUserId, trackId)
                .then(res => {
                    if (isMounted) {
                        if (res.imageUrl) {
                            setImageUrl(res.imageUrl);
                        }
                        setLoading(false);
                    }
                })
                .catch(() => {
                    if (isMounted) setLoading(false);
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
            bg="gray.100"
            borderRadius={borderRadius}
            align="center"
            justify="center"
            border="1px solid rgba(0,0,0,0.08)"
        >
            <Icon as={FaMusic} color="gray.400" />
        </Flex>
    );
}

export default function DashboardGrid({ tracks, spotifyUserId, startRank = 1, onOpenAnalysis, isLoading = false }: DashboardGridProps) {
    const getRankBadge = (rank: number) => {
        if (rank === 1) return <Badge variant="solid" bg="#FDBB30" color="#111" fontSize="xs" borderRadius="md">#1</Badge>;
        if (rank === 2) return <Badge variant="solid" bg="#E2E8F0" color="#1A1D20" fontSize="xs" borderRadius="md">#2</Badge>;
        if (rank === 3) return <Badge variant="solid" bg="#FEF3C7" color="#B45309" fontSize="xs" borderRadius="md">#3</Badge>;
        return <Text color="gray.500" fontSize="sm" fontWeight="bold" textAlign="center" whiteSpace="nowrap">#{rank}</Text>;
    };

    return (
        <Box
            borderRadius="xl"
            bg="white"
            border="1px solid #E4E7EB"
            overflowX="auto"
            overflowY="hidden"
            boxShadow="sm"
        >
            <Table variant="simple" colorScheme="gray" sx={{ tableLayout: 'fixed' }}>
                <Thead bg="#F8FAFC">
                    <Tr>
                        <Th w="60px" textAlign="center" borderColor="#E4E7EB" color="#718096" px={2}>Sıra</Th>
                        <Th w="60px" borderColor="#E4E7EB" color="#718096" px={1} whiteSpace="nowrap">Kapak</Th>
                        <Th borderColor="#E4E7EB" color="#718096">Şarkı</Th>
                        <Th w="15%" borderColor="#E4E7EB" color="#718096">Sanatçı</Th>
                        <Th w="18%" borderColor="#E4E7EB" color="#718096">Albüm</Th>
                        <Th w="120px" isNumeric borderColor="#E4E7EB" color="#718096" whiteSpace="nowrap">Dinlenme</Th>
                        {tracks[0] && 'totalMinutesPlayed' in tracks[0] && (
                            <Th w="110px" isNumeric borderColor="#E4E7EB" color="#718096" whiteSpace="nowrap">Süre</Th>
                        )}
                    </Tr>
                </Thead>
                <Tbody>
                    {isLoading ? (
                        [...Array(10)].map((_, i) => (
                            <Tr key={i}>
                                <Td borderColor="#E4E7EB" px={2}>
                                    <Flex justify="center" align="center">
                                        <Skeleton w="22px" h="18px" borderRadius="md" />
                                    </Flex>
                                </Td>
                                <Td borderColor="#E4E7EB" px={1}>
                                    <Skeleton w="38px" h="38px" borderRadius="6px" />
                                </Td>
                                <Td borderColor="#E4E7EB">
                                    <Skeleton h="16px" w="80%" borderRadius="md" />
                                </Td>
                                <Td borderColor="#E4E7EB">
                                    <Skeleton h="16px" w="60%" borderRadius="md" />
                                </Td>
                                <Td borderColor="#E4E7EB">
                                    <Skeleton h="16px" w="70%" borderRadius="md" />
                                </Td>
                                <Td borderColor="#E4E7EB" isNumeric>
                                    <Skeleton h="16px" w="50px" display="inline-block" borderRadius="md" />
                                </Td>
                                {tracks[0] && 'totalMinutesPlayed' in tracks[0] && (
                                    <Td borderColor="#E4E7EB" isNumeric>
                                        <Skeleton h="16px" w="40px" display="inline-block" borderRadius="md" />
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
                                    _hover={{ bg: "#F8FAFC" }}
                                    transition="background 0.2s"
                                >
                                    <Td borderColor="#E4E7EB" px={2}>
                                        <Flex justify="center" align="center">
                                            {getRankBadge(startRank + index)}
                                        </Flex>
                                    </Td>
                                    <Td borderColor="#E4E7EB" px={1}>
                                        <LazyTrackImage
                                            spotifyUserId={spotifyUserId}
                                            trackId={track.spotifyTrackId}
                                            title={track.title}
                                            initialImageUrl={track.imageUrl}
                                            w="38px"
                                            h="38px"
                                            borderRadius="6px"
                                        />
                                    </Td>
                                    <Td borderColor="#E4E7EB" fontWeight="semibold" color="#1A1D20">
                                        <Flex justify="space-between" align="center" gap={1}>
                                            <a
                                                href={`spotify:track:${track.spotifyTrackId}`}
                                                style={{ textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0, flex: 1 }}
                                            >
                                                <Text 
                                                    _hover={{ color: '#10b981', textDecoration: 'underline' }} 
                                                    transition="color 0.2s"
                                                    cursor="pointer"
                                                    isTruncated
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
                                                    color="gray.400"
                                                    _hover={{ color: "#10b981", bg: "rgba(16, 185, 129, 0.1)" }}
                                                    onClick={() => onOpenAnalysis && onOpenAnalysis(track)}
                                                />
                                                <IconButton
                                                    aria-label="Spotify'da Aç"
                                                    icon={<FaSpotify />}
                                                    size="xs"
                                                    variant="ghost"
                                                    color="gray.400"
                                                    _hover={{ color: "#10b981", bg: "rgba(16, 185, 129, 0.1)" }}
                                                    as="a"
                                                    href={`spotify:track:${track.spotifyTrackId}`}
                                                />
                                            </HStack>
                                        </Flex>
                                    </Td>
                                    <Td borderColor="#E4E7EB" color="#718096">
                                        <a
                                            href={`spotify:search:${encodeURIComponent(track.artist)}`}
                                            style={{ textDecoration: 'none' }}
                                        >
                                            <Text 
                                                _hover={{ color: '#10b981', textDecoration: 'underline' }} 
                                                transition="color 0.2s"
                                                cursor="pointer"
                                                isTruncated
                                            >
                                                {track.artist}
                                            </Text>
                                        </a>
                                    </Td>
                                    <Td borderColor="#E4E7EB" color="gray.400">
                                        <a
                                            href={`spotify:search:${encodeURIComponent(track.album + " " + track.artist)}`}
                                            style={{ textDecoration: 'none' }}
                                        >
                                            <Text 
                                                _hover={{ color: '#10b981', textDecoration: 'underline' }} 
                                                transition="color 0.2s"
                                                cursor="pointer"
                                                isTruncated
                                            >
                                                {track.album || "Bilinmiyor"}
                                            </Text>
                                        </a>
                                    </Td>
                                    <Td borderColor="#E4E7EB" isNumeric fontWeight="black" color="#111111" whiteSpace="nowrap">
                                        {track.playCount.toLocaleString('tr-TR')} kez
                                    </Td>
                                    {hasDuration && (
                                        <Td borderColor="#E4E7EB" isNumeric fontWeight="black" color="#10b981" whiteSpace="nowrap">
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
