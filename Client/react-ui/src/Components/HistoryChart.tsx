import { useState, useMemo } from 'react'
import {
    Box,
    Text,
    Flex,
    VStack,
    HStack,
    SimpleGrid,
    Icon
} from '@chakra-ui/react'
import { FaFire, FaChartLine, FaCalendarAlt, FaMusic } from 'react-icons/fa'

interface DataPoint {
    label: string; // Örn: "2025-06"
    value: number; // Örn: 15
}

interface HistoryChartProps {
    data: DataPoint[];
    title: string;
}

export default function HistoryChart({ data, title }: HistoryChartProps) {
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

    // İstatistikleri hesapla
    const stats = useMemo(() => {
        if (!data || data.length === 0) return null;

        const totalPlays = data.reduce((sum, d) => sum + d.value, 0);
        const avgPerMonth = totalPlays / data.length;
        const peakPoint = data.reduce((max, d) => d.value > max.value ? d : max, data[0]);
        const activeDays = data.filter(d => d.value > 0).length;

        // Trend hesapla (son 3 ay vs önceki 3 ay)
        const recent = data.slice(-3);
        const previous = data.slice(-6, -3);
        const recentAvg = recent.reduce((s, d) => s + d.value, 0) / (recent.length || 1);
        const previousAvg = previous.reduce((s, d) => s + d.value, 0) / (previous.length || 1);
        const trendPercent = previousAvg > 0 ? ((recentAvg - previousAvg) / previousAvg) * 100 : 0;

        return { totalPlays, avgPerMonth, peakPoint, activeDays, trendPercent };
    }, [data]);

    if (!data || data.length === 0) {
        return (
            <Flex justify="center" align="center" h="300px" bg="white" borderRadius="xl" border="1px solid #E4E7EB">
                <VStack spacing={3}>
                    <Icon as={FaMusic} color="gray.300" w={8} h={8} />
                    <Text color="#718096" fontSize="sm">Bu dönem için dinleme geçmişi bulunamadı.</Text>
                </VStack>
            </Flex>
        );
    }

    // SVG Boyutları - Daha geniş grafik
    const width = 820;
    const height = 340;
    const paddingLeft = 50;
    const paddingRight = 25;
    const paddingTop = 30;
    const paddingBottom = 50;

    const chartWidth = width - paddingLeft - paddingRight;
    const chartHeight = height - paddingTop - paddingBottom;

    // Maksimum değeri bul (min 1, üst sınır payı bırak)
    const maxValue = Math.max(...data.map(d => d.value), 1);
    const yMax = Math.ceil(maxValue * 1.15);

    // X adım genişliği
    const stepX = data.length > 1 ? chartWidth / (data.length - 1) : chartWidth;

    // Koordinatları hesapla
    const points = data.map((d, i) => {
        const x = paddingLeft + i * stepX;
        const y = height - paddingBottom - (d.value / yMax) * chartHeight;
        return { x, y, ...d };
    });

    // Smooth cubic bezier path oluştur
    const createSmoothPath = (pts: typeof points) => {
        if (pts.length < 2) return `M ${pts[0].x} ${pts[0].y}`;

        let path = `M ${pts[0].x} ${pts[0].y}`;

        for (let i = 0; i < pts.length - 1; i++) {
            const current = pts[i];
            const next = pts[i + 1];
            const prev = pts[i - 1] || current;
            const nextNext = pts[i + 2] || next;

            const tension = 0.3;
            const cp1x = current.x + (next.x - prev.x) * tension;
            const cp1y = current.y + (next.y - prev.y) * tension;
            const cp2x = next.x - (nextNext.x - current.x) * tension;
            const cp2y = next.y - (nextNext.y - current.y) * tension;

            path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${next.x} ${next.y}`;
        }

        return path;
    };

    const linePath = createSmoothPath(points);

    // Area path (smooth)
    let areaPath = "";
    if (points.length > 0) {
        areaPath = `${linePath} L ${points[points.length - 1].x} ${height - paddingBottom} L ${points[0].x} ${height - paddingBottom} Z`;
    }

    // Y ekseni kılavuz çizgileri ve etiketleri (5 kademeli)
    const yTicks = [];
    for (let i = 0; i <= 5; i++) {
        const val = Math.round((yMax / 5) * i);
        const y = height - paddingBottom - (val / yMax) * chartHeight;
        yTicks.push({ val, y });
    }

    // Tarih formatlama yardımcısı
    const formatLabel = (label: string) => {
        const parts = label.split("-");
        if (parts.length === 2) {
            const year = parts[0].substring(2);
            const months = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];
            const monthIdx = parseInt(parts[1]) - 1;
            return `${months[monthIdx]} '${year}`;
        }
        return label;
    };

    const formatLabelFull = (label: string) => {
        const parts = label.split("-");
        if (parts.length === 2) {
            const year = parts[0];
            const months = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
            const monthIdx = parseInt(parts[1]) - 1;
            return `${months[monthIdx]} ${year}`;
        }
        return label;
    };

    // Tema renkleri — beyaz/sarı
    const lineColor = "#E5A520";
    const lineColorLight = "#FDBB30";
    const cardBg = "#F8FAFC";

    return (
        <VStack align="stretch" spacing={4} w="full">
            {/* İstatistik Kartları */}
            {stats && (
                <SimpleGrid columns={4} spacing={3}>
                    <Box bg={cardBg} borderRadius="xl" p={3.5} border="1px solid #E4E7EB" transition="all 0.2s" _hover={{ borderColor: "#FDBB30", shadow: "md", transform: "translateY(-1px)" }}>
                        <HStack spacing={2.5} mb={1.5}>
                            <Flex p={1.5} bg="rgba(253, 187, 48, 0.12)" borderRadius="lg">
                                <Icon as={FaMusic} color="#FDBB30" w={3} h={3} />
                            </Flex>
                            <Text fontSize="10px" color="#718096" fontWeight="semibold" textTransform="uppercase" letterSpacing="wider">Toplam</Text>
                        </HStack>
                        <Text fontSize="xl" fontWeight="black" color="#111111" lineHeight="1">{stats.totalPlays.toLocaleString('tr-TR')}</Text>
                        <Text fontSize="10px" color="#718096" mt={0.5}>dinleme</Text>
                    </Box>

                    <Box bg={cardBg} borderRadius="xl" p={3.5} border="1px solid #E4E7EB" transition="all 0.2s" _hover={{ borderColor: "#FDBB30", shadow: "md", transform: "translateY(-1px)" }}>
                        <HStack spacing={2.5} mb={1.5}>
                            <Flex p={1.5} bg="rgba(253, 187, 48, 0.12)" borderRadius="lg">
                                <Icon as={FaFire} color="#E5A520" w={3} h={3} />
                            </Flex>
                            <Text fontSize="10px" color="#718096" fontWeight="semibold" textTransform="uppercase" letterSpacing="wider">Zirve</Text>
                        </HStack>
                        <Text fontSize="xl" fontWeight="black" color="#111111" lineHeight="1">{stats.peakPoint.value}</Text>
                        <Text fontSize="10px" color="#718096" mt={0.5}>{formatLabelFull(stats.peakPoint.label)}</Text>
                    </Box>

                    <Box bg={cardBg} borderRadius="xl" p={3.5} border="1px solid #E4E7EB" transition="all 0.2s" _hover={{ borderColor: "#FDBB30", shadow: "md", transform: "translateY(-1px)" }}>
                        <HStack spacing={2.5} mb={1.5}>
                            <Flex p={1.5} bg="rgba(253, 187, 48, 0.12)" borderRadius="lg">
                                <Icon as={FaCalendarAlt} color="#FDBB30" w={3} h={3} />
                            </Flex>
                            <Text fontSize="10px" color="#718096" fontWeight="semibold" textTransform="uppercase" letterSpacing="wider">Ortalama</Text>
                        </HStack>
                        <Text fontSize="xl" fontWeight="black" color="#111111" lineHeight="1">{stats.avgPerMonth.toFixed(1)}</Text>
                        <Text fontSize="10px" color="#718096" mt={0.5}>dinleme / ay</Text>
                    </Box>

                    <Box bg={cardBg} borderRadius="xl" p={3.5} border="1px solid #E4E7EB" transition="all 0.2s" _hover={{ borderColor: stats.trendPercent >= 0 ? "#FDBB30" : "#EF4444", shadow: "md", transform: "translateY(-1px)" }}>
                        <HStack spacing={2.5} mb={1.5}>
                            <Flex p={1.5} bg={stats.trendPercent >= 0 ? "rgba(253, 187, 48, 0.12)" : "rgba(239, 68, 68, 0.1)"} borderRadius="lg">
                                <Icon as={FaChartLine} color={stats.trendPercent >= 0 ? "#E5A520" : "#EF4444"} w={3} h={3} />
                            </Flex>
                            <Text fontSize="10px" color="#718096" fontWeight="semibold" textTransform="uppercase" letterSpacing="wider">Trend</Text>
                        </HStack>
                        <Text fontSize="xl" fontWeight="black" color={stats.trendPercent >= 0 ? "#E5A520" : "#EF4444"} lineHeight="1">
                            {stats.trendPercent >= 0 ? "+" : ""}{stats.trendPercent.toFixed(0)}%
                        </Text>
                        <Text fontSize="10px" color="#718096" mt={0.5}>son 3 ay</Text>
                    </Box>
                </SimpleGrid>
            )}

            {/* Ana Grafik */}
            <Box position="relative" bg="white" p={5} pb={4} borderRadius="xl" border="1px solid #E4E7EB" shadow="sm">
                <Flex justify="space-between" align="center" mb={3}>
                    <Text color="#1A1D20" fontWeight="bold" fontSize="sm">Aylık Dinleme Grafiği</Text>
                    {hoveredIndex !== null && points[hoveredIndex] && (
                        <HStack
                            bg="rgba(253, 187, 48, 0.1)"
                            border="1px solid rgba(253, 187, 48, 0.3)"
                            borderRadius="lg"
                            px={3}
                            py={1}
                            spacing={2}
                        >
                            <Text fontSize="xs" color="#E5A520" fontWeight="bold">{formatLabelFull(points[hoveredIndex].label)}</Text>
                            <Box w="1px" h="14px" bg="rgba(253, 187, 48, 0.3)" />
                            <Text fontSize="xs" color="#111111" fontWeight="black">{points[hoveredIndex].value} dinleme</Text>
                        </HStack>
                    )}
                </Flex>

                {/* SVG Çizimi */}
                <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
                    <defs>
                        {/* Ana gradient dolgu — sarı/altın */}
                        <linearGradient id="chartGradientLight" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={lineColorLight} stopOpacity="0.3" />
                            <stop offset="50%" stopColor={lineColorLight} stopOpacity="0.1" />
                            <stop offset="100%" stopColor={lineColorLight} stopOpacity="0.0" />
                        </linearGradient>
                        {/* Çizgi glow */}
                        <filter id="lineGlowLight">
                            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                            <feMerge>
                                <feMergeNode in="coloredBlur" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>
                    </defs>

                    {/* Yatay Kılavuz Çizgileri ve Sol Y Etiketleri */}
                    {yTicks.map((tick, i) => (
                        <g key={i}>
                            <line
                                x1={paddingLeft}
                                y1={tick.y}
                                x2={width - paddingRight}
                                y2={tick.y}
                                stroke="#E4E7EB"
                                strokeDasharray="4 6"
                            />
                            <text
                                x={paddingLeft - 10}
                                y={tick.y + 4}
                                fill="#A0AEC0"
                                fontSize="11px"
                                textAnchor="end"
                                fontWeight="600"
                                fontFamily="Inter, system-ui, sans-serif"
                            >
                                {tick.val}
                            </text>
                        </g>
                    ))}

                    {/* Hover edilen noktanın dikey çizgisi */}
                    {hoveredIndex !== null && points[hoveredIndex] && (
                        <line
                            x1={points[hoveredIndex].x}
                            y1={paddingTop}
                            x2={points[hoveredIndex].x}
                            y2={height - paddingBottom}
                            stroke="rgba(253, 187, 48, 0.35)"
                            strokeDasharray="3 3"
                        />
                    )}

                    {/* Degrade Dolgu (Area) - Smooth */}
                    {areaPath && (
                        <path d={areaPath} fill="url(#chartGradientLight)" />
                    )}

                    {/* Ana Çizgi (Line) - Glow ile */}
                    {linePath && (
                        <>
                            <path
                                d={linePath}
                                fill="none"
                                stroke={lineColorLight}
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeOpacity="0.25"
                                filter="url(#lineGlowLight)"
                            />
                            <path
                                d={linePath}
                                fill="none"
                                stroke={lineColor}
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </>
                    )}

                    {/* Veri Noktaları */}
                    {points.map((p, i) => (
                        <g key={i}>
                            {/* X Ekseni Etiketleri */}
                            {(data.length < 18 || i % Math.ceil(data.length / 10) === 0 || i === data.length - 1) && (
                                <text
                                    x={p.x}
                                    y={height - paddingBottom + 22}
                                    fill="#A0AEC0"
                                    fontSize="10px"
                                    textAnchor="middle"
                                    fontWeight="600"
                                    fontFamily="Inter, system-ui, sans-serif"
                                >
                                    {formatLabel(p.label)}
                                </text>
                            )}

                            {/* Hover glow */}
                            {hoveredIndex === i && (
                                <circle
                                    cx={p.x}
                                    cy={p.y}
                                    r="12"
                                    fill={lineColorLight}
                                    opacity="0.15"
                                />
                            )}

                            {/* Nokta Halkası */}
                            <circle
                                cx={p.x}
                                cy={p.y}
                                r={hoveredIndex === i ? 5 : 3.5}
                                fill={hoveredIndex === i ? lineColor : "white"}
                                stroke={lineColor}
                                strokeWidth={hoveredIndex === i ? 2.5 : 1.5}
                                style={{ transition: 'all 0.15s ease' }}
                            />

                            {/* Hover value label doğrudan noktanın üzerinde */}
                            {hoveredIndex === i && (
                                <text
                                    x={p.x}
                                    y={p.y - 16}
                                    fill="#111111"
                                    fontSize="12px"
                                    fontWeight="bold"
                                    textAnchor="middle"
                                    fontFamily="Inter, system-ui, sans-serif"
                                >
                                    {p.value}
                                </text>
                            )}

                            {/* Hover için geniş görünmez algılayıcı alan */}
                            <circle
                                cx={p.x}
                                cy={p.y}
                                r="20"
                                fill="transparent"
                                cursor="pointer"
                                onMouseEnter={() => setHoveredIndex(i)}
                                onMouseLeave={() => setHoveredIndex(null)}
                            />
                        </g>
                    ))}
                </svg>
            </Box>
        </VStack>
    );
}
