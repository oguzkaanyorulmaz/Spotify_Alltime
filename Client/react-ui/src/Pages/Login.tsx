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
        <Box bg="#F4F5F7" minH="100vh" w="100vw" overflow="hidden">
            <Center minH="100vh" px={4}>
                <Flex
                    direction="column"
                    align="center"
                    justify="center"
                    p={{ base: 8, md: 12 }}
                    maxW="500px"
                    w="full"
                    borderRadius="2xl"
                    bg="white"
                    border="1px solid #E4E7EB"
                    boxShadow="sm"
                    textAlign="center"
                >
                    <Box
                        mb={6}
                        p={5}
                        borderRadius="full"
                        bg="rgba(253, 187, 48, 0.1)"
                        border="2px dashed rgba(253, 187, 48, 0.3)"
                        transition="all 0.3s"
                        _hover={{ transform: 'scale(1.08) rotate(10deg)', bg: 'rgba(253, 187, 48, 0.15)' }}
                    >
                        <Icon as={FaSpotify} w={16} h={16} color="#FDBB30" />
                    </Box>

                    <Heading as="h1" size="xl" fontWeight="black" mb={2} color="#111111" letterSpacing="tight">
                        Spotify True All-Time
                    </Heading>

                    <Text fontSize="md" color="#718096" mb={8} fontWeight="medium" maxW="380px">
                        Uzatılmış dinleme geçmişi dosyalarınızı yükleyin, her gece çalma listenizi otomatik eşitleyin ve gerçek dinleme istatistiklerinizi keşfedin.
                    </Text>

                    <Button
                        size="lg"
                        w="full"
                        bg="#111111"
                        color="white"
                        borderRadius="xl"
                        leftIcon={<FaSpotify />}
                        isLoading={loading}
                        loadingText="Yönlendiriliyor..."
                        onClick={handleLogin}
                        boxShadow="0 4px 12px rgba(17, 17, 17, 0.15)"
                        _hover={{
                            bg: 'black',
                            transform: 'translateY(-2px)',
                            boxShadow: '0 6px 16px rgba(17, 17, 17, 0.25)'
                        }}
                        _active={{ bg: 'black', transform: 'translateY(0)' }}
                        transition="all 0.2s"
                        fontWeight="bold"
                        fontSize="md"
                    >
                        Spotify ile Giriş Yap
                    </Button>

                    <Text fontSize="xs" color="gray.500" mt={6}>
                        Oturum açarak gizlilik sözleşmesini ve Spotify API erişimini kabul etmiş olursunuz.
                    </Text>
                </Flex>
            </Center>
        </Box>
    );
}
