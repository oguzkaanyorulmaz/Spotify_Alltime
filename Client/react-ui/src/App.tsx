import { useState, useEffect } from 'react'
import Login from './Pages/Login'
import Dashboard from './Pages/Dashboard'
import { ApiService } from './Services/ApiService'
import { Center, Spinner, Text, useToast, VStack, Box, Flex } from '@chakra-ui/react'
import MiniPlayer from './Components/MiniPlayer'
import Sidebar from './Components/Sidebar'
import GlobalSpotlight from './Components/GlobalSpotlight'

export interface UserSession {
    spotifyUserId: string;
    displayName: string;
    email: string;
}

let isCodeProcessed = false;
let activeSessionCallback: ((session: UserSession | null) => void) | null = null;
let activeLoadingCallback: ((loading: boolean) => void) | null = null;
let activeErrorCallback: ((err: any) => void) | null = null;

function App() {
    const [session, setSession] = useState<UserSession | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('dashboard');
    const toast = useToast();

    const redirectUri = "http://127.0.0.1:5173/";

    const urlParams = new URLSearchParams(window.location.search);
    const isMiniPlayer = urlParams.get('miniplayer') === 'true';

    useEffect(() => {
        if (isMiniPlayer) {
            document.documentElement.style.background = 'transparent';
            document.body.style.background = 'transparent';
        }
    }, [isMiniPlayer]);

    useEffect(() => {
        activeSessionCallback = setSession;
        activeLoadingCallback = setLoading;

        activeErrorCallback = (err) => {
            toast({
                title: "Bağlantı Hatası",
                description: err.message || "Kimlik doğrulaması sırasında bir hata oluştu.",
                status: "error",
                duration: 5000,
                isClosable: true,
            });
        };

        return () => {
            activeSessionCallback = null;
            activeLoadingCallback = null;
            activeErrorCallback = null;
        };
    }, [toast]);

    useEffect(() => {
        const handleAuth = async () => {
            const urlParams = new URLSearchParams(window.location.search);
            const code = urlParams.get('code');

            if (code && !isCodeProcessed) {
                isCodeProcessed = true;
                try {
                    if (activeLoadingCallback) activeLoadingCallback(true);
                    const data = await ApiService.handleCallback(code, redirectUri);
                    const userSession: UserSession = {
                        spotifyUserId: data.spotifyUserId,
                        displayName: data.displayName,
                        email: data.email
                    };
                    localStorage.setItem('spotify_session', JSON.stringify(userSession));

                    if (activeSessionCallback) activeSessionCallback(userSession);
                    toast({
                        title: "Giriş Başarılı",
                        description: `Hoş geldiniz, ${userSession.displayName}!`,
                        status: "success",
                        duration: 3000,
                        isClosable: true,
                    });
                } catch (err: any) {
                    isCodeProcessed = false;
                    if (activeErrorCallback) activeErrorCallback(err);
                } finally {
                    window.history.replaceState({}, document.title, window.location.pathname);
                    if (activeLoadingCallback) activeLoadingCallback(false);
                }
            } else if (!code) {
                const stored = localStorage.getItem('spotify_session');
                if (stored) {
                    try {
                        setSession(JSON.parse(stored));
                    } catch {
                        localStorage.removeItem('spotify_session');
                    }
                }
                setLoading(false);
            }
        };

        handleAuth();
    }, [redirectUri, toast]);

    const handleLogout = () => {
        localStorage.removeItem('spotify_session');
        setSession(null);
        toast({
            title: "Oturum Kapatıldı",
            status: "info",
            duration: 2000,
            isClosable: true,
        });
    };

    if (loading) {
        return (
            <Center h="100vh" bg="#f5f5f0">
                <VStack spacing={4}>
                    <Spinner size="xl" color="#1DB954" thickness="4px" speed="0.7s" />
                    <Text color="#6b7280" fontSize="lg" fontWeight="medium">Spotify hesabı doğrulanıyor...</Text>
                </VStack>
            </Center>
        );
    }

    if (isMiniPlayer) {
        const stored = localStorage.getItem('spotify_session');
        const activeSession = stored ? JSON.parse(stored) : session;
        return activeSession ? (
            <Center h="100vh" bg="transparent">
                <MiniPlayer session={activeSession} />
            </Center>
        ) : (
            <Center h="100vh" bg="#f5f5f0" color="#1a1a2e">
                <Text>Oturum bulunamadı. Lütfen önce giriş yapın.</Text>
            </Center>
        );
    }

    if (!session) {
        return <Login redirectUri={redirectUri} />;
    }

    return (
        <Flex minH="100vh" bg="#f5f5f0">
            {/* Sidebar */}
            <Sidebar
                displayName={session.displayName}
                onLogout={handleLogout}
                activeTab={activeTab}
                onTabChange={setActiveTab}
            />

            {/* Main Content Area */}
            <Box ml="260px" flex={1} minH="100vh">
                <Dashboard
                    session={session}
                    activeTab={activeTab}
                />
            </Box>
            
            {/* Global Spotlight Hover Overlay */}
            <GlobalSpotlight />
        </Flex>
    );
}

export default App;
