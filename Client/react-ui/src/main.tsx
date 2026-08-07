import React from 'react'
import ReactDOM from 'react-dom/client'
import { ChakraProvider, ColorModeScript, extendTheme } from '@chakra-ui/react'
import App from './App.tsx'
import './index.css'

const config = {
    initialColorMode: 'light',
    useSystemColorMode: false,
}

const theme = extendTheme({
    config,
    fonts: {
        heading: `'Plus Jakarta Sans', 'Inter', 'Outfit', sans-serif`,
        body: `'Plus Jakarta Sans', 'Inter', sans-serif`,
    },
    colors: {
        brand: {
            50: '#ecfdf5',
            100: '#d1fae5',
            200: '#a7f3d0',
            300: '#6ee7b7',
            400: '#34d399',
            500: '#1DB954',
            600: '#1ed760',
            700: '#059669',
            800: '#065f46',
            900: '#064e3b',
        }
    },
    styles: {
        global: {
            body: {
                bg: '#f5f5f0',
                color: '#1a1a2e',
            }
        }
    },
    components: {
        Modal: {
            baseStyle: {
                dialog: {
                    bg: '#ffffff',
                },
                overlay: {
                    bg: 'rgba(0, 0, 0, 0.4)',
                    backdropFilter: 'blur(8px)',
                }
            }
        }
    }
})

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <ChakraProvider theme={theme}>
            <ColorModeScript initialColorMode={theme.config.initialColorMode} />
            <App />
        </ChakraProvider>
    </React.StrictMode>,
)
