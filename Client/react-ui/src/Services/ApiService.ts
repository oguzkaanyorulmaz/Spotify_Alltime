const BASE_URL = "http://localhost:5085/api";

export interface TrackDto {
    spotifyTrackId: string;
    title: string;
    artist: string;
    album: string;
    playCount: number;
    imageUrl?: string;
    previewUrl?: string;
}

export interface CurrentlyPlayingDto {
    isPlaying: boolean;
    title: string;
    artist: string;
    album: string;
    imageUrl?: string;
}

export const ApiService = {
    getLoginUrl: async (redirectUri: string): Promise<string> => {
        const res = await fetch(`${BASE_URL}/auth/login-url?redirectUri=${encodeURIComponent(redirectUri)}`);
        if (!res.ok) throw new Error("Giriş bağlantısı alınamadı.");
        const data = await res.json();
        return data.loginUrl;
    },

    handleCallback: async (code: string, redirectUri: string, signal?: AbortSignal): Promise<any> => {
        const res = await fetch(`${BASE_URL}/auth/callback`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                code: code,
                redirectUri: redirectUri
            }),
            signal
        });
        if (!res.ok) throw new Error("Spotify kimlik doğrulaması başarısız oldu.");
        return await res.json();
    },

    getTop100: async (): Promise<TrackDto[]> => {
        const res = await fetch(`${BASE_URL}/stats/top-100`);
        if (!res.ok) throw new Error("İstatistikler alınamadı.");
        return await res.json();
    },

    uploadHistory: async (spotifyUserId: string, file: File): Promise<{ importedCount: number; skippedCount: number }> => {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch(`${BASE_URL}/ingestion/upload/${spotifyUserId}`, {
            method: "POST",
            body: formData
        });
        if (!res.ok) throw new Error("Dosya yükleme başarısız oldu.");
        return await res.json();
    },

    syncRecentlyPlayed: async (spotifyUserId: string): Promise<any> => {
        const res = await fetch(`${BASE_URL}/sync/recently-played/${spotifyUserId}`, {
            method: "POST"
        });
        if (!res.ok) throw new Error("Son çalınanlar senkronize edilemedi.");
        return await res.json();
    },

    triggerPlaylistSync: async (spotifyUserId: string): Promise<{ message: string; playlistUrl: string }> => {
        const res = await fetch(`${BASE_URL}/sync/playlist/${spotifyUserId}`, {
            method: "POST"
        });
        if (!res.ok) throw new Error("Çalma listesi eşitlemesi tetiklenemedi.");
        return await res.json();
    },

    getCurrentlyPlaying: async (spotifyUserId: string): Promise<CurrentlyPlayingDto> => {
        const res = await fetch(`${BASE_URL}/sync/currently-playing/${spotifyUserId}`);
        if (!res.ok) throw new Error("Şarkı bilgisi alınamadı.");
        return await res.json();
    },

    createCustomPlaylist: async (
        spotifyUserId: string,
        payload: {
            playlistName: string;
            startYear?: number;
            endYear?: number;
            includedArtists?: string[];
            excludedArtists?: string[];
            trackCount: number;
            fillMissing: boolean;
            useRandom: boolean;
        }
    ): Promise<{ message: string; playlistUrl: string }> => {
        const res = await fetch(`${BASE_URL}/sync/custom-playlist/${spotifyUserId}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });
        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.message || "Özel çalma listesi oluşturulamadı.");
        }
        return await res.json();
    },

    getAvailableYears: async (spotifyUserId: string): Promise<number[]> => {
        const res = await fetch(`${BASE_URL}/sync/available-years/${spotifyUserId}`);
        if (!res.ok) throw new Error("Kullanılabilir yıllar alınamadı.");
        return await res.json();
    },

    getYearlyWrapped: async (spotifyUserId: string, startDate?: string, endDate?: string): Promise<YearlyWrappedDto> => {
        let url = `${BASE_URL}/stats/wrapped/${spotifyUserId}?`;
        if (startDate) url += `startDate=${encodeURIComponent(startDate)}&`;
        if (endDate) url += `endDate=${encodeURIComponent(endDate)}&`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("Analiz verileri alınamadı.");
        return await res.json();
    },

    getTopTracksPaged: async (spotifyUserId: string, startDate?: string, endDate?: string, page = 1, pageSize = 100, sortBy = "playcount"): Promise<PagedResultDto<WrappedTrackDto>> => {
        let url = `${BASE_URL}/stats/wrapped/tracks/${spotifyUserId}?page=${page}&pageSize=${pageSize}&sortBy=${sortBy}&`;
        if (startDate) url += `startDate=${encodeURIComponent(startDate)}&`;
        if (endDate) url += `endDate=${encodeURIComponent(endDate)}&`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("Şarkı listesi alınamadı.");
        return await res.json();
    },

    getTopArtistsPaged: async (spotifyUserId: string, startDate?: string, endDate?: string, page = 1, pageSize = 10, sortBy = "playcount"): Promise<PagedResultDto<WrappedArtistDto>> => {
        let url = `${BASE_URL}/stats/wrapped/artists/${spotifyUserId}?page=${page}&pageSize=${pageSize}&sortBy=${sortBy}&`;
        if (startDate) url += `startDate=${encodeURIComponent(startDate)}&`;
        if (endDate) url += `endDate=${encodeURIComponent(endDate)}&`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("Sanatçı listesi alınamadı.");
        return await res.json();
    },

    getTrackPlayHistory: async (spotifyUserId: string, trackUri: string): Promise<{ period: string; playCount: number }[]> => {
        const res = await fetch(`${BASE_URL}/stats/history/track/${spotifyUserId}?trackUri=${encodeURIComponent(trackUri)}`);
        if (!res.ok) throw new Error("Şarkı geçmişi alınamadı.");
        return await res.json();
    },

    getArtistPlayHistory: async (spotifyUserId: string, artistName: string): Promise<{ period: string; playCount: number }[]> => {
        const res = await fetch(`${BASE_URL}/stats/history/artist/${spotifyUserId}?artistName=${encodeURIComponent(artistName)}`);
        if (!res.ok) throw new Error("Sanatçı geçmişi alınamadı.");
        return await res.json();
    }
};

export interface YearlyWrappedDto {
    year: number;
    totalMinutesPlayed: number;
    uniqueTracksCount: number;
    uniqueArtistsCount: number;
    topArtistName: string;
    topArtistPlayCount: number;
}

export interface PagedResultDto<T> {
    items: T[];
    totalCount: number;
    page: number;
    pageSize: number;
    totalPages: number;
}

export interface WrappedTrackDto {
    spotifyTrackId: string;
    title: string;
    artist: string;
    album: string;
    playCount: number;
    totalMinutesPlayed: number;
    imageUrl?: string;
}

export interface WrappedArtistDto {
    artistName: string;
    playCount: number;
    totalMinutesPlayed: number;
}



