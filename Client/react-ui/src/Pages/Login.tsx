import { useState } from 'react'
import { ApiService } from '../Services/ApiService'
import {
    Box,
    Button,
    Center,
    Heading,
    Icon,
    Text,
    useToast,
    Flex
} from '@chakra-ui/react'
import { FaSpotify } from 'react-icons/fa'

interface LoginProps {
    redirectUri: string;
}

export default function Login({ redirectUri }: LoginProps) {
    const [loading, setLoading] = useState(false);
    const toast = useToast();

    const handleLogin = async () => {
        try {
            setLoading(true);
            const loginUrl = await ApiService.getLoginUrl(redirectUri);
            window.location.href = loginUrl;
        } catch (err: any) {
            toast({
                title: "Hata",
                description: err.message || "Giriş bağlantısı oluşturulamadı.",
                status: "error",
                duration: 5000,
                isClosable: true,
            });
            setLoading(false);
        }
    };

    return (
        <Box
            bg="#f5f5f0"
            minH="100vh"
            w="100vw"
            overflow="hidden"
            position="relative"
        >
            {/* Ambient glow background */}
            <Box
                position="absolute"
                top="15%"
                left="30%"
                w="500px"
                h="500px"
                borderRadius="full"
                bg="radial-gradient(circle, rgba(30, 215, 96, 0.06) 0%, transparent 70%)"
                filter="blur(80px)"
                pointerEvents="none"
            />
            <Box
                position="absolute"
                bottom="20%"
                right="20%"
                w="400px"
                h="400px"
                borderRadius="full"
                bg="radial-gradient(circle, rgba(244, 162, 97, 0.05) 0%, transparent 70%)"
                filter="blur(80px)"
                pointerEvents="none"
            />

            <Center minH="100vh" px={4} position="relative" zIndex={1}>
                <Flex
                    direction="column"
                    align="center"
                    justify="center"
                    p={{ base: 8, md: 12 }}
                    maxW="460px"
                    w="full"
                    borderRadius="2xl"
                    bg="rgba(255, 255, 255, 0.9)"
                    border="1px solid rgba(0, 0, 0, 0.06)"
                    backdropFilter="blur(20px)"
                    boxShadow="0 8px 32px rgba(0, 0, 0, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.8)"
                    textAlign="center"
                >
                    <Box
                        mb={6}
                        p={5}
                        borderRadius="full"
                        bg="rgba(30, 215, 96, 0.08)"
                        border="2px dashed rgba(30, 215, 96, 0.2)"
                        transition="all 0.4s cubic-bezier(0.4, 0, 0.2, 1)"
                        _hover={{ transform: 'scale(1.08) rotate(10deg)', bg: 'rgba(30, 215, 96, 0.12)', borderColor: 'rgba(30, 215, 96, 0.35)' }}
                    >
                        <Icon as={FaSpotify} w={16} h={16} color="#1DB954" />
                    </Box>

                    <Heading as="h1" size="xl" fontWeight="900" mb={2} color="#1a1a2e" letterSpacing="-0.02em">
                        Spotify True All-Time
                    </Heading>

                    <Text fontSize="md" color="#6b7280" mb={8} fontWeight="medium" maxW="380px" lineHeight="tall">
                        Uzatılmış dinleme geçmişi dosyalarınızı yükleyin, her gece çalma listenizi otomatik eşitleyin ve gerçek dinleme istatistiklerinizi keşfedin.
                    </Text>

                    <Button
                        size="lg"
                        w="full"
                        bg="#1a1a2e"
                        color="white"
                        borderRadius="xl"
                        leftIcon={<FaSpotify />}
                        isLoading={loading}
                        loadingText="Yönlendiriliyor..."
                        onClick={handleLogin}
                        boxShadow="0 4px 14px rgba(26, 26, 46, 0.2)"
                        _hover={{
                            bg: '#2d2d4e',
                            transform: 'translateY(-2px)',
                            boxShadow: '0 6px 20px rgba(26, 26, 46, 0.3)'
                        }}
                        _active={{ bg: '#111122', transform: 'translateY(0)' }}
                        transition="all 0.2s"
                        fontWeight="bold"
                        fontSize="md"
                    >
                        Spotify ile Giriş Yap
                    </Button>

                    <Text fontSize="xs" color="#9ca3af" mt={6}>
                        Oturum açarak gizlilik sözleşmesini ve Spotify API erişimini kabul etmiş olursunuz.
                    </Text>
                </Flex>
            </Center>
        </Box>
    );
}
