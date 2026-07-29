import { useState, useEffect } from 'react'
import Login from './Pages/Login'
import Dashboard from './Pages/Dashboard'
import { ApiService } from './Services/ApiService'
import { Center, Spinner, Text, useToast, VStack } from '@chakra-ui/react'

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
    const toast = useToast();

    const redirectUri = "http://127.0.0.1:5173/";

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
            <Center h="100vh" bg="#F4F5F7">
                <VStack spacing={4}>
                    <Spinner size="xl" color="#FDBB30" thickness="4px" />
                    <Text color="#1A1D20" fontSize="lg" fontWeight="medium">Spotify hesabı doğrulanıyor...</Text>
                </VStack>
            </Center>
        );
    }

    return session ? (
        <Dashboard session={session} onLogout={handleLogout} />
    ) : (
        <Login redirectUri={redirectUri} />
    );
}

export default App;
