export interface IFavouriteResponse {
    data: {
        videos: IFavouriteRawVideo[];
    }
}

interface IFavouriteRawVideo {
    video_id: string,
    region: string;
    title?: string;
    play: string;
    music: string;
    images?: string;
    play_count: number,
    digg_count: number,
    author: ITikTokAuthor;
}

export interface IFavouriteVideo {
    id: string,
    region: string;
    title?: string;
    play: string;
    music: string;
    views: number;
    likes: number;
    images?: string;
    author: ITikTokAuthor;
}

interface ITikTokAuthor {
    id: number;
    nickname: string;
    unique_id: string;
    avatar: string;
}