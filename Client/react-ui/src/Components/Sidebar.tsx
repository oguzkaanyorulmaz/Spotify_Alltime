import { Box, Flex, Text, VStack, Icon, HStack, Tooltip } from '@chakra-ui/react'
import { FaHome, FaHistory, FaListUl, FaCompass, FaCog, FaSignOutAlt, FaSpotify } from 'react-icons/fa'

interface SidebarProps {
    displayName: string;
    onLogout: () => void;
    activeTab: string;
    onTabChange: (tab: string) => void;
}

export default function Sidebar({ displayName, onLogout, activeTab, onTabChange }: SidebarProps) {
    const navItems = [
        { id: 'dashboard', label: 'Dashboard', icon: FaHome },
        { id: 'history', label: 'Geçmiş', icon: FaHistory },
        { id: 'playlists', label: 'Çalma Listeleri', icon: FaListUl },
        { id: 'discover', label: 'Keşfet', icon: FaCompass },
    ];

    return (
        <Box
            w="260px"
            minH="100vh"
            bg="#1a1a2e"
            position="fixed"
            left={0}
            top={0}
            zIndex={100}
            display="flex"
            flexDirection="column"
            borderRight="1px solid rgba(255,255,255,0.06)"
            overflow="hidden"
        >
            {/* Logo */}
            <Flex align="center" px={6} py={6} gap={3}>
                <Flex
                    w="38px"
                    h="38px"
                    bg="rgba(30, 215, 96, 0.15)"
                    borderRadius="12px"
                    align="center"
                    justify="center"
                >
                    <Icon as={FaSpotify} color="#1DB954" w={5} h={5} />
                </Flex>
                <Box>
                    <Text fontSize="md" fontWeight="800" color="white" lineHeight="1.2" letterSpacing="-0.02em">
                        Spotify
                    </Text>
                    <Text fontSize="10px" fontWeight="600" color="rgba(255,255,255,0.4)" letterSpacing="0.1em" textTransform="uppercase">
                        AllTime
                    </Text>
                </Box>
            </Flex>

            {/* Navigation */}
            <VStack spacing={1} px={3} mt={4} align="stretch" flex={1}>
                {navItems.map((item) => {
                    const isActive = activeTab === item.id;
                    return (
                        <Flex
                            key={item.id}
                            className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
                            align="center"
                            gap={3}
                            px={4}
                            py={2.5}
                            borderRadius="12px"
                            cursor="pointer"
                            bg={isActive ? 'rgba(30, 215, 96, 0.12)' : 'transparent'}
                            color={isActive ? '#1DB954' : 'rgba(255,255,255,0.5)'}
                            _hover={{
                                bg: isActive ? 'rgba(30, 215, 96, 0.12)' : 'rgba(255,255,255,0.06)',
                                color: isActive ? '#1DB954' : 'rgba(255,255,255,0.8)',
                            }}
                            transition="all 0.2s"
                            onClick={() => onTabChange(item.id)}
                        >
                            <Icon as={item.icon} w={4} h={4} />
                            <Text fontSize="sm" fontWeight={isActive ? '700' : '500'}>
                                {item.label}
                            </Text>
                            {item.id === 'discover' && (
                                <Box
                                    ml="auto"
                                    bg="rgba(244, 162, 97, 0.2)"
                                    color="#f4a261"
                                    fontSize="9px"
                                    fontWeight="700"
                                    px={2}
                                    py={0.5}
                                    borderRadius="full"
                                >
                                    Yeni
                                </Box>
                            )}
                        </Flex>
                    );
                })}

                {/* Add Section Placeholder */}
                <Flex
                    align="center"
                    gap={2}
                    px={4}
                    py={2}
                    mt={2}
                    cursor="pointer"
                    color="rgba(255,255,255,0.3)"
                    _hover={{ color: 'rgba(255,255,255,0.5)' }}
                    transition="all 0.2s"
                >
                    <Text fontSize="xs">+ Bölüm ekle</Text>
                </Flex>
            </VStack>



            {/* User Profile */}
            <Box px={4} pb={5} pt={2}>
                <Flex
                    align="center"
                    justify="space-between"
                    p={3}
                    borderRadius="12px"
                    _hover={{ bg: 'rgba(255,255,255,0.04)' }}
                    transition="all 0.2s"
                >
                    <HStack spacing={3}>
                        <Flex
                            w="36px"
                            h="36px"
                            borderRadius="full"
                            bg="linear-gradient(135deg, #1DB954, #064e3b)"
                            align="center"
                            justify="center"
                        >
                            <Text fontSize="sm" fontWeight="800" color="white">
                                {displayName.charAt(0).toUpperCase()}
                            </Text>
                        </Flex>
                        <Box>
                            <Text fontSize="sm" fontWeight="700" color="white" lineHeight="1.2" isTruncated maxW="120px">
                                {displayName}
                            </Text>
                            <Text fontSize="10px" color="rgba(255,255,255,0.35)">
                                Spotify Hesabı
                            </Text>
                        </Box>
                    </HStack>
                    <HStack spacing={1}>
                        <Tooltip label="Ayarlar" fontSize="xs">
                            <Flex
                                as="button"
                                w="28px"
                                h="28px"
                                align="center"
                                justify="center"
                                borderRadius="8px"
                                cursor="pointer"
                                color="rgba(255,255,255,0.3)"
                                _hover={{ color: 'rgba(255,255,255,0.7)', bg: 'rgba(255,255,255,0.06)' }}
                                transition="all 0.2s"
                            >
                                <Icon as={FaCog} w={3.5} h={3.5} />
                            </Flex>
                        </Tooltip>
                        <Tooltip label="Çıkış Yap" fontSize="xs">
                            <Flex
                                as="button"
                                w="28px"
                                h="28px"
                                align="center"
                                justify="center"
                                borderRadius="8px"
                                cursor="pointer"
                                color="rgba(255,255,255,0.3)"
                                _hover={{ color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)' }}
                                transition="all 0.2s"
                                onClick={onLogout}
                            >
                                <Icon as={FaSignOutAlt} w={3.5} h={3.5} />
                            </Flex>
                        </Tooltip>
                    </HStack>
                </Flex>
            </Box>
        </Box>
    );
}
